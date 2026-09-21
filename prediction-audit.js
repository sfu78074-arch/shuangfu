/* v67: prospective records and retrospective calculations are separate. */
const S67Audit=window.S67Ledger.create(localStorage);
window.S67Audit=S67Audit;
s46BlindStats=function(hist){return S67Audit.stats(hist,'S4.6')};
s46ZBlindStats=function(hist){return S67Audit.stats(hist,'S4.6')};

// Private state: replay never saves predictions or changes the live forecast.
async function s67ReplayS46(hist,start,end){
  if(!window.S67Ledger.validHistory(hist))throw new Error('历史缺期或号码异常，暂不能回算');
  const clone=x=>JSON.parse(JSON.stringify(x)),l50=clone(PRE50),ls2=clone(PRES2),choices=clone(PRECHOICE),cache=new Map();
  const actual=Object.fromEntries(hist.map(d=>[d.period,d.special])),out=[];
  for(let t=Math.min(start,245);t<=end;t++){
    const h=hist.filter(d=>d.period<t),r50=linearRank(h,t,50,cache),r100=linearRank(h,t,100,cache),r2=blendRanks(r50,r100);
    l50[t]=r50.slice(0,9);ls2[t]=r2.slice(0,9);
    let choice='50';
    if(t>=81){
      const a=.65*hitRateFromLog(l50,actual,Math.max(31,t-30),t-1)+.35*hitRateFromLog(l50,actual,Math.max(31,t-60),t-1);
      const b=.65*hitRateFromLog(ls2,actual,Math.max(31,t-30),t-1)+.35*hitRateFromLog(ls2,actual,Math.max(31,t-60),t-1);
      choice=b>=a+.03?'S2':a>=b+.03?'50':choices[t-1]||'50';
    }
    choices[t]=choice;
    if(t>=start){
      const base=choice==='S2'?r2:r50,r30=linearRank(h,t,30,cache),r60=linearRank(h,t,60,cache),r80=linearRank(h,t,80,cache),r120=linearRank(h,t,120,cache);
      const four=s46ZRank(h,[6,8,10]).slice(0,4),six=four.slice();
      for(const z of s46ZRank(h,[10,12,14])){if(!six.includes(z))six.push(z);if(six.length===6)break;}
      out.push({period:t,actual:actual[t],prediction:{
        one:s46Fuse([base,r60,r120],[.30,.10,.60],.80).slice(0,1),
        three:s46Fuse([base,r30,r60],[.70,.20,.10],.80).slice(0,3),
        sixn:s46Fuse([base,r60,r120],[.70,.05,.25],.40).slice(0,6),
        nine:s46Fuse([base,r80,r120],[.70,.10,.20],.40).slice(0,9),four,six
      }});
    }
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  return out;
}

(function(){
  const labels={one:'1码',three:'3码',sixn:'6码',nine:'9码',four:'四肖',six:'六肖'};
  let view='S4.6',metric='nine',history=[],replay=[],replaySignature='',running=false,message='',lastRender='';
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const time=text=>{const t=Date.parse(text);return Number.isFinite(t)?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(t):'—'};
  function result(p,actual){if(!p||actual==null)return null;return p.includes(metric==='four'||metric==='six'?numToZ[actual]:actual);}
  function styles(){
    if(document.getElementById('s67-audit-style'))return;
    const st=document.createElement('style');st.id='s67-audit-style';
    st.textContent=`#prediction-audit{max-width:820px;margin:12px auto 24px;padding:0 14px;color:#eef5ff;font-family:system-ui,sans-serif;box-sizing:border-box}#prediction-audit .audit-box{background:#111c31;border:1px solid #365173;border-radius:16px;padding:16px}#prediction-audit h2{font-size:21px;margin:0 0 10px}#prediction-audit p{font-size:14px;line-height:1.6;margin:8px 0;color:#b7cae2}#prediction-audit .audit-controls{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}#prediction-audit label{font-size:14px;display:flex;gap:6px;align-items:center}#prediction-audit select,#prediction-audit button{background:#172640;border:1px solid #46658e;border-radius:8px;color:#eef5ff;padding:9px;font-size:14px}#prediction-audit button{cursor:pointer}#prediction-audit button:disabled{opacity:.6;cursor:wait}#prediction-audit .audit-scroll{overflow:auto;max-height:520px;border:1px solid #2b405f;border-radius:10px}#prediction-audit table{width:100%;border-collapse:collapse;font-size:14px}#prediction-audit th,#prediction-audit td{padding:10px 8px;border-bottom:1px solid #2b405f;text-align:left;white-space:nowrap}#prediction-audit th{position:sticky;top:0;background:#172640}#prediction-audit .audit-hit{color:#89e6a7}#prediction-audit .audit-miss{color:#ffb2a8}#prediction-audit .audit-warn{color:#ffd98e}#prediction-audit summary{cursor:pointer;font-size:14px;margin:12px 0}#prediction-audit .audit-numbers{font-variant-numeric:tabular-nums}#prediction-audit .audit-summary{font-size:16px;color:#fff;font-weight:700}@media(max-width:560px){#prediction-audit{width:100%;padding:0 10px}#prediction-audit .audit-box{padding:12px}#prediction-audit .audit-controls{flex-direction:column;align-items:stretch}#prediction-audit select{flex:1;min-width:0}}`;
    document.head.appendChild(st);
  }
  function legacyCount(key){try{const x=JSON.parse(localStorage.getItem(key)||'{}');return x&&typeof x==='object'?Object.keys(x).length:0}catch(_){return 0}}
  function render(force=false){
    if(!history.length)return;
    const currentSig=window.S67Ledger.signature(history),key=JSON.stringify([currentSig,localStorage.getItem(window.S67Ledger.KEY),localStorage.getItem(window.S67Ledger.TIMES),view,metric,running,message,replaySignature,S67Audit.error]);
    if(!force&&key===lastRender)return;lastRender=key;styles();
    let root=document.getElementById('prediction-audit');
    if(!root){root=document.createElement('section');root.id='prediction-audit';const anchor=document.getElementById('s46');if(anchor)anchor.insertAdjacentElement('afterend',root);else document.body.appendChild(root);}
    const isReplay=view==='replay',last=history.at(-1).period,start=Math.max(31,last-29);
    const saved=S67Audit.entries().filter(e=>e.model===view),byPeriod=new Map(saved.map(e=>[e.period,e]));
    let h=0,n=0,rows='';
    if(isReplay){
      if(replaySignature===currentSig){
        for(const r of replay.slice().reverse()){
          const hit=result(r.prediction[metric],r.actual);if(hit!==null){n++;h+=Number(hit);}
          rows+=`<tr><td>${r.period}</td><td>—</td><td class="audit-numbers">${r.prediction[metric].map(x=>esc(typeof x==='number'?fmt(x):x)).join('、')}</td><td>${fmt(r.actual)} · ${esc(numToZ[r.actual])}</td><td class="audit-warn">历史回算 · 不计入存档</td><td class="${hit?'audit-hit':'audit-miss'}">${hit?'中':'未中'}</td></tr>`;
        }
      }
    }else{
      const st=S67Audit.stats(history,view)[metric];h=st.h;n=st.n;
      for(let t=last+1;t>=start;t--){
        const entry=byPeriod.get(t),actual=history.find(d=>d.period===t),info=entry?S67Audit.inspect(entry,history):null,p=entry?.prediction?.[metric];
        const hit=info?.status==='checked'?result(p,actual?.special):null;
        rows+=`<tr><td>${t}</td><td>${esc(entry?time(entry.createdAt):'—')}</td><td class="audit-numbers">${Array.isArray(p)?p.map(x=>esc(typeof x==='number'?fmt(x):x)).join('、'):'—'}</td><td>${actual?fmt(actual.special)+' · '+esc(numToZ[actual.special]):'待开奖'}</td><td class="${info?.status==='checked'?'audit-hit':'audit-warn'}">${esc(info?info.reason:actual?'缺少存档 · 不计入成绩':'等待同步后留档')}${entry?.source==='imported'?'（导入）':''}</td><td class="${hit===null?'':hit?'audit-hit':'audit-miss'}">${hit===null?'—':hit?'中':'未中'}</td></tr>`;
      }
    }
    const summary=n?`${labels[metric]}：${h}/${n} · ${(100*h/n).toFixed(2)}%`:isReplay?'尚未生成历史回算':'暂无已核对存档';
    root.innerHTML=`<div class="audit-box"><h2>逐期核对</h2><p>提前存档只核对首次保存的预测；缺少记录、保存晚于开奖、开奖时间缺失或历史有变动的期次均不计入成绩。历史回算单独显示。</p><div class="audit-controls"><label>记录类型<select data-audit-view aria-label="记录类型"><option value="S4.5">S4.5 提前存档</option><option value="S4.6">S4.6 提前存档</option><option value="replay">S4.6 近30期历史回算</option></select></label><label>核对项目<select data-audit-metric aria-label="核对项目">${Object.entries(labels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>${isReplay?`<button type="button" data-audit-calculate ${running?'disabled':''}>${running?'正在回算…':'生成历史回算'}</button>`:''}</div><p class="audit-summary">${esc(summary)}</p><p>${isReplay?`当前数据可回算 ${start}–${last} 期；这些结果不会写入提前存档。`:'成绩统计本机所有已核对记录；下表显示最近30期及下一期。保存时间为北京时间。'}</p>${message?`<p role="status">${esc(message)}</p>`:''}${S67Audit.error?`<p class="audit-warn" role="alert">${esc(S67Audit.error)}</p>`:''}<div class="audit-scroll"><table><thead><tr><th>期号</th><th>保存时间</th><th>${isReplay?'回算预测':'首次存档'} · ${labels[metric]}</th><th>实际特码</th><th>核对状态</th><th>命中</th></tr></thead><tbody>${rows||'<tr><td colspan="6">点击“生成历史回算”查看逐期结果。</td></tr>'}</tbody></table></div><details><summary>统计说明与旧版记录</summary><p>存档保存在当前浏览器；保存时间与接口开奖时间进行比较，未经过服务器签名或第三方认证，不等同于独立认证的盲测。换设备请先导出完整数据。</p><p>原数字记录 ${legacyCount('s46_blind_predictions_v1')} 条、原生肖记录 ${legacyCount('s46_zodiac_blind_v1')} 条仍保留。旧版255期汇总及后续补算不再并入提前存档成绩。</p><p>数字研究表的31–245期成绩保留为旧版研究快照；生肖研究表按当前数据回算。历史成绩不代表未来命中概率。</p></details></div>`;
    root.querySelector('[data-audit-view]').value=view;root.querySelector('[data-audit-metric]').value=metric;
    root.querySelector('[data-audit-view]').onchange=e=>{view=e.target.value;message='';render(true)};
    root.querySelector('[data-audit-metric]').onchange=e=>{metric=e.target.value;render(true)};
    const button=root.querySelector('[data-audit-calculate]');if(button)button.onclick=calculate;
  }
  async function calculate(){
    if(running)return;running=true;message='逐期只使用该期以前的数据计算，请稍候。';render(true);
    const copy=JSON.parse(JSON.stringify(history)),sig=window.S67Ledger.signature(copy),last=copy.at(-1).period;
    try{
      const rows=await s67ReplayS46(copy,Math.max(31,last-29),last);
      if(sig!==window.S67Ledger.signature(history))throw new Error('开奖记录已更新，请重新生成回算');
      replay=rows;replaySignature=sig;message='回算完成，未写入提前存档。';
    }catch(e){message='回算失败：'+e.message}finally{running=false;render(true)}
  }
  const previous=s46Render;
  s46Render=function(){previous();try{history=s44GetHistory().hist;render()}catch(e){console.error('prediction audit',e)}};
})();
