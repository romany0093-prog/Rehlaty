-- =====================================================================
-- 004: Custom trip requests ("خطط رحلتك")
-- Customer posts a request → every approved company is notified → companies
-- send offers → customer accepts one → a private trip + departure is created
-- for that customer only → normal checkout and payment → request closes and
-- the other companies are told. Customer contact details stay hidden from
-- companies until a booking exists (profiles RLS already works that way).
-- =====================================================================

-- private trips: created from an accepted offer, bookable only by the requester
alter table public.trips drop constraint if exists trips_status_check;
alter table public.trips add constraint trips_status_check check (status in ('pending','active','inactive','rejected','hidden','private'));
drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips for select using (
  (status = 'active' and exists (select 1 from companies c where c.id = trips.company_id and c.status = 'approved'))
  or (status = 'private' and data->>'requestCustomer' = auth.uid()::text)
  or company_id = public.my_company() or public.is_admin());

create table public.trip_requests (
  id text primary key,
  customer_id uuid not null references public.profiles(id),
  status text not null default 'open' check (status in ('open','accepted','booked','cancelled','expired')),
  expires_at timestamptz not null,           -- companies can send offers until then
  accepted_offer_id text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'           -- dests, dates, travellers, budget, specs, program, initials, city
);
create index on public.trip_requests (customer_id);
create table public.request_offers (
  id text primary key,
  request_id text not null references public.trip_requests(id) on delete cascade,
  company_id text not null references public.companies(id),
  status text not null default 'sent' check (status in ('sent','withdrawn','declined','accepted','lost')),
  price numeric not null check (price > 0),  -- per person
  total numeric not null,
  trip_id text,                               -- private trip created on acceptance
  departure_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}',           -- start, end, destId, catId, title, program, stay, transport, included, excluded, validUntil, notes, basedOn
  unique (request_id, company_id)
);
create table public.request_messages (
  id text primary key default gen_random_uuid()::text,
  request_id text not null references public.trip_requests(id) on delete cascade,
  company_id text not null references public.companies(id),
  sender text not null check (sender in ('customer','company')),
  text text not null check (length(text) between 1 and 1000),
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'
);
create index on public.request_messages (request_id, company_id);

-- helpers that read across the two tables without re-entering their row rules (avoids policy recursion)
create or replace function public._req_owner(p_req text) returns uuid language sql stable security definer set search_path = public as $$ select customer_id from trip_requests where id = p_req $$;
create or replace function public._co_offered(p_req text) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from request_offers where request_id = p_req and company_id = public.my_company()) $$;
create or replace function public._co_approved() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from companies where id = public.my_company() and status = 'approved') $$;

alter table public.trip_requests enable row level security;
alter table public.request_offers enable row level security;
alter table public.request_messages enable row level security;
-- approved companies see open requests (and any they have offered on); never the customer's contact details
create policy req_select on public.trip_requests for select using (
  customer_id = auth.uid() or public.is_admin()
  or (public._co_approved() and (status = 'open' or public._co_offered(id))));
create policy offer_select on public.request_offers for select using (
  company_id = public.my_company() or public.is_admin()
  or public._req_owner(request_id) = auth.uid());
create policy msg_select on public.request_messages for select using (
  company_id = public.my_company() or public.is_admin()
  or public._req_owner(request_id) = auth.uid());
-- all writes go through the functions below (no insert/update/delete policies)

create or replace function public._rid(p text) returns text language sql volatile as $$ select p || substr(md5(random()::text || clock_timestamp()::text), 1, 12) $$;

