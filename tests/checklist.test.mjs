import test from 'node:test'
import assert from 'node:assert/strict'
import {checklistPhases,measureValues,judgeMeasure,measureLabel} from '../src/checklist.ts'

test('upstream open/close UI partitions every actual task once, including mid-shift work',()=>{
  const data={standards:[{item_id:'cook',item:'패티',storage:'조리 완료',standard:'70℃ 이상',min_c:70,max_c:null,measure_time:'11:00'},{item_id:'cold',item:'양상추',storage:'냉장',standard:'0~5℃',min_c:0,max_c:5,measure_time:'15:00'}]}
  const tasks=['오픈','중간','중간 마감','마감'].map((time_block,i)=>({item_id:`task-${i}`,task:`업무 ${i}`,time_block,done:i===0,status:i===2?'bad':null}))
  const phases=checklistPhases(data,tasks)
  assert.deepEqual(phases[0].groups.map(g=>g.id),['task-0'])
  assert.deepEqual(phases[1].groups.map(g=>g.id),['task-1','task-2','task-3'])
  assert.equal(phases[1].groups[1].status,'bad')
  assert.equal(phases[0].measures[0].item_id,'cook');assert.equal(phases[1].measures[0].item_id,'cold')
})
test('measurements use current-store current-day observations and preserve zero',()=>{
  const data={date:'2026-08-12',session:{storeId:'S03'},temperatures:[{store_id:'S03',item_id:'cold',recorded:'Y',value_c:0},{store_id:'S01',item_id:'other-store',recorded:'Y',value_c:5}],acid:[{store_id:'S03',fryer:'1번',recorded:'Y',acid_value:2.5}],observations:[{store_id:'S03',business_date:'2026-08-11',kind:'temperature',item_id:'cold',value:99},{store_id:'S03',business_date:'2026-08-12',kind:'acid',item_id:'1번',value:2.6}]}
  assert.deepEqual(measureValues(data),{cold:'0','acid:1번':'2.6'})
})
test('checklist measurement labels retain warning and unrated distinctions',()=>{
  const acid={kind:'acid'};assert.equal(judgeMeasure(acid,'2.5'),'ok');assert.equal(measureLabel(acid,'2.6'),'주의');assert.equal(measureLabel(acid,'3.1'),'기준 이탈')
  const ambient={kind:'temperature',min_c:null,max_c:null}
  assert.equal(measureLabel(ambient,'20'),'기록 완료')
  for(const value of ['','-','Infinity'])assert.equal(judgeMeasure(ambient,value),null)
  assert.equal(judgeMeasure({kind:'temperature',min_c:0,max_c:5},'0'),'ok')
})
