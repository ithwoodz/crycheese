import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { request } from './api'
import { addDays, applyCheck, validDay, type Issue, type Row, type Snapshot } from './domain'
import { BrandLogo } from './BrandLogo'

export type LiveDialog = { type: 'date' | 'settings' | 'order' | 'measurement' | 'report' | 'issue' | 'issues'; issue?: Issue; report?: Row }
type PendingCheck = { store: string; date: string; item: string; desired: boolean; saved: boolean; note:string; savedNote:string }
type LiveContext = {
  data: Snapshot; busy: boolean; message: string; dialog: LiveDialog | null
  open: (dialog: LiveDialog | null) => void; notify: (message: string) => void
  setDate: (date: string) => void; reload: () => Promise<void>
  run: (task: () => Promise<unknown>, message: string) => Promise<boolean>
  saveCheck: (item: string, done: boolean, status?: 'ok'|'bad') => void
  switchSession: (role: 'sv' | 'manager', store?: string) => Promise<boolean>
}
const Context = createContext<LiveContext | null>(null)
export function useLive() {
  const value = useContext(Context)
  if (!value) throw new Error('운영 기록을 먼저 불러와 주세요.')
  return value
}
export const activeIssue = (issue: Issue) => !['closed', 'legacy_complete', 'data_review'].includes(issue.status)
export const dayLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('ko-KR', {year:'numeric',month:'long',day:'numeric',weekday:'long', timeZone:'UTC'})
export const shortDate = (date: string) => date ? date.slice(5).replace('-', '/') : '기한 미정'
export const storeName = (data: Snapshot, id: string) => data.stores.find(s => s.store_id === id)?.store_name || '매장'
export function dayChecks(data: Snapshot, store = data.session.storeId): (Row & {done:boolean})[] {
  return data.taskTemplates.map(template => {
    const override = data.checks.find(c => c.store_id === store && c.item_id === template.item_id)
    const original = data.tasks.find(c => c.store_id === store && c.item_id === template.item_id)
    const done = override ? override.done : original?.done === 'Y'
    return {...template, done, status:override?.note === 'bad' ? 'bad' : done ? 'ok' : null}
  })
}
export function storeCards(data: Snapshot) {
  return data.stores.filter(s => data.metrics.some(m => m.store_id === s.store_id)).map((s, index) => {
    const metric = data.metrics.find(m => m.store_id === s.store_id)!
    const counts = Array.from({length:7}, (_, i) => data.issues.filter(issue => issue.store_id === s.store_id && issue.business_date === addDays(data.date, i - 6)).length)
    const maximum = Math.max(1,...counts)
    return {...s, store_id:String(s.store_id), metric, name:s.store_name, location:s.trade_area, issues:metric.openIssues,
      waste:metric.wasteRate === null ? '—' : `${metric.wasteRate.toFixed(1)}%`, rate:`${metric.taskRate.toFixed(0)}%`,
      grade:metric.serviceGrade, color:['blue','orange','green'][index % 3],
      trend:counts.map((count,i) => `${4+i*14},${18-count/maximum*14}`).join(' ')}
  })
}

