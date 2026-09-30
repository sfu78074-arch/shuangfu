'use strict';
const fs=require('node:fs');
const YEAR=2026,ARCHIVE=`data/draw-archive-${YEAR}.json`,OUT=`data/zodiac-meta-research-${YEAR}.json`;
const {modelRanks}=require('./research-zodiac-models.cjs');
const Z=['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
const simp={鼠:'鼠',牛:'牛',虎:'虎',兔:'兔',龍:'龙',龙:'龙',蛇:'蛇',馬:'马',马:'马',羊:'羊',猴:'猴',雞:'鸡',鸡:'鸡',狗:'狗',豬:'猪',猪:'猪'};
const zn=v=>simp[String(v)]||String(v),special=d=>zn(d.specialZodiac);
function numCount(z,p){return p<48?(z==='蛇'?5:4):(z==='马'?5:4)}
function norm(r){const a=Z.slice().sort((x,y)=>r[y]-r[x]||Z.indexOf(x)-Z.indexOf(y)),o={};a.forEach((z,i)=>o[z]=1-i/(Z.length-1));return o}
function blend(parts){const o={};for(const z of Z)o[z]=parts.reduce((s,[r,w])=>s+r[z]*w,0);return norm(o)}
function picks(r,n){return Z.slice().sort((a,b)=>r[b]-r[a]||Z.indexOf(a)-Z.indexOf(b)).slice(0,n)}
function coverage(ps,p){return ps.reduce((s,z)=>s+numCount(z,p),0)/49}
function rate(rows,k){const a=k?rows.slice(-k):rows;return a.length?a.filter(x=>x.hit).length/a.length:null}
function avg(rows,key,k){const a=k?rows.slice(-k):rows;return a.length?a.reduce((s,x)=>s+x[key],0)/a.length:null}
function edge(rows,k){const a=k?rows.slice(-k):rows;return a.length?rate(a)-avg(a,'base'):0}
function maxMiss(rows){let m=0,c=0;for(const r of rows){if(r.hit)c=0;else{c++;m=Math.max(m,c)}}return m}
function metric(rows){const h=rate(rows),b=avg(rows,'base');return{tested:rows.length,hits:rows.filter(x=>x.hit).length,hitRate:h,theoreticalBaseline:b,edge:h-b,recent100:rate(rows,100),recent50:rate(rows,50),recent30:rate(rows,30),maxConsecutiveMisses:maxMiss(rows)};}
function chooseTrailing(perf,n,names,guarded=false){const base=perf.omission[n];if(base.length<30)return 'omission';let best='omission',bestScore=-Infinity;const base60=edge(base,60),base30=edge(base,30);for(const m of names){const rows=perf[m][n];if(rows.length<30)continue;const e60=edge(rows,60),e30=edge(rows,30),e100=edge(rows,100);const score=.45*e30+.40*e60+.15*e100;if(guarded&&m!=='omission'&&!(e60>base60+.035&&e30>=base30-.01))continue;if(score>bestScore){bestScore=score;best=m}}return best;}
function run(draws){const start=draws.findIndex(d=>d.period>=78);if(start<1)throw new Error('not enough draws');const fixed=['omission','oh90','oh80','oh70','oc85','omh','omh2'];const names=[...fixed,'selector','guarded'];const perf={};for(const m of names){perf[m]={};for(let n=2;n<=6;n++)perf[m][n]=[];}
 for(let i=start;i<draws.length;i++){
  const h=draws.slice(0,i),p=draws[i].period,actual=special(draws[i]),b=modelRanks(h,p).ranks;
  const ranks={omission:b.omission,oh90:blend([[b.omission,.90],[b.hazard,.10]]),oh80:blend([[b.omission,.80],[b.hazard,.20]]),oh70:blend([[b.omission,.70],[b.hazard,.30]]),oc85:blend([[b.omission,.85],[b.cold,.15]]),omh:blend([[b.omission,.70],[b.hazard,.20],[b.cold,.10]]),omh2:blend([[b.omission,.60],[b.hazard,.25],[b.cold,.15]])};
  for(let n=2;n<=6;n++){
    const select=chooseTrailing(perf,n,fixed,false),guard=chooseTrailing(perf,n,fixed,true);
    ranks.selector=ranks[select];ranks.guarded=ranks[guard];
    for(const m of names){const ps=picks(ranks[m],n);perf[m][n].push({period:p,hit:ps.includes(actual),base:coverage(ps,p),picks:ps,actual,selected:m==='selector'?select:m==='guarded'?guard:null});}
  }
 }
 const results={};for(const m of names){results[m]={};for(let n=2;n<=6;n++){const rows=perf[m][n],mid=Math.floor(rows.length/2);results[m][n]={...metric(rows),firstHalf:metric(rows.slice(0,mid)),secondHalf:metric(rows.slice(mid)),holdout231plus:metric(rows.filter(r=>r.period>=231))};}}
 const nextP=draws.at(-1).period+1,b=modelRanks(draws,nextP).ranks;const ranks={omission:b.omission,oh90:blend([[b.omission,.90],[b.hazard,.10]]),oh80:blend([[b.omission,.80],[b.hazard,.20]]),oh70:blend([[b.omission,.70],[b.hazard,.30]]),oc85:blend([[b.omission,.85],[b.cold,.15]]),omh:blend([[b.omission,.70],[b.hazard,.20],[b.cold,.10]]),omh2:blend([[b.omission,.60],[b.hazard,.25],[b.cold,.15]])};const current={targetExpect:String(YEAR*1000+nextP),dataThrough:draws.at(-1).expect,models:{}};for(const m of names)current.models[m]={};
 for(let n=2;n<=6;n++){const s=chooseTrailing(perf,n,fixed,false),g=chooseTrailing(perf,n,fixed,true);ranks.selector=ranks[s];ranks.guarded=ranks[g];for(const m of names)current.models[m][n]=picks(ranks[m],n);current.models.selector[`selected_${n}`]=s;current.models.guarded[`selected_${n}`]=g;}
 const four=names.map(m=>({model:m,...results[m][4]})).sort((a,b)=>b.edge-a.edge);const stable=names.map(m=>{const r=results[m][4];return{model:m,edge:r.edge,holdoutEdge:r.holdout231plus.edge,recent30:r.recent30,recent50:r.recent50,stability:Math.min(r.firstHalf.edge,r.secondHalf.edge,r.holdout231plus.edge)}}).sort((a,b)=>b.stability-a.stability||b.holdoutEdge-a.holdoutEdge);
 return{schema:1,year:YEAR,builtAt:new Date().toISOString(),dataThrough:draws.at(-1).expect,testStart:draws[start].expect,tested:draws.length-start,results,current,fourByEdge:four,fourByStability:stable,notes:['Fixed hybrids are evaluated walk-forward.','Selector and guarded selector choose only from performance observed before each target draw.','No current-target result is used to choose a model or weight.','Research-only until enough forward results accumulate.']};}
function main(){const a=JSON.parse(fs.readFileSync(ARCHIVE,'utf8')),out=run(a.draws.slice().sort((x,y)=>x.period-y.period));fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({status:'ok',top4:out.fourByStability[0],current:out.current.targetExpect}));}
if(require.main===module){try{main()}catch(e){console.error(e.stack||String(e));process.exitCode=1}}
module.exports={run};
