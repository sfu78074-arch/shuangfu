export async function onRequestGet(context){
  const u=new URL(context.request.url);
  const year=u.searchParams.get('year')||'2026';
  if(!/^20\d{2}$/.test(year))return Response.json({result:false,message:'invalid year'},{status:400,headers:{'cache-control':'no-store'}});
  const upstream=`https://history.macaumarksix.com/history/macaujc2/y/${year}`;
  try{
    const r=await fetch(upstream,{headers:{'Accept':'application/json'}});
    const body=await r.text();
    return new Response(body,{status:r.status,headers:{'content-type':r.headers.get('content-type')||'application/json; charset=utf-8','cache-control':'no-store','x-data-source':'macaumarksix-history'}});
  }catch(e){
    return Response.json({result:false,message:'upstream fetch failed',error:String(e&&e.message||e)},{status:502,headers:{'cache-control':'no-store'}});
  }
}
