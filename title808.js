(function(){
'use strict';
const PAGE_TITLE='808 S4.5主参考｜S4.6实验';
function setTitle(){if(document.title!==PAGE_TITLE)document.title=PAGE_TITLE}
function ensureStyle(){
 if(document.getElementById('model-role-style'))return;
 const st=document.createElement('style');
 st.id='model-role-style';
 st.textContent=`#model-role-guide{max-width:820px;margin:12px auto 14px;padding:12px 14px;border:1px solid #35537a;border-radius:14px;background:#101c31;color:#eaf2ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box}#model-role-guide *{box-sizing:border-box}#model-role-guide .rg-title{font-size:14px;font-weight:900;margin-bottom:8px}#model-role-guide .rg-row{display:flex;gap:7px;flex-wrap:wrap}.rg-pill{font-size:12px;padding:6px 9px;border-radius:999px;background:#172640;border:1px solid #31486b}.rg-pill.main{color:#89e6a7;border-color:#3c7752}.rg-pill.exp{color:#ffd98e;border-color:#7b6531}.rg-pill.base{color:#a9bed8}.rg-note{font-size:11px;color:#9fb1ca;line-height:1.55;margin-top:8px}.model-role-note{margin:7px 0 10px;padding:8px 10px;border-radius:9px;background:#111f35;border:1px dashed #38577e;font-size:11px;line-height:1.5;color:#b7cae2}.model-role-note strong{color:#fff}`;
 document.head.appendChild(st);
}
function guide(anchor){
 if(document.getElementById('model-role-guide')||!anchor||!anchor.parentNode)return;
 const g=document.createElement('div');g.id='model-role-guide';
 g.innerHTML='<div class="rg-title">📌 模型阅读顺序</div><div class="rg-row"><span class="rg-pill main">① S4.5｜主参考</span><span class="rg-pill exp">② S4.6｜实验观察</span><span class="rg-pill base">③ S3｜底层核对</span></div><div class="rg-note">同一期里，S4.6 与 S4.5 的号码不同属于正常，因为算法独立；S3 与 S4.5 的 1/3/6/9码应保持一致。不要把三块当成三套同等级主预测。</div>';
 anchor.parentNode.insertBefore(g,anchor);
}
function note(root,key,html){
 if(!root||root.querySelector('[data-model-role="'+key+'"]'))return;
 const sub=root.querySelector('.sub');
 const n=document.createElement('div');n.className='model-role-note';n.setAttribute('data-model-role',key);n.innerHTML=html;
 if(sub&&sub.parentNode)sub.parentNode.insertBefore(n,sub.nextSibling);else root.insertBefore(n,root.firstChild);
}
function apply(){
 setTitle();ensureStyle();
 const s45=document.getElementById('s44s');
 if(s45){
   guide(s45);
   const h=s45.querySelector('h1,h2');if(h)h.textContent='🛡️ 主参考｜S4.5 保守增强版';
   note(s45,'s45','<strong>主参考：</strong>日常判断优先看这一块。1/3/6/9码与S3锁定一致，六肖使用S4.5增强规则。');
 }
 const s46=document.getElementById('s46');
 if(s46){
   const h=s46.querySelector('h1,h2');if(h)h.textContent='🧪 实验观察｜S4.6 数字+生肖增强·盲测层';
   note(s46,'s46','<strong>实验观察：</strong>这一块是独立盲测模型，号码与S4.5不同是设计如此。先记录真实成绩，不作为主参考替代S4.5。');
 }
 const old=document.querySelector('body > .wrap h1, .wrap h1');
 if(old){
   old.textContent='⚙️ 底层引擎｜S3（仅供核对）';
   const wrap=old.closest('.wrap')||old.parentElement;
   if(wrap&&!wrap.querySelector('[data-model-role="s3"]')){
     const n=document.createElement('div');n.className='model-role-note';n.setAttribute('data-model-role','s3');n.innerHTML='<strong>底层核对：</strong>S3主要用于核对S4.5号码层与数据，不作为第三套同等级主预测。';old.insertAdjacentElement('afterend',n);
   }
 }
}
setTitle();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
setTimeout(apply,400);setTimeout(apply,1400);setInterval(apply,2000);
})();