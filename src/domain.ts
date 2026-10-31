export type Row = Record<string, any>

export type Role = "manager" | "sv"

export type Result = "pass" | "fail" | "warning" | "unrated"

export type Session = { role: Role; storeId: string }

export type Issue = {
  id: string
  source_key: string
  store_id: string
  business_date: string
  title: string
  kind: string
  severity: string
  status: string
  description: string
  value: number | null
  standard: string
  item_id: string
  source: Row
  due_date?: string | null
  owner?: string | null
  version?: number
  note?: string
  verification_note?: string
  quality?: string
  action?: Row
}

export type Metrics = {
  store_id: string
  sales: number
  previousSales: number
  monthSales: number
  waste: number
  wasteRate: number | null
  taskDone: number
  taskTotal: number
  taskRate: number
  temperatureFailures: number
  temperatureMissing: number
  numericMeasurements: number
  openIssues: number
  servicePct: number | null
  serviceGrade: string
  costs: number
  hasSales: boolean
  hasMonthSales: boolean
}

export type Snapshot = {
  session: Session
  date: string
  weekStart: string
  periodStart: string
  periodEnd: string
  loadedAt: string
  stores: Row[]
  standards: Row[]
  taskTemplates: Row[]
  expiryItems: Row[]
  equipmentItems: Row[]
  ingredients: Row[]
  suppliers: Row[]
  prices: Row[]
  temperatures: Row[]
  acid: Row[]
  expiry: Row[]
  equipment: Row[]
  tasks: Row[]
  observations: Row[]
  checks: Row[]
  actions: Row[]
  events: Row[]
  costs: Row[]
  reports: Row[]
  orders: Row[]
  inventory: Row[]
  lots: Row[]
  findings: Row[]
  waste: Row[]
  sales: Row[]
  metrics: Metrics[]
  issues: Issue[]
  quality: { expiryConflicts: number; invalidCompletionDates: number }
  sourceFiles: number
}

export const statusLabels: Record<string, string> = {
  open: "열림",
  assigned: "담당 배정",
  in_progress: "조치 중",
  awaiting_verification: "검증 대기",
  closed: "검증 종결",
  legacy_complete: "과거 완료 표시",
  data_review: "데이터 확인",
}

export const resultLabels: Record<string, string> = {
  pass: "적합",
  fail: "기준 이탈",
  warning: "주의",
  unrated: "수치 기준 없음",
}

export const isoDay = (d: Date) => d.toISOString().slice(0, 10)

export function validDay(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= '0001-01-01' &&
    Number.isFinite(Date.parse(`${day}T12:00:00Z`)) &&
    new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) === day
}

export function applyCheck(snapshot: Snapshot, store: string, date: string, item: string, done: boolean): Snapshot {
  if (snapshot.date !== date) return snapshot
  const existing = snapshot.checks.find(c => c.store_id === store && c.business_date === date && c.item_id === item)
  const source = snapshot.tasks.find(c => c.store_id === store && c.item_id === item)
  const before = existing ? existing.done : source?.done === 'Y'
  const delta = Number(done) - Number(before)
  return {
    ...snapshot,
    checks: [...snapshot.checks.filter(c => !(c.store_id === store && c.business_date === date && c.item_id === item)),
      {store_id: store, business_date: date, item_id: item, done}],
    metrics: snapshot.metrics.map(m => m.store_id !== store ? m : {...m,
      taskDone: Math.max(0, Math.min(m.taskTotal, m.taskDone + delta)),
      taskRate: m.taskTotal ? Math.max(0, Math.min(m.taskTotal, m.taskDone + delta)) / m.taskTotal * 100 : 0,
    }),
  }
}

export const addDays = (day: string, amount: number) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + amount)
  return isoDay(d)
}

export const monday = (day: string) => {
  const d = new Date(`${day}T12:00:00Z`)
  return addDays(day, -((d.getUTCDay() + 6) % 7))
}

