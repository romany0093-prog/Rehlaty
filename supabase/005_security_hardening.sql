-- =====================================================================
-- Rehlaty – 005 security hardening (audit 2026-11)
-- Fixes confirmed by the audit (see docs/SECURITY-AUDIT-REPORT.md):
--   SEC-01 stored XSS: server-side validation of every field the UI puts
--          into an attribute (ids, colours, image URLs, links)
--   SEC-02 forged notifications / activity lines
--   SEC-03 resolve_login disclosed any user's e-mail from a username
--   SEC-04 unthrottled anonymous sign-up and login lookups
--   SEC-05 payment confirmation has no gateway path (adds a gateway-only
--          confirmation function + a switch to turn the simulator off)
--   SEC-06 suspended companies could keep editing trips / departures
--   SEC-07 departures moved into the past, departures of hidden trips public
--   SEC-08 unbounded payloads (travellers, profile fields, trip data)
--   SEC-09 settlements larger than the company balance
--   BUG-01 private-trip bookings above 10 travellers rejected by a CHECK
--   PERF-01 RLS helpers evaluated per row; missing foreign-key indexes
-- Safe to re-run.
-- =====================================================================

-- ---------- shared validators ----------
create or replace function public._safe_img(p text) returns boolean language sql immutable as $$
  select p is null or p = '' or p ~ '^(art:[a-z]+:[0-9]+|assets/[A-Za-z0-9_./-]+|data:image/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+)$'
$$;
create or replace function public._safe_id(p text) returns boolean language sql immutable as $$
  select p ~ '^[A-Za-z0-9_-]{1,64}$'
$$;
create or replace function public._safe_link(p text) returns boolean language sql immutable as $$
  select p is null or p = '' or p ~ '^#/[A-Za-z0-9/_?=&.%,:-]{0,200}$'
$$;
create or replace function public._client_ip() returns text language sql stable as $$
  select coalesce(split_part(nullif(current_setting('request.headers', true), '')::json->>'x-forwarded-for', ',', 1), 'unknown')
$$;

-- ---------- throttle table (sign-up / login lookups) ----------
create table if not exists public.auth_throttle (
  key text primary key,
  hits int not null default 0,
  window_start timestamptz not null default now(),
  locked_until timestamptz
);
alter table public.auth_throttle enable row level security; -- no policies: only definer functions touch it
create or replace function public._throttle(p_key text, p_max int, p_window interval, p_lock interval) returns boolean
language plpgsql security definer set search_path = public as $$
declare r auth_throttle;
begin
  insert into auth_throttle(key) values (p_key) on conflict (key) do nothing;
  select * into r from auth_throttle where key = p_key for update;
  if r.locked_until is not null and r.locked_until > now() then return false; end if;
  if r.window_start < now() - p_window then
    update auth_throttle set hits = 1, window_start = now(), locked_until = null where key = p_key;
    return true;
  end if;
  update auth_throttle set hits = hits + 1,
    locked_until = case when hits + 1 >= p_max then now() + p_lock else null end where key = p_key;
  return r.hits + 1 <= p_max;
end $$;
create or replace function public._throttle_clear(p_key text) returns void language sql security definer set search_path = public as $$
  delete from auth_throttle where key = p_key
$$;
revoke all on function public._throttle(text, int, interval, interval), public._throttle_clear(text) from public, anon, authenticated;

-- ---------- SEC-01: validation triggers (run for everyone, trusted or not) ----------
create or replace function public.validate_company() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' and not public._safe_id(new.id) then raise exception 'BAD_ID'; end if;
  if new.data ? 'color' and coalesce(new.data->>'color', '') !~ '^(#[0-9A-Fa-f]{3,8})?$' then raise exception 'BAD_COLOR'; end if;
  if not public._safe_img(new.data->>'logo') or not public._safe_img(new.data->>'cover') then raise exception 'BAD_IMAGE'; end if;
  if length(coalesce(new.data->'name'->>'ar', '')) > 120 or length(coalesce(new.data->'name'->>'en', '')) > 120 then raise exception 'TOO_LONG'; end if;
  if pg_column_size(new.data) > 2000000 then raise exception 'TOO_LARGE'; end if;
  return new;
end $$;
drop trigger if exists validate_company on public.companies;
create trigger validate_company before insert or update on public.companies for each row execute function public.validate_company();

