import test from 'node:test'
import assert from 'node:assert/strict'
import { temperatureResult, acidResult, deriveIssues, monday, addDays, validDay, applyCheck } from '../src/domain.ts'

test('temperature limits include the boundary and retain unbounded ambient records',()=>{
  const chilled={min_c:0,max_c:5}
  for(const n of [0,5])assert.equal(temperatureResult(n,chilled),'pass')
  for(const n of [-0.1,5.1])assert.equal(temperatureResult(n,chilled),'fail')
  assert.equal(temperatureResult(-18,{min_c:null,max_c:-18}),'pass')
  assert.equal(temperatureResult(-17.9,{min_c:null,max_c:-18}),'fail')
  assert.equal(temperatureResult(70,{min_c:70,max_c:null}),'pass')
  assert.equal(temperatureResult(25,{min_c:null,max_c:null}),'unrated')
})
test('oil acidity applies exclusive lower and inclusive upper limits',()=>{
  assert.equal(acidResult(2.5),'pass');assert.equal(acidResult(2.6),'warning')
  assert.equal(acidResult(3),'warning');assert.equal(acidResult(3.1),'fail')
})
test('date arithmetic preserves Monday weeks over month boundaries',()=>{
  assert.equal(monday('2026-05-01'),'2026-04-27')
  assert.equal(monday('2026-08-16'),'2026-08-10')
  assert.equal(addDays('2026-09-30',1),'2026-10-01')
})
test('calendar dates extend beyond imported data and reject nonexistent days',()=>{
  for(const date of ['2026-01-01','2027-12-31','2028-02-29']) assert.equal(validDay(date),true)
  for(const date of ['2026-02-29','2027-02-30','2026-13-01']) assert.equal(validDay(date),false)
})
test('optimistic checks toggle immediately, coalesce without count drift, and leave other dates alone',()=>{
  const data={date:'2027-01-01',checks:[],tasks:[{store_id:'S03',item_id:'task',done:'N'}],metrics:[{store_id:'S03',taskDone:0,taskTotal:1,taskRate:0}]}
  const checked=applyCheck(data,'S03','2027-01-01','task',true)
  assert.equal(checked.checks[0].done,true);assert.equal(checked.metrics[0].taskDone,1)
  assert.equal(applyCheck(checked,'S03','2027-01-01','task',true).metrics[0].taskDone,1)
  const unchecked=applyCheck(checked,'S03','2027-01-01','task',false)
  assert.equal(unchecked.checks[0].done,false);assert.equal(unchecked.metrics[0].taskDone,0)
  assert.equal(applyCheck(checked,'S03','2026-12-31','task',false),checked)
  assert.equal(data.metrics[0].taskDone,0)
})
const base={temperatures:[],standards:[],acid:[],expiry:[],findings:[],actions:[],observations:[]}
test('a populated status on an unrecorded expiry row is not an expiry finding',()=>{
  assert.deepEqual(deriveIssues({...base,expiry:[{store_id:'S03',date:'2026-08-12',item_id:'T05-01',recorded:'N',status:'기한 경과 → 폐기'}]},'2026-08-12'),[])
})
test('invalid completion dates are data review; a future completion is still open as of the selected day',()=>{
  const common={store_id:'S03',date:'2026-08-12',finding:'설비 확인',action_request:'확인 요청',completed:'Y'}
  const result=deriveIssues({...base,findings:[{...common,finding_id:'bad',completed_date:'2026-08-11'},{...common,finding_id:'later',completed_date:'2026-08-24'}]},'2026-08-12')
  assert.equal(result.find(i=>i.source.finding_id==='bad').status,'data_review')
  assert.equal(result.find(i=>i.source.finding_id==='later').status,'open')
  assert.equal(result.find(i=>i.source.finding_id==='later').source.completed_date,null)
})
test('a linked workflow replaces the source card without duplicating the finding',()=>{
  const row={store_id:'S03',date:'2026-08-12',item_id:'T04-06',recorded:'Y',value_c:6.7,measure_time:'15:00'}
  const template={item_id:'T04-06',item:'양상추',standard:'0~5℃',min_c:0,max_c:5}
  const data={...base,temperatures:[row],standards:[template]}
  assert.equal(deriveIssues(data,'2026-08-12').length,1)
  const action={id:'action',source_key:'temperature:S03:2026-08-12:T04-06',store_id:'S03',business_date:'2026-08-12',title:'양상추 온도 기준 이탈',kind:'temperature',status:'assigned',severity:'critical',source:{...row,template}}
  const issues=deriveIssues({...data,actions:[action]},'2026-08-12')
  assert.equal(issues.length,1);assert.equal(issues[0].id,'action');assert.equal(issues[0].status,'assigned')
})
