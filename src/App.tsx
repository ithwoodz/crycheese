import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useDashboardData, type Finding, type StoreSummary, type WeeklyReport } from './lib/data'
import { displayTimes, managerChecklist, minimumOf, phaseOf, type ChecklistPhaseKey, type ManagerCheckItem } from './lib/managerChecklist'

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

type CostItem = { type: string; memo: string; amount: number; date: string }
type ReportItem = { id: number; title: string; store: string; sentAt: string; summary: string; unread: boolean }
type IssueItem = { id: number; title: string; store: string; sentAt: string; summary: string; urgency: '일반' | '긴급' }
type CommandItem = { id: number; source: '이슈' | '보고서'; refTitle: string; title: string; due: string; sentAt: string; done: boolean }
type CommandTarget = { source: CommandItem['source']; refTitle: string; preset?: string }
type ScheduleCategory = '발주' | '체크' | '마감' | '기타'
type ScheduleItem = { id: number; day: number; time: string; title: string; category: ScheduleCategory; detail: string }
type ChecklistState = {
  values: Record<string, string>
  setValues: Dispatch<SetStateAction<Record<string, string>>>
  statuses: Record<string, CheckStatus>
  setStatuses: Dispatch<SetStateAction<Record<string, CheckStatus>>>
  sentKeys: string[]
  setSentKeys: Dispatch<SetStateAction<string[]>>
}

const initialCosts: CostItem[] = [
  { type: '발주비', memo: 'B업체 식자재 정기 발주', amount: 486000, date: '오늘 14:20' },
  { type: '재료비', memo: '긴급 채소 추가 구매', amount: 128000, date: '8월 11일' },
  { type: '인건비', memo: '주말 추가 근무 수당', amount: 320000, date: '8월 10일' },
]

const initialReports: ReportItem[] = [
  { id: 1, title: '8월 1주차 강남역점 주간 운영 보고', store: '강남역점', sentAt: '어제 18:42', summary: '매출은 전주 대비 9.8% 증가했으나 점심 대기 관련 리뷰가 4건 발생했습니다.', unread: true },
  { id: 2, title: '8월 1주차 선릉점 주간 운영 보고', store: '선릉점', sentAt: '8월 9일 17:30', summary: '업무 이행률 98%를 유지했고 폐기율은 0.5%로 안정적입니다.', unread: false },
]

const initialCommands: CommandItem[] = [
  { id: 1, source: '이슈', refTitle: '냉장고 2번 온도 이상', title: '도어 패킹과 냉각 팬을 먼저 점검하고, 수리 전까지 고위험 식재료는 1번 냉장고로 옮겨 주세요.', due: '15:00', sentAt: '오늘 11:05', done: false },
]

// 8월 달력의 "오늘"은 12일입니다.
const todayDay = 12
const scheduleTone: Record<ScheduleCategory, string> = { 발주: 'amber', 체크: 'blue', 마감: 'green', 기타: 'violet' }
const initialSchedules: ScheduleItem[] = [
  { id: 1, day: 2, time: '10:00', title: '재고 실사', category: '체크', detail: '' },
  { id: 2, day: 4, time: '15:00', title: 'A업체 발주', category: '발주', detail: '' },
  { id: 3, day: 10, time: '14:00', title: '주간 청소', category: '체크', detail: '' },
  { id: 4, day: 12, time: '16:00', title: 'B업체 정기 발주 마감', category: '발주', detail: '추천 발주 8개 품목' },
  { id: 5, day: 12, time: '18:00', title: '중간 운영 체크', category: '체크', detail: '온도·위생 4개 항목' },
  { id: 6, day: 12, time: '22:30', title: '마감 정산', category: '마감', detail: '매출 및 폐기 기록' },
  { id: 7, day: 14, time: '11:00', title: '유통기한 점검', category: '체크', detail: '' },
  { id: 8, day: 19, time: '17:00', title: '주간 보고', category: '기타', detail: '' },
  { id: 9, day: 25, time: '10:00', title: '재고 실사', category: '체크', detail: '' },
]

function sortSchedules(items: ScheduleItem[]) {
  return [...items].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
}

const initialIssues: IssueItem[] = [
  { id: 1, title: '냉장고 2번 온도 이상', store: '역삼점', sentAt: '오늘 10:42', summary: '재측정 후에도 7.2℃가 확인되어 장비 점검이 필요합니다.', urgency: '긴급' },
]

