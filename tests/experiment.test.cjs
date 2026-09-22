const test=require('node:test');
const assert=require('node:assert/strict');
const Ledger=require('../audit-ledger.js');
const E=require('../experiment-core.js');
const fixture=require('./fixtures/history263.json');
const source=JSON.parse(JSON.stringify(fixture));
// Synthetic future results are used only to exercise the prospective lifecycle.
for(let period=264;period<=365;period++)source.push({period,regular:[1,2,3,4,5,6],special:24,openTime:new Date(Date.UTC(2026,0,period,13,32,32)).toISOString()});
const hist=source.map(({period,regular,special})=>({period,regular,special}));
const prediction={one:[24],three:[24,28,34],sixn:[24,28,34,1,2,3],nine:[24,28,34,1,2,3,4,5,6],four:['羊','马','蛇','龙'],six:['羊','马','蛇','龙','兔','虎']};
function setup(){
  const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
  let clock=0;const ledger=Ledger.create(storage,()=>clock);
  function sync(period){clock=Ledger.openTime(source[period-1].openTime)+3600000;ledger.ingest(hist.slice(0,period),source.slice(0,period),{latestConfirmed:true,apiLatest:period});}
  function record(period,model='S4.5',p=prediction){sync(period-1);return ledger.record(model,hist.slice(0,period-1),period,p);}
  return {map,storage,ledger,sync,record};
}
test('fixed plan excludes transition period and ends at 100 periods without rolling forward',()=>{
  assert.equal(E.PLAN.start,266);assert.equal(E.PLAN.end,365);assert.equal(E.PLAN.end-E.PLAN.start+1,100);
  assert.equal(E.active(265),false);assert.equal(E.active(266),true);assert.equal(E.active(365),true);assert.equal(E.active(366),false);
  assert.equal(Object.isFrozen(E.PLAN),true);assert.equal(E.PLAN.alpha,.0125);
});
test('random sets have exact sizes and rejected random output cannot silently fall back',()=>{
  let state=123456789;const word=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
  for(let i=0;i<40;i++){const c=E.newControl(266,'2026-09-22T15:00:00Z',word);assert.equal(E.validControl(c,266),true);}
  assert.throws(()=>E.newControl(266,'2026-09-22T15:00:00Z',()=>-1),/随机数无效/);
  assert.throws(()=>E.newControl(266,'2026-09-22T15:00:00Z',()=>4294967295),/生成失败/);
});
test('zodiac probability counts actual numbers, including the five-number horse group',()=>{
  assert.equal(E.coverage(prediction,'nine'),9);assert.equal(E.coverage(prediction,'four'),17);
  assert.equal(E.coverage({...prediction,four:['羊','蛇','龙','兔']},'four'),16);
  assert.equal(E.hit(prediction,'four',49),true);assert.equal(E.hit(prediction,'four',24),true);
});
test('model and control save together; both models share one immutable control across reloads',()=>{
  const x=setup(),a=x.record(266),b=x.record(266,'S4.6');
  assert.equal(a.saved,true);assert.deepEqual(a.entry.control,b.entry.control);
  const reloaded=Ledger.create(x.storage);assert.deepEqual(reloaded.entries()[0].control,a.entry.control);
  const again=x.record(266,'S4.5',{...prediction,one:[34]});assert.equal(again.saved,false);assert.deepEqual(again.entry,a.entry);
  assert.equal(E.comparison(hist.slice(0,265),x.ledger).pending.filter(x=>x.saved).length,2);
  x.sync(266);const result=E.comparison(hist.slice(0,266),x.ledger);
  assert.equal(result.elapsed,1);assert.equal(result.rows.length,4);assert.ok(result.rows.every(r=>r.n===1&&r.h===1&&r.missing===0));
  assert.equal(result.rows[1].expected,17/49);
});
test('legacy predictions and retrospectively added controls do not become paired results',()=>{
  const x=setup();const a=x.record(266).entry;
  const records=JSON.parse(x.map.get(Ledger.KEY));delete records[a.id].control;x.map.set(Ledger.KEY,JSON.stringify(records));
  assert.equal(x.record(266).entry.control,undefined);
  x.sync(266);assert.equal(E.comparison(hist.slice(0,266),x.ledger).rows[0].n,0);
  records[a.id].control=a.control;records[a.id].control.createdAt=source[265].openTime;x.map.set(Ledger.KEY,JSON.stringify(records));
  assert.equal(E.comparison(hist.slice(0,266),x.ledger).rows[0].n,0);
});
test('missing records break streaks and remain missing within the fixed calendar window',()=>{
  const x=setup(),miss={...prediction,nine:[1,2,3,4,5,6,7,8,9],four:['牛','鼠','猪','狗']};
  x.record(266,'S4.5',miss);x.record(268,'S4.5',miss);x.record(270,'S4.5',miss);x.sync(270);
  const r=E.comparison(hist.slice(0,270),x.ledger).rows[0];
  assert.equal(r.n,3);assert.equal(r.h,0);assert.equal(r.missing,2);assert.equal(r.maxMiss,1);
  x.sync(365);assert.equal(E.comparison(hist,x.ledger).rows[0].verdict.state,'incomplete');
});
test('backup imports keep controls and reject conflicts without changing saved evidence',()=>{
  const x=setup();x.record(266);x.record(266,'S4.6');x.sync(266);
  const exported=x.ledger.backup(),other=setup();other.ledger.restore(exported);
  assert.equal(exported.experimentPlan.id,E.PLAN.id);
  assert.deepEqual(E.comparison(hist.slice(0,266),other.ledger).rows,E.comparison(hist.slice(0,266),x.ledger).rows);
  const changed=JSON.parse(JSON.stringify(exported)),c=changed.records['2026:266:S4.6'].control;
  c.prediction.nine[0]=Array.from({length:49},(_,i)=>i+1).find(n=>!c.prediction.nine.includes(n));
  assert.throws(()=>other.ledger.restore(changed),/对照冲突/);
  const empty=setup();assert.throws(()=>empty.ledger.restore(changed),/对照冲突/);assert.equal(empty.ledger.entries().length,0);
});
test('conflicting or wrongly timed controls are excluded, including pending status',()=>{
  const x=setup();x.record(266);x.record(266,'S4.6');
  const records=JSON.parse(x.map.get(Ledger.KEY));records['2026:266:S4.6'].control.createdAt='2026-09-24T00:00:00Z';x.map.set(Ledger.KEY,JSON.stringify(records));
  assert.equal(E.comparison(hist.slice(0,265),x.ledger).pending.some(x=>x.saved),false);
  x.sync(266);assert.ok(E.comparison(hist.slice(0,266),x.ledger).rows.every(r=>r.n===0));
});
test('predeclared final test never upgrades during the window or with missing samples',()=>{
  assert.equal(E.verdict({h:99,n:99},false,'nine').state,'running');
  assert.equal(E.verdict({h:99,n:99},true,'nine').state,'incomplete');
  assert.equal(E.verdict({h:18,n:100},true,'nine').state,'unproven');
  assert.equal(E.verdict({h:60,n:100},true,'nine').state,'signal');
  assert.equal(E.verdict({h:34,n:100},true,'four').state,'unproven');
  assert.ok(Math.abs(E.binomialTail(1,9,9/49)-(1-Math.pow(40/49,9)))<1e-12);
});
