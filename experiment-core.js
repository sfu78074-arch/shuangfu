/* v68: a predeclared, local prospective comparison; never backfill controls. */
(function(root){
  'use strict';
  const PLAN=Object.freeze({id:'LOCAL-2026-266-365-v1',year:2026,start:266,end:365,size:100,
    metrics:Object.freeze(['nine','four']),models:Object.freeze(['S4.5','S4.6']),alpha:.05/4});
  const RANDOM_RULE='UNIFORM-49-12-v1';
  const ZODIACS=Object.freeze(['马','蛇','龙','兔','虎','牛','鼠','猪','狗','鸡','猴','羊']);
  const RULES=Object.freeze({'S4.5':'S45-S3-and-six-cold-v1','S4.6':'NUM-LOCK1-20260903|ZOD-LOCK1-20260906'});
  const active=t=>Number.isInteger(t)&&t>=PLAN.start&&t<=PLAN.end;
  const zodiac=n=>ZODIACS[(n-1)%12];
  function validPicks(p){
    return !!p&&[['nine',9],['four',4]].every(([k,size])=>Array.isArray(p[k])&&p[k].length===size&&
      new Set(p[k]).size===size&&p[k].every(x=>k==='four'?ZODIACS.includes(x):Number.isInteger(x)&&x>=1&&x<=49));
  }
  function randomWord(){
    if(typeof crypto==='undefined'||!crypto.getRandomValues)throw new Error('安全随机数不可用，未建立对照');
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  function drawIndex(size,word){
    const limit=4294967296-4294967296%size;
    for(let i=0;i<1024;i++){const n=word();if(!Number.isInteger(n)||n<0||n>4294967295)throw new Error('随机数无效');if(n<limit)return n%size;}
    throw new Error('随机对照生成失败');
  }
  function sample(values,size,word){
    const a=values.slice();
    for(let i=a.length-1;i>0;i--){const j=drawIndex(i+1,word);[a[i],a[j]]=[a[j],a[i]];}
    return a.slice(0,size);
  }
  function newControl(period,createdAt,word=randomWord){
    if(!active(period)||!Number.isFinite(Date.parse(createdAt)))throw new Error('对照期次或时间无效');
    return {plan:PLAN.id,period,rule:RANDOM_RULE,createdAt,prediction:{
      nine:sample(Array.from({length:49},(_,i)=>i+1),9,word),four:sample(ZODIACS,4,word)}};
  }
  function validControl(c,period){
    return !!c&&active(period)&&c.plan===PLAN.id&&c.period===period&&c.rule===RANDOM_RULE&&
      Number.isFinite(Date.parse(c.createdAt))&&validPicks(c.prediction);
  }
  function coverage(p,metric){
    return metric==='nine'?p.nine.length:Array.from({length:49},(_,i)=>i+1).filter(n=>p.four.includes(zodiac(n))).length;
  }
  function hit(p,metric,actual){return p[metric].includes(metric==='four'?zodiac(actual):actual);}
  function summarize(rows,metric){
    let h=0,randomHits=0,expected=0,randomExpected=0,cur=0,maxMiss=0,lastPeriod=null;
    for(const r of rows){
      if(lastPeriod!==null&&r.period!==lastPeriod+1)cur=0;
      const ok=hit(r.prediction,metric,r.actual);h+=Number(ok);cur=ok?0:cur+1;maxMiss=Math.max(maxMiss,cur);
      expected+=coverage(r.prediction,metric)/49;
      if(r.control){randomHits+=Number(hit(r.control,metric,r.actual));randomExpected+=coverage(r.control,metric)/49;}
      lastPeriod=r.period;
    }
    return {h,n:rows.length,randomHits,expected,randomExpected,maxMiss,currentMiss:cur,lastPeriod};
  }
  // For four zodiac groups the null bound is 17/49 (the largest coverage).
  // This conservative bound stays valid when chosen groups depend on past draws.
  function binomialTail(h,n,p){
    if(h<=0)return 1;
    let prob=Math.pow(1-p,n),tail=0;
    for(let k=0;k<=n;k++){if(k>=h)tail+=prob;if(k<n)prob*=((n-k)/(k+1))*(p/(1-p));}
    return Math.min(1,Math.max(0,tail));
  }
  function verdict(stats,finished,metric){
    if(!finished)return {state:'running',label:'观察中'};
    if(stats.n!==PLAN.size)return {state:'incomplete',label:'初评不完整 · 缺期不补算'};
    const p=binomialTail(stats.h,stats.n,metric==='nine'?9/49:17/49);
    return {state:p<=PLAN.alpha?'signal':'unproven',p,label:p<=PLAN.alpha?'出现优势信号 · 仍需新阶段复核':'初评未见充分优势'};
  }
  function comparison(hist,ledger){
    const latest=hist.at(-1)?.period||0,end=Math.min(latest,PLAN.end),elapsed=Math.max(0,end-PLAN.start+1);
    const entries=ledger.entries(),byId=new Map(entries.map(e=>[e.period+':'+e.model,e]));
    const rows=[],pending=[];
    for(const model of PLAN.models){
      const paired=[];
      for(let t=PLAN.start;t<=end;t++){
        const e=byId.get(t+':'+model),c=e?.control,checked=e&&ledger.inspect(e,hist);
        if(!e||e.rule!==RULES[model]||checked.status!=='checked'||!validControl(c,t))continue;
        const created=Date.parse(c.createdAt),previous=ledger.drawTime(t-1),opened=ledger.drawTime(t);
        if(!Number.isFinite(previous)||!Number.isFinite(opened)||created<previous||created>=opened||created>Date.parse(e.createdAt))continue;
        const conflicts=entries.some(x=>x.period===t&&x.control&&JSON.stringify(x.control)!==JSON.stringify(c));
        if(conflicts)continue;
        paired.push({period:t,prediction:e.prediction,control:c.prediction,actual:checked.actual.special});
      }
      for(const metric of PLAN.metrics){
        const stats=summarize(paired,metric);
        rows.push({model,metric,...stats,missing:elapsed-stats.n,verdict:verdict(stats,latest>=PLAN.end,metric)});
      }
      const t=latest+1,e=byId.get(t+':'+model);
      const c=e?.control,controlTime=Date.parse(c?.createdAt);
      const consistent=!entries.some(x=>x.period===t&&x.control&&JSON.stringify(x.control)!==JSON.stringify(c));
      pending.push({model,period:t,saved:active(t)&&!!e&&e.rule===RULES[model]&&validControl(c,t)&&consistent&&
        controlTime>=ledger.drawTime(t-1)&&controlTime<=Date.parse(e.createdAt)&&ledger.inspect(e,hist).status==='pending',entry:e});
    }
    return {latest,elapsed,rows,pending,finished:latest>=PLAN.end};
  }
  const api={PLAN,RULES,RANDOM_RULE,ZODIACS,active,newControl,validControl,coverage,hit,summarize,binomialTail,verdict,comparison};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.S68Experiment=api;
})(typeof window!=='undefined'?window:this);
