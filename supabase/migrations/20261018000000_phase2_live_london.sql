-- London Hustle, Phase 2: Live London.
-- Accounts and profiles, cloud saves, place chat, friends, private messages,
-- blocking and reporting, follows, Mayor of London elections and the property market.
-- Every table has row level security. Writes that need rules (votes, purchases,
-- announcements) go through security definer functions.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------- helpers

-- Places that exist in the game (keep in sync with LOCATIONS in js/data.js).
create or replace function public.valid_place(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p = any (array[
    'heathrow','hydepark','chelsea','oxford','soho','covent','westminster','southbank','camden','kingscross',
    'city','towerhill','shoreditch','stratford','canary','greenwich','woolwich','peckham','brixton','battersea',
    'kensington','nottinghill','wembley','croydon'
  ]);
$$;

-- Mayor policies (effects live in the game client).
create or replace function public.valid_policy(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p = any (array['fare_freeze','rent_cap','wage_rise','clean_air']);
$$;

-- ---------------------------------------------------------------- profiles

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext not null unique check (username::text ~ '^[A-Za-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 24),
  country text not null default 'GB' check (country ~ '^[A-Z]{2}$'),
  look jsonb not null default '{}'::jsonb check (pg_column_size(look) < 4000),
  life text not null default 'immigrant' check (life in ('immigrant', 'oldmoney', 'newgen')),
  bio text check (char_length(bio) <= 160),
  account_type text not null default 'player' check (account_type in ('player', 'creator', 'brand')),
  verified boolean not null default false,
  is_adult boolean not null check (is_adult),
  muted_until timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are public" on public.profiles
  for select using (true);
create policy "Players create their own profile" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "Players edit their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Players may only set these columns. Verification, account type and mutes are
-- changed by admins (service role) or by the functions below.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, username, display_name, country, look, life, bio, is_adult) on public.profiles to authenticated;
grant update (display_name, country, look, life, bio) on public.profiles to authenticated;

-- Opt in to the creator marketplace (Phase 4 builds on this).
create or replace function public.become_creator()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set account_type = 'creator'
  where id = (select auth.uid()) and account_type = 'player';
$$;

-- ---------------------------------------------------------------- cloud saves

create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null check (pg_column_size(data) < 200000),
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;

create policy "Players read their own save" on public.saves
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Players create their own save" on public.saves
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Players update their own save" on public.saves
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Players delete their own save" on public.saves
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- blocks

create table if not exists public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;

create policy "Players see their own blocks" on public.blocks
  for select to authenticated using (blocker = (select auth.uid()));
create policy "Players block others" on public.blocks
  for insert to authenticated with check (blocker = (select auth.uid()));
create policy "Players unblock others" on public.blocks
  for delete to authenticated using (blocker = (select auth.uid()));

create or replace function public.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

-- ---------------------------------------------------------------- chat in each place

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  place text not null check (public.valid_place(place)),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 280),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_place_created_idx on public.messages (place, created_at desc);
create index if not exists messages_user_created_idx on public.messages (user_id, created_at desc);
alter table public.messages enable row level security;

create policy "Signed-in players read place chat" on public.messages
  for select to authenticated using (not hidden);
create policy "Players post as themselves" on public.messages
  for insert to authenticated with check (user_id = (select auth.uid()));

revoke update, delete on public.messages from anon, authenticated;

-- Words that are never allowed in chat or private messages. Keep it short and
-- extend it from the reports you get.
create or replace function public.has_banned_words(t text)
returns boolean language sql immutable set search_path = '' as $$
  select lower(t) ~ '(nigg|fagg|retard|kys\M|kill yourself)';
$$;

-- Rate limit (5 messages per 20 seconds), mutes and banned words.
create or replace function public.check_chat_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles where id = new.user_id and muted_until > now()) then
    raise exception 'You are muted for now. Try again later.';
  end if;
  if (select count(*) from public.messages where user_id = new.user_id and created_at > now() - interval '20 seconds') >= 5 then
    raise exception 'Slow down. You can send 5 messages every 20 seconds.';
  end if;
  if public.has_banned_words(new.body) then
    raise exception 'That message breaks the chat rules.';
  end if;
  new.body := btrim(new.body);
  return new;
