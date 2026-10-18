-- Indexes for foreign keys flagged by the Supabase performance advisor.
create index if not exists blocks_blocked_idx on public.blocks (blocked);
create index if not exists candidates_user_idx on public.candidates (user_id);
create index if not exists reports_dm_idx on public.reports (dm_id);
create index if not exists reports_message_idx on public.reports (message_id);
create index if not exists reports_reported_user_idx on public.reports (reported_user);
create index if not exists reports_reporter_idx on public.reports (reporter);
create index if not exists terms_mayor_idx on public.terms (mayor_id);
create index if not exists votes_candidate_idx on public.votes (term_id, candidate);
create index if not exists votes_voter_idx on public.votes (voter);
