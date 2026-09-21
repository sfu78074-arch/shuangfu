const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const zlib=require('node:zlib');
const Ledger=require('../audit-ledger.js');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/history263.json'),'utf8'));
const history=source.map(({period,regular,special})=>({period,regular,special}));
const root=path.join(__dirname,'..');
const prediction={one:[24],three:[24,28,34],sixn:[24,28,34,1,2,3],nine:[24,28,34,1,2,3,4,5,6],four:['羊','马','蛇','龙'],six:['羊','马','蛇','龙','兔','虎']};
function memory(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),map};}
function setup(period=261){
  let clock=Ledger.openTime(source[period-2].openTime)+3600000;
  const storage=memory(),ledger=Ledger.create(storage,()=>clock),past=history.slice(0,period-1);
  ledger.ingest(past,source.slice(0,period-1),{latestConfirmed:true,apiLatest:period-1,conflicts:[]});
  return {storage,ledger,past,setClock:n=>{clock=n},getClock:()=>clock};
}
test('only first saved predictions count; results are matched to those saved arrays',()=>{
  const x=setup(),saved=x.ledger.record('S4.6',x.past,261,prediction);assert.equal(saved.saved,true);
  const different={...prediction,one:[34]};assert.equal(x.ledger.record('S4.6',x.past,261,different).saved,false);
  assert.equal(x.ledger.inspect(saved.entry,x.past).status,'pending');
  assert.deepEqual(x.ledger.stats(x.past,'S4.6').one,{h:0,n:0});
  x.ledger.ingest(history.slice(0,261),source.slice(0,261),{latestConfirmed:true,apiLatest:261});
  assert.equal(x.ledger.inspect(saved.entry,history.slice(0,261)).status,'checked');
  assert.deepEqual(x.ledger.stats(history.slice(0,261),'S4.6').one,{h:1,n:1});
  assert.deepEqual(x.ledger.stats(history.slice(0,261),'S4.6').four,{h:1,n:1});
  assert.deepEqual(x.ledger.stats(history.slice(0,261),'S4.5').one,{h:0,n:0});
});
test('post-draw records and seeded/legacy counters never become prospective successes',()=>{
  const x=setup();x.setClock(Ledger.openTime(source[260].openTime)+1000);
  x.ledger.ingest(x.past,source.slice(0,260),{latestConfirmed:true,apiLatest:260});
  const e=x.ledger.record('S4.6',x.past,261,prediction).entry;
  x.ledger.ingest(history.slice(0,261),source.slice(0,261),{latestConfirmed:true,apiLatest:261});
  assert.equal(x.ledger.inspect(e,history.slice(0,261)).status,'late');
  x.storage.setItem('s46_blind_predictions_v1',JSON.stringify({261:{one:[24]}}));
  assert.deepEqual(x.ledger.stats(history.slice(0,261),'S4.6').one,{h:0,n:0});
});
test('missing draw time, changed history and gaps are excluded',()=>{
  const x=setup(),e=x.ledger.record('S4.6',x.past,261,prediction).entry;
  assert.equal(x.ledger.inspect(e,history.slice(0,261)).status,'unverified');
  x.ledger.ingest(history.slice(0,261),source.slice(0,261),{latestConfirmed:true,apiLatest:261});
  const changed=JSON.parse(JSON.stringify(history.slice(0,261)));[changed[20].regular[0],changed[20].special]=[changed[20].special,changed[20].regular[0]];
  assert.equal(x.ledger.inspect(e,changed).status,'unverified');
  assert.equal(x.ledger.inspect(e,history.slice(1,261)).status,'unverified');
});
test('sync failure, conflicts, stale synchronization and past targets cannot create records',()=>{
  for(const options of [{latestConfirmed:false,apiLatest:260},{latestConfirmed:true,apiLatest:259},{latestConfirmed:true,apiLatest:260,conflicts:[250]}]){
    const x=setup();x.ledger.ingest(x.past,source.slice(0,260),options);assert.equal(x.ledger.record('S4.6',x.past,261,prediction).saved,false);
  }
  const x=setup();assert.equal(x.ledger.record('S4.6',x.past,260,prediction).saved,false);
  x.setClock(x.getClock()+60001);assert.equal(x.ledger.record('S4.6',x.past,261,prediction).saved,false);
});
test('backup and restore preserve first predictions, metadata, and conflict protection',()=>{
  const x=setup();x.ledger.record('S4.6',x.past,261,prediction);
  x.ledger.ingest(history.slice(0,261),source.slice(0,261),{latestConfirmed:true,apiLatest:261});
  const other=Ledger.create(memory());other.restore(x.ledger.backup());
  assert.deepEqual(other.stats(history.slice(0,261),'S4.6').one,{h:1,n:1});
  const conflict=x.ledger.backup();conflict.records['2026:261:S4.6'].prediction.one=[34];
  assert.throws(()=>other.restore(conflict),/冲突/);
  assert.deepEqual(other.stats(history.slice(0,261),'S4.6').one,{h:1,n:1});
});
test('storage errors and malformed ledgers are preserved and surfaced',()=>{
  const x=setup();x.storage.setItem(Ledger.KEY,'broken JSON');
  assert.equal(x.ledger.record('S4.6',x.past,261,prediction).saved,false);assert.match(x.ledger.error,/未能保存/);
  assert.equal(x.storage.getItem(Ledger.KEY),'broken JSON');
  const bad=Ledger.create({getItem:()=>null,setItem:()=>{throw new Error('quota')}});
  bad.ingest(x.past,source,{latestConfirmed:true,apiLatest:260});assert.match(bad.error,/保存失败/);
});
test('upstream draw times without timezone are interpreted as UTC+8',()=>{
  assert.equal(Ledger.openTime('2026-09-18 21:32:32'),Date.parse('2026-09-18T13:32:32Z'));
  assert.ok(Number.isNaN(Ledger.openTime('invalid')));
});
function modelContext(){
  const html=zlib.gunzipSync(Buffer.from([0,1,2,3,4].map(i=>fs.readFileSync(path.join(root,`p${i}.txt`),'utf8')).join(''),'base64')).toString();
  let code=html.slice(html.indexOf('const BUILTIN = '),html.indexOf('function ball(n)'));
  code=code.replace('const $=id=>document.getElementById(id), regs=[...document.querySelectorAll(".reg")];','').replace('let draws=load(),lastPred=null,busy=false;','');
  code+='\nconst numToZ=NUM_Z;\n'+fs.readFileSync(path.join(root,'s44state.js'),'utf8');
  code+='\n'+fs.readFileSync(path.join(root,'s46.js'),'utf8').split('\n(function(){')[0];
  code+='\n'+fs.readFileSync(path.join(root,'s45.js'),'utf8').split('\ns44sRender=')[0];
  const audit=fs.readFileSync(path.join(root,'prediction-audit.js'),'utf8');
  code+='\n'+audit.slice(audit.indexOf('async function s67ReplayS46'),audit.indexOf('\n(function(){'));
  const storage=memory(),ctx=vm.createContext({history,localStorage:storage,window:{S67Ledger:Ledger},setTimeout,console});
  vm.runInContext(code,ctx,{timeout:60000});return {ctx,storage};
}
test('four-zodiac historical hits update to 77/233 instead of a frozen 75',()=>{
  const {ctx}=modelContext();
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(s45FourCompute(history,264))',ctx)),{h:77,n:233});
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(s45FourCompute(history.filter(d=>d.period<=245),246))',ctx)),{h:75,n:215});
});
test('recent replay matches the original formulas and does not alter live state or storage',async()=>{
  const {ctx,storage}=modelContext();
  const expected=vm.runInContext(`(()=>{const out=[];for(let t=245;t<=264;t++){const h=history.filter(d=>d.period<t);const p=s46Compute(h,t),z=s46ZCompute(h,t).current;if(t>=256)out.push({period:t,actual:history.find(d=>d.period===t)?.special,prediction:{...p,...z}});}return JSON.stringify(out);})()`,ctx,{timeout:180000});
  const state=vm.runInContext('JSON.stringify([modelLog50,modelLogS2,choiceLog])',ctx),before=JSON.stringify([...storage.map]);
  const replay=await vm.runInContext('s67ReplayS46(history,256,264)',ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(replay)),JSON.parse(expected));
  assert.equal(vm.runInContext('JSON.stringify([modelLog50,modelLogS2,choiceLog])',ctx),state);
  assert.equal(JSON.stringify([...storage.map]),before);
  const sums={};for(const k of ['one','three','sixn','nine'])sums[k]=replay.filter(r=>r.period<=263&&r.prediction[k].includes(r.actual)).length;
  assert.deepEqual(sums,{one:0,three:1,sixn:1,nine:1});
  assert.deepEqual(JSON.parse(JSON.stringify(replay.at(-1).prediction.nine)),[34,4,10,8,42,48,31,36,45]);
});
