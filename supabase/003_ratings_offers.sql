-- =====================================================================
-- 003: Platform rating for companies + seasonal offers (campaigns)
-- =====================================================================
-- Rehlaty's own 1–5 rating of each company. Only the admin can set it.
alter table public.companies add column if not exists platform_rating smallint check (platform_rating between 1 and 5);

create or replace function public.guard_company() returns trigger language plpgsql set search_path = public as $$
begin
  if not public.trusted() then
    new.status := old.status; new.commission := old.commission; new.owner := old.owner;
    new.created_at := old.created_at; new.platform_rating := old.platform_rating;
  end if;
  return new;
end $$;

-- Seasonal offers live in settings.data.campaigns (only the admin can update settings):
-- { id, season: christmas|midyear|summer|eid, title{ar,en}, note{ar,en}, companyId, tripIds[], percent, from, until, active, agreement }
-- create_booking applies the best of (active campaign for this trip) and (promo code) — they don't stack.
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
  if v_n < 1 or v_n > 10 then raise exception 'COUNT'; end if;
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
          jsonb_build_object('travelers', p_travelers, 'unitPrice', v_dep.price, 'subtotal', v_sub, 'discount', v_disc, 'promo', v_promo, 'campaignId', v_campaign))
  returning * into v_b;
  return to_jsonb(v_b);
end $$;
revoke execute on function public.create_booking(text, jsonb, text) from public, anon;
grant execute on function public.create_booking(text, jsonb, text) to authenticated;

-- Demo values (the admin can change or clear them from the dashboard).
-- The guard trigger blocks this column unless the trusted flag is on.
select set_config('rehlaty.trusted', 'on', true);
update public.companies set platform_rating = v.r from (values ('c1', 5), ('c2', 4), ('c3', 5), ('c4', 3)) as v(id, r) where companies.id = v.id;
update public.settings set data = jsonb_set(data, '{campaigns}', '[
  {"id":"cp_xmas","season":"christmas","title":{"ar":"عروض الكريسماس ورأس السنة على البحر الأحمر","en":"Christmas & New Year on the Red Sea"},"note":{"ar":"خصم على الإقامة الشاملة لحجوزات موسم الأعياد","en":"Discount on all‑inclusive stays for the holiday season"},"companyId":"c2","tripIds":["t1","t13"],"percent":15,"from":"2026-11-17","until":"2027-01-05","active":true,"agreement":"اتفاق مع بحر وصحرا – نوفمبر ٢٠٢٦"},
  {"id":"cp_mid","season":"midyear","title":{"ar":"إجازة نصف العام في الصعيد","en":"Mid‑year break in Upper Egypt"},"note":{"ar":"خصم للعائلات والطلبة على رحلات الأقصر وأسوان","en":"Family and student discount on Luxor and Aswan trips"},"companyId":"c1","tripIds":["t4","t5","t6"],"percent":12,"from":"2026-11-17","until":"2027-02-10","active":true,"agreement":"اتفاق مع نيل ستار – نوفمبر ٢٠٢٦"},
  {"id":"cp_eid","season":"eid","title":{"ar":"عروض العيد في سيوة","en":"Eid offers in Siwa"},"note":{"ar":"خصم على رحلة سيوة طوال أيام عيد الفطر","en":"Siwa trip discount through Eid al‑Fitr"},"companyId":"c3","tripIds":["t7"],"percent":10,"from":"2027-02-20","until":"2027-03-20","active":true,"agreement":"اتفاق مع دروب سيوة"},
  {"id":"cp_summer","season":"summer","title":{"ar":"صيف الساحل الشمالي","en":"North Coast summer"},"note":{"ar":"خصم الحجز المبكر لشقق العلمين","en":"Early‑booking discount on Alamein apartments"},"companyId":"c4","tripIds":["t10"],"percent":20,"from":"2027-04-01","until":"2027-08-31","active":true,"agreement":"اتفاق مع أفق للرحلات"}
]'::jsonb) where id = 'main';
