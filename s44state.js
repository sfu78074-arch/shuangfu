(function(){
  if(typeof predict!=='function'||typeof PRE50==='undefined'||typeof PRES2==='undefined'||typeof PRECHOICE==='undefined')return;
  const originalPredict=predict;
  const clone=x=>JSON.parse(JSON.stringify(x));
  function hasState(t){return !!(modelLog50&&modelLog50[t]&&modelLogS2&&modelLogS2[t]&&choiceLog&&choiceLog[t]);}
  function rebuildIfNeeded(base,target){
    if(target<=245)return;
    let need=false;
    for(let t=245;t<target;t++){if(!hasState(t)){need=true;break}}
    if(!need)return;
    modelLog50=clone(PRE50);modelLogS2=clone(PRES2);choiceLog=clone(PRECHOICE);
    const hist=base.slice().map(d=>({period:Number(d.period),regular:(d.regular||[]).map(Number),special:Number(d.special)})).sort((a,b)=>a.period-b.period);
    for(let t=245;t<target;t++){
      const h=hist.filter(d=>d.period<t);
      if(!h.length)continue;
      originalPredict(h,t);
    }
  }
  predict=function(base,target){
    rebuildIfNeeded(base,target);
    return originalPredict(base,target);
  };
  window.__S44_STATE_FIX='strict-sequential-v1';
})();
