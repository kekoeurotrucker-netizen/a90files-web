const ACCESS_COOKIE='a90_access';
const REFRESH_COOKIE='a90_refresh';
const ACCESS_MAX_AGE=60*60;
const REFRESH_MAX_AGE=60*60*24*30;
const ROLES={user:10,moderator:20,admin:30,super_admin:40};

export async function handleModApi(request,env,url){
  try{
    const s=await requireRole(request,env,url.pathname==='/api/mod/role'?'admin':'moderator');
    if(s.error)return s.error;
    if(url.pathname==='/api/mod/reports'&&request.method==='GET')return listReports(env,s,url);
    if(url.pathname==='/api/mod/users'&&request.method==='GET')return listUsers(env,s,url);
    if(url.pathname==='/api/mod/topic'&&request.method==='POST')return moderateTopic(request,env,s);
    if(url.pathname==='/api/mod/post'&&request.method==='POST')return moderatePost(request,env,s);
    if(url.pathname==='/api/mod/report'&&request.method==='POST')return moderateReport(request,env,s);
    if(url.pathname==='/api/mod/sanction'&&request.method==='POST')return sanction(request,env,s);
    if(url.pathname==='/api/mod/role'&&request.method==='POST')return setRole(request,env,s);
    return reply({error:'Ruta de moderación no encontrada.'},404,s.refreshed);
  }catch(error){
    console.error('A90 moderation error',error?.message||error);
    return reply({error:'No se pudo completar la acción de moderación.'},500);
  }
}

