// Uses the running loopback app and live Supabase. Only self-created test rows are removed.
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
const base='http://127.0.0.1:5173';let cookie='';let checks=0
async function api(path,method='GET',body,expected=200){
  const res=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json','X-Runn-Client':'local-review',Origin:base,Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)})
  const next=res.headers.get('set-cookie');if(next)cookie=next.split(';')[0]
  const data=await res.json();assert.equal(res.status,expected,JSON.stringify(data));checks++;return data
}
const secret=process.env.SUPABASE_SECRET_KEY;const dbBase=process.env.SUPABASE_URL
if(!secret||!dbBase)throw Error('Run with node --env-file=.env.local tests/integration.mjs')
async function db(path,method='GET',body){const headers={apikey:secret,'Content-Type':'application/json',Prefer:'return=representation'};if(secret.startsWith('eyJ'))headers.Authorization='Bearer '+secret;const res=await fetch(dbBase+'/rest/v1/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});const text=await res.text();if(!res.ok)throw Error('Database test operation failed: '+res.status);return text?JSON.parse(text):null}
const cleanup={observations:[],actions:[],costs:[],reports:[],orders:[],check:null}
try{
  const health=await api('/health');assert.equal(health.connected,true);assert.equal(health.aiConnected,false)
  await api('/session','POST',{role:'sv',storeId:'S03'})
  const all=await api('/bootstrap?date=2026-08-16')
  assert.equal(all.sourceFiles,51);assert.equal(all.metrics.reduce((n,m)=>n+m.taskTotal,0),1176,'full-week pagination must not stop at 1000 rows')
  assert.equal(all.quality.invalidCompletionDates,9)
  await api('/session','POST',{role:'manager',storeId:'S03'})
  const day=await api('/bootstrap?date=2026-08-12')
  const sourceSales=await db('t2_c03_store_daily_sales?select=sales_amount&store_id=eq.S03&date=gte.2026-08-10&date=lte.2026-08-12')
  assert.equal(day.metrics[0].sales,sourceSales.reduce((n,r)=>n+Number(r.sales_amount),0))
  assert.equal(day.temperatures.length,17);assert.equal(day.temperatures.filter(r=>r.recorded==='Y'&&r.pass==='N').length,5)
  assert.ok(day.temperatures.every(r=>r.store_id==='S03'))
  await api('/bootstrap?date=2026-02-31','GET',undefined,400)
  await api('/actions','POST',{id:randomUUID(),store_id:'S03',business_date:'2026-08-12',title:' ',note:'확'},400)
  const shortIssue=await api('/actions','POST',{id:randomUUID(),store_id:'S03',business_date:'2026-08-12',title:'점',note:'확',category:'기타'})
  cleanup.actions.push(shortIssue.id);assert.equal(shortIssue.title,'점');assert.equal(shortIssue.source.description,'확')
  const future=await api('/bootstrap?date=2027-01-01')
  assert.equal(future.date,'2027-01-01');assert.equal(future.tasks.length,56)
  assert.ok(future.tasks.every(row=>row.is_new_day&&row.done===null),'dates without source records start as blank checklists')
  assert.equal(future.metrics[0].hasSales,false)
  const january=await api('/bootstrap?date=2026-01-15')
  const januarySales=await db('t1_sales?select=sales_amount&store_id=eq.S03&date=eq.2026-01-15')
  assert.equal(january.sales.find(row=>row.date==='2026-01-15').sales_amount,januarySales.reduce((n,row)=>n+Number(row.sales_amount),0))
  const date='2026-09-30';const original=await db('t2_r03_temperature_records?store_id=eq.S03&date=eq.'+date+'&order=_source_row')
  let item
  for(const candidate of ['T04-15','T04-14','T04-13','T04-12']){
    if(!(await db('runn_actions?source_key=eq.'+encodeURIComponent(`temperature:S03:${date}:${candidate}`))).length){item=candidate;break}
  }
  assert.ok(item,'a free test key is required; existing user workflows are never modified')
  const observationId=randomUUID();cleanup.observations.push(observationId)
  const payload={id:observationId,store_id:'S03',business_date:date,kind:'temperature',item_id:item,value:6.7,result:'pass',note:'[자동 검증] 기준 이탈 저장'}
  const observation=await api('/observations','POST',payload);assert.equal(observation.result,'fail','server must ignore client-supplied verdict')
  assert.equal((await api('/observations','POST',payload)).id,observationId)
  let a=(await db('runn_actions?id=eq.'+observation.action_id))[0];cleanup.actions.push(a.id)
  async function change(operation,note='확',expected=200,version=a.version){const result=await api('/actions/'+a.id,'PATCH',{operation,note,version,owner:'[자동 검증] 담당자',due_date:date},expected);if(expected===200)a=result;return result}
  await change('request_verification',undefined,400)
  await change('assign');assert.equal(a.status,'assigned')
  await change('start');assert.equal(a.status,'in_progress')
  await change('request_verification',undefined,400)
  const remeasure=randomUUID();cleanup.observations.push(remeasure)
  await api('/observations','POST',{...payload,id:remeasure,value:5,action_id:a.id,note:'[자동 검증] 경계값 재측정 적합'})
  await change('request_verification','   ',400)
  await change('request_verification');assert.equal(a.status,'awaiting_verification')
  assert.equal(a.note,'확')
  await change('verify',undefined,403)
  await api('/session','POST',{role:'sv',storeId:'S03'})
  await change('verify','   ',400)
  await change('verify',undefined,409,1)
  await change('reject');assert.equal(a.status,'in_progress')
  await change('request_verification');await change('verify');assert.equal(a.status,'closed')
  assert.equal(a.verification_note,'확')
  const recurrence=randomUUID();cleanup.observations.push(recurrence)
  const repeated=await api('/observations','POST',{...payload,id:recurrence,note:'[자동 검증] 종결 후 새 이탈'})
  cleanup.actions.push(repeated.action_id);assert.notEqual(repeated.action_id,a.id);assert.equal((await db('runn_actions?id=eq.'+a.id))[0].status,'closed')
  const costId=randomUUID();cleanup.costs.push(costId);const cost={id:costId,store_id:'S03',business_date:date,category:'기타',amount:12345,memo:'비'}
  await api('/costs','POST',{...cost,id:randomUUID(),memo:'   '},400)
  await api('/costs','POST',cost);await api('/costs','POST',cost);assert.equal((await db('runn_costs?id=eq.'+costId)).length,1)
  const reportId=randomUUID();cleanup.reports.push(reportId)
  await api('/reports','POST',{id:reportId,store_id:'S03',business_date:date,title:' ',summary:'고'},400)
  await api('/reports','POST',{id:reportId,store_id:'S03',business_date:date,title:'보',summary:'고',metrics:{sales:-1}})
  const report=(await db('runn_reports?id=eq.'+reportId))[0];assert.notEqual(report.metrics.sales,-1);assert.equal(report.metrics.ai,false)
  await api('/reports/'+reportId,'PATCH',{reply:' '},400)
  await api('/reports/'+reportId,'PATCH',{reply:'확'})
  assert.equal((await db('runn_reports?id=eq.'+reportId))[0].reply,'확')
  const inv=await api('/bootstrap?date='+date);const ingredient=inv.ingredients[0];const orderId=randomUUID();cleanup.orders.push(orderId)
  await api('/orders','POST',{id:orderId,store_id:'S03',business_date:date,supplier_id:ingredient.supplier_id,items:[{ingredient_id:ingredient.ingredient_id,qty:Number(ingredient.min_order_qty)}]})
  const price=inv.prices.find(p=>p.ingredient_id===ingredient.ingredient_id&&p.valid_from<=date)
  assert.equal((await db('runn_order_drafts?id=eq.'+orderId))[0].amount,Number(ingredient.min_order_qty)*Number(price.unit_price))
  const checkItem='T02-56';const previous=await db(`runn_checks?store_id=eq.S03&business_date=eq.${date}&item_id=eq.${checkItem}`);cleanup.check={date,item:checkItem,previous}
  await api('/checks','POST',{store_id:'S03',business_date:date,item_id:checkItem,done:true})
  assert.equal((await api('/bootstrap?date='+date)).checks.find(c=>c.store_id==='S03'&&c.item_id===checkItem).done,true)
  await api('/session','POST',{role:'manager',storeId:'S03'})
  await api('/costs','POST',{...cost,id:randomUUID(),store_id:'S01'},403)
  assert.deepEqual(await db('t2_r03_temperature_records?store_id=eq.S03&date=eq.'+date+'&order=_source_row'),original,'the imported records must remain unchanged')
  const blocked=await fetch(base+'/api/costs',{method:'POST',headers:{Origin:'https://other-site.example','Content-Type':'application/json','X-Runn-Client':'local-review'},body:'{}'});assert.equal(blocked.status,403)
  console.log(JSON.stringify({passed:true,apiAssertions:checks,fullWeekTasks:1176,sourceDataPreserved:true,workflow:'assignment -> work -> remeasurement -> request -> reject -> request -> SV verification -> recurrence',aiConnected:false}))
}finally{
  for(const id of cleanup.observations)await db('runn_observations?id=eq.'+id,'DELETE')
  for(const id of cleanup.actions)if(id)await db('runn_actions?id=eq.'+id,'DELETE')
  for(const id of cleanup.costs)await db('runn_costs?id=eq.'+id,'DELETE')
  for(const id of cleanup.reports)await db('runn_reports?id=eq.'+id,'DELETE')
  for(const id of cleanup.orders)await db('runn_order_drafts?id=eq.'+id,'DELETE')
  if(cleanup.check){const {date,item,previous}=cleanup.check;await db(`runn_checks?store_id=eq.S03&business_date=eq.${date}&item_id=eq.${item}`,'DELETE');if(previous.length)await db('runn_checks','POST',previous[0])}
}
