-- Move internal helpers out of the public API schema so players cannot call them
-- directly (for example to look up who is friends with or has blocked whom).
-- Row level security policies keep working because they reference functions by id.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_blocked(uuid, uuid) set schema private;
alter function public.are_friends(uuid, uuid) set schema private;
alter function public.has_banned_words(text) set schema private;
alter function public.close_expired_terms() set schema private;
alter function public.check_chat_message() set schema private;
alter function public.check_dm() set schema private;

-- Policies on friendships and dms call these as the signed-in player.
grant execute on function private.is_blocked(uuid, uuid), private.are_friends(uuid, uuid) to authenticated;
-- Trigger functions run without the caller needing execute rights.
revoke execute on function private.check_chat_message(), private.check_dm(), private.close_expired_terms(),
  private.has_banned_words(text) from public, anon, authenticated;

-- Point the remaining functions at the new locations.
create or replace function private.check_chat_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles where id = new.user_id and muted_until > now()) then
    raise exception 'You are muted for now. Try again later.';
  end if;
  if (select count(*) from public.messages where user_id = new.user_id and created_at > now() - interval '20 seconds') >= 5 then
    raise exception 'Slow down. You can send 5 messages every 20 seconds.';
  end if;
  if private.has_banned_words(new.body) then
    raise exception 'That message breaks the chat rules.';
  end if;
  new.body := btrim(new.body);
  return new;
end;
$$;

create or replace function private.check_dm()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles where id = new.sender and muted_until > now()) then
    raise exception 'You are muted for now. Try again later.';
  end if;
  if (select count(*) from public.dms where sender = new.sender and created_at > now() - interval '20 seconds') >= 8 then
    raise exception 'Slow down a little.';
  end if;
  if private.has_banned_words(new.body) then
    raise exception 'That message breaks the chat rules.';
  end if;
  new.body := btrim(new.body);
  return new;
end;
$$;

create or replace function public.city_hall()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t public.terms;
  result jsonb;
begin
  perform private.close_expired_terms();
  select * into t from public.terms where not closed order by id desc limit 1;
  select jsonb_build_object(
    'term', jsonb_build_object('id', t.id, 'starts_at', t.starts_at, 'ends_at', t.ends_at, 'policy', t.policy,
                               'announcement', t.announcement, 'announcement_at', t.announcement_at),
    'mayor', (select jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'country', p.country, 'look', p.look)
              from public.profiles p where p.id = t.mayor_id),
    'candidates', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'country', p.country,
                                          'look', p.look, 'slogan', c.slogan, 'policy', c.policy, 'votes', (
                                            select count(*) from public.votes v where v.term_id = c.term_id and v.candidate = c.user_id))
                       order by c.created_at)
      from public.candidates c join public.profiles p on p.id = c.user_id
      where c.term_id = t.id), '[]'::jsonb),
    'my_vote', (select candidate from public.votes where term_id = t.id and voter = (select auth.uid()))
  ) into result;
  return result;
end;
$$;

create or replace function public.stand_for_mayor(p_slogan text, p_policy text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.terms;
begin
  if (select auth.uid()) is null then raise exception 'Sign in to stand for Mayor.'; end if;
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and created_at < now() - interval '1 hour') then
    raise exception 'New Londoners can stand for Mayor one hour after joining.';
  end if;
  perform private.close_expired_terms();
  select * into t from public.terms where not closed order by id desc limit 1;
  insert into public.candidates (term_id, user_id, slogan, policy)
  values (t.id, (select auth.uid()), btrim(p_slogan), p_policy)
  on conflict (term_id, user_id) do update set slogan = excluded.slogan, policy = excluded.policy;
end;
$$;

create or replace function public.cast_vote(p_candidate uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.terms;
begin
  if (select auth.uid()) is null then raise exception 'Sign in to vote.'; end if;
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and created_at < now() - interval '1 hour') then
    raise exception 'New Londoners can vote one hour after joining.';
  end if;
  perform private.close_expired_terms();
  select * into t from public.terms where not closed order by id desc limit 1;
  insert into public.votes (term_id, voter, candidate)
  values (t.id, (select auth.uid()), p_candidate)
  on conflict (term_id, voter) do update set candidate = excluded.candidate, created_at = now();
end;
$$;

create or replace function public.set_announcement(p_text text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.has_banned_words(p_text) then raise exception 'That announcement breaks the rules.'; end if;
  update public.terms set announcement = btrim(p_text), announcement_at = now()
  where not closed and mayor_id = (select auth.uid());
  if not found then raise exception 'Only the Mayor can post announcements.'; end if;
end;
$$;
