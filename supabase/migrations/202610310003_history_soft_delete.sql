-- Keep submitted history recoverable; imported t1_/t2_ tables are untouched.
begin;
alter table public.runn_reports add column if not exists deleted_at timestamptz;
alter table public.runn_actions add column if not exists deleted_at timestamptz;
notify pgrst,'reload schema';
commit;
