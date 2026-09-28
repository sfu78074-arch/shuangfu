/* Keep prospective results and historical diagnostics visibly separate. */
(function(){
  'use strict';
  const E=window.S68Experiment,P=E.PLAN;
  const labels={nine:'九码',four:'四肖'};
  let hist=[],recent=[],recentSignature='',attempted='',running=false,error='',lastRender='',detailModel='S4.6',detailMetric='nine';
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct=(h,n)=>n?(100*h/n).toFixed(1)+'%':'—';
  const picks=a=>Array.isArray(a)?a.map(x=>typeof x==='number'?fmt(x):esc(x)).join('、'):'—';
  const time=s=>Number.isFinite(Date.parse(s))?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(Date.parse(s)):'—';
  function style(){
    if(document.getElementById('experiment-style'))return;
    const s=document.createElement('style');s.id='experiment-style';
    s.textContent=`#experiment-panel{max-width:820px;margin:14px auto 22px;padding:0 14px;color:#eaf2ff;font-family:system-ui,sans-serif;box-sizing:border-box}#experiment-panel *{box-sizing:border-box}#experiment-panel .xp-box{background:#101c31;border:1px solid #466080;border-radius:16px;padding:16px}#experiment-panel h2{font-size:22px;margin:0 0 10px}#experiment-panel h3{font-size:16px;margin:18px 0 8px}#experiment-panel p{font-size:13px;line-height:1.65;color:#b6c9e1;margin:8px 0}#experiment-panel .xp-alert{border-left:3px solid #e1ad54;background:#29231b;padding:10px 12px;color:#ffe0a3}#experiment-panel .xp-good{color:#92e5b0}#experiment-panel .xp-warn{color:#ffcd87}#experiment-panel .xp-bad{color:#ffb2ac}#experiment-panel .xp-progress{display:flex;align-items:center;gap:12px;font-size:13px;margin:12px 0}#experiment-panel progress{width:150px;height:10px;accent-color:#729fff}#experiment-panel .xp-scroll{overflow:auto;border:1px solid #2b405c;border-radius:10px;max-height:420px}#experiment-panel table{width:100%;border-collapse:collapse;font-size:12px}#experiment-panel td,#experiment-panel th{padding:10px 8px;border-bottom:1px solid #2b405c;text-align:left;white-space:nowrap}#experiment-panel th{background:#172640;position:sticky;top:0}#experiment-panel small{color:#9bb1cd}#experiment-panel summary{cursor:pointer;font-size:13px;margin:12px 0;color:#c9dbf1}#experiment-panel select,#experiment-panel button{background:#172640;color:#eef5ff;border:1px solid #476487;border-radius:7px;padding:8px;font-size:13px}#experiment-panel label{display:inline-flex;gap:6px;align-items:center;margin:0 12px 10px 0;font-size:13px}#experiment-panel .xp-formula{font-variant-numeric:tabular-nums}@media(max-width:560px){#experiment-panel{width:100%;padding:0 10px}#experiment-panel .xp-box{padding:12px}#experiment-panel h2{font-size:20px}#experiment-panel .xp-progress{flex-wrap:wrap}#experiment-panel table{font-size:11px}#experiment-panel .xp-scroll{max-height:360px}}`;
    document.head.appendChild(s);
  }
  function detailsRows(){
    const entries=S67Audit.entries(),byPeriod=new Map(entries.filter(e=>e.model===detailModel).map(e=>[e.period,e]));
    const end=Math.min(hist.at(-1).period+1,P.end),rows=[];
    for(let t=end;t>=P.start;t--){
      const e=byPeriod.get(t),info=e?S67Audit.inspect(e,hist):null,actual=hist.find(d=>d.period===t),c=e?.control;
      let status=info?.reason||(actual?'缺少存档 · 不补算':'等待同步保存');
      const valid=E.validControl(c,t),controlTime=valid?Date.parse(c.createdAt):NaN;
      const conflicting=valid&&entries.some(x=>x.period===t&&x.control&&JSON.stringify(x.control)!==JSON.stringify(c));
      const paired=info?.status==='checked'&&valid&&!conflicting&&controlTime>=S67Audit.drawTime(t-1)&&controlTime<S67Audit.drawTime(t)&&controlTime<=Date.parse(e.createdAt);
      if(e&&!valid)status='缺少同期对照 · 不计入对照成绩';
      else if(conflicting)status='对照冲突 · 不计入成绩';
      else if(info?.status==='checked'&&!paired)status='对照时间异常 · 不计入成绩';
      const modelHit=paired?(E.hit(e.prediction,detailMetric,actual.special)?'中':'未中'):'—';
      const randomHit=paired?(E.hit(c.prediction,detailMetric,actual.special)?'中':'未中'):'—';
      rows.push(`<tr><td>${t}</td><td>${time(e?.createdAt)}</td><td>${picks(e?.prediction?.[detailMetric])}</td><td>${picks(c?.prediction?.[detailMetric])}</td><td>${actual?fmt(actual.special)+' · '+numToZ[actual.special]:'待开奖'}</td><td>${esc(status)}</td><td>${modelHit} / ${randomHit}</td></tr>`);
    }
    return rows.join('')||'<tr><td colspan="7">尚未进入固定观察期。</td></tr>';
  }
  function recentTable(signature){
    if(recentSignature!==signature)return `<p>${running?'正在生成最近30期历史回算…':error?esc(error):'等待开奖同步后计算'}</p>${error?'<button data-xp-retry>重试近期回算</button>':''}`;
    const out=[];
    for(const model of P.models)for(const metric of P.metrics){
      const rows=recent.map(r=>({period:r.period,actual:r.actual,prediction:model==='S4.5'?r.baseline:r.prediction}));
      const s10=E.summarize(rows.slice(-10),metric),s20=E.summarize(rows.slice(-20),metric),s30=E.summarize(rows,metric);
      out.push(`<tr><td>${model} ${labels[metric]}${model==='S4.5'&&metric==='four'?' · 旧规则':''}</td><td>${s10.h}/${s10.n}</td><td>${s20.h}/${s20.n}</td><td>${s30.h}/${s30.n} · ${pct(s30.h,s30.n)}</td><td>${s30.currentMiss}期</td><td>${s30.maxMiss}期</td></tr>`);
    }
    return `<div class="xp-scroll"><table aria-label="近期历史回算"><thead><tr><th>模型 / 项目</th><th>近10期</th><th>近20期</th><th>近30期</th><th>窗口末段连空</th><th>窗口最长连空</th></tr></thead><tbody>${out.join('')}</tbody></table></div><p>${recent[0].period}–${recent.at(-1).period}期：逐期仅使用当期以前数据。以上为历史回算，不计入100期观察，也不补生成历史随机对照。</p>`;
  }
  function render(force=false){
    if(!hist.length)return;
    const signature=window.S67Ledger.signature(hist),state=E.comparison(hist,S67Audit);
    const key=JSON.stringify([signature,S67Audit.entries(),recentSignature,running,error,S67Audit.error,detailModel,detailMetric]);
    if(!force&&key===lastRender)return;lastRender=key;style();
    let root=document.getElementById('experiment-panel');
    if(!root){root=document.createElement('section');root.id='experiment-panel';const a=document.getElementById('s44s');if(!a)return;a.insertAdjacentElement('beforebegin',root);}
    const open=root.querySelector('[data-xp-records]')?.open||false,methodOpen=root.querySelector('[data-xp-method]')?.open||false;
    const complete=state.pending.filter(r=>r.saved).length,target=state.latest+1;
    const status=state.finished?'固定期已结束，不自动延长或更换规则。':E.active(target)?`第${target}期：${complete}/2 套模型与随机对照已在本机保存`:'第265期为升级过渡期；第266期开始正式配对存档';
    const latestControl=state.pending.find(r=>r.saved)?.entry.control;
    const rows=state.rows.map(r=>`<tr><td>${r.model} ${labels[r.metric]}</td><td>${r.h}/${r.n} · ${pct(r.h,r.n)}</td><td>${r.randomHits}/${r.n} · ${pct(r.randomHits,r.n)}</td><td>${r.n?r.expected.toFixed(2)+'次 / '+pct(r.expected,r.n):'—'}</td><td>${r.n?r.maxMiss+'期':'—'}</td><td>${r.missing}期</td><td>${esc(r.verdict.label)}</td></tr>`).join('');
    root.innerHTML=`<div class="xp-box"><h2>固定规则 · 本机100期对照观察</h2><p class="xp-alert"><b>S4.5 旧四肖已退出主推荐。</b>保留原规则观察表现；S4.6 同样处于实验阶段，暂未证明稳定预测优势。</p><div class="xp-progress"><b>2026年第266–365期</b><progress value="${state.elapsed}" max="100" aria-label="固定观察周期进度"></progress><span>已开奖 ${state.elapsed}/100 期</span></div><p>预先固定 S4.5 / S4.6 的九码、四肖四项比较。中途不因命中或连空调权重，不把漏存期次顺延补足。</p><p role="status" class="${complete===2?'xp-good':'xp-warn'}">${status}</p>${S67Audit.error?`<p role="alert" class="xp-bad">${esc(S67Audit.error)}</p>`:''}<p>此表保留旧本机对照，需打开网页才能留存；新的服务器自动记录请查看“逐期核对”，两类成绩不混合。旧记录换设备前请导出。</p><div class="xp-scroll"><table aria-label="固定期提前存档对照"><thead><tr><th>模型 / 项目</th><th>模型命中</th><th>同期随机对照</th><th>等概率基准期望</th><th>最长连空</th><th>缺失/未核验</th><th>初评状态</th></tr></thead><tbody>${rows}</tbody></table></div><p>模型与随机对照只比较同一批已核对期次。缺失期次打断连空计数，不代表命中；上述最长连空仅限连续可核对记录。</p><details data-xp-records ${open?'open':''}><summary>查看本期随机对照与逐期记录</summary>${latestControl?`<p>本期对照首次保存：${time(latestControl.createdAt)}（北京时间）<br>随机九码：${picks(latestControl.prediction.nine)}<br>随机四肖：${picks(latestControl.prediction.four)}（覆盖 ${E.coverage(latestControl.prediction,'four')}/49 个号码）</p>`:'<p>尚无本期有效随机对照。</p>'}<label>模型<select aria-label="对照明细模型"><option>S4.5</option><option>S4.6</option></select></label><label>项目<select aria-label="对照明细项目"><option value="nine">九码</option><option value="four">四肖</option></select></label><div class="xp-scroll"><table aria-label="随机对照逐期明细"><thead><tr><th>期号</th><th>模型保存时间</th><th>模型首次预测</th><th>同一期随机对照</th><th>实际特码</th><th>核对状态</th><th>模型 / 随机</th></tr></thead><tbody>${detailsRows()}</tbody></table></div></details><h3>近期表现 · 历史回算</h3>${recentTable(signature)}<details data-xp-method ${methodOpen?'open':''}><summary>固定规则与评估方法</summary><p>观察计划：${P.id}。号码公式及生肖规则保持原样。随机九码从49个号码中等概率、不重复抽9个；随机四肖从12生肖中等概率、不重复抽4个。同一期两模型共用首次生成的随机对照，刷新不重抽。</p><p>等概率基准：九码为9/49；四肖按每期所选生肖覆盖的16或17个号码计算，显示期望命中次数与平均概率。此基准以每期独立、49码等概率为假设。</p><p>到第365期结束再初评，四项比较分别需100条完整配对存档；缺期不补算。预设单侧二项检验，每项阈值0.0125（四项合计0.05）。九码基准9/49；四肖检验保守采用最大覆盖17/49。即使出现优势信号，也需要新的独立观察阶段，不自动升级为主推荐。同期随机对照只作参照，一次胜过随机组不等于有效。</p></details></div>`;
    const m=root.querySelector('[aria-label="对照明细模型"]'),k=root.querySelector('[aria-label="对照明细项目"]');m.value=detailModel;k.value=detailMetric;
    m.onchange=e=>{detailModel=e.target.value;render(true)};k.onchange=e=>{detailMetric=e.target.value;render(true)};
    const retry=root.querySelector('[data-xp-retry]');if(retry)retry.onclick=()=>{attempted='';refresh()};
  }
  async function calculate(copy,signature){
    running=true;error='';render(true);
    try{
      const end=copy.at(-1).period,rows=await s67ReplayS46(copy,Math.max(31,end-29),end,true);
      if(signature===window.S67Ledger.signature(hist)){recent=rows;recentSignature=signature;}
    }catch(e){error='近期回算未完成：'+e.message;}
    finally{running=false;render(true);if(window.S67Ledger.signature(hist)!==signature)refresh();}
  }
  function refresh(){
    try{
      if(window.__AUTO_SYNC_GUARD==='pending')return;
      hist=s44GetHistory().hist;if(!window.S67Ledger.validHistory(hist))return;
      render();const signature=window.S67Ledger.signature(hist);
      if(!running&&attempted!==signature){attempted=signature;calculate(JSON.parse(JSON.stringify(hist)),signature);}
    }catch(e){console.error('experiment panel',e);}
  }
  const previous=s46Render;s46Render=function(){previous();refresh();};
})();