function StoreCard({ store, onOpen }: { store: StoreSummary; onOpen: () => void }) {
  const warning = store.wasteOver
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

function commandStatus(commands: CommandItem[], source: CommandItem['source'], refTitle: string) {
  const related = commands.filter((command) => command.source === source && command.refTitle === refTitle)
  if (!related.length) return null
  return related.every((command) => command.done) ? <Badge tone="good">점장 조치 완료</Badge> : <Badge tone="info">조치 요청함</Badge>
}

function IssueBoardView({ managerIssues, issues, commands, onRequestCommand }: { managerIssues: IssueItem[]; issues: Finding[]; commands: CommandItem[]; onRequestCommand: (target: CommandTarget) => void }) {
  const [selected, setSelected] = useState(issues[0]?.title ?? '')
  return (
    <section className="issue-board-view">
      <div className="manager-submitted-section">
        <div className="submitted-heading"><div><h2>점장이 보낸 이슈</h2><p>매장에서 직접 해결하기 어려워 SV 확인을 요청한 항목입니다.</p></div><Badge tone="critical">{managerIssues.length}건 확인 필요</Badge></div>
        <div className="submitted-issue-list">
          {managerIssues.map((issue) => <article key={issue.id}><span className="submitted-alert"><Icon name="alert" size={17} /></span><span><span className="submitted-badges"><Badge tone={issue.urgency === '긴급' ? 'critical' : 'warning'}>{issue.urgency}</Badge>{commandStatus(commands, '이슈', issue.title)}</span><b>{issue.title}</b><small>{issue.store} 점장 · {issue.sentAt}</small><p>{issue.summary}</p></span><button type="button" className="command-button" onClick={() => onRequestCommand({ source: '이슈', refTitle: issue.title })}>조치 요청 <Icon name="send" size={13} /></button></article>)}
        </div>
      </div>
      <div className="status-overview">
        <article><span className="status-dot open" /><div><b>열림</b><strong>7</strong></div><small>전체 32%</small></article>
        <article><span className="status-dot doing" /><div><b>조치 중</b><strong>6</strong></div><small>전체 27%</small></article>
        <article><span className="status-dot waiting" /><div><b>확인 대기</b><strong>5</strong></div><small>전체 23%</small></article>
        <article><span className="status-dot solved" /><div><b>이번 주 해결</b><strong>18</strong></div><small>평균 1.8일</small></article>
      </div>
      <div className="issue-analytics-grid">
        <article className="analytics-panel issue-browser">
          <div className="analytics-heading"><div><h2>진행 중인 이슈</h2><p>중요도와 기한순으로 확인하세요.</p></div><button>전체 매장 <Icon name="chevron" size={14} /></button></div>
          <div className="issue-browser-list">
            {issues.map((issue) => <button key={issue.id} className={selected === issue.title ? 'selected' : ''} onClick={() => setSelected(issue.title)}><span className={`source-mini ${issue.tone}`}><Icon name={issue.source === '온도' ? 'thermometer' : issue.source === '재고' ? 'package' : issue.source === '리뷰' ? 'message' : 'check'} size={16} /></span><span><b>{issue.title}</b><small>{issue.store} · {issue.source}</small></span><div><Badge tone={issue.tone}>{issue.status}</Badge><strong>{issue.value}</strong></div></button>)}
          </div>
        </article>
        <article className="analytics-panel issue-detail-analysis">
          <div className="detail-title"><div><Badge tone="critical">기한 초과</Badge><Badge tone="neutral">반복 3회</Badge><h2>{selected}</h2><p>역삼점 · 주방 냉장고 2번</p></div><button>원본 기록 보기</button></div>
          <div className="temperature-chart">
            <div className="chart-axis"><span>9℃</span><span>6℃</span><span>3℃</span><span>0℃</span></div>
            <div className="chart-canvas"><span className="limit-line">기준 상한 5℃</span><svg viewBox="0 0 500 145" preserveAspectRatio="none"><path d="M0 112 C50 102,70 96,105 100 S165 70,205 78 S270 44,310 58 S370 18,415 35 S465 12,500 22" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M0 112 C50 102,70 96,105 100 S165 70,205 78 S270 44,310 58 S370 18,415 35 S465 12,500 22 L500 145 L0 145Z" fill="url(#area)" opacity=".14" /><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="currentColor" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs></svg><div className="chart-labels"><span>8/6</span><span>8/8</span><span>8/10</span><span>8/12</span></div></div>
          </div>
          <div className="analysis-columns">
            <div><span className="analysis-icon cause"><Icon name="search" size={16} /></span><section><b>원인 분석</b><p>최근 7일간 온도가 지속 상승했습니다. 냉장고 문 열림 시간 증가와 점심 피크 시간대가 겹치며, 장비 자체 냉각 성능 저하 가능성도 높습니다.</p><div><span>문 열림 빈도 <b>+34%</b></span><span>피크 시간 이탈 <b>4회</b></span></div></section></div>
            <div><span className="analysis-icon action"><Icon name="sparkle" size={16} /></span><section><b>AI 추천 조치</b><p>① 도어 패킹과 냉각 팬을 우선 점검하세요.<br />② 수리 전까지 고위험 식재료를 1번 냉장고로 이동하세요.</p><button onClick={() => onRequestCommand({ source: '이슈', refTitle: selected, preset: '도어 패킹과 냉각 팬을 우선 점검하고, 수리 전까지 고위험 식재료를 1번 냉장고로 옮겨 주세요.' })}>점장에게 조치 요청 <Icon name="send" size={14} /></button></section></div>
          </div>
        </article>
      </div>
    </section>
  )
}

function StoreManagementView({ costs, stores }: { costs: CostItem[]; stores: StoreSummary[] }) {
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const totalInputCost = costs.reduce((sum, cost) => sum + cost.amount, 0)

  if (!selectedStore) {
    return (
      <section className="store-management-view">
        <div className="store-directory-heading"><div><h2>담당 매장</h2><p>상세 현황을 확인할 매장을 선택하세요.</p></div><span>총 {stores.length}개 매장</span></div>
        <div className="store-directory">
          {stores.map((store, index) => (
            <button key={store.id} onClick={() => setSelectedStore(store.name)}>
              <span className="directory-card-top"><span className={`store-icon store-icon-${store.color}`}><Icon name="store" size={21} /></span><span><b>{store.name}</b><small>{store.location} · 점장 {['박민준', '이도윤', '최서연'][index] ?? '-'}</small></span><Badge tone={index === 1 ? 'warning' : 'good'}>{index === 1 ? '주의 필요' : '운영 정상'}</Badge></span>
              <span className="directory-metrics">
                <span><small>이번 달 매출</small><b>{['₩92.8M', '₩86.4M', '₩78.2M'][index] ?? '-'}</b><em>+{[11.2, 8.2, 6.4][index] ?? 0}%</em></span>
                <span><small>열린 이슈</small><b>{store.issues}건</b><em className={index === 1 ? 'warning' : ''}>{index === 1 ? '2건 기한 초과' : '긴급 이슈 없음'}</em></span>
                <span><small>업무 이행률</small><b>{store.rate}</b><em>최근 7일</em></span>
              </span>
              <span className="directory-card-bottom"><span><i className={index === 1 ? 'warning' : 'good'} /> 최근 업데이트 {index === 1 ? '12분 전' : index === 0 ? '28분 전' : '1시간 전'}</span><b>상세 현황 보기 <Icon name="chevron" size={15} /></b></span>
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="store-management-view">
      <div className="store-detail-header"><button onClick={() => setSelectedStore(null)}><Icon name="chevron" size={16} /> 매장 목록</button><div><span className="store-icon store-icon-orange"><Icon name="store" size={19} /></span><span><h2>{selectedStore}</h2><p>서울 강남구 · 점장 이도윤 · 마지막 업데이트 12분 전</p></span></div><Badge tone="warning">주의 필요</Badge></div>
      <div className="store-kpis">
        <article><small>이번 달 매출</small><strong>₩86.4M</strong><span className="positive">+8.2% 전월 대비</span></article>
        <article><small>이번 달 비용</small><strong>₩{(7.82 + totalInputCost / 1000000).toFixed(2)}M</strong><span>점장 입력 {costs.length}건 반영</span></article>
        <article><small>리뷰 평점</small><strong>4.3</strong><span className="warning">대기 불만 5건</span></article>
        <article><small>업무 이행률</small><strong>82%</strong><span className="warning">체크 2개 미완료</span></article>
      </div>
      <div className="store-detail-grid">
        <article className="analytics-panel revenue-cost-panel">
          <div className="analytics-heading"><div><h2>매출 · 비용 추이</h2><p>점장 입력 데이터와 POS 매출을 함께 반영합니다.</p></div><Badge tone="good">영업이익률 18.4%</Badge></div>
          <div className="comparison-chart"><div className="comparison-legend"><span><i className="sales" /> 매출</span><span><i className="cost" /> 비용</span></div><div className="comparison-bars">{[58,64,61,72,68,79,86,82,92,88,96,91].map((value, index) => <div key={index}><i className="sales" style={{ height: `${value}%` }} /><i className="cost" style={{ height: `${Math.max(22, value - 43)}%` }} /><span>{index + 1}주</span></div>)}</div></div>
        </article>
        <article className="analytics-panel input-data-panel">
          <div className="analytics-heading"><div><h2>점장 입력 내역</h2><p>점장 대시보드에서 최근 입력된 항목</p></div><Badge tone="info">실시간 반영</Badge></div>
          <div className="manager-input-list">
            {costs.slice(0,3).map((cost, index) => <div key={index}><span className="input-icon cost"><Icon name="package" size={15} /></span><p><b>{cost.memo}</b><small>{cost.type} · {cost.date}</small></p><strong>-{cost.amount.toLocaleString()}원</strong></div>)}
            <div><span className="input-icon check"><Icon name="check" size={15} /></span><p><b>냉장·냉동 온도 기록 완료</b><small>체크리스트 · 오늘 10:30</small></p><Badge tone="good">완료</Badge></div>
          </div>
        </article>
        <article className="analytics-panel review-management">
          <div className="analytics-heading"><div><h2>리뷰 관리</h2><p>최근 30일 고객 반응</p></div><strong>4.3 <small>/ 5.0</small></strong></div>
          <div className="review-sentiment"><div><span>긍정</span><i><b style={{ width: '72%' }} /></i><strong>72%</strong></div><div><span>중립</span><i><b style={{ width: '18%' }} /></i><strong>18%</strong></div><div><span>부정</span><i><b style={{ width: '10%' }} /></i><strong>10%</strong></div></div>
          <div className="review-topic"><Badge tone="warning">주의</Badge><p><b>대기 시간 불만 증가</b><small>7일간 5건 · 전주 대비 +3건</small></p><Icon name="chevron" size={16} /></div>
        </article>
        <article className="analytics-panel compliance-panel">
          <div className="analytics-heading"><div><h2>업무 이행률</h2><p>오픈·중간·마감 체크 기준</p></div><strong>82%</strong></div>
          <div className="compliance-ring"><span>82<small>%</small></span></div>
          <div className="compliance-items"><span><i className="good" />오픈 체크 <b>100%</b></span><span><i className="warning" />중간 체크 <b>75%</b></span><span><i className="critical" />마감 체크 <b>68%</b></span></div>
        </article>
      </div>
    </section>
  )
}

function WeeklyReportView({ reports: sentReports, weeklyReports, commands, onRequestCommand }: { reports: ReportItem[]; weeklyReports: WeeklyReport[]; commands: CommandItem[]; onRequestCommand: (target: CommandTarget) => void }) {
  const reports = [...sentReports, ...weeklyReports]
  return (
    <section className="weekly-report-view">
      <div className="submitted-reports">
        <div className="submitted-heading"><div><h2>점장 제출 주간 보고서</h2><p>각 매장에서 보낸 최신 보고서를 확인하세요.</p></div><Badge tone="info">최근 {reports.length}건</Badge></div>
        <div className="submitted-report-grid">
          {reports.map((report) => <article key={report.id}><div><span className="report-store-mark">{report.store.slice(0,1)}</span><p><b>{report.store}</b><small>{report.sentAt}</small></p><Badge tone={report.unread ? 'info' : 'neutral'}>{report.unread ? '새 보고서' : '확인함'}</Badge></div><h3>{report.title}</h3><p>{report.summary}</p>{commandStatus(commands, '보고서', report.title)}<span className="report-card-actions"><button>보고서 확인 <Icon name="chevron" size={14} /></button><button className="command-button" onClick={() => onRequestCommand({ source: '보고서', refTitle: report.title })}>조치 요청 <Icon name="send" size={13} /></button></span></article>)}
        </div>
      </div>
      <div className="report-summary">
        <div><Badge tone="info"><Icon name="sparkle" size={11} /> AI 주간 브리핑</Badge><h2>매출은 성장했지만, 운영 비용과 대기 시간 관리가 필요해요.</h2><p>최근 12주 누적 데이터를 분석한 결과입니다. 역삼점의 재료비 상승과 강남역점의 피크 시간 리뷰가 다음 주 핵심 관리 항목입니다.</p></div>
        <button>보고서 내보내기 <Icon name="report" size={15} /></button>
      </div>
      <div className="longterm-grid">
        <article className="analytics-panel trend-panel">
          <div className="analytics-heading"><div><h2>12주 운영 추이</h2><p>3개 매장 평균 지표</p></div><div className="trend-tabs"><button className="active">매출</button><button>비용</button><button>이행률</button></div></div>
          <div className="long-chart"><div className="long-axis"><span>120M</span><span>90M</span><span>60M</span><span>30M</span></div><div className="long-canvas"><svg viewBox="0 0 600 190" preserveAspectRatio="none"><path d="M0 150 C50 145,65 124,110 128 S175 112,220 118 S290 80,330 92 S395 65,440 74 S515 35,600 42" fill="none" stroke="#426ac4" strokeWidth="3" /><path d="M0 162 C60 158,85 150,125 153 S195 140,240 144 S315 125,355 130 S420 118,470 120 S540 104,600 108" fill="none" stroke="#d49a3b" strokeWidth="2.5" strokeDasharray="6 4" /></svg><div><span>5월 4주</span><span>6월 2주</span><span>6월 4주</span><span>7월 2주</span><span>7월 4주</span><span>8월 2주</span></div></div></div>
          <div className="trend-legend"><span><i className="blue" /> 매출 <b>+14.2%</b></span><span><i className="amber" /> 비용 <b>+18.7%</b></span><span className="insight">비용 증가율이 매출 증가율보다 4.5%p 높아요</span></div>
        </article>
        <article className="analytics-panel ai-insight-panel">
          <div className="analytics-heading"><div><h2>AI 핵심 인사이트</h2><p>데이터 간 연관성을 분석했어요.</p></div><span className="ai-orb"><Icon name="sparkle" size={17} /></span></div>
          <div className="insight-list">
            <div className="high"><b>1</b><p><strong>재료비 상승이 수익성을 압박하고 있어요</strong><span>역삼점 재료비가 4주 연속 증가했습니다. 특히 긴급 발주 단가가 정기 발주보다 평균 16% 높습니다.</span><small>영향도 높음 · 신뢰도 92%</small></p></div>
            <div><b>2</b><p><strong>점심 인력과 리뷰 평점의 상관관계</strong><span>12~14시 근무자가 4명 미만인 날, 대기 불만이 2.3배 증가했습니다.</span><small>영향도 중간 · 신뢰도 87%</small></p></div>
            <div><b>3</b><p><strong>마감 체크 누락이 폐기율에 영향</strong><span>마감 이행률 80% 미만 주간에 평균 폐기율이 0.4%p 높았습니다.</span><small>영향도 중간 · 신뢰도 81%</small></p></div>
          </div>
        </article>
      </div>
      <article className="recommended-actions">
        <div className="actions-heading"><span><Icon name="sparkle" size={18} /></span><div><h2>다음 주 추천 실행 항목</h2><p>인사이트를 기반으로 우선순위가 높은 3가지를 제안해요.</p></div></div>
        <div className="action-cards">
          <button><Badge tone="critical">우선순위 1</Badge><h3>역삼점 긴급 발주 원인 점검</h3><p>안전재고 기준을 재설정하면 월 재료비를 약 420,000원 절감할 수 있어요.</p><span>담당 지정하기 <Icon name="chevron" size={14} /></span></button>
          <button><Badge tone="warning">우선순위 2</Badge><h3>점심 피크 인력 1명 추가</h3><p>강남역점 화·목 12~14시 배치를 보강해 대기 불만 감소를 확인하세요.</p><span>스케줄에 반영 <Icon name="chevron" size={14} /></span></button>
          <button><Badge tone="info">우선순위 3</Badge><h3>마감 체크 알림 강화</h3><p>마감 30분 전 미완료 항목을 점장에게 자동 알림으로 전달하세요.</p><span>자동화 설정 <Icon name="chevron" size={14} /></span></button>
        </div>
      </article>
    </section>
  )
}

function CommandModal({ target, onClose, onSend }: { target: CommandTarget; onClose: () => void; onSend: (title: string, due: string) => void }) {
  const [title, setTitle] = useState(target.preset ?? '')
  const [due, setDue] = useState('')
  return (
    <div className="report-modal-backdrop">
      <div className="report-modal">
        <div className="report-modal-heading"><div><Badge tone="info">점장에게 조치 요청</Badge><h2>{target.refTitle}</h2><p>{target.source}에 대한 처리 요청이 점장 홈의 "지금 처리해 주세요"에 표시돼요.</p></div><button onClick={onClose} aria-label="닫기"><Icon name="close" size={18} /></button></div>
        <div className="report-form">
          <label><span>요청 내용</span><textarea rows={4} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 냉장고 도어 패킹을 점검하고 30분 뒤 재측정해 주세요." /></label>
          <label><span>처리 기한 (선택)</span><input type="time" value={due} onChange={(event) => setDue(event.target.value)} /></label>
        </div>
        <div className="report-modal-actions"><button onClick={onClose}>취소</button><button disabled={!title.trim()} onClick={() => onSend(title.trim(), due)}><Icon name="send" size={15} /> 점장에게 보내기</button></div>
      </div>
    </div>
  )
}

function Dashboard({ onSwitch, costs, reports, managerIssues, commands, onSendCommand }: { onSwitch: () => void; costs: CostItem[]; reports: ReportItem[]; managerIssues: IssueItem[]; commands: CommandItem[]; onSendCommand: (command: CommandItem) => void }) {
  const [commandTarget, setCommandTarget] = useState<CommandTarget | null>(null)
  const [svToast, setSvToast] = useState('')
  const [active, setActive] = useState('현황')
  const [notice, setNotice] = useState(false)
  const data = useDashboardData()

  return (
    <div className="manager-bg">
      <div className="manager-shell sv-shell">
        <header className="manager-header">
          <div className="manager-brand"><span className="brand-mark small"><span /><span /><span /></span><b>RUNN</b><em className="role-tag">SV</em></div>
          <div className="manager-tools">
            <button className="icon-button" onClick={() => setNotice(!notice)} aria-label="알림"><Icon name="bell" size={20} /><i /></button>
            <Avatar text="김" />
          </div>
          {notice && <div className="notice-pop"><b>새 알림 2개</b><span>역삼점 냉장 온도 이슈가 전달되었습니다.</span></div>}
        </header>

        <main className="manager-main">
          {active === 'MY PAGE' ? <SvMyPage onSwitch={onSwitch} /> : <>
          <section className="manager-welcome">
            <p>8월 12일 수요일 · 강남 1지역</p>
            <h1>{active === '현황' ? '안녕하세요, 김수현님' : active}</h1>
            <span>{active === '현황' ? '확인이 필요한 이슈부터 살펴보세요.' : '3개 매장의 운영 데이터를 한눈에 확인하세요.'}</span>
          </section>

          {active === '현황' ? <><section className="metric-grid" aria-label="주요 현황">
            <article className="metric-card metric-blue"><span className="metric-icon"><Icon name="send" /></span><div><small>전달받은 이슈</small><strong>3</strong><p><b>+1</b> 어제보다</p></div><button onClick={() => setActive('이슈 보드')}><Icon name="chevron" size={18} /></button></article>
            <article className="metric-card metric-violet"><span className="metric-icon"><Icon name="clock" /></span><div><small>확인 대기</small><strong>5</strong><p>오늘 <b>2건</b> 추가</p></div><button onClick={() => setActive('이슈 보드')}><Icon name="chevron" size={18} /></button></article>
            <article className="metric-card metric-red"><span className="metric-icon"><Icon name="alert" /></span><div><small>기한 초과</small><strong>2</strong><p><b>즉시 확인 필요</b></p></div><button onClick={() => setActive('이슈 보드')}><Icon name="chevron" size={18} /></button></article>
            <article className="metric-card metric-green"><span className="metric-icon"><Icon name="approve" /></span><div><small>이번 주 해결</small><strong>18</strong><p><b>+12%</b> 지난주보다</p></div><button><Icon name="chevron" size={18} /></button></article>
          </section>

          <section className="dashboard-grid">
            <div className="panel issue-panel">
              <div className="panel-heading">
                <div><h2>지금 확인할 이슈</h2><span>중요도와 기한을 기준으로 정렬했어요</span></div>
                <button onClick={() => setActive('이슈 보드')}>전체 보기 <Icon name="chevron" size={15} /></button>
              </div>
              <div className="issue-list">
                <article className="issue-row critical">
                  <span className="issue-source temp"><Icon name="thermometer" /></span>
                  <div className="issue-body">
                    <div><Badge tone="critical">기한 초과</Badge><Badge tone="neutral">반복 3회</Badge></div>
                    <h3>냉장고 온도 기준 이탈</h3>
                    <p>역삼점 · 주방 냉장고 2번</p>
                    <span className="evidence"><b>측정 7.2℃</b><i /> 기준 0~5℃</span>
                  </div>
                  <div className="issue-action"><small>8월 12일 10:30</small><button>확인하기 <Icon name="chevron" size={15} /></button></div>
                </article>
                <article className="issue-row warning">
                  <span className="issue-source waste"><Icon name="package" /></span>
                  <div className="issue-body">
                    <div><Badge tone="warning">확인 대기</Badge></div>
                    <h3>주간 폐기율 기준 초과</h3>
                    <p>역삼점 · 이번 주 누적</p>
                    <span className="evidence"><b>폐기율 1.4%</b><i /> 기준 1% 이하</span>
                  </div>
                  <div className="issue-action"><small>오늘 14:00까지</small><button>검토하기 <Icon name="chevron" size={15} /></button></div>
                </article>
                <article className="issue-row info">
                  <span className="issue-source ai"><Icon name="sparkle" /></span>
                  <div className="issue-body">
                    <div><Badge tone="info">AI 생성</Badge><Badge tone="neutral">리뷰 5건</Badge></div>
                    <h3>“대기 시간이 길어요” 반복</h3>
                    <p>강남역점 · 네이버 60% / 배민 40%</p>
                    <span className="evidence">피크 시간대 인력 배치 확인 권장</span>
                  </div>
                  <div className="issue-action"><small>8월 13일까지</small><button>내용 보기 <Icon name="chevron" size={15} /></button></div>
                </article>
              </div>
            </div>

            <aside className="panel activity-panel">
              <div className="panel-heading"><div><h2>최근 활동</h2><span>매장별 업데이트</span></div><button><Icon name="more" /></button></div>
              <div className="timeline">
                <div><span className="timeline-dot green"><Icon name="arrow" size={12} /></span><p><b>온도 재측정 완료</b><span>선릉점 · 냉장고 1번</span><small>12분 전</small></p></div>
                <div><span className="timeline-dot blue"><Icon name="send" size={12} /></span><p><b>SV에게 이슈 전달</b><span>역삼점 · 장비 점검 요청</span><small>35분 전</small></p></div>
                <div><span className="timeline-dot violet"><Icon name="approve" size={12} /></span><p><b>매장 항목 승인 요청</b><span>강남역점 · 포스기 마감 확인</span><small>1시간 전</small></p></div>
                <div><span className="timeline-dot orange"><Icon name="alert" size={12} /></span><p><b>폐기율 기준 초과</b><span>역삼점 · 1.4% 기록</span><small>2시간 전</small></p></div>
              </div>
            </aside>
          </section>

          </> : active === '이슈 보드' ? <IssueBoardView managerIssues={managerIssues} issues={data.findings} commands={commands} onRequestCommand={setCommandTarget} /> : active === '매장 관리' ? <StoreManagementView costs={costs} stores={data.stores} /> : <WeeklyReportView reports={reports} weeklyReports={data.weeklyReports} commands={commands} onRequestCommand={setCommandTarget} />}
          </>}
        </main>

        <nav className="bottom-nav" aria-label="SV 메뉴">
          {svNav.map((item) => (
            <button key={item.key} className={active === item.key ? 'active' : ''} onClick={() => setActive(item.key)}>
              <span><Icon name={item.icon} size={21} />{item.key === '이슈 보드' && managerIssues.length > 0 && <i>{managerIssues.length}</i>}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
      {commandTarget && <CommandModal target={commandTarget} onClose={() => setCommandTarget(null)} onSend={(title, due) => {
        onSendCommand({ id: Date.now(), source: commandTarget.source, refTitle: commandTarget.refTitle, title, due, sentAt: '방금 전', done: false })
        setCommandTarget(null)
        setSvToast('점장에게 조치 요청을 보냈어요')
        window.setTimeout(() => setSvToast(''), 2200)
      }} />}
        {svToast && <div className="toast"><Icon name="arrow" size={15} /> {svToast}</div>}
      </div>
    </div>
  )
}

const managerNav: { icon: IconName; label: string }[] = [
  { icon: 'home', label: '홈' },
  { icon: 'board', label: '관리' },
  { icon: 'report', label: '보고' },
  { icon: 'user', label: 'MY PAGE' },
]

const calendarDays = [
  { day: 27, muted: true }, { day: 28, muted: true }, { day: 29, muted: true }, { day: 30, muted: true }, { day: 31, muted: true },
  { day: 1 }, { day: 2 },
  { day: 3 }, { day: 4 }, { day: 5 }, { day: 6 }, { day: 7 }, { day: 8 }, { day: 9 },
  { day: 10 }, { day: 11 }, { day: 12, today: true }, { day: 13 }, { day: 14 }, { day: 15 }, { day: 16 },
  { day: 17 }, { day: 18 }, { day: 19 }, { day: 20 }, { day: 21 }, { day: 22 }, { day: 23 },
  { day: 24 }, { day: 25 }, { day: 26 }, { day: 27 }, { day: 28 }, { day: 29 }, { day: 30 },
  { day: 31 }, { day: 1, muted: true }, { day: 2, muted: true }, { day: 3, muted: true }, { day: 4, muted: true }, { day: 5, muted: true }, { day: 6, muted: true },
]

type CheckStatus = 'ok' | 'bad' | null

function StatusToggle({ status, onChange }: { status: CheckStatus; onChange: (status: CheckStatus) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={status === 'ok'}
      aria-label={status === 'ok' ? '정상' : status === 'bad' ? '비정상' : '미확인'}
      className={`status-toggle ${status ?? 'unset'}`}
      onClick={() => onChange(status === 'ok' ? 'bad' : 'ok')}
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
        <div className="report-modal-actions"><button onClick={onClose}>취소</button><button className="issue-send" disabled={selection.length === 0} onClick={() => onSend(selection, memo, urgency)}><Icon name="send" size={15} /> {selection.length ? `${selection.reduce((sum, item) => sum + item.items.length, 0)}개 항목 SV에게 전달` : '하위항목을 선택하세요'}</button></div>
      </div>
    </div>
  )
}

function DailyChecklist({ onToast, onSendIssue, checklist }: { onToast: (message: string) => void; onSendIssue: (issue: IssueItem) => void; checklist: ChecklistState }) {
  const { values, setValues, statuses, setStatuses, sentKeys, setSentKeys } = checklist
  const [screen, setScreen] = useState<ChecklistPhaseKey | null>(null)
  const [composing, setComposing] = useState(false)

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

  function measure(item: ManagerCheckItem, raw: string) {
    setValues((current) => ({ ...current, [item.id]: raw }))
    const value = Number(raw)
    const min = minimumOf(item)
    const status: CheckStatus = raw.trim() === '' || raw.trim() === '-' || Number.isNaN(value) ? null : min == null || value >= min ? 'ok' : 'bad'
    setStatuses((current) => ({ ...current, [item.id]: status }))
  }

  function setStatus(item: ManagerCheckItem, status: CheckStatus) {
    setStatuses((current) => ({ ...current, [item.id]: status }))
    onToast(status === 'bad' ? '비정상으로 기록됐어요' : '정상으로 기록됐어요')
  }

  function sendIssue(picked: { entry: AbnormalEntry; items: string[] }[], memo: string, urgency: IssueItem['urgency']) {
    const items = picked.flatMap((item) => item.items)
    onSendIssue({
      id: Date.now(),
      title: picked.length === 1 ? `${picked[0].entry.label} 비정상` : `체크리스트 비정상 ${picked.length}건`,
      store: '역삼점',
      sentAt: '방금 전',
      summary: [`${picked[0].entry.phase} 체크: ${items.join(', ')}`, memo.trim()].filter(Boolean).join(' · '),
      urgency,
    })
    setSentKeys((current) => [...current, ...picked.map((item) => item.entry.key)])
    setComposing(false)
    onToast('SV에게 이슈를 전달했어요')
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
                const status = statuses[item.id] ?? null
                return (
                  <div key={item.id} className={`measure-row ${status ?? 'unset'}`}>
                    <span><b>{item.task}</b><small>{item.id} · 기준 {item.standard}</small></span>
                    <label className="measure-input">
                      <input inputMode="decimal" aria-label={`${item.task} 온도`} value={values[item.id] ?? ''} placeholder="입력" onChange={(event) => measure(item, event.target.value)} />
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
                      <span>{times.get(item.id) && <i className="task-time">{times.get(item.id)}</i>}<b className={important ? 'important' : ''}>{item.task.replace(/^\*\*/, '')}</b><small>{item.id}</small></span>
                      <StatusToggle status={statuses[item.id] ?? null} onChange={(next) => setStatus(item, next)} />
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
            <span className="phase-entry-copy"><b>{key === 'open' ? '오픈' : '마감'}</b><small>{key === 'open' ? 'T03-01~14 · 심부 온도 측정 포함' : 'T03-15~25 · 중간 마감 포함'}</small></span>
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

function CostPanel({ costs, setCosts, onToast }: { costs: CostItem[]; setCosts: Dispatch<SetStateAction<CostItem[]>>; onToast: (message: string) => void }) {
  const [costType, setCostType] = useState('발주비')
  const [costAmount, setCostAmount] = useState('')
  const [costMemo, setCostMemo] = useState('')
  function addCost() {
    const amount = Number(costAmount.replaceAll(',', ''))
    if (!amount) {
      onToast('비용 금액을 입력해 주세요')
      return
    }
    setCosts((current) => [{ type: costType, memo: costMemo || `${costType} 지출`, amount, date: '방금 전' }, ...current])
    setCostAmount('')
    setCostMemo('')
    onToast('비용 내역이 저장됐어요')
  }

  const monthlyCost = 7820000 + costs.slice(3).reduce((total, item) => total + item.amount, 0)

  return (
    <article className="simple-panel cost-panel">
      <div className="cost-heading">
        <div><span className="panel-title-icon amber"><Icon name="package" size={18} /></span><div><h2>비용 관리</h2><p>발주와 매장 운영에 사용한 비용을 기록하세요.</p></div></div>
        <div className="cost-total"><small>8월 누적 비용</small><strong>{monthlyCost.toLocaleString()}원</strong><span>예산 12,000,000원 중 {Math.round(monthlyCost / 12000000 * 100)}%</span></div>
      </div>
      <div className="budget-progress"><i style={{ width: `${Math.min(monthlyCost / 12000000 * 100, 100)}%` }} /></div>
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
          <button className="cost-submit" onClick={addCost}>비용 저장하기</button>
        </div>
        <div className="cost-history">
          <div><h3>최근 지출 내역</h3><button>전체 보기 <Icon name="chevron" size={14} /></button></div>
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

function ScheduleForm({ day, onCancel, onSave }: { day: number; onCancel: () => void; onSave: (item: Omit<ScheduleItem, 'id'>) => void }) {
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('09:00')
  const [category, setCategory] = useState<ScheduleCategory>('체크')
  const [detail, setDetail] = useState('')
  const [scheduleDay, setScheduleDay] = useState(day)
  return (
    <div className="schedule-form">
      <label><span>일정 이름</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: C업체 발주" /></label>
      <div className="schedule-form-row">
        <label><span>날짜</span><select value={scheduleDay} onChange={(event) => setScheduleDay(Number(event.target.value))}>{Array.from({ length: 31 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>8월 {value}일</option>)}</select></label>
        <label><span>시간</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
      </div>
      <div className="schedule-categories">{(['발주', '체크', '마감', '기타'] as const).map((value) => <button key={value} type="button" className={category === value ? `active ${scheduleTone[value]}` : ''} onClick={() => setCategory(value)}>{value}</button>)}</div>
      <label><span>메모 (선택)</span><input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="예: 추천 발주 5개 품목" /></label>
      <div className="schedule-form-actions"><button type="button" onClick={onCancel}>취소</button><button type="button" className="primary" disabled={!title.trim() || !time} onClick={() => onSave({ day: scheduleDay, time, title: title.trim(), category, detail: detail.trim() })}>일정 저장</button></div>
    </div>
  )
}

function ManagementPage({ onToast, onSendIssue, checklist, schedules, setSchedules }: { onToast: (message: string) => void; onSendIssue: (issue: IssueItem) => void; checklist: ChecklistState; schedules: ScheduleItem[]; setSchedules: Dispatch<SetStateAction<ScheduleItem[]>> }) {
  const [selectedDay, setSelectedDay] = useState(todayDay)
  const [adding, setAdding] = useState(false)
  const daySchedules = sortSchedules(schedules.filter((item) => item.day === selectedDay))
  const weekday = ['토', '일', '월', '화', '수', '목', '금'][selectedDay % 7]

  return (
    <section className="management-page">
      <div className="subpage-heading">
        <div><p>역삼점 운영</p><h1>매장 관리</h1><span>오늘의 업무와 일정을 한 번에 확인하세요.</span></div>
        <button><Icon name="calendar" size={17} /> 2026년 8월</button>
      </div>

      <div className="management-checklist-full">
        <DailyChecklist onToast={onToast} onSendIssue={onSendIssue} checklist={checklist} />
      </div>

      <article className="simple-panel calendar-panel">
        <div className="calendar-heading"><div><h2>8월 일정</h2><p>재고 발주와 주간 필수 일정을 확인하세요.</p></div><div><button><Icon name="chevron" size={16} /></button><b>2026년 8월</b><button><Icon name="chevron" size={16} /></button></div></div>
        <div className="calendar-layout">
          <div className="calendar">
            <div className="weekdays">{['일', '월', '화', '수', '목', '금', '토'].map((day) => <b key={day}>{day}</b>)}</div>
            <div className="calendar-grid">
              {calendarDays.map((item, index) => {
                const events = item.muted ? [] : sortSchedules(schedules.filter((schedule) => schedule.day === item.day))
                return (
                  <button key={`${item.day}-${index}`} className={`${item.muted ? 'muted' : ''} ${item.today ? 'today' : ''} ${!item.muted && item.day === selectedDay ? 'selected' : ''}`} disabled={item.muted} onClick={() => { setSelectedDay(item.day); setAdding(false) }}>
                    <span>{item.day}</span>
                    {events[0] && <small className={scheduleTone[events[0].category]}>{events[0].title}</small>}
                    {events.length > 1 && <em className="more-events">+{events.length - 1}</em>}
                  </button>
                )
              })}
            </div>
          </div>
          <aside className="schedule-list">
            <div className="schedule-date"><b>{selectedDay}</b><span>8월 {weekday}요일<small>{selectedDay === todayDay ? '오늘 ' : ''}일정 {daySchedules.length}개</small></span></div>
            {daySchedules.length === 0 && <p className="schedule-empty">등록된 일정이 없어요.</p>}
            {daySchedules.map((item) => (
              <div key={item.id} className={`schedule-item ${scheduleTone[item.category]}`}><i /><span><small>{item.time} · {item.category}</small><b>{item.title}</b>{item.detail && <p>{item.detail}</p>}</span><button type="button" className="schedule-delete" aria-label={`${item.title} 삭제`} onClick={() => { setSchedules((current) => current.filter((schedule) => schedule.id !== item.id)); onToast('일정을 삭제했어요') }}><Icon name="close" size={13} /></button></div>
            ))}
            {adding
              ? <ScheduleForm day={selectedDay} onCancel={() => setAdding(false)} onSave={(item) => { setSchedules((current) => [...current, { ...item, id: Date.now() }]); setSelectedDay(item.day); setAdding(false); onToast(`8월 ${item.day}일 ${item.time} 일정을 추가했어요`) }} />
              : <button className="add-schedule" onClick={() => setAdding(true)}>+ 일정 추가</button>}
          </aside>
        </div>
      </article>
    </section>
  )
}

type SentItem = { id: number; title: string; sentAt: string; summary: string; urgency?: IssueItem['urgency'] }

function SentHistoryItem({ item, badge, onSave, onDelete }: { item: SentItem; badge: ReactNode; onSave: (patch: Partial<SentItem>) => void; onDelete: () => void }) {
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
        <div className="history-actions"><button onClick={() => setMode('view')}>취소</button><button className="primary" disabled={!title.trim()} onClick={() => { onSave({ title: title.trim(), summary: summary.trim(), urgency }); setMode('view') }}>저장</button></div>
      </article>
    )
  }

  return (
    <article>
      <div><b>{item.title}</b>{badge}</div>
      <small>{item.sentAt}</small>
      <p>{item.summary}</p>
      {mode === 'delete'
        ? <div className="history-actions confirm"><span>삭제하면 SV 화면에서도 사라져요.</span><button onClick={() => setMode('view')}>취소</button><button className="danger" onClick={onDelete}>삭제</button></div>
        : <div className="history-actions"><button onClick={startEdit}>수정</button><button onClick={() => setMode('delete')}>삭제</button></div>}
    </article>
  )
}

function ReportPage({ costs, setCosts, myReports, myIssues, setReports, setIssues, onToast, onSendReport, onSendIssue }: { costs: CostItem[]; setCosts: Dispatch<SetStateAction<CostItem[]>>; myReports: ReportItem[]; myIssues: IssueItem[]; setReports: Dispatch<SetStateAction<ReportItem[]>>; setIssues: Dispatch<SetStateAction<IssueItem[]>>; onToast: (message: string) => void; onSendReport: (report: ReportItem) => void; onSendIssue: (issue: IssueItem) => void }) {
  const [compose, setCompose] = useState<'report' | 'issue' | null>(null)
  const [history, setHistory] = useState<'report' | 'issue' | null>(null)
  const [reportTitle, setReportTitle] = useState('8월 2주차 역삼점 주간 운영 보고')
  const [reportMemo, setReportMemo] = useState('이번 주 매출은 전주 대비 12.4% 증가했습니다. 점심 시간 대기 리뷰가 늘어 피크 시간 인력 보강이 필요합니다.')
  const [issueTitle, setIssueTitle] = useState('')
  const [issueMemo, setIssueMemo] = useState('')
  const categoryTotal = (type: string) => costs.filter((cost) => cost.type === type).reduce((sum, cost) => sum + cost.amount, 0)

  function sendReport() {
    onSendReport({ id: Date.now(), title: reportTitle, store: '역삼점', sentAt: '방금 전', summary: reportMemo, unread: true })
    setCompose(null)
    onToast('주간 보고서를 SV에게 보냈어요')
  }

  function sendIssue() {
    if (!issueTitle.trim()) {
      onToast('이슈 제목을 입력해 주세요')
      return
    }
    onSendIssue({ id: Date.now(), title: issueTitle, store: '역삼점', sentAt: '방금 전', summary: issueMemo || '점장이 운영 이슈 확인을 요청했습니다.', urgency: '긴급' })
    setCompose(null)
    setIssueTitle('')
    setIssueMemo('')
    onToast('운영 이슈를 SV에게 전달했어요')
  }

  return (
    <section className="management-page report-page">
      <div className="subpage-heading"><div><p>역삼점 운영 데이터</p><h1>보고</h1><span>매출과 비용, 고객 리뷰를 확인하고 필요한 내용을 SV에게 전달하세요.</span></div></div>
      <div className="compose-options">
        <article><span className="compose-icon report"><Icon name="report" size={20} /></span><div><b>주간 보고서 작성</b><p>한 주의 매출·비용·리뷰를 정리해서 보내요.</p></div><span className="compose-actions"><button className="primary" onClick={() => setCompose('report')}>작성하기 <Icon name="chevron" size={14} /></button><button onClick={() => setHistory('report')}>내 보고서 보기 <em>{myReports.length}</em></button></span></article>
        <article><span className="compose-icon issue"><Icon name="alert" size={20} /></span><div><b>운영 이슈 작성</b><p>긴급하거나 도움이 필요한 문제를 바로 전달해요.</p></div><span className="compose-actions"><button className="primary" onClick={() => setCompose('issue')}>작성하기 <Icon name="chevron" size={14} /></button><button onClick={() => setHistory('issue')}>내 이슈 보기 <em>{myIssues.length}</em></button></span></article>
      </div>
      <div className="report-overview-grid">
        <article className="simple-panel sales-panel report-sales-panel">
          <div className="simple-panel-title"><div><span className="panel-title-icon violet"><Icon name="chart" size={18} /></span><div><h2>매출 현황</h2><p>8월 12일 수요일 · 실시간</p></div></div><Badge tone="good">목표 84%</Badge></div>
          <div className="sales-total"><span><small>현재 매출</small><strong>3,248,000원</strong></span><span><small>오늘 목표</small><b>3,850,000원</b></span></div>
          <div className="sales-chart">{[22, 33, 28, 47, 65, 52, 76, 88, 72, 94, 82, 96].map((height, index) => <i key={index} style={{ height: `${height}%` }} className={index === 9 ? 'peak' : ''} />)}</div>
          <div className="sales-labels"><span>10시</span><span>13시</span><span>16시</span><span>현재</span></div>
          <div className="sales-meta"><span><small>전주 동시간 대비</small><b className="up">+12.4%</b></span><i /><span><small>객단가</small><b>18,320원</b></span><i /><span><small>주문</small><b>177건</b></span></div>
        </article>
        <article className="simple-panel cost-breakdown-panel">
          <div className="simple-panel-title"><div><span className="panel-title-icon amber"><Icon name="package" size={18} /></span><div><h2>비용 구성</h2><p>점장 입력 비용 기준</p></div></div><strong>{costs.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}원</strong></div>
          <div className="cost-donut"><div><span>{costs.length}</span><small>입력 건수</small></div></div>
          <div className="cost-legend">
            {['발주비', '재료비', '인건비', '기타'].map((type, index) => <div key={type}><i className={`tone-${index}`} /><span>{type}</span><b>{categoryTotal(type).toLocaleString()}원</b></div>)}
          </div>
          <div className="cost-ai-note"><Icon name="sparkle" size={14} /><p><b>AI 비용 분석</b><span>긴급 재료 구매 비용이 지난주보다 16% 높아요.</span></p></div>
        </article>
      </div>
      <CostPanel costs={costs} setCosts={setCosts} onToast={onToast} />
      <div className="report-review-heading"><div><h2>리뷰 확인</h2><p>최근 7일 고객 반응과 AI 요약</p></div><Badge tone="info">총 24건</Badge></div>
      <article className="review-summary-card">
        <div className="review-summary-top"><span><Icon name="sparkle" size={18} /></span><div><Badge tone="info">AI 요약</Badge><h2>이번 주 리뷰 핵심</h2></div></div>
        <p>전체 평점은 안정적이지만, 점심 시간대 <b>대기 시간</b> 관련 불만이 5건으로 늘었어요. 반면 직원 친절도에 대한 긍정 리뷰는 지난주보다 18% 증가했습니다.</p>
        <div className="review-keywords"><span>대기 시간 5건</span><span>직원 친절 8건</span><span>메뉴 누락 2건</span></div>
      </article>
      <div className="review-list-simple">
        <article><div><Avatar text="N" /><span><b>네이버 리뷰</b><small>오늘 12:42 · 별점 2.0</small></span><strong>★★☆☆☆</strong></div><p>점심시간이라 그런지 주문하고 25분 넘게 기다렸어요. 음식은 맛있었습니다.</p><span><Icon name="sparkle" size={13} /> AI 분류: 대기 시간</span></article>
        <article><div><Avatar text="배" /><span><b>배달의민족 리뷰</b><small>어제 19:20 · 별점 5.0</small></span><strong>★★★★★</strong></div><p>포장도 깔끔하고 직원분이 정말 친절했어요. 다음에도 주문할게요.</p><span className="positive"><Icon name="sparkle" size={13} /> AI 분류: 직원 응대</span></article>
      </div>
      {history && <div className="report-modal-backdrop" onClick={() => setHistory(null)}>
        <div className="report-modal" onClick={(event) => event.stopPropagation()}>
          <div className="report-modal-heading"><div><Badge tone={history === 'report' ? 'info' : 'critical'}>보낸 내역</Badge><h2>{history === 'report' ? '내가 쓴 주간 보고서' : '내가 쓴 운영 이슈'}</h2><p>SV에게 전달한 {history === 'report' ? '보고서' : '이슈'}를 최신순으로 보여줘요.</p></div><button onClick={() => setHistory(null)} aria-label="닫기"><Icon name="close" size={18} /></button></div>
          <div className="my-history-list">
            {(history === 'report' ? myReports : myIssues).length === 0 && <p className="my-history-empty">아직 보낸 {history === 'report' ? '보고서' : '이슈'}가 없어요.</p>}
            {history === 'report'
              ? myReports.map((report) => <SentHistoryItem key={report.id} item={report} badge={<Badge tone={report.unread ? 'neutral' : 'good'}>{report.unread ? 'SV 확인 전' : 'SV 확인함'}</Badge>}
                  onSave={(patch) => { setReports((current) => current.map((item) => item.id === report.id ? { ...item, title: patch.title ?? item.title, summary: patch.summary ?? item.summary } : item)); onToast('보고서를 수정했어요') }}
                  onDelete={() => { setReports((current) => current.filter((item) => item.id !== report.id)); onToast('보고서를 삭제했어요') }} />)
              : myIssues.map((issue) => <SentHistoryItem key={issue.id} item={issue} badge={<Badge tone={issue.urgency === '긴급' ? 'critical' : 'warning'}>{issue.urgency}</Badge>}
                  onSave={(patch) => { setIssues((current) => current.map((item) => item.id === issue.id ? { ...item, title: patch.title ?? item.title, summary: patch.summary ?? item.summary, urgency: patch.urgency ?? item.urgency } : item)); onToast('이슈를 수정했어요') }}
                  onDelete={() => { setIssues((current) => current.filter((item) => item.id !== issue.id)); onToast('이슈를 삭제했어요') }} />)}
          </div>
          <div className="report-modal-actions"><button onClick={() => setHistory(null)}>닫기</button><button onClick={() => { setCompose(history); setHistory(null) }}><Icon name="send" size={15} /> 새로 작성하기</button></div>
        </div>
      </div>}

      {compose === 'report' && <div className="report-modal-backdrop">
        <div className="report-modal">
          <div className="report-modal-heading"><div><Badge tone="info"><Icon name="sparkle" size={11} /> AI 초안</Badge><h2>주간 보고서 작성</h2><p>운영 데이터를 바탕으로 초안을 만들었어요.</p></div><button onClick={() => setCompose(null)}><Icon name="close" size={18} /></button></div>
          <div className="report-form">
            <label><span>보고서 제목</span><input value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} /></label>
            <div className="report-auto-summary"><span><b>이번 주 매출</b><strong>+12.4%</strong></span><span><b>총 비용</b><strong>{costs.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}원</strong></span><span><b>업무 이행률</b><strong>82%</strong></span><span><b>리뷰 평점</b><strong>4.3</strong></span></div>
            <label><span>운영 요약 및 특이사항</span><textarea rows={5} value={reportMemo} onChange={(event) => setReportMemo(event.target.value)} /></label>
            <div className="report-tasks"><span>다음 주 조치 계획</span><label><input type="checkbox" defaultChecked /> 점심 피크 시간 근무자 1명 추가</label><label><input type="checkbox" defaultChecked /> 긴급 발주 원인 및 안전재고 점검</label><label><input type="checkbox" /> 냉장고 2번 수리 일정 확인</label></div>
          </div>
          <div className="report-modal-actions"><button onClick={() => setCompose(null)}>취소</button><button onClick={sendReport}><Icon name="send" size={15} /> 주간 보고서 SV에게 보내기</button></div>
        </div>
      </div>}
      {compose === 'issue' && <div className="report-modal-backdrop">
        <div className="report-modal issue-compose-modal">
          <div className="report-modal-heading"><div><Badge tone="critical">SV 확인 요청</Badge><h2>운영 이슈 작성</h2><p>매장에서 해결하기 어려운 문제를 바로 전달하세요.</p></div><button onClick={() => setCompose(null)}><Icon name="close" size={18} /></button></div>
          <div className="report-form">
            <label><span>이슈 유형</span><div className="issue-type-options"><button className="active">장비</button><button>인력</button><button>재고·발주</button><button>고객 응대</button><button>기타</button></div></label>
            <label><span>이슈 제목</span><input value={issueTitle} onChange={(event) => setIssueTitle(event.target.value)} placeholder="예: 냉장고 2번 온도 이상" /></label>
            <label><span>상세 내용</span><textarea rows={5} value={issueMemo} onChange={(event) => setIssueMemo(event.target.value)} placeholder="현재 상황과 이미 시도한 조치를 입력해 주세요." /></label>
            <div className="issue-urgency"><span>긴급도</span><div><button>일반</button><button className="active">긴급</button></div><p><Icon name="alert" size={13} /> 긴급 이슈는 SV 보고서함 상단에 표시돼요.</p></div>
            <button className="photo-attachment">+ 사진 또는 증빙 자료 첨부</button>
          </div>
          <div className="report-modal-actions"><button onClick={() => setCompose(null)}>취소</button><button className="issue-send" onClick={sendIssue}><Icon name="send" size={15} /> 이슈 SV에게 전달하기</button></div>
        </div>
      </div>}
    </section>
  )
}

function SvMyPage({ onSwitch }: { onSwitch: () => void }) {
  return (
    <section className="management-page">
      <div className="subpage-heading"><div><p>계정 및 담당 매장</p><h1>MY PAGE</h1><span>내 정보와 담당 매장을 관리하세요.</span></div></div>
      <article className="profile-card-large"><Avatar text="김" /><div><h2>김수현 SV</h2><p>강남 1지역 · 슈퍼바이저</p><span>강남역점 · 역삼점 · 선릉점</span></div><button>프로필 수정</button></article>
      <div className="settings-list">
        <button><span className="panel-title-icon blue"><Icon name="store" size={18} /></span><div><b>담당 매장</b><small>3개 매장 운영 정보</small></div><Icon name="chevron" size={17} /></button>
        <button><span className="panel-title-icon violet"><Icon name="bell" size={18} /></span><div><b>알림 설정</b><small>점장 이슈·보고서 알림</small></div><Icon name="chevron" size={17} /></button>
        <button onClick={onSwitch}><span className="panel-title-icon green"><Icon name="users" size={18} /></span><div><b>점장 화면 보기</b><small>매장 점장 화면으로 전환</small></div><Icon name="chevron" size={17} /></button>
      </div>
    </section>
  )
}

function MyPage({ onSwitch }: { onSwitch: () => void }) {
  return (
    <section className="management-page">
      <div className="subpage-heading"><div><p>계정 및 매장 설정</p><h1>MY PAGE</h1><span>내 정보와 운영 설정을 관리하세요.</span></div></div>
      <article className="profile-card-large"><Avatar text="이" /><div><h2>이도윤 점장</h2><p>역삼점 · 점장</p><span>manager.lee@runn.co.kr</span></div><button>프로필 수정</button></article>
      <div className="settings-list">
        <button><span className="panel-title-icon blue"><Icon name="store" size={18} /></span><div><b>매장 정보</b><small>역삼점 영업시간 및 기본 정보</small></div><Icon name="chevron" size={17} /></button>
        <button><span className="panel-title-icon violet"><Icon name="bell" size={18} /></span><div><b>알림 설정</b><small>긴급 이슈와 일정 알림</small></div><Icon name="chevron" size={17} /></button>
        <button onClick={onSwitch}><span className="panel-title-icon green"><Icon name="board" size={18} /></span><div><b>SV 대시보드 보기</b><small>담당 매장 현황 화면으로 전환</small></div><Icon name="chevron" size={17} /></button>
      </div>
    </section>
  )
}

function ManagerApp({ onSwitch, costs, setCosts, myReports, myIssues, setReports, setIssues, onSendReport, onSendIssue, commands, onCompleteCommand }: { onSwitch: () => void; costs: CostItem[]; setCosts: Dispatch<SetStateAction<CostItem[]>>; myReports: ReportItem[]; myIssues: IssueItem[]; setReports: Dispatch<SetStateAction<ReportItem[]>>; setIssues: Dispatch<SetStateAction<IssueItem[]>>; onSendReport: (report: ReportItem) => void; onSendIssue: (issue: IssueItem) => void; commands: CommandItem[]; onCompleteCommand: (id: number) => void }) {
  const [active, setActive] = useState('홈')
  const [toast, setToast] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [statuses, setStatuses] = useState<Record<string, CheckStatus>>({})
  const [sentKeys, setSentKeys] = useState<string[]>([])
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules)
  const checklist: ChecklistState = { values, setValues, statuses, setStatuses, sentKeys, setSentKeys }

  const pending = commands.filter((command) => !command.done)
  const todaySchedules = sortSchedules(schedules.filter((item) => item.day === todayDay))
  const phaseDone = (key: ChecklistPhaseKey) => managerChecklist.filter((item) => phaseOf(item) === key && statuses[item.id]).length
  const phaseTotal = (key: ChecklistPhaseKey) => managerChecklist.filter((item) => phaseOf(item) === key).length
  const checkDone = phaseDone('open') + phaseDone('close')
  const checkRate = Math.round(checkDone / managerChecklist.length * 100)

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  return (
    <div className="manager-bg">
      <div className="manager-shell">
        <header className="manager-header">
          <div className="manager-brand"><span className="brand-mark small"><span /><span /><span /></span><b>RUNN</b></div>
          <div className="manager-tools">
            <button className="role-pill manager-role" onClick={onSwitch}>SV 대시보드</button>
            <button className="icon-button" aria-label="알림"><Icon name="bell" size={20} /><i /></button>
            <Avatar text="이" />
          </div>
        </header>

        <main className="manager-main">
          {active === '홈' ? (
            <>
              <section className="manager-welcome">
                <p>8월 12일 수요일 · 역삼점</p>
                <h1>좋은 아침이에요, 이도윤님</h1>
                <span>오늘 꼭 필요한 일만 모아뒀어요.</span>
              </section>

              <section className="today-summary">
                <div><span className="summary-icon red"><Icon name="alert" size={19} /></span><p><b>{pending.length}</b><small>지금 처리</small></p></div>
                <i />
                <div><span className="summary-icon amber"><Icon name="clock" size={19} /></span><p><b>{todaySchedules.length}</b><small>오늘 일정</small></p></div>
                <i />
                <div><span className="summary-icon mint"><Icon name="check" size={19} /></span><p><b>{checkRate}%</b><small>체크 달성</small></p></div>
              </section>

              <section className="manager-section">
                <div className="manager-section-title"><div><h2>지금 처리해 주세요</h2><span className="count-badge">{pending.length}</span></div><small>SV 요청</small></div>
                <div className="manager-cards">
                  {pending.map((command) => (
                    <article key={command.id} className="task-card task-critical command-card">
                      <div className="task-top"><span className="task-icon"><Icon name="send" /></span><div><Badge tone="critical">SV 요청</Badge><Badge tone="neutral">{command.source} 답변</Badge></div></div>
                      <h3>{command.title}</h3>
                      <p>{command.source}: {command.refTitle}</p>
                      <div className="evidence-panel"><span><small>요청 시각</small><b>{command.sentAt}</b></span><i /><span><small>처리 기한</small><b>{command.due ? `오늘 ${command.due}까지` : '기한 없음'}</b></span></div>
                      <button className="primary-action" onClick={() => { onCompleteCommand(command.id); showToast('처리 완료를 SV에게 알렸어요') }}>처리 완료 <Icon name="arrow" size={17} /></button>
                    </article>
                  ))}
                  {pending.length === 0 && <div className="all-clear"><span><Icon name="arrow" /></span><h3>SV 요청을 모두 처리했어요</h3><p>보고서나 이슈에 SV가 조치를 요청하면 여기에 표시돼요.</p></div>}
                </div>
              </section>

              <section className="manager-section deadline-section">
                <div className="manager-section-title"><div><h2>오늘 이런 일정이 있어요</h2><span className="count-badge neutral">{todaySchedules.length + 1}</span></div><small>시간순</small></div>
                <div className="deadline-list">
                  <button onClick={() => setActive('관리')}><span className="deadline-time"><b>{checkRate}%</b><small>체크 달성률</small></span><span className="deadline-copy"><b>관리자 일일 체크리스트</b><small>오픈 {phaseDone('open')}/{phaseTotal('open')} · 마감 {phaseDone('close')}/{phaseTotal('close')}</small><span className="check-rate-bar"><i style={{ width: `${checkRate}%` }} /></span></span><span className="progress-ring" style={{ background: `conic-gradient(#4770c8 ${checkRate * 3.6}deg, #dbe4f8 0deg)` }}><em>{checkDone}/{managerChecklist.length}</em></span><Icon name="chevron" size={17} /></button>
                  {todaySchedules.map((item) => (
                    <button key={item.id} onClick={() => setActive('관리')}><span className={`deadline-time ${item.category === '발주' ? 'urgent' : ''}`}><b>{item.time}</b><small>{item.category}</small></span><span className="deadline-copy"><b>{item.title}</b><small>{item.detail || '캘린더 일정'}</small></span><span /><Icon name="chevron" size={17} /></button>
                  ))}
                </div>
              </section>
            </>
          ) : active === '관리' ? <ManagementPage onToast={showToast} onSendIssue={onSendIssue} checklist={checklist} schedules={schedules} setSchedules={setSchedules} /> : active === '보고' ? <ReportPage costs={costs} setCosts={setCosts} myReports={myReports} myIssues={myIssues} setReports={setReports} setIssues={setIssues} onToast={setToast} onSendReport={onSendReport} onSendIssue={onSendIssue} /> : <MyPage onSwitch={onSwitch} />}
        </main>

        <nav className="bottom-nav" aria-label="점장 메뉴">
          {managerNav.map((item) => (
            <button key={item.label} className={active === item.label ? 'active' : ''} onClick={() => setActive(item.label)}>
              <span><Icon name={item.icon} size={21} />{item.label === '관리' && <i>4</i>}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
        {toast && <div className="toast"><Icon name="arrow" size={15} /> {toast}</div>}
      </div>
    </div>
  )
}

const managerStore = '역삼점'

export default function App() {
  const [view, setView] = useState<'dashboard' | 'manager'>('manager')
  const [costs, setCosts] = useState<CostItem[]>(initialCosts)
  const [reports, setReports] = useState<ReportItem[]>(initialReports)
  const [managerIssues, setManagerIssues] = useState<IssueItem[]>(initialIssues)
  const [commands, setCommands] = useState<CommandItem[]>(initialCommands)
  return <div className="mobile-frame"><div className="mobile-scroll">{view === 'dashboard'
    ? <Dashboard onSwitch={() => setView('manager')} costs={costs} reports={reports} managerIssues={managerIssues} commands={commands} onSendCommand={(command) => setCommands((current) => [command, ...current])} />
    : <ManagerApp onSwitch={() => setView('dashboard')} costs={costs} setCosts={setCosts} myReports={reports.filter((report) => report.store === managerStore)} myIssues={managerIssues.filter((issue) => issue.store === managerStore)} setReports={setReports} setIssues={setManagerIssues} onSendReport={(report) => setReports((current) => [report, ...current])} onSendIssue={(issue) => setManagerIssues((current) => [issue, ...current])} commands={commands} onCompleteCommand={(id) => setCommands((current) => current.map((command) => command.id === id ? { ...command, done: true } : command))} />}</div></div>
}
