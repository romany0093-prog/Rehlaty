-- Security regression suite for the Supabase database (RLS, RPC authorization, tenant isolation, validation).
-- Runs as the real API roles (anon / authenticated + JWT claims), exactly like PostgREST does.
-- Everything happens inside one transaction that is ROLLED BACK: nothing is left in the database.
-- Usage: paste into the Supabase SQL editor (or run with psql) and read the last result: every row must say PASS.
-- Requires the demo accounts: mariam (customer), ahmed (customer), khaled (suspended customer),
-- bahr (company c2), nilestar (company c1, suspended), admin.
begin;
create temp table res(n serial, id text, expect text, result text);
create or replace function pg_temp.run(p_id text, p_user text, p_expect text, p_sql text, p_into boolean default true) returns void language plpgsql as $$
declare v text; v_uid uuid;
begin
  if p_user is not null then select id into v_uid from public.profiles where username = p_user; end if;
  perform set_config('request.jwt.claims', case when v_uid is null then '{"role":"anon"}' else json_build_object('sub', v_uid, 'role', 'authenticated')::text end, true);
  perform set_config('rehlaty.trusted', '', true);
  execute case when v_uid is null then 'set local role anon' else 'set local role authenticated' end;
  begin if p_into then execute p_sql into v; else execute p_sql; v := 'OK'; end if; exception when others then v := 'ERR: ' || sqlerrm; end;
  execute 'reset role';
  insert into res(id, expect, result) values (p_id, p_expect, coalesce(v, 'NULL'));
end $$;
grant execute on function pg_temp.run(text,text,text,text,boolean) to public;
-- fixture (rolled back): company c2 approved with one bookable departure of 3 seats
select set_config('rehlaty.trusted','on',true);
update public.companies set status='approved' where id='c2';
update public.trips set status='active' where id=(select id from public.trips where company_id='c2' order by id limit 1);
insert into public.departures(id,trip_id,company_id,start_date,end_date,price,seats,status) values ('dp_sec',(select id from public.trips where company_id='c2' order by id limit 1),'c2',current_date+30,current_date+33,1000,3,'open');
select set_config('rehlaty.trusted','',true);