function parseCookies(request){const out={};for(const part of (request.headers.get('Cookie')||'').split(';')){const i=part.indexOf('=');if(i<0)continue;const k=part.slice(0,i).trim();if(!k)continue;try{out[k]=decodeURIComponent(part.slice(i+1).trim())}catch{out[k]=part.slice(i+1).trim()}}return out}
function cookie(name,value,maxAge){return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`}
function headers(refreshed){const h=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});if(refreshed?.access_token)h.append('Set-Cookie',cookie(ACCESS_COOKIE,refreshed.access_token,Math.max(60,Number(refreshed.expires_in)||ACCESS_MAX_AGE)));if(refreshed?.refresh_token)h.append('Set-Cookie',cookie(REFRESH_COOKIE,refreshed.refresh_token,REFRESH_MAX_AGE));return h}
function reply(data,status=200,refreshed=null){return new Response(JSON.stringify(data),{status,headers:headers(refreshed)})}
function dbHeaders(env,access){const key=env.SUPABASE_PUBLISHABLE_KEY;return {'apikey':key,'Authorization':`Bearer ${access||key}`,'Content-Type':'application/json','Accept':'application/json'}}
async function db(env,path,access,options={}){const res=await fetch(env.SUPABASE_URL+path,{...options,headers:{...dbHeaders(env,access),...(options.headers||{})}});const text=await res.text();let body=null;if(text){try{body=JSON.parse(text)}catch{body=text}}return {res,body}}
async function getUser(env,access){if(!access)return null;const r=await db(env,'/auth/v1/user',access);return r.res.ok?r.body:null}
async function refresh(env,token){if(!token)return null;const r=await db(env,'/auth/v1/token?grant_type=refresh_token',null,{method:'POST',body:JSON.stringify({refresh_token:token})});return r.res.ok?r.body:null}
async function session(request,env){const c=parseCookies(request);let access=c[ACCESS_COOKIE]||'',refreshToken=c[REFRESH_COOKIE]||'',user=await getUser(env,access),refreshed=null;if(!user&&refreshToken){refreshed=await refresh(env,refreshToken);if(refreshed?.access_token){access=refreshed.access_token;user=await getUser(env,access)}}return {access,user,refreshed}}
async function roleOf(env,access,userId){const r=await db(env,`/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`,access);return r.res.ok&&Array.isArray(r.body)&&r.body[0]?.role?r.body[0].role:'user'}
async function requireRole(request,env,required){const s=await session(request,env);if(!s.user)return {error:reply({error:'Inicia sesión.'},401,s.refreshed)};s.role=await roleOf(env,s.access,s.user.id);if((ROLES[s.role]||0)<(ROLES[required]||0))return {error:reply({error:'No tienes permisos para esta acción.'},403,s.refreshed)};return s}
async function readJson(request){const len=Number(request.headers.get('Content-Length')||0);if(len>32768)throw new Error('request too large');if(!(request.headers.get('Content-Type')||'').toLowerCase().includes('application/json'))throw new Error('invalid content type');return request.json()}
function id(value){const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:null}
function uuid(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?value:null}
function clean(value,max){return typeof value==='string'?value.trim().replace(/\u0000/g,'').slice(0,max):''}
function encodeIlike(value){return encodeURIComponent(`*${value.replace(/[%*,()]/g,'')}*`)}
async function logAction(env,s,action,targetType,targetId,details={}){await db(env,'/rest/v1/forum_moderation_log',s.access,{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_user_id:s.user.id,action,target_type:targetType,target_id:String(targetId),details})})}

async function listReports(env,s,url){const status=String(url.searchParams.get('status')||'open');const allowed=new Set(['open','reviewing','resolved','dismissed','all']);if(!allowed.has(status))return reply({error:'Estado no válido.'},400,s.refreshed);const filter=status==='all'?'':`&status=eq.${status}`;const r=await db(env,`/rest/v1/forum_reports?select=id,reporter_id,topic_id,post_id,reason,status,handled_by,handled_at,created_at${filter}&order=created_at.desc&limit=100`,s.access);if(!r.res.ok)return reply({error:'No se pudieron cargar los reportes.'},502,s.refreshed);return reply({reports:Array.isArray(r.body)?r.body:[]},200,s.refreshed)}

async function listUsers(env,s,url){if((ROLES[s.role]||0)<ROLES.admin)return reply({error:'Se requiere nivel Admin.'},403,s.refreshed);const q=clean(url.searchParams.get('q')||'',32);if(q.length<2)return reply({users:[]},200,s.refreshed);const p=await db(env,`/rest/v1/profiles?or=(username.ilike.${encodeIlike(q)},display_name.ilike.${encodeIlike(q)})&select=id,username,display_name,avatar_url&limit=20`,s.access);if(!p.res.ok)return reply({error:'No se pudieron buscar usuarios.'},502,s.refreshed);const rows=Array.isArray(p.body)?p.body:[];const ids=rows.map(x=>x.id);let roles=[];if(ids.length){const r=await db(env,`/rest/v1/user_roles?user_id=in.(${ids.join(',')})&select=user_id,role`,s.access);if(r.res.ok&&Array.isArray(r.body))roles=r.body}const map=Object.fromEntries(roles.map(x=>[x.user_id,x.role]));return reply({users:rows.map(x=>({...x,role:map[x.id]||'user'}))},200,s.refreshed)}

async function moderateTopic(request,env,s){let d;try{d=await readJson(request)}catch{return reply({error:'Datos no válidos.'},400,s.refreshed)}const topicId=id(d?.id),action=String(d?.action||'');const patches={pin:{is_pinned:true},unpin:{is_pinned:false},lock:{is_locked:true},unlock:{is_locked:false},hide:{is_hidden:true},unhide:{is_hidden:false}};const patch=patches[action];if(!topicId||!patch)return reply({error:'Acción no válida.'},400,s.refreshed);const r=await db(env,`/rest/v1/forum_topics?id=eq.${topicId}`,s.access,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});if(!r.res.ok)return reply({error:'No se pudo moderar el tema.'},403,s.refreshed);await logAction(env,s,`topic_${action}`,'topic',topicId);return reply({ok:true},200,s.refreshed)}

async function moderatePost(request,env,s){let d;try{d=await readJson(request)}catch{return reply({error:'Datos no válidos.'},400,s.refreshed)}const postId=id(d?.id),action=String(d?.action||'');const patches={hide:{is_hidden:true},unhide:{is_hidden:false}};const patch=patches[action];if(!postId||!patch)return reply({error:'Acción no válida.'},400,s.refreshed);const r=await db(env,`/rest/v1/forum_posts?id=eq.${postId}`,s.access,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});if(!r.res.ok)return reply({error:'No se pudo moderar el mensaje.'},403,s.refreshed);await logAction(env,s,`post_${action}`,'post',postId);return reply({ok:true},200,s.refreshed)}

async function moderateReport(request,env,s){let d;try{d=await readJson(request)}catch{return reply({error:'Datos no válidos.'},400,s.refreshed)}const reportId=id(d?.id),status=String(d?.status||'');if(!reportId||!['reviewing','resolved','dismissed'].includes(status))return reply({error:'Estado no válido.'},400,s.refreshed);const r=await db(env,`/rest/v1/forum_reports?id=eq.${reportId}`,s.access,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status})});if(!r.res.ok)return reply({error:'No se pudo actualizar el reporte.'},403,s.refreshed);await logAction(env,s,`report_${status}`,'report',reportId);return reply({ok:true},200,s.refreshed)}

async function sanction(request,env,s){let d;try{d=await readJson(request)}catch{return reply({error:'Datos no válidos.'},400,s.refreshed)}const userId=uuid(d?.user_id),kind=String(d?.kind||''),reason=clean(d?.reason,1000);let endsAt=null;if(d?.ends_at){const dt=new Date(d.ends_at);if(Number.isNaN(dt.valueOf())||dt<=new Date())return reply({error:'La fecha final no es válida.'},400,s.refreshed);endsAt=dt.toISOString()}if(!userId||!['warning','mute','ban'].includes(kind)||reason.length<3)return reply({error:'Datos de sanción no válidos.'},400,s.refreshed);const row={user_id:userId,kind,reason,issued_by:s.user.id};if(endsAt)row.ends_at=endsAt;const r=await db(env,'/rest/v1/forum_sanctions',s.access,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});if(!r.res.ok)return reply({error:'No puedes aplicar esa sanción.'},403,s.refreshed);await logAction(env,s,`sanction_${kind}`,'user',userId,{ends_at:endsAt});return reply({ok:true,sanction:Array.isArray(r.body)?r.body[0]||null:null},201,s.refreshed)}

async function setRole(request,env,s){let d;try{d=await readJson(request)}catch{return reply({error:'Datos no válidos.'},400,s.refreshed)}const userId=uuid(d?.user_id),role=String(d?.role||'');if(!userId||!Object.hasOwn(ROLES,role))return reply({error:'Usuario o nivel no válido.'},400,s.refreshed);const r=await db(env,'/rest/v1/rpc/set_user_role',s.access,{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({p_target_user_id:userId,p_new_role:role})});if(!r.res.ok){const raw=String(r.body?.message||r.body||'').toLowerCase();const msg=raw.includes('own role')?'No puedes cambiar tu propio nivel.':raw.includes('insufficient')||raw.includes('admins may')?'No tienes permisos para asignar ese nivel.':'No se pudo cambiar el nivel.';return reply({error:msg},403,s.refreshed)}return reply({ok:true},200,s.refreshed)}
