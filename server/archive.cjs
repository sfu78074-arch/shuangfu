'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const L=require('../audit-ledger.js'),E=require('../experiment-core.js');
const YEAR=2026,MODELS=['S4.5','S4.6'];
const equal=(a,b)=>JSON.stringify([a.period,...a.regular,a.special])===JSON.stringify([b.period,...b.regular,b.special]);
function normalize(payload){
 const list=Array.isArray(payload)?payload:payload?.data;
 if(!Array.isArray(list))throw new Error('开奖接口格式异常');
 const map=new Map();
 for(const r of list){
  if(!/^2026\d{3}$/.test(String(r.expect)))continue;
  const period=Number(r.expect.slice(4)),nums=String(r.openCode).split(',').map(Number),at=L.openTime(r.openTime);
  if(period<1||period>365||nums.length!==7||new Set(nums).size!==7||nums.some(n=>!Number.isInteger(n)||n<1||n>49)||!Number.isFinite(at))throw new Error('开奖数据异常');
  // The current game's issue numbers are calendar-day numbers; fail closed on a change.
  if(new Date(at+8*3600000).toISOString().slice(0,10)!==new Date(Date.UTC(YEAR,0,period)).toISOString().slice(0,10))throw new Error('期号与开奖日期不符');
  const d={period,regular:nums.slice(0,6),special:nums[6],openTime:new Date(at).toISOString()};
  if(map.has(period)&&JSON.stringify(map.get(period))!==JSON.stringify(d))throw new Error('同一期开奖冲突');
  map.set(period,d);
 }
 return [...map.values()].sort((a,b)=>a.period-b.period);
}
function prepare(old,history,latest,now){
 if(old.schema!==1||old.year!==YEAR||!Array.isArray(old.entries)||!Array.isArray(old.draws))throw new Error('服务器存档格式异常，拒绝覆盖');
 if(!L.validHistory(history)||!latest.length||!equal(history.at(-1),latest.at(-1)))throw new Error('历史与最新开奖未同步');
 const h=history.at(-1),target=h.period+1;
 if(now<L.openTime(h.openTime))throw new Error('接口时间晚于当前时间');
 for(const d of old.draws){const current=history.find(r=>r.period===d.period);if(!current||!equal(d,current)||d.openTime!==current.openTime)throw new Error('历史发生变化，保留原存档并停止');}
 const seen=new Set();for(const e of old.entries){if(seen.has(e.id)||e.schema!==3||e.source!=='server'||!L.validPrediction(e.prediction)||e.rule!==L.RULES[e.model]||e.id!==`${YEAR}:${e.period}:${e.model}`)throw new Error('原存档无效或重复');seen.add(e.id);}
 const existing=old.entries.filter(e=>e.period===target);
 if(existing.length&&existing.length!==2)throw new Error('已有存档不完整，不补写另一套模型');
 // Stop one hour before normal drawing time; never archive an overdue missing issue.
 const cutoff=Date.UTC(YEAR,0,target,12,30);
 return {target,cutoff,shouldCreate:target<=365&&!existing.length&&now<cutoff,history};
}
function append(old,prepared,predictions,now,run){
 const {target,cutoff,history}=prepared;
 const out=JSON.parse(JSON.stringify(old));out.draws=history;out.checkedAt=new Date(now).toISOString();out.latest=history.at(-1).period;
 out.status=target>365?'year-complete':prepared.shouldCreate?'recorded':old.entries.some(e=>e.period===target)?'recorded':'cutoff-missed';
 if(prepared.shouldCreate){
  if(now>=cutoff)throw new Error('计算完成时已超过存档截止时间');
  if(!MODELS.every(m=>L.validPrediction(predictions[m])))throw new Error('预测结构无效');
  const createdAt=new Date(now).toISOString(),historySignature=L.signature(history);
  const historySha256=crypto.createHash('sha256').update(JSON.stringify(history.map(d=>[d.period,...d.regular,d.special]))).digest('hex');
  const control=E.active(target)?E.newControl(target,createdAt,()=>crypto.randomBytes(4).readUInt32LE(0)):null;
  for(const model of MODELS)out.entries.push({schema:3,id:`${YEAR}:${target}:${model}`,year:YEAR,period:target,model,rule:L.RULES[model],source:'server',createdAt,cutoffAt:new Date(cutoff).toISOString(),dataThrough:target-1,historySignature,historySha256,prediction:predictions[model],control,run});
  if(!out.startedAt)out.startedAt=createdAt;
 }
 return out;
}
async function json(url){
 const r=await fetch(url,{headers:{Accept:'application/json','Cache-Control':'no-cache'},signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw new Error('开奖读取失败 HTTP '+r.status);return r.json();
}
async function main(){
 if(process.env.GITHUB_ACTIONS!=='true')throw new Error('正式存档只允许定时后台生成');
 const file='data/server-ledger.json',old=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{schema:1,year:YEAR,entries:[],draws:[]};
 const [h,l]=await Promise.all([json('https://history.macaumarksix.com/history/macaujc2/y/2026'),json('https://macaumarksix.com/api/macaujc2.com')]);
 const history=normalize(h),latest=normalize(l),prepared=prepare(old,history,latest,Date.now());
 const predictions=prepared.shouldCreate?require('./model.cjs').compute(history):null;
 const check=normalize(await json('https://macaumarksix.com/api/macaujc2.com'));
 if(!check.length||!equal(latest.at(-1),check.at(-1)))throw new Error('计算期间开奖已更新，本次不留档');
 const now=Date.now(),run={id:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,commit:process.env.GITHUB_SHA};
 const output=append(old,prepared,predictions,now,run);
 fs.mkdirSync('data',{recursive:true});fs.writeFileSync(file,JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({status:output.status,latest:output.latest,target:prepared.target,entries:output.entries.length}));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={normalize,prepare,append};
