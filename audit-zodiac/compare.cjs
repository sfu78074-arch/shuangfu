'use strict';
/**
 * Non-production diagnostic: compare the shipped fixed-year zodiac treatment
 * with the archived zodiac for each historic draw.  No files are modified.
 *
 * Run: node audit-zodiac/compare.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const raw = JSON.parse(fs.readFileSync(path.join(root, 'data/draw-archive-2026.json'), 'utf8'));
if (raw.year !== 2026 || !Array.isArray(raw.draws)) throw new Error('This audit supports only the supplied 2026 archive');
const draws = raw.draws.slice().sort((a,b) => a.period-b.period);
const history = draws.map(({period, regular, special}) => ({period, regular, special}));
const ZS = ['马','蛇','龙','兔','虎','牛','鼠','猪','狗','鸡','猴','羊'];
const numToZ = Object.fromEntries(Array.from({length:49}, (_,i) => [i+1, ZS[i%12]]));
const ZODIAC = Object.fromEntries(ZS.map(z => [z, Array.from({length:49},(_,i)=>i+1).filter(n=>numToZ[n]===z)]));
const tradToSimple = { '龍':'龙', '馬':'马', '雞':'鸡', '豬':'猪' };
const normalize = z => tradToSimple[z] || z;
const archiveByPeriod = Object.fromEntries(draws.map(d => [d.period, d]));
const actualZ = Object.fromEntries(draws.map(d => [d.period, normalize(d.specialZodiac)]));

function validateArchive() {
 if(draws.length!==303) throw new Error(`Expected 303 draws, got ${draws.length}`);
 const errors=[], mismatches=[];
 for (let i=0; i<draws.length; i++) {
  const d=draws[i];
  if(d.period!==i+1) errors.push(`Missing/out-of-order period at index ${i}`);
  if(!Array.isArray(d.regular)||d.regular.length!==6||!Number.isInteger(d.special)||new Set([...d.regular,d.special]).size!==7) errors.push(`Invalid balls ${d.period}`);
  if([...d.regular,d.special].some(n=>!Number.isInteger(n)||n<1||n>49)) errors.push(`Out-of-bounds ball ${d.period}`);
  if(!ZS.includes(actualZ[d.period])) errors.push(`Invalid zodiac ${d.period}`);
  if(actualZ[d.period]!==numToZ[d.special]) mismatches.push(d.period);
 }
 if(errors.length) throw new Error(errors.join('\n'));
 return {count:draws.length,mismatches};
}

const p45 = fs.readFileSync(path.join(root,'s45.js'),'utf8').split('\ns44sRender=')[0];
const p46 = fs.readFileSync(path.join(root,'s46.js'),'utf8').split('\n(function(){')[0];
function prepareCode(corrected) {
 let t45=p45, t46=p46;
 if(corrected) {
  const replacements = [
   ['numToZ[x.special]','actualZ[x.period]'],
   ['numToZ[h[i].special]','actualZ[h[i].period]'],
   ['numToZ[actual[t]]','actualZ[t]']
  ];
  for(const [from,to] of replacements){
   const before=t45+'\n'+t46;
   if(!before.includes(from)) throw new Error(`Formula changed; audit replacement no longer matches: ${from}`);
   t45=t45.replaceAll(from,to); t46=t46.replaceAll(from,to);
  }
 }
 return t45+'\n'+t46;
}
function run(hist,target,corrected) {
 const ctx = vm.createContext({history:hist, actualZ, numToZ, ZODIAC, console, localStorage:{getItem:()=>null,setItem:()=>{}}});
 const code = prepareCode(corrected)+`\n({a:s45SixCompute(history,${target}),b:s46ZCompute(history,${target})})`;
 const x=vm.runInContext(code,ctx,{timeout:30000});
 return JSON.parse(JSON.stringify(x));
}
function summary(x) {
 return {s45Six:x.a.stats.hit+'/'+x.a.stats.n,s46Four:x.b.stats.four.h+'/'+x.b.stats.four.n,s46Six:x.b.stats.six.h+'/'+x.b.stats.six.n};
}
function main() {
 const v=validateArchive();
 const old=run(history,304,false), fixed=run(history,304,true);
 const changes={s45Six:[],s46Four:[],s46Six:[]};
 // Re-evaluate on 31..303, using only preceding history; these are historical research results, not prospectively saved results.
 for(let t=31;t<=303;t++) {
  const h=history.filter(x=>x.period<t);
  const a=run(h,t,false), b=run(h,t,true);
  if(JSON.stringify(a.a.current.six)!==JSON.stringify(b.a.current.six)) changes.s45Six.push(t);
  if(JSON.stringify(a.b.current.four)!==JSON.stringify(b.b.current.four)) changes.s46Four.push(t);
  if(JSON.stringify(a.b.current.six)!==JSON.stringify(b.b.current.six)) changes.s46Six.push(t);
 }
 const report={auditKind:'research-only',year:2026,archiveCount:v.count,oldVsArchiveZodiacMismatchCount:v.mismatches.length,oldVsArchiveZodiacMismatchPeriods:v.mismatches,old:summary(old),dateAware:summary(fixed),changedCandidateCount:Object.fromEntries(Object.entries(changes).map(([k,v])=>[k,v.length])),changedCandidatePeriods:changes,latestCandidatesUnchanged:JSON.stringify(old.a.current)===JSON.stringify(fixed.a.current)&&JSON.stringify(old.b.current)===JSON.stringify(fixed.b.current),message:'Historical replay only. Do not backfill or modify originally saved prospective predictions.'};
 return report;
}
module.exports={main, validateArchive, run, normalize, actualZ, archiveByPeriod, numToZ};

if(require.main===module) process.stdout.write(JSON.stringify(main(),null,2)+'\n');
