-- =====================================================================
-- Rehlaty – server functions (all SECURITY DEFINER, callable via supabase.rpc)
-- =====================================================================
create or replace function public._notify(p_to text, p_title_ar text, p_title_en text, p_body_ar text, p_body_en text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (to_user, title, body, link) values (p_to, jsonb_build_object('ar', p_title_ar, 'en', p_title_en), jsonb_build_object('ar', p_body_ar, 'en', p_body_en), p_link);
$$;
create or replace function public._act(p_ar text, p_en text) returns void language sql security definer set search_path = public as $$
  insert into activity (text) values (jsonb_build_object('ar', p_ar, 'en', p_en));
$$;
create or replace function public._fmt(n numeric) returns text language sql immutable as $$ select to_char(round(n), 'FM999,999,999,990') $$;

-- ---------- accounts ----------
-- Username OR email login: returns the email to pass to supabase.auth.signInWithPassword
create or replace function public.resolve_login(p_ident text) returns text
language plpgsql stable security definer set search_path = public as $$
declare v text := lower(trim(p_ident)); v_email text;
begin
  if position('@' in v) > 0 then return v; end if;
  select email into v_email from profiles where username = v;
  return v_email; -- null when unknown; the client shows one generic error
end $$;

create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where username = lower(trim(p_username)));
$$;

-- Creates an auth user (email already confirmed) + profile (+ pending company).
-- Role is limited to customer/company – admin can only be granted from SQL.
create or replace function public.register_account(p_username text, p_email text, p_password text, p_name text, p_phone text, p_role text, p_company jsonb default null)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := gen_random_uuid();
  v_user text := lower(trim(p_username));
  v_email text := lower(trim(p_email));
  v_cid text;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  if p_role not in ('customer', 'company') then raise exception 'BAD_ROLE'; end if;
  if v_user !~ '^[a-z0-9_.]{3,24}$' then raise exception 'BAD_USERNAME'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'BAD_EMAIL'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'WEAK_PASSWORD'; end if;
  if length(trim(coalesce(p_name, ''))) < 3 then raise exception 'BAD_NAME'; end if;
  if exists (select 1 from profiles where username = v_user) then raise exception 'USERNAME_TAKEN'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then raise exception 'EMAIL_TAKEN'; end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email, crypt(p_password, gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('username', v_user, 'name', p_name), now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid, v_uid::text, jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());

  if p_role = 'company' then
    if p_company is null or coalesce(p_company->'name'->>'ar', '') = '' then raise exception 'BAD_COMPANY'; end if;
    v_cid := 'c_' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
    insert into companies (id, status, owner, data) values (v_cid, 'pending', v_uid, p_company || jsonb_build_object('email', v_email));
    perform _notify('admin', 'طلب تسجيل شركة', 'Company application', (p_company->'name'->>'ar') || ' أرسلت طلب انضمام.', coalesce(p_company->'name'->>'en', p_company->'name'->>'ar') || ' applied to join.', '#/admin/companies');
    perform _act((p_company->'name'->>'ar') || ' سجلت كشركة جديدة', coalesce(p_company->'name'->>'en', p_company->'name'->>'ar') || ' registered');
  end if;
  insert into profiles (id, username, email, role, name, phone, company_id) values (v_uid, v_user, v_email, p_role, trim(p_name), p_phone, v_cid);
  if p_role = 'customer' then
    perform _notify(v_uid::text, 'أهلًا بك في رحلاتي', 'Welcome to Rehlati', 'حسابك جاهز. ابدأ باكتشاف الرحلات.', 'Your account is ready. Start exploring trips.', '#/trips');
  end if;
  return v_uid;
end $$;

-- ---------- housekeeping & public counters ----------
create or replace function public.housekeeping() returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('rehlaty.trusted', 'on', true);
  update bookings set status = 'cancelled', payment_status = 'failed', data = data || '{"cancelReason":"hold_expired"}'
    where status = 'pending_payment' and hold_until < now();
  update bookings b set status = 'completed' from departures d
    where b.departure_id = d.id and b.status = 'confirmed' and d.end_date < current_date;
  update departures set status = 'closed' where status = 'open' and start_date <= current_date;
