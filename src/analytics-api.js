const ACCESS_COOKIE='a90_access';

export async function handleAnalyticsApi(request,env,url){
  if(url.pathname==='/api/analytics/event'&&request.method==='POST')return recordEvent(request,env);
  if(url.pathname==='/api/analytics/dashboard'&&request.method==='GET')return dashboard(request,env,url);
  return null;
}

async function recordEvent(request,env){
  const ua=request.headers.get('User-Agent')||'';
  if(/bot|crawler|spider|slurp|bingpreview|facebookexternalhit|discordbot|telegrambot/i.test(ua))return empty();

  let body;try{body=await request.json()}catch{return json({error:'Evento no válido.'},400)}
  const eventType=String(body?.event_type||'').toLowerCase();
  const path=cleanPath(body?.path);
  const target=cleanText(body?.target,160);
  const referrer=cleanHost(body?.referrer_host);
  const sessionId=uuid(body?.session_id)?body.session_id:null;
  const isEntry=eventType==='page_view'&&body?.is_entry===true;

  if(!['page_view','click','download'].includes(eventType)||!path)return json({error:'Evento no válido.'},400);

  const r=await supabase(env,'/rest/v1/analytics_events',null,{
    method:'POST',
    headers:{'Prefer':'return=minimal'},
    body:JSON.stringify({event_type:eventType,path,target,referrer_host:referrer,session_id:sessionId,is_entry:isEntry})
  });
  if(!r.res.ok)return json({error:'No se pudo registrar la analítica.'},502);
  return empty();
}

async function dashboard(request,env,url){
  const access=parseCookies(request)[ACCESS_COOKIE]||'';
  if(!access)return json({error:'Inicia sesión primero.'},401);

  const user=await authUser(env,access);
  if(!user)return json({error:'La sesión ha caducado.'},401);
  const role=await roleOf(env,access,user.id);
  if(role!=='super_admin')return json({error:'Acceso reservado al Super Admin.'},403);

  const raw=Number(url.searchParams.get('days')||30);
  const days=[7,30,90,365].includes(raw)?raw:30;
  const r=await supabase(env,'/rest/v1/rpc/analytics_dashboard',access,{
    method:'POST',
    body:JSON.stringify({p_days:days})
  });
  if(!r.res.ok)return json({error:'No se pudo cargar la analítica.'},r.res.status===401?401:502);
  return json(r.body||{},200);
}

function cleanPath(v){const s=String(v||'').trim().slice(0,300);return s.startsWith('/')?s:''}
function cleanText(v,max){const s=String(v||'').trim().slice(0,max);return s||null}
function cleanHost(v){const s=String(v||'').trim().toLowerCase().slice(0,255);return s&&/^[a-z0-9.-]+(?::[0-9]+)?$/.test(s)?s:null}
function uuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''))}
function parseCookies(request){const out={};for(const part of (request.headers.get('Cookie')||'').split(';')){const i=part.indexOf('=');if(i<0)continue;const k=part.slice(0,i).trim();if(!k)continue;try{out[k]=decodeURIComponent(part.slice(i+1).trim())}catch{out[k]=part.slice(i+1).trim()}}return out}
function sbHeaders(env,access){const key=env.SUPABASE_PUBLISHABLE_KEY;return {'apikey':key,'Authorization':`Bearer ${access||key}`,'Content-Type':'application/json','Accept':'application/json'}}
async function supabase(env,path,access,options={}){const res=await fetch(env.SUPABASE_URL+path,{...options,headers:{...sbHeaders(env,access),...(options.headers||{})}});const text=await res.text();let body=null;if(text){try{body=JSON.parse(text)}catch{body=text}}return {res,body}}
async function authUser(env,access){const r=await supabase(env,'/auth/v1/user',access);return r.res.ok?r.body:null}
async function roleOf(env,access,id){const r=await supabase(env,`/rest/v1/user_roles?user_id=eq.${encodeURIComponent(id)}&select=role&limit=1`,access);return r.res.ok&&Array.isArray(r.body)&&r.body[0]?.role?r.body[0].role:'user'}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}
function empty(){return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}})}
