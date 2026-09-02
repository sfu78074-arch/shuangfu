
const S44S_VERSION='S4.4 保守增强版';
const S44_STORE='standalone_s3_draws_v2';
const S44_BUILD=window.__S44_BUILD||'unknown';
const S44_RED=new Set([1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46]);
const S44_BLUE=new Set([3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48]);
function s44Wave(n){return S44_RED.has(n)?'red':S44_BLUE.has(n)?'blue':'green'}
function s44Ball(n){return `<span class="numball ${s44Wave(n)}">${fmt(n)}</span>`}
function s44Balls(arr){return `<span class="numrow">${arr.map(s44Ball).join('')}</span>`}
function s44B64Encode(str){const bytes=new TextEncoder().encode(str);let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin)}
function s44B64Decode(str){const bin=atob(str),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
function s44ExportData(){
 try{
  const raw=localStorage.getItem(S44_STORE);
  if(!raw){alert('当前网址没有检测到需要迁移的本地保存数据。');return}
  const code='S44DATA1:'+s44B64Encode(raw);
  const fallback=()=>prompt('复制下面全部迁移码，然后到新网址点击“导入数据”：',code);
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(code).then(()=>alert('✅ 迁移码已复制。现在打开新网址，点击“📥 导入数据”。')).catch(fallback)}else fallback();
 }catch(e){alert('导出失败：'+e.message)}
}
function s44ImportData(){
 const code=prompt('粘贴从旧网址复制的 S4.4 迁移码：');if(!code)return;
 try{
  const t=code.trim(),raw=t.startsWith('S44DATA1:')?s44B64Decode(t.slice(9)):t;
  JSON.parse(raw);localStorage.setItem(S44_STORE,raw);
  alert('✅ 数据导入成功，页面将重新加载。');location.reload();
 }catch(e){alert('迁移码无效或不完整，请重新复制。')}
}
(function(){
  const st=document.createElement('style');
  st.textContent='#s43{display:none!important}#s44s{max-width:820px;margin:14px auto 22px;padding:14px;color:#eef5ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}#s44s *{box-sizing:border-box}#s44s .hero{background:#111c31;border:1px solid #365173;border-radius:18px;padding:16px;box-shadow:0 10px 30px #0005}#s44s h1{margin:0 0 4px;font-size:23px}#s44s .sub{font-size:13px;color:#9fb1ca}#s44s .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}@media(max-width:560px){#s44s .grid{grid-template-columns:1fr}}#s44s .card{background:#0e182b;border:1px solid #2b405f;border-radius:13px;padding:12px}#s44s .lab{font-size:13px;color:#9fb1ca;margin-bottom:7px}#s44s .vals{font-size:20px;font-weight:800;line-height:1.5}#s44s .numrow{display:flex;align-items:center;gap:7px;flex-wrap:wrap}#s44s .numball{display:inline-flex;align-items:center;justify-content:center;width:37px;height:37px;border:2px solid currentColor;border-radius:50%;font-size:17px;font-weight:900;background:#0a1426;line-height:1}#s44s .numball.red{color:#ff4f5e}#s44s .numball.blue{color:#4b91ff}#s44s .numball.green{color:#29c779}#s44s .meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}#s44s .pill{font-size:12px;padding:5px 8px;border-radius:999px;background:#172640;border:1px solid #31486b}#s44s .good{color:#9fe3ad}#s44s .warn{color:#ffd98e}#s44s .migbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;padding:9px;background:#0d1728;border:1px solid #2b405f;border-radius:10px}#s44s .migbtn{appearance:none;border:1px solid #3c5c88;background:#172640;color:#eef5ff;border-radius:9px;padding:7px 10px;font-weight:700;cursor:pointer}#s44s .migbtn:hover{background:#203453}#s44s .migtxt{font-size:11px;color:#91a3bc}#s44s table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}#s44s th,#s44s td{padding:8px 5px;border-bottom:1px solid #263a59;text-align:center}#s44s th:first-child,#s44s td:first-child{text-align:left}#s44s .note{font-size:12px;color:#91a3bc;line-height:1.55;margin-top:10px}';
  document.head.appendChild(st);
})();
function s44sRender(){
 try{
  if(typeof draws==='undefined'||typeof predict!=='function'||typeof s43Compute!=='function')return;
  const hist=draws.slice().map(d=>d.period===245?Object.assign({},d,{regular:[22,23,14,2,13,38],special:18}):d).sort((a,b)=>a.period-b.period),last=hist[hist.length-1],latest=last.period,target=latest+1;
  const base=predict(hist,target),r43=s43Compute(hist,target,true),enh=r43.current&&r43.current.sixz?r43.current.sixz:base.sixZ;
  const n=r43.stats&&r43.stats.n?r43.stats.n:215,sixHit=r43.stats&&r43.stats.S?r43.stats.S.sixz.hit:0,sixMax=r43.stats&&r43.stats.S?r43.stats.S.sixz.max:0;
  const useNew=sixHit>=104,six=useNew?enh:base.sixZ;
  let root=document.getElementById('s44s');if(!root){root=document.createElement('section');root.id='s44s';document.body.insertBefore(root,document.body.firstChild)}
  const old=document.querySelector('body > .wrap h1, .wrap h1');if(old&&!old.dataset.s44renamed){old.textContent='S3 基础引擎（S4.4数据录入区）';old.dataset.s44renamed='1'}
  document.title='盘口 S4.4';
  const b=r43.stats&&r43.stats.B?r43.stats.B:{one:4,three:15,sixn:33,nine:49};
  const ds=last?`${last.period}期 ${last.regular.map(fmt).join('、')} + 特${fmt(last.special)}`:'无数据';
  root.innerHTML=`<div class="hero"><h1>🛡️ ${S44S_VERSION}</h1><div class="sub">历史1–${latest}期 · 当前预测${target}期 · 号码层与四肖锁定S3，六肖只在严格回测不低于S3时启用增强</div><div class="grid"><div class="card"><div class="lab">⭐ 1码 · S3底线</div><div class="vals">${s44Balls(base.rank.slice(0,1))}</div></div><div class="card"><div class="lab">🎯 3码 · S3底线</div><div class="vals">${s44Balls(base.rank.slice(0,3))}</div></div><div class="card"><div class="lab">🔥 6码 · S3底线</div><div class="vals">${s44Balls(base.rank.slice(0,6))}</div></div><div class="card"><div class="lab">🟢 9码 · S3底线</div><div class="vals">${s44Balls(base.rank.slice(0,9))}</div></div><div class="card"><div class="lab">🐲 四肖 · 原S3结构层</div><div class="vals">${base.fourZ.join('、')}</div></div><div class="card"><div class="lab">🐲 六肖 · ${useNew?'增强层':'自动回退S3'}</div><div class="vals">${six.join('、')}</div></div></div><div class="meta"><span class="pill good">1/3/6/9码：S3锁定</span><span class="pill good">四肖：S3锁定</span><span class="pill ${useNew?'good':'warn'}">六肖：${useNew?'增强启用':'回退S3'}</span><span class="pill"><b style="color:#ff4f5e">●红</b> <b style="color:#4b91ff">●蓝</b> <b style="color:#29c779">●绿</b></span><span class="pill">版本 ${S44_BUILD}</span><span class="pill">数据 ${ds}</span></div><div class="migbar"><button type="button" class="migbtn" data-s44export>📤 导出数据</button><button type="button" class="migbtn" data-s44import>📥 导入数据</button><span class="migtxt">更换网址：先在旧网址导出，再到新网址导入。</span></div><table><thead><tr><th>项目</th><th>严格回测</th><th>命中率</th><th>保护状态</th></tr></thead><tbody><tr><td>⭐ 1码</td><td>${b.one}/${n}</td><td>${(b.one/n*100).toFixed(2)}%</td><td class="good">S3底线</td></tr><tr><td>🎯 3码</td><td>${b.three}/${n}</td><td>${(b.three/n*100).toFixed(2)}%</td><td class="good">S3底线</td></tr><tr><td>🔥 6码</td><td>${b.sixn}/${n}</td><td>${(b.sixn/n*100).toFixed(2)}%</td><td class="good">S3底线</td></tr><tr><td>🟢 9码</td><td>${b.nine}/${n}</td><td>${(b.nine/n*100).toFixed(2)}%</td><td class="good">S3底线</td></tr><tr><td>🐲 四肖</td><td>75/${n}</td><td>${(75/n*100).toFixed(2)}%</td><td class="good">S3底线</td></tr><tr><td>🐲 六肖</td><td>${sixHit}/${n}</td><td>${(sixHit/n*100).toFixed(2)}%</td><td class="${useNew?'good':'warn'}">${useNew?'增强启用':'自动回退'}</td></tr></tbody></table><div class="note">号码圆框按2026波色显示：红波=红、蓝波=蓝、绿波=绿。只改变显示，不改变S4.4预测、排序或回测逻辑。这版不再让新算法覆盖已经更好的S3号码层；六肖沿用已复现增强候选，低于S3则自动回退。</div></div>`;
  const eb=root.querySelector('[data-s44export]'),ib=root.querySelector('[data-s44import]');if(eb)eb.onclick=s44ExportData;if(ib)ib.onclick=s44ImportData;
 }catch(e){console.error('S4.4 render error',e)}
}
setTimeout(s44sRender,1100);let s44ssig='';setInterval(()=>{try{if(typeof draws==='undefined'||!draws.length)return;const d=draws[draws.length-1],x=`${draws.length}:${d.period}:${d.special}`;if(x!==s44ssig){s44ssig=x;s44sRender()}}catch(e){console.error(e)}},2200);
