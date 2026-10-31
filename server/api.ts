import { createReviewService } from "./reviews.js"
import type { IncomingMessage, ServerResponse } from "node:http"
import { randomUUID, timingSafeEqual } from "node:crypto"
import { ApiError, createAccountAuth } from "./auth.js"
import type { Plugin } from "vite"
import {
  addDays,
  monday,
  temperatureResult,
  acidResult,
  sourceKey,
  deriveIssues,
  validDay,
  type Row,
  type Session,
  type Snapshot,
  type Issue,
  type Metrics,
} from "../src/domain.js"

const validStores = ["S01", "S02", "S03"]
function checkedDay(value: unknown): string {
  const date = String(value || "")
  if (!validDay(date)) throw new ApiError(400, '올바른 날짜를 선택하세요.')
  return date
}
function text(value: unknown, max = 2000): string {
  return String(value ?? "")
    .trim()
    .slice(0, max)
}
// 점장이 주간 보고서를 보낼 때 함께 보내는 이번 주 이슈·조치·매출·비용 요약입니다.
function weeklySnapshot(value: unknown) {
  if (!value || typeof value !== "object") return undefined
  const w = value as Record<string, unknown>
  const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "")
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
  const list = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max) : []) as Record<string, unknown>[]
  return {
    start: day(w.start),
    end: day(w.end),
    previousSales: num(w.previousSales),
    issues: list(w.issues, 40).map((i) => ({
      title: text(i.title, 200),
      kind: text(i.kind, 40),
      severity: i.severity === "critical" ? "critical" : "warning",
      state: ["done", "doing", "open", "other"].includes(String(i.state)) ? String(i.state) : "other",
      status: text(i.status, 40),
      date: day(i.date),
      request: text(i.request, 500),
      doneAt: text(i.doneAt, 40),
    })),
    sales: list(w.sales, 14).map((r) => ({ date: day(r.date), amount: num(r.amount) })),
    costs: list(w.costs, 14).map((r) => ({ date: day(r.date), amount: num(r.amount) })),
    task: w.task && typeof w.task === "object"
      ? { done: num((w.task as Record<string, unknown>).done), total: num((w.task as Record<string, unknown>).total) }
      : undefined,
    waste: list(w.waste, 60).map((r) => ({
      date: day(r.date),
      item: text(r.item, 100),
      qty: num(r.qty),
      unit: text(r.unit, 20),
      reason: text(r.reason, 40),
      detail: text(r.detail, 500),
      amount: num(r.amount),
    })),
  }
}
function uuid(value: unknown): string {
  const id = String(value || "")
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    throw new ApiError(400, "요청 ID 형식이 올바르지 않습니다.")
  return id
}
async function body(req: IncomingMessage): Promise<Row> {
  let buffer = ""
  for await (const chunk of req) {
    buffer += chunk.toString()
    if (Buffer.byteLength(buffer) > 131072)
      throw new ApiError(413, "입력 내용이 너무 큽니다.")
  }
  try {
    return JSON.parse(buffer || "{}")
  } catch {
    throw new ApiError(400, "올바른 JSON 요청이 필요합니다.")
  }
}