-- authentication / account surface
select pg_temp.run('AUTH-01 username lookup without password reveals nothing', null, '^NULL$', $q$select public.resolve_login('mariam','wrong-password')$q$);
select pg_temp.run('AUTH-02 legacy 1-argument lookup removed', null, 'does not exist', $q$select public.resolve_login('mariam')$q$);
select pg_temp.run('AUTH-03 sign-up rejects weak password', null, 'WEAK_PASSWORD', $q$select public.register_account('sec_tmp1','sec_tmp1@example.com','123456','Sec Tmp','010','customer',null)::text$q$);
select pg_temp.run('AUTH-04 sign-up cannot create admin', null, 'BAD_ROLE', $q$select public.register_account('sec_tmp2','sec_tmp2@example.com','Str0ngPass!','Sec Tmp','010','admin',null)::text$q$);
select pg_temp.run('AUTH-06 company sign-up still needs a valid username', null, 'BAD_USERNAME', $q$select public.register_account(null,'sec_tmp3@example.com','Str0ngPass!','Sec Tmp','010','company','{"name":{"ar":"x"}}'::jsonb)::text$q$);
select pg_temp.run('AUTH-05 anonymous cannot run housekeeping', null, 'permission denied', $q$select public.housekeeping()::text$q$);
select pg_temp.run('AUTH-06 customer cannot become admin', 'mariam', '^customer$', $q$with u as (update public.profiles set role='admin' where id=auth.uid() returning role) select role from u$q$);
select pg_temp.run('AUTH-07 suspended customer cannot book', 'khaled', 'SUSPENDED', $q$select public.create_booking('dp_sec','[{"name":"a b"}]',null)::text$q$);
-- horizontal / vertical access
select pg_temp.run('RBAC-01 anon sees no bookings', null, '^0$', $q$select count(*)::text from public.bookings$q$);
select pg_temp.run('RBAC-02 anon sees no profiles', null, '^0$', $q$select count(*)::text from public.profiles$q$);
select pg_temp.run('RBAC-03 customer sees only own bookings', 'mariam', '^0$', $q$select count(*)::text from public.bookings where customer_id <> auth.uid()$q$);
select pg_temp.run('RBAC-04 customer cannot cancel another customer booking', 'mariam', 'FORBIDDEN', $q$select public.request_cancel((select b.id from public.bookings b join public.profiles p on p.id=b.customer_id where p.username='ahmed' limit 1),'x')::text$q$);
select pg_temp.run('RBAC-05 customer cannot approve refunds', 'mariam', 'FORBIDDEN', $q$select public.process_refund((select id from public.refunds limit 1), true, '')::text$q$);
select pg_temp.run('RBAC-06 customer cannot change settings', 'mariam', '^0$', $q$with u as (update public.settings set data = data || '{"commission":0}' returning 1) select count(*)::text from u$q$);
select pg_temp.run('RBAC-07 customer cannot write payments', 'mariam', 'row-level security', $q$insert into public.payments(id,booking_id,customer_id,company_id,method,amount,status,idem_key) values ('p_x','b','00000000-0000-0000-0000-000000000000','c2','card',1,'paid','x')$q$, false);
select pg_temp.run('RBAC-08 customer cannot send notifications', 'mariam', 'row-level security', $q$insert into public.notifications(to_user,title,body,link) values ('admin','{"ar":"x"}','{"ar":"x"}','#/x')$q$, false);
select pg_temp.run('RBAC-09 company cannot change its commission', 'bahr', '^null$', $q$with u as (update public.companies set commission=0 where id=public.my_company() returning commission) select coalesce(commission::text,'null') from u$q$);
select pg_temp.run('RBAC-10 company cannot self-approve trips', 'bahr', '^0$', $q$with u as (update public.trips set status='active' where company_id=public.my_company() and status='pending' returning 1) select count(*)::text from u$q$);
select pg_temp.run('RBAC-11 company cannot record settlements', 'bahr', 'row-level security', $q$insert into public.settlements(id,company_id,amount) values ('s_x','c2',1)$q$, false);
select pg_temp.run('RBAC-12 internal payment simulator not callable', 'mariam', 'permission denied', $q$select public._pay_booking_sim('x','card','12345678','{}')::text$q$);
select pg_temp.run('RBAC-13 gateway confirmation not callable by users', 'mariam', 'permission denied', $q$select public.confirm_gateway_payment('e','b',1,'EGP','x','t')::text$q$);
-- tenant isolation (company c2 = bahr vs others)
select pg_temp.run('TEN-01 company reads no other company bookings', 'bahr', '^0$', $q$select count(*)::text from public.bookings where company_id <> public.my_company()$q$);
select pg_temp.run('TEN-02 company reads no other company payments', 'bahr', '^0$', $q$select count(*)::text from public.payments where company_id <> public.my_company()$q$);
select pg_temp.run('TEN-03 company cannot edit other company trips', 'bahr', '^0$', $q$with u as (update public.trips set data = data || '{"x":1}' where company_id <> public.my_company() returning 1) select count(*)::text from u$q$);
select pg_temp.run('TEN-04 company cannot delete other company departures', 'bahr', '^0$', $q$with u as (delete from public.departures where company_id <> public.my_company() returning 1) select count(*)::text from u$q$);
select pg_temp.run('TEN-05 company cannot attach departure to other company trip', 'bahr', 'FORBIDDEN', $q$insert into public.departures(id,trip_id,company_id,start_date,end_date,price,seats) values ('dp_x',(select id from public.trips where company_id='c1' limit 1),'c2',current_date+30,current_date+31,100,5)$q$, false);
select pg_temp.run('TEN-06 company cannot cancel other company departure', 'bahr', 'FORBIDDEN', $q$select public.cancel_departure((select id from public.departures where company_id='c1' limit 1))::text$q$);
select pg_temp.run('TEN-07 company sees no unrelated customers', 'bahr', '^0$', $q$select count(*)::text from public.profiles p where p.role='customer' and not exists (select 1 from public.bookings b where b.customer_id=p.id and b.company_id=public.my_company())$q$);
select pg_temp.run('TEN-08 suspended company cannot edit its trips', 'nilestar', 'COMPANY_NOT_APPROVED', $q$with u as (update public.trips set data=data||'{"x":1}' where company_id=public.my_company() returning 1) select count(*)::text from u$q$);
-- stored-XSS / input validation
select pg_temp.run('VAL-01 company colour must be a hex colour', 'bahr', 'BAD_COLOR', $q$update public.companies set data = data || jsonb_build_object('color','red" onmouseover="x') where id=public.my_company()$q$, false);
select pg_temp.run('VAL-02 company logo must be raster data', 'bahr', 'BAD_IMAGE', $q$update public.companies set data = data || '{"logo":"data:image/svg+xml;base64,AAAA"}' where id=public.my_company()$q$, false);
select pg_temp.run('VAL-03 trip ids cannot carry markup', 'bahr', 'BAD_ID', $q$insert into public.trips(id,company_id,data) values ('t" onfocus="x','c2','{"destId":"hurghada","catId":"beach"}')$q$, false);
select pg_temp.run('VAL-04 trip images must be safe', 'bahr', 'BAD_IMAGE', $q$update public.trips set data = jsonb_set(data,'{images}','["javascript:x"]') where company_id=public.my_company()$q$, false);
select pg_temp.run('VAL-05 notification links must be in-app', 'admin', 'notifications_link_safe', $q$insert into public.notifications(to_user,title,body,link) values ('admin','{"ar":"x"}','{"ar":"x"}','javascript:alert(1)')$q$, false);
select pg_temp.run('VAL-06 profile fields bounded', 'mariam', 'TOO_LONG', $q$update public.profiles set city=repeat('x',1000) where id=auth.uid()$q$, false);
select pg_temp.run('VAL-07 traveller payload bounded', 'mariam', 'BAD_TRAVELER', $q$select public.create_booking('dp_sec',jsonb_build_array(jsonb_build_object('name',repeat('x',5000))),null)::text$q$);
select pg_temp.run('VAL-08 departure dates cannot move into the past', 'bahr', 'DATE_IN_PAST', $q$update public.departures set start_date=current_date-5 where id='dp_sec'$q$, false);
select pg_temp.run('VAL-09 settlement cannot exceed balance', 'admin', 'OVER_SETTLEMENT', $q$insert into public.settlements(id,company_id,amount) values ('s_big','c2',99999999)$q$, false);
-- booking / payment integrity
select pg_temp.run('BK-01 zero travellers rejected', 'mariam', 'COUNT', $q$select public.create_booking('dp_sec','[]',null)::text$q$);
select pg_temp.run('BK-02 11 travellers on public trip rejected', 'mariam', 'COUNT', $q$select public.create_booking('dp_sec',(select jsonb_agg(jsonb_build_object('name','a b')) from generate_series(1,11)),null)::text$q$);
select pg_temp.run('BK-03 book 2 of 3 seats', 'mariam', '^b_', $q$select public.create_booking('dp_sec','[{"name":"a b"},{"name":"c d"}]',null)->>'id'$q$);
select pg_temp.run('BK-04 held seats count (no oversell)', 'ahmed', 'NO_SEATS:1', $q$select public.create_booking('dp_sec','[{"name":"a b"},{"name":"c d"}]',null)->>'id'$q$);
select pg_temp.run('BK-05 duplicate booking blocked', 'mariam', 'DUPLICATE', $q$select public.create_booking('dp_sec','[{"name":"a b"}]',null)->>'id'$q$);
select pg_temp.run('BK-06 payment confirms booking', 'mariam', '^confirmed$', $q$select public.pay_booking((select id from public.bookings where departure_id='dp_sec' and customer_id=auth.uid()),'card','idem-sec-0001','{"card":"4242424242424242"}')->'booking'->>'status'$q$);
select pg_temp.run('BK-07 second payment is a replay', 'mariam', '^true$', $q$select public.pay_booking((select id from public.bookings where departure_id='dp_sec' and customer_id=auth.uid()),'card','idem-sec-0002','{}')->>'replay'$q$);
select pg_temp.run('BK-08 exactly one paid payment', 'admin', '^1$', $q$select count(*)::text from public.payments p join public.bookings b on b.id=p.booking_id where b.departure_id='dp_sec' and p.status='paid'$q$);
select pg_temp.run('BK-09 refund requested once', 'mariam', 'refund_pending', $q$select public.request_cancel((select id from public.bookings where departure_id='dp_sec' and customer_id=auth.uid()),'x')::text$q$);
select pg_temp.run('BK-10 second cancel rejected', 'mariam', 'STATE', $q$select public.request_cancel((select id from public.bookings where departure_id='dp_sec' and customer_id=auth.uid()),'x')::text$q$);
select pg_temp.run('BK-11 admin approves refund', 'admin', '^(ok)?$', $q$select coalesce(public.process_refund((select r.id from public.refunds r join public.bookings b on b.id=r.booking_id where b.departure_id='dp_sec'),true,'')::text,'ok')$q$);
select pg_temp.run('BK-12 refund cannot be approved twice', 'admin', 'STATE', $q$select public.process_refund((select r.id from public.refunds r join public.bookings b on b.id=r.booking_id where b.departure_id='dp_sec'),true,'')::text$q$);
select pg_temp.run('BK-13 seats released after refund', 'admin', '^3$', $q$select (3 - coalesce(sum(count),0))::text from public.bookings where departure_id='dp_sec' and (status in ('confirmed','completed','refund_pending') or (status='pending_payment' and hold_until>now()))$q$);

select pg_temp.run('BK-14 private-trip bookings up to 40 travellers allowed by the schema', 'admin', 'count <= 40', $q$select pg_get_constraintdef(oid) from pg_constraint where conname='bookings_count_check'$q$);

select coalesce(string_agg(case when result ~ expect then 'PASS ' else 'FAIL ' end || id || case when result ~ expect then '' else '  (got: ' || left(result, 120) || ')' end, E'\n' order by n), '') ||
  E'\n' || sum(case when result ~ expect then 1 else 0 end) || '/' || count(*) || ' passed' as report from res;
rollback;