end $$;

create or replace function public.seat_counts() returns table (departure_id text, booked int, held int)
language sql stable security definer set search_path = public as $$
  select departure_id,
    coalesce(sum(count) filter (where status in ('confirmed','completed','refund_pending')), 0)::int,
    coalesce(sum(count) filter (where status = 'pending_payment' and hold_until > now()), 0)::int
  from bookings group by departure_id;
$$;
create or replace function public.company_travellers() returns table (company_id text, travellers int, bookings int)
language sql stable security definer set search_path = public as $$
  select company_id, coalesce(sum(count) filter (where status = 'completed'), 0)::int, count(*) filter (where status in ('confirmed','completed'))::int from bookings group by company_id;
$$;

-- ---------- booking ----------
create or replace function public.create_booking(p_dep text, p_travelers jsonb, p_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_prof profiles; v_dep departures; v_trip trips; v_comp companies; v_set jsonb;
  v_n int := jsonb_array_length(p_travelers);
  v_booked int; v_held int; v_sub numeric; v_disc numeric := 0; v_total numeric; v_rate numeric;
  v_offer jsonb; v_dup bookings; v_b bookings;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  select * into v_prof from profiles where id = v_uid;
  if v_prof.id is null or v_prof.role <> 'customer' then raise exception 'AUTH'; end if;
  if v_prof.status <> 'active' then raise exception 'SUSPENDED'; end if;
  if v_n < 1 or v_n > 10 then raise exception 'COUNT'; end if;
  -- lock the departure row: concurrent bookings on the same date queue here
  select * into v_dep from departures where id = p_dep for update;
  if v_dep.id is null then raise exception 'UNAVAILABLE'; end if;
  select * into v_trip from trips where id = v_dep.trip_id;
  select * into v_comp from companies where id = v_trip.company_id;
  if v_trip.status <> 'active' or v_comp.status <> 'approved' then raise exception 'UNAVAILABLE'; end if;
  if v_dep.status <> 'open' or v_dep.start_date <= current_date then raise exception 'DEP_CLOSED'; end if;
  select * into v_dup from bookings where customer_id = v_uid and departure_id = v_dep.id
    and (status = 'confirmed' or (status = 'pending_payment' and hold_until > now())) limit 1;
  if v_dup.id is not null then raise exception 'DUPLICATE:%', v_dup.ref; end if;
  select coalesce(sum(count) filter (where status in ('confirmed','completed','refund_pending')), 0),
         coalesce(sum(count) filter (where status = 'pending_payment' and hold_until > now()), 0)
    into v_booked, v_held from bookings where departure_id = v_dep.id;
  if v_dep.seats - v_booked - v_held < v_n then raise exception 'NO_SEATS:%', greatest(0, v_dep.seats - v_booked - v_held); end if;

  select data into v_set from settings where id = 'main';
  v_sub := v_dep.price * v_n;
  if coalesce(trim(p_code), '') <> '' then
    select o into v_offer from jsonb_array_elements(v_set->'offers') o
      where (o->>'active')::boolean and upper(o->>'code') = upper(trim(p_code)) and (o->>'until')::date >= current_date
        and (jsonb_array_length(o->'dests') = 0 or (o->'dests') ? (v_trip.data->>'destId')) limit 1;
    if v_offer is not null then v_disc := round(v_sub * (v_offer->>'percent')::numeric / 100); end if;
  end if;
  v_total := v_sub - v_disc;
  v_rate := coalesce(v_comp.commission, (v_set->>'commission')::numeric, 10);
  insert into bookings (id, ref, customer_id, company_id, trip_id, departure_id, count, status, payment_status, total, commission, commission_rate, hold_until, data)
  values ('b_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
          'RH-' || to_char(v_dep.start_date, 'YYMM') || '-' || nextval('booking_ref_seq'),
          v_uid, v_comp.id, v_trip.id, v_dep.id, v_n, 'pending_payment', 'pending', v_total, round(v_total * v_rate / 100), v_rate,
          now() + make_interval(mins => coalesce((v_set->>'holdMinutes')::int, 15)),
          jsonb_build_object('travelers', p_travelers, 'unitPrice', v_dep.price, 'subtotal', v_sub, 'discount', v_disc, 'promo', coalesce(v_offer->>'code', '')))
  returning * into v_b;
  return to_jsonb(v_b);
end $$;

-- Idempotent on p_idem: retries or double clicks never charge twice.
create or replace function public.pay_booking(p_booking text, p_method text, p_idem text, p_details jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_b bookings; v_p payments; v_trip trips; v_dep departures; v_prof profiles;
  v_ok boolean := true; v_reason jsonb; v_card text; v_meta jsonb := '{}'; v_left int;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  select * into v_p from payments where idem_key = p_idem;
  if v_p.id is not null then
    select * into v_b from bookings where id = v_p.booking_id;
    return jsonb_build_object('payment', to_jsonb(v_p), 'booking', to_jsonb(v_b), 'replay', true, 'failed', v_p.status = 'failed');
  end if;
  select * into v_b from bookings where id = p_booking for update;
  if v_b.id is null or v_b.customer_id <> v_uid then raise exception 'NOT_FOUND'; end if;
  if v_b.payment_status = 'paid' then
    select * into v_p from payments where booking_id = v_b.id and status = 'paid' limit 1;
    return jsonb_build_object('payment', to_jsonb(v_p), 'booking', to_jsonb(v_b), 'replay', true);
  end if;
  if v_b.status <> 'pending_payment' or v_b.hold_until < now() then
    if v_b.status = 'pending_payment' then update bookings set status = 'cancelled', payment_status = 'failed' where id = v_b.id; end if;
    return jsonb_build_object('error', 'EXPIRED');
  end if;
  if p_method not in ('card', 'fawry', 'wallet', 'instapay') then raise exception 'METHOD'; end if;
  -- simulated gateways (replace with Paymob / Fawry / Kashier webhooks in production)
  if p_method = 'card' then
    v_card := regexp_replace(coalesce(p_details->>'card', ''), '\D', '', 'g');
    v_meta := jsonb_build_object('last4', right(v_card, 4));
    if v_card = '4000000000000002' then v_ok := false; v_reason := '{"ar":"رفض البنك العملية (رصيد غير كافٍ).","en":"Card declined by the bank (insufficient funds)."}'; end if;
  elsif p_method = 'wallet' then
    v_meta := jsonb_build_object('phone', p_details->>'phone');
    if coalesce(p_details->>'otp', '') <> '123456' then v_ok := false; v_reason := '{"ar":"كود التأكيد غير صحيح.","en":"The confirmation code is wrong."}'; end if;
  end if;
  insert into payments (id, booking_id, customer_id, company_id, method, amount, status, idem_key, txn, data)
  values ('p_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), v_b.id, v_b.customer_id, v_b.company_id, p_method, v_b.total,
          case when v_ok then 'paid' else 'failed' end, p_idem, case when v_ok then 'TX' || (1000000 + floor(random() * 8999999))::bigint else '' end,
          jsonb_build_object('failReason', v_reason, 'meta', v_meta))
  returning * into v_p;
  if not v_ok then
    update bookings set payment_status = 'failed' where id = v_b.id returning * into v_b;
    return jsonb_build_object('payment', to_jsonb(v_p), 'booking', to_jsonb(v_b), 'failed', true);
  end if;
  update bookings set status = 'confirmed', payment_status = 'paid', paid_at = now(), hold_until = null where id = v_b.id returning * into v_b;
  select * into v_trip from trips where id = v_b.trip_id;
  select * into v_dep from departures where id = v_b.departure_id;
  select * into v_prof from profiles where id = v_b.customer_id;
  perform _notify(v_uid::text, 'تم تأكيد حجزك', 'Booking confirmed', 'حجزك ' || v_b.ref || ' لرحلة ' || (v_trip.data->'title'->>'ar') || ' مؤكد.', 'Booking ' || v_b.ref || ' is confirmed.', '#/me/booking/' || v_b.ref);
  perform _notify(v_uid::text, 'تم استلام الدفع', 'Payment received', 'استلمنا ' || _fmt(v_b.total) || ' ج.م عن الحجز ' || v_b.ref || '.', 'We received EGP ' || _fmt(v_b.total) || ' for ' || v_b.ref || '.', '#/me/payments');
  perform _notify('company:' || v_b.company_id, 'حجز جديد', 'New booking', v_prof.name || ' حجز ' || v_b.count || ' مقعد في ' || (v_trip.data->'title'->>'ar') || ' (' || v_dep.start_date || ').', v_prof.name || ' booked ' || v_b.count || ' seat(s) (' || v_dep.start_date || ').', '#/co/bookings');
  perform _notify('admin', 'حجز جديد', 'New booking', v_b.ref || ' بقيمة ' || _fmt(v_b.total) || ' ج.م', v_b.ref || ' worth EGP ' || _fmt(v_b.total), '#/admin/bookings');
  select v_dep.seats - coalesce(sum(count), 0) into v_left from bookings where departure_id = v_dep.id
    and (status in ('confirmed','completed','refund_pending') or (status = 'pending_payment' and hold_until > now()));
  if v_left <= 0 then perform _notify('company:' || v_b.company_id, 'اكتملت المقاعد', 'Departure sold out', 'موعد ' || v_dep.start_date || ' لرحلة ' || (v_trip.data->'title'->>'ar') || ' اكتمل.', v_dep.start_date || ' is sold out.', '#/co/trips'); end if;
  if v_b.total >= 50000 then perform _notify('admin', 'معاملة كبيرة', 'Large transaction', 'دفعة بقيمة ' || _fmt(v_b.total) || ' ج.م على ' || v_b.ref, 'Payment of EGP ' || _fmt(v_b.total) || ' on ' || v_b.ref, '#/admin/finance'); end if;
  perform _act('حجز مؤكد ' || v_b.ref || ' – ' || v_prof.name, 'Booking confirmed ' || v_b.ref || ' – ' || v_prof.name);
  return jsonb_build_object('payment', to_jsonb(v_p), 'booking', to_jsonb(v_b));
end $$;

create or replace function public.request_cancel(p_booking text, p_reason text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_b bookings; v_dep departures; v_days int; v_pct int; v_amt numeric; v_trip trips;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  select * into v_b from bookings where id = p_booking for update;
  if v_b.id is null or v_b.customer_id <> auth.uid() then raise exception 'FORBIDDEN'; end if;
  if v_b.status = 'pending_payment' then
    update bookings set status = 'cancelled', payment_status = 'failed', data = data || jsonb_build_object('cancelReason', p_reason) where id = v_b.id;
    return '{"kind":"released"}';
  end if;
  if v_b.status <> 'confirmed' then raise exception 'STATE'; end if;
  select * into v_dep from departures where id = v_b.departure_id;
  select * into v_trip from trips where id = v_b.trip_id;
  v_days := v_dep.start_date - current_date;
  v_pct := case when v_days >= 14 then 100 when v_days >= 7 then 50 else 0 end;
  v_amt := round((v_b.total - v_b.refunded) * v_pct / 100);
  if v_amt = 0 then
    update bookings set status = 'cancelled', data = data || jsonb_build_object('cancelReason', p_reason, 'cancelledAt', now()) where id = v_b.id;
    perform _notify('company:' || v_b.company_id, 'إلغاء حجز', 'Booking cancelled', 'ألغى العميل الحجز ' || v_b.ref || ' (بدون استرداد).', 'Customer cancelled ' || v_b.ref || ' (no refund).', '#/co/bookings');
    return '{"kind":"no_refund"}';
  end if;
  update bookings set status = 'refund_pending', data = data || jsonb_build_object('cancelReason', p_reason) where id = v_b.id;
  insert into refunds (id, booking_id, customer_id, company_id, amount, pct, status, reason)
  values ('rf_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), v_b.id, v_b.customer_id, v_b.company_id, v_amt, v_pct, 'pending', p_reason);
  perform _notify('admin', 'طلب استرداد', 'Refund request', v_b.ref || ': استرداد ' || _fmt(v_amt) || ' ج.م', v_b.ref || ': refund EGP ' || _fmt(v_amt), '#/admin/bookings');
  perform _notify('company:' || v_b.company_id, 'طلب إلغاء', 'Cancellation request', 'طلب إلغاء على ' || (v_trip.data->'title'->>'ar') || ' – ' || v_b.ref, 'Cancellation request – ' || v_b.ref, '#/co/bookings');
  perform _act('طلب استرداد ' || v_b.ref, 'Refund requested ' || v_b.ref);
  return jsonb_build_object('kind', 'refund_pending', 'amount', v_amt);
end $$;

create or replace function public.process_refund(p_refund text, p_approve boolean, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_r refunds; v_b bookings; v_method text;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  perform set_config('rehlaty.trusted', 'on', true);
  select * into v_r from refunds where id = p_refund for update;
  if v_r.id is null or v_r.status <> 'pending' then raise exception 'STATE'; end if;
  select * into v_b from bookings where id = v_r.booking_id for update;
  update refunds set status = case when p_approve then 'approved' else 'rejected' end, processed_at = now(), data = data || jsonb_build_object('note', p_note) where id = v_r.id;
  if p_approve then
    update bookings set refunded = refunded + v_r.amount, status = 'refunded',
      payment_status = case when refunded + v_r.amount >= total then 'refunded' else 'partially_refunded' end,
      commission = round((total - refunded - v_r.amount) * commission_rate / 100)
      where id = v_b.id;
    select method into v_method from payments where booking_id = v_b.id and status = 'paid' limit 1;
    insert into payments (id, booking_id, customer_id, company_id, method, amount, status, idem_key, txn)
    values ('p_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), v_b.id, v_b.customer_id, v_b.company_id, coalesce(v_method, 'card'), -v_r.amount, 'refund', 'refund_' || v_r.id, 'RF' || (1000000 + floor(random() * 8999999))::bigint);
    perform _notify(v_b.customer_id::text, 'تم رد المبلغ', 'Refund processed', 'تم رد ' || _fmt(v_r.amount) || ' ج.م عن الحجز ' || v_b.ref || '. يظهر خلال ٥–٧ أيام عمل.', 'EGP ' || _fmt(v_r.amount) || ' refunded for ' || v_b.ref || '.', '#/me/payments');
    perform _act('تمت الموافقة على استرداد ' || v_b.ref, 'Refund approved ' || v_b.ref);
  else
    update bookings set status = 'confirmed' where id = v_b.id;
    perform _notify(v_b.customer_id::text, 'طلب الاسترداد مرفوض', 'Refund declined', 'لم تتم الموافقة على استرداد ' || v_b.ref || '. ' || coalesce(p_note, ''), 'Refund for ' || v_b.ref || ' was declined. ' || coalesce(p_note, ''), '#/me/booking/' || v_b.ref);
  end if;
end $$;

create or replace function public.add_review(p_booking text, p_ratings jsonb, p_text text)
returns void language plpgsql security definer set search_path = public as $$
declare v_b bookings; v_prof profiles; v_trip trips; k text;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  select * into v_b from bookings where id = p_booking;
  if v_b.id is null or v_b.customer_id <> auth.uid() then raise exception 'FORBIDDEN'; end if;
  if v_b.status <> 'completed' then raise exception 'NOT_COMPLETED'; end if;
  if exists (select 1 from reviews where booking_id = v_b.id) then raise exception 'DUP_REVIEW'; end if;
  foreach k in array array['overall','organization','service','punctuality','company'] loop
    if coalesce((p_ratings->>k)::int, 0) not between 1 and 5 then raise exception 'BAD_RATING'; end if;
  end loop;
  if length(coalesce(p_text, '')) < 20 then raise exception 'SHORT_TEXT'; end if;
  select * into v_prof from profiles where id = v_b.customer_id;
  select * into v_trip from trips where id = v_b.trip_id;
  insert into reviews (id, booking_id, trip_id, company_id, customer_id, customer_name, ratings, text)
  values ('r_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), v_b.id, v_b.trip_id, v_b.company_id, v_b.customer_id, v_prof.name, p_ratings, p_text);
  perform _notify('company:' || v_b.company_id, 'تقييم جديد', 'New review', v_prof.name || ' قيّم ' || (v_trip.data->'title'->>'ar') || ' بـ ' || (p_ratings->>'overall') || ' نجوم.', v_prof.name || ' rated your trip ' || (p_ratings->>'overall') || ' stars.', '#/co/reviews');
end $$;

-- Company cancels a booked departure: every customer refunded in full.
create or replace function public.cancel_departure(p_dep text) returns int
language plpgsql security definer set search_path = public as $$
declare v_dep departures; v_trip trips; v_b bookings; v_amt numeric; v_n int := 0; v_method text;
begin
  select * into v_dep from departures where id = p_dep for update;
  if v_dep.id is null or not (v_dep.company_id = public.my_company() or public.is_admin()) then raise exception 'FORBIDDEN'; end if;
  perform set_config('rehlaty.trusted', 'on', true);
  select * into v_trip from trips where id = v_dep.trip_id;
  update departures set status = 'cancelled' where id = v_dep.id;
  update bookings set status = 'cancelled', payment_status = 'failed' where departure_id = v_dep.id and status = 'pending_payment';
  for v_b in select * from bookings where departure_id = v_dep.id and status in ('confirmed','refund_pending') for update loop
    v_amt := v_b.total - v_b.refunded;
    update refunds set status = 'approved', amount = v_amt, processed_at = now() where booking_id = v_b.id and status = 'pending';
    if not found then
      insert into refunds (id, booking_id, customer_id, company_id, amount, pct, status, reason, processed_at)
      values ('rf_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), v_b.id, v_b.customer_id, v_b.company_id, v_amt, 100, 'approved', 'departure_cancelled_by_company', now());
    end if;
    update bookings set refunded = total, status = 'refunded', payment_status = 'refunded', commission = 0 where id = v_b.id;
    select method into v_method from payments where booking_id = v_b.id and status = 'paid' limit 1;
    insert into payments (id, booking_id, customer_id, company_id, method, amount, status, idem_key, txn)
    values ('p_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), v_b.id, v_b.customer_id, v_b.company_id, coalesce(v_method, 'card'), -v_amt, 'refund', 'cxl_' || v_b.id, 'RF' || (1000000 + floor(random() * 8999999))::bigint);
    perform _notify(v_b.customer_id::text, 'تم إلغاء الرحلة', 'Trip cancelled', 'الشركة ألغت موعد ' || (v_trip.data->'title'->>'ar') || ' يوم ' || v_dep.start_date || '. هيرجعلك ' || _fmt(v_amt) || ' ج.م بالكامل.', 'The operator cancelled the ' || v_dep.start_date || ' departure. EGP ' || _fmt(v_amt) || ' will be refunded in full.', '#/me/booking/' || v_b.ref);
    v_n := v_n + 1;
  end loop;
  perform _notify('admin', 'إلغاء موعد', 'Departure cancelled', 'تم إلغاء موعد ' || v_dep.start_date || ' لرحلة ' || (v_trip.data->'title'->>'ar') || ' (' || v_n || ' حجز).', 'Departure ' || v_dep.start_date || ' cancelled (' || v_n || ' bookings).', '#/admin/bookings');
  return v_n;
end $$;

-- ---------- grants ----------
revoke all on function public._notify(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public._act(text, text) from public, anon, authenticated;
grant execute on function public.resolve_login(text), public.username_available(text), public.register_account(text, text, text, text, text, text, jsonb), public.housekeeping(), public.seat_counts(), public.company_travellers() to anon, authenticated;
revoke execute on function public.create_booking(text, jsonb, text), public.pay_booking(text, text, text, jsonb), public.request_cancel(text, text), public.process_refund(text, boolean, text), public.add_review(text, jsonb, text), public.cancel_departure(text) from public, anon;
grant execute on function public.create_booking(text, jsonb, text), public.pay_booking(text, text, text, jsonb), public.request_cancel(text, text), public.process_refund(text, boolean, text), public.add_review(text, jsonb, text), public.cancel_departure(text) to authenticated;
