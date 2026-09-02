(function(){
  const KEY='s44_runtime_draws_v1';
  function enc(str){const u=new TextEncoder().encode(str);let b='';for(const x of u)b+=String.fromCharCode(x);return btoa(b)}
  function dec(str){const clean=str.replace(/\s+/g,'');const b=atob(clean),u=Uint8Array.from(b,c=>c.charCodeAt(0));return new TextDecoder().decode(u)}
  function valid(arr){return Array.isArray(arr)&&arr.length>0&&arr.every(d=>d&&Number.isInteger(Number(d.period))&&Array.isArray(d.regular)&&d.regular.length===6&&Number.isFinite(Number(d.special)))}
  function exportFull(){
    try{
      if(typeof draws==='undefined'||!Array.isArray(draws)||!draws.length){alert('没有可导出的历史数据');return}
      const arr=draws.slice().sort((a,b)=>a.period-b.period),code='S44FULL1:'+enc(JSON.stringify(arr));
      const fallback=()=>prompt('请全选并复制下面整串迁移码：',code);
      if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(code).then(()=>alert('✅ 完整历史数据已复制。现在到新网址点击“📥 导入数据”。')).catch(fallback)}else fallback();
    }catch(e){alert('导出失败：'+e.message)}
  }
  function importFull(){
    const input=prompt('粘贴从旧网址复制的完整迁移码：');if(!input)return;
    try{
      const t=input.trim();let raw;
      if(t.startsWith('S44FULL1:')) raw=dec(t.slice(9));
      else if(t.startsWith('DATA2:')) raw=dec(t.slice(6));
      else throw new Error('格式不正确');
      const arr=JSON.parse(raw);if(!valid(arr))throw new Error('开奖记录结构不完整');
      arr.sort((a,b)=>Number(a.period)-Number(b.period));
      localStorage.setItem(KEY,JSON.stringify(arr));
      if(typeof draws!=='undefined'&&Array.isArray(draws))draws.splice(0,draws.length,...arr);
      alert(`✅ 已导入${arr.length}期完整历史数据，页面将刷新。`);location.reload();
    }catch(e){alert('数据无效：'+e.message)}
  }
  try{
    const raw=localStorage.getItem(KEY);
    if(raw&&typeof draws!=='undefined'&&Array.isArray(draws)){
      const arr=JSON.parse(raw);if(valid(arr)){arr.sort((a,b)=>Number(a.period)-Number(b.period));draws.splice(0,draws.length,...arr)}
    }
  }catch(e){console.warn('S4.4 runtime migration load failed',e)}
  try{s44ExportData=exportFull;s44ImportData=importFull}catch(_){ }
  window.exportRuntimeData=exportFull;window.importRuntimeData=importFull;
  setInterval(()=>{
    const e=document.querySelector('[data-s44export]'),i=document.querySelector('[data-s44import]');if(e)e.onclick=exportFull;if(i)i.onclick=importFull;
    try{if(localStorage.getItem(KEY)!==null&&typeof draws!=='undefined'&&Array.isArray(draws)&&draws.length)localStorage.setItem(KEY,JSON.stringify(draws))}catch(_){ }
  },900);
})();