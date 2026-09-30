'use strict';
const fs=require('node:fs');
const YEAR=2026;
const A=`data/draw-archive-${YEAR}.json`,R=`data/zodiac-research-${YEAR}.json`,M=`data/zodiac-meta-research-${YEAR}.json`,OUT=`data/zodiac-forward-ledger-${YEAR}.json`;
const simp={鼠:'鼠',牛:'牛',虎:'虎',兔:'兔',龍:'龙',龙:'龙',蛇:'蛇',馬:'马',马:'马',羊:'羊',猴:'猴',雞:'鸡',鸡:'鸡',狗:'狗',豬:'猪',猪:'猪'};
const zn=v=>simp[String(v)]||String(v);
function load(p){return JSON.parse(fs.readFileSync(p,'utf8'))}
function clone(x){return JSON.parse(JSON.stringify(x))}
function modelsForNext(r,m){const out={};
 out.baseline={};out.cold={};out.meta={};out.optimized={};
 for(let n=2;n<=6;n++){
  out.baseline[n]=m.current.models.omission[n];
  out.cold[n]=r.current.models.cold[n];
  out.meta[n]=m.current.models.oc85[n];
  // Current evidence supports cold for 2-sho; omission remains stronger/stabler for 3-6.
  out.optimized[n]=n===2?r.current.models.cold[n]:m.current.models.omission[n];
 }
 return out;
}
function validatePred(entry){for(const [name,model] of Object.entries(entry.models||{})){for(let n=2;n<=6;n++){const p=model[n];if(!Array.isArray(p)||p.length!==n||new Set(p).size!==n)throw new Error(`invalid prediction ${entry.targetExpect} ${name} ${n}`)}}}
function main(){const a=load(A),r=load(R),m=load(M);if(!Array.isArray(a.draws)||!a.draws.length)throw new Error('archive invalid');let ledger=fs.existsSync(OUT)?load(OUT):{schema:1,year:YEAR,createdAt:new Date().toISOString(),entries:[]};if(ledger.schema!==1||ledger.year!==YEAR||!Array.isArray(ledger.entries))throw new Error('ledger invalid');
 const draws=new Map(a.draws.map(d=>[String(d.expect),d]));
 const seen=new Set();for(const e of ledger.entries){if(seen.has(e.targetExpect))throw new Error('duplicate forward entry '+e.targetExpect);seen.add(e.targetExpect);validatePred(e);const d=draws.get(e.targetExpect);if(d&&!e.resolved){const actual=zn(d.specialZodiac);e.resolved={resolvedAt:new Date().toISOString(),actualSpecial:d.special,actualZodiac:actual,hits:{}};for(const [name,model] of Object.entries(e.models)){e.resolved.hits[name]={};for(let n=2;n<=6;n++)e.resolved.hits[name][n]=model[n].includes(actual);}}}
 const latest=a.draws.at(-1),targetPeriod=latest.period+1,targetExpect=String(YEAR*1000+targetPeriod);
 if(!seen.has(targetExpect)){
  if(r.current.targetExpect!==targetExpect||m.current.targetExpect!==targetExpect)throw new Error('research target mismatch');
  const entry={schema:1,targetExpect,targetPeriod,dataThrough:latest.expect,createdAt:new Date().toISOString(),archiveSha256:a.sha256||null,models:modelsForNext(r,m),resolved:null};validatePred(entry);ledger.entries.push(entry);
 }
 ledger.updatedAt=new Date().toISOString();ledger.latestArchived=latest.expect;ledger.nextTarget=targetExpect;
 const summary={};for(const name of ['baseline','cold','meta','optimized']){summary[name]={};for(let n=2;n<=6;n++){const rows=ledger.entries.filter(e=>e.resolved);const hits=rows.filter(e=>e.resolved.hits?.[name]?.[n]).length;summary[name][n]={resolved:rows.length,hits,hitRate:rows.length?hits/rows.length:null};}}ledger.summary=summary;
 fs.writeFileSync(OUT,JSON.stringify(ledger,null,2)+'\n');console.log(JSON.stringify({status:'ok',entries:ledger.entries.length,resolved:ledger.entries.filter(e=>e.resolved).length,next:targetExpect}));}
if(require.main===module){try{main()}catch(e){console.error(e.stack||String(e));process.exitCode=1}}