end;
$$;
create or replace trigger messages_check before insert on public.messages
  for each row execute function public.check_chat_message();

-- ---------------------------------------------------------------- friends

create table if not exists public.friendships (
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
create index if not exists friendships_addressee_idx on public.friendships (addressee);
alter table public.friendships enable row level security;

create policy "Players see their own friendships" on public.friendships
  for select to authenticated using ((select auth.uid()) in (requester, addressee));
create policy "Players send friend requests" on public.friendships
  for insert to authenticated with check (
    requester = (select auth.uid()) and status = 'pending' and not public.is_blocked(requester, addressee)
  );
create policy "Players accept requests sent to them" on public.friendships
  for update to authenticated using (addressee = (select auth.uid())) with check (status = 'accepted');
create policy "Players remove friendships" on public.friendships
  for delete to authenticated using ((select auth.uid()) in (requester, addressee));

revoke update on public.friendships from anon, authenticated;
grant update (status) on public.friendships to authenticated;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted' and ((requester = a and addressee = b) or (requester = b and addressee = a))
  );
$$;

-- ---------------------------------------------------------------- private messages (friends only)

create table if not exists public.dms (
  id bigint generated always as identity primary key,
  sender uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists dms_pair_idx on public.dms (sender, recipient, created_at desc);
create index if not exists dms_recipient_idx on public.dms (recipient, created_at desc);
alter table public.dms enable row level security;

create policy "Players read their own conversations" on public.dms
  for select to authenticated using ((select auth.uid()) in (sender, recipient));
create policy "Players message their friends" on public.dms
  for insert to authenticated with check (
    sender = (select auth.uid()) and public.are_friends(sender, recipient) and not public.is_blocked(sender, recipient)
  );
create policy "Recipients mark messages read" on public.dms
  for update to authenticated using (recipient = (select auth.uid())) with check (recipient = (select auth.uid()));

revoke update, delete on public.dms from anon, authenticated;
grant update (read_at) on public.dms to authenticated;

create or replace function public.check_dm()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles where id = new.sender and muted_until > now()) then
    raise exception 'You are muted for now. Try again later.';
  end if;
  if (select count(*) from public.dms where sender = new.sender and created_at > now() - interval '20 seconds') >= 8 then
    raise exception 'Slow down a little.';
  end if;
  if public.has_banned_words(new.body) then
    raise exception 'That message breaks the chat rules.';
  end if;
  new.body := btrim(new.body);
  return new;
end;
$$;
create or replace trigger dms_check before insert on public.dms
  for each row execute function public.check_dm();

-- ---------------------------------------------------------------- reports (read by admins only)

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reported_user uuid not null references public.profiles (id) on delete cascade,
  message_id bigint references public.messages (id) on delete set null,
  dm_id bigint references public.dms (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 300),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;

create policy "Players file reports" on public.reports
  for insert to authenticated with check (reporter = (select auth.uid()));

-- ---------------------------------------------------------------- follows (creator reach)

