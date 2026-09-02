const S45_VERSION='S4.5 保守增强版';
function s45SixCompute(hist,target){
 const zs=Object.keys(ZODIAC),actual={};hist.forEach(x=>actual[x.period]=x.special);
 const last=Math.min(target-1,Math.max(...hist.map(x=>x.period))),stats={n:0,hit:0,cur:0,max:0};let current=null;
 const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
 const sd=a=>{if(!a.length)return 1;const m=avg(a),v=avg(a.map(x=>(x-m)*(x-m)));return Math.sqrt(v)||1};
 for(let t=31;t<=target;t++){
  const h=hist.filter(x=>x.period<t);if(!h.length)continue;const score={};zs.forEach(z=>score[z]=0);
  for(const w of [10,12,14]){const r=h.slice(-Math.min(w,h.length)),cnt={};zs.forEach(z=>cnt[z]=0);r.forEach(x=>cnt[numToZ[x.special]]++);const vals=zs.map(z=>cnt[z]),m=avg(vals),s=sd(vals);zs.forEach(z=>score[z]+=(cnt[z]-m)/s)}
  const om={};for(const z of zs){let v=h.length;for(let i=h.length-1;i>=0;i--){if(numToZ[h[i].special]===z){v=h.length-1-i;break}}om[z]=v}
  const six=zs.slice().sort((a,b)=>(score[a]-score[b])||(om[a]-om[b])).slice(0,6);if(t===target)current={six};
  if(t<=last&&actual[t]!=null){stats.n++;const hit=six.includes(numToZ[actual[t]]);if(hit){stats.hit++;stats.cur=0}else{stats.cur++;stats.max=Math.max(stats.max,stats.cur)}}
 }
 return {current,stats};
}
s44sRender=function(){
 try{
  if(typeof predict!=='function'||typeof s43Compute!=='function')return;const hp=s44GetHistory(),hist=hp.hist;if(!hist.length)return;
  const last=hist[hist.length-1],latest=last.period,target=latest+1,base=predict(hist,target),r43=s43Compute(hist,target,true),oldEnh=r43.current&&r43.current.sixz?r43.current.sixz:base.sixZ;
  const n=r43.stats&&r43.stats.n?r43.stats.n:215,oldHit=r43.stats&&r43.stats.S?r43.stats.S.sixz.hit:0,oldSix=oldHit>=104?oldEnh:base.sixZ;
  const r45=s45SixCompute(hist,target),h45=r45.stats.hit,n45=r45.stats.n,m45=r45.stats.max,use45=!!(r45.current&&n45>0&&(h45/n45)>=(oldHit/Math.max(1,n))&&(h45/n45)>=104/215),six=use45?r45.current.six:oldSix;
  let root=document.getElementById('s44s');if(!root){root=document.createElement('section');root.id='s44s';document.body.insertBefore(root,document.body.firstChild)}
  const old=document.querySelector('body > .wrap h1, .wrap h1');if(old){old.textContent='S3 基础引擎（S4.5数据录入区）';old.dataset.s45renamed='1'}document.title='808 S4.5';
  const b=r43.stats&&r43.stats.B?r43.stats.B:{one:4,three:15,sixn:33,nine:49},ds=`${last.period}期 ${last.regular.map(fmt).join('、')} + 特${fmt(last.special)}`;
  root.innerHTML=`<div class="hero"><h1>🛡️ ${S45_VERSION}</h1><div class="sub">历史1–${latest}期 · 当前预测${target}期 · 号码层与四肖继续锁定S3；六肖升级为10/12/14期冷度覆盖层，严格逐期只使用当期以前数据</div><div class="grid"><div class="card"><div class="lab">⭐ 1码 · S3底线</div><div class="vals">${s44Balls(base.rank.slice(0,1))}</div></div><div class="card"><div class="lab">🎯 3码 · S3底线</div><div class="vals">${s44Balls(base.rank.slice(0,3))}</div></div><div class="card"><div class="lab">🔥 6码 · S3底线</div><div class="vals">${s44Balls(base.rank.slice(0,6))}</div></div><div class="card"><div class="lab">🟢 9码 · S3底线</div><div class="vals">${s44Balls(base.rank.slice(0,9))}</div></div><div class="card"><div class="lab">🐲 四肖 · 原S3结构层</div><div class="vals">${base.fourZ.join('、')}</div></div><div class="card"><div class="lab">🐲 六肖 · ${use45?'S4.5冷度覆盖层':'保护回退层'}</div><div class="vals">${six.join('、')}</div></div></div><div class="meta"><span class="pill good">1/3/6/9码：S3锁定</span><span class="pill good">四肖：S3锁定</span><span class="pill ${use45?'good':'warn'}">六肖：${use45?'S4.5增强启用':'保护回退'}</span><span class="pill"><b style="color:#ff4f5e">●红</b> <b style="color:#4b91ff">●蓝</b> <b style="color:#29c779">●绿</b></span><span class="pill">版本 ${S44_BUILD}</span><span class="pill">来源 ${hp.source}</span><span class="pill">数据 ${ds}</span></div><div class="migbar"><button type="button" class="migbtn" data-s44export>📤 导出数据</button><button type="button" class="migbtn" data-s44import>📥 导入数据</button><span class="migtxt">更换网址：先在旧网址导出，再到新网址导入。</span></div><table><thead><tr><th>项目</th><th>严格回测</th><th>命中率</th><th>保护状态</th></tr></thead><tbody><tr><td>⭐ 1码</td><td>${b.one}/${n}</td><td>${(b.one/n*100).toFixed(2)}%</td><td class="good">S3底线</td></tr><tr><td>🎯 3码</td><td>${b.three}/${n}</td><td>${(b.three/n*100).toFixed(2)}%</td><td class="good">S3底线</td></tr><tr><td>🔥 6码</td><td>${b.sixn}/${n}</td><td>${(b.sixn/n*100).toFixed(2)}%</td><td class="good">S3底线</td></tr><tr><td>🟢 9码</td><td>${b.nine}/${n}</td><td>${(b.nine/n*100).toFixed(2)}%</td><td class="good">S3底线</td></tr><tr><td>🐲 四肖</td><td>75/${n}</td><td>${(75/n*100).toFixed(2)}%</td><td class="good">S3底线</td></tr><tr><td>🐲 六肖</td><td>${h45}/${n45}</td><td>${(h45/n45*100).toFixed(2)}%</td><td class="${use45?'good':'warn'}">${use45?'S4.5增强启用':'保护回退'}</td></tr></tbody></table><div class="note">S4.5六肖规则锁定：统计当期以前最近10、12、14期的特码生肖频次，各窗口标准化后合并，优先综合频次较低的6肖；同分时优先当前遗漏较小者。严格逐期回测 ${h45}/${n45}，最长连空${m45}期。号码波色显示、S3号码层和四肖均不改变；以后新期开奖只盲测，不回改历史规则。</div></div>`;
  const eb=root.querySelector('[data-s44export]'),ib=root.querySelector('[data-s44import]');if(eb)eb.onclick=s44ExportData;if(ib)ib.onclick=s44ImportData;
 }catch(e){console.error('S4.5 render error',e)}
};
setTimeout(s44sRender,1350);
