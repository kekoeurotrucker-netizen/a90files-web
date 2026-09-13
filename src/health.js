export async function handleHealth(request,env,url){
  if(url.pathname!=='/api/health'||request.method!=='GET')return null;

  let ok=false;
  try{
    const res=await fetch(env.SUPABASE_URL+'/auth/v1/settings',{
      headers:{
        apikey:env.SUPABASE_PUBLISHABLE_KEY,
        Authorization:`Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`
      },
      cf:{cacheTtl:0,cacheEverything:false}
    });
    ok=res.ok;
  }catch{}

  return new Response(JSON.stringify({ok,service:'a90files-web'}),{
    status:ok?200:503,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store, max-age=0',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer'
    }
  });
}
