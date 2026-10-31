-- Local review workflow. Imported t1_/t2_ tables are read-only source records.
begin;
create table if not exists public.runn_actions (
  id uuid primary key default gen_random_uuid(),
  source_key text unique not null,
  store_id text not null check (store_id in ('S01','S02','S03')),
  business_date date not null,
  title text not null,
  kind text not null,
  severity text not null default 'warning',
  source jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','assigned','in_progress','awaiting_verification','closed')),
  owner text,
  due_date date,
  note text not null default '',
  verification_note text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz
);
create table if not exists public.runn_observations (
  id uuid primary key,
  store_id text not null check (store_id in ('S01','S02','S03')),
  business_date date not null,
  kind text not null check (kind in ('temperature','acid')),
  item_id text not null,
  value numeric not null,
  result text not null check (result in ('pass','fail','warning','unrated')),
  standard text not null,
  note text not null default '',
  action_id uuid references public.runn_actions(id),
  actor text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.runn_action_events (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.runn_actions(id) on delete cascade,
  store_id text not null,
  operation text not null,
  actor text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.runn_checks (
  store_id text not null,
  business_date date not null,
  item_id text not null,
  done boolean not null,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key(store_id,business_date,item_id)
);
create table if not exists public.runn_costs (
  id uuid primary key,
  store_id text not null,
  business_date date not null,
  category text not null,
  amount bigint not null check(amount > 0 and amount <= 1000000000),
  memo text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.runn_reports (
  id uuid primary key,
  store_id text not null,
  business_date date not null,
  week_start date not null,
  title text not null,
  summary text not null,
  metrics jsonb not null,
  reply text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.runn_order_drafts (
  id uuid primary key,
  store_id text not null,
  business_date date not null,
  supplier_id text not null,
  items jsonb not null,
  amount bigint not null check(amount >= 0),
  status text not null default 'draft' check(status in ('draft','reviewed')),
  created_at timestamptz not null default now()
);
alter table public.runn_actions enable row level security;
alter table public.runn_observations enable row level security;
alter table public.runn_action_events enable row level security;
alter table public.runn_checks enable row level security;
alter table public.runn_costs enable row level security;
alter table public.runn_reports enable row level security;
alter table public.runn_order_drafts enable row level security;
create index if not exists runn_actions_store_date on public.runn_actions(store_id,business_date);
create index if not exists runn_observations_store_date on public.runn_observations(store_id,business_date);
create index if not exists runn_events_action on public.runn_action_events(action_id,created_at);

create or replace function public.runn_record_observation(p jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare o runn_observations; a runn_actions; aid uuid;
begin
  select * into o from runn_observations where id=(p->>'id')::uuid;
  if found then return to_jsonb(o); end if;
  if nullif(p->>'action_id','') is not null then
    select * into a from runn_actions where id=(p->>'action_id')::uuid for update;
    if not found or a.store_id <> p->>'store_id' or a.status='closed' then
      raise exception '조치와 매장이 일치하지 않거나 이미 종결되었습니다.';
    end if;
    aid=a.id;
  elsif p->>'result' in ('fail','warning') then
    insert into runn_actions(source_key,store_id,business_date,title,kind,severity,source)
    values(p->>'source_key',p->>'store_id',(p->>'business_date')::date,p->>'title',p->>'kind',
      case when p->>'result'='fail' then 'critical' else 'warning' end,p->'source')
    on conflict(source_key) do update set source_key=excluded.source_key returning * into a;
    if a.status='closed' then
      insert into runn_actions(source_key,store_id,business_date,title,kind,severity,source)
      values((p->>'source_key')||':recurrence:'||(p->>'id'),p->>'store_id',(p->>'business_date')::date,
        p->>'title',p->>'kind',case when p->>'result'='fail' then 'critical' else 'warning' end,
        (p->'source')||jsonb_build_object('previous_action_id',a.id)) returning * into a;
    end if;
    aid=a.id;
  end if;
  insert into runn_observations(id,store_id,business_date,kind,item_id,value,result,standard,note,action_id,actor)
  values((p->>'id')::uuid,p->>'store_id',(p->>'business_date')::date,p->>'kind',p->>'item_id',
    (p->>'value')::numeric,p->>'result',p->>'standard',coalesce(p->>'note',''),aid,p->>'actor') returning * into o;
  if aid is not null then
    insert into runn_action_events(action_id,store_id,operation,actor,note)
    values(aid,o.store_id,'measurement',o.actor,o.standard||' / 측정 '||o.value||' / '||o.result);
  end if;
  return to_jsonb(o);
end $$;

create or replace function public.runn_transition_action(p jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare a runn_actions; next_status text; latest_result text; op text := p->>'operation';
begin
  select * into a from runn_actions where id=(p->>'id')::uuid for update;
  if not found then raise exception '조치를 찾을 수 없습니다.'; end if;
  if a.version <> (p->>'version')::integer then raise exception '다른 사용자가 수정했습니다. 새로고침 후 다시 시도하세요.' using errcode='P0001', detail='runn_version_conflict'; end if;
  if a.status='closed' then raise exception '종결된 조치는 수정할 수 없습니다.'; end if;
  next_status=a.status;
  if op='assign' then
    if a.status not in ('open','assigned') then raise exception '배정 가능한 상태가 아닙니다.'; end if;
    if length(trim(coalesce(p->>'owner',''))) < 1 or nullif(p->>'due_date','') is null then raise exception '담당자와 기한이 필요합니다.'; end if;
    if (p->>'due_date')::date < a.business_date then raise exception '기한은 업무 기준일 이후여야 합니다.'; end if;
    a.owner=p->>'owner'; a.due_date=(p->>'due_date')::date; next_status='assigned';
  elsif op='start' then
    if a.status <> 'assigned' then raise exception '담당자 배정 후 시작할 수 있습니다.'; end if;
    next_status='in_progress';
  elsif op='request_verification' then
    if a.status <> 'in_progress' then raise exception '진행 중인 조치만 검증 요청할 수 있습니다.'; end if;
    if nullif(trim(coalesce(p->>'note','')),'') is null then raise exception '조치 내용을 입력해 주세요.'; end if;
    if a.kind in ('temperature','acid') then
      select result into latest_result from runn_observations where action_id=a.id order by created_at desc limit 1;
      if latest_result is distinct from 'pass' then raise exception '최근 재측정이 기준에 적합해야 검증을 요청할 수 있습니다.'; end if;
    end if;
    next_status='awaiting_verification';
  elsif op in ('verify','reject') then
    if p->>'role' <> 'sv' then raise exception 'SV만 검증할 수 있습니다.' using errcode='42501'; end if;
    if a.status <> 'awaiting_verification' then raise exception '검증 대기 상태가 아닙니다.'; end if;
    if nullif(trim(coalesce(p->>'note','')),'') is null then raise exception '검증 또는 반려 사유를 입력해 주세요.'; end if;
    if op='verify' and a.kind in ('temperature','acid') then
      select result into latest_result from runn_observations where action_id=a.id order by created_at desc limit 1;
      if latest_result is distinct from 'pass' then raise exception '최근 재측정 결과를 다시 확인하세요.'; end if;
    end if;
    next_status=case when op='verify' then 'closed' else 'in_progress' end;
    a.verification_note=p->>'note';
  else raise exception '지원하지 않는 상태 변경입니다.';
  end if;
  update runn_actions set status=next_status,owner=a.owner,due_date=a.due_date,
    note=case when op='request_verification' then p->>'note' else note end,
    verification_note=a.verification_note,version=version+1,updated_at=now(),
    verified_at=case when op='verify' then now() else verified_at end
  where id=a.id returning * into a;
  insert into runn_action_events(action_id,store_id,operation,actor,note)
    values(a.id,a.store_id,op,p->>'actor',coalesce(p->>'note',''));
  return to_jsonb(a);
end $$;
revoke all on function public.runn_record_observation(jsonb) from public,anon,authenticated;
revoke all on function public.runn_transition_action(jsonb) from public,anon,authenticated;
grant execute on function public.runn_record_observation(jsonb) to service_role;
grant execute on function public.runn_transition_action(jsonb) to service_role;
-- The full sales history includes January-April, before the operations-only data starts.
create or replace view public.runn_daily_sales with (security_invoker=true) as
select date,store_id,sum(sales_amount)::bigint as sales_amount
from public.t1_sales group by date,store_id;
notify pgrst,'reload schema';
commit;
select 'runn_prototype_ready' as result, count(*) as tables from pg_tables where schemaname='public' and tablename like 'runn_%';
