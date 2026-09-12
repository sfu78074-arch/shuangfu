(function(){
'use strict';
const PAGE_TITLE='808 S4.5主参考｜S4.6实验';
function setTitle(){if(document.title!==PAGE_TITLE)document.title=PAGE_TITLE}
function ensureStyle(){
 if(document.getElementById('model-role-style'))return;
 const st=document.createElement('style');
 st.id='model-role-style';
 st.textContent=`
#model-role-guide{max-width:820px;margin:12px auto 14px;padding:12px 14px;border:1px solid #35537a;border-radius:14px;background:#101c31;color:#eaf2ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box}
#model-role-guide *{box-sizing:border-box}
#model-role-guide .rg-title{font-size:14px;font-weight:900;margin-bottom:8px}
#model-role-guide .rg-row{display:flex;gap:7px;flex-wrap:wrap}
.rg-pill{font-size:12px;padding:6px 9px;border-radius:999px;background:#172640;border:1px solid #31486b}
.rg-pill.main{color:#89e6a7;border-color:#3c7752}.rg-pill.exp{color:#ffd98e;border-color:#7b6531}.rg-pill.base{color:#a9bed8}
.rg-note{font-size:11px;color:#9fb1ca;line-height:1.55;margin-top:8px}
.model-role-note{margin:7px 0 10px;padding:8px 10px;border-radius:9px;background:#111f35;border:1px dashed #38577e;font-size:11px;line-height:1.5;color:#b7cae2}
.model-role-note strong{color:#fff}
.mobile-table-scroll{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin;margin-top:8px;padding-bottom:3px}
.mobile-table-scroll table{margin-top:0!important}
.mobile-table-hint{display:none;font-size:10px;color:#7f93ad;text-align:right;margin:7px 2px -1px}
@media(max-width:560px){
  html,body{overflow-x:hidden!important}
  #model-role-guide{width:calc(100% - 20px);margin:10px 10px 12px;padding:11px 12px;border-radius:12px}
  #model-role-guide .rg-title{font-size:14px;margin-bottom:7px}
  #model-role-guide .rg-row{display:grid;grid-template-columns:1fr;gap:6px}
  #model-role-guide .rg-pill{width:100%;font-size:12px;padding:7px 9px;border-radius:9px;text-align:left}
  #model-role-guide .rg-note{font-size:11px;line-height:1.65;margin-top:7px}
  #s44s,#s46{width:100%!important;max-width:100%!important;margin:10px auto 16px!important;padding:0 10px!important}
  #s44s .hero,#s46 .hero{padding:12px!important;border-radius:14px!important;overflow:hidden}
  #s44s h1,#s46 h1,#s46 h2{font-size:19px!important;line-height:1.3!important;margin-bottom:6px!important}
  #s44s .sub,#s46 .sub{font-size:11.5px!important;line-height:1.6!important}
  .model-role-note{font-size:11px;line-height:1.6;margin:8px 0 10px;padding:8px 9px}
  #s44s .grid,#s46 .grid{grid-template-columns:1fr!important;gap:8px!important;margin-top:10px!important}
  #s44s .card,#s46 .card{padding:10px!important;border-radius:11px!important}
  #s44s .lab,#s46 .lab{font-size:12px!important;margin-bottom:7px!important}
  #s44s .vals,#s46 .vals{font-size:17px!important;line-height:1.45!important}
  #s44s .numrow,#s46 .numrow{gap:5px!important;align-items:center!important}
  #s44s .numball,#s46 .numball{width:32px!important;height:32px!important;font-size:14px!important;border-width:2px!important;flex:0 0 32px!important}
  #s46 .zmap{font-size:11.5px!important;margin-top:7px!important;padding-top:7px!important}
  #s46 .zvals{font-size:17px!important;line-height:1.55!important}
  #s44s .meta,#s46 .pillrow{gap:5px!important;margin-top:9px!important}
  #s44s .pill,#s46 .pill{font-size:10.5px!important;padding:5px 7px!important}
  #s44s .migbar{gap:6px!important;padding:8px!important}
  #s44s .migbtn{font-size:11px!important;padding:7px 9px!important}
  #s44s .migtxt{font-size:10.5px!important;line-height:1.5!important;flex-basis:100%}
  .mobile-table-hint{display:block}
  .mobile-table-scroll{margin-left:0;margin-right:0;border:1px solid #263a59;border-radius:10px;background:#0b1526}
  #s46 .mobile-table-scroll table{min-width:660px!important;font-size:11px!important}
  #s44s .mobile-table-scroll table{min-width:520px!important;font-size:11px!important}
  #s46 th,#s46 td,#s44s th,#s44s td{padding:7px 7px!important;white-space:nowrap!important}
  #s46 .note,#s44s .note{font-size:10.5px!important;line-height:1.65!important}
  body>.wrap,.wrap{max-width:100%!important;width:100%!important;padding-left:10px!important;padding-right:10px!important;box-sizing:border-box!important}
  .wrap h1{font-size:19px!important;line-height:1.35!important}
}
`;
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
function wrapTables(root){
 if(!root)return;
 root.querySelectorAll('table').forEach(t=>{
   if(t.parentElement&&t.parentElement.classList.contains('mobile-table-scroll'))return;
   const hint=document.createElement('div');hint.className='mobile-table-hint';hint.textContent='← 左右滑动查看完整数据 →';
   const box=document.createElement('div');box.className='mobile-table-scroll';
   t.parentNode.insertBefore(hint,t);t.parentNode.insertBefore(box,t);box.appendChild(t);
 });
}
function apply(){
 setTitle();ensureStyle();
 const s45=document.getElementById('s44s');
 if(s45){
   guide(s45);
   const h=s45.querySelector('h1,h2');if(h)h.textContent='🛡️ 主参考｜S4.5 保守增强版';
   note(s45,'s45','<strong>主参考：</strong>日常判断优先看这一块。1/3/6/9码与S3锁定一致，六肖使用S4.5增强规则。');
   wrapTables(s45);
 }
 const s46=document.getElementById('s46');
 if(s46){
   const h=s46.querySelector('h1,h2');if(h)h.textContent='🧪 实验观察｜S4.6 数字+生肖增强·盲测层';
   note(s46,'s46','<strong>实验观察：</strong>这一块是独立盲测模型，号码与S4.5不同是设计如此。先记录真实成绩，不作为主参考替代S4.5。');
   wrapTables(s46);
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
setTimeout(apply,250);setTimeout(apply,850);setTimeout(apply,1600);setInterval(apply,2200);
})();