create table if not exists public.follows (
  follower uuid not null references public.profiles (id) on delete cascade,
  followee uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
create index if not exists follows_followee_idx on public.follows (followee);
alter table public.follows enable row level security;

create policy "Follows are public" on public.follows
  for select using (true);
create policy "Players follow others" on public.follows
  for insert to authenticated with check (follower = (select auth.uid()));
create policy "Players unfollow others" on public.follows
  for delete to authenticated using (follower = (select auth.uid()));

-- ---------------------------------------------------------------- Mayor of London

-- Each term lasts a week. While a term runs, players stand and vote for the next Mayor.
create table if not exists public.terms (
  id integer generated always as identity primary key,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default now() + interval '7 days',
  mayor_id uuid references public.profiles (id) on delete set null,
  policy text check (policy is null or public.valid_policy(policy)),
  announcement text check (char_length(announcement) <= 140),
  announcement_at timestamptz,
  closed boolean not null default false
);
alter table public.terms enable row level security;
create policy "Terms are public" on public.terms for select using (true);
revoke insert, update, delete on public.terms from anon, authenticated;

create table if not exists public.candidates (
  term_id integer not null references public.terms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  slogan text not null check (char_length(slogan) between 1 and 80),
  policy text not null check (public.valid_policy(policy)),
  created_at timestamptz not null default now(),
  primary key (term_id, user_id)
);
alter table public.candidates enable row level security;
create policy "Candidates are public" on public.candidates for select using (true);
revoke insert, update, delete on public.candidates from anon, authenticated;

create table if not exists public.votes (
  term_id integer not null,
  voter uuid not null references public.profiles (id) on delete cascade,
  candidate uuid not null,
  created_at timestamptz not null default now(),
  primary key (term_id, voter),
  foreign key (term_id, candidate) references public.candidates (term_id, user_id) on delete cascade
);
alter table public.votes enable row level security;
create policy "Players see their own vote" on public.votes
  for select to authenticated using (voter = (select auth.uid()));
revoke insert, update, delete on public.votes from anon, authenticated;

-- Close any term that has ended and start the next one with the winner as Mayor.
create or replace function public.close_expired_terms()
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.terms;
  winner record;
begin
  loop
    select * into t from public.terms where not closed order by id desc limit 1 for update;
    if not found then
      insert into public.terms default values;
      return;
    end if;
    exit when t.ends_at > now();
    select c.user_id, c.policy into winner
    from public.candidates c
    left join public.votes v on v.term_id = c.term_id and v.candidate = c.user_id
    where c.term_id = t.id
    group by c.user_id, c.policy, c.created_at
    order by count(v.voter) desc, c.created_at asc
    limit 1;
    update public.terms set closed = true where id = t.id;
    insert into public.terms (starts_at, ends_at, mayor_id, policy)
    values (now(), now() + interval '7 days', winner.user_id, winner.policy);
  end loop;
end;
$$;

-- The current term, the current Mayor and the running election, in one call.
create or replace function public.city_hall()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t public.terms;
  result jsonb;
begin
  perform public.close_expired_terms();
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

-- New accounts wait an hour before standing or voting, to slow down fake accounts.
create or replace function public.stand_for_mayor(p_slogan text, p_policy text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.terms;
begin
  if (select auth.uid()) is null then raise exception 'Sign in to stand for Mayor.'; end if;
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and created_at < now() - interval '1 hour') then
    raise exception 'New Londoners can stand for Mayor one hour after joining.';
  end if;
  perform public.close_expired_terms();
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
  perform public.close_expired_terms();
  select * into t from public.terms where not closed order by id desc limit 1;
  insert into public.votes (term_id, voter, candidate)
  values (t.id, (select auth.uid()), p_candidate)
  on conflict (term_id, voter) do update set candidate = excluded.candidate, created_at = now();
end;
$$;

create or replace function public.set_announcement(p_text text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.has_banned_words(p_text) then raise exception 'That announcement breaks the rules.'; end if;
  update public.terms set announcement = btrim(p_text), announcement_at = now()
  where not closed and mayor_id = (select auth.uid());
  if not found then raise exception 'Only the Mayor can post announcements.'; end if;
end;
$$;

-- ---------------------------------------------------------------- property market

create table if not exists public.properties (
  id integer generated always as identity primary key,
  place text not null check (public.valid_place(place)),
  name text not null,
  kind text not null check (kind in ('room', 'studio', 'flat', 'house', 'plot')),
  price integer not null check (price > 0),
  weekly_rent integer not null check (weekly_rent >= 0),
  owner_id uuid references public.profiles (id) on delete set null,
  bought_at timestamptz
);
create index if not exists properties_place_idx on public.properties (place);
create index if not exists properties_owner_idx on public.properties (owner_id);
alter table public.properties enable row level security;
create policy "Properties are public" on public.properties for select using (true);
revoke insert, update, delete on public.properties from anon, authenticated;

-- Buying takes the price from the buyer's cloud save.
create or replace function public.buy_property(p_id integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  prop public.properties;
  cash numeric;
begin
  if (select auth.uid()) is null then raise exception 'Sign in to buy property.'; end if;
  select * into prop from public.properties where id = p_id for update;
  if not found then raise exception 'That property does not exist.'; end if;
  if prop.owner_id is not null then raise exception 'Someone else already owns it.'; end if;
  select (data ->> 'money')::numeric into cash from public.saves where user_id = (select auth.uid()) for update;
  if cash is null then raise exception 'Start a game first.'; end if;
  if cash < prop.price then raise exception 'You cannot afford that yet.'; end if;
  update public.saves set data = jsonb_set(data, '{money}', to_jsonb(round(cash - prop.price, 2))), updated_at = now()
  where user_id = (select auth.uid());
  update public.properties set owner_id = (select auth.uid()), bought_at = now() where id = p_id;
  return jsonb_build_object('money', round(cash - prop.price, 2));
end;
$$;

-- Selling returns 80% of the price.
create or replace function public.sell_property(p_id integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  prop public.properties;
  cash numeric;
begin
  select * into prop from public.properties where id = p_id and owner_id = (select auth.uid()) for update;
  if not found then raise exception 'You do not own that property.'; end if;
  select (data ->> 'money')::numeric into cash from public.saves where user_id = (select auth.uid()) for update;
  update public.saves set data = jsonb_set(data, '{money}', to_jsonb(round(coalesce(cash, 0) + prop.price * 0.8, 2))), updated_at = now()
  where user_id = (select auth.uid());
  update public.properties set owner_id = null, bought_at = null where id = p_id;
  return jsonb_build_object('money', round(coalesce(cash, 0) + prop.price * 0.8, 2));
end;
$$;

-- Starter listings in every place. Prices are game money, scaled by area.
insert into public.properties (place, name, kind, price, weekly_rent)
select v.place, v.name, v.kind, v.price, v.rent
from (values
  ('woolwich', 'Room in a Woolwich house share', 'room', 1500, 45),
  ('woolwich', 'Flat by the Woolwich Ferry', 'flat', 6000, 160),
  ('peckham', 'Studio above a Rye Lane shop', 'studio', 2500, 75),
  ('peckham', 'Peckham Rye terrace house', 'house', 9000, 240),
  ('brixton', 'Brixton Village studio', 'studio', 2600, 80),
  ('croydon', 'Croydon tower block flat', 'flat', 3500, 95),
  ('stratford', 'Olympic Park view flat', 'flat', 5500, 150),
  ('canary', 'Canary Wharf riverside flat', 'flat', 11000, 290),
  ('greenwich', 'Greenwich Market studio', 'studio', 3800, 105),
  ('camden', 'Canal boat in Camden Lock', 'room', 2200, 65),
  ('shoreditch', 'Shoreditch warehouse loft', 'flat', 9500, 250),
  ('kingscross', 'King''s Cross new-build flat', 'flat', 9000, 235),
  ('chelsea', 'Chelsea mews house', 'house', 20000, 520),
  ('kensington', 'South Kensington mansion flat', 'flat', 16000, 420),
  ('nottinghill', 'Pastel house in Notting Hill', 'house', 18000, 470),
  ('battersea', 'Power Station apartment', 'flat', 12000, 310),
  ('wembley', 'Wembley Park flat', 'flat', 4500, 125),
  ('southbank', 'Thames plot by the London Eye', 'plot', 7000, 180),
  ('towerhill', 'Thames plot by Tower Bridge', 'plot', 7500, 190),
  ('greenwich', 'Thames plot by the Cutty Sark', 'plot', 5000, 135),
  ('canary', 'Thames plot on the Isle of Dogs', 'plot', 6000, 160)
) as v(place, name, kind, price, rent)
where not exists (select 1 from public.properties);

-- ---------------------------------------------------------------- daily headline

create table if not exists public.headlines (
  day date primary key,
  text text not null check (char_length(text) <= 160)
);
alter table public.headlines enable row level security;
create policy "Headlines are public" on public.headlines for select using (true);
revoke insert, update, delete on public.headlines from anon, authenticated;

-- ---------------------------------------------------------------- function access

revoke execute on all functions in schema public from public, anon;
grant execute on function public.valid_place(text), public.valid_policy(text) to anon, authenticated;
grant execute on function public.become_creator(), public.city_hall(), public.stand_for_mayor(text, text),
  public.cast_vote(uuid), public.set_announcement(text), public.buy_property(integer), public.sell_property(integer),
  public.close_expired_terms(), public.is_blocked(uuid, uuid), public.are_friends(uuid, uuid), public.has_banned_words(text)
  to authenticated;

-- ---------------------------------------------------------------- realtime

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['messages', 'dms', 'friendships', 'terms'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;

-- Start the first term.
select public.close_expired_terms();