-- ---------- customer ----------
create or replace function public.create_trip_request(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_prof profiles; v_id text; v_days int; v_pax int; c record; v_dests text;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  select * into v_prof from profiles where id = auth.uid();
  if v_prof.id is null or v_prof.role <> 'customer' then raise exception 'AUTH'; end if;
  if v_prof.status <> 'active' then raise exception 'SUSPENDED'; end if;
  if (select count(*) from trip_requests where customer_id = v_prof.id and status in ('open','accepted')) >= 3 then raise exception 'MAX_REQUESTS'; end if;
  if jsonb_array_length(coalesce(p->'dests', '[]')) = 0 and not coalesce((p->>'anyDest')::boolean, false) then raise exception 'REQ_DEST'; end if;
  if (p->>'from')::date <= current_date or (p->>'to')::date < (p->>'from')::date then raise exception 'REQ_DATES'; end if;
  v_pax := coalesce((p->>'adults')::int, 0) + coalesce((p->>'children')::int, 0);
  if coalesce((p->>'adults')::int, 0) < 1 or v_pax > 40 then raise exception 'REQ_PAX'; end if;
  v_days := coalesce((p->>'window')::int, 5); if v_days not in (3, 5, 7) then v_days := 5; end if;
  v_id := _rid('rq_');
  insert into trip_requests (id, customer_id, expires_at, data)
  values (v_id, v_prof.id, now() + make_interval(days => v_days),
          (p - 'initials' - 'city') || jsonb_build_object('initials', (select string_agg(left(w, 1), '. ') || '.' from unnest(string_to_array(trim(v_prof.name), ' ')) w), 'city', coalesce(v_prof.city, '')));
  select string_agg(coalesce(d.data->'name'->>'ar', x), '، ') into v_dests from jsonb_array_elements_text(coalesce(p->'dests', '[]')) x left join destinations d on d.id = x;
  for c in select id from companies where status = 'approved' loop
    perform _notify('company:' || c.id, 'طلب رحلة مخصصة جديد', 'New custom trip request',
      'عميل طلب رحلة ' || coalesce(v_dests, 'لوجهة مفتوحة') || ' من ' || (p->>'from') || ' لـ ' || v_pax || ' أفراد. ابعت عرضك قبل ' || to_char(now() + make_interval(days => v_days), 'YYYY-MM-DD') || '.',
      'A customer requested a custom trip (' || v_pax || ' people, from ' || (p->>'from') || '). Send your offer.', '#/co/request/' || v_id);
  end loop;
  perform _act('طلب رحلة مخصصة جديد من ' || v_prof.name, 'New custom trip request from ' || v_prof.name);
  return v_id;
end $$;

create or replace function public.cancel_trip_request(p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare r trip_requests; o record;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  select * into r from trip_requests where id = p_id for update;
  if r.id is null or r.customer_id <> auth.uid() then raise exception 'FORBIDDEN'; end if;
  if r.status not in ('open', 'accepted') then raise exception 'STATE'; end if;
  if exists (select 1 from bookings b where b.data->>'requestId' = r.id and b.status in ('confirmed','completed','refund_pending')) then raise exception 'STATE'; end if;
  update trip_requests set status = 'cancelled' where id = r.id;
  for o in select * from request_offers where request_id = r.id and status in ('sent','accepted') loop
    perform _notify('company:' || o.company_id, 'العميل ألغى طلب الرحلة', 'Request cancelled', 'العميل ألغى طلب الرحلة المخصصة اللي بعتّ عليه عرض.', 'The customer cancelled a request you offered on.', '#/co/request/' || r.id);
  end loop;
  update request_offers set status = 'lost' where request_id = r.id and status in ('sent','accepted');
end $$;

create or replace function public.decline_offer(p_offer text) returns void
language plpgsql security definer set search_path = public as $$
declare o request_offers; r trip_requests;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  select * into o from request_offers where id = p_offer for update;
  select * into r from trip_requests where id = o.request_id;
  if o.id is null or r.customer_id <> auth.uid() then raise exception 'FORBIDDEN'; end if;
  if o.status <> 'sent' then raise exception 'STATE'; end if;
  update request_offers set status = 'declined', updated_at = now() where id = o.id;
  perform _notify('company:' || o.company_id, 'العميل اعتذر عن عرضك', 'Offer declined', 'العميل اعتذر عن عرضك على طلب الرحلة المخصصة. تقدر تبعت عرض معدّل لو الطلب لسه مفتوح.', 'The customer declined your offer. You can send a revised one while the request is open.', '#/co/request/' || r.id);
end $$;

-- Accept: creates (or reuses) a private trip + departure for this customer; checkout and payment follow.
create or replace function public.accept_offer(p_offer text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o request_offers; r trip_requests; v_trip text; v_dep text; v_pax int; v_days int;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  select * into o from request_offers where id = p_offer for update;
  select * into r from trip_requests where id = o.request_id for update;
  if o.id is null or r.customer_id <> auth.uid() then raise exception 'FORBIDDEN'; end if;
  if r.status = 'accepted' and r.accepted_offer_id = o.id and o.trip_id is not null then
    return jsonb_build_object('tripId', o.trip_id, 'depId', o.departure_id, 'n', (r.data->>'adults')::int + coalesce((r.data->>'children')::int, 0));
  end if;
  if r.status <> 'open' then raise exception 'STATE'; end if;
  if o.status <> 'sent' then raise exception 'OFFER_STATE'; end if;
  if (o.data->>'validUntil')::date < current_date then raise exception 'OFFER_EXPIRED'; end if;
  if (o.data->>'start')::date <= current_date then raise exception 'DEP_CLOSED'; end if;
  if not exists (select 1 from companies where id = o.company_id and status = 'approved') then raise exception 'UNAVAILABLE'; end if;
  v_pax := (r.data->>'adults')::int + coalesce((r.data->>'children')::int, 0);
  v_days := (o.data->>'end')::date - (o.data->>'start')::date + 1;
  v_trip := coalesce(o.trip_id, _rid('tp_'));
  v_dep := coalesce(o.departure_id, _rid('dp_'));
  if o.trip_id is null then
    insert into trips (id, company_id, status, data) values (v_trip, o.company_id, 'private', jsonb_build_object(
      'title', jsonb_build_object('ar', coalesce(o.data->>'title', 'رحلة مخصصة'), 'en', coalesce(o.data->>'title', 'Custom trip')),
      'summary', jsonb_build_object('ar', coalesce(o.data->>'notes', ''), 'en', ''), 'desc', jsonb_build_object('ar', coalesce(o.data->>'notes', ''), 'en', ''),
      'destId', o.data->>'destId', 'catId', coalesce(o.data->>'catId', 'family'), 'days', v_days, 'basePrice', o.price,
      'itinerary', coalesce(o.data->'program', '[]'), 'accommodation', jsonb_build_object('ar', coalesce(o.data->>'stay', ''), 'en', ''),
      'transport', jsonb_build_object('ar', coalesce(o.data->>'transport', ''), 'en', ''), 'included', coalesce(o.data->'included', '[]'), 'excluded', coalesce(o.data->'excluded', '[]'),
      'policy', jsonb_build_object('ar', 'نفس سياسة الإلغاء على رحلاتي: استرداد كامل قبل ١٤ يومًا، ٥٠٪ من ١٤ إلى ٧ أيام، ولا استرداد خلال ٧ أيام.', 'en', ''),
      'images', case when jsonb_array_length(coalesce(o.data->'images', '[]')) > 0 then o.data->'images' else jsonb_build_array('art:' || coalesce((select data->>'art' from destinations where id = o.data->>'destId'), 'sea') || ':0') end, 'seats', v_pax, 'requestId', r.id, 'offerId', o.id, 'requestCustomer', r.customer_id::text, 'custom', true));
    insert into departures (id, trip_id, company_id, start_date, end_date, price, seats, status) values (v_dep, v_trip, o.company_id, (o.data->>'start')::date, (o.data->>'end')::date, o.price, v_pax, 'open');
  end if;
  update request_offers set status = 'accepted', trip_id = v_trip, departure_id = v_dep, updated_at = now() where id = o.id;
  update trip_requests set status = 'accepted', accepted_offer_id = o.id, accepted_at = now() where id = r.id;
  perform _notify('company:' || o.company_id, 'العميل قبل عرضك', 'Your offer was accepted', 'العميل قبل عرضك على الرحلة المخصصة وبيكمل الدفع دلوقتي.', 'The customer accepted your offer and is completing payment.', '#/co/request/' || r.id);
  return jsonb_build_object('tripId', v_trip, 'depId', v_dep, 'n', v_pax);
end $$;

-- ---------- company ----------
create or replace function public.send_offer(p_request text, p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_co text := public.my_company(); r trip_requests; o request_offers; v_pax int; v_price numeric; v_id text; v_new boolean;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  if v_co is null or not exists (select 1 from companies where id = v_co and status = 'approved') then raise exception 'FORBIDDEN'; end if;
  select * into r from trip_requests where id = p_request for update;
  if r.id is null then raise exception 'NOT_FOUND'; end if;
  if r.status <> 'open' or r.expires_at < now() then raise exception 'REQ_CLOSED'; end if;
  v_price := (p->>'price')::numeric;
  if v_price is null or v_price <= 0 then raise exception 'OFFER_PRICE'; end if;
  if (p->>'start')::date <= current_date or (p->>'end')::date < (p->>'start')::date then raise exception 'REQ_DATES'; end if;
  if coalesce((p->>'validUntil')::date, current_date - 1) < current_date then raise exception 'OFFER_VALID'; end if;
  if coalesce(p->>'destId', '') = '' or coalesce(p->>'title', '') = '' then raise exception 'OFFER_FIELDS'; end if;
  v_pax := (r.data->>'adults')::int + coalesce((r.data->>'children')::int, 0);
  select * into o from request_offers where request_id = r.id and company_id = v_co;
  v_new := o.id is null or o.status in ('withdrawn', 'declined');
  if o.id is null then
    v_id := _rid('of_');
    insert into request_offers (id, request_id, company_id, status, price, total, data) values (v_id, r.id, v_co, 'sent', v_price, v_price * v_pax, p);
  else
    if o.status not in ('sent', 'withdrawn', 'declined') then raise exception 'OFFER_STATE'; end if;
    v_id := o.id;
    update request_offers set status = 'sent', price = v_price, total = v_price * v_pax, data = p, trip_id = null, departure_id = null, updated_at = now() where id = o.id;
  end if;
  perform _notify(r.customer_id::text, case when v_new then 'وصلك عرض جديد على رحلتك' else 'تحديث على عرض رحلتك' end, case when v_new then 'New offer for your trip' else 'Offer updated' end,
    (select data->'name'->>'ar' from companies where id = v_co) || ' ' || case when v_new then 'بعتت' else 'عدّلت' end || ' عرض بسعر ' || _fmt(v_price) || ' ج.م للفرد.',
    (select coalesce(data->'name'->>'en', data->'name'->>'ar') from companies where id = v_co) || case when v_new then ' sent' else ' updated' end || ' an offer: EGP ' || _fmt(v_price) || ' per person.', '#/me/request/' || r.id);
  return v_id;
end $$;

create or replace function public.withdraw_offer(p_offer text) returns void
language plpgsql security definer set search_path = public as $$
declare o request_offers; r trip_requests;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  select * into o from request_offers where id = p_offer for update;
  if o.id is null or o.company_id is distinct from public.my_company() then raise exception 'FORBIDDEN'; end if;
  if o.status <> 'sent' then raise exception 'OFFER_STATE'; end if;
  select * into r from trip_requests where id = o.request_id;
  update request_offers set status = 'withdrawn', updated_at = now() where id = o.id;
  perform _notify(r.customer_id::text, 'شركة سحبت عرضها', 'An offer was withdrawn', 'شركة سحبت عرضها على طلب رحلتك المخصصة.', 'A company withdrew its offer on your request.', '#/me/request/' || r.id);
end $$;

-- ---------- messages (one thread per request + company) ----------
create or replace function public.send_request_message(p_request text, p_company text, p_text text) returns void
language plpgsql security definer set search_path = public as $$
declare r trip_requests; v_sender text; v_co text := public.my_company(); v_name text;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  select * into r from trip_requests where id = p_request;
  if r.id is null then raise exception 'NOT_FOUND'; end if;
  if r.status = 'cancelled' then raise exception 'REQ_CLOSED'; end if;
  if length(trim(coalesce(p_text, ''))) = 0 or length(p_text) > 1000 then raise exception 'MSG_TEXT'; end if;
  if r.customer_id = auth.uid() then
    v_sender := 'customer';
    if not exists (select 1 from companies where id = p_company and status = 'approved') then raise exception 'FORBIDDEN'; end if;
  elsif v_co is not null and v_co = p_company and (r.status = 'open' or exists (select 1 from request_offers where request_id = r.id and company_id = v_co)) then
    v_sender := 'company';
  else raise exception 'FORBIDDEN'; end if;
  insert into request_messages (request_id, company_id, sender, text) values (r.id, p_company, v_sender, trim(p_text));
  select data->'name'->>'ar' into v_name from companies where id = p_company;
  if v_sender = 'company' then
    perform _notify(r.customer_id::text, 'رسالة من ' || v_name, 'Message from ' || v_name, left(trim(p_text), 120), left(trim(p_text), 120), '#/me/request/' || r.id);
  else
    perform _notify('company:' || p_company, 'رسالة من عميل على طلب رحلة', 'Message from a customer', left(trim(p_text), 120), left(trim(p_text), 120), '#/co/request/' || r.id);
  end if;
end $$;

-- ---------- private trips are bookable only by the requester; booking records the request ----------
create or replace function public.create_booking(p_dep text, p_travelers jsonb, p_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_prof profiles; v_dep departures; v_trip trips; v_comp companies; v_set jsonb;
  v_n int := jsonb_array_length(p_travelers);
  v_booked int; v_held int; v_sub numeric; v_disc numeric := 0; v_cdisc numeric := 0; v_total numeric; v_rate numeric;
  v_offer jsonb; v_camp jsonb; v_dup bookings; v_b bookings; v_promo text := ''; v_campaign text := null;
begin
  perform set_config('rehlaty.trusted', 'on', true);
  select * into v_prof from profiles where id = v_uid;
  if v_prof.id is null or v_prof.role <> 'customer' then raise exception 'AUTH'; end if;
  if v_prof.status <> 'active' then raise exception 'SUSPENDED'; end if;
  if v_n < 1 or v_n > 40 then raise exception 'COUNT'; end if;
  select * into v_dep from departures where id = p_dep for update;
  if v_dep.id is null then raise exception 'UNAVAILABLE'; end if;
  select * into v_trip from trips where id = v_dep.trip_id;
  select * into v_comp from companies where id = v_trip.company_id;
  if not (v_trip.status = 'active' or (v_trip.status = 'private' and v_trip.data->>'requestCustomer' = v_uid::text)) or v_comp.status <> 'approved' then raise exception 'UNAVAILABLE'; end if;
  if v_trip.status = 'active' and v_n > 10 then raise exception 'COUNT'; end if;
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
    select o into v_offer from jsonb_array_elements(coalesce(v_set->'offers', '[]')) o
      where (o->>'active')::boolean and upper(o->>'code') = upper(trim(p_code)) and (o->>'until')::date >= current_date
        and (jsonb_array_length(o->'dests') = 0 or (o->'dests') ? (v_trip.data->>'destId')) limit 1;
    if v_offer is not null then v_disc := round(v_sub * (v_offer->>'percent')::numeric / 100); end if;
  end if;
  select c into v_camp from jsonb_array_elements(coalesce(v_set->'campaigns', '[]')) c
    where (c->>'active')::boolean and current_date between (c->>'from')::date and (c->>'until')::date
      and c->>'companyId' = v_comp.id and (c->'tripIds') ? v_trip.id
    order by (c->>'percent')::numeric desc limit 1;
  if v_camp is not null then v_cdisc := round(v_sub * (v_camp->>'percent')::numeric / 100); end if;
  if v_cdisc >= v_disc and v_cdisc > 0 then
    v_disc := v_cdisc; v_promo := coalesce(v_camp->'title'->>'ar', ''); v_campaign := v_camp->>'id';
  elsif v_disc > 0 then
    v_promo := v_offer->>'code';
  end if;
  v_total := v_sub - v_disc;
  v_rate := coalesce(v_comp.commission, (v_set->>'commission')::numeric, 10);
  insert into bookings (id, ref, customer_id, company_id, trip_id, departure_id, count, status, payment_status, total, commission, commission_rate, hold_until, data)
  values ('b_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
          'RH-' || to_char(v_dep.start_date, 'YYMM') || '-' || nextval('booking_ref_seq'),
          v_uid, v_comp.id, v_trip.id, v_dep.id, v_n, 'pending_payment', 'pending', v_total, round(v_total * v_rate / 100), v_rate,
          now() + make_interval(mins => coalesce((v_set->>'holdMinutes')::int, 15)),
          jsonb_build_object('travelers', p_travelers, 'unitPrice', v_dep.price, 'subtotal', v_sub, 'discount', v_disc, 'promo', v_promo, 'campaignId', v_campaign, 'requestId', v_trip.data->>'requestId'))
  returning * into v_b;
  return to_jsonb(v_b);
end $$;
revoke execute on function public.create_booking(text, jsonb, text) from public, anon;
grant execute on function public.create_booking(text, jsonb, text) to authenticated;

create or replace function public.guard_trip() returns trigger language plpgsql set search_path = public as $$
begin
  if public.trusted() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    if new.company_id is distinct from public.my_company() then raise exception 'FORBIDDEN'; end if;
    if not exists (select 1 from companies where id = new.company_id and status = 'approved') then raise exception 'COMPANY_NOT_APPROVED'; end if;
    return new;
  end if;
  if old.status = 'private' then raise exception 'PRIVATE_LOCKED'; end if;
  new.company_id := old.company_id;
  if new.status is distinct from old.status and not (
       (old.status = 'active' and new.status = 'inactive') or
       (old.status = 'inactive' and new.status = 'active') or
       (old.status = 'rejected' and new.status = 'pending')) then
    new.status := old.status;
  end if;
  return new;
end $$;
create or replace function public.guard_departure() returns trigger language plpgsql set search_path = public as $$
declare v_booked int;
begin
  select company_id into new.company_id from trips where id = new.trip_id;
  if public.trusted() then return new; end if;
  if new.company_id is distinct from public.my_company() then raise exception 'FORBIDDEN'; end if;
  if exists (select 1 from trips where id = new.trip_id and status = 'private') then raise exception 'PRIVATE_LOCKED'; end if;
  if tg_op = 'INSERT' then
    new.status := 'open';
    if new.start_date <= current_date then raise exception 'DATE_IN_PAST'; end if;
  else
    if new.status = 'cancelled' and old.status <> 'cancelled' then raise exception 'USE_CANCEL_DEPARTURE'; end if;
    select coalesce(sum(count), 0) into v_booked from bookings where departure_id = new.id
      and (status in ('confirmed','completed','refund_pending') or (status = 'pending_payment' and hold_until > now()));
    if new.seats < v_booked then raise exception 'SEATS_BELOW_BOOKED'; end if;
  end if;
  return new;
end $$;

-- When a request's booking is paid: close the request and tell the other companies.
create or replace function public.on_request_booking_paid() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_req text := new.data->>'requestId'; o record;
begin
  if v_req is null or new.payment_status <> 'paid' or old.payment_status = 'paid' then return new; end if;
  perform set_config('rehlaty.trusted', 'on', true);
  update trip_requests set status = 'booked' where id = v_req;
  for o in select * from request_offers where request_id = v_req and status = 'sent' loop
    perform _notify('company:' || o.company_id, 'العميل اختار عرض تاني', 'Customer chose another offer', 'العميل حجز عرض شركة تانية على طلب الرحلة المخصصة. شكرًا على عرضك.', 'The customer booked another company’s offer. Thanks for your offer.', '#/co/request/' || v_req);
  end loop;
  update request_offers set status = 'lost', updated_at = now() where request_id = v_req and status = 'sent';
  return new;
end $$;
create trigger request_booking_paid after update of payment_status on public.bookings for each row execute function public.on_request_booking_paid();

-- housekeeping: accepted-but-never-paid requests reopen; requests with no offers expire
create or replace function public.housekeeping() returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('rehlaty.trusted', 'on', true);
  update bookings set status = 'cancelled', payment_status = 'failed', data = data || '{"cancelReason":"hold_expired"}'
    where status = 'pending_payment' and hold_until < now();
  update bookings b set status = 'completed' from departures d
    where b.departure_id = d.id and b.status = 'confirmed' and d.end_date < current_date;
  update departures set status = 'closed' where status = 'open' and start_date <= current_date;
  update request_offers o set status = 'sent', updated_at = now() from trip_requests r
    where o.id = r.accepted_offer_id and r.status = 'accepted' and r.accepted_at < now() - interval '30 minutes'
      and not exists (select 1 from bookings b where b.data->>'requestId' = r.id and (b.status in ('confirmed','completed','refund_pending') or (b.status = 'pending_payment' and b.hold_until > now())));
  update trip_requests r set status = 'open', accepted_offer_id = null, accepted_at = null
    where r.status = 'accepted' and r.accepted_at < now() - interval '30 minutes'
      and not exists (select 1 from bookings b where b.data->>'requestId' = r.id and (b.status in ('confirmed','completed','refund_pending') or (b.status = 'pending_payment' and b.hold_until > now())));
  update trip_requests r set status = 'expired' where r.status = 'open' and r.expires_at < now()
    and not exists (select 1 from request_offers o where o.request_id = r.id and o.status = 'sent' and (o.data->>'validUntil')::date >= current_date);
end $$;

revoke all on function public._rid(text) from public, anon, authenticated;
revoke all on function public._req_owner(text), public._co_offered(text), public._co_approved() from public, anon;
revoke execute on function public.create_trip_request(jsonb), public.cancel_trip_request(text), public.decline_offer(text), public.accept_offer(text), public.send_offer(text, jsonb), public.withdraw_offer(text), public.send_request_message(text, text, text) from public, anon;
grant execute on function public.create_trip_request(jsonb), public.cancel_trip_request(text), public.decline_offer(text), public.accept_offer(text), public.send_offer(text, jsonb), public.withdraw_offer(text), public.send_request_message(text, text, text) to authenticated;
