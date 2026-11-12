-- =====================================================================
-- Rehlaty (رحلاتي) – Supabase schema
-- Every table: key columns used for security/filters + `data jsonb` for the
-- rest of the object. Row Level Security on everything. Money-moving and
-- seat-moving operations only happen inside SECURITY DEFINER functions.
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- ---------- tables ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_.]{3,24}$'),
  email text unique,
  role text not null check (role in ('customer','company','admin')),
  name text not null,
  phone text,
  city text,
  status text not null default 'active' check (status in ('active','suspended')),
  company_id text,
  favorites jsonb not null default '[]',
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'
);
create table public.companies (
  id text primary key,
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  commission numeric check (commission is null or (commission >= 0 and commission <= 50)),
  owner uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'
);
create table public.destinations (id text primary key, data jsonb not null default '{}');
create table public.categories (id text primary key, data jsonb not null default '{}');
create table public.trips (
  id text primary key,
  company_id text not null references public.companies(id),
  status text not null default 'pending' check (status in ('pending','active','inactive','rejected','hidden')),
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'
);
create table public.departures (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  company_id text not null references public.companies(id),
  start_date date not null,
  end_date date not null,
  price numeric not null check (price > 0),
  seats int not null check (seats > 0),
  status text not null default 'open' check (status in ('open','closed','cancelled')),
  data jsonb not null default '{}',
  check (end_date >= start_date)
);
create table public.bookings (
  id text primary key,
  ref text unique not null,
  customer_id uuid not null references public.profiles(id),
  company_id text not null references public.companies(id),
  trip_id text not null references public.trips(id),
  departure_id text not null references public.departures(id),
  count int not null check (count between 1 and 10),
  status text not null check (status in ('pending_payment','confirmed','cancelled','completed','refund_pending','refunded')),
  payment_status text not null check (payment_status in ('pending','paid','failed','partially_refunded','refunded')),
  total numeric not null,
  commission numeric not null default 0,
  commission_rate numeric not null,
  refunded numeric not null default 0,
  hold_until timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  data jsonb not null default '{}'
);
create index on public.bookings (departure_id);
create index on public.bookings (customer_id);
create index on public.bookings (company_id);
create table public.payments (
  id text primary key,
  booking_id text not null references public.bookings(id),
  customer_id uuid not null,
  company_id text not null,
  method text not null,
  amount numeric not null,
  status text not null check (status in ('paid','failed','refund')),
  idem_key text unique not null,
  txn text,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'
);
create index on public.payments (booking_id);
create table public.refunds (
  id text primary key,
  booking_id text not null references public.bookings(id),
  customer_id uuid not null,
  company_id text not null,
  amount numeric not null,
  pct numeric,
  status text not null check (status in ('pending','approved','rejected')),
  reason text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  data jsonb not null default '{}'
);
create table public.reviews (
  id text primary key,
  booking_id text unique not null references public.bookings(id),
  trip_id text not null references public.trips(id) on delete cascade,
  company_id text not null,
  customer_id uuid not null,
  customer_name text,
  ratings jsonb not null,
  text text not null,
  reply jsonb,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'
);
create table public.notifications (
  id text primary key default gen_random_uuid()::text,
  to_user text not null,          -- user uuid | 'admin' | 'company:<id>'
  title jsonb not null,
  body jsonb not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'
);
create index on public.notifications (to_user);
create table public.settlements (
  id text primary key,
  company_id text not null references public.companies(id),
  amount numeric not null check (amount > 0),
  method text,
  note text,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'
);
create table public.disputes (
  id text primary key,
  booking_id text not null references public.bookings(id),
  company_id text not null,
  customer_id uuid not null,
  subject text not null,
  status text not null default 'open',
  resolution text,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'
);
create table public.activity (
  id text primary key default gen_random_uuid()::text,
  at timestamptz not null default now(),
  text jsonb not null,
  data jsonb not null default '{}'
);
create table public.settings (id text primary key, data jsonb not null default '{}');
create sequence public.booking_ref_seq start 3000;

-- ---------- helpers ----------
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active');
$$;
create or replace function public.my_company() returns text language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid() and role = 'company' and status = 'active';
$$;
-- inside our own SECURITY DEFINER functions we set rehlaty.trusted = on
create or replace function public.trusted() returns boolean language sql stable as $$
  select public.is_admin() or coalesce(current_setting('rehlaty.trusted', true), '') = 'on';
$$;

-- ---------- guard triggers (stop privilege escalation through plain updates) ----------
create or replace function public.guard_profile() returns trigger language plpgsql as $$
begin
  if not public.trusted() then
    new.role := old.role; new.status := old.status; new.company_id := old.company_id;
    new.username := old.username; new.email := old.email; new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger guard_profile before update on public.profiles for each row execute function public.guard_profile();

create or replace function public.guard_company() returns trigger language plpgsql as $$
begin
  if not public.trusted() then
    new.status := old.status; new.commission := old.commission; new.owner := old.owner; new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger guard_company before update on public.companies for each row execute function public.guard_company();