// Data and persistence live outside the original presentation components.
export function LiveProvider({ children }: { children: ReactNode }) {
  const [date, changeDate] = useState(() => {
    try { const saved = localStorage.getItem('runn-review-date-v1'); return saved && validDay(saved) ? saved : '2026-08-12' } catch { return '2026-08-12' }
  })
  const [data, setData] = useState<Snapshot | null>(null)
  const latestDate = useRef(date);latestDate.current=date
  const [busy, setBusy] = useState(false)
  const [loading,setLoading] = useState(true)
  const [message, notify] = useState('')
  // 첫 화면을 못 불러온 오류는 알림처럼 사라지면 안 되므로 따로 보관합니다.
  const [loadError, setLoadError] = useState('')
  const [dialog, open] = useState<LiveDialog | null>(null)
  const latest = useRef(data); latest.current = data
  const pending = useRef(new Map<string, PendingCheck>())
  const controller = useRef<AbortController | null>(null)
  const sequence = useRef(0)
  const lock = useRef(false)
  const reload = useCallback(async () => {
    if(date !== latestDate.current) return
    controller.current?.abort()
    const abort = new AbortController(); controller.current = abort
    const current = ++sequence.current
    setLoading(true)
    try {
      let next = await request<Snapshot>(`/bootstrap?date=${date}`, {signal:abort.signal})
      for (const check of pending.current.values()) next = applyCheck(next, check.store, check.date, check.item, check.desired, check.note)
      if (current === sequence.current) { latest.current = next; setData(next); setLoadError('') }
    } catch (error) {
      if (!abort.signal.aborted) { notify((error as Error).message); setLoadError((error as Error).message); throw error }
    } finally {if(current === sequence.current)setLoading(false)}
  }, [date])
  useEffect(() => { void reload().catch(() => {}); return () => controller.current?.abort() }, [reload])
  useEffect(() => { if (!message) return; const timer = setTimeout(() => notify(''), 5000); return () => clearTimeout(timer) }, [message])
  async function run(task: () => Promise<unknown>, success: string) {
    if (lock.current) return false
    lock.current = true; setBusy(true)
    try { await task(); await reload(); if (success) notify(success); return true }
    catch (error) { notify((error as Error).message); return false }
    finally { lock.current = false; setBusy(false) }
  }
  function saveCheck(item: string, done: boolean, status?: 'ok'|'bad') {
    const current = latest.current
    if (!current || current.date !== date || loading) return
    const store = current.session.storeId
    const key = `${store}:${current.date}:${item}`
    const existing = pending.current.get(key)
    const previous = current.checks.find(c => c.store_id === store && c.item_id === item)
    const source = [...current.tasks,...current.managerRecords].find(c => c.store_id === store && c.item_id === item)
    const saved = previous ? previous.done : source?.done === 'Y'
    const savedNote = previous?.note || (source?.done === 'Y' && source.pass === 'N' ? 'bad' : '')
    const entry = existing || {store, date:current.date, item, desired:done, saved, note:status || '', savedNote}
    entry.desired = done
    entry.note = status || ''
    const next = applyCheck(current, store, current.date, item, done, entry.note)
    latest.current = next; setData(next)
    if (existing) return
    pending.current.set(key, entry)
    void (async () => {
      try {
        while (true) {
          const desired = entry.desired
          const note = entry.note
          await request('/checks', {method:'POST', body:{store_id:store,business_date:entry.date,item_id:item,done:desired,note},keepalive:true})
          entry.saved = desired
          entry.savedNote = note
          if (entry.desired === desired && entry.note === note) break
        }
      } catch {
        const current = latest.current
        if (current) { const next = applyCheck(current,store,entry.date,item,entry.saved,entry.savedNote); latest.current = next; setData(next) }
        notify('점검 내용을 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.')
      } finally { pending.current.delete(key) }
    })()
  }
  function setDate(next: string) {
    if (!validDay(next)) { notify('날짜를 확인해 주세요.'); return }
    changeDate(next); open(null)
    try { localStorage.setItem('runn-review-date-v1', next) } catch { /* Optional browser storage. */ }
  }
  if (!data) return <div className="manager-bg"><div className="manager-shell"><header className="manager-header"><div className="manager-brand"><BrandLogo /><b>CRBU</b></div></header><main className="manager-main"><section className="manager-welcome">{loadError ? <><h1>운영 기록을 불러오지 못했어요</h1><p>{loadError}</p><button className="date-chip" onClick={() => void reload().catch(() => {})}>다시 시도</button></> : <h1>운영 기록을 불러오고 있어요</h1>}</section></main></div></div>
  return <Context.Provider value={{data,busy:busy || loading,message,dialog,open,notify,setDate,reload,run,saveCheck,
    switchSession:(role,store=data.session.storeId) => run(() => request('/session',{method:'POST',body:{role,storeId:store}}),'')}}>{children}</Context.Provider>
}
