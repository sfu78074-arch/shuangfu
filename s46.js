const S46_VERSION='S4.6 数字增强·盲测层';
const S46_RULE_ID='NUM-LOCK1-20260903';
const S46_LEDGER='s46_blind_predictions_v1';
function s46Fuse(ranks,weights,p){
 const pos=ranks.map(r=>{const o={};r.forEach((n,i)=>o[n]=i+1);return o}),sc={};
 for(let n=1;n<=49;n++){let s=0;for(let j=0;j<ranks.length;j++)s+=weights[j]/Math.pow(pos[j][n],p);sc[n]=s}
 return Array.from({length:49},(_,i)=>i+1).sort((a,b)=>sc[b]-sc[a]||a-b);
}
function s46Compute(hist,target){
 const base=predict(hist,target).rank,r30=linearRank(hist,target,30,new Map()),r60=linearRank(hist,target,60,new Map()),r80=linearRank(hist,target,80,new Map()),r120=linearRank(hist,target,120,new Map());
 const one=s46Fuse([base,r60,r120],[.30,.10,.60],.80).slice(0,1);
 const three=s46Fuse([base,r30,r60],[.70,.20,.10],.80).slice(0,3);
 const sixn=s46Fuse([base,r60,r120],[.70,.05,.25],.40).slice(0,6);
 const nine=s46Fuse([base,r80,r120],[.70,.10,.20],.40).slice(0,9);
 return {one,three,sixn,nine};
}
function s46Zodiacs(arr){const out=[];for(const n of arr){const z=numToZ[n];if(z&&!out.includes(z))out.push(z)}return out}
function s46LoadLedger(){try{const x=JSON.parse(localStorage.getItem(S46_LEDGER)||'{}');return x&&typeof x==='object'?x:{}}catch(e){return {}}}
function s46SaveLedger(x){try{localStorage.setItem(S46_LEDGER,JSON.stringify(x))}catch(e){}}
function s46Record(target,p){const L=s46LoadLedger(),k=String(target);if(!L[k]){L[k]={one:p.one,three:p.three,sixn:p.sixn,nine:p.nine,rule:S46_RULE_ID,created:new Date().toISOString()};s46SaveLedger(L)}return L}
function s46BlindStats(hist){
 const actual={};hist.forEach(x=>actual[x.period]=x.special);const L=s46LoadLedger(),S={one:{h:0,n:0},three:{h:0,n:0},sixn:{h:0,n:0},nine:{h:0,n:0}};
 for(const [t0,p] of Object.entries(L)){const t=+t0;if(t<246||actual[t]==null||!p||p.rule!==S46_RULE_ID)continue;for(const k of Object.keys(S)){if(Array.isArray(p[k])){S[k].n++;if(p[k].includes(actual[t]))S[k].h++}}}
 return S;
}
(function(){
 const st=document.createElement('style');st.textContent='#s46{max-width:820px;margin:0 auto 24px;padding:0 14px;color:#eef5ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}#s46 *{box-sizing:border-box}#s46 .hero{background:#0f1a2e;border:1px solid #3b557b;border-radius:18px;padding:16px;box-shadow:0 10px 30px #0004}#s46 h2{margin:0 0 5px;font-size:21px}#s46 .sub{font-size:12px;color:#9fb1ca;line-height:1.55}#s46 .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}@media(max-width:560px){#s46 .grid{grid-template-columns:1fr}}#s46 .card{background:#0c1628;border:1px solid #2b405f;border-radius:13px;padding:12px}#s46 .lab{font-size:13px;color:#a8bad2;margin-bottom:8px}#s46 .vals{font-size:18px;font-weight:800}#s46 .numrow{display:flex;align-items:center;gap:7px;flex-wrap:wrap}#s46 .numball{display:inline-flex;align-items:center;justify-content:center;width:37px;height:37px;border:2px solid currentColor;border-radius:50%;font-size:17px;font-weight:900;background:#0a1426;line-height:1}#s46 .numball.red{color:#ff4f5e}#s46 .numball.blue{color:#4b91ff}#s46 .numball.green{color:#29c779}#s46 .zmap{margin-top:9px;padding-top:8px;border-top:1px dashed #29405f;font-size:13px;color:#d9e6f7;line-height:1.5}#s46 .zmap b{color:#8fd7ff}#s46 .pillrow{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}#s46 .pill{font-size:11px;padding:5px 8px;border-radius:999px;background:#172640;border:1px solid #31486b}#s46 .ok{color:#89e6a7}#s46 .exp{color:#ffd98e}#s46 table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}#s46 th,#s46 td{padding:7px 5px;border-bottom:1px solid #263a59;text-align:center}#s46 th:first-child,#s46 td:first-child{text-align:left}#s46 .note{font-size:11px;color:#91a3bc;line-height:1.55;margin-top:10px}';document.head.appendChild(st);
})();
function s46Render(){
 try{
  if(typeof s44GetHistory!=='function'||typeof predict!=='function'||typeof linearRank!=='function')return;const hp=s44GetHistory(),hist=hp.hist;if(!hist.length)return;const last=hist[hist.length-1],target=last.period+1,p=s46Compute(hist,target);s46Record(target,p);const BS=s46BlindStats(hist);
  let root=document.getElementById('s46');if(!root){root=document.createElement('section');root.id='s46';const anchor=document.getElementById('s44s');if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(root,anchor.nextSibling);else document.body.insertBefore(root,document.body.firstChild)}
  const refs={one:[4,6,2,3,2,3],three:[15,17,9,10,6,7],sixn:[33,35,21,22,12,13],nine:[49,51,34,35,15,16]},labs={one:'⭐ 1码',three:'🎯 3码',sixn:'🔥 6码',nine:'🟢 9码'},pred={one:p.one,three:p.three,sixn:p.sixn,nine:p.nine};
  root.innerHTML=`<div class="hero"><h2>🧪 ${S46_VERSION}</h2><div class="sub">从246期开始锁定规则，只做前瞻盲测；不覆盖上方正式S3号码。各层独立增强，不要求1/3/6/9码互相嵌套。号码下方生肖为2026生肖表直接映射，不作为独立生肖预测。</div><div class="grid">${['one','three','sixn','nine'].map(k=>`<div class="card"><div class="lab">${labs[k]} · 实验候选</div><div class="vals">${s44Balls(pred[k])}</div><div class="zmap"><b>对应生肖：</b>${s46Zodiacs(pred[k]).join('、')||'—'}</div></div>`).join('')}</div><div class="pillrow"><span class="pill exp">规则已锁定：${S46_RULE_ID}</span><span class="pill ok">起始盲测：246期</span><span class="pill">生肖仅为号码映射</span><span class="pill">S4.5六肖保持不变</span></div><table><thead><tr><th>项目</th><th>S3历史</th><th>S4.6研究参考</th><th>开发段31–170</th><th>验证段171–245</th><th>246起盲测</th></tr></thead><tbody>${['one','three','sixn','nine'].map(k=>{const r=refs[k],b=BS[k];return `<tr><td>${labs[k]}</td><td>${r[0]}/215</td><td class="ok">${r[1]}/215 ${(r[1]/215*100).toFixed(2)}%</td><td>${r[2]}→${r[3]}/140</td><td>${r[4]}→${r[5]}/75</td><td>${b.h}/${b.n}${b.n?` ${(b.h/b.n*100).toFixed(2)}%`:''}</td></tr>`}).join('')}</tbody></table><div class="note">固定规则：1码=S3主排名30% + 60期学习10% + 120期学习60%；3码=S3 70% + 30期20% + 60期10%；6码=S3 70% + 60期5% + 120期25%；9码=S3 70% + 80期10% + 120期20%。均采用固定倒数排名融合。号码对应生肖仅按2026生肖表转换，不增加、不修改任何预测规则；从246期起不根据开奖结果回改规则。</div></div>`;
 }catch(e){console.error('S4.6 render error',e)}
}
const s46PrevRender=s44sRender;s44sRender=function(){s46PrevRender();setTimeout(s46Render,20)};setTimeout(s46Render,1600);