create or replace function public.validate_trip() returns trigger language plpgsql set search_path = public as $$
declare i text; v_co text;
begin
  if tg_op = 'INSERT' and not public._safe_id(new.id) then raise exception 'BAD_ID'; end if;
  for i in select jsonb_array_elements_text(case when jsonb_typeof(new.data->'images') = 'array' then new.data->'images' else '[]' end) loop
    if not public._safe_img(i) then raise exception 'BAD_IMAGE'; end if;
  end loop;
  if coalesce(new.data->>'destId', 'x') !~ '^[A-Za-z0-9_-]{1,64}$' or coalesce(new.data->>'catId', 'x') !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'BAD_ID'; end if;
  if length(coalesce(new.data->'title'->>'ar', '')) > 200 or length(coalesce(new.data->'title'->>'en', '')) > 200 then raise exception 'TOO_LONG'; end if;
  if pg_column_size(new.data) > 8000000 then raise exception 'TOO_LARGE'; end if;
  -- SEC-06: a suspended / rejected company cannot change its catalogue
  if not public.trusted() then
    select status into v_co from companies where id = coalesce(new.company_id, old.company_id);
    if v_co is distinct from 'approved' then raise exception 'COMPANY_NOT_APPROVED'; end if;
  end if;
  return new;
end $$;
drop trigger if exists validate_trip on public.trips;
create trigger validate_trip before insert or update on public.trips for each row execute function public.validate_trip();

create or replace function public.validate_departure() returns trigger language plpgsql set search_path = public as $$
declare v_co text;
begin
  if tg_op = 'INSERT' and not public._safe_id(new.id) then raise exception 'BAD_ID'; end if;
  if not public.trusted() then
    select status into v_co from companies where id = (select company_id from trips where id = new.trip_id);
    if v_co is distinct from 'approved' then raise exception 'COMPANY_NOT_APPROVED'; end if;
    -- SEC-07: dates can only move to the future
    if tg_op = 'UPDATE' and (new.start_date, new.end_date) is distinct from (old.start_date, old.end_date) and new.start_date <= current_date then raise exception 'DATE_IN_PAST'; end if;
  end if;
  return new;
end $$;
drop trigger if exists validate_departure on public.departures;
create trigger validate_departure before insert or update on public.departures for each row execute function public.validate_departure();

-- block deletes by companies that are no longer approved
create or replace function public.guard_catalogue_delete() returns trigger language plpgsql set search_path = public as $$
declare v_co text;
begin
  if public.trusted() then return old; end if;
  select status into v_co from companies where id = old.company_id;
  if v_co is distinct from 'approved' then raise exception 'COMPANY_NOT_APPROVED'; end if;
  return old;
end $$;
drop trigger if exists guard_trip_delete on public.trips;
create trigger guard_trip_delete before delete on public.trips for each row execute function public.guard_catalogue_delete();
drop trigger if exists guard_dep_delete on public.departures;
create trigger guard_dep_delete before delete on public.departures for each row execute function public.guard_catalogue_delete();

create or replace function public.validate_offer() returns trigger language plpgsql set search_path = public as $$
declare i text;
begin
  for i in select jsonb_array_elements_text(case when jsonb_typeof(new.data->'images') = 'array' then new.data->'images' else '[]' end) loop
    if not public._safe_img(i) then raise exception 'BAD_IMAGE'; end if;
  end loop;
  if coalesce(new.data->>'destId', 'x') !~ '^[A-Za-z0-9_-]{1,64}$' or coalesce(new.data->>'catId', 'family') !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'BAD_ID'; end if;
  if pg_column_size(new.data) > 4000000 then raise exception 'TOO_LARGE'; end if;
  return new;
end $$;
drop trigger if exists validate_offer on public.request_offers;
create trigger validate_offer before insert or update on public.request_offers for each row execute function public.validate_offer();

