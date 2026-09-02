(function(){
  const KEY='s44_runtime_draws_v1';
  function valid(arr){return Array.isArray(arr)&&arr.length>0&&arr.every(d=>d&&Number.isInteger(Number(d.period))&&Array.isArray(d.regular)&&d.regular.length===6&&d.regular.every(n=>Number.isFinite(Number(n)))&&Number.isFinite(Number(d.special)))}
  function normalize(arr){return arr.map(d=>({period:Number(d.period),regular:d.regular.map(Number),special:Number(d.special)})).sort((a,b)=>a.period-b.period)}
  function exportFull(){
    try{
      if(typeof draws==='undefined'||!Array.isArray(draws)||!draws.length){alert('没有可导出的历史数据');return}
      const arr=normalize(draws.slice());
      const payload={format:'S44FULLJSON1',count:arr.length,latest:arr[arr.length-1].period,draws:arr};
      const blob=new Blob([JSON.stringify(payload)],{type:'application/json;charset=utf-8'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=`S44完整历史_${arr[0].period}-${arr[arr.length-1].period}期.json`;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),3000);
      alert(`✅ 已导出${arr.length}期完整历史数据文件。\n请到新网址点击“📥 导入数据”，选择刚才的JSON文件。`);
    }catch(e){alert('导出失败：'+e.message)}
  }
  function applyArr(arr){
    arr=normalize(arr);if(!valid(arr))throw new Error('开奖记录结构不完整');
    localStorage.setItem(KEY,JSON.stringify(arr));
    if(typeof draws!=='undefined'&&Array.isArray(draws))draws.splice(0,draws.length,...arr);
    alert(`✅ 已导入${arr.length}期完整历史数据，页面将刷新。`);location.reload();
  }
  function importFull(){
    try{
      const inp=document.createElement('input');inp.type='file';inp.accept='.json,.txt,application/json,text/plain';inp.style.display='none';document.body.appendChild(inp);
      inp.onchange=async()=>{
        try{
          const file=inp.files&&inp.files[0];if(!file){inp.remove();return}
          const text=await file.text();const obj=JSON.parse(text);const arr=Array.isArray(obj)?obj:obj&&Array.isArray(obj.draws)?obj.draws:null;
          if(!arr)throw new Error('文件不是S4.4历史数据');applyArr(arr);
        }catch(e){alert('导入失败：'+e.message)}finally{inp.remove()}
      };
      inp.click();
    }catch(e){alert('导入失败：'+e.message)}
  }
  try{
    const raw=localStorage.getItem(KEY);
    if(raw&&typeof draws!=='undefined'&&Array.isArray(draws)){
      const arr=JSON.parse(raw);if(valid(arr)){const n=normalize(arr);draws.splice(0,draws.length,...n)}
    }
  }catch(e){console.warn('S4.4 runtime migration load failed',e)}
  try{s44ExportData=exportFull;s44ImportData=importFull}catch(_){ }
  window.exportRuntimeData=exportFull;window.importRuntimeData=importFull;
  setInterval(()=>{
    const e=document.querySelector('[data-s44export]'),i=document.querySelector('[data-s44import]');if(e)e.onclick=exportFull;if(i)i.onclick=importFull;
    try{if(localStorage.getItem(KEY)!==null&&typeof draws!=='undefined'&&Array.isArray(draws)&&draws.length)localStorage.setItem(KEY,JSON.stringify(normalize(draws)))}catch(_){ }
  },900);
})();