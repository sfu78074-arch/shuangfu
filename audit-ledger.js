/* Local prediction evidence. Timestamps are local evidence, not server certification. */
(function(root){
  'use strict';
  const KEY='prediction_audit_v67', TIMES='prediction_draw_times_v67';
  const RULES={'S4.5':'S45-S3-and-six-cold-v1','S4.6':'NUM-LOCK1-20260903|ZOD-LOCK1-20260906'};
  const METRICS={one:1,three:3,sixn:6,nine:9,four:4,six:6};
  const ZODIACS=['马','蛇','龙','兔','虎','牛','鼠','猪','狗','鸡','猴','羊'];
  const clone=x=>JSON.parse(JSON.stringify(x));
  function canonical(hist){return hist.slice().sort((a,b)=>a.period-b.period).map(d=>[d.period,...d.regular,d.special]);}
  function signature(hist){
    const str=JSON.stringify(canonical(hist));let hash=2166136261;
    for(let i=0;i<str.length;i++)hash=Math.imul(hash^str.charCodeAt(i),16777619);
    return (hash>>>0).toString(16).padStart(8,'0');
  }
  function validHistory(hist){
    if(!Array.isArray(hist)||!hist.length)return false;
    return hist.every((d,i)=>d&&d.period===i+1&&Array.isArray(d.regular)&&d.regular.length===6&&
      [...d.regular,d.special].every(n=>Number.isInteger(n)&&n>=1&&n<=49)&&new Set([...d.regular,d.special]).size===7);
  }
  function validPrediction(p){
    return p&&Object.entries(METRICS).every(([k,n])=>Array.isArray(p[k])&&p[k].length===n&&new Set(p[k]).size===n&&
      p[k].every(x=>k==='four'||k==='six'?ZODIACS.includes(x):Number.isInteger(x)&&x>=1&&x<=49));
  }
  function openTime(text){
    if(typeof text!=='string')return NaN;
    const value=text.trim().replace(' ','T');
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value))return NaN;
    return Date.parse(/[Zz]|[+-]\d{2}:\d{2}$/.test(value)?value:value+'+08:00');
  }
  const sameDraw=(a,b)=>a&&b&&JSON.stringify([a.period,...a.regular,a.special])===JSON.stringify([b.period,...b.regular,b.special]);
  function create(storage,now=()=>Date.now()){
    let sync=null,lastError='';
    function read(key){
      const raw=storage.getItem(key);if(!raw)return {};
      const obj=JSON.parse(raw);if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error('存档格式异常，原始数据已保留');
      return obj;
    }
    function write(key,obj){storage.setItem(key,JSON.stringify(obj));lastError='';}
    function entries(){try{return Object.values(read(KEY));}catch(e){lastError=e.message;return [];}}
    function ingest(hist,records,options={}){
      sync=null;
      try{
        const meta=read(TIMES),map=new Map(hist.map(d=>[d.period,d]));
        for(const d of records){
          if(Number.isFinite(openTime(d.openTime))&&sameDraw(map.get(d.period),d))meta[d.period]={period:d.period,regular:d.regular.slice(),special:d.special,openTime:d.openTime};
        }
        write(TIMES,meta);
        const latest=hist.at(-1)?.period;
        if(validHistory(hist)&&options.latestConfirmed===true&&!options.conflicts?.length&&options.apiLatest===latest){
          sync={latest,signature:signature(hist),at:now()};
        }
      }catch(e){lastError='开奖时间保存失败：'+e.message;}
    }
    function record(model,hist,target,prediction){
      try{
        if(!RULES[model]||!validHistory(hist)||!validPrediction(prediction)||target!==hist.length+1||target>365)return {saved:false,reason:'数据或预测不完整'};
        if(!sync||now()<sync.at||now()-sync.at>60000||sync.latest!==target-1||sync.signature!==signature(hist))return {saved:false,reason:'等待最新开奖同步确认'};
        const records=read(KEY),id='2026:'+target+':'+model,existing=records[id];
        if(existing)return {saved:false,reason:'已有首次存档',entry:clone(existing)};
        const previous=read(TIMES)[target-1];
        if(!previous||!Number.isFinite(openTime(previous.openTime))||now()<openTime(previous.openTime))return {saved:false,reason:'无法核对前一期开奖时间'};
        const predictionCopy=Object.fromEntries(Object.keys(METRICS).map(k=>[k,prediction[k].slice()]));
        const entry={schema:2,id,year:2026,period:target,model,rule:RULES[model],createdAt:new Date(now()).toISOString(),
          syncedAt:new Date(sync.at).toISOString(),dataThrough:target-1,historySignature:signature(hist),prediction:predictionCopy,source:'local'};
        records[id]=entry;write(KEY,records);return {saved:true,entry:clone(entry)};
      }catch(e){lastError='预测未能保存：'+e.message;return {saved:false,reason:lastError};}
    }
    function inspect(entry,hist){
      const result={entry,status:'unverified',reason:'记录不完整',actual:null};
      if(!entry||entry.schema!==2||entry.year!==2026||!Number.isInteger(entry.period)||entry.period<32||entry.period>365||
         entry.rule!==RULES[entry.model]||entry.dataThrough!==entry.period-1||!validPrediction(entry.prediction))return result;
      const past=hist.filter(d=>d.period<entry.period),actual=hist.find(d=>d.period===entry.period);
      result.actual=actual||null;
      if(!validHistory(past)||past.length!==entry.dataThrough||signature(past)!==entry.historySignature)return {...result,reason:'历史数据已变化或缺期'};
      const created=Date.parse(entry.createdAt),synced=Date.parse(entry.syncedAt);
      if(!Number.isFinite(created)||!Number.isFinite(synced)||created<synced||created-synced>60000)return {...result,reason:'保存时间不可核对'};
      let meta;try{meta=read(TIMES);}catch(e){lastError=e.message;return {...result,reason:'开奖时间数据不可读'};}
      const prev=meta[entry.period-1];
      if(!prev||!sameDraw(prev,past.at(-1))||!Number.isFinite(openTime(prev.openTime))||created<openTime(prev.openTime))return {...result,reason:'前一期时间无法核对'};
      if(!actual)return {...result,status:'pending',reason:'待开奖后核对时间'};
      const source=meta[entry.period];
      if(!source||!sameDraw(source,actual)||!Number.isFinite(openTime(source.openTime)))return {...result,reason:'缺少匹配的接口开奖时间'};
      if(created>=openTime(source.openTime))return {...result,status:'late',reason:'保存时间不早于开奖'};
      return {...result,status:'checked',reason:'本机时间核对通过'};
    }
    function stats(hist,model){
      const out=Object.fromEntries(Object.keys(METRICS).map(k=>[k,{h:0,n:0}]));
      for(const e of entries()){
        if(e.model!==model)continue;
        const r=inspect(e,hist);if(r.status!=='checked')continue;
        const zodiac=ZODIACS[(r.actual.special-1)%12];
        for(const k of Object.keys(out)){out[k].n++;if(e.prediction[k].includes(k==='four'||k==='six'?zodiac:r.actual.special))out[k].h++;}
      }
      return out;
    }
    function backup(){return {schema:2,records:read(KEY),drawTimes:read(TIMES),legacyDigital:storage.getItem('s46_blind_predictions_v1'),legacyZodiac:storage.getItem('s46_zodiac_blind_v1')};}
    function restore(data){
      if(!data||data.schema!==2||!data.records||typeof data.records!=='object'||Array.isArray(data.records))throw new Error('预测存档备份格式错误');
      const records=read(KEY),meta=read(TIMES);
      for(const [id,e] of Object.entries(data.records)){
        if(!e||e.id!==id||id!=='2026:'+e.period+':'+e.model||e.schema!==2||e.rule!==RULES[e.model]||!validPrediction(e.prediction))throw new Error('预测存档记录无效');
        if(records[id]&&JSON.stringify(records[id].prediction)!==JSON.stringify(e.prediction))throw new Error('同一期预测冲突，未覆盖本机记录');
      }
      for(const [id,e] of Object.entries(data.records))if(!records[id])records[id]={...clone(e),source:'imported'};
      for(const [id,d] of Object.entries(data.drawTimes||{}))if(!meta[id]&&d&&String(d.period)===id&&Array.isArray(d.regular)&&d.regular.length===6&&Number.isFinite(openTime(d.openTime)))meta[id]=clone(d);
      write(TIMES,meta);write(KEY,records);
    }
    return {ingest,record,inspect,stats,entries,backup,restore,get error(){return lastError;}};
  }
  const api={create,signature,validHistory,validPrediction,openTime,RULES,METRICS,KEY,TIMES};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.S67Ledger=api;
})(typeof window!=='undefined'?window:this);
