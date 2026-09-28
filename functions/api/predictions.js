export async function onRequestGet(){
 try{
  const r=await fetch('https://raw.githubusercontent.com/sfu78074-arch/shuangfu/main/data/server-ledger.json',{headers:{Accept:'application/json'},cf:{cacheTtl:0,cacheEverything:false}});
  if(!r.ok)return Response.json({error:r.status===404?'服务器首次存档尚未完成':'服务器存档暂不可读取'},{status:503,headers:{'cache-control':'no-store'}});
  const data=await r.json();
  if(data.schema!==1||data.year!==2026||!Array.isArray(data.entries)||!Array.isArray(data.draws))throw new Error('服务器存档格式异常');
  return Response.json(data,{headers:{'cache-control':'no-store'}});
 }catch(e){return Response.json({error:'服务器存档读取失败，请稍后重试'},{status:503,headers:{'cache-control':'no-store'}});}
}