/* ===== S4.5 + S3 完整生肖映射显示 ===== */
(function(){
  function mapZodiac(nums){
    return nums.map(n => (typeof numToZ!=='undefined' && numToZ[n]) ? numToZ[n] : '—').join('、');
  }

  function getNums(box){
    const nums=[];
    box.querySelectorAll('.ball,.numball,[class*="ball"]').forEach(el=>{
      const n=parseInt((el.textContent||'').trim(),10);
      if(n>=1&&n<=49) nums.push(n);
    });
    return nums;
  }

  function addZodiac(box){
    if(!box) return;
    const nums=getNums(box);
    if(!nums.length) return;

    let line=box.querySelector(':scope > .full-zodiac-map');
    if(!line){
      line=document.createElement('div');
      line.className='full-zodiac-map';
      box.appendChild(line);
    }

    line.innerHTML='<span>对应生肖：</span><b>'+mapZodiac(nums)+'</b>';
  }

  function findCardByLabel(root,labels){
    if(!root) return;

    root.querySelectorAll('*').forEach(el=>{
      const t=(el.textContent||'').trim();

      if(!labels.includes(t)) return;

      let card=el;
      for(let i=0;i<5 && card;i++){
        if(getNums(card).length) break;
        card=card.parentElement;
      }

      if(card) addZodiac(card);
    });
  }

  function refreshFullZodiac(){
    /* S4.5 上方：1码 / 3码 / 6码 / 9码 */
    const s45=document.getElementById('s44s');
    if(s45){
      findCardByLabel(s45,[
        '⭐ 1码 · S3底线',
        '🎯 3码 · S3底线',
        '🔥 6码 · S3底线',
        '🟢 9码 · S3底线'
      ]);
    }

    /* S3 第N期模拟结果 */
    document.querySelectorAll('.card').forEach(card=>{
      const text=(card.textContent||'');
      if(
        text.includes('单挑1码') ||
        text.includes('核心3码') ||
        text.includes('核心6码') ||
        text.includes('正式9码')
      ){
        addZodiac(card);
      }
    });
  }

  const st=document.createElement('style');
  st.textContent=`
    .full-zodiac-map{
      margin-top:9px;
      padding-top:7px;
      border-top:1px dashed #2c4263;
      color:#91a6c4;
      font-size:12px;
      line-height:1.6;
    }
    .full-zodiac-map b{
      color:#ffd56a;
      font-size:13px;
      margin-left:4px;
    }
  `;
  document.head.appendChild(st);

  setTimeout(refreshFullZodiac,1800);
  setTimeout(refreshFullZodiac,2800);

  const ob=new MutationObserver(()=>{
    clearTimeout(window.__fullZodiacTimer);
    window.__fullZodiacTimer=setTimeout(refreshFullZodiac,120);
  });

  ob.observe(document.body,{childList:true,subtree:true});
})();
