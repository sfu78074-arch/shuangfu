/* ===== S4.6 跨设备统一盲测账本 =====
   255期以前使用已确认的真实盲测汇总作为不可变基准；
   256期起严格逐期仅使用当期以前数据重算锁定规则，因此手机/电脑显示一致。
   不修改 S4.6 预测公式，不读取开奖结果来调整规则。 ===== */
(function(){
  'use strict';
  const CHECKPOINT=255;
  const DIGITAL_SEED={
    one:{h:2,n:10},
    three:{h:2,n:10},
    sixn:{h:3,n:10},
    nine:{h:3,n:10}
  };
  const ZODIAC_SEED={
    four:{h:1,n:6},
    six:{h:1,n:6}
  };

  function copyStats(src){
    const out={};
    for(const [k,v] of Object.entries(src))out[k]={h:Number(v.h)||0,n:Number(v.n)||0};
    return out;
  }
  function actualMap(hist){
    const m={};
    (hist||[]).forEach(x=>{if(x&&Number.isInteger(Number(x.period)))m[Number(x.period)]=Number(x.special)});
    return m;
  }
  function pastOnly(hist,t){return (hist||[]).filter(x=>Number(x.period)<t)}

  // 覆盖原来的“本机 localStorage 账本统计”。基准期以前不回算，避免历史倒灌。
  s46BlindStats=function(hist){
    const S=copyStats(DIGITAL_SEED),actual=actualMap(hist);
    const last=(hist&&hist.length)?Math.max(...hist.map(x=>Number(x.period)||0)):0;
    for(let t=CHECKPOINT+1;t<=last;t++){
      if(!Number.isFinite(actual[t]))continue;
      const h=pastOnly(hist,t);if(!h.length)continue;
      let p;try{p=s46Compute(h,t)}catch(e){console.warn('shared digital ledger',t,e);continue}
      for(const k of ['one','three','sixn','nine']){
        const arr=p&&Array.isArray(p[k])?p[k]:null;if(!arr)continue;
        S[k].n++;if(arr.includes(actual[t]))S[k].h++;
      }
    }
    return S;
  };

  s46ZBlindStats=function(hist){
    const S=copyStats(ZODIAC_SEED),actual=actualMap(hist);
    const last=(hist&&hist.length)?Math.max(...hist.map(x=>Number(x.period)||0)):0;
    for(let t=CHECKPOINT+1;t<=last;t++){
      if(!Number.isFinite(actual[t]))continue;
      const h=pastOnly(hist,t);if(!h.length)continue;
      let z;try{z=s46ZCompute(h,t).current}catch(e){console.warn('shared zodiac ledger',t,e);continue}
      const az=numToZ[actual[t]];
      for(const k of ['four','six']){
        const arr=z&&Array.isArray(z[k])?z[k]:null;if(!arr)continue;
        S[k].n++;if(arr.includes(az))S[k].h++;
      }
    }
    return S;
  };

  // 保留本机逐期记录作为审计副本，但显示统计统一使用上面的共享基准。
  const baseRender=s46Render;
  s46Render=function(){
    baseRender();
    setTimeout(()=>{
      const root=document.getElementById('s46');if(!root)return;
      const row=root.querySelector('.pillrow');
      if(row&&!row.querySelector('[data-shared-ledger]')){
        const p=document.createElement('span');p.className='pill ok';p.setAttribute('data-shared-ledger','');
        p.textContent='统一盲测账本 · 255期基准';row.appendChild(p);
      }
      const note=root.querySelector('.note');
      if(note&&!note.querySelector('[data-ledger-note]')){
        const s=document.createElement('span');s.setAttribute('data-ledger-note','');
        s.textContent=' 盲测栏已改为跨设备统一账本：255期以前锁定已确认汇总，256期起严格按当期以前数据逐期核对，手机与电脑显示一致。';
        note.appendChild(s);
      }
    },0);
  };
})();
