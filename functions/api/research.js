export async function onRequestGet(){
  const upstream='https://raw.githubusercontent.com/sfu78074-arch/shuangfu/main/data/zodiac-research-2026.json';
  try{
    const r=await fetch(upstream,{headers:{'Accept':'application/json','Cache-Control':'no-cache'}});
    const body=await r.text();
    return new Response(body,{status:r.status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-data-source':'github-zodiac-research'}});
  }catch(e){return Response.json({result:false,message:'research fetch failed',error:String(e&&e.message||e)},{status:502,headers:{'cache-control':'no-store'}})}
}
