-- Allow short, nonempty operational notes without changing workflow checks.
begin;
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
notify pgrst,'reload schema';
commit;
