'use strict';
// Execute the existing website formulas, without a DOM or browser storage.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
function compute(history){
 const html=zlib.gunzipSync(Buffer.from([0,1,2,3,4].map(i=>read(`p${i}.txt`)).join(''),'base64')).toString();
 let core=html.slice(html.indexOf('const BUILTIN = '),html.indexOf('function ball(n)'));
 core=core.replace('const $=id=>document.getElementById(id), regs=[...document.querySelectorAll(".reg")];','').replace('let draws=load(),lastPred=null,busy=false;','');
 // Keep the same nested scope used by index.html: S4 helpers shadow S3 constants.
 const s42=read('s42.js').split('function render(')[0];
 const s43=read('s43.js').split('function s43Css(')[0];
 const s45=read('s45.js').split('\ns44sRender=')[0];
 const s46=read('s46.js').split('\n(function(){')[0];
 const ctx=vm.createContext({history,localStorage:{getItem:()=>null,setItem:()=>{}},console});
 const run=`
 const target=history.length+1,cache=new Map();
 modelLog50={};modelLogS2={};choiceLog={};let base;
 for(let t=31;t<=target;t++){
  const h=history.filter(r=>r.period<t),a=linearRank(h,t,50,cache),b=linearRank(h,t,100,cache),c=blendRanks(a,b);
  modelLog50[t]=a.slice(0,9);modelLogS2[t]=c.slice(0,9);choiceLog[t]=chooseMode(h,t).choice;
  if(t===target)base=choiceLog[t]==='S2'?c:a;
 }
 const z=s1Zodiac(s1Raw(history,featurePack(history))),r43=s43Compute(history,target,true),r45=s45SixCompute(history,target);
 const oldHit=r43.stats.S.sixz.hit,n=r43.stats.n||215,oldEnh=r43.current?.sixz||z.slice(0,6);
 const oldSix=oldHit>=104?oldEnh:z.slice(0,6);
 const use45=!!(r45.current&&r45.stats.n>0&&r45.stats.hit/r45.stats.n>=oldHit/Math.max(1,n)&&r45.stats.hit/r45.stats.n>=104/215);
 const a30=linearRank(history,target,30,cache),a60=linearRank(history,target,60,cache),a80=linearRank(history,target,80,cache),a120=linearRank(history,target,120,cache);
 const four=s46ZRank(history,[6,8,10]).slice(0,4),six=four.slice();
 for(const z of s46ZRank(history,[10,12,14])){if(!six.includes(z))six.push(z);if(six.length===6)break;}
 return {'S4.5':{one:base.slice(0,1),three:base.slice(0,3),sixn:base.slice(0,6),nine:base.slice(0,9),four:z.slice(0,4),six:use45?r45.current.six:oldSix},
 'S4.6':{one:s46Fuse([base,a60,a120],[.30,.10,.60],.80).slice(0,1),three:s46Fuse([base,a30,a60],[.70,.20,.10],.80).slice(0,3),sixn:s46Fuse([base,a60,a120],[.70,.05,.25],.40).slice(0,6),nine:s46Fuse([base,a80,a120],[.70,.10,.20],.40).slice(0,9),four,six}};
 `;
 return JSON.parse(JSON.stringify(vm.runInContext(core+'\n'+s42+'\n'+s43+'\n'+s45+'\n'+s46+'\n'+run+'\n})()',ctx,{timeout:180000})));
}
module.exports={compute};