-- profiles: bounded, plain fields
create or replace function public.validate_profile() returns trigger language plpgsql set search_path = public as $$
begin
  if length(coalesce(new.name, '')) not between 2 and 80 then raise exception 'BAD_NAME'; end if;
  if coalesce(new.phone, '') !~ '^[0-9+ ]{0,20}$' then raise exception 'BAD_PHONE'; end if;
  if length(coalesce(new.city, '')) > 60 then raise exception 'TOO_LONG'; end if;
  if jsonb_typeof(new.favorites) <> 'array' or jsonb_array_length(new.favorites) > 200
     or exists (select 1 from jsonb_array_elements(new.favorites) f where jsonb_typeof(f) <> 'string' or not public._safe_id(f #>> '{}')) then raise exception 'BAD_FAVORITES'; end if;
  if pg_column_size(new.data) > 20000 then raise exception 'TOO_LARGE'; end if;
  return new;
end $$;
drop trigger if exists validate_profile on public.profiles;
create trigger validate_profile before insert or update on public.profiles for each row execute function public.validate_profile();

-- ---------- SEC-02: notifications only from server functions or the admin; links must be in-app ----------
alter table public.notifications drop constraint if exists notifications_link_safe;
alter table public.notifications add constraint notifications_link_safe check (public._safe_link(link));
drop policy if exists notif_insert on public.notifications;
create policy notif_insert on public.notifications for insert with check ((select public.is_admin()));

-- activity: every line is stamped with its real author; bounded text
create or replace function public.stamp_activity() returns trigger language plpgsql set search_path = public as $$
begin
  new.data := coalesce(new.data, '{}') || jsonb_build_object('actor', auth.uid());
  new.at := now();
  if length(coalesce(new.text->>'ar', '')) > 300 or length(coalesce(new.text->>'en', '')) > 300 then raise exception 'TOO_LONG'; end if;
  return new;
end $$;
drop trigger if exists stamp_activity on public.activity;
create trigger stamp_activity before insert on public.activity for each row execute function public.stamp_activity();

-- ---------- SEC-03 / SEC-04: login lookup needs the password and is throttled ----------
drop function if exists public.resolve_login(text);
create or replace function public.resolve_login(p_ident text, p_password text) returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare v text := lower(trim(coalesce(p_ident, ''))); v_email text; v_hash text; v_ip text := public._client_ip();
begin
  if position('@' in v) > 0 then return v; end if; -- e-mail logins go straight to Supabase Auth (its own rate limits)
  if not public._throttle('login_user:' || v, 10, interval '15 minutes', interval '15 minutes')
     or not public._throttle('login_ip:' || v_ip, 300, interval '15 minutes', interval '15 minutes') then
    raise exception 'LOCKED';
  end if;
  select p.email, u.encrypted_password into v_email, v_hash from profiles p join auth.users u on u.id = p.id where p.username = v;
  if v_hash is null or v_hash <> crypt(coalesce(p_password, ''), v_hash) then return null; end if;
  perform public._throttle_clear('login_user:' || v);
  return v_email;
end $$;
revoke all on function public.resolve_login(text, text) from public;
grant execute on function public.resolve_login(text, text) to anon, authenticated;

-- sign-up: validated fields, throttled per client IP and globally
create or replace function public.register_account(p_username text, p_email text, p_password text, p_name text, p_phone text, p_role text, p_company jsonb default null)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := gen_random_uuid();
  v_user text := lower(trim(p_username));
  v_email text := lower(trim(p_email));
  v_cid text; v_co jsonb;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  if not public._throttle('signup_ip:' || public._client_ip(), 20, interval '1 hour', interval '1 hour')
     or not public._throttle('signup_all', 300, interval '1 hour', interval '10 minutes') then raise exception 'RATE_LIMIT'; end if;
  if p_role not in ('customer', 'company') then raise exception 'BAD_ROLE'; end if;
  if v_user !~ '^[a-z0-9_.]{3,24}$' then raise exception 'BAD_USERNAME'; end if;
  if v_email !~ '^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$' or length(v_email) > 120 then raise exception 'BAD_EMAIL'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'WEAK_PASSWORD'; end if;
  if length(trim(coalesce(p_name, ''))) not between 3 and 80 then raise exception 'BAD_NAME'; end if;
  if coalesce(p_phone, '') !~ '^[0-9+ ]{0,20}$' then raise exception 'BAD_PHONE'; end if;
  if exists (select 1 from profiles where username = v_user) then raise exception 'USERNAME_TAKEN'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then raise exception 'EMAIL_TAKEN'; end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email, crypt(p_password, gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('username', v_user, 'name', p_name), now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid, v_uid::text, jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());

  if p_role = 'company' then
    if p_company is null or coalesce(p_company->'name'->>'ar', '') = '' then raise exception 'BAD_COMPANY'; end if;
    -- only the fields the sign-up form sends; everything else is ignored
    select coalesce(jsonb_object_agg(key, value), '{}') into v_co from jsonb_each(p_company)
      where key in ('name', 'color', 'city', 'phone', 'website', 'license', 'founded', 'desc', 'logo', 'cover', 'docs');
    v_cid := 'c_' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
    insert into companies (id, status, owner, data) values (v_cid, 'pending', v_uid, v_co || jsonb_build_object('email', v_email));
    perform _notify('admin', 'طلب تسجيل شركة', 'Company application', left(p_company->'name'->>'ar', 120) || ' أرسلت طلب انضمام.', left(coalesce(p_company->'name'->>'en', p_company->'name'->>'ar'), 120) || ' applied to join.', '#/admin/companies');
    perform _act(left(p_company->'name'->>'ar', 120) || ' سجلت كشركة جديدة', left(coalesce(p_company->'name'->>'en', p_company->'name'->>'ar'), 120) || ' registered');
  end if;
  insert into profiles (id, username, email, role, name, phone, company_id) values (v_uid, v_user, v_email, p_role, trim(p_name), p_phone, v_cid);
  if p_role = 'customer' then
    perform _notify(v_uid::text, 'أهلًا بك في رحلاتي', 'Welcome to Rehlati', 'حسابك جاهز. ابدأ باكتشاف الرحلات.', 'Your account is ready. Start exploring trips.', '#/trips');
  end if;
  return v_uid;
end $$;

-- housekeeping is not for anonymous callers
revoke execute on function public.housekeeping() from public, anon;
grant execute on function public.housekeeping() to authenticated;
-- note: _req_owner/_co_offered/_co_approved stay executable because RLS policies call them with the caller's privileges
-- _safe_* validators stay executable: the validation triggers run with the caller's privileges
revoke execute on function public._client_ip() from public, anon, authenticated;

-- ---------- BUG-01 + SEC-08: traveller count / payload ----------
alter table public.bookings drop constraint if exists bookings_count_check;
alter table public.bookings add constraint bookings_count_check check (count between 1 and 40);
create or replace function public._clean_travelers(p jsonb) returns jsonb language plpgsql immutable as $$
declare t jsonb; out jsonb := '[]';
begin
  if jsonb_typeof(p) <> 'array' then raise exception 'COUNT'; end if;
  for t in select * from jsonb_array_elements(p) loop
    if jsonb_typeof(t) <> 'object' then raise exception 'BAD_TRAVELER'; end if;
    if length(coalesce(t->>'name', '')) not between 2 and 100 or length(coalesce(t->>'phone', '')) > 20 or coalesce(t->>'age', '') !~ '^[0-9]{0,3}$' then raise exception 'BAD_TRAVELER'; end if;
    out := out || jsonb_build_array(jsonb_build_object('name', t->>'name', 'age', coalesce(t->>'age', ''), 'phone', coalesce(t->>'phone', '')));
  end loop;
  return out;
end $$;
-- wrap create_booking: sanitize travellers first (keeps 004's logic intact)
do $$ begin
  if not exists (select 1 from pg_proc where proname = '_create_booking_core') then
    alter function public.create_booking(text, jsonb, text) rename to _create_booking_core;
  end if;
end $$;
revoke all on function public._create_booking_core(text, jsonb, text) from public, anon, authenticated;
create or replace function public.create_booking(p_dep text, p_travelers jsonb, p_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return public._create_booking_core(p_dep, public._clean_travelers(p_travelers), left(p_code, 40));
end $$;
revoke execute on function public.create_booking(text, jsonb, text) from public, anon;
grant execute on function public.create_booking(text, jsonb, text) to authenticated;

-- ---------- SEC-05: payments ----------
-- settings.data.paymentMode: 'simulated' (default today) or 'gateway'.
-- In 'gateway' mode pay_booking refuses; only the provider webhook (service role) confirms payments.
do $$ begin
  if not exists (select 1 from pg_proc where proname = '_pay_booking_sim') then
    alter function public.pay_booking(text, text, text, jsonb) rename to _pay_booking_sim;
  end if;
end $$;
revoke all on function public._pay_booking_sim(text, text, text, jsonb) from public, anon, authenticated;
create or replace function public.pay_booking(p_booking text, p_method text, p_idem text, p_details jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select data->>'paymentMode' from settings where id = 'main'), 'simulated') <> 'simulated' then raise exception 'GATEWAY_REQUIRED'; end if;
  if length(coalesce(p_idem, '')) not between 8 and 80 then raise exception 'BAD_IDEM'; end if;
  return public._pay_booking_sim(p_booking, p_method, p_idem, coalesce(p_details, '{}'));
end $$;
revoke execute on function public.pay_booking(text, text, text, jsonb) from public, anon;
grant execute on function public.pay_booking(text, text, text, jsonb) to authenticated;

-- Called ONLY by the payment webhook (Edge Function, service role) after it has verified the provider signature.
-- Idempotent per provider event; checks amount and currency; late payments are recorded for reconciliation.
create or replace function public.confirm_gateway_payment(p_event_id text, p_booking text, p_amount numeric, p_currency text, p_provider text, p_txn text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_b bookings; v_p payments; v_idem text := 'gw_' || p_provider || '_' || p_event_id;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  select * into v_p from payments where idem_key = v_idem;
  if v_p.id is not null then return jsonb_build_object('result', 'duplicate_event', 'payment', v_p.id); end if;
  select * into v_b from bookings where id = p_booking for update;
  if v_b.id is null then raise exception 'NOT_FOUND'; end if;
  if upper(coalesce(p_currency, '')) <> 'EGP' then raise exception 'CURRENCY_MISMATCH'; end if;
  if p_amount is distinct from v_b.total then raise exception 'AMOUNT_MISMATCH'; end if;
  if v_b.payment_status = 'paid' then
    insert into payments (id, booking_id, customer_id, company_id, method, amount, status, idem_key, txn, data)
    values ('p_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), v_b.id, v_b.customer_id, v_b.company_id, p_provider, p_amount, 'failed', v_idem, p_txn, '{"reconcile":"double_charge_refund_needed"}');
    perform _notify('admin', 'دفعة مكررة', 'Duplicate payment', v_b.ref || ': وصلت دفعة تانية ولازم تترد.', v_b.ref || ': second payment received, refund needed.', '#/admin/finance');
    return jsonb_build_object('result', 'already_paid_reconcile');
  end if;
  if v_b.status <> 'pending_payment' then
    insert into payments (id, booking_id, customer_id, company_id, method, amount, status, idem_key, txn, data)
    values ('p_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), v_b.id, v_b.customer_id, v_b.company_id, p_provider, p_amount, 'failed', v_idem, p_txn, '{"reconcile":"late_payment_refund_needed"}');
    perform _notify('admin', 'دفعة بعد انتهاء الحجز', 'Late payment', v_b.ref || ': الدفع وصل بعد انتهاء المهلة ولازم يترد أو الحجز يتأكد يدويًا.', v_b.ref || ': payment arrived after the hold expired.', '#/admin/finance');
    return jsonb_build_object('result', 'late_reconcile');
  end if;
  insert into payments (id, booking_id, customer_id, company_id, method, amount, status, idem_key, txn)
  values ('p_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), v_b.id, v_b.customer_id, v_b.company_id, p_provider, p_amount, 'paid', v_idem, p_txn);
  update bookings set status = 'confirmed', payment_status = 'paid', paid_at = now(), hold_until = null where id = v_b.id;
  perform _notify(v_b.customer_id::text, 'تم تأكيد حجزك', 'Booking confirmed', 'حجزك ' || v_b.ref || ' مؤكد.', 'Booking ' || v_b.ref || ' is confirmed.', '#/me/booking/' || v_b.ref);
  perform _notify('company:' || v_b.company_id, 'حجز جديد', 'New booking', 'حجز جديد ' || v_b.ref || ' (' || v_b.count || ' مقعد).', 'New booking ' || v_b.ref || '.', '#/co/bookings');
  return jsonb_build_object('result', 'confirmed');
end $$;
revoke all on function public.confirm_gateway_payment(text, text, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.confirm_gateway_payment(text, text, numeric, text, text, text) to service_role;

-- ---------- SEC-09: settlements cannot exceed what the company has earned net ----------
create or replace function public.validate_settlement() returns trigger language plpgsql set search_path = public as $$
declare v_net numeric; v_paid numeric;
begin
  select coalesce(sum((total - refunded) - commission), 0) into v_net from bookings
    where company_id = new.company_id and payment_status in ('paid', 'partially_refunded') and status in ('confirmed', 'completed', 'refunded', 'refund_pending');
  select coalesce(sum(amount), 0) into v_paid from settlements where company_id = new.company_id;
  if new.amount > v_net - v_paid + 0.5 then raise exception 'OVER_SETTLEMENT'; end if;
  return new;
end $$;
drop trigger if exists validate_settlement on public.settlements;
create trigger validate_settlement before insert on public.settlements for each row execute function public.validate_settlement();

-- ---------- SEC-07: departures only visible with their (visible) trip ----------
drop policy if exists deps_select on public.departures;
create policy deps_select on public.departures for select using (exists (select 1 from public.trips t where t.id = departures.trip_id));

-- ---------- PERF-01: evaluate auth helpers once per query, index foreign keys ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = (select auth.uid()) or (select public.is_admin())
  or ((select public.my_company()) is not null and exists (select 1 from bookings b where b.customer_id = profiles.id and b.company_id = (select public.my_company()))));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings for select using (customer_id = (select auth.uid()) or company_id = (select public.my_company()) or (select public.is_admin()));
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select using (customer_id = (select auth.uid()) or company_id = (select public.my_company()) or (select public.is_admin()));
drop policy if exists refunds_select on public.refunds;
create policy refunds_select on public.refunds for select using (customer_id = (select auth.uid()) or company_id = (select public.my_company()) or (select public.is_admin()));
drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select using (
  to_user = (select auth.uid())::text or (to_user = 'admin' and (select public.is_admin())) or to_user = 'company:' || (select public.my_company()));
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update using (
  to_user = (select auth.uid())::text or (to_user = 'admin' and (select public.is_admin())) or to_user = 'company:' || (select public.my_company()));
drop policy if exists disputes_select on public.disputes;
create policy disputes_select on public.disputes for select using (customer_id = (select auth.uid()) or company_id = (select public.my_company()) or (select public.is_admin()));
drop policy if exists activity_insert on public.activity;
create policy activity_insert on public.activity for insert with check ((select auth.uid()) is not null);
drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips for select using (
  (status = 'active' and exists (select 1 from companies c where c.id = trips.company_id and c.status = 'approved'))
  or (status = 'private' and data->>'requestCustomer' = (select auth.uid())::text)
  or company_id = (select public.my_company()) or (select public.is_admin()));
drop policy if exists req_select on public.trip_requests;
create policy req_select on public.trip_requests for select using (
  customer_id = (select auth.uid()) or (select public.is_admin())
  or ((select public._co_approved()) and (status = 'open' or public._co_offered(id))));
drop policy if exists offer_select on public.request_offers;
create policy offer_select on public.request_offers for select using (
  company_id = (select public.my_company()) or (select public.is_admin()) or public._req_owner(request_id) = (select auth.uid()));
drop policy if exists msg_select on public.request_messages;
create policy msg_select on public.request_messages for select using (
  company_id = (select public.my_company()) or (select public.is_admin()) or public._req_owner(request_id) = (select auth.uid()));

create index if not exists bookings_trip_id_idx on public.bookings (trip_id);
create index if not exists companies_owner_idx on public.companies (owner);
create index if not exists departures_company_id_idx on public.departures (company_id);
create index if not exists departures_trip_id_idx on public.departures (trip_id);
create index if not exists disputes_booking_id_idx on public.disputes (booking_id);
create index if not exists refunds_booking_id_idx on public.refunds (booking_id);
create index if not exists request_messages_company_id_idx on public.request_messages (company_id);
create index if not exists request_offers_company_id_idx on public.request_offers (company_id);
create index if not exists reviews_trip_id_idx on public.reviews (trip_id);
create index if not exists settlements_company_id_idx on public.settlements (company_id);
create index if not exists trips_company_id_idx on public.trips (company_id);
create index if not exists payments_customer_id_idx on public.payments (customer_id);
create index if not exists payments_company_id_idx on public.payments (company_id);

-- fixed search_path for the helper functions (Supabase advisor 0011)
alter function public._safe_img(text) set search_path = public;
alter function public._safe_id(text) set search_path = public;
alter function public._safe_link(text) set search_path = public;
alter function public._client_ip() set search_path = public;
alter function public._clean_travelers(jsonb) set search_path = public;
