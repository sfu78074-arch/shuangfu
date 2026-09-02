(()=>{
'use strict';
const VERSION='S4.2 综合覆盖版';
const ZODIAC={马:[1,13,25,37,49],蛇:[2,14,26,38],龙:[3,15,27,39],兔:[4,16,28,40],虎:[5,17,29,41],牛:[6,18,30,42],鼠:[7,19,31,43],猪:[8,20,32,44],狗:[9,21,33,45],鸡:[10,22,34,46],猴:[11,23,35,47],羊:[12,24,36,48]};
const RED=new Set([1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46]);
const BLUE=new Set([3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48]);
const FIVE={金:[4,5,12,13,26,27,34,35,42,43],木:[8,9,16,17,24,25,38,39,46,47],水:[1,14,15,22,23,30,31,44,45],火:[2,3,10,11,18,19,32,33,40,41,48,49],土:[6,7,20,21,28,29,36,37]};
const numToZ={};Object.entries(ZODIAC).forEach(([z,a])=>a.forEach(n=>numToZ[n]=z));
const numToFive={};Object.entries(FIVE).forEach(([z,a])=>a.forEach(n=>numToFive[n]=z));
const wave=n=>RED.has(n)?'红':BLUE.has(n)?'蓝':'绿';
const parity=n=>n%2?'单':'双';
const size=n=>n>=25?'大':'小';
const fmt=n=>String(n).padStart(2,'0');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const std=a=>{if(!a.length)return 1;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)*(x-m))))||1};
function normalizeObj(o){const ks=Object.keys(o),v=ks.map(k=>+o[k]),m=mean(v),s=std(v),r={};ks.forEach(k=>r[k]=(+o[k]-m)/s);return r}
function getHistory(){
  let arr=(typeof BUILTIN!=='undefined'&&Array.isArray(BUILTIN))?BUILTIN.map(x=>({...x,period:+x.period,regular:(x.regular||[]).map(Number),special:+x.special})):[];
  try{const local=JSON.parse(localStorage.getItem('standalone_s3_draws_v2')||'[]');if(Array.isArray(local)&&local.length){const m=new Map(arr.map(x=>[x.period,x]));local.forEach(x=>{if(x&&x.period){m.set(+x.period,{period:+x.period,regular:(x.regular||[]).map(Number),special:+x.special})}});arr=[...m.values()]}}
  catch(e){}
  return arr.filter(x=>x.period&&x.regular.length===6&&x.special).sort((a,b)=>a.period-b.period);
}
function histBefore(hist,t){return hist.filter(x=>x.period<t)}
function recent(hist,t,w){const h=histBefore(hist,t);return h.slice(Math.max(0,h.length-w))}
function attrTransScore(hist,t,fn,cand,lookback=120){const h=histBefore(hist,t).slice(-lookback);if(h.length<2)return 0;const from=fn(h[h.length-1].special);let same=0,total=0;for(let i=1;i<h.length;i++){if(fn(h[i-1].special)===from){total++;if(fn(h[i].special)===cand)same++}}return (same+1)/(total+Math.max(2,new Set(h.map(x=>fn(x.special))).size))}
function omission(hist,t,n){const h=histBefore(hist,t);for(let i=h.length-1;i>=0;i--)if(h[i].special===n)return h.length-1-i;return Math.min(60,h.length)}
function coverageScores(hist,t){
 const h=histBefore(hist,t), last=h[h.length-1]||null;
 const raw={};
 const f10=recent(hist,t,10),f30=recent(hist,t,30),f60=recent(hist,t,60),a10=f10.flatMap(x=>[...x.regular,x.special]),a30=f30.flatMap(x=>[...x.regular,x.special]);
 const cSp=w=>{const c={};for(let n=1;n<=49;n++)c[n]=0;w.forEach(x=>c[x.special]++);return c};
 const cAll=a=>{const c={};for(let n=1;n<=49;n++)c[n]=0;a.forEach(n=>c[n]++);return c};
 const s10=cSp(f10),s30=cSp(f30),s60=cSp(f60),all10=cAll(a10),all30=cAll(a30);
 const exp={};for(let n=1;n<=49;n++)exp[n]=0;for(let i=h.length-1;i>=0&&h.length-1-i<90;i--){const age=h.length-1-i;exp[h[i].special]+=Math.exp(-age/18)}
 const feats={sf10:{},sf30:{},sf60:{},all10:{},all30:{},exp:{},omit:{},repeat:{},trans:{},pressure:{}};
 for(let n=1;n<=49;n++){
  feats.sf10[n]=s10[n];feats.sf30[n]=s30[n];feats.sf60[n]=s60[n];feats.all10[n]=all10[n];feats.all30[n]=all30[n];feats.exp[n]=exp[n];feats.omit[n]=clamp(omission(hist,t,n),0,45);
  feats.repeat[n]=last&&[...last.regular,last.special].includes(n)?1:0;
  const tr=.34*attrTransScore(hist,t,wave,wave(n))+.20*attrTransScore(hist,t,parity,parity(n))+.18*attrTransScore(hist,t,size,size(n))+.16*attrTransScore(hist,t,x=>numToFive[x],numToFive[n])+.12*attrTransScore(hist,t,x=>numToZ[x],numToZ[n]);feats.trans[n]=tr;
  const r30=recent(hist,t,30);const countAttr=(fn,val)=>r30.reduce((s,x)=>s+(fn(x.special)===val),0);let p=0;
  p+=.34*(10-countAttr(wave,wave(n)));p+=.20*(15-countAttr(parity,parity(n)));p+=.18*(15-countAttr(size,size(n)));p+=.16*(6-countAttr(x=>numToFive[x],numToFive[n]));p+=.12*(2.5-countAttr(x=>numToZ[x],numToZ[n]));feats.pressure[n]=p;
 }
 const z={};Object.keys(feats).forEach(k=>z[k]=normalizeObj(feats[k]));
 const W={sf10:.12,sf30:.12,sf60:.06,all10:.08,all30:.08,exp:.10,omit:.22,repeat:.06,trans:.09,pressure:.07};
 for(let n=1;n<=49;n++){raw[n]=0;for(const k in W)raw[n]+=W[k]*z[k][n]}
 return raw;
}
function rankedByScore(score){return Object.keys(score).map(Number).sort((a,b)=>score[b]-score[a]||a-b)}
function getLog(obj,t){if(!obj)return null;const v=obj[t]||obj[String(t)];return Array.isArray(v)?v.map(Number):null}
function ensureCandidate(hist,t,kind){
 const g50=typeof modelLog50!=='undefined'?modelLog50:null,gS2=typeof modelLogS2!=='undefined'?modelLogS2:null;
 let r=kind==='50'?getLog(g50,t):getLog(gS2,t);if(r&&r.length>=9)return r.slice(0,9);
 if(typeof linearRank!=='function')return null;
 const h=histBefore(hist,t),c=new Map(),r50=linearRank(h,t,50,c),r100=linearRank(h,t,100,c),s2=(typeof blendRanks==='function'?blendRanks(r50,r100):r50);
 r=(kind==='50'?r50:s2).slice(0,9);return r;
}
function hitRate(logMap,actual,start,end){let n=0,h=0;for(let p=start;p<=end;p++){const pred=logMap[p];if(pred&&actual[p]!=null){n++;if(pred.includes(actual[p]))h++}}return n?h/n:9/49}
function buildBaseMap(hist,maxTarget){
 const actual={};hist.forEach(x=>actual[x.period]=x.special);const L50={},LS2={},base={},mode={};let prev='50';
 for(let t=31;t<=maxTarget;t++){L50[t]=ensureCandidate(hist,t,'50');LS2[t]=ensureCandidate(hist,t,'S2');if(!L50[t]||!LS2[t])continue;let ch='50';if(t<81)ch='50';else{const s30=Math.max(31,t-30),s60=Math.max(31,t-60);const a=.65*hitRate(L50,actual,s30,t-1)+.35*hitRate(L50,actual,s60,t-1);const b=.65*hitRate(LS2,actual,s30,t-1)+.35*hitRate(LS2,actual,s60,t-1);if(b>=a+.03)ch='S2';else if(a>=b+.03)ch='50';else ch=prev}mode[t]=ch;base[t]=(ch==='S2'?LS2[t]:L50[t]).slice(0,9);prev=ch}
 return {base,mode,L50,LS2};
}
function rescueNine(base9,covScore){const out=base9.slice(0,6),r=rankedByScore(covScore);for(const n of r){if(!out.includes(n))out.push(n);if(out.length===9)break}return out}
function nestedRank(final9,base9,covScore){const covRank=rankedByScore(covScore),cp={};covRank.forEach((n,i)=>cp[n]=1-i/48);const bp={};base9.forEach((n,i)=>bp[n]=1-i/8);return final9.slice().sort((a,b)=>((.70*(bp[b]??0)+.30*cp[b])-(.70*(bp[a]??0)+.30*cp[a]))||a-b)}
function zodiacFeatureScores(hist,t,final9,kind){
 const zs=Object.keys(ZODIAC),h=histBefore(hist,t),r5=recent(hist,t,5),r10=recent(hist,t,10),r20=recent(hist,t,20),r40=recent(hist,t,40),a10=r10.flatMap(x=>[...x.regular,x.special]),a30=recent(hist,t,30).flatMap(x=>[...x.regular,x.special]);
 const feat={f5:{},f10:{},f20:{},f40:{},omit:{},trans:{},a10:{},a30:{},support:{},pressure:{}};
 const sf=(r,z)=>r.reduce((s,x)=>s+(numToZ[x.special]===z),0),af=(a,z)=>a.reduce((s,n)=>s+(numToZ[n]===z),0);
 for(const z of zs){feat.f5[z]=sf(r5,z);feat.f10[z]=sf(r10,z);feat.f20[z]=sf(r20,z);feat.f40[z]=sf(r40,z);let om=h.length;for(let i=h.length-1;i>=0;i--){if(numToZ[h[i].special]===z){om=h.length-1-i;break}}feat.omit[z]=Math.min(24,om);feat.trans[z]=attrTransScore(hist,t,x=>numToZ[x],z);feat.a10[z]=af(a10,z);feat.a30[z]=af(a30,z);feat.support[z]=final9.reduce((s,n,i)=>s+(numToZ[n]===z?1/(1+i*.22):0),0);feat.pressure[z]=2.5-sf(recent(hist,t,30),z)}
 const zf={};Object.keys(feat).forEach(k=>zf[k]=normalizeObj(feat[k]));
 let W;if(kind==='base4')W={f5:.14,f10:.17,f20:.13,f40:.08,omit:.10,trans:.19,a10:.05,a30:.04,support:.08,pressure:.02};
 else if(kind==='cover4')W={f5:.07,f10:.10,f20:.11,f40:.09,omit:.23,trans:.20,a10:.04,a30:.04,support:.05,pressure:.07};
 else W={f5:.05,f10:.09,f20:.11,f40:.10,omit:.22,trans:.15,a10:.05,a30:.05,support:.08,pressure:.10};
 const out={};for(const z of zs){out[z]=0;for(const k in W)out[z]+=W[k]*zf[k][z]}return out;
}
function zodiacPred(hist,t,final9,fourMiss){const s4=zodiacFeatureScores(hist,t,final9,fourMiss>=4?'cover4':'base4'),s6=zodiacFeatureScores(hist,t,final9,'six'),four=Object.keys(s4).sort((a,b)=>s4[b]-s4[a]).slice(0,4),six=four.slice();for(const z of Object.keys(s6).sort((a,b)=>s6[b]-s6[a])){if(!six.includes(z))six.push(z);if(six.length===6)break}return {four,six,mode:fourMiss>=4?'四肖覆盖':'四肖常规'}}
function maxMissUpdate(st,hit){if(hit){st.cur=0}else{st.cur++;if(st.cur>st.max)st.max=st.cur}}
function computeAll(hist,target,withStats=false){
 const bm=buildBaseMap(hist,target),actual={};hist.forEach(x=>actual[x.period]=x.special);let nineMiss=0,fourMiss=0,current=null;const S={one:{hit:0,cur:0,max:0},three:{hit:0,cur:0,max:0},sixn:{hit:0,cur:0,max:0},nine:{hit:0,cur:0,max:0},fourz:{hit:0,cur:0,max:0},sixz:{hit:0,cur:0,max:0}},start=31,last=Math.min(target-1,Math.max(...hist.map(x=>x.period)));
 for(let t=start;t<=target;t++){
  const base9=bm.base[t];if(!base9)continue;const cov=coverageScores(hist,t),final9=nineMiss>=9?rescueNine(base9,cov):base9.slice(),nested=nestedRank(final9,base9,cov),zp=zodiacPred(hist,t,final9,fourMiss),pred={target:t,mode:bm.mode[t],rescue:nineMiss>=9,nine:final9,rank:nested,one:nested.slice(0,1),three:nested.slice(0,3),sixn:nested.slice(0,6),fourz:zp.four,sixz:zp.six,zmode:zp.mode};
  if(t===target)current=pred;
  if(t<=last&&actual[t]!=null){const sp=actual[t],az=numToZ[sp],hits={one:pred.one.includes(sp),three:pred.three.includes(sp),sixn:pred.sixn.includes(sp),nine:pred.nine.includes(sp),fourz:pred.fourz.includes(az),sixz:pred.sixz.includes(az)};Object.keys(hits).forEach(k=>{if(hits[k])S[k].hit++;maxMissUpdate(S[k],hits[k])});nineMiss=hits.nine?0:nineMiss+1;fourMiss=hits.fourz?0:fourMiss+1}
 }
 const n=Math.max(0,last-start+1);return {current,stats:withStats?{n,S}:null};
}
function styles(){return `<style id="s42style">#s42{max-width:760px;margin:12px auto 22px;padding:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eaf2ff}#s42 *{box-sizing:border-box}#s42 .hero{background:linear-gradient(135deg,#17233a,#0f1728);border:1px solid #2a3b5e;border-radius:18px;padding:16px;box-shadow:0 10px 30px #0005}#s42 h1{font-size:22px;margin:0 0 4px}#s42 .sub{color:#9fb0ca;font-size:13px}#s42 .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}@media(max-width:560px){#s42 .grid{grid-template-columns:1fr}}#s42 .card{background:#101a2d;border:1px solid #263753;border-radius:14px;padding:12px}#s42 .lab{font-size:13px;color:#9fb0ca;margin-bottom:7px}#s42 .vals{font-weight:800;font-size:20px;letter-spacing:.4px;line-height:1.45;word-break:break-word}#s42 .zvals{font-size:18px}#s42 .meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}#s42 .pill{font-size:12px;padding:5px 8px;background:#172641;border:1px solid #2c4167;border-radius:999px;color:#c8d8ef}#s42 .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}#s42 button{border:0;border-radius:10px;padding:10px 13px;font-weight:700;background:#dbe8ff;color:#10203a}#s42 button.secondary{background:#1c2b46;color:#dce8fb;border:1px solid #31486e}#s42 table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}#s42 th,#s42 td{padding:8px 6px;border-bottom:1px solid #24344f;text-align:center}#s42 th:first-child,#s42 td:first-child{text-align:left}#s42 .note{font-size:12px;color:#91a1b8;line-height:1.55;margin-top:10px}#s42 .ok{color:#9fe4ae}#s42 .warn{color:#ffd98e}</style>`}
function render(){
 const hist=getHistory();if(!hist.length)return;const latest=Math.max(...hist.map(x=>x.period)),target=latest+1;let res;try{res=computeAll(hist,target,false)}catch(e){console.error(e);return}const p=res.current;if(!p)return;
 let root=document.getElementById('s42');if(!root){document.head.insertAdjacentHTML('beforeend',styles());root=document.createElement('section');root.id='s42';document.body.insertBefore(root,document.body.firstChild)}
 document.title='盘口 S4.2';root.innerHTML=`<div class="hero"><h1>🔥 ${VERSION}</h1><div class="sub">历史已载入 1–${latest}期 · 当前预测 ${target}期 · 号码层与生肖层分开优化</div><div class="grid"><div class="card"><div class="lab">⭐ 1码</div><div class="vals">${p.one.map(fmt).join(' ')}</div></div><div class="card"><div class="lab">🎯 3码</div><div class="vals">${p.three.map(fmt).join(' ')}</div></div><div class="card"><div class="lab">🔥 6码</div><div class="vals">${p.sixn.map(fmt).join(' ')}</div></div><div class="card"><div class="lab">🟢 9码</div><div class="vals">${p.nine.map(fmt).join(' ')}</div></div><div class="card"><div class="lab">🐲 四肖</div><div class="vals zvals">${p.fourz.join('、')}</div></div><div class="card"><div class="lab">🐲 六肖</div><div class="vals zvals">${p.sixz.join('、')}</div></div></div><div class="meta"><span class="pill">9码基础模式：${p.mode==='S2'?'S2稳定':'50窗'}</span><span class="pill ${p.rescue?'warn':'ok'}">9码覆盖：${p.rescue?'救援模式 6+3':'常规模式'}</span><span class="pill">${p.zmode}</span><span class="pill">五行：固定2026 A表</span></div><div class="actions"><button id="s42recalc">重新计算</button><button class="secondary" id="s42bt">严格回测 31–${latest}期</button></div><div id="s42stats"></div><div class="note">S4.2规则：9码沿用S3动态主模型，连续9期未覆盖时才启动约70/30的独立覆盖救援；1/3/6码在9码内部按主模型70% + 独立覆盖30%二次排序，保持 1⊂3⊂6⊂9；四肖/六肖使用独立生肖覆盖层。回测只使用每期之前的数据，历史命中率不代表未来保证。</div></div>`;
 document.getElementById('s42recalc').onclick=render;document.getElementById('s42bt').onclick=()=>{const b=document.getElementById('s42bt'),box=document.getElementById('s42stats');b.disabled=true;b.textContent='回测计算中…';setTimeout(()=>{try{const R=computeAll(getHistory(),target,true),st=R.stats.S,n=R.stats.n,rows=[['⭐ 1码',st.one],['🎯 3码',st.three],['🔥 6码',st.sixn],['🟢 9码',st.nine],['🐲 四肖',st.fourz],['🐲 六肖',st.sixz]];box.innerHTML=`<table><thead><tr><th>项目</th><th>命中</th><th>命中率</th><th>最长连空</th></tr></thead><tbody>${rows.map(([k,v])=>`<tr><td>${k}</td><td>${v.hit}/${n}</td><td>${(v.hit/n*100).toFixed(2)}%</td><td>${v.max}期</td></tr>`).join('')}</tbody></table><div class="note">这是当前网页中这套 S4.2 实际代码的逐期回测结果，不使用未来数据。</div>`}catch(e){box.innerHTML=`<div class="note warn">回测失败：${e.message}</div>`}finally{b.disabled=false;b.textContent=`严格回测 31–${latest}期`}},80)};
}
let sig='';function watch(){try{const h=getHistory(),s=h.length?`${h.length}:${h[h.length-1].period}:${h[h.length-1].special}`:'';if(s!==sig){sig=s;render()}}catch(e){console.log(e)}}
setTimeout(render,450);setInterval(watch,1800);
})();
