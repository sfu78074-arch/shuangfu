'use strict';

const fs=require('node:fs');
const YEAR=2026;
const ARCHIVE=`data/draw-archive-${YEAR}.json`;
const OUT=`data/zodiac-research-${YEAR}.json`;
const Z=['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
const simp={鼠:'鼠',牛:'牛',虎:'虎',兔:'兔',龍:'龙',龙:'龙',蛇:'蛇',馬:'马',马:'马',羊:'羊',猴:'猴',雞:'鸡',鸡:'鸡',狗:'狗',豬:'猪',猪:'猪'};
const zn=v=>simp[String(v)]||String(v);
const special=d=>zn(d.specialZodiac);
function numCount(z,p){return p<48?(z==='蛇'?5:4):(z==='马'?5:4)}
function baseProb(z,p){return numCount(z,p)/49}
function omissions(h){const o={};for(const z of Z){let i=h.length-1;while(i>=0&&special(h[i])!==z)i--;o[z]=i<0?h.length:h.length-1-i;}return o}
function freqs(h,k){const out=Object.fromEntries(Z.map(z=>[z,0]));for(const d of h.slice(-k))out[special(d)]++;return out}
function completedGaps(h,z){const idx=[];for(let i=0;i<h.length;i++)if(special(h[i])===z)idx.push(i);const g=[];for(let i=1;i<idx.length;i++)g.push(idx[i]-idx[i-1]);return g}
function hazard(h,z,o){const g=completedGaps(h,z),need=o+1;if(!g.length)return .08;let survived=0,ended=0;for(const x of g){if(x>=need)survived++;if(x===need)ended++;}return (ended+1.5)/(survived+3);}
function transitionScores(h,p){const prev=special(h.at(-1));const c=Object.fromEntries(Z.map(z=>[z,0]));let n=0;for(let i=1;i<h.length;i++)if(special(h[i-1])===prev){c[special(h[i])]++;n++;}const a=1.25;const den=n+a*Z.length;const out={};for(const z of Z){const post=(c[z]+a)/den;out[z]=Math.log(post/baseProb(z,p));}return out}
function rankNormalize(scores){const arr=Z.map((z,i)=>({z,v:Number.isFinite(scores[z])?scores[z]:-1e9,i})).sort((a,b)=>b.v-a.v||a.i-b.i);const out={};arr.forEach((x,i)=>out[x.z]=1-i/(Z.length-1));return out}
function modelRanks(h,p){const om=omissions(h),f5=freqs(h,5),f10=freqs(h,10),f20=freqs(h,20),f30=freqs(h,30);const transition=transitionScores(h,p);
  const raw={omission:{},cold:{},hazard:{},transition:{},balanced:{},rebound:{}};
  for(const z of Z){
    const prob=baseProb(z,p),expected5=5*prob,expected10=10*prob,expected20=20*prob,expected30=30*prob;
    raw.omission[z]=om[z]*numCount(z,p);
    const d5=(expected5-f5[z])/Math.sqrt(Math.max(.3,expected5*(1-prob)));
    const d10=(expected10-f10[z])/Math.sqrt(Math.max(.4,expected10*(1-prob)));
    const d20=(expected20-f20[z])/Math.sqrt(Math.max(.6,expected20*(1-prob)));
    const d30=(expected30-f30[z])/Math.sqrt(Math.max(.8,expected30*(1-prob)));
    raw.cold[z]=.10*d5+.20*d10+.30*d20+.40*d30;
    raw.hazard[z]=hazard(h,z,om[z]);
    raw.transition[z]=transition[z];
  }
  const norm={};for(const k of ['omission','cold','hazard','transition'])norm[k]=rankNormalize(raw[k]);
  for(const z of Z){
    raw.balanced[z]=.42*norm.omission[z]+.24*norm.cold[z]+.22*norm.hazard[z]+.12*norm.transition[z];
    // rebound emphasizes empirical return hazard but keeps long omissions relevant.
    raw.rebound[z]=.55*norm.hazard[z]+.30*norm.omission[z]+.15*norm.cold[z];
  }
  const ranks={};for(const k of Object.keys(raw))ranks[k]=rankNormalize(raw[k]);
  return {raw,ranks};
}
function picksFromRank(r,n){return Z.slice().sort((a,b)=>r[b]-r[a]||Z.indexOf(a)-Z.indexOf(b)).slice(0,n)}
function coverage(picks,p){return picks.reduce((s,z)=>s+numCount(z,p),0)/49}
function maxMiss(rows){let m=0,c=0;for(const r of rows){if(r.hit)c=0;else{c++;m=Math.max(m,c)}}return m}
function rate(rows,k){const a=k?rows.slice(-k):rows;return a.length?a.filter(r=>r.hit).length/a.length:null}
function avg(rows,key){return rows.length?rows.reduce((s,r)=>s+r[key],0)/rows.length:null}
function metric(rows){const hr=rate(rows),base=avg(rows,'base');return{tested:rows.length,hits:rows.filter(r=>r.hit).length,hitRate:hr,theoreticalBaseline:base,edge:hr-base,recent100:rate(rows,100),recent50:rate(rows,50),recent30:rate(rows,30),maxConsecutiveMisses:maxMiss(rows)};}
function adaptiveRank(baseNames,perf,n){const weights={};let sum=0;for(const name of baseNames){const hist=perf[name][n]||[];const a=hist.slice(-50);let w=1;if(a.length>=20){const e=rate(a)-avg(a,'base');w=Math.max(.08,.45+e*8);}weights[name]=w;sum+=w;}for(const k of baseNames)weights[k]/=sum;return weights;}
function run(draws){const start=draws.findIndex(d=>d.period>=78);if(start<1)throw new Error('not enough draws');const baseNames=['omission','cold','hazard','transition','balanced','rebound'];const allNames=[...baseNames,'ensemble','adaptive'];const perf={};for(const m of allNames){perf[m]={};for(let n=2;n<=6;n++)perf[m][n]=[];}
  const lastRanks={};
  for(let i=start;i<draws.length;i++){
    const h=draws.slice(0,i),p=draws[i].period,actual=special(draws[i]),mr=modelRanks(h,p);
    const ens={};for(const z of Z)ens[z]=baseNames.reduce((s,m)=>s+mr.ranks[m][z],0)/baseNames.length;
    for(let n=2;n<=6;n++){
      const weights=adaptiveRank(baseNames,perf,n),ad={};for(const z of Z)ad[z]=baseNames.reduce((s,m)=>s+weights[m]*mr.ranks[m][z],0);
      const rankMap={...mr.ranks,ensemble:rankNormalize(ens),adaptive:rankNormalize(ad)};
      for(const m of allNames){const picks=picksFromRank(rankMap[m],n);perf[m][n].push({period:p,expect:draws[i].expect,hit:picks.includes(actual),base:coverage(picks,p),picks,actual});}
    }
  }
  const nextP=draws.at(-1).period+1,nextMR=modelRanks(draws,nextP),ens={};for(const z of Z)ens[z]=baseNames.reduce((s,m)=>s+nextMR.ranks[m][z],0)/baseNames.length;
  const current={targetExpect:String(YEAR*1000+nextP),targetPeriod:nextP,dataThrough:draws.at(-1).expect,models:{}};
  for(const m of baseNames)current.models[m]={};current.models.ensemble={};current.models.adaptive={};
  for(let n=2;n<=6;n++){
    const weights=adaptiveRank(baseNames,perf,n),ad={};for(const z of Z)ad[z]=baseNames.reduce((s,m)=>s+weights[m]*nextMR.ranks[m][z],0);
    const rankMap={...nextMR.ranks,ensemble:rankNormalize(ens),adaptive:rankNormalize(ad)};
    for(const m of allNames)current.models[m][n]=picksFromRank(rankMap[m],n);
    current.models.adaptive[`weights_${n}`]=weights;
  }
  const results={};for(const m of allNames){results[m]={};for(let n=2;n<=6;n++){const rows=perf[m][n];const total=metric(rows);const first=metric(rows.slice(0,Math.floor(rows.length/2)));const second=metric(rows.slice(Math.floor(rows.length/2)));const holdout=metric(rows.filter(r=>r.period>=231));results[m][n]={...total,firstHalf:first,secondHalf:second,holdout231plus:holdout};}}
  const four=allNames.map(m=>({model:m,...results[m][4]})).sort((a,b)=>b.edge-a.edge);
  const fourStable=allNames.map(m=>{const r=results[m][4],h=r.holdout231plus;const stability=Math.min(r.firstHalf.edge,r.secondHalf.edge,h.edge);return{model:m,edge:r.edge,holdoutEdge:h.edge,recent30:r.recent30,recent50:r.recent50,stability};}).sort((a,b)=>b.stability-a.stability||b.holdoutEdge-a.holdoutEdge);
  return {schema:1,year:YEAR,builtAt:new Date().toISOString(),dataThrough:draws.at(-1).expect,testStart:draws[start].expect,tested:draws.length-start,models:results,current,fourByOverallEdge:four,fourByStability:fourStable,notes:['All predictions are walk-forward: only draws before each target are used.','Adaptive weights use only trailing past model performance.','Holdout231plus is reported separately to expose overfitting risk.','Research results are not a guarantee of future outcomes.']};
}
function main(){const a=JSON.parse(fs.readFileSync(ARCHIVE,'utf8'));if(!Array.isArray(a.draws)||!a.draws.length)throw new Error('archive invalid');const out=run(a.draws.slice().sort((x,y)=>x.period-y.period));fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({status:'ok',dataThrough:out.dataThrough,tested:out.tested,topStable:out.fourByStability[0]}));}
if(require.main===module){try{main()}catch(e){console.error(e.stack||String(e));process.exitCode=1}}
module.exports={run,modelRanks,omissions,freqs,hazard};