create or replace function public.guard_trip() returns trigger language plpgsql as $$
begin
  if public.trusted() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    if new.company_id is distinct from public.my_company() then raise exception 'FORBIDDEN'; end if;
    if not exists (select 1 from companies where id = new.company_id and status = 'approved') then raise exception 'COMPANY_NOT_APPROVED'; end if;
    return new;
  end if;
  new.company_id := old.company_id;
  if new.status is distinct from old.status and not (
       (old.status = 'active' and new.status = 'inactive') or
       (old.status = 'inactive' and new.status = 'active') or
       (old.status = 'rejected' and new.status = 'pending')) then
    new.status := old.status;
  end if;
  return new;
end $$;
create trigger guard_trip before insert or update on public.trips for each row execute function public.guard_trip();

create or replace function public.guard_departure() returns trigger language plpgsql as $$
declare v_booked int;
begin
  select company_id into new.company_id from trips where id = new.trip_id;
  if public.trusted() then return new; end if;
  if new.company_id is distinct from public.my_company() then raise exception 'FORBIDDEN'; end if;
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
create trigger guard_departure before insert or update on public.departures for each row execute function public.guard_departure();

create or replace function public.guard_review() returns trigger language plpgsql as $$
begin
  if not public.trusted() then
    new.ratings := old.ratings; new.text := old.text; new.customer_id := old.customer_id;
    new.booking_id := old.booking_id; new.company_id := old.company_id; new.trip_id := old.trip_id; new.customer_name := old.customer_name;
  end if;
  return new;
end $$;
create trigger guard_review before update on public.reviews for each row execute function public.guard_review();

create or replace function public.guard_notification() returns trigger language plpgsql as $$
begin
  if not public.trusted() then
    new.to_user := old.to_user; new.title := old.title; new.body := old.body; new.link := old.link;
  end if;
  return new;
end $$;
create trigger guard_notification before update on public.notifications for each row execute function public.guard_notification();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.destinations enable row level security;
alter table public.categories enable row level security;
alter table public.trips enable row level security;
alter table public.departures enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.settlements enable row level security;
alter table public.disputes enable row level security;
alter table public.activity enable row level security;
alter table public.settings enable row level security;

create policy profiles_select on public.profiles for select using (
  id = auth.uid() or public.is_admin()
  or (public.my_company() is not null and exists (select 1 from bookings b where b.customer_id = profiles.id and b.company_id = public.my_company())));
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.is_admin());

create policy companies_select on public.companies for select using (status = 'approved' or id = public.my_company() or public.is_admin());
create policy companies_update on public.companies for update using (id = public.my_company() or public.is_admin());
create policy companies_admin_insert on public.companies for insert with check (public.is_admin());

create policy dest_select on public.destinations for select using (true);
create policy dest_admin on public.destinations for all using (public.is_admin()) with check (public.is_admin());
create policy cat_select on public.categories for select using (true);
create policy cat_admin on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy trips_select on public.trips for select using (
  (status = 'active' and exists (select 1 from companies c where c.id = trips.company_id and c.status = 'approved'))
  or company_id = public.my_company() or public.is_admin());
create policy trips_insert on public.trips for insert with check (company_id = public.my_company() or public.is_admin());
create policy trips_update on public.trips for update using (company_id = public.my_company() or public.is_admin());
create policy trips_delete on public.trips for delete using (company_id = public.my_company() or public.is_admin());

create policy deps_select on public.departures for select using (true);
create policy deps_insert on public.departures for insert with check (company_id = public.my_company() or public.is_admin());
create policy deps_update on public.departures for update using (company_id = public.my_company() or public.is_admin());
create policy deps_delete on public.departures for delete using (company_id = public.my_company() or public.is_admin());

create policy bookings_select on public.bookings for select using (customer_id = auth.uid() or company_id = public.my_company() or public.is_admin());
create policy payments_select on public.payments for select using (customer_id = auth.uid() or company_id = public.my_company() or public.is_admin());
create policy refunds_select on public.refunds for select using (customer_id = auth.uid() or company_id = public.my_company() or public.is_admin());

create policy reviews_select on public.reviews for select using (true);
create policy reviews_update on public.reviews for update using (company_id = public.my_company() or public.is_admin());

create policy notif_select on public.notifications for select using (
  to_user = auth.uid()::text or (to_user = 'admin' and public.is_admin()) or to_user = 'company:' || public.my_company());
create policy notif_update on public.notifications for update using (
  to_user = auth.uid()::text or (to_user = 'admin' and public.is_admin()) or to_user = 'company:' || public.my_company());
create policy notif_insert on public.notifications for insert with check (auth.uid() is not null);

create policy settle_select on public.settlements for select using (company_id = public.my_company() or public.is_admin());
create policy settle_insert on public.settlements for insert with check (public.is_admin());

create policy disputes_select on public.disputes for select using (customer_id = auth.uid() or company_id = public.my_company() or public.is_admin());
create policy disputes_update on public.disputes for update using (public.is_admin());

create policy activity_select on public.activity for select using (public.is_admin());
create policy activity_insert on public.activity for insert with check (auth.uid() is not null);

create policy settings_select on public.settings for select using (true);
create policy settings_update on public.settings for update using (public.is_admin());
