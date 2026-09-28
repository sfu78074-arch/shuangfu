/* Read-only, shared server records. Local backups remain separate. */
(function(root){
 'use strict';
 const L=typeof module!=='undefined'&&module.exports?require('./audit-ledger.js'):root.S67Ledger;
 function create(){
  let data=null,error='',revision=0;
  function ingest(value){
   if(value?.schema!==1||value.year!==2026||!L.validHistory(value.draws)||!Array.isArray(value.entries)||!Number.isFinite(Date.parse(value.checkedAt)))throw new Error('服务器记录格式异常');
   const seen=new Set();for(const e of value.entries){
    if(e.schema!==3||e.source!=='server'||e.year!==2026||!L.RULES[e.model]||e.rule!==L.RULES[e.model]||e.id!==`2026:${e.period}:${e.model}`||seen.has(e.id)||!L.validPrediction(e.prediction))throw new Error('服务器记录无效或重复');seen.add(e.id);
   }
   if(data)for(const e of data.entries){if(JSON.stringify(value.entries.find(x=>x.id===e.id))!==JSON.stringify(e))throw new Error('首次存档发生变化，保留上次读取结果');}
   data=JSON.parse(JSON.stringify(value));error='';revision++;
  }
  function inspect(e,hist){
   const fail=reason=>({status:'unverified',reason});
   if(!L.validHistory(hist)||!data)return fail('历史不完整');
   const past=hist.filter(d=>d.period<e.period),t=Date.parse(e.createdAt),cutoff=Date.UTC(2026,0,e.period,12,30);
   if(e.dataThrough!==e.period-1||past.length!==e.period-1||L.signature(past)!==e.historySignature)return fail('历史与首次存档不符');
   const serverPast=data.draws.filter(d=>d.period<e.period);
   if(L.signature(serverPast)!==e.historySignature)return fail('服务器历史不符');
   const prev=L.openTime(serverPast.at(-1)?.openTime);
   if(!Number.isFinite(t)||!Number.isFinite(prev)||t<prev||t>=cutoff||Date.parse(e.cutoffAt)!==cutoff)return fail('存档时间核验未通过');
   const actual=hist.find(d=>d.period===e.period),source=data.draws.find(d=>d.period===e.period);
   if(!actual)return {status:'pending',reason:'服务器已存档 · 待开奖'};
   if(!source||L.signature([actual])!==L.signature([source])||!Number.isFinite(L.openTime(source.openTime)))return fail('等待服务器核对开奖');
   if(t>=L.openTime(source.openTime))return {status:'late',reason:'保存晚于开奖 · 不计成绩'};
   return {status:'checked',reason:'服务器提前存档已核对'};
  }
  function stats(hist,model){
   const out=Object.fromEntries(Object.keys(L.METRICS).map(k=>[k,{h:0,n:0}]));
   const z=['马','蛇','龙','兔','虎','牛','鼠','猪','狗','鸡','猴','羊'];
   for(const e of data?.entries||[]){if(e.model!==model||inspect(e,hist).status!=='checked')continue;const n=hist.find(d=>d.period===e.period).special;
    for(const k of Object.keys(out)){out[k].n++;out[k].h+=Number(e.prediction[k].includes(k==='four'||k==='six'?z[(n-1)%12]:n));}
   }return out;
  }
  return {ingest,inspect,stats,entries:()=>data?.entries||[],get data(){return data},get error(){return error},get revision(){return revision},setError(e){error=e;revision++}};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={create};
 else{
  const ledger=root.S69ServerAudit=create();
  async function refresh(){try{const r=await fetch('/api/predictions',{cache:'no-store',signal:AbortSignal.timeout(20000)});const value=await r.json();if(!r.ok)throw new Error(value.error||'读取失败');ledger.ingest(value)}catch(e){ledger.setError('服务器存档：'+e.message)}root.dispatchEvent(new Event('server-audit-update'));}
  refresh();setInterval(refresh,60000);
 }
})(typeof window!=='undefined'?window:globalThis);
