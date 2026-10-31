import {acidResult, temperatureResult, type Row, type Snapshot} from './domain.ts'
import {minimumOf,type ManagerCheckItem} from './lib/managerChecklist.ts'

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

export function managerItems(data: Snapshot): ManagerCheckItem[] {
  return data.managerTemplates.map(item => ({id:item.item_id,section:item.section,time:item.time || '',task:item.task,input:item.input,standard:item.standard || ''}))
}
export function managerValues(data: Snapshot): Record<string,string> {
  const values: Record<string,string> = {}
  for(const row of data.managerRecords.filter(row => row.store_id === data.session.storeId && row.done === 'Y')) {
    if(row.value_c !== null && row.value_c !== undefined) values[row.item_id]=String(row.value_c)
  }
  const latest=new Set<string>()
  for(const row of data.observations.filter(row => row.store_id === data.session.storeId && row.business_date === data.date && row.kind === 'temperature' && data.managerStandards.some(item => item.item_id === row.item_id))) {
    if(!latest.has(row.item_id)){values[row.item_id]=String(row.value);latest.add(row.item_id)}
  }
  return values
}
export function judgeManagerMeasure(item: ManagerCheckItem, value: string): CheckStatus {
  if(!value.trim() || !Number.isFinite(Number(value))) return null
  const minimum=minimumOf(item)
  return minimum !== null && Number(value)<minimum ? 'bad' : 'ok'
}
export function managerStatuses(data: Snapshot): Record<string,CheckStatus> {
  const values=managerValues(data)
  return Object.fromEntries(managerItems(data).map(item => {
    if(item.input === '온도(℃)') return [item.id,judgeManagerMeasure(item,values[item.id] || '')]
    const override=data.checks.find(row => row.store_id === data.session.storeId && row.item_id === item.id)
    const source=data.managerRecords.find(row => row.store_id === data.session.storeId && row.item_id === item.id)
    return [item.id,override ? override.note === 'bad' ? 'bad' : override.done ? 'ok' : null : source?.done === 'Y' ? source.pass === 'N' ? 'bad' : 'ok' : null]
  }))
}

export function managerRows(data: Snapshot) {
  const statuses=managerStatuses(data)
  return managerItems(data).map(item=>({...item,item_id:item.id,time_block:item.section,fixed_time:item.time,done:statuses[item.id]!==null,status:statuses[item.id]}))
}
