
const S43_VERSION='S4.3 自适应覆盖版';
function s43Mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:0}
function s43Hr(a,w,base){const x=a.slice(-w);return x.length?s43Mean(x.map(Boolean).map(Number)):base}
function s43Choose(keys,hist,prev,base){if(!prev)prev=keys[0];const score={};for(const k of keys)score[k]=.65*s43Hr(hist[k],30,base)+.35*s43Hr(hist[k],60,base);let best=keys[0];for(const k of keys)if(score[k]>score[best])best=k;return score[best]>=score[prev]+.03?best:prev}
function s43Rescue5(base9,cov){const out=base9.slice(0,5);for(const n of rankedByScore(cov)){if(!out.includes(n))out.push(n);if(out.length===9)break}return out}
function s43CovRank(base9,cov){return base9.slice().sort((a,b)=>(cov[b]-cov[a])||a-b)}
function s43ZSupport(final9,struct){const out={};for(const z of Object.keys(ZODIAC))out[z]=0;final9.forEach((n,i)=>out[numToZ[n]]+=1/Math.pow(i+1,.72));const z1=normalizeObj(out),z2=normalizeObj(struct),mix={};for(const z of Object.keys(out))mix[z]=.82*z1[z]+.18*z2[z];return mix}
function s43ZList(score,k){return Object.keys(score).sort((a,b)=>score[b]-score[a]).slice(0,k)}
function s43State(){return {one:{A:[],B:[],C:[]},three:{A:[],B:[],C:[]},sixn:{A:[],B:[],C:[]},nine:{A:[],B:[],C:[]},fourz:{A:[],B:[],C:[]},sixz:{A:[],B:[],C:[]},prev:{one:'A',three:'A',sixn:'A',nine:'A',fourz:'A',sixz:'A'}}}
function s43Miss(st,hit){if(hit)st.cur=0;else{st.cur++;st.max=Math.max(st.max,st.cur)}}
function s43Compute(hist,target,statsOn){
 const bm=buildBaseMap(hist,target),actual={};hist.forEach(x=>actual[x.period]=x.special);const H=s43State(),S={one:{hit:0,cur:0,max:0},three:{hit:0,cur:0,max:0},sixn:{hit:0,cur:0,max:0},nine:{hit:0,cur:0,max:0},fourz:{hit:0,cur:0,max:0},sixz:{hit:0,cur:0,max:0}},B={one:0,three:0,sixn:0,nine:0};let current=null;const last=Math.min(target-1,Math.max(...hist.map(x=>x.period)));
 for(let t=31;t<=target;t++){
  const base9=bm.base[t];if(!base9)continue;const cov=coverageScores(hist,t),nested=nestedRank(base9,base9,cov),covr=s43CovRank(base9,cov);
  const nA=base9.slice(),nB=rescueNine(base9,cov),nC=s43Rescue5(base9,cov);
  H.prev.nine=s43Choose(['A','B','C'],H.nine,H.prev.nine,9/49);const nine={A:nA,B:nB,C:nC}[H.prev.nine];
  const cand={one:{A:base9.slice(0,1),B:nested.slice(0,1),C:covr.slice(0,1)},three:{A:base9.slice(0,3),B:nested.slice(0,3),C:covr.slice(0,3)},sixn:{A:base9.slice(0,6),B:nested.slice(0,6),C:covr.slice(0,6)}};
  for(const k of ['one','three','sixn'])H.prev[k]=s43Choose(['A','B','C'],H[k],H.prev[k],k==='one'?1/49:k==='three'?3/49:6/49);
  const one=cand.one[H.prev.one],three=cand.three[H.prev.three],sixn=cand.sixn[H.prev.sixn];
  const zBase4=zodiacFeatureScores(hist,t,nine,'base4'),zCover4=zodiacFeatureScores(hist,t,nine,'cover4'),zSix=zodiacFeatureScores(hist,t,nine,'six');
  const zSup4=s43ZSupport(nine,zBase4),zSup6=s43ZSupport(nine,zSix);
  const zCand4={A:s43ZList(zSup4,4),B:s43ZList(zBase4,4),C:s43ZList(zCover4,4)};
  const zCand6={A:s43ZList(zSup6,6),B:s43ZList(zSix,6),C:(()=>{const a=s43ZList(zSup4,4);for(const z of s43ZList(zSix,12)){if(!a.includes(z))a.push(z);if(a.length===6)break}return a})()};
  H.prev.fourz=s43Choose(['A','B','C'],H.fourz,H.prev.fourz,4/12);H.prev.sixz=s43Choose(['A','B','C'],H.sixz,H.prev.sixz,6/12);
  const fourz=zCand4[H.prev.fourz],sixz=zCand6[H.prev.sixz],pred={target:t,one,three,sixn,nine,fourz,sixz,mode:bm.mode[t],pick:{...H.prev}};
  if(t===target)current=pred;
  if(t<=last&&actual[t]!=null){const sp=actual[t],az=numToZ[sp];for(const [k,cs] of Object.entries({one:cand.one,three:cand.three,sixn:cand.sixn,nine:{A:nA,B:nB,C:nC}})){for(const c of ['A','B','C'])H[k][c].push(cs[c].includes(sp))}for(const c of ['A','B','C']){H.fourz[c].push(zCand4[c].includes(az));H.sixz[c].push(zCand6[c].includes(az))}
   const hits={one:one.includes(sp),three:three.includes(sp),sixn:sixn.includes(sp),nine:nine.includes(sp),fourz:fourz.includes(az),sixz:sixz.includes(az)};for(const k of Object.keys(hits)){if(hits[k])S[k].hit++;s43Miss(S[k],hits[k])}
   if(base9.slice(0,1).includes(sp))B.one++;if(base9.slice(0,3).includes(sp))B.three++;if(base9.slice(0,6).includes(sp))B.sixn++;if(base9.includes(sp))B.nine++;
  }
 }
 return {current,stats:statsOn?{n:last-30,S,B}:null};
}
function s43Css(){return `<style id="s43style">#s43{max-width:800px;margin:14px auto 22px;padding:14px;color:#eef5ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}#s43 *{box-sizing:border-box}#s43 .hero{background:#111c31;border:1px solid #304564;border-radius:18px;padding:16px;box-shadow:0 10px 30px #0005}#s43 h1{margin:0 0 4px;font-size:23px}#s43 .sub{font-size:13px;color:#9fb1ca}#s43 .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}@media(max-width:560px){#s43 .grid{grid-template-columns:1fr}}#s43 .card{background:#0e182b;border:1px solid #283b5b;border-radius:13px;padding:12px}#s43 .lab{font-size:13px;color:#9fb1ca;margin-bottom:7px}#s43 .vals{font-size:20px;font-weight:800;line-height:1.5}#s43 .meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}#s43 .pill{font-size:12px;padding:5px 8px;border-radius:999px;background:#172640;border:1px solid #31486b}#s43 button{margin-top:12px;border:0;border-radius:10px;padding:10px 13px;font-weight:800;background:#e0ebff;color:#14223a}#s43 table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}#s43 th,#s43 td{padding:8px 5px;border-bottom:1px solid #263a59;text-align:center}#s43 th:first-child,#s43 td:first-child{text-align:left}#s43 .good{color:#9fe3ad}#s43 .bad{color:#ffb2a8}#s43 .note{font-size:12px;color:#91a3bc;line-height:1.55;margin-top:10px}</style>`}
function s43Render(){
 const hist=getHistory();if(!hist.length)return;const latest=Math.max(...hist.map(x=>x.period)),target=latest+1,R=s43Compute(hist,target,true),p=R.current;if(!p)return;let root=document.getElementById('s43');if(!root){document.head.insertAdjacentHTML('beforeend',s43Css());root=document.createElement('section');root.id='s43';document.body.insertBefore(root,document.body.firstChild)}document.title='盘口 S4.3';
 const st=R.stats.S,n=R.stats.n,base=R.stats.B,rows=[['⭐ 1码','one'],['🎯 3码','three'],['🔥 6码','sixn'],['🟢 9码','nine'],['🐲 四肖','fourz'],['🐲 六肖','sixz']];
 root.innerHTML=`<div class="hero"><h1>🔥 ${S43_VERSION}</h1><div class="sub">历史1–${latest}期 · 当前预测${target}期 · 每层独立择优，只有过去表现领先≥3个百分点才切换</div><div class="grid"><div class="card"><div class="lab">⭐ 1码</div><div class="vals">${p.one.map(fmt).join(' ')}</div></div><div class="card"><div class="lab">🎯 3码</div><div class="vals">${p.three.map(fmt).join(' ')}</div></div><div class="card"><div class="lab">🔥 6码</div><div class="vals">${p.sixn.map(fmt).join(' ')}</div></div><div class="card"><div class="lab">🟢 9码</div><div class="vals">${p.nine.map(fmt).join(' ')}</div></div><div class="card"><div class="lab">🐲 四肖</div><div class="vals">${p.fourz.join('、')}</div></div><div class="card"><div class="lab">🐲 六肖</div><div class="vals">${p.sixz.join('、')}</div></div></div><div class="meta"><span class="pill">1码:${p.pick.one}</span><span class="pill">3码:${p.pick.three}</span><span class="pill">6码:${p.pick.sixn}</span><span class="pill">9码:${p.pick.nine}</span><span class="pill">四肖:${p.pick.fourz}</span><span class="pill">六肖:${p.pick.sixz}</span></div><button id="s43bt">重新严格回测</button><div id="s43stats"><table><thead><tr><th>项目</th><th>S4.3命中</th><th>命中率</th><th>最长连空</th><th>S3号码基线</th></tr></thead><tbody>${rows.map(([lab,k])=>{const v=st[k],b=base[k];const cls=b==null?'':v.hit>=b?'good':'bad';return `<tr><td>${lab}</td><td>${v.hit}/${n}</td><td class="${cls}">${(v.hit/n*100).toFixed(2)}%</td><td>${v.max}期</td><td>${b==null?'—':`${b}/${n} ${(b/n*100).toFixed(2)}%`}</td></tr>`}).join('')}</tbody></table></div><div class="note">A=原S3主排名；B=主模型+独立覆盖；C=更分散的覆盖/排序。每一期的选择只根据此前30/60期表现，未使用未来开奖结果。生肖使用“9码生肖支持、结构模型、覆盖模型”三候选动态择优。网页回测结果优先于聊天中的估算数字。</div></div>`;document.getElementById('s43bt').onclick=s43Render;
}
setTimeout(s43Render,600);let s43sig='';setInterval(()=>{try{const h=getHistory(),x=h.length?`${h.length}:${h[h.length-1].period}:${h[h.length-1].special}`:'';if(x!==s43sig){s43sig=x;s43Render()}}catch(e){console.log(e)}},2200);
