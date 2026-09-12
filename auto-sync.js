/* ===== 自动开奖同步层：只更新数据，不改变 S4.5 / S4.6 预测规则 ===== */
(function(){
  'use strict';
  const SYNC_VERSION='AUTO-SYNC-1';
  const DATA_YEAR=2026;
  const DIRECT_LATEST='https://macaumarksix.com/api/macaujc2.com';
  const DIRECT_HISTORY=`https://history.macaumarksix.com/history/macaujc2/y/${DATA_YEAR}`;
  const LAST_SYNC_KEY='s46_auto_sync_last_v1';
  const AUTO_INTERVAL_MS=10*60*1000;
  let syncing=false,lastAttempt=0,lastResult=null;
  window.__AUTO_SYNC_GUARD='pending';

  function nowText(){
    try{return new Intl.DateTimeFormat('zh-CN',{hour12:false,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())}
    catch(_){return new Date().toLocaleString()}
  }
  function textOf(e){return e&&e.message?e.message:String(e||'未知错误')}
  function sameDraw(a,b){
    if(!a||!b||Number(a.period)!==Number(b.period)||Number(a.special)!==Number(b.special))return false;
    const ar=(a.regular||[]).map(Number),br=(b.regular||[]).map(Number);
    return ar.length===6&&br.length===6&&ar.every((n,i)=>n===br[i]);
  }
  function normalizeRecord(x){
    if(!x||typeof x!=='object')return null;
    const exp=String(x.expect??x.issue??x.period??'').trim();
    if(!exp)return null;
    let period;
    if(/^\d{7,}$/.test(exp)){
      const y=Number(exp.slice(0,4));
      if(y!==DATA_YEAR)return null;
      period=Number(exp.slice(-3));
    }else{
      period=Number(exp);
    }
    if(!Number.isInteger(period)||period<1||period>366)return null;
    let nums=[];
    if(Array.isArray(x.openCode))nums=x.openCode.map(Number);
    else nums=String(x.openCode??x.code??'').split(/[,，\s]+/).filter(Boolean).map(Number);
    if(nums.length!==7||nums.some(n=>!Number.isInteger(n)||n<1||n>49)||new Set(nums).size!==7)return null;
    return {period,regular:nums.slice(0,6),special:nums[6],openTime:String(x.openTime||x.time||'')};
  }
  function listFromPayload(payload){
    let a=[];
    if(Array.isArray(payload))a=payload;
    else if(payload&&Array.isArray(payload.data))a=payload.data;
    else if(payload&&payload.data&&Array.isArray(payload.data.list))a=payload.data.list;
    else if(payload&&Array.isArray(payload.list))a=payload.list;
    return a.map(normalizeRecord).filter(Boolean);
  }
  async function getJSON(url,ms=6500){
    const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),ms);
    try{
      const r=await fetch(url,{cache:'no-store',signal:ctl.signal,headers:{'Accept':'application/json'}});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const t=await r.text();
      try{return JSON.parse(t)}catch(_){throw new Error('接口返回的不是JSON')}
    }finally{clearTimeout(to)}
  }
  async function fetchWithFallback(proxy,direct){
    let e1=null;
    try{return {payload:await getJSON(proxy),via:'同源代理'}}catch(e){e1=e}
    try{return {payload:await getJSON(direct),via:'直连接口'}}catch(e2){throw new Error(`代理失败：${textOf(e1)}；直连失败：${textOf(e2)}`)}
  }
  function setStatus(html,kind=''){
    const el=document.querySelector('[data-autosync-status]');
    if(!el)return;
    el.className='autosync-status '+kind;
    el.innerHTML=html;
  }
  function decorate(){
    const root=document.getElementById('s44s');if(!root)return;
    let bar=root.querySelector('.migbar');if(!bar)return;
    if(!bar.querySelector('[data-autosync]')){
      const b=document.createElement('button');b.type='button';b.className='migbtn';b.setAttribute('data-autosync','');b.textContent='🔄 同步开奖';b.onclick=()=>syncAll(true);bar.insertBefore(b,bar.firstChild);
    }
    if(!bar.querySelector('[data-autosync-status]')){
      const s=document.createElement('span');s.className='autosync-status';s.setAttribute('data-autosync-status','');s.textContent='自动同步待检查';bar.appendChild(s);
      if(lastResult)renderLast();
    }
  }
  function renderLast(){
    if(!lastResult)return;
    const r=lastResult;
    if(r.ok){
      const c=r.conflicts.length?` · 冲突${r.conflicts.length}期(${r.conflicts.slice(0,5).join('、')}${r.conflicts.length>5?'…':''})`:' · 冲突0';
      setStatus(`✅ ${r.time} 已同步至 <b>${r.latest||'—'}期</b> · 新增${r.added}期${c} · ${r.via}` , r.conflicts.length?'warn':'ok');
    }else setStatus(`⚠️ ${r.time} 同步失败：${r.error}`,'bad');
  }
  function currentMap(){
    const m=new Map();
    try{if(typeof draws!=='undefined'&&Array.isArray(draws))draws.forEach(d=>{if(d&&d.period)m.set(Number(d.period),d)})}catch(_){}
    if(!m.size&&typeof s44GetHistory==='function'){
      try{s44GetHistory().hist.forEach(d=>m.set(Number(d.period),d))}catch(_){}
    }
    return m;
  }
  function saveMerged(arr){
    try{
      if(typeof draws!=='undefined'&&Array.isArray(draws)){
        draws.splice(0,draws.length,...arr.map(d=>({period:d.period,regular:[...d.regular],special:d.special})));
        if(typeof persist==='function')persist();
        else if(typeof KEY!=='undefined')localStorage.setItem(KEY,JSON.stringify(draws));
      }
    }catch(e){console.warn('auto sync base save failed',e)}
    try{
      const rk=(typeof S44_RUNTIME_STORE!=='undefined'&&S44_RUNTIME_STORE)?S44_RUNTIME_STORE:'s44_runtime_draws_v1';
      localStorage.setItem(rk,JSON.stringify(arr.map(d=>({period:d.period,regular:[...d.regular],special:d.special}))));
    }catch(e){console.warn('auto sync runtime save failed',e)}
  }
  function refreshAfterSync(latest){
    try{if(typeof refresh==='function')refresh(latest)}catch(e){console.warn(e)}
    try{if(typeof runPredict==='function')setTimeout(runPredict,80)}catch(e){console.warn(e)}
    try{if(typeof s44sRender==='function')setTimeout(s44sRender,160)}catch(e){console.warn(e)}
    try{if(typeof s46Render==='function')setTimeout(s46Render,260)}catch(e){console.warn(e)}
  }
  async function syncAll(manual=false){
    if(syncing)return;
    const now=Date.now();
    if(!manual&&now-lastAttempt<15000)return;
    lastAttempt=now;syncing=true;window.__AUTO_SYNC_GUARD='pending';decorate();
    const btn=document.querySelector('[data-autosync]');if(btn){btn.disabled=true;btn.textContent='同步中…'}
    setStatus('⏳ 正在读取历史开奖与最新一期…');
    try{
      const jobs=await Promise.allSettled([
        fetchWithFallback(`/api/history?year=${DATA_YEAR}&t=${Date.now()}`,DIRECT_HISTORY),
        fetchWithFallback(`/api/latest?t=${Date.now()}`,DIRECT_LATEST)
      ]);
      const found=[];const vias=[];const errs=[];
      for(const j of jobs){
        if(j.status==='fulfilled'){found.push(...listFromPayload(j.value.payload));vias.push(j.value.via)}
        else errs.push(textOf(j.reason));
      }
      if(!found.length)throw new Error(errs.join('；')||'接口没有返回可用开奖记录');
      const apiMap=new Map();found.forEach(d=>apiMap.set(d.period,d));
      const local=currentMap(),conflicts=[];let added=0;
      for(const [p,d] of [...apiMap.entries()].sort((a,b)=>a[0]-b[0])){
        const old=local.get(p);
        if(!old){local.set(p,d);added++}
        else if(!sameDraw(old,d))conflicts.push(p);
      }
      const merged=[...local.values()].map(d=>({period:Number(d.period),regular:(d.regular||[]).map(Number),special:Number(d.special)}))
        .filter(d=>Number.isInteger(d.period)&&d.period>0&&d.regular.length===6&&Number.isInteger(d.special))
        .sort((a,b)=>a.period-b.period);
      if(!merged.length)throw new Error('合并后没有有效开奖记录');
      saveMerged(merged);
      const latest=merged[merged.length-1].period;
      window.__AUTO_SYNC_GUARD='ok';
      lastResult={ok:true,time:nowText(),latest,added,conflicts,via:[...new Set(vias)].join('+')||'接口'};
      try{localStorage.setItem(LAST_SYNC_KEY,JSON.stringify({ts:Date.now(),latest,version:SYNC_VERSION}))}catch(_){}
      refreshAfterSync(latest);renderLast();
    }catch(e){
      window.__AUTO_SYNC_GUARD='failed';
      lastResult={ok:false,time:nowText(),error:textOf(e)};renderLast();
    }finally{
      syncing=false;decorate();const b=document.querySelector('[data-autosync]');if(b){b.disabled=false;b.textContent='🔄 同步开奖'}
    }
  }

  const st=document.createElement('style');
  st.textContent='.autosync-status{font-size:11px;color:#91a3bc;line-height:1.45;flex:1 1 240px}.autosync-status.ok{color:#89e6a7}.autosync-status.warn{color:#ffd98e}.autosync-status.bad{color:#ff9a9a}';
  document.head.appendChild(st);
  setInterval(decorate,700);
  setTimeout(()=>syncAll(false),80);
  setInterval(()=>{if(document.visibilityState==='visible')syncAll(false)},AUTO_INTERVAL_MS);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastAttempt>AUTO_INTERVAL_MS)syncAll(false)});
  window.syncMacauDraws=()=>syncAll(true);
})();
