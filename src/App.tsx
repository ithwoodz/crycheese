import { useEffect, useRef, useState, type ReactNode } from 'react'
import { request, downloadCsv } from './api'
import {managerItems,managerValues,managerStatuses,managerRows,judgeManagerMeasure,type CheckStatus} from './checklist'
import {displayTimes,phaseOf,type ChecklistPhaseKey,type ManagerCheckItem} from './lib/managerChecklist'
import { addDays, money, statusLabels, type Issue, type Row, type Snapshot } from './domain'
import { LiveProvider, useLive, activeIssue, dayChecks, dayLabel, shortDate, storeName, storeCards } from './live'
import { BrandLogo } from './BrandLogo'

type IconName =
  | 'home'
  | 'check'
  | 'box'
  | 'message'
  | 'mail'
  | 'more'
  | 'alert'
  | 'clock'
  | 'store'
  | 'board'
  | 'send'
  | 'approve'
  | 'report'
  | 'search'
  | 'bell'
  | 'chevron'
  | 'arrow'
  | 'sparkle'
  | 'menu'
  | 'calendar'
  | 'thermometer'
  | 'package'
  | 'users'
  | 'chart'
  | 'user'
  | 'close'

const iconPaths: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  check: <><path d="M5 4h14v16H5z" /><path d="m8 9 2 2 5-5M8 15h8" /></>,
  box: <><path d="m4 7 8-4 8 4-8 4z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
  message: <><path d="M4 5h16v12H8l-4 4z" /><path d="M8 9h8M8 13h5" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  alert: <><path d="M12 3 2.8 20h18.4z" /><path d="M12 9v4M12 17h.01" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  store: <><path d="M4 9v11h16V9M3 9l2-6h14l2 6" /><path d="M3 9a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2M9 20v-5h6v5" /></>,
  board: <><path d="M4 4h6v16H4zM14 4h6v9h-6zM14 17h6v3h-6z" /></>,
  send: <><path d="m3 11 18-8-8 18-2-8zM11 13l4-4" /></>,
  approve: <><path d="M7 3h10v4H7zM5 5H3v16h18V5h-2" /><path d="m8 14 3 3 5-6" /></>,
  report: <><path d="M5 3h11l3 3v15H5z" /><path d="M15 3v4h4M8 12h8M8 16h6" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7M10 20h4" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
  arrow: <path d="m5 12 5 5L19 7" />,
  sparkle: <><path d="m12 2 1.4 4.6L18 8l-4.6 1.4L12 14l-1.4-4.6L6 8l4.6-1.4zM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7z" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  calendar: <><path d="M4 6h16v14H4zM8 3v6M16 3v6M4 10h16" /></>,
  thermometer: <><path d="M10 14.8V5a2 2 0 1 1 4 0v9.8a4 4 0 1 1-4 0Z" /><path d="M12 8v9" /></>,
  package: <><path d="M4 7h16v14H4zM2 3h20v4H2zM9 11h6" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-4 2-7 6-7s6 3 6 7M16 5a3 3 0 0 1 0 6M17 13c3 0 4 3 4 6" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-5 3-8 8-8s8 3 8 8" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  )
}

function Badge({ tone = 'neutral', children }: { tone?: 'critical' | 'warning' | 'good' | 'info' | 'neutral'; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

function Avatar({ text, dark = false }: { text: string; dark?: boolean }) {
  return <span className={`avatar ${dark ? 'avatar-dark' : ''}`}>{text}</span>
}

const svNav: { key: string; icon: IconName; label: string }[] = [
  { key: '현황', icon: 'home', label: '홈' },
  { key: '이슈 보드', icon: 'board', label: '이슈' },
  { key: '매장 관리', icon: 'store', label: '매장' },
  { key: '주간 보고서', icon: 'report', label: '보고' },
  { key: 'MY PAGE', icon: 'user', label: 'MY PAGE' },
]

type CostItem = { type: string; memo: string; amount: number; date: string; store_id: string }
type ReportItem = { id: string; title: string; store: string; sentAt: string; summary: string; unread: boolean }
type IssueItem = { id: string; title: string; store: string; sentAt: string; summary: string; urgency: '일반' | '긴급' }
type ScheduleCategory = '발주' | '체크' | '마감' | '기타'
type ScheduleItem = { id: string; store_id: string; date: string; time: string; title: string; category: ScheduleCategory; detail: string }
type TodayEntry = { key: string; time: string; label: string; title: string; detail: string; tone: string; onOpen: () => void }

const scheduleTone: Record<ScheduleCategory, string> = { 발주: 'amber', 체크: 'blue', 마감: 'green', 기타: 'violet' }

// 직접 추가한 일정과 SV 피드백 확인 여부는 서버 테이블이 없어 이 브라우저에만 저장합니다.
function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) as T : initial } catch { return initial }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Optional browser storage. */ } }, [key, value])
  return [value, setValue] as const
}

// SV가 점장에게 보낸 마지막 요청(담당 배정 또는 보완 요청) 이벤트입니다.
function svRequest(data: Snapshot, issue: Issue) {
  if (!issue.action) return null
  const event = data.events
    .filter(e => e.action_id === issue.action!.id && ['assign', 'reject'].includes(e.operation))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
  return event && String(event.actor || '').startsWith('SV') ? event : null
}

async function transitionIssue(issue: Issue, operation: string, body: { owner?: string; due_date?: string; note?: string }) {
  const action = issue.action || await request<Row>('/actions', { method: 'POST', body: { source_key: issue.source_key, store_id: issue.store_id, business_date: issue.business_date } })
  await request(`/actions/${action.id}`, { method: 'PATCH', body: { operation, version: action.version, ...body } })
}

