-- The birth lottery: every account is born into one life (Fresh Immigrant, Old Money or
-- New Gen), drawn once by the server. Players cannot choose or change it; starting a new
-- life keeps it.

alter table public.profiles add column if not exists birth text
  check (birth in ('immigrant', 'oldmoney', 'newgen'));

-- Draws the caller's birth the first time and returns the same answer every time after.
-- Odds: 40% Fresh Immigrant, 40% New Gen, 20% Old Money.
create or replace function public.draw_birth()
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  b text;
  r double precision;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select birth into b from public.profiles where id = me for update;
  if not found then raise exception 'Create your profile first'; end if;
  if b is not null then return b; end if;
  r := random();
  b := case when r < 0.4 then 'immigrant' when r < 0.8 then 'newgen' else 'oldmoney' end;
  update public.profiles set birth = b, life = b where id = me;
  return b;
end $$;

revoke execute on function public.draw_birth() from public, anon;
grant execute on function public.draw_birth() to authenticated;