export function createRunnMiddleware(env: Record<string, string>) {
  const base = env.SUPABASE_URL?.replace(/\/$/, "")
  const key = env.SUPABASE_SECRET_KEY
  const auth = createAccountAuth(env)
  const reviews = createReviewService(env)
  let referenceCache: { expires: number; data: Row } | undefined
  async function db(
    path: string,
    method = "GET",
    payload?: unknown,
    prefer = "return=representation",
  ): Promise<any> {
    if (!base || !key)
      throw new ApiError(
        503,
        "Supabase 서버 설정이 없습니다. .env.local을 확인하세요.",
      )
    const headers: Record<string, string> = {
      apikey: key,
      "Content-Type": "application/json",
      Prefer: prefer,
    }
    if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`
    const response = await fetch(`${base}/rest/v1/${path}`, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    })
    const raw = await response.text()
    let data: any
    try {
      data = raw ? JSON.parse(raw) : null
    } catch {
      data = null
    }
    if (!response.ok) {
      const message = data?.message || "데이터베이스 요청에 실패했습니다."
      throw new ApiError(
        data?.details === "runn_version_conflict"
          ? 409
          : response.status === 401 || response.status === 403
            ? 502
            : 400,
        message,
      )
    }
    return data
  }
  async function read(table: string, query = ""): Promise<Row[]> {
    if (/(^|&)limit=/.test(query)) return db(`${table}?select=*&${query}`)
    const ordered =
      table.startsWith("t1_") || table.startsWith("t2_")
        ? query +
          (query ? "&" : "") +
          (/(^|&)order=/.test(query) ? "" : "order=_source_row")
        : query
    const all: Row[] = []
    for (let offset = 0; offset < 20000; offset += 1000) {
      const page = (await db(
        `${table}?select=*&${ordered}${
          ordered ? "&" : ""
        }limit=1000&offset=${offset}`,
      )) as Row[]
      all.push(...page)
      if (page.length < 1000) return all
    }
    throw new ApiError(422, "조회 결과가 너무 큽니다. 기간을 좁혀 주세요.")
  }
  async function references() {
    if (referenceCache && referenceCache.expires > Date.now())
      return referenceCache.data
    const [
      stores,
      standards,
      taskTemplates,
      managerTemplates,
      expiryItems,
      equipmentItems,
      ingredients,
      suppliers,
      prices,
      manifest,
    ] = await Promise.all([
      read("t2_c01_stores", "order=store_id"),
      read("t2_t04_temperature_standards", "order=item_id"),
      read("t2_t02_daily_task_template", "order=item_id"),
      read("t2_t03_manager_check_template", "order=item_id"),
      read("t2_t05_expiry_items"),
      read("t2_t09_equipment_template"),
      read("t1_ingredients", "order=ingredient_id"),
      read("t1_suppliers", "order=supplier_id"),
      read("t1_ingredient_price_history", "order=valid_from.desc"),
      read("cry_import_manifest"),
    ])
    const data = {
      stores,
      standards,
      taskTemplates,
      managerTemplates,
      managerStandards: managerTemplates.filter((item: Row) => item.input === '온도(℃)').map((item: Row) => ({item_id:item.item_id,item:item.task,storage:item.section,measure_time:item.time,standard:item.standard,min_c:Number(String(item.standard).match(/(-?\d+(?:\.\d+)?)\s*℃\s*이상/)?.[1]),max_c:null})),
      expiryItems,
      equipmentItems,
      ingredients,
      suppliers,
      prices,
      sourceFiles: manifest.length,
    }
    referenceCache = { expires: Date.now() + 300000, data }
    return data
  }
  async function snapshot(session: Session, date: string): Promise<Snapshot> {
    const refs = await references()
    const start = monday(date)
    const previousStart = addDays(start, -7)
    const previousEnd = addDays(date, -7)
    const monthStart = date.slice(0, 7) + "-01"
    const from = previousStart < monthStart ? previousStart : monthStart
    const scope =
      session.role === "manager" ? `&store_id=eq.${session.storeId}` : ""
    const atDay = `date=eq.${date}${scope}`
    const throughDay = `business_date=lte.${date}${scope}`
    const week = `date=gte.${start}&date=lte.${date}${scope}`
    const [
      temperatures,
      acid,
      expiry,
      tasks,
      weekTasks,
      weekTemps,
      findings,
      observations,
      checks,
      actions,
      events,
      costs,
      reports,
      orders,
      inventory,
      lots,
      equipment,
      waste,
      sales,
      visits,
      importedReports,
      managerRecords,
    ] = await Promise.all([
      read("t2_r03_temperature_records", atDay + "&order=item_id"),
      read("t2_r10_oil_acidity_records", atDay),
      read("t2_r04_expiry_records", atDay),
      read("t2_r01_daily_tasks", atDay + "&order=item_id"),
      read("t2_r01_daily_tasks", week),
      read("t2_r03_temperature_records", week),
      read(
        "t2_r13_findings_actions",
        `date=lte.${date}${scope}&order=date.desc`,
      ),
      read("runn_observations", throughDay + "&order=created_at.desc"),
      read("runn_checks", `business_date=gte.${start}&business_date=lte.${date}${scope}`),
      read("runn_actions", throughDay + "&deleted_at=is.null&order=updated_at.desc"),
      read(
        "runn_action_events",
        `${scope.replace(/^&/, "")}${
          scope ? "&" : ""
        }order=created_at.desc&limit=30`,
      ),
      read(
        "runn_costs",
        `business_date=gte.${monthStart}&business_date=lte.${date}${scope}&order=created_at.desc`,
      ),
      read("runn_reports", throughDay + "&deleted_at=is.null&order=created_at.desc"),
      read("runn_order_drafts", throughDay + "&order=created_at.desc"),
      read("t1_inventory_daily", atDay),
      read("t1_inventory_lots_daily", atDay),
      read("t2_r09_equipment_checks", `week_start=eq.${start}${scope}`),
      read("t2_r05_finished_product_waste", week),
      read(
        "runn_daily_sales",
        `date=gte.${from}&date=lte.${date}${scope}&order=date`,
      ),
      read(
        "t2_r11_supervisor_visits",
        `date=lte.${date}${scope}&service_pct=not.is.null&order=date.desc`,
      ),
      read("t2_r14_weekly_reports", `week_start=lte.${date}${scope}&order=week_start.desc`),
      read("t2_r02_manager_daily_checks", atDay + '&order=item_id'),
    ])
    const scopedStores = refs.stores.filter(
      (s: Row) => session.role === "sv" || s.store_id === session.storeId,
    )
    const dayTasks = tasks.slice()
    const taskIndex = new Map(weekTasks.map(r => [`${r.store_id}:${r.date}:${r.item_id}`, r]))
    const initializedDays = new Map<string, {store: string; date: string}>()
    for (const s of scopedStores) initializedDays.set(`${s.store_id}:${date}`, {store: s.store_id, date})
    for (const c of checks) initializedDays.set(`${c.store_id}:${c.business_date}`, {store: c.store_id, date: c.business_date})
    for (const day of initializedDays.values()) {
      for (const template of refs.taskTemplates) {
        const key = `${day.store}:${day.date}:${template.item_id}`
        if (!taskIndex.has(key)) {
          const blank = {store_id: day.store, date: day.date, item_id: template.item_id, done: null, is_new_day: true}
          taskIndex.set(key, blank)
          if (day.date === date) dayTasks.push(blank)
        }
      }
    }
    const effectiveWeekTasks = [...taskIndex.values()].map(r => {
      const override = checks.find(c => c.store_id === r.store_id && c.business_date === r.date && c.item_id === r.item_id)
      return override ? {...r, done: override.done ? 'Y' : 'N'} : r
    })
    const issues = deriveIssues(
      {
        temperatures:[...temperatures,...managerRecords.filter(r => refs.managerStandards.some((s: Row) => s.item_id === r.item_id)).map(row => ({...row,recorded:row.done,source_table:'t2_r02_manager_daily_checks'}))],
        standards: [...refs.standards,...refs.managerStandards],
        acid,
        expiry,
        findings,
        actions,
        observations,
      },
      date,
    )
    const numericItems = new Set(
      refs.standards
        .filter((x: Row) => x.min_c !== null || x.max_c !== null)
        .map((x: Row) => x.item_id),
    )
    const metrics: Metrics[] = scopedStores.map((s: Row) => {
      const filter = (rows: Row[]) =>
        rows.filter((r) => r.store_id === s.store_id)
      const storeSales = filter(sales)
      const sum = (rows: Row[], field: string) =>
        rows.reduce((n, r) => n + Number(r[field] || 0), 0)
      const currentSales = sum(
        storeSales.filter((r) => r.date >= start),
        "sales_amount",
      )
      const previousSales = sum(
        storeSales.filter(
          (r) => r.date >= previousStart && r.date <= previousEnd,
        ),
        "sales_amount",
      )
      const storeTasks = filter(effectiveWeekTasks)
      const storeTemps = filter(weekTemps)
      const storeWaste = sum(filter(waste), "waste_amount")
      const visit = filter(visits)[0]
      return {
        store_id: s.store_id,
        sales: currentSales,
        previousSales,
        monthSales: sum(
          storeSales.filter((r) => r.date >= monthStart),
          "sales_amount",
        ),
        waste: storeWaste,
        wasteRate: currentSales > 0 ? (storeWaste / currentSales) * 100 : null,
        taskDone: storeTasks.filter((r) => r.done === "Y").length,
        taskTotal: storeTasks.length,
        taskRate: storeTasks.length
          ? (storeTasks.filter((r) => r.done === "Y").length /
              storeTasks.length) *
            100
          : 0,
        temperatureFailures: storeTemps.filter(
          (r) => r.recorded === "Y" && r.pass === "N",
        ).length,
        temperatureMissing: storeTemps.filter((r) => r.recorded === "N").length,
        numericMeasurements: storeTemps.filter(
          (r) => r.recorded === "Y" && numericItems.has(r.item_id),
        ).length,
        openIssues: issues.filter(
          (i) =>
            i.store_id === s.store_id &&
            !["closed", "legacy_complete", "data_review"].includes(i.status),
        ).length,
        servicePct: visit ? Number(visit.service_pct) : null,
        serviceGrade: visit?.grade || "점검 없음",
        costs: sum(filter(costs), "amount"),
        hasSales: storeSales.some(r => r.date >= start),
        hasMonthSales: storeSales.some(r => r.date >= monthStart),
      }
    })
    const latestImportedReports = new Map<string, Row>()
    for (const report of importedReports) {
      if (addDays(report.week_start, 6) <= date && !latestImportedReports.has(report.store_id)) latestImportedReports.set(report.store_id, report)
    }
    const sourceReports = [...latestImportedReports.values()].map(report => ({
      id:`source:${report.store_id}:${report.week_start}`,store_id:report.store_id,
      business_date:addDays(report.week_start,6),week_start:report.week_start,
      created_at:`${addDays(report.week_start,6)}T12:00:00Z`,read_only:true,
      title:`${report.week_start} ${refs.stores.find((s: Row) => s.store_id === report.store_id)?.store_name || '매장'} 주간 운영 보고`,
      summary:report.manager_opinion || '등록된 운영 의견이 없습니다.',
      metrics:{taskRate:(1-Number(report.daily_task_miss_rate))*100,waste:Number(report.waste_amount),wasteRate:Number(report.waste_rate_pct),selfScore:report.self_check_score,selfMax:report.self_check_max},
    }))
    return {
      session,
      date,
      weekStart: start,
      periodStart: date >= '2026-05-01' && date <= '2026-05-03' ? '2026-05-01' : start,
      periodEnd: date,
      loadedAt: new Date().toISOString(),
      ...refs,
      temperatures,
      managerRecords,
      acid,
      expiry,
      tasks: dayTasks,
      findings,
      observations,
      checks: checks.filter(c => c.business_date === date),
      actions,
      events,
      costs,
      reports:[...reports,...sourceReports],
      orders,
      inventory,
      lots,
      equipment: equipment.filter((r) => !r.date || r.date <= date),
      waste,
      sales,
      issues,
      metrics,
      quality: {
        expiryConflicts: expiry.filter((r) => r.recorded === "N" && r.status)
          .length,
        invalidCompletionDates: findings.filter(
          (r) => r.completed_date && r.completed_date < r.date,
        ).length,
      },
    } as Snapshot
  }
  function access(session: Session, store: unknown) {
    if (
      !validStores.includes(String(store)) ||
      (session.role === "manager" && store !== session.storeId)
    )
      throw new ApiError(403, "선택한 매장에 접근할 수 없습니다.")
  }
  const actor = (s: Session) =>
    `${s.username || (s.role === "sv" ? "SV" : "점장")}`
  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url!, "http://localhost")
    const route = url.pathname.replace(/^\/api/, "")
    const method = req.method || "GET"
    const peer = req.socket.remoteAddress
    if (
      !env.VERCEL &&
      !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(peer || "")
    )
      throw new ApiError(
        403,
        "로컬 검토 서버는 이 컴퓨터에서만 사용할 수 있습니다.",
      )
    if (method !== "GET") {
      const origin = req.headers.origin
      if (origin && new URL(origin).host !== req.headers.host)
        throw new ApiError(
          403,
          "다른 사이트에서의 변경 요청은 허용하지 않습니다.",
        )
      if (req.headers["x-runn-client"] !== "local-review")
        throw new ApiError(403, "검토 화면에서 다시 시도하세요.")
    }
    if (route === "/auth/stores" && method === "GET")
      return (await read("t2_c01_stores")).map((s: Row) => ({ store_id: s.store_id, store_name: s.store_name }))
    if (route === "/auth/signup" && method === "POST") return auth.signup(req, await body(req))
    if (route === "/auth/login" && method === "POST") return auth.login(req, res, await body(req))
    if (route === "/auth/logout" && method === "POST") return auth.logout(req, res)
    const session = await auth.read(req, res)
    if (route === "/reviews" && method === "GET") return reviews.analyze(session.storeId)
    if (route === "/reviews/analyze" && method === "POST") return reviews.analyze(session.storeId, true)
    if (route === "/session") {
      if (method !== "GET") throw new ApiError(403, "역할과 담당 매장은 가입한 계정에 따라 적용됩니다.")
      return session
    }
    if (route === "/health") {
      const stores = await read("t2_c01_stores")
      return {
        connected: true,
        storeCount: stores.length,
        project: "pehmjliapqdlmxijmggq",
        aiConnected: false,
        mode: "authenticated",
      }
    }
    if (route === "/bootstrap" && method === "GET") {
      return snapshot(
        session,
        checkedDay(url.searchParams.get("date") || "2026-08-12"),
      )
    }
    if (route === "/observations" && method === "POST") {
      const p = await body(req)
      access(session, p.store_id)
      const date = checkedDay(p.business_date)
      const id = uuid(p.id)
      const value = Number(p.value)
      if (p.value === "" || p.value === null || !Number.isFinite(value))
        throw new ApiError(400, "유효한 측정값을 입력하세요.")
      const refs = await references()
      let standard: string
      let result: string
      let title: string
      let source: Row
      if (p.kind === "temperature") {
        const item = [...refs.standards,...refs.managerStandards].find((x: Row) => x.item_id === p.item_id)
        if (!item) throw new ApiError(400, "온도 항목이 올바르지 않습니다.")
        if (value < -100 || value > 300)
          throw new ApiError(
            400,
            "측정값과 단위를 다시 확인하세요. 온도는 -100~300℃ 범위에서 입력하세요.",
          )
        standard = item.standard
        result = temperatureResult(value, item)
        title = `${item.item} 온도 기준 이탈`
        source = {
          table: "runn_observations",
          item_id: p.item_id,
          value_c: value,
          standard,
          template: item,
          description: text(p.note),
        }
      } else if (p.kind === "acid") {
        if (!["1번", "2번"].includes(p.item_id) || value < 0 || value > 20)
          throw new ApiError(400, "튀김기와 산가(0~20)를 확인하세요.")
        standard = "정상 ≤2.5 / 주의 >2.5~≤3.0 / 폐기 >3.0"
        result = acidResult(value)
        title = `튀김기 ${p.item_id} 산가 ${
          result === "fail" ? "폐기 구간" : "주의"
        }`
        source = {
          table: "runn_observations",
          fryer: p.item_id,
          acid_value: value,
          standard,
          description: text(p.note),
        }
      } else throw new ApiError(400, "지원하지 않는 측정 항목입니다.")
      if (p.action_id) {
        uuid(p.action_id)
        const a = (await read("runn_actions", `id=eq.${p.action_id}`))[0]
        if (!a) throw new ApiError(404, "조치를 찾을 수 없습니다.")
        access(session, a.store_id)
        if (
          a.kind !== p.kind ||
          (a.source.item_id || a.source.fryer) !== p.item_id
        )
          throw new ApiError(400, "조치의 측정 항목과 일치하지 않습니다.")
      }
      return db("rpc/runn_record_observation", "POST", {
        p: {
          ...p,
          id,
          business_date: date,
          value,
          result,
          standard,
          title,
          source,
          source_key: sourceKey(p.kind, p.store_id, date, p.item_id),
          note: text(p.note),
          actor: actor(session),
        },
      })
    }
    if (route === "/actions" && method === "POST") {
      const p = await body(req)
      access(session, p.store_id)
      const date = checkedDay(p.business_date)
      let payload: Row
      if (p.source_key) {
        const data = await snapshot(session, date)
        const issue = data.issues.find(
          (i) => i.source_key === p.source_key && i.store_id === p.store_id,
        )
        if (!issue) throw new ApiError(404, "원본 이슈를 다시 불러오세요.")
        if (issue.action) return issue.action
        if (["legacy_complete", "data_review"].includes(issue.status))
          throw new ApiError(
            400,
            "과거 완료 기록입니다. 별도 신규 이슈를 작성하세요.",
          )
        payload = {
          source_key: issue.source_key,
          store_id: issue.store_id,
          business_date: issue.business_date,
          title: issue.title,
          kind: issue.kind,
          severity: issue.severity,
          source: {
            ...issue.source,
            standard: issue.standard,
            description: issue.description,
          },
        }
      } else {
        if (!text(p.title) || !text(p.note))
          throw new ApiError(400, "제목과 상세 내용을 입력해 주세요.")
        payload = {
          source_key: `manual:${uuid(p.id)}`,
          store_id: p.store_id,
          business_date: date,
          title: text(p.title, 200),
          kind: "manual",
          severity: p.severity === "critical" ? "critical" : "warning",
          source: {
            table: "runn_actions",
            description: text(p.note),
            category: text(p.category),
            checklist_keys: Array.isArray(p.checklist_keys) ? p.checklist_keys.filter((key: unknown) => typeof key === 'string').slice(0,25).map((key:string) => text(key,120)) : [],
          },
        }
      }
      return (
        (
          await db(
            "runn_actions?on_conflict=source_key",
            "POST",
            payload,
            "resolution=ignore-duplicates,return=representation",
          )
        )?.[0] ||
        (
          await read(
            "runn_actions",
            `source_key=eq.${encodeURIComponent(payload.source_key)}`,
          )
        )[0]
      )
    }
    if (/^\/actions\/[0-9a-f-]+$/.test(route) && method === "PATCH") {
      const p = await body(req)
      const id = uuid(route.split("/")[2])
      const a = (await read("runn_actions", `id=eq.${id}`))[0]
      if (!a || a.deleted_at) throw new ApiError(404, "조치를 찾을 수 없습니다.")
      access(session, a.store_id)
      if (['edit','delete'].includes(p.operation)) {
        if (session.role !== 'manager' || a.kind !== 'manual') throw new ApiError(403,'직접 작성한 이슈만 수정할 수 있습니다.')
        if (a.status === 'closed') throw new ApiError(409,'확인 완료된 이슈는 변경할 수 없습니다.')
        if (p.operation === 'edit' && (!text(p.title) || !text(p.note))) throw new ApiError(400,'제목과 내용을 입력해 주세요.')
        const patch = p.operation === 'delete' ? {deleted_at:new Date().toISOString(),version:a.version+1} : {title:text(p.title,200),source:{...a.source,description:text(p.note)},severity:p.severity === 'critical'?'critical':'warning',version:a.version+1,updated_at:new Date().toISOString()}
        const changed = await db(`runn_actions?id=eq.${id}&version=eq.${a.version}`,'PATCH',patch)
        if (!changed.length) throw new ApiError(409,'변경된 내용이 있습니다. 다시 확인해 주세요.')
        return changed[0]
      }
      if (["verify", "reject"].includes(p.operation) && session.role !== "sv")
        throw new ApiError(403, "SV 화면에서 검증하세요.")
      return db("rpc/runn_transition_action", "POST", {
        p: {
          id,
          version: p.version,
          operation: p.operation,
          owner: text(p.owner, 100),
          due_date: p.due_date || null,
          note: text(p.note),
          role: session.role,
          actor: actor(session),
        },
      })
    }
    if (route === "/checks" && method === "POST") {
      const p = await body(req)
      access(session, p.store_id)
      checkedDay(p.business_date)
      if (typeof p.done !== "boolean")
        throw new ApiError(400, "완료 여부를 확인하세요.")
      const refs = await references()
      if (![...refs.taskTemplates,...refs.managerTemplates].some((x: Row) => x.item_id === p.item_id))
        throw new ApiError(400, "점검 항목이 올바르지 않습니다.")
      return db(
        "runn_checks?on_conflict=store_id,business_date,item_id",
        "POST",
        {
          store_id: p.store_id,
          business_date: p.business_date,
          item_id: p.item_id,
          done: p.done,
          note: text(p.note),
          updated_at: new Date().toISOString(),
        },
        "resolution=merge-duplicates,return=representation",
      )
    }
    if (route === "/costs" && method === "POST") {
      const p = await body(req)
      access(session, p.store_id)
      checkedDay(p.business_date)
      const amount = Number(p.amount)
      if (
        !["발주비", "재료비", "인건비", "기타"].includes(p.category) ||
        !Number.isSafeInteger(amount) ||
        amount <= 0 ||
        amount > 1000000000 ||
        !text(p.memo)
      )
        throw new ApiError(
          400,
          "비용 항목과 금액, 내용을 확인해 주세요.",
        )
      return db(
        "runn_costs?on_conflict=id",
        "POST",
        {
          id: uuid(p.id),
          store_id: p.store_id,
          business_date: p.business_date,
          category: p.category,
          amount,
          memo: text(p.memo, 200),
        },
        "resolution=ignore-duplicates,return=representation",
      )
    }
    if (route === "/reports" && method === "POST") {
      const p = await body(req)
      access(session, p.store_id)
      const date = checkedDay(p.business_date)
      if (!text(p.title) || !text(p.summary))
        throw new ApiError(400, "보고서 제목과 내용을 입력하세요.")
      const data = await snapshot(
        { ...session, role: "manager", storeId: p.store_id },
        date,
      )
      const metric = data.metrics[0]
      return db(
        "runn_reports?on_conflict=id",
        "POST",
        {
          id: uuid(p.id),
          store_id: p.store_id,
          business_date: date,
          week_start: data.weekStart,
          title: text(p.title, 200),
          summary: text(p.summary, 10000),
          metrics: {
            ...metric,
            ...(weeklySnapshot(p.weekly) ? { weekly: weeklySnapshot(p.weekly) } : {}),
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
            generatedBy: "deterministic-template",
            ai: false,
          },
        },
        "resolution=ignore-duplicates,return=representation",
      )
    }
    if (/^\/reports\/[0-9a-f-]+$/.test(route) && method === "PATCH") {
      const p = await body(req)
      const id = uuid(route.split("/")[2])
      const report=(await read('runn_reports',`id=eq.${id}`))[0]
      if(!report || report.deleted_at) throw new ApiError(404,'보고서를 찾을 수 없습니다.')
      access(session,report.store_id)
      if(['edit','delete'].includes(p.operation)) {
        if(session.role !== 'manager') throw new ApiError(403,'점장 화면에서 작성한 보고서를 수정하세요.')
        if(p.operation === 'edit' && (!text(p.title)||!text(p.summary)))throw new ApiError(400,'제목과 내용을 입력해 주세요.')
        return db(`runn_reports?id=eq.${id}`,'PATCH',p.operation === 'delete'?{deleted_at:new Date().toISOString()}:{title:text(p.title,200),summary:text(p.summary,10000)})
      }
      if (session.role !== "sv")
        throw new ApiError(403, "SV만 보고서에 답변할 수 있습니다.")
      // 피드백 없이 확인만 표시합니다. 점장 앱에서 확인 알림으로 보여요.
      if (p.operation === "confirm")
        return db(`runn_reports?id=eq.${id}`, "PATCH", { reviewed_at: new Date().toISOString() })
      if (!text(p.reply))
        throw new ApiError(400, "검토 의견을 입력해 주세요.")
      return db(`runn_reports?id=eq.${id}`, "PATCH", {
        reply: text(p.reply),
        reviewed_at: new Date().toISOString(),
      })
    }
    if (route === "/orders" && method === "POST") {
      const p = await body(req)
      access(session, p.store_id)
      const date = checkedDay(p.business_date)
      const refs = await references()
      if (
        !refs.suppliers.some((s: Row) => s.supplier_id === p.supplier_id) ||
        !Array.isArray(p.items) ||
        !p.items.length ||
        p.items.length > 22
      )
        throw new ApiError(400, "공급사와 발주 품목을 확인하세요.")
      const ids = new Set()
      let amount = 0
      const items = p.items.map((r: Row) => {
        const ingredient = refs.ingredients.find(
          (i: Row) =>
            i.ingredient_id === r.ingredient_id &&
            i.supplier_id === p.supplier_id,
        )
        const qty = Number(r.qty)
        if (
          !ingredient ||
          ids.has(r.ingredient_id) ||
          !Number.isInteger(qty) ||
          qty < Number(ingredient.min_order_qty) ||
          qty > 10000
        )
          throw new ApiError(400, "발주 단위 수량과 최소 수량을 확인하세요.")
        ids.add(r.ingredient_id)
        const price = refs.prices.find(
          (x: Row) =>
            x.ingredient_id === r.ingredient_id && x.valid_from <= date,
        )
        if (!price) throw new ApiError(400, "기준일에 유효한 단가가 없습니다.")
        amount += qty * Number(price.unit_price)
        return {
          ingredient_id: r.ingredient_id,
          name: ingredient.ingredient_name,
          qty,
          unit: ingredient.order_unit,
          unit_price: Number(price.unit_price),
        }
      })
      return db(
        "runn_order_drafts?on_conflict=id",
        "POST",
        {
          id: uuid(p.id),
          store_id: p.store_id,
          business_date: date,
          supplier_id: p.supplier_id,
          items,
          amount,
        },
        "resolution=ignore-duplicates,return=representation",
      )
    }
    throw new ApiError(404, "요청한 기능을 찾을 수 없습니다.")
  }
  const middleware = async (req: IncomingMessage, res: ServerResponse) => {
    if (env.RUNN_REVIEW_PASSWORD) {
      const encoded = req.headers.authorization?.match(/^Basic (.+)$/i)?.[1]
      let supplied = ""
      try {
        supplied = Buffer.from(encoded || "", "base64")
          .toString()
          .split(":")
          .slice(1)
          .join(":")
      } catch {
        supplied = ""
      }
      const expected = env.RUNN_REVIEW_PASSWORD
      const valid =
        supplied.length === expected.length &&
        timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
      if (!valid) {
        res.statusCode = 401
        res.setHeader("WWW-Authenticate", 'Basic realm="RUNN Preview"')
        res.setHeader("Content-Type", "application/json; charset=utf-8")
        res.end(JSON.stringify({ error: "프리뷰 접근 비밀번호가 필요합니다." }))
        return
      }
    }
    // Connect strips the mount prefix; restore it for explicit route matching.
    if (!req.url?.startsWith("/api")) req.url = "/api" + req.url
    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader("Cache-Control", "no-store")
    res.setHeader("X-Content-Type-Options", "nosniff")
    try {
      const result = await handle(req, res)
      res.statusCode = 200
      res.end(JSON.stringify(result))
    } catch (error) {
      const e = error as Error
      const status = error instanceof ApiError ? error.status : 503
      res.statusCode = status
      const safe = e.message.replace(
        /(sb_secret_|eyJ)[A-Za-z0-9_.-]+/g,
        "[redacted]",
      )
      console.error(
        `[RUNN API] ${req.method} ${req.url?.split("?")[0]} ${status}: ${safe}`,
      )
      res.end(
        JSON.stringify({
          error: safe.includes("fetch failed")
            ? "Supabase 연결에 실패했습니다. 네트워크 상태를 확인하세요."
            : safe,
        }),
      )
    }
  }
  return middleware
}

export function runnApi(env: Record<string, string>): Plugin {
  const middleware = createRunnMiddleware(env)
  return {
    name: "runn-local-api",
    configureServer(server) {
      server.middlewares.use("/api", middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api", middleware)
    },
  }
}
