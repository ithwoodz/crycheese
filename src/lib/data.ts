import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type StoreSummary = {
  id: string
  name: string
  location: string
  issues: number
  waste: string
  rate: string
  grade: string
  color: string
  trend: string
  wasteOver: boolean
}

export type Finding = {
  id: string
  title: string
  store: string
  status: string
  tone: 'critical' | 'warning' | 'info' | 'neutral'
  source: string
  value: string
}

export type WeeklyReport = {
  id: string
  title: string
  store: string
  sentAt: string
  summary: string
  unread: boolean
}

export type DashboardData = {
  stores: StoreSummary[]
  findings: Finding[]
  weeklyReports: WeeklyReport[]
  source: 'supabase' | 'sample'
}

const colors = ['blue', 'orange', 'green']
const flatTrend = '4,10 18,10 32,10 46,10 60,10 74,10 88,10 102,10'

export const sampleData: DashboardData = {
  source: 'sample',
  stores: [
    { id: 'S01', name: '강남역점', location: '서울 강남구', issues: 4, waste: '0.7%', rate: '96%', grade: 'A', color: 'blue', trend: '4,14 18,11 32,13 46,7 60,9 74,5 88,8 102,4', wasteOver: false },
    { id: 'S02', name: '역삼점', location: '서울 강남구', issues: 7, waste: '1.4%', rate: '82%', grade: 'B', color: 'orange', trend: '4,5 18,7 32,6 46,12 60,10 74,15 88,12 102,17', wasteOver: true },
    { id: 'S03', name: '선릉점', location: '서울 강남구', issues: 2, waste: '0.5%', rate: '98%', grade: 'A', color: 'green', trend: '4,12 18,9 32,11 46,8 60,5 74,7 88,3 102,5', wasteOver: false },
  ],
  findings: [
    { id: 'F1', title: '냉장고 온도 기준 이탈', store: '역삼점', status: '기한 초과', tone: 'critical', source: '온도', value: '7.2℃' },
    { id: 'F2', title: '주간 폐기율 기준 초과', store: '역삼점', status: '확인 대기', tone: 'warning', source: '재고', value: '1.4%' },
    { id: 'F3', title: '대기 시간 리뷰 반복', store: '강남역점', status: '조치 중', tone: 'info', source: '리뷰', value: '5건' },
    { id: 'F4', title: '마감 체크 미완료', store: '선릉점', status: '열림', tone: 'neutral', source: '체크', value: '2개' },
  ],
  weeklyReports: [],
}

// CSV-imported flags arrive as text; accept the common truthy spellings.
function isYes(value: string | null | undefined) {
  return ['y', 'yes', 'o', '1', 'true', '완료', '예'].includes(String(value ?? '').trim().toLowerCase())
}

function percent(value: number | null | undefined) {
  if (value == null) return null
  return value <= 1 ? value * 100 : value
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

function findingSource(category: string | null) {
  const text = category ?? ''
  if (/온도|냉장|냉동/.test(text)) return '온도'
  if (/폐기|재고|발주/.test(text)) return '재고'
  if (/서비스|고객|리뷰/.test(text)) return '리뷰'
  return '체크'
}

async function loadFromSupabase(): Promise<DashboardData | null> {
  if (!supabase) return null

  const [storesRes, reportsRes, visitsRes, findingsRes] = await Promise.all([
    supabase.from('t2_c01_stores').select('store_id, store_name, trade_area'),
    supabase.from('t2_r14_weekly_reports').select('week_start, store_id, self_check_score, self_check_max, daily_task_miss_rate, waste_rate_pct, waste_over_1pct, manager_opinion').order('week_start', { ascending: false }),
    supabase.from('t2_r11_supervisor_visits').select('store_id, date, grade').order('date', { ascending: false }),
    supabase.from('t2_r13_findings_actions').select('finding_id, store_id, category, finding, due_date, completed, recurrence_of').order('due_date', { ascending: true }),
  ])

  const error = storesRes.error ?? reportsRes.error ?? visitsRes.error ?? findingsRes.error
  if (error) {
    console.warn('[supabase] 데이터 조회 실패, 샘플 데이터 사용:', error.message)
    return null
  }
  if (!storesRes.data?.length) return null

  const storeName = new Map(storesRes.data.map((s) => [s.store_id, s.store_name ?? s.store_id]))
  const latestReport = new Map<string, NonNullable<typeof reportsRes.data>[number]>()
  for (const row of reportsRes.data ?? []) if (row.store_id && !latestReport.has(row.store_id)) latestReport.set(row.store_id, row)
  const latestGrade = new Map<string, string>()
  for (const row of visitsRes.data ?? []) if (row.store_id && row.grade && !latestGrade.has(row.store_id)) latestGrade.set(row.store_id, row.grade)

  const today = new Date().toISOString().slice(0, 10)
  const openFindings = (findingsRes.data ?? []).filter((f) => !isYes(f.completed))

  const stores: StoreSummary[] = storesRes.data.map((s, index) => {
    const report = s.store_id ? latestReport.get(s.store_id) : undefined
    const waste = percent(report?.waste_rate_pct)
    const miss = percent(report?.daily_task_miss_rate)
    return {
      id: s.store_id ?? String(index),
      name: s.store_name ?? s.store_id ?? '-',
      location: s.trade_area ?? '',
      issues: openFindings.filter((f) => f.store_id === s.store_id).length,
      waste: waste == null ? '-' : `${waste.toFixed(1)}%`,
      rate: miss == null ? '-' : `${Math.round(100 - miss)}%`,
      grade: (s.store_id && latestGrade.get(s.store_id)) || '-',
      color: colors[index % colors.length],
      trend: flatTrend,
      wasteOver: isYes(report?.waste_over_1pct) || (waste ?? 0) > 1,
    }
  })

  const findings: Finding[] = openFindings.map((f, index) => {
    const overdue = !!f.due_date && f.due_date < today
    return {
      id: f.finding_id ?? String(index),
      title: f.finding ?? '지적 사항',
      store: storeName.get(f.store_id) ?? f.store_id ?? '-',
      status: overdue ? '기한 초과' : f.recurrence_of ? '반복' : '조치 중',
      tone: overdue ? 'critical' : f.recurrence_of ? 'warning' : 'info',
      source: findingSource(f.category),
      value: f.due_date ? `~${formatDate(f.due_date)}` : '',
    }
  })

  const weeklyReports: WeeklyReport[] = [...latestReport.values()].map((r) => {
    const name = storeName.get(r.store_id) ?? r.store_id ?? '-'
    return {
      id: `${r.store_id}-${r.week_start}`,
      title: `${formatDate(r.week_start)} 주간 ${name} 운영 보고`,
      store: name,
      sentAt: formatDate(r.week_start),
      summary: r.manager_opinion ?? `자가진단 ${r.self_check_score ?? '-'}/${r.self_check_max ?? '-'}점 · 폐기율 ${r.waste_rate_pct ?? '-'}%`,
      unread: false,
    }
  })

  return { stores, findings, weeklyReports, source: 'supabase' }
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(sampleData)

  useEffect(() => {
    let cancelled = false
    loadFromSupabase()
      .then((result) => {
        if (!cancelled && result) setData(result)
      })
      .catch((error) => console.warn('[supabase] 연결 실패, 샘플 데이터 사용:', error))
    return () => {
      cancelled = true
    }
  }, [])

  return data
}
