export async function onRequestGet(){
  const upstream='https://macaumarksix.com/api/macaujc2.com';
  try{
    const r=await fetch(upstream,{headers:{'Accept':'application/json'}});
    const body=await r.text();
    return new Response(body,{status:r.status,headers:{'content-type':r.headers.get('content-type')||'application/json; charset=utf-8','cache-control':'no-store','x-data-source':'macaumarksix-latest'}});
  }catch(e){
    return Response.json({result:false,message:'upstream fetch failed',error:String(e&&e.message||e)},{status:502,headers:{'cache-control':'no-store'}});
  }
}
