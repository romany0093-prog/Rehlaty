-- =====================================================================
-- 007 – Customers can sign up with their mobile number (e-mail still required) and
-- log in with username, e-mail or mobile. Phone-registered accounts get the number on
-- their Supabase Auth user, so a WhatsApp one-time code (Supabase Auth → Phone provider
-- = Twilio with a WhatsApp sender) can recover the account.
-- =====================================================================
-- Egyptian mobile → E.164 digits without '+' (as Supabase Auth stores phones): 01xxxxxxxxx → 201xxxxxxxxx
create or replace function public._norm_phone(p text) returns text language sql immutable set search_path = public as $$
  select case
    when d ~ '^01[0125][0-9]{8}$' then '2' || d
    when d ~ '^201[0125][0-9]{8}$' then d
    when d ~ '^00201[0125][0-9]{8}$' then substr(d, 3)
    else null end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') d) x
$$;

drop function if exists public.register_account(text, text, text, text, text, text, jsonb);
create or replace function public.register_account(p_username text, p_email text, p_password text, p_name text, p_phone text, p_role text, p_company jsonb default null, p_via text default 'email')
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := gen_random_uuid();
  v_user text := lower(trim(p_username));
  v_email text := lower(trim(p_email));
  v_via text := case when p_via = 'phone' and p_role = 'customer' then 'phone' else 'email' end;
  v_ph text := public._norm_phone(p_phone);
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
  if v_via = 'phone' and v_ph is null then raise exception 'BAD_PHONE'; end if;
  if exists (select 1 from profiles where username = v_user) then raise exception 'USERNAME_TAKEN'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then raise exception 'EMAIL_TAKEN'; end if;
  if v_via = 'phone' and exists (select 1 from auth.users where phone = v_ph) then raise exception 'PHONE_TAKEN'; end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, phone, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email, crypt(p_password, gen_salt('bf')), now(),
          case when v_via = 'phone' then v_ph end, case when v_via = 'phone' then now() end,
          jsonb_build_object('provider', 'email', 'providers', case when v_via = 'phone' then '["email","phone"]'::jsonb else '["email"]'::jsonb end),
          jsonb_build_object('username', v_user, 'name', p_name), now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid, v_uid::text, jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());
  if v_via = 'phone' then
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_uid, v_ph, jsonb_build_object('sub', v_uid::text, 'phone', v_ph, 'phone_verified', true), 'phone', now(), now(), now());
  end if;

  if p_role = 'company' then
    if p_company is null or coalesce(p_company->'name'->>'ar', '') = '' then raise exception 'BAD_COMPANY'; end if;
    select coalesce(jsonb_object_agg(key, value), '{}') into v_co from jsonb_each(p_company)
      where key in ('name', 'color', 'city', 'phone', 'website', 'license', 'founded', 'desc', 'logo', 'cover', 'docs');
    v_cid := 'c_' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
    insert into companies (id, status, owner, data) values (v_cid, 'pending', v_uid, v_co || jsonb_build_object('email', v_email));
    perform _notify('admin', 'طلب تسجيل شركة', 'Company application', left(p_company->'name'->>'ar', 120) || ' أرسلت طلب انضمام.', left(coalesce(p_company->'name'->>'en', p_company->'name'->>'ar'), 120) || ' applied to join.', '#/admin/companies');
    perform _act(left(p_company->'name'->>'ar', 120) || ' سجلت كشركة جديدة', left(coalesce(p_company->'name'->>'en', p_company->'name'->>'ar'), 120) || ' registered');
  end if;
  insert into profiles (id, username, email, role, name, phone, company_id, data) values (v_uid, v_user, v_email, p_role, trim(p_name), p_phone, v_cid, jsonb_build_object('via', v_via));
  if p_role = 'customer' then
    perform _notify(v_uid::text, 'أهلًا بك في UTravel', 'Welcome to UTravel', 'حسابك جاهز. ابدأ باكتشاف الرحلات.', 'Your account is ready. Start exploring trips.', '#/trips');
  end if;
  return v_uid;
end $$;
revoke all on function public.register_account(text, text, text, text, text, text, jsonb, text) from public;
grant execute on function public.register_account(text, text, text, text, text, text, jsonb, text) to anon, authenticated;

-- username, e-mail OR mobile number; still needs the right password before anything is revealed
create or replace function public.resolve_login(p_ident text, p_password text) returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare v text := lower(trim(coalesce(p_ident, ''))); v_email text; v_hash text; v_ip text := public._client_ip(); v_ph text; v_key text;
begin
  if position('@' in v) > 0 then return v; end if; -- e-mail logins go straight to Supabase Auth (its own rate limits)
  v_ph := case when v ~ '^[0-9+ ]{8,20}$' then public._norm_phone(v) end;
  v_key := 'login_user:' || coalesce(v_ph, v);
  if not public._throttle(v_key, 10, interval '15 minutes', interval '15 minutes')
     or not public._throttle('login_ip:' || v_ip, 300, interval '15 minutes', interval '15 minutes') then
    raise exception 'LOCKED';
  end if;
  if v_ph is not null then
    select u.email, u.encrypted_password into v_email, v_hash from auth.users u join profiles p on p.id = u.id where u.phone = v_ph;
  else
    select p.email, u.encrypted_password into v_email, v_hash from profiles p join auth.users u on u.id = p.id where p.username = v;
  end if;
  if v_hash is null or v_hash <> crypt(coalesce(p_password, ''), v_hash) then return null; end if;
  perform public._throttle_clear(v_key);
  return v_email;
end $$;
revoke all on function public.resolve_login(text, text) from public;
grant execute on function public.resolve_login(text, text) to anon, authenticated;