export const money = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`

export const percent = (n: number | null, digits = 1) =>
  n === null ? "계산 불가" : `${n.toFixed(digits)}%`

export function temperatureResult(value: number, item: Row): Result {
  if (item.min_c === null && item.max_c === null) return "unrated"

  return (item.min_c !== null && value < Number(item.min_c)) ||
    (item.max_c !== null && value > Number(item.max_c))
    ? "fail"
    : "pass"
}

export const acidResult = (value: number): Result =>
  value > 3 ? "fail" : value > 2.5 ? "warning" : "pass"

export const sourceKey = (
  kind: string,
  store: string,
  date: string,
  item: string,
) => `${kind}:${store}:${date}:${item}`

export function deriveIssues(
  data: Pick<Snapshot, "temperatures" | "standards" | "acid" | "expiry" | "findings" | "actions" | "observations">,
  date: string,
): Issue[] {
  const items = new Map(data.standards.map((x) => [x.item_id, x]))
  const result: Issue[] = []

  const add = (issue: Issue) => {
    if (!data.actions.some((a) => a.source_key === issue.source_key))
      result.push(issue)
  }

  for (const row of data.temperatures) {
    const item = items.get(row.item_id)
    if (!item) continue

    const key = sourceKey("temperature", row.store_id, row.date, row.item_id)

    const newValue = data.observations.find(
      (o) =>
        o.kind === "temperature" &&
        o.item_id === row.item_id &&
        o.store_id === row.store_id &&
        o.business_date === row.date,
    )

    if (row.recorded === "N" && newValue) continue

    if (
      row.recorded === "Y" &&
      temperatureResult(Number(row.value_c), item) !== "fail"
    )
      continue

    add({
      id: key,
      source_key: key,
      store_id: row.store_id,
      business_date: row.date,
      title: `${item.item} ${
        row.recorded === "N" ? "온도 미기록" : "온도 기준 이탈"
      }`,
      kind: "temperature",
      severity: row.recorded === "N" ? "warning" : "critical",
      status: "open",
      description: `${row.measure_time} / ${item.storage}`,
      value: row.recorded === "N" ? null : Number(row.value_c),
      standard: item.standard,
      item_id: row.item_id,
      source: { table: "t2_r03_temperature_records", ...row, template: item },
    })
  }

  for (const row of data.acid) {
    const result =
      row.recorded === "N" ? "missing" : acidResult(Number(row.acid_value))
    if (result === "pass") continue

    const key = sourceKey("acid", row.store_id, row.date, row.fryer)

    if (
      result === "missing" &&
      data.observations.some(
        (o) =>
          o.kind === "acid" &&
          o.item_id === row.fryer &&
          o.store_id === row.store_id &&
          o.business_date === row.date,
      )
    )
      continue

    add({
      id: key,
      source_key: key,
      store_id: row.store_id,
      business_date: row.date,
      title: `튀김기 ${row.fryer} 산가 ${
        result === "missing"
          ? "미기록"
          : result === "fail"
            ? "폐기 구간"
            : "주의"
      }`,
      kind: "acid",
      severity: result === "fail" ? "critical" : "warning",
      status: "open",
      description: "T10 제공 기준 / 영업 종료 후 유온 60℃ 이하 측정",
      value: row.recorded === "N" ? null : Number(row.acid_value),
      standard: "정상 ≤2.5 / 주의 ≤3.0 / 폐기 >3.0",
      item_id: row.fryer,
      source: { table: "t2_r10_oil_acidity_records", ...row },
    })
  }

  for (const row of data.expiry) {
    if (row.recorded !== "Y" || !row.status?.includes("기한 경과")) continue

    const key = `expiry:${row.store_id}:${row.date}:${row.item_id}`

    add({
      id: key,
      source_key: key,
      store_id: row.store_id,
      business_date: row.date,
      title: "소비기한 경과 항목 확인",
      kind: "expiry",
      severity: "critical",
      status: "open",
      description: row.status,
      value: null,
      standard: "원본 상태 기준 / 개별 만료일 미제공",
      item_id: row.item_id,
      source: { table: "t2_r04_expiry_records", ...row },
    })
  }

  for (const row of data.findings) {
    const invalid = row.completed_date && row.completed_date < row.date

    const complete =
      row.completed === "Y" &&
      row.completed_date &&
      row.completed_date <= date &&
      !invalid

    const key = `finding:${row.finding_id}`

    add({
      id: key,
      source_key: key,
      store_id: row.store_id,
      business_date: row.date,
      title: row.finding,
      kind: "finding",
      severity: row.category?.includes("설비") ? "critical" : "warning",
      status: invalid ? "data_review" : complete ? "legacy_complete" : "open",
      description: row.action_request,
      value: null,
      standard: "점검 지적사항 · 완료 표시와 검증 결과는 별도",
      item_id: row.item_id,
      due_date: row.due_date,
      quality: invalid
        ? "완료일이 지적일보다 빠름 · 기간 지표 제외"
        : undefined,
      source: {
        table: "t2_r13_findings_actions",
        ...row,
        completed_date: row.completed_date > date ? null : row.completed_date,
        completed: invalid ? row.completed : complete ? "Y" : "N",
        checked_visit_id: null,
      },
    })
  }

  for (const a of data.actions)
    result.push({
      id: a.id,
      source_key: a.source_key,
      store_id: a.store_id,
      business_date: a.business_date,
      title: a.title,
      kind: a.kind,
      severity: a.severity,
      status: a.status,
      description:
        a.source.description ||
        a.source.action_request ||
        "새로 등록한 운영 조치",
      value: a.source.value_c ?? a.source.acid_value ?? null,
      standard:
        a.source.standard || a.source.template?.standard || "원본 근거 참고",
      item_id: a.source.item_id || a.source.fryer || "",
      source: a.source,
      due_date: a.due_date,
      owner: a.owner,
      version: a.version,
      note: a.note,
      verification_note: a.verification_note,
      action: a,
    })

  return result.sort(
    (a, b) =>
      (["closed", "legacy_complete"].includes(a.status) ? 1 : 0) -
        (["closed", "legacy_complete"].includes(b.status) ? 1 : 0) ||
      (a.severity === "critical" ? 0 : 1) -
        (b.severity === "critical" ? 0 : 1) ||
      (a.due_date || "9999").localeCompare(b.due_date || "9999"),
  )
}
