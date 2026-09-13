export async function handleHealth(request,env,url){
  if(url.pathname!=='/api/health'||request.method!=='GET')return null;

  const started=Date.now();
  let settings=null;
  let supabaseReachable=false;
  let supabaseStatus=null;

  try{
    const res=await fetch(env.SUPABASE_URL+'/auth/v1/settings',{
      headers:{
        apikey:env.SUPABASE_PUBLISHABLE_KEY,
        Authorization:`Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`
      },
      cf:{cacheTtl:0,cacheEverything:false}
    });
    supabaseStatus=res.status;
    if(res.ok){
      settings=await res.json();
      supabaseReachable=true;
    }
  }catch{}

  const external=settings?.external||{};
  const providers={
    github:Boolean(external.github),
    google:Boolean(external.google),
    discord:Boolean(external.discord),
    facebook:Boolean(external.facebook),
    x:Boolean(external.x||external.twitter),
    apple:Boolean(external.apple)
  };

  return new Response(JSON.stringify({
    ok:supabaseReachable,
    service:'a90files-web',
    supabase:{reachable:supabaseReachable,status:supabaseStatus},
    auth:{email:Boolean(external.email??true),providers,instagram_general_login:false},
    latency_ms:Date.now()-started
  }),{
    status:supabaseReachable?200:503,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store, max-age=0',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer'
    }
  });
}
