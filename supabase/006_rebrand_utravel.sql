-- =====================================================================
-- 006 – Rebrand: رحلاتي / Rehlati → UTravel in server-generated texts and site content.
-- Internal identifiers (rehlaty.trusted flag, table names, demo e-mail addresses) are unchanged.
-- "رحلاتي المخصصة" (= "my custom trips", a menu label) is not the brand and is left alone.
-- =====================================================================
do $$
declare f record;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and (p.prosrc like '%رحلاتي%' or p.prosrc like '%Rehlati%') loop
    execute replace(replace(pg_get_functiondef(f.oid), 'رحلاتي', 'UTravel'), 'Rehlati', 'UTravel');
  end loop;
end $$;
update public.settings
   set data = regexp_replace(regexp_replace(data::text, 'رحلاتي(?! المخصصة)', 'UTravel', 'g'), 'Rehlati', 'UTravel', 'g')::jsonb
 where id = 'main' and (data::text like '%رحلاتي%' or data::text like '%Rehlati%');
select set_config('rehlaty.trusted', 'on', true);
update public.trips
   set data = regexp_replace(data::text, 'رحلاتي(?! المخصصة)', 'UTravel', 'g')::jsonb
 where data::text like '%رحلاتي%';
