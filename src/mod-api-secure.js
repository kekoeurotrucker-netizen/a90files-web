import {handleModApi as baseHandleModApi} from './mod-api.js';

const ACCESS_COOKIE='a90_access';

export async function handleModApi(request,env,url){
  const gate=await superAdminMfaGate(request,env);
  if(gate)return gate;
  return baseHandleModApi(request,env,url);
}

async function superAdminMfaGate(request,env){
  const access=parseCookies(request)[ACCESS_COOKIE]||'';
  if(!access)return null;
  const user=await authUser(env,access);
  if(!user)return json({error:'La sesión ha caducado. Recarga la página e inténtalo de nuevo.',code:'session_expired'},401);
  const role=await roleOf(env,access,user.id);
  if(role==='super_admin'&&jwtAal(access)!=='aal2')return json({error:'El Super Admin debe verificar MFA antes de usar la moderación.',code:'mfa_required'},403);
  return null;
}
function parseCookies(request){const out={};for(const part of (request.headers.get('Cookie')||'').split(';')){const i=part.indexOf('=');if(i<0)continue;const key=part.slice(0,i).trim();if(!key)continue;try{out[key]=decodeURIComponent(part.slice(i+1).trim())}catch{out[key]=part.slice(i+1).trim()}}return out}
function headers(env,access){return {'apikey':env.SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${access}`,'Content-Type':'application/json','Accept':'application/json'}}
async function authUser(env,access){try{const r=await fetch(env.SUPABASE_URL+'/auth/v1/user',{headers:headers(env,access)});return r.ok?await r.json():null}catch{return null}}
async function roleOf(env,access,userId){try{const r=await fetch(env.SUPABASE_URL+`/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`,{headers:headers(env,access)});if(!r.ok)return 'user';const body=await r.json();return Array.isArray(body)&&body[0]?.role?body[0].role:'user'}catch{return 'user'}}
function jwtAal(token){try{const raw=String(token).split('.')[1]||'';const normalized=raw.replace(/-/g,'+').replace(/_/g,'/');const padded=normalized+'='.repeat((4-normalized.length%4)%4);return JSON.parse(atob(padded))?.aal==='aal2'?'aal2':'aal1'}catch{return 'aal1'}}
function json(data,status){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}