function CommandModal({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  const live = useLive()
  const { data } = live
  const [note, setNote] = useState('')
  const [due, setDue] = useState(addDays(data.date, 1))
  const canAssign = ['open', 'assigned'].includes(issue.status)
  async function send() {
    const ok = await live.run(() => transitionIssue(issue, 'assign', { owner: `${storeName(data, issue.store_id)} 점장`, due_date: due, note: note.trim() }), '점장에게 조치 요청을 보냈어요')
    if (ok) onClose()
  }
  return (
    <div className="report-modal-backdrop">
      <div className="report-modal" role="dialog" aria-modal="true" aria-label="점장에게 조치 요청">
        <div className="report-modal-heading"><div><Badge tone="info">점장에게 조치 요청</Badge><h2>{issue.title}</h2><p>{storeName(data, issue.store_id)} · 요청은 점장 홈의 "지금 처리해 주세요"에 표시돼요.</p></div><button onClick={onClose} aria-label="닫기"><Icon name="close" size={18} /></button></div>
        <div className="report-form">
          {canAssign ? <>
            <label><span>요청 내용</span><textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="예: 도어 패킹을 점검하고 30분 뒤 재측정해 주세요." /></label>
            <label><span>처리 기한</span><input type="date" value={due} onChange={(event) => setDue(event.target.value)} /></label>
          </> : <p>이 이슈는 {statusLabels[issue.status] || issue.status} 상태라 새 요청을 보낼 수 없어요. 완료 보고가 오면 이슈 상세에서 확인 완료 또는 보완 요청을 해 주세요.</p>}
        </div>
        <div className="report-modal-actions"><button onClick={onClose}>취소</button>{canAssign && <button disabled={live.busy || !note.trim() || !due} onClick={() => void send()}><Icon name="send" size={15} /> 점장에게 보내기</button>}</div>
      </div>
    </div>
  )
}

function StoreCard({ store, onOpen }: { store: ReturnType<typeof storeCards>[number]; onOpen: () => void }) {
  const warning = (store.metric.wasteRate ?? 0) > 1
  return (
    <button className="store-card" onClick={onOpen}>
      <span className="store-card-top">
        <span className={`store-icon store-icon-${store.color}`}><Icon name="store" size={20} /></span>
        <span className="store-name-wrap">
          <strong>{store.name}</strong>
          <small>{store.location}</small>
        </span>
        <Icon name="chevron" size={18} />
      </span>
      <span className="store-stats">
        <span><b>{store.issues}</b><small>열린 이슈</small></span>
        <span><b className={warning ? 'text-critical' : ''}>{store.waste}</b><small>주간 폐기율</small></span>
        <span><b>{store.rate}</b><small>업무 이행률</small></span>
        <span><b>{store.grade}</b><small>서비스 등급</small></span>
      </span>
      <span className="trend-row">
        <small>7일 이슈 추이</small>
        <svg viewBox="0 0 106 20" preserveAspectRatio="none" aria-label="7일 이슈 추이">
          <polyline points={store.trend} fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
      {warning && <span className="limit-note"><i /> 기준 1% 초과 · 원인 분석 필요</span>}
    </button>
  )
}

// 확인 필요: SV가 아직 조치를 요청하지 않은 전달받은 이슈 / 진행 중: 요청했지만 점장이 조치 완료를 누르지 않음 / 확인 완료: 점장이 조치 완료를 누름
const resultGroups = [
  { key: 'need', label: '확인 필요' },
  { key: 'doing', label: '진행 중' },
  { key: 'done', label: '확인 완료' },
] as const
type ResultGroup = (typeof resultGroups)[number]['key']

function latestEvent(data: Snapshot, issue: Issue, operation: string) {
  if (!issue.action) return null
  return data.events.filter(e => e.action_id === issue.action!.id && e.operation === operation).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null
}

const eventTime = (event: Row | null) => event ? new Date(event.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

// anyKind: 매장 페이지처럼 점장이 보낸 이슈뿐 아니라 점검 기록 이슈까지 함께 볼 때
function resultGroupOf(data: Snapshot, issue: Issue, anyKind = false): ResultGroup | null {
  const requested = String(latestEvent(data, issue, 'assign')?.actor || '').startsWith('SV')
  if (!requested) return issue.status === 'open' && (issue.kind === 'manual' || (anyKind && activeIssue(issue))) ? 'need' : null
  if (['assigned', 'in_progress'].includes(issue.status)) return 'doing'
  if (['awaiting_verification', 'closed'].includes(issue.status)) return 'done'
  return null
}

function ActionResultCard({ issue, group, onRequest }: { issue: Issue; group: ResultGroup; onRequest: (issue: Issue) => void }) {
  const live = useLive()
  const { data } = live
  const request = latestEvent(data, issue, 'assign')
  const done = latestEvent(data, issue, 'request_verification')
  const tone = group === 'need' ? 'critical' : group === 'doing' ? 'info' : 'good'
  return (
    <article className={`result-card ${group}`}>
      <div className="result-top"><div><Badge tone={tone}>{resultGroups.find(g => g.key === group)!.label}</Badge><small>{storeName(data, issue.store_id)} · {issue.severity === 'critical' ? '긴급' : '일반'}</small></div><button type="button" onClick={() => live.open({ type: 'issue', issue })}>상세 <Icon name="chevron" size={13} /></button></div>
      <h3>{issue.title}</h3>
      <div className="result-steps">
        <div><span className="step-label">{issue.kind === 'manual' ? '점장 전달' : '점검 기록'}</span><p>{issue.description}</p><small>{issue.business_date}{issue.kind !== 'manual' && issue.standard ? ` · 기준 ${issue.standard}` : ''}</small></div>
        {group !== 'need' && <div><span className="step-label">SV 요청</span><p>{request?.note || '요청 내용 없음'}</p><small>{eventTime(request)} · 기한 {issue.due_date || '미정'}</small></div>}
        {group === 'doing' && <div className="empty"><span className="step-label">점장 조치</span><p>아직 조치 완료를 누르지 않았어요.</p></div>}
        {group === 'done' && <div className="verified"><span className="step-label">점장 조치 완료</span><p>점장이 요청한 조치를 완료했어요.</p><small>{eventTime(done)}</small></div>}
      </div>
      {group === 'need' && <div className="result-actions single"><button type="button" className="primary" onClick={() => onRequest(issue)}>조치 요청 <Icon name="send" size={13} /></button></div>}
    </article>
  )
}

function IssueBoardView({ onRequest, group, setGroup }: { onRequest: (issue: Issue) => void; group: ResultGroup; setGroup: (group: ResultGroup) => void }) {
  const live = useLive()
  const { data } = live
  const grouped = data.issues.map(issue => ({ issue, group: resultGroupOf(data, issue) })).filter(item => item.group)
  const countOf = (key: ResultGroup) => grouped.filter(item => item.group === key).length
  const shown = grouped.filter(item => item.group === group)
  return (
    <section className="issue-board-view">
      <div className="manager-submitted-section action-results">
        <div className="submitted-heading"><div><h2>전달받은 이슈 · 조치 결과</h2><p>점장이 보낸 이슈에 조치를 요청하고, 점장이 조치를 완료했는지 확인하세요.</p></div><Badge tone="critical">확인 필요 {countOf('need')}건</Badge></div>
        <div className="result-filter" role="tablist">
          {resultGroups.map(g => <button key={g.key} type="button" role="tab" aria-selected={group === g.key} className={group === g.key ? 'active' : ''} onClick={() => setGroup(g.key)}>{g.label} <em>{countOf(g.key)}</em></button>)}
        </div>
        <div className="result-list">
          {shown.map(({ issue, group: key }) => <ActionResultCard key={issue.id} issue={issue} group={key!} onRequest={onRequest} />)}
          {shown.length === 0 && <p className="my-history-empty">{group === 'need' ? '조치를 요청할 이슈가 없어요.' : group === 'doing' ? '진행 중인 조치 요청이 없어요.' : '조치가 완료된 요청이 없어요.'}</p>}
        </div>
      </div>
    </section>
  )
}

function StoreManagementView({ costs, onRequest }: { costs: CostItem[]; onRequest: (issue: Issue) => void }) {
  const live = useLive()
  const {data} = live
  const storeData = storeCards(data)
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const selected = storeData.find(store => store.name === selectedStore) || storeData[0]
  const storeCosts = costs.filter(cost => cost.store_id === selected?.store_id)
  const totalInputCost = storeCosts.reduce((sum,cost) => sum+cost.amount,0)
  const dailySales = data.sales.filter(row => row.store_id === selected?.store_id).slice(-12)
  const highestSale = Math.max(1,...dailySales.map(row => Number(row.sales_amount)))
  const checks = dayChecks(data,selected?.store_id)
  const storeIssues = (storeId?: string) => data.issues.filter(issue => issue.store_id === storeId && activeIssue(issue))
  const selectedIssues = storeIssues(selected?.store_id)
  const [storeTab, setStoreTab] = useState<ResultGroup>('need')
  const storeGrouped = data.issues.filter(issue => issue.store_id === selected?.store_id).map(issue => ({ issue, group: resultGroupOf(data, issue, true) })).filter(item => item.group)

  if (!selectedStore) {
    return (
      <section className="store-management-view">
        <div className="store-directory-heading"><div><h2>담당 매장</h2><p>상세 현황을 확인할 매장을 선택하세요.</p></div><span>총 {storeData.length}개 매장</span></div>
        <div className="store-directory">
          {storeData.map((store) => (
            <button key={store.name} onClick={() => setSelectedStore(store.name)}>
              <span className="directory-card-top"><span className={`store-icon store-icon-${store.color}`}><Icon name="store" size={21} /></span><span><b>{store.name}</b><small>{store.location} · 매장 운영</small></span><span className="issue-count-pill">이슈 <b>{storeIssues(store.store_id).length}</b>건</span></span>
              <span className="directory-metrics">
                <span><small>이번 달 매출</small><b>{store.metric.hasMonthSales ? money(store.metric.monthSales) : '기록 없음'}</b><em>{data.date.slice(0,7)} 누적</em></span>
                <span><small>업무 이행률</small><b>{store.rate}</b><em>최근 7일</em></span>
              </span>
              <span className="directory-card-bottom"><span><i className="good" /> 기준일 {data.date}</span><b>상세 현황 보기 <Icon name="chevron" size={15} /></b></span>
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="store-management-view">
      <div className="store-detail-header"><button onClick={() => setSelectedStore(null)}><Icon name="chevron" size={16} /> 매장 목록</button><div><span className="store-icon store-icon-orange"><Icon name="store" size={19} /></span><span><h2>{selectedStore}</h2><p>{selected?.location} · 기준일 {data.date}</p></span></div><span className="issue-count-pill">이슈 <b>{selectedIssues.length}</b>건</span></div>
      <div className="store-kpis">
        <article><small>이번 달 매출</small><strong>{selected?.metric.hasMonthSales ? money(selected.metric.monthSales) : '기록 없음'}</strong><span className="positive">{data.date.slice(0,7)} 누적</span></article>
        <article><small>이번 달 비용</small><strong>{money(totalInputCost)}</strong><span>점장 입력 {storeCosts.length}건 반영</span></article>
        <article><small>리뷰 평점</small><strong>—</strong><span className="warning">리뷰 수집 준비 중</span></article>
        <article><small>업무 이행률</small><strong>{selected?.rate}</strong><span className="warning">오늘 {checks.filter(c => !c.done).length}개 미완료</span></article>
      </div>
      <div className="manager-submitted-section action-results store-issues-panel">
        <div className="submitted-heading"><div><h2>매장 이슈</h2><p>{selectedStore}의 이슈를 조치 단계별로 확인하세요.</p></div><span className="issue-count-pill">이슈 <b>{storeGrouped.length}</b>건</span></div>
        <div className="result-filter" role="tablist">
          {resultGroups.map(g => <button key={g.key} type="button" role="tab" aria-selected={storeTab === g.key} className={storeTab === g.key ? 'active' : ''} onClick={() => setStoreTab(g.key)}>{g.label} <em>{storeGrouped.filter(item => item.group === g.key).length}</em></button>)}
        </div>
        <div className="result-list">
          {storeGrouped.filter(item => item.group === storeTab).map(({ issue, group }) => <ActionResultCard key={issue.id} issue={issue} group={group!} onRequest={onRequest} />)}
          {!storeGrouped.some(item => item.group === storeTab) && <p className="my-history-empty">{storeTab === 'need' ? '조치를 요청할 이슈가 없어요.' : storeTab === 'doing' ? '진행 중인 조치 요청이 없어요.' : '조치가 완료된 요청이 없어요.'}</p>}
        </div>
      </div>
      <div className="store-detail-grid">
        <article className="analytics-panel revenue-cost-panel">
          <div className="analytics-heading"><div><h2>매출 · 비용 추이</h2><p>점장 입력 데이터와 POS 매출을 함께 반영합니다.</p></div><Badge tone="good">등록 비용 기준</Badge></div>
          <div className="comparison-chart"><div className="comparison-legend"><span><i className="sales" /> 매출</span><span><i className="cost" /> 비용</span></div><div className="comparison-bars">{dailySales.map(row => <div key={row.date}><i className="sales" style={{ height: `${Number(row.sales_amount)/highestSale*100}%` }} /><i className="cost" style={{ height: `${data.costs.filter(c => c.store_id === selected.store_id && c.business_date === row.date).reduce((n,c) => n+Number(c.amount),0)/highestSale*100}%` }} /><span>{shortDate(row.date)}</span></div>)}</div></div>
        </article>
        <article className="analytics-panel input-data-panel">
          <div className="analytics-heading"><div><h2>점장 입력 내역</h2><p>점장 대시보드에서 최근 입력된 항목</p></div><Badge tone="info">실시간 반영</Badge></div>
          <div className="manager-input-list">
            {storeCosts.slice(0,3).map((cost, index) => <div key={index}><span className="input-icon cost"><Icon name="package" size={15} /></span><p><b>{cost.memo}</b><small>{cost.type} · {cost.date}</small></p><strong>-{cost.amount.toLocaleString()}원</strong></div>)}
            <div><span className="input-icon check"><Icon name="check" size={15} /></span><p><b>일일 점검 기록</b><small>{data.date} · {checks.filter(c => c.done).length}/{checks.length}</small></p><Badge tone="good">{checks.filter(c => c.done).length}개 완료</Badge></div>
          </div>
        </article>
        <article className="analytics-panel review-management">
          <div className="analytics-heading"><div><h2>리뷰 관리</h2><p>최근 30일 고객 반응</p></div><strong>— <small>/ 5.0</small></strong></div>
          <div className="review-sentiment"><div><span>긍정</span><i><b style={{ width: '0%' }} /></i><strong>—</strong></div><div><span>중립</span><i><b style={{ width: '0%' }} /></i><strong>—</strong></div><div><span>부정</span><i><b style={{ width: '0%' }} /></i><strong>—</strong></div></div>
          <div className="review-topic"><Badge tone="warning">주의</Badge><p><b>리뷰 수집 준비 중</b><small>등록된 리뷰가 없습니다.</small></p><Icon name="chevron" size={16} /></div>
        </article>
        <article className="analytics-panel compliance-panel">
          <div className="analytics-heading"><div><h2>업무 이행률</h2><p>오픈·중간·마감 체크 기준</p></div><strong>{selected?.rate}</strong></div>
          <div className="compliance-ring" style={{background:`conic-gradient(#0a6936 ${selected?.metric.taskRate || 0}%, #eff3f1 0)`}}><span>{selected?.metric.taskRate.toFixed(0)}<small>%</small></span></div>
          <div className="compliance-items">{['오픈','중간','마감'].map(block => {const group=checks.filter(c => c.time_block.includes(block));return <span key={block}><i className="good" />{block} 체크 <b>{group.length ? `${Math.round(group.filter(c => c.done).length/group.length*100)}%` : '해당 없음'}</b></span>})}</div>
        </article>
      </div>
    </section>
  )
}

function SvReportCard({ report }: { report: Row }) {
  const live = useLive()
  const { data } = live
  const [reply, setReply] = useState(String(report.reply || ''))
  const [editing, setEditing] = useState(!report.reply)
  async function save() {
    const ok = await live.run(() => request(`/reports/${report.id}`, { method: 'PATCH', body: { reply: reply.trim() } }), '피드백을 보냈어요')
    if (ok) setEditing(false)
  }
  return (
    <article className="sv-report-card">
      <div className="feedback-top"><span className="sv-report-store"><span className="report-store-mark">{storeName(data, report.store_id).slice(-1)}</span><b>{storeName(data, report.store_id)}</b></span><Badge tone={report.read_only ? 'neutral' : report.reply ? 'good' : 'info'}>{report.read_only ? '가져온 보고서' : report.reply ? '피드백 보냄' : '새 보고서'}</Badge></div>
      <h3>{report.title}</h3>
      <p>{report.summary}</p>
      <WeeklyReportBody figures={report.metrics || {}} weekly={weeklyForReport(data, report)} />
      {!report.read_only && (editing
        ? <div className="sv-reply-form"><span className="step-label">SV 피드백</span><textarea rows={3} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="점장에게 보낼 피드백을 적어 주세요." /><div><button type="button" className="primary" disabled={live.busy || !reply.trim()} onClick={() => void save()}>피드백 보내기 <Icon name="send" size={13} /></button></div></div>
        : <div className="feedback-reply"><span className="step-label">SV 피드백</span><p>{report.reply}</p><button type="button" onClick={() => setEditing(true)}>수정</button></div>)}
    </article>
  )
}

// SV 보고 탭 상단: 담당 매장 전체의 일별 매출 합계 추이
function SalesTrendCard() {
  const live = useLive()
  const { data } = live
  const dates = [...new Set(data.sales.map(r => String(r.date)))].sort()
  const totals = dates.map(date => ({ date, value: data.sales.filter(r => r.date === date).reduce((n, r) => n + Number(r.sales_amount), 0) }))
  const stores = [...new Set(data.sales.map(r => String(r.store_id)))]
  const sum = totals.reduce((n, r) => n + r.value, 0)
  const max = Math.max(1, ...totals.map(r => r.value))
  const min = Math.min(...totals.map(r => r.value), max)
  const last = totals[totals.length - 1], prev = totals[totals.length - 2]
  const x = (i: number) => totals.length === 1 ? 150 : i / (totals.length - 1) * 300
  const y = (v: number) => 92 - (v - min * 0.9) / (max - min * 0.9 || 1) * 80
  const points = totals.map((r, i) => `${x(i)},${y(r.value)}`).join(' ')
  if (!totals.length) return null
  return (
    <article className="sales-trend-card">
      <div className="sales-trend-head"><div><h2>전체 매장 매출 추이</h2><p>{stores.length}개 매장 합계 · {shortDate(dates[0])} ~ {shortDate(dates[dates.length - 1])}</p></div><span><small>기간 합계</small><b>{money(sum)}</b></span></div>
      <div className="sales-trend-today"><span><small>{shortDate(last.date)} 매출</small><b>{money(last.value)}</b></span>{prev && prev.value > 0 && <em className={last.value >= prev.value ? 'up' : 'down'}>전일 대비 {((last.value / prev.value - 1) * 100).toFixed(1)}%</em>}</div>
      <svg className="sales-trend-chart" viewBox="-6 0 312 100" preserveAspectRatio="none" role="img" aria-label="전체 매장 일별 매출 합계 추이">
        <polyline points={`${x(0)},100 ${points} ${x(totals.length - 1)},100`} fill="#0a6936" opacity=".08" stroke="none" />
        <polyline points={points} fill="none" stroke="#0a6936" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {totals.map((r, i) => <circle key={r.date} cx={x(i)} cy={y(r.value)} r="2.4" fill={i === totals.length - 1 ? '#ffcb05' : '#0a6936'} stroke="white" strokeWidth=".8" vectorEffect="non-scaling-stroke"><title>{`${r.date} ${money(r.value)}`}</title></circle>)}
      </svg>
      <div className="sales-trend-labels"><span>{shortDate(dates[0])}</span><span>{shortDate(dates[Math.floor((dates.length - 1) / 2)])}</span><span>{shortDate(dates[dates.length - 1])}</span></div>
      <div className="sales-trend-stores">{stores.map(id => <span key={id}><b>{storeName(data, id)}</b>{money(data.sales.filter(r => r.store_id === id).reduce((n, r) => n + Number(r.sales_amount), 0))}</span>)}</div>
    </article>
  )
}

function WeeklyReportView({ reports }: { reports: ReportItem[] }) {
  const live = useLive()
  const { data } = live
  const [filter, setFilter] = useState<'new' | 'all'>('new')
  const rows = reports.map(item => data.reports.find(r => r.id === item.id)).filter(Boolean).sort((a, b) => String(b!.created_at).localeCompare(String(a!.created_at))) as Row[]
  const fresh = rows.filter(r => !r.read_only && !r.reply)
  const shown = filter === 'new' ? fresh : rows
  return (
    <section className="weekly-report-view">
      <SalesTrendCard />
      <div className="report-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={filter === 'new'} className={filter === 'new' ? 'active' : ''} onClick={() => setFilter('new')}>피드백 필요{fresh.length > 0 && <i>{fresh.length}</i>}</button>
        <button type="button" role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체 보고서</button>
      </div>
      <div className="feedback-list">
        {shown.map(report => <SvReportCard key={report.id} report={report} />)}
        {shown.length === 0 && <p className="my-history-empty">{filter === 'new' ? '피드백이 필요한 보고서가 없어요.' : '아직 받은 보고서가 없어요.'}</p>}
      </div>
    </section>
  )
}

function Dashboard({ onSwitch, costs, reports, managerIssues }: { onSwitch: () => void; costs: CostItem[]; reports: ReportItem[]; managerIssues: IssueItem[] }) {
  const live = useLive()
  const {data} = live
  const issues = data.issues.filter(activeIssue)
  const urgent = issues.filter(i => i.severity === 'critical' && i.status !== 'awaiting_verification')
  const [resultTab, setResultTab] = useState<ResultGroup>('need')
  const openResults = (group: ResultGroup) => { setNoticeOpen(false); setResultTab(group); setActive('이슈 보드') }
  const [svNotify, setSvNotify] = useStoredState<Record<string, boolean>>('runn-notify-sv-v1', {})
  const [svNotifyOpen, setSvNotifyOpen] = useState(false)
  const allSvNotices: Notice[] = [
    ...data.issues.filter(i => resultGroupOf(data, i) === 'need').map(i => ({ key: `new-${i.id}`, type: 'newIssue', icon: 'alert' as IconName, tone: 'red' as const, title: `${storeName(data, i.store_id)} 점장이 이슈를 보냈어요`, detail: i.title, at: String(i.action?.created_at || i.business_date), onOpen: () => openResults('need') })),
    ...data.events.filter(e => e.operation === 'request_verification').map(e => { const issue = data.issues.find(i => i.action?.id === e.action_id); return { key: `done-${e.id}`, type: 'done', icon: 'approve' as IconName, tone: 'green' as const, title: `${storeName(data, issue?.store_id || e.store_id)} 점장이 조치를 완료했어요`, detail: issue?.title || '조치 완료', at: String(e.created_at), onOpen: () => openResults('done') } }),
    ...data.reports.filter(r => !r.read_only && !r.reply).map(r => ({ key: `report-${r.id}`, type: 'report', icon: 'report' as IconName, tone: 'blue' as const, title: `${storeName(data, r.store_id)} 주간 보고서가 도착했어요`, detail: r.title, at: String(r.created_at), onOpen: () => { setNoticeOpen(false); setActive('주간 보고서') } })),
  ]
  const svNotices = allSvNotices.filter(n => svNotify[n.type] !== false)
  const resultCounts = Object.fromEntries(resultGroups.map(g => [g.key, data.issues.filter(i => resultGroupOf(data, i) === g.key).length])) as Record<ResultGroup, number>
  const needsSv = data.issues.filter(i => resultGroupOf(data, i) === 'need').length
  const [active, setActive] = useState('현황')
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [requesting, setRequesting] = useState<Issue | null>(null)

  return (
    <div className="manager-bg">
      <div className="manager-shell sv-shell">
        <header className="manager-header">
          <div className="manager-brand"><BrandLogo /><b>CRBU</b><em className="role-tag">SV</em></div>
          <div className="manager-tools">
            <button className="icon-button" onClick={() => setNoticeOpen(true)} aria-label="알림">{svNotices.length > 0 && <i />}<Icon name="bell" size={20} /></button>
            <Avatar text="SV" />
          </div>
        </header>

        <main className={`manager-main ${active === '매장 관리' ? 'compact-top' : ''}`}>
          {active === 'MY PAGE' ? <SvMyPage onSwitch={onSwitch} onNotifySettings={() => setSvNotifyOpen(true)} /> : <>
          {active !== '매장 관리' && <section className="manager-welcome">
            <p>{dayLabel(data.date)} · 담당 {data.stores.length}개 매장</p>
            <h1>{active === '현황' ? '안녕하세요, SV님' : active}</h1>
            <span>{active === '현황' ? '확인이 필요한 이슈부터 살펴보세요.' : `${data.stores.length}개 매장의 운영 데이터를 한눈에 확인하세요.`}</span>
            <button className="date-chip" onClick={() => live.open({type:'date'})}><Icon name="calendar" size={15} /> {data.date} <Icon name="chevron" size={13} /></button>
          </section>}

          {active === '현황' ? <>
          <section className="sv-home-urgent">
            <div className="panel issue-panel">
              <div className="panel-heading">
                <div><h2>지금 확인할 이슈</h2><span>긴급 이슈만 기한순으로 보여줘요</span></div>
                <button onClick={() => setActive('이슈 보드')}>전체 보기 <Icon name="chevron" size={15} /></button>
              </div>
              <div className="issue-list">
                {urgent.map(issue => <article key={issue.id} className={`issue-row ${issue.severity === 'critical' ? 'critical' : 'warning'}`}><span className="issue-source temp"><Icon name={issue.kind === 'temperature' ? 'thermometer' : 'check'} /></span><div className="issue-body"><div><Badge tone={issue.severity === 'critical' ? 'critical' : 'warning'}>{statusLabels[issue.status]}</Badge><Badge tone="neutral">{shortDate(issue.business_date)}</Badge></div><h3>{issue.title}</h3><p>{storeName(data,issue.store_id)}</p><span className="evidence"><b>{issue.value !== null ? `${issue.value}${issue.kind === 'temperature' ? '℃' : ''}` : '점검 기록'}</b><i />{issue.standard}</span></div><div className="issue-action"><small>{shortDate(issue.due_date || '')}</small><button onClick={() => live.open({type:'issue',issue})}>확인하기 <Icon name="chevron" size={15} /></button></div></article>)}
                {!urgent.length && <p className="my-history-empty">지금 확인할 긴급 이슈가 없어요.</p>}
              </div>
            </div>

          </section>

          <section className="result-summary" aria-label="조치 결과 현황">
            {resultGroups.map(g => (
              <button key={g.key} type="button" className={`result-summary-card ${g.key}`} onClick={() => { setResultTab(g.key); setActive('이슈 보드') }}>
                <span className="metric-icon"><Icon name={g.key === 'need' ? 'alert' : g.key === 'doing' ? 'clock' : 'approve'} /></span>
                <small>{g.label}</small>
                <strong>{resultCounts[g.key]}</strong>
                <em>조치 결과 보기 <Icon name="chevron" size={12} /></em>
              </button>
            ))}
          </section>

          <section className="dashboard-grid sv-activity">
            <aside className="panel activity-panel">
              <div className="panel-heading"><div><h2>최근 활동</h2><span>매장별 업데이트</span></div><button><Icon name="more" /></button></div>
              <div className="timeline">
                {data.events.slice(0,4).map(event => <div key={event.id}><span className="timeline-dot blue"><Icon name="check" size={12} /></span><p><b>{({assign:'담당 배정',start:'조치 시작',request_verification:'확인 요청',verify:'확인 완료',reject:'보완 요청',measurement:'측정 기록'} as Record<string,string>)[event.operation] || '점검 기록'}</b><span>{data.actions.find(a => a.id === event.action_id)?.title || '운영 조치'}</span><small>{new Date(event.created_at).toLocaleString('ko-KR')}</small></p></div>)}
                {!data.events.length && <div><span className="timeline-dot blue"><Icon name="check" size={12} /></span><p><b>운영 기록 조회</b><span>{data.stores.length}개 매장</span><small>기준일 {data.date}</small></p></div>}
              </div>
            </aside>
          </section>

          </> : active === '이슈 보드' ? <IssueBoardView onRequest={setRequesting} group={resultTab} setGroup={setResultTab} /> : active === '매장 관리' ? <StoreManagementView costs={costs} onRequest={setRequesting} /> : <WeeklyReportView reports={reports} />}
          </>}
        </main>

        <nav className="bottom-nav" aria-label="SV 메뉴">
          {svNav.map((item) => (
            <button key={item.key} className={active === item.key ? 'active' : ''} onClick={() => setActive(item.key)}>
              <span><Icon name={item.icon} size={21} />{item.key === '이슈 보드' && needsSv > 0 && <i>{needsSv}</i>}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
        {requesting && <CommandModal issue={requesting} onClose={() => setRequesting(null)} />}
        {noticeOpen && <NotificationScreen notices={svNotices} onBack={() => { setNoticeOpen(false); setActive('현황') }} />}
        {svNotifyOpen && <NotificationSettings types={svNoticeTypes} enabled={svNotify} onChange={(key, on) => setSvNotify(current => ({ ...current, [key]: on }))} onClose={() => setSvNotifyOpen(false)} />}
      </div>
    </div>
  )
}

type Notice = { key: string; type: string; icon: IconName; tone: 'red' | 'amber' | 'green' | 'blue'; title: string; detail: string; at: string; onOpen: () => void }

const noticeTime = (at: string) => at.length > 10 ? new Date(at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : at

const managerNoticeTypes = [
  { key: 'request', label: 'SV 조치 요청', detail: 'SV가 조치나 보완을 요청하면 알려줘요' },
  { key: 'reply', label: '보고서 피드백', detail: 'SV가 주간 보고서에 답변하면 알려줘요' },
  { key: 'urgent', label: '긴급 이슈', detail: '매장에 긴급 이슈가 생기면 알려줘요' },
]
const svNoticeTypes = [
  { key: 'newIssue', label: '점장 이슈 전달', detail: '점장이 이슈를 보내면 알려줘요' },
  { key: 'done', label: '조치 완료', detail: '점장이 요청한 조치를 완료하면 알려줘요' },
  { key: 'report', label: '주간 보고서 도착', detail: '점장이 주간 보고서를 보내면 알려줘요' },
]

// 알림 종류별 켜기/끄기. 이 브라우저에 저장되며 끈 종류는 알림 목록과 🔔 표시에서 빠집니다.
function NotificationSettings({ types, enabled, onChange, onClose }: { types: { key: string; label: string; detail: string }[]; enabled: Record<string, boolean>; onChange: (key: string, on: boolean) => void; onClose: () => void }) {
  return (
    <div className="report-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="report-modal" role="dialog" aria-modal="true" aria-label="알림 설정">
        <div className="report-modal-heading"><div><Badge tone="info">설정</Badge><h2>알림 설정</h2><p>받고 싶은 알림만 켜 두세요.</p></div><button onClick={onClose} aria-label="닫기"><Icon name="close" size={18} /></button></div>
        <div className="notify-settings">
          {types.map(type => {
            const on = enabled[type.key] !== false
            return (
              <div key={type.key}>
                <span><b>{type.label}</b><small>{type.detail}</small></span>
                <button type="button" role="switch" aria-checked={on} aria-label={`${type.label} 알림`} className={`notify-switch ${on ? 'on' : ''}`} onClick={() => onChange(type.key, !on)}><i /><em>{on ? 'ON' : 'OFF'}</em></button>
              </div>
            )
          })}
        </div>
        <div className="report-modal-actions"><button onClick={onClose}>닫기</button></div>
      </div>
    </div>
  )
}

function NotificationScreen({ notices, onBack }: { notices: Notice[]; onBack: () => void }) {
  const sorted = [...notices].sort((a, b) => b.at.localeCompare(a.at))
  return (
    <div className="checklist-screen notification-screen" role="dialog" aria-label="알림">
      <header className="checklist-screen-header">
        <button type="button" onClick={onBack} aria-label="홈으로 돌아가기"><Icon name="chevron" size={20} /></button>
        <div><h2>알림</h2><p>새 소식 {sorted.length}건</p></div>
        <span />
      </header>
      <div className="checklist-screen-body">
        <div className="notice-list">
          {sorted.map(item => (
            <button key={item.key} type="button" onClick={item.onOpen}>
              <span className={`notice-icon ${item.tone}`}><Icon name={item.icon} size={17} /></span>
              <span className="notice-copy"><b>{item.title}</b><span>{item.detail}</span><small>{noticeTime(item.at)}</small></span>
              <Icon name="chevron" size={15} />
            </button>
          ))}
          {sorted.length === 0 && <p className="my-history-empty">새 알림이 없어요.</p>}
        </div>
      </div>
    </div>
  )
}

function SvMyPage({ onSwitch, onNotifySettings }: { onSwitch: () => void; onNotifySettings: () => void }) {
  const live = useLive()
  const { data } = live
  return (
    <section className="management-page">
      <div className="subpage-heading"><div><p>계정 및 담당 매장</p><h1>MY PAGE</h1><span>내 정보와 담당 매장을 관리하세요.</span></div></div>
      <article className="profile-card-large"><Avatar text="SV" /><div><h2>매장 운영 SV</h2><p>슈퍼바이저 · 담당 {data.stores.length}개 매장</p><span>{data.stores.map(s => s.store_name).join(' · ')}</span></div><button onClick={() => live.open({type:'date'})}>기준일 변경</button></article>
      <div className="settings-list">
        <button onClick={() => live.open({type:'settings'})}><span className="panel-title-icon blue"><Icon name="store" size={18} /></span><div><b>담당 매장</b><small>매장 기본 정보와 영업시간</small></div><Icon name="chevron" size={17} /></button>
        <button onClick={onNotifySettings}><span className="panel-title-icon violet"><Icon name="bell" size={18} /></span><div><b>알림 설정</b><small>점장 이슈·보고서 알림 켜기/끄기</small></div><Icon name="chevron" size={17} /></button>
        <button onClick={onSwitch}><span className="panel-title-icon green"><Icon name="users" size={18} /></span><div><b>점장 화면 보기</b><small>매장 점장 화면으로 전환</small></div><Icon name="chevron" size={17} /></button>
      </div>
    </section>
  )
}

const managerNav: { icon: IconName; label: string }[] = [
  { icon: 'home', label: '홈' },
  { icon: 'board', label: '관리' },
  { icon: 'report', label: '보고' },
  { icon: 'user', label: 'MY PAGE' },
]

function StatusToggle({ label, status, onChange, disabled }: { label:string; status: CheckStatus; onChange: (status: CheckStatus) => void; disabled:boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={status === 'ok'}
      aria-label={`${label} · ${status === 'ok' ? '정상' : status === 'bad' ? '비정상' : '미확인'}`}
      className={`status-toggle ${status ?? 'unset'}`}
      disabled={disabled} onClick={() => onChange(status === 'ok' ? 'bad' : 'ok')}
    >
      <i />
      <span>{status === 'ok' ? '정상' : status === 'bad' ? '비정상' : '미확인'}</span>
    </button>
  )
}

// 측정 항목은 입력값으로 자동 판정하므로 누를 수 없는 표시용 상태입니다.
function StatusIndicator({ status }: { status: CheckStatus }) {
  const label = status === 'ok' ? '정상' : status === 'bad' ? '비정상' : '입력 대기'
  return (
    <span role="status" aria-label={label} className={`status-toggle readonly ${status ?? 'unset'}`}>
      <i />
      <span>{label}</span>
    </span>
  )
}

type AbnormalEntry = { key: string; phase: string; label: string; options: string[]; evidence?: string }

function ChecklistIssueModal({ entries, onClose, onSend }: { entries: AbnormalEntry[]; onClose: () => void; onSend: (picked: { entry: AbnormalEntry; items: string[] }[], memo: string, urgency: IssueItem['urgency']) => void }) {
  const live=useLive()
  // 측정 항목은 하위항목이 하나뿐이라 미리 선택해 둡니다.
  const [picked, setPicked] = useState<Record<string, string[]>>(() => Object.fromEntries(entries.map((entry) => [entry.key, entry.options.length === 1 ? entry.options : []])))
  const [memo, setMemo] = useState('')
  const [urgency, setUrgency] = useState<IssueItem['urgency']>('긴급')
  const selection = entries.map((entry) => ({ entry, items: picked[entry.key] ?? [] })).filter((item) => item.items.length > 0)

  function toggle(entry: AbnormalEntry, option: string) {
    setPicked((current) => {
      const items = current[entry.key] ?? []
      return { ...current, [entry.key]: items.includes(option) ? items.filter((item) => item !== option) : [...items, option] }
    })
  }

  return (
    <div className="report-modal-backdrop">
      <div className="report-modal issue-compose-modal">
        <div className="report-modal-heading"><div><Badge tone="critical">SV 확인 요청</Badge><h2>체크리스트 이슈 전달</h2><p>문제가 있는 하위항목을 선택하면 바로 SV에게 전달돼요.</p></div><button onClick={onClose} aria-label="닫기"><Icon name="close" size={18} /></button></div>
        <div className="report-form">
          {entries.map((entry) => (
            <div key={entry.key} className="issue-pick-group">
              <div><Badge tone="critical">{entry.phase}</Badge><b>{entry.label}</b>{entry.evidence && <small>{entry.evidence}</small>}</div>
              <div className="issue-pick-options">
                {entry.options.map((option) => <button key={option} type="button" className={(picked[entry.key] ?? []).includes(option) ? 'active' : ''} onClick={() => toggle(entry, option)}>{(picked[entry.key] ?? []).includes(option) && <Icon name="arrow" size={11} />}{option}</button>)}
              </div>
            </div>
          ))}
          <label><span>추가 메모 (선택)</span><textarea rows={3} value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="현재 상황과 이미 시도한 조치를 입력해 주세요." /></label>
          <div className="issue-urgency"><span>긴급도</span><div>{(['일반', '긴급'] as const).map((level) => <button key={level} type="button" className={urgency === level ? 'active' : ''} onClick={() => setUrgency(level)}>{level}</button>)}</div></div>
        </div>
        <div className="report-modal-actions"><button onClick={onClose}>취소</button><button className="issue-send" disabled={live.busy || selection.length === 0} onClick={() => onSend(selection, memo, urgency)}><Icon name="send" size={15} /> {selection.length ? `${selection.reduce((sum, item) => sum + item.items.length, 0)}개 항목 SV에게 전달` : '하위항목을 선택하세요'}</button></div>
      </div>
    </div>
  )
}

function DailyChecklist({ onToast }: { onToast: (message: string) => void }) {
  const live=useLive()
  const {data}=live
  const managerChecklist=managerItems(data)
  const recordedValues=managerValues(data)
  const [drafts,setDrafts]=useState<Record<string,string>>({})
  const values={...recordedValues,...drafts}
  const statuses=managerStatuses(data)
  const saving=useRef(new Set<string>())
  const [savingItems,setSavingItems]=useState<Set<string>>(new Set())
  const [screen, setScreen] = useState<ChecklistPhaseKey | null>(null)
  const [composing, setComposing] = useState(false)
  const [localSentKeys, setSentKeys] = useState<string[]>([])
  const sentKeys=[...localSentKeys,...data.actions.filter(a => a.store_id===data.session.storeId && a.business_date===data.date).flatMap(a => a.source?.checklist_keys || [])]

  const times = displayTimes(managerChecklist)
  const measures = managerChecklist.filter((item) => item.input === '온도(℃)')
  const itemsOf = (key: ChecklistPhaseKey) => managerChecklist.filter((item) => phaseOf(item) === key)
  const doneCount = (key: ChecklistPhaseKey) => itemsOf(key).filter((item) => statuses[item.id]).length
  const isComplete = (key: ChecklistPhaseKey) => doneCount(key) === itemsOf(key).length

  const abnormal: AbnormalEntry[] = managerChecklist.filter((item) => statuses[item.id] === 'bad').map((item) => ({
    key: item.input === '온도(℃)' ? `${item.id}:${values[item.id] ?? ''}` : item.id,
    phase: phaseOf(item) === 'open' ? '오픈' : '마감',
    label: item.task.replace(/^\*\*/, ''),
    options: [item.input === '온도(℃)' && values[item.id] ? `${item.task} ${values[item.id]}℃` : item.task.replace(/^\*\*/, '')],
    evidence: item.standard ? `기준 ${item.standard}` : undefined,
  }))
  const unsent = abnormal.filter((entry) => !sentKeys.includes(entry.key))

  function measure(item: ManagerCheckItem, raw: string) {setDrafts(current => ({...current,[item.id]:raw}))}
  function setStatus(item: ManagerCheckItem, status: CheckStatus) {if(status)live.saveCheck(item.id,status==='ok',status)}
  async function saveMeasurement(item: ManagerCheckItem) {
    const value=drafts[item.id]
    if(saving.current.has(item.id)||value===undefined||value===recordedValues[item.id])return
    if(judgeManagerMeasure(item,value)===null){onToast('측정값을 숫자로 입력해 주세요.');return}
    saving.current.add(item.id);setSavingItems(new Set(saving.current))
    try {
      await request('/observations',{method:'POST',body:{id:crypto.randomUUID(),store_id:data.session.storeId,business_date:data.date,kind:'temperature',item_id:item.id,value:Number(value),note:'관리자 일일 체크리스트 측정'}})
      await live.reload()
      setDrafts(current => {const next={...current};delete next[item.id];return next})
      onToast('측정값을 기록했어요.')
    } catch(error){onToast((error as Error).message)}
    finally{saving.current.delete(item.id);setSavingItems(new Set(saving.current))}
  }
  async function sendIssue(picked: { entry: AbnormalEntry; items: string[] }[], memo: string, urgency: IssueItem['urgency']) {
    const items=picked.flatMap(item=>item.items)
    const ok=await live.run(()=>request('/actions',{method:'POST',body:{id:crypto.randomUUID(),store_id:data.session.storeId,business_date:data.date,title:picked.length===1?`${picked[0].entry.label} 비정상`:`체크리스트 비정상 ${picked.length}건`,note:[`${picked[0].entry.phase} 체크: ${items.join(', ')}`,memo.trim()].filter(Boolean).join(' · '),severity:urgency==='긴급'?'critical':'warning',category:'관리자 체크리스트',checklist_keys:picked.map(item=>item.entry.key)}}),'SV에게 이슈를 전달했어요')
    if(ok){setSentKeys(current=>[...current,...picked.map(item=>item.entry.key)]);setComposing(false)}
  }

  const abnormalNote = abnormal.length > 0 && (
    <div className={`abnormal-note ${unsent.length ? '' : 'sent'}`}>
      <Icon name={unsent.length ? 'alert' : 'arrow'} size={14} />
      <p>{unsent.length ? <>비정상 {unsent.length}건 · {unsent.map((entry) => entry.label).join(', ')}</> : <>비정상 {abnormal.length}건 SV에 전달 완료</>}</p>
      {unsent.length > 0 && <button type="button" onClick={() => setComposing(true)}>이슈 작성 <Icon name="chevron" size={13} /></button>}
    </div>
  )

  function renderScreen(key: ChecklistPhaseKey) {
    const checks = itemsOf(key).filter((item) => item.input === '완료 체크')
    const sections = [...new Set(checks.map((item) => item.section))]
    const total = itemsOf(key).length
    const done = doneCount(key)
    return (
      <div className="checklist-screen" role="dialog" aria-label={`${key === 'open' ? '오픈' : '마감'} 체크리스트`}>
        <header className="checklist-screen-header">
          <button type="button" onClick={() => setScreen(null)} aria-label="뒤로"><Icon name="chevron" size={20} /></button>
          <div><h2>{key === 'open' ? '오픈' : '마감'} 체크리스트</h2><p>{done} / {total} 완료</p></div>
          <b>{Math.round(done / total * 100)}%</b>
        </header>
        <div className="checklist-screen-body">
          <div className="check-progress"><i style={{ width: `${done / total * 100}%` }} /></div>
          {abnormalNote}
          {key === 'open' && (
            <div className="measure-list">
              <h3>측정값 입력 · {measures[0]?.section} <small>{times.get(measures[0]?.id ?? '')} · 입력하면 기준에 따라 자동 판정</small></h3>
              {measures.map((item) => {
                const status = judgeManagerMeasure(item,values[item.id] ?? '')
                return (
                  <div key={item.id} className={`measure-row ${status ?? 'unset'}`}>
                    <span><b>{item.task}</b><small>기준 {item.standard}</small></span>
                    <label className="measure-input">
                      <input inputMode="decimal" aria-label={`${item.task} 온도`} value={values[item.id] ?? ''} placeholder="입력" disabled={live.busy || savingItems.has(item.id)} onChange={(event) => measure(item, event.target.value)} onBlur={() => void saveMeasurement(item)} />
                      <em>℃</em>
                    </label>
                    <StatusIndicator status={status} />
                  </div>
                )
              })}
            </div>
          )}
          <div className="daily-phase">
            {sections.map((section) => (
              <div key={section} className="group-list">
                <h3>{section}</h3>
                {checks.filter((item) => item.section === section).map((item) => {
                  const important = item.task.startsWith('(중요)') || item.task.startsWith('**')
                  return (
                    <div key={item.id} className={`group-row ${statuses[item.id] ?? 'unset'}`}>
                      <span>{times.get(item.id) && <i className="task-time">{times.get(item.id)}</i>}<b className={important ? 'important' : ''}>{item.task.replace(/^\*\*/, '')}</b></span>
                      <StatusToggle label={item.task} disabled={live.busy} status={statuses[item.id] ?? null} onChange={(next) => setStatus(item, next)} />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          {isComplete(key) && (key === 'open'
            ? <button type="button" className="phase-complete" onClick={() => setScreen('close')}><Icon name="approve" size={15} /> 오픈 체크 완료 · 마감 체크리스트로 이동 <Icon name="chevron" size={14} /></button>
            : <button type="button" className="phase-complete" onClick={() => setScreen(null)}><Icon name="approve" size={15} /> 오늘 마감 체크를 모두 완료했어요 · 돌아가기</button>)}
        </div>
      </div>
    )
  }

  const allTotal = managerChecklist.length
  const allDone = doneCount('open') + doneCount('close')

  return (
    <article className="simple-panel checklist-panel daily-checklist">
      <div className="simple-panel-title"><div><span className="panel-title-icon blue"><Icon name="check" size={18} /></span><div><h2>관리자 일일 체크리스트</h2><p>오늘 {allDone} / {allTotal} 완료</p></div></div><b>{Math.round(allDone / allTotal * 100)}%</b></div>
      <div className="check-progress"><i style={{ width: `${allDone / allTotal * 100}%` }} /></div>
      {abnormalNote}
      <div className="phase-entry">
        {(['open', 'close'] as const).map((key) => (
          <button key={key} type="button" className={`${key} ${isComplete(key) ? 'complete' : ''}`} onClick={() => setScreen(key)}>
            <span className="phase-entry-icon"><Icon name={isComplete(key) ? 'approve' : key === 'open' ? 'store' : 'clock'} size={20} /></span>
            <span className="phase-entry-copy"><b>{key === 'open' ? '오픈' : '마감'}</b><small>{key === 'open' ? '심부 온도 측정 포함' : '중간 마감 포함'}</small></span>
            <span className="phase-entry-count"><strong>{doneCount(key)}<small>/{itemsOf(key).length}</small></strong><i><b style={{ width: `${doneCount(key) / itemsOf(key).length * 100}%` }} /></i></span>
            <Icon name="chevron" size={16} />
          </button>
        ))}
      </div>
      {screen && renderScreen(screen)}
      {composing && <ChecklistIssueModal entries={unsent} onClose={() => setComposing(false)} onSend={sendIssue} />}
    </article>
  )
}

type InventoryRecord = { id: string; store_id: string; type: 'in' | 'waste'; date: string; ingredient_id: string; item: string; qty: number; unit: string; useBy?: string; reason?: string; detail?: string; amount?: number; createdAt: string }
type SetRecords = (update: (current: InventoryRecord[]) => InventoryRecord[]) => void

const wasteReasons = ['유통기한 경과', '품질 불량', '조리 실수', '보관 온도 이탈', '과잉 준비', '기타']

// 단가는 발주 단위 가격이라 사용 단위 1개 가격으로 나눠 폐기 금액을 어림합니다.
function unitPrice(data: Snapshot, ingredient: Row | undefined) {
  if (!ingredient) return 0
  const prices = data.prices.filter(p => p.ingredient_id === ingredient.ingredient_id).sort((a, b) => String(b.valid_from).localeCompare(String(a.valid_from)))
  const price = prices.find(p => p.valid_from <= data.date) || prices[prices.length - 1]
  const perOrder = Number(ingredient.use_qty_per_order_unit) || 1
  return price ? Number(price.unit_price) / perOrder : 0
}

function InventoryScreen({ records, setRecords, setSchedules, onToast, onClose }: { records: InventoryRecord[]; setRecords: SetRecords; setSchedules: (update: (current: ScheduleItem[]) => ScheduleItem[]) => void; onToast: (message: string) => void; onClose: () => void }) {
  const live = useLive()
  const { data } = live
  const store = data.session.storeId
  const [mode, setMode] = useState<'in' | 'waste'>('in')
  const [ingredientId, setIngredientId] = useState(String(data.ingredients[0]?.ingredient_id || ''))
  const ingredient = data.ingredients.find(i => i.ingredient_id === ingredientId)
  const [qty, setQty] = useState('')
  const [useBy, setUseBy] = useState(addDays(data.date, Number(data.ingredients[0]?.shelf_life_days) || 1))
  const [toSchedule, setToSchedule] = useState(true)
  const [reason, setReason] = useState(wasteReasons[0])
  const [detail, setDetail] = useState('')
  const [amount, setAmount] = useState('')
  const [filter, setFilter] = useState<'all' | 'in' | 'waste'>('all')
  const unit = mode === 'in' ? String(ingredient?.order_unit || '') : String(ingredient?.use_unit || '')
  const estimate = mode === 'waste' && qty ? Math.round(unitPrice(data, ingredient) * Number(qty)) : 0
  const mine = records.filter(r => r.store_id === store).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const today = mine.filter(r => r.date === data.date)
  const canSave = !!ingredient && Number(qty) > 0 && (mode === 'in' ? !!useBy : !!detail.trim())

  function pickIngredient(id: string) {
    setIngredientId(id)
    const next = data.ingredients.find(i => i.ingredient_id === id)
    setUseBy(addDays(data.date, Number(next?.shelf_life_days) || 1))
  }
  function save() {
    if (!ingredient || !canSave) return
    const record: InventoryRecord = { id: crypto.randomUUID(), store_id: store, type: mode, date: data.date, ingredient_id: ingredientId, item: String(ingredient.ingredient_name), qty: Number(qty), unit, createdAt: new Date().toISOString(),
      ...(mode === 'in' ? { useBy } : { reason, detail: detail.trim(), amount: amount === '' ? estimate : Number(amount) }) }
    setRecords(current => [record, ...current])
    if (mode === 'in' && toSchedule) setSchedules(current => [...current, { id: crypto.randomUUID(), store_id: store, date: useBy, time: '09:00', title: `${record.item} 사용기한`, category: '체크', detail: `${data.date} 입고 ${record.qty}${record.unit}` }])
    onToast(mode === 'in' ? `${record.item} 입고를 기록했어요` : `${record.item} 폐기를 기록했어요`)
    setQty(''); setDetail(''); setAmount('')
  }

  return (
    <div className="checklist-screen" role="dialog" aria-label="재고 관리">
      <header className="checklist-screen-header">
        <button type="button" onClick={onClose} aria-label="뒤로"><Icon name="chevron" size={20} /></button>
        <div><h2>재고 관리</h2><p>오늘 입고 {today.filter(r => r.type === 'in').length}건 · 폐기 {today.filter(r => r.type === 'waste').length}건</p></div>
        <span />
      </header>
      <div className="checklist-screen-body">
        <div className="report-tabs inventory-mode" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'active' : ''} onClick={() => setMode('in')}>입고</button>
          <button type="button" role="tab" aria-selected={mode === 'waste'} className={mode === 'waste' ? 'active waste' : ''} onClick={() => setMode('waste')}>폐기</button>
        </div>
        <div className="inventory-form">
          <label><span>품목</span><select value={ingredientId} onChange={(event) => pickIngredient(event.target.value)}>{data.ingredients.map(i => <option key={i.ingredient_id} value={i.ingredient_id}>{i.ingredient_name} · {i.storage}</option>)}</select></label>
          <label><span>수량</span><div className="inventory-qty"><input inputMode="numeric" value={qty} onChange={(event) => setQty(event.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /><em>{unit}</em></div></label>
          {mode === 'in' ? <>
            <label><span>사용기한</span><input type="date" value={useBy} onChange={(event) => setUseBy(event.target.value)} /></label>
            <p className="inventory-hint">보관 기준 {ingredient?.shelf_life_days ?? '-'}일로 자동 입력했어요. 실제 라벨과 다르면 고쳐 주세요.</p>
            <label className="inventory-check"><input type="checkbox" checked={toSchedule} onChange={(event) => setToSchedule(event.target.checked)} /> 사용기한을 일정에 추가</label>
          </> : <>
            <div className="inventory-reasons"><span>폐기 사유</span><div>{wasteReasons.map(item => <button key={item} type="button" className={reason === item ? 'active' : ''} onClick={() => setReason(item)}>{item}</button>)}</div></div>
            <label><span>사유 작성</span><textarea rows={3} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="예: 마감 후 냉장고 문이 열려 있어 온도가 올라갔어요." /></label>
            <label><span>폐기 금액 (원)</span><input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))} placeholder={estimate ? `${estimate.toLocaleString()} (단가 기준 예상)` : '0'} /></label>
            <p className="inventory-hint">사유는 주간 보고서를 쓸 때 자동으로 들어가요.</p>
          </>}
          <button type="button" className={`inventory-save ${mode}`} disabled={!canSave} onClick={save}>{mode === 'in' ? '입고 기록하기' : '폐기 기록하기'}</button>
        </div>
        <div className="inventory-history">
          <div className="inventory-history-head"><h3>재고 기록</h3><div>{(['all', 'in', 'waste'] as const).map(key => <button key={key} type="button" className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{key === 'all' ? '전체' : key === 'in' ? '입고' : '폐기'}</button>)}</div></div>
          {mine.filter(r => filter === 'all' || r.type === filter).map(r => (
            <article key={r.id} className={r.type}>
              <div><Badge tone={r.type === 'in' ? 'good' : 'critical'}>{r.type === 'in' ? '입고' : '폐기'}</Badge><b>{r.item}</b><strong>{r.qty}{r.unit}</strong></div>
              <p>{r.type === 'in' ? <>사용기한 {r.useBy}</> : <>{r.reason} · {r.detail}{r.amount ? ` · ${money(r.amount)}` : ''}</>}</p>
              <small>{r.date}<button type="button" onClick={() => { setRecords(current => current.filter(item => item.id !== r.id)); onToast('기록을 삭제했어요') }}>삭제</button></small>
            </article>
          ))}
          {mine.length === 0 && <p className="my-history-empty">아직 입고·폐기 기록이 없어요.</p>}
        </div>
      </div>
    </div>
  )
}

function ScheduleForm({ date, onCancel, onSave }: { date: string; onCancel: () => void; onSave: (item: Pick<ScheduleItem, 'date' | 'time' | 'title' | 'category' | 'detail'>) => void }) {
  const [title, setTitle] = useState('')
  const [scheduleDate, setScheduleDate] = useState(date)
  const [time, setTime] = useState('09:00')
  const [category, setCategory] = useState<ScheduleCategory>('체크')
  const [detail, setDetail] = useState('')
  return (
    <div className="schedule-form">
      <label><span>일정 이름</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: C업체 발주" /></label>
      <div className="schedule-form-row">
        <label><span>날짜</span><input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} /></label>
        <label><span>시간</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
      </div>
      <div className="schedule-categories">{(['발주', '체크', '마감', '기타'] as const).map((value) => <button key={value} type="button" className={category === value ? `active ${scheduleTone[value]}` : ''} onClick={() => setCategory(value)}>{value}</button>)}</div>
      <label><span>메모 (선택)</span><input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="예: 추천 발주 5개 품목" /></label>
      <div className="schedule-form-actions"><button type="button" onClick={onCancel}>취소</button><button type="button" className="primary" disabled={!title.trim() || !time || !scheduleDate} onClick={() => onSave({ date: scheduleDate, time, title: title.trim(), category, detail: detail.trim() })}>일정 저장</button></div>
    </div>
  )
}

function ManagementPage({ onToast, costs, schedules, setSchedules, inventory, setInventory }: { onToast: (message: string) => void; costs: CostItem[]; schedules: ScheduleItem[]; setSchedules: (update: (current: ScheduleItem[]) => ScheduleItem[]) => void; inventory: InventoryRecord[]; setInventory: SetRecords }) {
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const live = useLive()
  const {data} = live
  const checklist = managerRows(data)
  const checks = checklist.map(item => item.done)
  const [month, setMonth] = useState(data.date.slice(0,7))
  useEffect(() => setMonth(data.date.slice(0,7)), [data.date])
  const [year, monthNumber] = month.split('-').map(Number)
  const monthLabel = `${year}년 ${monthNumber}월`
  const first = new Date(`${month}-01T12:00:00Z`)
  const start = addDays(`${month}-01`, -first.getUTCDay())
  const [adding, setAdding] = useState(false)
  const storeSchedules = schedules.filter(item => item.store_id === data.session.storeId)
  const eventsOn = (date: string) => [
    ...storeSchedules.filter(item => item.date === date).sort((a, b) => a.time.localeCompare(b.time)).map(item => ({ title: item.title, tone: scheduleTone[item.category] })),
    ...data.actions.filter(a => a.due_date === date && a.store_id === data.session.storeId).map(a => ({ title: String(a.title), tone: 'red' })),
  ]
  const calendarDays = Array.from({length:42},(_,i) => {const date=addDays(start,i);return {date,day:Number(date.slice(-2)),muted:!date.startsWith(month),today:date===data.date,events:eventsOn(date)}})
  const daySchedules = storeSchedules.filter(item => item.date === data.date).sort((a, b) => a.time.localeCompare(b.time))
  function shiftMonth(delta: number) {const next=new Date(`${month}-01T12:00:00Z`);next.setUTCMonth(next.getUTCMonth()+delta);if(next.getUTCFullYear()>0 && next.getUTCFullYear()<10000)setMonth(next.toISOString().slice(0,7))}

  return (
    <section className="management-page">
      <div className="subpage-heading">
        <div><p>{storeName(data,data.session.storeId)} 운영</p><h1>매장 관리</h1><span>오늘의 업무와 일정을 한 번에 확인하세요.</span></div>
        <button onClick={() => live.open({type:'date'})}><Icon name="calendar" size={17} /> {data.date}</button>
      </div>

      <div className="management-checklist-full">
        <DailyChecklist key={`${data.session.storeId}:${data.date}`} onToast={onToast} />
      </div>

      <button type="button" className="inventory-entry" onClick={() => setInventoryOpen(true)}>
        <span className="phase-entry-icon"><Icon name="package" size={20} /></span>
        <span className="phase-entry-copy"><b>재고 관리</b><small>입고·폐기를 한 번에 기록해요</small></span>
        <span className="inventory-entry-count">입고 {inventory.filter(r => r.store_id === data.session.storeId && r.date === data.date && r.type === 'in').length} · 폐기 {inventory.filter(r => r.store_id === data.session.storeId && r.date === data.date && r.type === 'waste').length}</span>
        <Icon name="chevron" size={16} />
      </button>
      {inventoryOpen && <InventoryScreen records={inventory} setRecords={setInventory} setSchedules={setSchedules} onToast={onToast} onClose={() => setInventoryOpen(false)} />}

      <article className="simple-panel calendar-panel">
        <div className="calendar-heading"><div><h2>{monthNumber}월 일정</h2><p>날짜를 선택해 운영 기록을 확인하세요.</p></div><div><button aria-label="이전 달" onClick={() => shiftMonth(-1)}><Icon name="chevron" size={16} /></button><b>{monthLabel}</b><button aria-label="다음 달" onClick={() => shiftMonth(1)}><Icon name="chevron" size={16} /></button></div></div>
        <div className="calendar-layout">
          <div className="calendar">
            <div className="weekdays">{['일', '월', '화', '수', '목', '금', '토'].map((day) => <b key={day}>{day}</b>)}</div>
            <div className="calendar-grid">
              {calendarDays.map((item, index) => (
                <button key={item.date} aria-label={item.date} aria-pressed={item.today} onClick={() => live.setDate(item.date)} className={`${item.muted ? 'muted' : ''} ${item.today ? 'today' : ''}`}>
                  <span>{item.day}</span>
                  {item.events[0] && <small className={item.events[0].tone}>{item.events[0].title}</small>}
                  {item.events.length > 1 && <em className="more-events">+{item.events.length - 1}</em>}
                </button>
              ))}
            </div>
          </div>
          <aside className="schedule-list">
            <div className="schedule-date"><b>{Number(data.date.slice(-2))}</b><span>{dayLabel(data.date).split('년 ')[1]}<small>점검 {checks.filter(Boolean).length}/{checks.length} 완료</small></span></div>
            {daySchedules.map(item => <div key={item.id} className={`schedule-item ${scheduleTone[item.category]}`}><i /><span><small>{item.time} · {item.category}</small><b>{item.title}</b>{item.detail && <p>{item.detail}</p>}</span><button type="button" className="schedule-delete" aria-label={`${item.title} 삭제`} onClick={() => { setSchedules(current => current.filter(schedule => schedule.id !== item.id)); onToast('일정을 삭제했어요') }}><Icon name="close" size={13} /></button></div>)}
            {['오픈','중간','마감'].map(block => {const group=checklist.filter(c => c.time_block.includes(block));return <div className="schedule-item" key={block}><i/><span><small>{group[0]?.fixed_time || '시간 미정'} · 체크</small><b>{block} 운영 체크</b><p>{group.filter(c => c.done).length}/{group.length}개 완료</p></span></div>})}
            {adding
              ? <ScheduleForm date={data.date} onCancel={() => setAdding(false)} onSave={(item) => { setSchedules(current => [...current, { ...item, id: crypto.randomUUID(), store_id: data.session.storeId }]); setAdding(false); onToast(`${item.date} ${item.time} 일정을 추가했어요`); if (item.date !== data.date) live.setDate(item.date) }} />
              : <button className="add-schedule" onClick={() => setAdding(true)}>+ 일정 추가</button>}
          </aside>
        </div>
      </article>
    </section>
  )
}

function CostPanel({costs,onToast}: {costs:CostItem[];onToast:(message:string)=>void}) {
  const live=useLive()
  const {data}=live
  const [costType, setCostType] = useState('발주비')
  const [costAmount, setCostAmount] = useState('')
  const [costMemo, setCostMemo] = useState('')

  async function addCost() {
    const amount = Number(costAmount.replaceAll(',', ''))
    if (!amount) {
      onToast('비용 금액을 입력해 주세요')
      return
    }
    const ok = await live.run(() => request('/costs',{method:'POST',body:{id:crypto.randomUUID(),store_id:data.session.storeId,business_date:data.date,category:costType,amount,memo:costMemo || `${costType} 지출`}}),'비용 내역이 저장됐어요')
    if (!ok) return
    setCostAmount('')
    setCostMemo('')
  }

  const monthlyCost = costs.reduce((total,item) => total+item.amount,0)

  return (
<article className="simple-panel cost-panel">
        <div className="cost-heading">
          <div><span className="panel-title-icon amber"><Icon name="package" size={18} /></span><div><h2>비용 관리</h2><p>발주와 매장 운영에 사용한 비용을 기록하세요.</p></div></div>
          <div className="cost-total"><small>{Number(data.date.slice(5,7))}월 등록 비용</small><strong>{monthlyCost.toLocaleString()}원</strong><span>{costs.length}건 등록 · 예산 미설정</span></div>
        </div>
        <div className="budget-progress"><i style={{ width: `${0}%` }} /></div>
        <div className="cost-content">
          <div className="cost-form">
            <h3>새 비용 입력</h3>
            <label>비용 항목</label>
            <div className="cost-types">
              {['발주비', '재료비', '인건비', '기타'].map((type) => <button key={type} className={costType === type ? 'active' : ''} onClick={() => setCostType(type)}>{type}</button>)}
            </div>
            <div className="cost-input-row">
              <label><span>금액</span><div><input inputMode="numeric" value={costAmount} onChange={(event) => setCostAmount(event.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /><b>원</b></div></label>
              <label><span>내용</span><input value={costMemo} onChange={(event) => setCostMemo(event.target.value)} placeholder="예: 식자재 정기 발주" /></label>
            </div>
            <button className="cost-submit" disabled={live.busy} onClick={addCost}>비용 저장하기</button>
          </div>
          <div className="cost-history">
            <div><h3>최근 지출 내역</h3><button onClick={() => downloadCsv('지출내역.csv',costs)}>전체 보기 <Icon name="chevron" size={14} /></button></div>
            {costs.slice(0, 4).map((cost, index) => (
              <div className="cost-row" key={`${cost.date}-${index}`}>
                <span className={`cost-category cost-category-${cost.type}`}>{cost.type}</span>
                <p><b>{cost.memo}</b><small>{cost.date}</small></p>
                <strong>-{cost.amount.toLocaleString()}원</strong>
              </div>
            ))}
          </div>
        </div>
      </article>
  )
}

type SentItem = { id: string; title: string; sentAt: string; summary: string; urgency?: IssueItem['urgency'] }

function SentHistoryItem({ item, badge, onSave, onDelete }: { item: SentItem; badge: ReactNode; onSave: (patch: Partial<SentItem>) => Promise<boolean>; onDelete: () => Promise<boolean> }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view')
  const [title, setTitle] = useState(item.title)
  const [summary, setSummary] = useState(item.summary)
  const [urgency, setUrgency] = useState(item.urgency)

  function startEdit() {
    setTitle(item.title)
    setSummary(item.summary)
    setUrgency(item.urgency)
    setMode('edit')
  }

  if (mode === 'edit') {
    return (
      <article className="editing">
        <label><span>제목</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label><span>내용</span><textarea rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
        {urgency && <div className="history-urgency">{(['일반', '긴급'] as const).map((level) => <button key={level} type="button" className={urgency === level ? 'active' : ''} onClick={() => setUrgency(level)}>{level}</button>)}</div>}
        <div className="history-actions"><button onClick={() => setMode('view')}>취소</button><button className="primary" disabled={!title.trim()} onClick={async () => {if(await onSave({ title:title.trim(),summary:summary.trim(),urgency }))setMode('view')}}>저장</button></div>
      </article>
    )
  }

  return (
    <article>
      <div><b>{item.title}</b>{badge}</div>
      <small>{item.sentAt}</small>
      <p>{item.summary}</p>
      {mode === 'delete'
        ? <div className="history-actions confirm"><span>삭제하면 SV 화면에서도 사라져요.</span><button onClick={() => setMode('view')}>취소</button><button className="danger" onClick={() => void onDelete()}>삭제</button></div>
        : <div className="history-actions"><button onClick={startEdit}>수정</button><button onClick={() => setMode('delete')}>삭제</button></div>}
    </article>
  )
}

type WeeklyFigures = { selfScore?: number | null; selfMax?: number | null; waste?: number | null; taskRate?: number | null; wasteRate?: number | null }

// 가져온 주간 보고서(R14)와 같은 양식: 자가 점검 · 폐기 금액 · 업무 이행률 · 폐기율
function WeeklyFiguresGrid({ figures }: { figures: WeeklyFigures }) {
  const has = (value: number | null | undefined) => value !== null && value !== undefined && Number.isFinite(Number(value))
  return (
    <div className="report-auto-summary">
      <span><b>자가 점검</b><strong>{has(figures.selfScore) && has(figures.selfMax) ? `${figures.selfScore}/${figures.selfMax}점` : '기록 없음'}</strong></span>
      <span><b>폐기 금액</b><strong>{has(figures.waste) ? money(Number(figures.waste)) : '기록 없음'}</strong></span>
      <span><b>업무 이행률</b><strong>{has(figures.taskRate) ? `${Number(figures.taskRate).toFixed(1)}%` : '기록 없음'}</strong></span>
      <span><b>폐기율</b><strong>{has(figures.wasteRate) ? `${Number(figures.wasteRate).toFixed(2)}%` : '기록 없음'}</strong></span>
    </div>
  )
}

type WeeklyIssue = { title: string; kind: string; severity: string; state: 'done' | 'doing' | 'open' | 'other'; status: string; date: string; request: string; doneAt: string }
type WeeklyWaste = { date: string; item: string; qty: number; unit: string; reason: string; detail: string; amount: number }
type WeeklySnapshot = { start: string; end: string; previousSales: number; issues: WeeklyIssue[]; sales: { date: string; amount: number }[]; costs: { date: string; amount: number }[]; waste?: WeeklyWaste[]; task?: { done: number; total: number }; wasteAmount?: number }

const issueKindLabel: Record<string, string> = { temperature: '온도', acid: '산가', expiry: '소비기한', finding: '점검 지적', manual: '점장 보고' }
// 조치 중 구분 없이 완료가 아니면 미조치로 봅니다.
const issueStateLabel: Record<WeeklyIssue['state'], string> = { done: '조치 완료', doing: '미조치', open: '미조치', other: '기록' }

// 이번 주(주 시작일~기준일) 매장 이슈와 조치, 일별 매출·비용을 모아 보고서에 담습니다.
function buildWeekly(data: Snapshot, storeId: string, inventory: InventoryRecord[] = []): WeeklySnapshot {
  const start = data.weekStart, end = data.date
  const days: string[] = []
  for (let day = start; day <= end && days.length < 14; day = addDays(day, 1)) days.push(day)
  const issues = data.issues.filter(i => i.store_id === storeId && i.business_date >= start && i.business_date <= end).map(issue => {
    const request = latestEvent(data, issue, 'assign')
    const done = latestEvent(data, issue, 'request_verification')
    const state: WeeklyIssue['state'] = ['awaiting_verification', 'closed'].includes(issue.status) ? 'done' : ['assigned', 'in_progress'].includes(issue.status) ? 'doing' : issue.status === 'open' ? 'open' : 'other'
    return { title: issue.title, kind: issue.kind, severity: issue.severity, state, status: statusLabels[issue.status] || issue.status, date: issue.business_date, request: String(request?.note || ''), doneAt: String(done?.created_at || '') }
  })
  return {
    start, end,
    previousSales: data.metrics.find(m => m.store_id === storeId)?.previousSales || 0,
    issues,
    sales: days.map(date => ({ date, amount: data.sales.filter(r => r.store_id === storeId && r.date === date).reduce((n, r) => n + Number(r.sales_amount), 0) })),
    costs: days.map(date => ({ date, amount: data.costs.filter(c => c.store_id === storeId && c.business_date === date).reduce((n, c) => n + Number(c.amount), 0) })),
    waste: inventory.filter(r => r.store_id === storeId && r.type === 'waste' && r.date >= start && r.date <= end).map(r => ({ date: r.date, item: r.item, qty: r.qty, unit: r.unit, reason: r.reason || '기타', detail: r.detail || '', amount: r.amount || 0 })),
    // 업무 이행률: 관리자 일일 체크리스트(T03) 완료 항목 비율
    task: (() => { const statuses = managerStatuses(data); const items = managerItems(data); return { done: items.filter(item => statuses[item.id]).length, total: items.length } })(),
  }
}

function weeklyForReport(data: Snapshot, report: Row): WeeklySnapshot {
  if (report.metrics?.weekly) return report.metrics.weekly as WeeklySnapshot
  const start = String(report.week_start || report.business_date)
  const end = addDays(start, 6) < data.date ? addDays(start, 6) : data.date
  const days: string[] = []
  for (let day = start; day <= end && days.length < 7; day = addDays(day, 1)) days.push(day)
  const store = report.store_id
  const taskRate = Number(report.metrics?.taskRate)
  return {
    start, end, previousSales: 0,
    issues: data.issues.filter(i => i.store_id === store && i.business_date >= start && i.business_date <= end).map(issue => ({ title: issue.title, kind: issue.kind, severity: issue.severity, state: ['awaiting_verification', 'closed', 'legacy_complete'].includes(issue.status) ? 'done' as const : 'open' as const, status: statusLabels[issue.status] || issue.status, date: issue.business_date, request: String(latestEvent(data, issue, 'assign')?.note || ''), doneAt: String(latestEvent(data, issue, 'request_verification')?.created_at || '') })),
    sales: days.map(date => ({ date, amount: data.sales.filter(r => r.store_id === store && r.date === date).reduce((n, r) => n + Number(r.sales_amount), 0) })),
    costs: days.map(date => ({ date, amount: data.costs.filter(c => c.store_id === store && c.business_date === date).reduce((n, c) => n + Number(c.amount), 0) })),
    waste: [],
    task: Number.isFinite(taskRate) ? { done: Math.round(taskRate * 10) / 10, total: 100 } : undefined,
    wasteAmount: Number(report.metrics?.waste) || 0,
  }
}

function WeeklyReportBody({ figures, weekly }: { figures: WeeklyFigures; weekly?: WeeklySnapshot | null }) {
  // 이 양식 이전에 보낸 보고서·가져온 주간 보고서는 원래 지표만 보여줍니다.
  if (!weekly) return <WeeklyFiguresGrid figures={figures} />
  const salesTotal = weekly.sales.reduce((n, r) => n + r.amount, 0)
  const costTotal = weekly.costs.reduce((n, r) => n + r.amount, 0)
  const waste = weekly.waste || []
  const wasteTotal = waste.length ? waste.reduce((n, w) => n + w.amount, 0) : weekly.wasteAmount || 0
  const taskRate = weekly.task && weekly.task.total ? weekly.task.done / weekly.task.total * 100 : null
  const highest = Math.max(1, ...weekly.sales.map(r => r.amount), ...weekly.costs.map(r => r.amount))
  const count = (state: WeeklyIssue['state']) => weekly.issues.filter(i => i.state === state).length
  const ordered = [...weekly.issues].sort((a, b) => (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1) || b.date.localeCompare(a.date))
  return (
    <div className="weekly-body">
      <div className="weekly-task"><span>업무 이행률</span><b>{taskRate === null ? '기록 없음' : `${taskRate.toFixed(1)}%`}</b><small>{weekly.task?.total === 100 ? '가져온 주간 보고서 기준' : `관리자 체크리스트 ${weekly.task ? `${weekly.task.done}/${weekly.task.total}` : ''} · ${weekly.end} 기준`}</small><i><em style={{ width: `${taskRate ?? 0}%` }} /></i></div>
      <section className="weekly-block">
        <div className="weekly-block-title"><h4>이번 주 이슈와 조치</h4><small>{weekly.start} ~ {weekly.end}</small></div>
        <div className="weekly-counts three"><span><b>{weekly.issues.length}</b>발생</span><span className="done"><b>{count('done')}</b>조치 완료</span><span className="open"><b>{weekly.issues.length - count('done')}</b>미조치</span></div>
        <div className="weekly-issues">
          {ordered.map((issue, index) => (
            <div key={index} className={issue.state === 'done' ? 'done' : 'open'}>
              <div><Badge tone={issue.severity === 'critical' ? 'critical' : 'warning'}>{issue.severity === 'critical' ? '긴급' : '일반'}</Badge><small>{issueKindLabel[issue.kind] || '이슈'} · {shortDate(issue.date)}</small><em>{issueStateLabel[issue.state]}</em></div>
              <b>{issue.title}</b>
              {(issue.request || issue.doneAt) && <p>{issue.request && <>조치 요청: {issue.request}</>}{issue.request && issue.doneAt && ' · '}{issue.doneAt && <>완료 {new Date(issue.doneAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</>}</p>}
            </div>
          ))}
          {ordered.length === 0 && <p className="my-history-empty">이번 주에 발생한 이슈가 없어요.</p>}
        </div>
      </section>
      <section className="weekly-block">
        <div className="weekly-block-title"><h4>매출 · 비용</h4><small>{weekly.start} ~ {weekly.end}</small></div>
        <div className="weekly-chart" role="img" aria-label="일별 매출과 비용 막대그래프">
          {weekly.sales.map((row, index) => (
            <div key={row.date}><span className="bars"><i className="sales" style={{ height: `${row.amount / highest * 100}%` }} title={`매출 ${money(row.amount)}`} /><i className="cost" style={{ height: `${(weekly.costs[index]?.amount || 0) / highest * 100}%` }} title={`비용 ${money(weekly.costs[index]?.amount || 0)}`} /></span><small>{shortDate(row.date)}</small></div>
          ))}
        </div>
        <div className="weekly-legend"><span><i className="sales" /> 매출</span><span><i className="cost" /> 비용</span></div>
        <div className="weekly-money">
          <span><small>매출 합계</small><b>{money(salesTotal)}</b>{weekly.previousSales > 0 && <em className={salesTotal >= weekly.previousSales ? 'up' : 'down'}>지난주 같은 기간 대비 {((salesTotal / weekly.previousSales - 1) * 100).toFixed(1)}%</em>}</span>
          <span><small>비용 합계</small><b>{money(costTotal)}</b><em>매출 대비 {salesTotal ? (costTotal / salesTotal * 100).toFixed(1) : '0.0'}%</em></span>
          <span className="waste"><small>폐기 금액</small><b>{money(wasteTotal)}</b><em>{waste.length ? `재고 관리 폐기 ${waste.length}건` : weekly.wasteAmount ? '가져온 폐기 기록' : '폐기 기록 없음'}</em></span>
          <span className="waste"><small>폐기율</small><b>{salesTotal ? `${(wasteTotal / salesTotal * 100).toFixed(2)}%` : '—'}</b><em>폐기 금액 ÷ 매출</em></span>
        </div>
        <div className="weekly-waste">
          <h5>폐기 사유</h5>
          {waste.map((w, index) => <div key={index}><div><Badge tone="critical">{w.reason}</Badge><b>{w.item} {w.qty}{w.unit}</b><small>{shortDate(w.date)}</small></div><p>{w.detail}</p></div>)}
          {waste.length === 0 && <p className="my-history-empty">{weekly.wasteAmount ? '폐기 사유는 재고 관리로 기록한 보고서부터 표시돼요.' : '이번 주 기록된 폐기가 없어요.'}</p>}
        </div>
      </section>
    </div>
  )
}

function ReportFeedbackList({ ackedReplies, onAck }: { ackedReplies: string[]; onAck: (key: string) => void }) {
  const live = useLive()
  const { data } = live
  // SV가 답변한 보고서만 보여줍니다.
  const shown = data.reports.filter(r => !r.read_only && r.store_id === data.session.storeId && r.reply).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  return (
    <section className="feedback-view">
      <div className="feedback-list">
        {shown.map(report => {
          const key = `${report.id}:${report.reply}`
          const fresh = report.reply && !ackedReplies.includes(key)
          return (
            <article key={report.id} className="replied">
              <div className="feedback-top"><Badge tone={fresh ? 'info' : 'good'}>{fresh ? '새 피드백' : '답변 확인함'}</Badge><small>{new Date(report.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 보냄</small></div>
              <h3>{report.title}</h3>
              <p>{report.summary}</p>
              <WeeklyReportBody figures={report.metrics || {}} weekly={weeklyForReport(data, report)} />
              <div className="feedback-reply"><span className="step-label">SV 피드백</span><p>{report.reply}</p>{fresh && <button type="button" onClick={() => onAck(key)}>확인했어요 <Icon name="arrow" size={13} /></button>}</div>
            </article>
          )
        })}
        {shown.length === 0 && <p className="my-history-empty">아직 받은 피드백이 없어요.</p>}
      </div>
    </section>
  )
}

// 리뷰 수집·AI 요약이 연결되기 전까지 쓰는 예시 내용입니다(원래 Figma 디자인 문구).
const reviewInsight = {
  summary: '전체 평점은 안정적이지만, 점심 시간대 대기 시간 관련 불만이 5건으로 늘었어요. 반면 직원 친절도에 대한 긍정 리뷰는 지난주보다 18% 증가했습니다.',
  keywords: ['대기 시간 5건', '직원 친절 8건', '메뉴 누락 2건'],
  actions: [
    { title: '점심 피크(12~14시) 인력 1명 보강', reason: '대기 시간 불만 5건이 모두 점심 시간대에 몰려 있어요.' },
    { title: '포장 전 메뉴 구성 재확인', reason: '메뉴 누락 리뷰 2건 · 포장 테이블에서 주문서와 한 번 더 대조해 주세요.' },
    { title: '친절 응대 사례 팀 공유', reason: '친절 칭찬 리뷰 8건 · 오전 조회 때 공유하면 좋아요.' },
  ],
}

function ReportPage({ costs, onToast, tab, setTab, ackedReplies, onAck, inventory }: { costs: CostItem[]; onToast: (message: string) => void; tab: 'write' | 'feedback'; setTab: (tab: 'write' | 'feedback') => void; ackedReplies: string[]; onAck: (key: string) => void; inventory: InventoryRecord[] }) {
  const live = useLive()
  const {data} = live
  const metric = data.metrics.find(m => m.store_id === data.session.storeId)!
  const dailySales = data.sales.filter(r => r.store_id === data.session.storeId).slice(-12)
  const maxSales = Math.max(1,...dailySales.map(r => Number(r.sales_amount)))
  const todaySale = dailySales.find(r => r.date === data.date)
  const checks = dayChecks(data)
  const [category,setCategory] = useState('장비')
  const [urgency,setUrgency] = useState('긴급')
  const [compose, setCompose] = useState<'report' | 'issue' | null>(null)
  const [history,setHistory]=useState<'report'|'issue'|null>(null)
  const myReports=data.reports.filter(r=>!r.read_only && r.store_id===data.session.storeId).map(r=>({id:r.id,title:r.title,summary:r.summary,sentAt:r.business_date,unread:!r.reply}))
  const myIssues=data.issues.filter(i=>i.kind==='manual' && i.store_id===data.session.storeId).map(i=>({id:i.id,title:i.title,summary:i.description,sentAt:i.business_date,urgency:i.severity==='critical'?'긴급' as const:'일반' as const}))
  const [reportTitle, setReportTitle] = useState(`${data.weekStart} ${storeName(data,data.session.storeId)} 주간 운영 보고`)
  const [reportMemo, setReportMemo] = useState('')
  const weekly = buildWeekly(data, data.session.storeId, inventory)
  const [issueTitle, setIssueTitle] = useState('')
  const [issueMemo, setIssueMemo] = useState('')
  const categoryTotal = (type: string) => costs.filter((cost) => cost.type === type).reduce((sum, cost) => sum + cost.amount, 0)
  const totalCost = costs.reduce((sum,cost) => sum+cost.amount,0)
  let accumulated = 0
  const donut = ['발주비','재료비','인건비','기타'].map((type,index) => {const start=accumulated;accumulated += totalCost ? categoryTotal(type)/totalCost*100 : 0;return `${['#0a6936','#4aa181','#8a6bd0','#d5a14a'][index]} ${start}% ${accumulated}%`}).join(',')

  async function sendReport() {
    const ok = await live.run(() => request('/reports',{method:'POST',body:{id:crypto.randomUUID(),store_id:data.session.storeId,business_date:data.date,title:reportTitle,summary:reportMemo.trim(),weekly}}),'주간 보고서를 보냈어요')
    if (!ok) return
    setCompose(null)
  }

  async function sendIssue() {
    if (!issueTitle.trim()) {
      onToast('이슈 제목을 입력해 주세요')
      return
    }
    const ok = await live.run(() => request('/actions',{method:'POST',body:{id:crypto.randomUUID(),store_id:data.session.storeId,business_date:data.date,title:issueTitle,note:issueMemo,category,severity:urgency === '긴급' ? 'critical' : 'warning'}}),'운영 이슈를 전달했어요')
    if (!ok) return
    setCompose(null)
    setIssueTitle('')
    setIssueMemo('')
  }

  return (
    <section className="management-page report-page">
      <div className="subpage-heading"><div><p>{storeName(data,data.session.storeId)} 운영 데이터</p><h1>보고</h1><span>매출과 비용, 고객 리뷰를 확인하고 필요한 내용을 SV에게 전달하세요.</span></div></div>
      <div className="report-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'write'} className={tab === 'write' ? 'active' : ''} onClick={() => setTab('write')}>보고서 작성</button>
        <button type="button" role="tab" aria-selected={tab === 'feedback'} className={tab === 'feedback' ? 'active' : ''} onClick={() => setTab('feedback')}>피드백{data.reports.filter(r => !r.read_only && r.store_id === data.session.storeId && r.reply && !ackedReplies.includes(`${r.id}:${r.reply}`)).length > 0 && <i>{data.reports.filter(r => !r.read_only && r.store_id === data.session.storeId && r.reply && !ackedReplies.includes(`${r.id}:${r.reply}`)).length}</i>}</button>
      </div>
      {tab === 'feedback' ? <ReportFeedbackList ackedReplies={ackedReplies} onAck={onAck} /> : <>
      <div className="compose-options">
        <article><span className="compose-icon report"><Icon name="report" size={20} /></span><div><b>주간 보고서 작성</b><p>한 주의 매출·비용·리뷰를 정리해서 보내요.</p></div><span className="compose-actions"><button className="primary" onClick={() => setCompose('report')}>작성하기 <Icon name="chevron" size={14} /></button><button onClick={() => setHistory('report')}>내 보고서 보기 <em>{myReports.length}</em></button></span></article>
        <article><span className="compose-icon issue"><Icon name="alert" size={20} /></span><div><b>운영 이슈 작성</b><p>긴급하거나 도움이 필요한 문제를 바로 전달해요.</p></div><span className="compose-actions"><button className="primary" onClick={() => setCompose('issue')}>작성하기 <Icon name="chevron" size={14} /></button><button onClick={() => setHistory('issue')}>내 이슈 보기 <em>{myIssues.length}</em></button></span></article>
      </div>
      <div className="report-overview-grid">
        <article className="simple-panel sales-panel report-sales-panel">
          <div className="simple-panel-title"><div><span className="panel-title-icon violet"><Icon name="chart" size={18} /></span><div><h2>매출 현황</h2><p>{dayLabel(data.date)} · 일별 집계</p></div></div><Badge tone="good">기록 기준</Badge></div>
          <div className="sales-total"><span><small>현재 매출</small><strong>{todaySale ? money(Number(todaySale.sales_amount)) : '기록 없음'}</strong></span><span><small>주간 누적</small><b>{metric.hasSales ? money(metric.sales) : '기록 없음'}</b></span></div>
          <div className="sales-chart">{dailySales.map(row => <i key={row.date} title={`${row.date}: ${money(Number(row.sales_amount))}`} style={{height:`${Number(row.sales_amount)/maxSales*100}%`}} className={row.date === data.date ? 'peak' : ''} />)}</div>
          <div className="sales-labels"><span>{shortDate(dailySales[0]?.date || '')}</span><span>일별 매출</span><span>{shortDate(data.date)}</span></div>
          <div className="sales-meta"><span><small>전주 같은 기간 대비</small><b className="up">{metric.previousSales ? `${((metric.sales/metric.previousSales-1)*100).toFixed(1)}%` : '비교 기록 없음'}</b></span><i /><span><small>객단가</small><b>—</b></span><i /><span><small>주문</small><b>—</b></span></div>
        </article>
        <article className="simple-panel cost-breakdown-panel">
          <div className="simple-panel-title"><div><span className="panel-title-icon amber"><Icon name="package" size={18} /></span><div><h2>비용 구성</h2><p>점장 입력 비용 기준</p></div></div><strong>{costs.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}원</strong></div>
          <div className="cost-donut" style={{background:totalCost ? `conic-gradient(${donut})` : '#ecf0ee'}}><div><span>{costs.length}</span><small>입력 건수</small></div></div>
          <div className="cost-legend">
            {['발주비', '재료비', '인건비', '기타'].map((type, index) => <div key={type}><i className={`tone-${index}`} /><span>{type}</span><b>{categoryTotal(type).toLocaleString()}원</b></div>)}
          </div>
          <div className="cost-ai-note"><Icon name="sparkle" size={14} /><p><b>AI 비용 분석</b><span>AI 비용 분석은 준비 중입니다.</span></p></div>
        </article>
      </div>
      <CostPanel costs={costs} onToast={onToast} />
      <div className="report-review-heading"><div><h2>리뷰 확인</h2><p>최근 7일 고객 반응 요약과 추천 조치</p></div><Badge tone="neutral">예시</Badge></div>
      <article className="review-summary-card">
        <div className="review-summary-top"><span><Icon name="sparkle" size={18} /></span><div><Badge tone="info">AI 요약</Badge><h2>이번 주 리뷰 핵심</h2></div></div>
        <p>{reviewInsight.summary}</p>
        <div className="review-keywords">{reviewInsight.keywords.map(keyword => <span key={keyword}>{keyword}</span>)}</div>
        <div className="review-actions">
          <h3>추천 조치</h3>
          {reviewInsight.actions.map((action, index) => <div key={action.title}><b>{index + 1}</b><p><strong>{action.title}</strong><span>{action.reason}</span></p></div>)}
        </div>
        <small className="review-sample-note">리뷰 수집이 연결되기 전까지 예시 내용이 표시돼요.</small>
      </article>
      </>}
      {history && <div className="report-modal-backdrop" onClick={() => setHistory(null)}>
        <div className="report-modal" onClick={(event) => event.stopPropagation()}>
          <div className="report-modal-heading"><div><Badge tone={history === 'report' ? 'info' : 'critical'}>보낸 내역</Badge><h2>{history === 'report' ? '내가 쓴 주간 보고서' : '내가 쓴 운영 이슈'}</h2><p>SV에게 전달한 {history === 'report' ? '보고서' : '이슈'}를 최신순으로 보여줘요.</p></div><button onClick={() => setHistory(null)} aria-label="닫기"><Icon name="close" size={18} /></button></div>
          <div className="my-history-list">
            {(history === 'report' ? myReports : myIssues).length === 0 && <p className="my-history-empty">아직 보낸 {history === 'report' ? '보고서' : '이슈'}가 없어요.</p>}
            {history === 'report'
              ? myReports.map((report) => <SentHistoryItem key={report.id} item={report} badge={<Badge tone={report.unread ? 'neutral' : 'good'}>{report.unread ? 'SV 확인 전' : 'SV 확인함'}</Badge>}
                  onSave={(patch) => live.run(()=>request(`/reports/${report.id}`,{method:'PATCH',body:{operation:'edit',title:patch.title,summary:patch.summary}}),'보고서를 수정했어요')}
                  onDelete={() => live.run(()=>request(`/reports/${report.id}`,{method:'PATCH',body:{operation:'delete'}}),'보고서를 삭제했어요')} />)
              : myIssues.map((issue) => <SentHistoryItem key={issue.id} item={issue} badge={<Badge tone={issue.urgency === '긴급' ? 'critical' : 'warning'}>{issue.urgency}</Badge>}
                  onSave={(patch) => live.run(()=>request(`/actions/${issue.id}`,{method:'PATCH',body:{operation:'edit',title:patch.title,note:patch.summary,severity:patch.urgency==='긴급'?'critical':'warning'}}),'이슈를 수정했어요')}
                  onDelete={() => live.run(()=>request(`/actions/${issue.id}`,{method:'PATCH',body:{operation:'delete'}}),'이슈를 삭제했어요')} />)}
          </div>
          <div className="report-modal-actions"><button onClick={() => setHistory(null)}>닫기</button><button onClick={() => { setCompose(history); setHistory(null) }}><Icon name="send" size={15} /> 새로 작성하기</button></div>
        </div>
      </div>}

      {compose === 'report' && <div className="report-modal-backdrop">
        <div className="report-modal">
          <div className="report-modal-heading"><div><Badge tone="info"><Icon name="sparkle" size={11} /> 운영 기록</Badge><h2>주간 보고서 작성</h2><p>운영 기록을 확인하고 요약을 작성해 주세요.</p></div><button onClick={() => setCompose(null)}><Icon name="close" size={18} /></button></div>
          <div className="report-form">
            <label><span>보고서 제목</span><input value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} /></label>
            <label><span>운영 요약</span><textarea rows={3} value={reportMemo} onChange={(event) => setReportMemo(event.target.value)} placeholder="예: 코칭 내용 공유 후 마감 체크가 안정됐습니다." /></label>
            <div className="report-preview"><span>SV에게 이렇게 보여요</span><h3>{reportTitle || '보고서 제목'}</h3><p>{reportMemo.trim() || '운영 요약'}</p><WeeklyReportBody figures={{}} weekly={weekly} /></div>
          </div>
          <div className="report-modal-actions"><button onClick={() => setCompose(null)}>취소</button><button disabled={live.busy || !reportTitle.trim() || !reportMemo.trim()} onClick={sendReport}><Icon name="send" size={15} /> 주간 보고서 SV에게 보내기</button></div>
        </div>
      </div>}
      {compose === 'issue' && <div className="report-modal-backdrop">
        <div className="report-modal issue-compose-modal">
          <div className="report-modal-heading"><div><Badge tone="critical">SV 확인 요청</Badge><h2>운영 이슈 작성</h2><p>매장에서 해결하기 어려운 문제를 바로 전달하세요.</p></div><button onClick={() => setCompose(null)}><Icon name="close" size={18} /></button></div>
          <div className="report-form">
            <label><span>이슈 유형</span><div className="issue-type-options">{['장비','인력','재고·발주','고객 응대','기타'].map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></label>
            <label><span>이슈 제목</span><input value={issueTitle} onChange={(event) => setIssueTitle(event.target.value)} placeholder="예: 냉장고 2번 온도 이상" /></label>
            <label><span>상세 내용</span><textarea rows={5} value={issueMemo} onChange={(event) => setIssueMemo(event.target.value)} placeholder="현재 상황과 이미 시도한 조치를 입력해 주세요." /></label>
            <div className="issue-urgency"><span>긴급도</span><div>{['일반','긴급'].map(item => <button key={item} className={urgency === item ? 'active' : ''} onClick={() => setUrgency(item)}>{item}</button>)}</div><p><Icon name="alert" size={13} /> 긴급 이슈는 SV 보고서함 상단에 표시돼요.</p></div>
            <button className="photo-attachment" type="button" disabled>사진 첨부 준비 중</button>
          </div>
          <div className="report-modal-actions"><button onClick={() => setCompose(null)}>취소</button><button className="issue-send" disabled={live.busy} onClick={sendIssue}><Icon name="send" size={15} /> 이슈 SV에게 전달하기</button></div>
        </div>
      </div>}
    </section>
  )
}

function MyPage({ onSwitch, onNotifySettings }: { onSwitch: () => void; onNotifySettings: () => void }) {
  const live = useLive()
  const {data} = live
  return (
    <section className="management-page">
      <div className="subpage-heading"><div><p>계정 및 매장 설정</p><h1>MY PAGE</h1><span>내 정보와 운영 설정을 관리하세요.</span></div></div>
      <article className="profile-card-large"><Avatar text="점" /><div><h2>매장 점장</h2><p>{storeName(data,data.session.storeId)} · 점장</p><span>매장 운영</span></div></article>
      <div className="settings-list">
        <button onClick={() => live.open({type:'settings'})}><span className="panel-title-icon blue"><Icon name="store" size={18} /></span><div><b>매장 정보</b><small>{storeName(data,data.session.storeId)} 기본 정보</small></div><Icon name="chevron" size={17} /></button>
        <button onClick={onNotifySettings}><span className="panel-title-icon violet"><Icon name="bell" size={18} /></span><div><b>알림 설정</b><small>SV 요청·피드백·긴급 이슈 알림 켜기/끄기</small></div><Icon name="chevron" size={17} /></button>
        <button onClick={onSwitch}><span className="panel-title-icon green"><Icon name="board" size={18} /></span><div><b>SV 대시보드 보기</b><small>담당 매장 현황 화면으로 전환</small></div><Icon name="chevron" size={17} /></button>
      </div>
    </section>
  )
}

function ManagerApp({ onSwitch, costs }: { onSwitch: () => void; costs: CostItem[] }) {
  const live = useLive()
  const {data} = live
  const issues = data.issues.filter(i => i.store_id === data.session.storeId && activeIssue(i))
  const checks = managerRows(data)
  const done = checks.filter(c => c.done).length
  const store = data.stores.find(s => s.store_id === data.session.storeId)!
  const weekday = new Date(`${data.date}T12:00:00Z`).toLocaleDateString('ko-KR',{weekday:'short',timeZone:'UTC'})
  const orderingSuppliers = data.suppliers.filter(s => String(s.order_days).split(',').includes(weekday)).sort((a,b) => a.order_cutoff.localeCompare(b.order_cutoff))
  const [active, setActive] = useState('홈')
  const [schedules, setSchedules] = useStoredState<ScheduleItem[]>('runn-schedules-v1', [])
  // 입고·폐기 기록은 서버 테이블이 없어 이 브라우저에 보관하고, 폐기 내역은 주간 보고서에 담겨 SV에게 전달됩니다.
  const [inventory, setInventory] = useStoredState<InventoryRecord[]>('runn-inventory-v1', [])
  const [ackedReplies, setAckedReplies] = useStoredState<string[]>('runn-acked-replies-v1', [])
  const [reportTab, setReportTab] = useState<'write' | 'feedback'>('write')
  const openFeedback = () => { setReportTab('feedback'); setActive('보고') }

  // SV 요청: SV가 배정했거나 보완을 요청해 점장이 처리해야 하는 이슈와, SV가 답변한 보고서입니다.
  const requests = issues.filter(i => ['assigned', 'in_progress'].includes(i.status)).map(issue => ({ issue, event: svRequest(data, issue) })).filter(item => item.event)
  const replies = data.reports.filter(r => !r.read_only && r.store_id === data.session.storeId && r.reply && !ackedReplies.includes(`${r.id}:${r.reply}`))
  const otherIssues = issues.filter(i => !requests.some(item => item.issue.id === i.id))
  const pendingCount = requests.length + replies.length
  const [noticeOpen, setNoticeOpen] = useState(false)
  const goHome = () => { setNoticeOpen(false); setActive('홈') }
  const [managerNotify, setManagerNotify] = useStoredState<Record<string, boolean>>('runn-notify-manager-v1', {})
  const [notifyOpen, setNotifyOpen] = useState(false)
  const allManagerNotices: Notice[] = [
    ...requests.map(({ issue, event }) => ({ key: `req-${event!.id}`, type: 'request', icon: 'send' as IconName, tone: 'red' as const, title: event!.operation === 'reject' ? 'SV가 보완을 요청했어요' : 'SV가 조치를 요청했어요', detail: event!.note || issue.title, at: String(event!.created_at), onOpen: goHome })),
    ...replies.map(report => ({ key: `reply-${report.id}`, type: 'reply', icon: 'report' as IconName, tone: 'blue' as const, title: 'SV가 보고서에 답변했어요', detail: report.reply, at: String(report.updated_at || report.created_at), onOpen: () => { setNoticeOpen(false); openFeedback() } })),
    ...issues.filter(i => i.severity === 'critical' && i.status === 'open').map(i => ({ key: `urgent-${i.id}`, type: 'urgent', icon: 'alert' as IconName, tone: 'amber' as const, title: '긴급 이슈가 있어요', detail: i.title, at: String(i.business_date), onOpen: () => { setNoticeOpen(false); live.open({ type: 'issue', issue: i }) } })),
  ]
  const managerNotices = allManagerNotices.filter(n => managerNotify[n.type] !== false)

  const t03 = managerItems(data)
  const t03Status = managerStatuses(data)
  const phaseDone = (key: ChecklistPhaseKey) => t03.filter(item => phaseOf(item) === key && t03Status[item.id]).length
  const phaseTotal = (key: ChecklistPhaseKey) => t03.filter(item => phaseOf(item) === key).length
  const checkDone = phaseDone('open') + phaseDone('close')
  const checkRate = t03.length ? Math.round(checkDone / t03.length * 100) : 0

  const todayEntries: TodayEntry[] = [
    ...orderingSuppliers.map(supplier => ({ key: `supplier-${supplier.supplier_id}`, time: String(supplier.order_cutoff), label: '발주', title: `${supplier.supplier_name} 발주 마감`, detail: `배송 요일 ${supplier.delivery_days}`, tone: 'urgent', onOpen: () => live.open({type:'order'}) })),
    ...schedules.filter(item => item.store_id === data.session.storeId && item.date === data.date).map(item => ({ key: item.id, time: item.time, label: item.category, title: item.title, detail: item.detail || '캘린더 일정', tone: item.category === '발주' ? 'urgent' : '', onOpen: () => setActive('관리') })),
    ...issues.filter(i => i.due_date === data.date).map(issue => ({ key: `due-${issue.id}`, time: '기한', label: statusLabels[issue.status] || '조치', title: issue.title, detail: '오늘까지 조치 기한', tone: 'urgent', onOpen: () => live.open({type:'issue',issue}) })),
  ].sort((a, b) => (/^\d/.test(a.time) ? a.time : '99').localeCompare(/^\d/.test(b.time) ? b.time : '99'))

  // 점장은 조치 완료 한 번만 누릅니다. 서버 흐름(시작 → 완료 보고)은 여기서 이어서 처리합니다.
  async function completeRequest(issue: Issue) {
    await live.run(async () => {
      const action = issue.action || await request<Row>('/actions', { method: 'POST', body: { source_key: issue.source_key, store_id: issue.store_id, business_date: issue.business_date } })
      let version = action.version
      if (issue.status === 'assigned') {
        await request(`/actions/${action.id}`, { method: 'PATCH', body: { operation: 'start', version } })
        version += 1
      }
      await request(`/actions/${action.id}`, { method: 'PATCH', body: { operation: 'request_verification', version, note: '점장 조치 완료' } })
    }, 'SV에게 조치 완료를 알렸어요')
  }

  return (
    <div className="manager-bg">
      <div className="manager-shell">
        <header className="manager-header">
          <div className="manager-brand"><BrandLogo /><b>CRBU</b></div>
          <div className="manager-tools">
            <button className="role-pill manager-role" onClick={onSwitch}>SV 대시보드</button>
            <button className="icon-button" aria-label="알림" onClick={() => setNoticeOpen(true)}>{managerNotices.length > 0 && <i />}<Icon name="bell" size={20} /></button>
            <Avatar text="점" />
          </div>
        </header>

        <main className="manager-main">
          {active === '홈' ? (
            <>
              <section className="manager-welcome">
                <p>{dayLabel(data.date)} · {store.store_name}</p>
                <h1>좋은 아침이에요, 점장님</h1>
                <span>오늘 꼭 필요한 일만 모아뒀어요.</span>
              </section>

              <section className="today-summary">
                <div><span className="summary-icon red"><Icon name="alert" size={19} /></span><p><b>{pendingCount}</b><small>지금 처리</small></p></div>
                <i />
                <div><span className="summary-icon amber"><Icon name="clock" size={19} /></span><p><b>{todayEntries.length}</b><small>오늘 일정</small></p></div>
                <i />
                <div><span className="summary-icon mint"><Icon name="check" size={19} /></span><p><b>{checkRate}%</b><small>체크 달성</small></p></div>
              </section>

              <section className="manager-section">
                <div className="manager-section-title"><div><h2>지금 처리해 주세요</h2><span className="count-badge">{pendingCount}</span></div><small>SV 요청</small></div>
                <div className="manager-cards">
                  {requests.map(({ issue, event }) => (
                    <article key={issue.id} className="task-card task-critical command-card">
                      <div className="task-top"><span className="task-icon"><Icon name="send" /></span><div><Badge tone="critical">{event!.operation === 'reject' ? 'SV 보완 요청' : 'SV 요청'}</Badge><Badge tone="neutral">진행 중</Badge></div><button aria-label="이슈 상세" onClick={() => live.open({type:'issue',issue})}><Icon name="chevron" size={17} /></button></div>
                      <h3>{event!.note || issue.verification_note || issue.title}</h3>
                      <p>이슈: {issue.title}</p>
                      <div className="evidence-panel"><span><small>요청 시각</small><b>{new Date(event!.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</b></span><i /><span><small>처리 기한</small><b>{issue.due_date || '기한 없음'}</b></span></div>
                      <button className="primary-action complete-action" disabled={live.busy} onClick={() => void completeRequest(issue)}>조치 완료 <Icon name="arrow" size={17} /></button>
                    </article>
                  ))}
                  {replies.map(report => (
                    <article key={report.id} className="task-card task-ai command-card">
                      <div className="task-top"><span className="task-icon ai"><Icon name="report" /></span><div><Badge tone="info">SV 피드백</Badge><Badge tone="neutral">보고서 답변</Badge></div></div>
                      <h3>{report.reply}</h3>
                      <p>보고서: {report.title}</p>
                      <div className="feedback-card-actions"><button className="link-row" onClick={openFeedback}>피드백 탭에서 보기 <Icon name="chevron" size={15} /></button><button className="secondary-action" onClick={() => setAckedReplies(current => [...current, `${report.id}:${report.reply}`])}>확인했어요 <Icon name="arrow" size={17} /></button></div>
                    </article>
                  ))}
                  {pendingCount === 0 && <div className="all-clear"><span><Icon name="arrow" /></span><h3>SV 요청을 모두 처리했어요</h3><p>보고서나 이슈에 SV가 조치를 요청하면 여기에 표시돼요.</p></div>}
                </div>
                {otherIssues.length > 0 && <button className="other-issues-link" onClick={() => live.open({type:'issues'})}><Icon name="alert" size={15} /> 확인이 필요한 운영 이슈 {otherIssues.length}건 보기 <Icon name="chevron" size={15} /></button>}
              </section>

              <section className="manager-section deadline-section">
                <div className="manager-section-title"><div><h2>오늘 이런 일정이 있어요</h2><span className="count-badge neutral">{todayEntries.length + 1}</span></div><small>시간순</small></div>
                <div className="deadline-list">
                  <button onClick={() => setActive('관리')}><span className="deadline-time"><b>{checkRate}%</b><small>체크 달성률</small></span><span className="deadline-copy"><b>관리자 일일 체크리스트</b><small>오픈 {phaseDone('open')}/{phaseTotal('open')} · 마감 {phaseDone('close')}/{phaseTotal('close')}</small><span className="check-rate-bar"><i style={{ width: `${checkRate}%` }} /></span></span><span className="progress-ring" style={{ background: `conic-gradient(#0a6936 ${checkRate * 3.6}deg, #e3f0e9 0deg)` }}><em>{checkDone}/{t03.length}</em></span><Icon name="chevron" size={17} /></button>
                  {todayEntries.map(entry => (
                    <button key={entry.key} onClick={entry.onOpen}><span className={`deadline-time ${entry.tone}`}><b>{entry.time}</b><small>{entry.label}</small></span><span className="deadline-copy"><b>{entry.title}</b><small>{entry.detail}</small></span><span /><Icon name="chevron" size={17} /></button>
                  ))}
                </div>
              </section>
            </>
          ) : active === '관리' ? <ManagementPage onToast={live.notify} costs={costs} schedules={schedules} setSchedules={setSchedules} inventory={inventory} setInventory={setInventory} /> : active === '보고' ? <ReportPage costs={costs} onToast={live.notify} tab={reportTab} setTab={setReportTab} ackedReplies={ackedReplies} onAck={(key) => setAckedReplies(current => [...current, key])} inventory={inventory} /> : <MyPage onSwitch={onSwitch} onNotifySettings={() => setNotifyOpen(true)} />}
        </main>

        {noticeOpen && <NotificationScreen notices={managerNotices} onBack={goHome} />}
        {notifyOpen && <NotificationSettings types={managerNoticeTypes} enabled={managerNotify} onChange={(key, on) => setManagerNotify(current => ({ ...current, [key]: on }))} onClose={() => setNotifyOpen(false)} />}
        <nav className="bottom-nav" aria-label="점장 메뉴">
          {managerNav.map((item) => (
            <button key={item.label} className={active === item.label ? 'active' : ''} onClick={() => setActive(item.label)}>
              <span><Icon name={item.icon} size={21} />{item.label === '관리' && checks.length-done > 0 && <i>{checks.length-done}</i>}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function ConnectedApp() {
  const live = useLive()
  const {data} = live
  const costs: CostItem[] = data.costs.filter(row => row.business_date.startsWith(data.date.slice(0,7)) && (data.session.role === 'sv' || row.store_id === data.session.storeId)).map(row => ({type:row.category,memo:row.memo,amount:Number(row.amount),date:row.business_date,store_id:row.store_id}))
  const reports: ReportItem[] = data.reports.map(row => ({id:row.id,title:row.title,store:storeName(data,row.store_id),sentAt:new Date(row.created_at).toLocaleString('ko-KR'),summary:row.summary,unread:!row.read_only && !row.reply}))
  const managerIssues: IssueItem[] = data.issues.filter(issue => issue.kind === 'manual' && activeIssue(issue)).map(issue => ({id:issue.id,title:issue.title,store:storeName(data,issue.store_id),sentAt:issue.business_date,summary:issue.description,urgency:issue.severity === 'critical' ? '긴급' : '일반'}))
  return <div className="mobile-frame"><div className="mobile-scroll">
    {data.session.role === 'sv'
      ? <Dashboard onSwitch={() => void live.switchSession('manager')} costs={costs} reports={reports} managerIssues={managerIssues} />
      : <ManagerApp onSwitch={() => void live.switchSession('sv')} costs={costs} />}
    <LiveDialogs />
    {live.message && <div className="toast" role="status">{live.message}</div>}
  </div></div>
}


function LiveDialogs() {
  const live = useLive()
  const {data,dialog} = live
  const [date,setDate] = useState(data.date)
  const [store,setStore] = useState(data.session.storeId)
  const [owner,setOwner] = useState('')
  const [due,setDue] = useState(data.date)
  const [note,setNote] = useState('')
  const [value,setValue] = useState('')
  const [item,setItem] = useState(data.standards[0]?.item_id || '')
  const [supplier,setSupplier] = useState(data.suppliers[0]?.supplier_id || '')
  const [lines,setLines] = useState<{ingredient_id:string;qty:string}[]>([])
  const [reply,setReply] = useState('')
  const issue = dialog?.issue ? data.issues.find(i => i.source_key === dialog.issue?.source_key) || dialog.issue : undefined
  const report = dialog?.report ? data.reports.find(r => r.id === dialog.report?.id) || dialog.report : undefined
  useEffect(() => {
    setDate(data.date); setStore(data.session.storeId); setNote(''); setValue('')
    setOwner(dialog?.issue?.owner || ''); setDue(dialog?.issue?.due_date || data.date)
    setReply(dialog?.report?.reply || '')
  }, [dialog])
  useEffect(() => { setLines([]) }, [supplier])
  useEffect(() => {
    if (!dialog) return
    const previous = document.activeElement as HTMLElement | null
    const modal = document.querySelector<HTMLElement>('[role="dialog"]')
    modal?.querySelector<HTMLElement>('button,input,select,textarea')?.focus()
    function keys(event: KeyboardEvent) {
      if (event.key === 'Escape' && !live.busy) live.open(null)
      if (event.key !== 'Tab' || !modal) return
      const targets = Array.from(modal.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])'))
      const first=targets[0], last=targets[targets.length-1]
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus()}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus()}
    }
    document.addEventListener('keydown',keys)
    return () => {document.removeEventListener('keydown',keys);previous?.focus()}
  }, [dialog,live.busy])
  if (!dialog) return null
  const close = () => {if (!live.busy) live.open(null)}
  const title = dialog.type === 'date' ? '기록 날짜 선택' : dialog.type === 'settings' ? '매장 정보' : dialog.type === 'order' ? '발주 작성' : dialog.type === 'measurement' ? '온도 기록' : dialog.type === 'report' ? '주간 보고서' : dialog.type === 'issues' ? '확인이 필요한 이슈' : '운영 이슈 확인'
  async function transition(operation: string) {
    if (!issue) return
    await live.run(async () => {
      const action = issue.action || await request<Row>('/actions',{method:'POST',body:{source_key:issue.source_key,store_id:issue.store_id,business_date:issue.business_date}})
      await request(`/actions/${action.id}`,{method:'PATCH',body:{operation,version:action.version,owner,due_date:due,note}})
    },operation === 'verify' ? '조치를 확인하고 완료 처리했어요.' : operation === 'reject' ? '보완을 요청했어요.' : '조치 내용을 저장했어요.')
  }
  async function measurement() {
    const ok = await live.run(() => request('/observations',{method:'POST',body:{id:crypto.randomUUID(),store_id:issue?.store_id || data.session.storeId,business_date:data.date,kind:issue?.kind === 'acid' ? 'acid' : 'temperature',item_id:issue?.item_id || item,value:value === '' ? '' : Number(value),note,action_id:issue?.action?.id}}),'측정값을 기록했어요.')
    if (ok) {setValue('');setNote('')}
  }
  const ingredients = data.ingredients.filter(i => i.supplier_id === supplier)
  const priceOf = (id: string) => Number(data.prices.find(p => p.ingredient_id === id && p.valid_from <= data.date)?.unit_price || 0)
  const orderTotal = lines.reduce((n,line) => n+priceOf(line.ingredient_id)*Number(line.qty || 0),0)
  async function order() {
    const ok = await live.run(() => request('/orders',{method:'POST',body:{id:crypto.randomUUID(),store_id:data.session.storeId,business_date:data.date,supplier_id:supplier,items:lines.map(line => ({ingredient_id:line.ingredient_id,qty:Number(line.qty)}))}}),'발주 초안을 저장했어요.')
    if(ok) live.open(null)
  }
  return <div className="report-modal-backdrop" onClick={event => {if(event.target===event.currentTarget)close()}}>
    <div className="report-modal" role="dialog" aria-modal="true" aria-labelledby="live-dialog-title">
      <div className="report-modal-heading"><div><Badge tone="info">{storeName(data,issue?.store_id || report?.store_id || data.session.storeId)}</Badge><h2 id="live-dialog-title">{title}</h2><p>{dialog.type === 'date' ? '확인할 날짜를 선택해 주세요.' : data.date}</p></div><button aria-label="닫기" disabled={live.busy} onClick={close}><Icon name="close" size={18}/></button></div>
      <div className="report-form">
        {dialog.type === 'issues' && <div className="issue-browser-list">{data.issues.filter(i => i.store_id === data.session.storeId && activeIssue(i)).map(issue => <button key={issue.id} onClick={() => live.open({type:'issue',issue})}><span className="source-mini critical"><Icon name={issue.kind === 'temperature' ? 'thermometer' : 'check'} size={16}/></span><span><b>{issue.title}</b><small>{statusLabels[issue.status]}</small></span><Icon name="chevron" size={16}/></button>)}</div>}
        {dialog.type === 'date' && <label><span>날짜</span><input type="date" min="0001-01-01" max="9999-12-31" value={date} onChange={event => setDate(event.target.value)}/></label>}
        {dialog.type === 'settings' && <div className="store-info-list">{(data.session.role === 'sv' ? data.stores : data.stores.filter(s => s.store_id === data.session.storeId)).map(s => (
          <dl key={s.store_id}><dt>{s.store_name}</dt>
            <div><dd>상권</dd><dd>{s.trade_area || '—'}</dd></div>
            <div><dd>매장 유형</dd><dd>{s.store_type || '—'}</dd></div>
            <div><dd>영업시간</dd><dd>{s.open_hour}:00 ~ {s.close_hour}:00</dd></div>
            <div><dd>매장 이용</dd><dd>{[s.dine_in === 'Y' ? '매장 식사' : '', s.delivery === 'Y' ? '배달' : ''].filter(Boolean).join(' · ') || '—'}</dd></div>
          </dl>))}</div>}
        {dialog.type === 'issue' && issue && <><h3>{issue.title}</h3><div className="report-auto-summary"><span><b>진행 상태</b><strong>{statusLabels[issue.status]}</strong></span><span><b>기한</b><strong>{issue.due_date || '미정'}</strong></span><span><b>측정값</b><strong>{issue.value === null ? '점검 기록' : `${issue.value}${issue.kind === 'temperature' ? '℃' : ''}`}</strong></span><span><b>담당자</b><strong>{issue.owner || '미배정'}</strong></span></div><p>{issue.description}</p><p>적용 기준: {issue.standard}</p>
          {!['closed','legacy_complete','data_review'].includes(issue.status) && <><label><span>담당자</span><input value={owner} onChange={event => setOwner(event.target.value)} placeholder="담당자 이름"/></label><label><span>조치 기한</span><input type="date" value={due} onChange={event => setDue(event.target.value)}/></label><label><span>조치 내용 및 확인 메모</span><textarea rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="조치 내용과 현장 확인 결과를 입력해 주세요."/></label>
          {['temperature','acid'].includes(issue.kind) && <label><span>{issue.kind === 'temperature' ? '재측정 온도 (℃)' : '재측정 산가'}</span><input type="number" step="0.1" value={value} onChange={event => setValue(event.target.value)}/><button type="button" disabled={live.busy || value === ''} onClick={measurement}>재측정 기록</button></label>}</>}
          {['legacy_complete','data_review'].includes(issue.status) && <p>{issue.status === 'data_review' ? '원본 기록의 날짜와 완료 표시를 확인해 주세요.' : '과거 완료 표시가 있는 점검 기록입니다.'}</p>}
        </>}
        {dialog.type === 'measurement' && <><label><span>측정 항목</span><select aria-label="측정 항목" value={item} onChange={event => setItem(event.target.value)}>{data.standards.map(s => <option key={s.item_id} value={s.item_id}>{s.item} · {s.standard}</option>)}</select></label><label><span>온도 (℃)</span><input type="number" step="0.1" value={value} onChange={event => setValue(event.target.value)}/></label><label><span>메모</span><textarea value={note} onChange={event => setNote(event.target.value)}/></label></>}
        {dialog.type === 'report' && report && <><h3>{report.title}</h3><p>{report.summary}</p><WeeklyReportBody figures={report.metrics || {}} weekly={weeklyForReport(data, report)} />{!report.read_only && <label><span>SV 답변</span><textarea rows={3} value={reply} readOnly={data.session.role !== 'sv'} onChange={event => setReply(event.target.value)}/></label>}</>}
        {dialog.type === 'order' && <><label><span>공급업체</span><select aria-label="공급업체" value={supplier} onChange={event => setSupplier(event.target.value)}>{data.suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}</select></label><p>최소 발주액 {money(Number(data.suppliers.find(s => s.supplier_id === supplier)?.min_order_amount || 0))} · 초안 저장 후 발주 여부를 확인하세요.</p>{lines.map((line,index) => <label key={index}><span>품목 {index+1}</span><select aria-label={`품목 ${index+1}`} value={line.ingredient_id} onChange={event => setLines(current => current.map((row,i) => i===index ? {...row,ingredient_id:event.target.value} : row))}>{ingredients.map(i => <option key={i.ingredient_id} value={i.ingredient_id}>{i.ingredient_name} · {i.order_unit} · {money(priceOf(i.ingredient_id))}</option>)}</select><input aria-label={`수량 ${index+1}`} type="number" min="0" step="1" value={line.qty} onChange={event => setLines(current => current.map((row,i) => i===index ? {...row,qty:event.target.value} : row))}/><button onClick={() => setLines(current => current.filter((_,i) => i !== index))}>품목 삭제</button></label>)}<button onClick={() => {const next=ingredients.find(i => !lines.some(line => line.ingredient_id===i.ingredient_id));if(next)setLines(current => [...current,{ingredient_id:next.ingredient_id,qty:String(next.min_order_qty || 1)}])}}>+ 품목 추가</button><p>합계 {money(orderTotal)}</p><p>저장된 초안 {data.orders.length}건</p></>}
      </div>
      <div className="report-modal-actions"><button disabled={live.busy} onClick={close}>닫기</button>
        {dialog.type === 'date' && <button onClick={() => live.setDate(date)}>선택한 날짜 확인</button>}
        {dialog.type === 'measurement' && <button disabled={live.busy || value === ''} onClick={measurement}>측정값 저장</button>}
        {dialog.type === 'issues' && <button onClick={() => live.open({type:'measurement'})}>온도 기록하기</button>}
        {dialog.type === 'order' && <button disabled={live.busy || !lines.length} onClick={order}>발주 초안 저장</button>}
        {dialog.type === 'report' && !report?.read_only && data.session.role === 'sv' && <button disabled={live.busy} onClick={() => void live.run(() => request(`/reports/${report?.id}`,{method:'PATCH',body:{reply}}),'답변을 저장했어요.')}>답변 저장</button>}
        {dialog.type === 'issue' && issue && <>
          {['open','assigned'].includes(issue.status) && <button disabled={live.busy} onClick={() => void transition('assign')}>담당 배정</button>}
          {issue.status === 'assigned' && <button disabled={live.busy} onClick={() => void transition('start')}>조치 시작</button>}
          {issue.status === 'in_progress' && <button disabled={live.busy} onClick={() => void transition('request_verification')}>완료 확인 요청</button>}
          {issue.status === 'awaiting_verification' && data.session.role === 'sv' && <><button disabled={live.busy} onClick={() => void transition('reject')}>보완 요청</button><button disabled={live.busy} onClick={() => void transition('verify')}>확인 완료</button></>}
        </>}
      </div>
    </div>
  </div>
}

export default function App() { return <LiveProvider><ConnectedApp /></LiveProvider> }
