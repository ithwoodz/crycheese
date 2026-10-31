import {acidResult, temperatureResult, type Row, type Snapshot} from './domain.ts'

export type CheckStatus = 'ok' | 'bad' | null
export type MeasureItem = {
  id: string; item_id: string; label: string; unit: string; kind: 'temperature' | 'acid'
  standard: string; min_c: number | null; max_c: number | null; time: string
}
export type CheckGroup = {id:string; label:string; tasks:string[]; status:CheckStatus}
export type ChecklistPhase = {key:'open'|'close'; label:string; measures:MeasureItem[]; groups:CheckGroup[]}

export function checklistPhases(data: Snapshot, checks: Row[]): ChecklistPhase[] {
  const measurements: MeasureItem[] = data.standards.map(item => ({id:item.item_id,item_id:item.item_id,
    label:`${item.item} · ${item.storage}`,unit:'℃',kind:'temperature',standard:item.standard,
    min_c:item.min_c,max_c:item.max_c,time:item.measure_time}))
  const group = (item: Row): CheckGroup => ({id:item.item_id,label:item.task,
    tasks:[item.time_block,item.fixed_time || '시간 미정'],status:item.status ?? (item.done ? 'ok' : null)})
  return [
    {key:'open',label:'오픈',measures:measurements.filter(item => item.time === '11:00'),
      groups:checks.filter(item => item.time_block === '오픈').map(group)},
    {key:'close',label:'마감',measures:[...measurements.filter(item => item.time !== '11:00'),
      ...['1번','2번'].map((fryer): MeasureItem => ({id:`acid:${fryer}`,item_id:fryer,label:`튀김기 ${fryer} 산가`,unit:'AV',kind:'acid',standard:'정상 ≤2.5 / 주의 ≤3.0 / 폐기 >3.0',min_c:0,max_c:2.5,time:'영업 종료 후'}))],
      groups:checks.filter(item => item.time_block !== '오픈').map(group)},
  ]
}

export function measureValues(data: Snapshot): Record<string,string> {
  const values: Record<string,string> = {}
  for(const row of data.temperatures.filter(row => row.store_id === data.session.storeId && row.recorded === 'Y')) {
    if(row.value_c !== null && row.value_c !== undefined) values[row.item_id]=String(row.value_c)
  }
  for(const row of data.acid.filter(row => row.store_id === data.session.storeId && row.recorded === 'Y')) {
    if(row.acid_value !== null && row.acid_value !== undefined) values[`acid:${row.fryer}`]=String(row.acid_value)
  }
  // Bootstrap observations are ordered newest first. A previous business day's readings never fill today's inputs.
  const latest = new Set<string>()
  for(const row of data.observations.filter(row => row.store_id === data.session.storeId && row.business_date === data.date)) {
    const id=row.kind === 'acid' ? `acid:${row.item_id}` : row.item_id
    if(!latest.has(id)){values[id]=String(row.value);latest.add(id)}
  }
  return values
}

export function judgeMeasure(item: MeasureItem, raw: string): CheckStatus {
  if(!raw.trim() || !Number.isFinite(Number(raw))) return null
  const result=item.kind === 'acid' ? acidResult(Number(raw)) : temperatureResult(Number(raw),item)
  return result === 'fail' || result === 'warning' ? 'bad' : 'ok'
}

export function measureLabel(item: MeasureItem, raw: string) {
  if(judgeMeasure(item,raw) === null) return ''
  if(item.kind === 'temperature' && item.min_c === null && item.max_c === null) return '기록 완료'
  if(item.kind === 'acid' && acidResult(Number(raw)) === 'warning') return '주의'
  return judgeMeasure(item,raw) === 'bad' ? '기준 이탈' : '정상'
}
