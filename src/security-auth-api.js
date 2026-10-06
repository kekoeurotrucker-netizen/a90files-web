const ACCESS_COOKIE='a90_access';
const REFRESH_COOKIE='a90_refresh';
const ACCESS_MAX_AGE=60*60;
const REFRESH_MAX_AGE=60*60*24*30;

export async function handleSecurityAuth(request,env,url,authWorker){
  if(request.method==='POST'&&(url.pathname==='/api/auth/login'||url.pathname==='/api/auth/signup')){
    if(!sameOrigin(request,url))return json({error:'Solicitud rechazada.'},403);
    let data;try{data=await request.clone().json()}catch{return json({error:'Datos no válidos.'},400)}
    const expected=url.pathname.endsWith('/signup')?'signup':'login';
    const token=data?.turnstile_token;
    const turnstileRequired=String(env.TURNSTILE_REQUIRED||'false').toLowerCase()==='true';
    if(!turnstileRequired)return authWorker.fetch(request,env);
    if(!validTurnstileToken(token))return json({error:'Completa la verificación anti-bot.'},400);

    if(String(env.SUPABASE_NATIVE_CAPTCHA||'false').toLowerCase()==='true'){
      return nativeEmailAuth(env,url,data,expected,token);
    }

    const check=await verifyTurnstile(request,env,url,token,expected);
    if(check)return check;
    return authWorker.fetch(request,env);
  }
  if(url.pathname==='/api/auth/email/verify'&&request.method==='POST'){
    if(!sameOrigin(request,url))return json({error:'Solicitud rechazada.'},403);
    return verifyEmailCode(request,env);
  }
  if(url.pathname==='/api/auth/email/resend'&&request.method==='POST'){
    if(!sameOrigin(request,url))return json({error:'Solicitud rechazada.'},403);
    return resendEmailCode(request,env,url);
  }
  if(url.pathname==='/api/auth/avatar'&&request.method==='POST'){
    if(!sameOrigin(request,url))return json({error:'Solicitud rechazada.'},403);
    return uploadAvatar(request,env);
  }
  if(url.pathname==='/api/auth/avatar/remove'&&request.method==='POST'){
    if(!sameOrigin(request,url))return json({error:'Solicitud rechazada.'},403);
    return removeAvatar(request,env);
  }
  if(url.pathname==='/api/auth/mfa/status'&&request.method==='GET')return mfaStatus(request,env);
  if(url.pathname==='/api/auth/mfa/enroll'&&request.method==='POST'){
    if(!sameOrigin(request,url))return json({error:'Solicitud rechazada.'},403);
    return mfaEnroll(request,env);
  }
  if(url.pathname==='/api/auth/mfa/verify'&&request.method==='POST'){
    if(!sameOrigin(request,url))return json({error:'Solicitud rechazada.'},403);
    return mfaVerify(request,env);
  }
  return null;
}

function sameOrigin(request,url){const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return false;const site=request.headers.get('Sec-Fetch-Site');return !site||site==='same-origin'||site==='same-site'||site==='none'}
function validTurnstileToken(token){return typeof token==='string'&&token.length>=10&&token.length<=4096}

async function verifyTurnstile(request,env,url,token,action){
  if(!env.TURNSTILE_SECRET)return json({error:'Verificación anti-bot temporalmente no disponible.'},503);
  const form=new FormData();
  form.set('secret',env.TURNSTILE_SECRET);form.set('response',token);form.set('idempotency_key',crypto.randomUUID());
  const ip=request.headers.get('CF-Connecting-IP');if(ip)form.set('remoteip',ip);
  let res,body;try{res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form});body=await res.json()}catch{return json({error:'No se pudo validar la verificación anti-bot.'},503)}
  if(!res.ok||!body?.success)return json({error:'Verificación anti-bot rechazada. Inténtalo de nuevo.'},403);
  if(body.hostname!==url.hostname||body.action!==action)return json({error:'Verificación anti-bot no válida.'},403);
  return null;
}

async function nativeEmailAuth(env,url,data,mode,token){
  const email=String(data?.email||'').trim().toLowerCase();
  const password=data?.password;
  if(!validEmail(email)||!validPassword(password))return json({error:mode==='signup'?'Usa un correo válido y una contraseña de entre 10 y 128 caracteres.':'Introduce un correo válido y una contraseña de al menos 10 caracteres.'},400);
  const security={captcha_token:token};
  if(mode==='login'){
    const r=await supabase(env,'/auth/v1/token?grant_type=password',null,{method:'POST',body:JSON.stringify({email,password,gotrue_meta_security:security})});
    if(!r.res.ok)return json({error:authError(r.body,r.res.status)},r.res.status===400?401:r.res.status);
    return new Response(JSON.stringify({ok:true}),{status:200,headers:tokenHeaders(r.body)});
  }
  const displayName=cleanName(data?.display_name)||'Usuario';
  const path='/auth/v1/signup?redirect_to='+encodeURIComponent(`${url.origin}/`);
  const r=await supabase(env,path,null,{method:'POST',body:JSON.stringify({email,password,data:{full_name:displayName},gotrue_meta_security:security})});
  if(!r.res.ok)return json({error:authError(r.body,r.res.status)},r.res.status);
  if(r.body?.access_token)return new Response(JSON.stringify({ok:true,requires_confirmation:false}),{status:200,headers:tokenHeaders(r.body)});
  return json({ok:true,requires_confirmation:true,confirmation_method:String(env.EMAIL_OTP_ENABLED||'false').toLowerCase()==='true'?'otp':'link'},200);
}

function authError(body,status){const raw=String(body?.msg||body?.message||body?.error_description||body?.error||'').toLowerCase();if(status===429)return 'Demasiados intentos. Espera un poco y vuelve a probar.';if(raw.includes('captcha'))return 'La verificación anti-bot ha caducado o no es válida.';if(raw.includes('invalid login credentials'))return 'Correo o contraseña incorrectos.';if(raw.includes('email not confirmed'))return 'Confirma primero el correo.';if(raw.includes('already registered')||raw.includes('user already registered'))return 'Ese correo ya tiene una cuenta.';if(raw.includes('password'))return 'La contraseña no cumple los requisitos de seguridad.';return 'No se pudo completar la autenticación.'}
function validEmail(v){return typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function validPassword(v){return typeof v==='string'&&v.length>=10&&v.length<=128}
function cleanName(v){return typeof v==='string'?v.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,80):''}


async function verifyEmailCode(request,env){
  let data;try{data=await request.json()}catch{return json({error:'Datos de verificación no válidos.'},400)}
  const email=String(data?.email||'').trim().toLowerCase();
  const token=String(data?.token||'').replace(/\D/g,'');
  if(!validEmail(email)||!/^[0-9]{6}$/.test(token))return json({error:'Introduce el código de 6 dígitos enviado a tu correo.'},400);
  const r=await supabase(env,'/auth/v1/verify',null,{method:'POST',body:JSON.stringify({email,token,type:'email'})});
  if(!r.res.ok)return json({error:emailVerifyError(r.body,r.res.status)},r.res.status===400?401:r.res.status);
  if(!r.body?.access_token)return json({error:'El correo se verificó, pero no se pudo iniciar la sesión. Prueba a entrar con tu contraseña.'},502);
  return new Response(JSON.stringify({ok:true,verified:true}),{status:200,headers:tokenHeaders(r.body)});
}

async function resendEmailCode(request,env,url){
  let data;try{data=await request.json()}catch{return json({error:'Datos no válidos.'},400)}
  const email=String(data?.email||'').trim().toLowerCase();
  const token=String(data?.turnstile_token||'');
  if(!validEmail(email))return json({error:'Introduce un correo válido.'},400);
  const turnstileRequired=String(env.TURNSTILE_REQUIRED||'false').toLowerCase()==='true';
  if(turnstileRequired){
    if(!validTurnstileToken(token))return json({error:'Completa la verificación anti-bot para reenviar el código.'},400);
    const check=await verifyTurnstile(request,env,url,token,'resend');
    if(check)return check;
  }
  const r=await supabase(env,'/auth/v1/resend',null,{method:'POST',body:JSON.stringify({type:'signup',email})});
  if(!r.res.ok)return json({error:authError(r.body,r.res.status)},r.res.status);
  return json({ok:true},200);
}

function emailVerifyError(body,status){
  const raw=String(body?.msg||body?.message||body?.error_description||body?.error||'').toLowerCase();
  if(status===429)return 'Demasiados intentos. Espera un poco y vuelve a probar.';
  if(raw.includes('expired')||raw.includes('invalid')||raw.includes('token'))return 'El código es incorrecto o ha caducado. Pide uno nuevo.';
  return 'No se pudo verificar el código.';
}

async function uploadAvatar(request,env){
  const s=await session(request,env);
  if(!s.user)return json({error:'Inicia sesión primero.'},401);
  const len=Number(request.headers.get('Content-Length')||0);
  if(len>3670016)return json({error:'La foto es demasiado grande. Máximo 3 MB.'},413);
  let form;try{form=await request.formData()}catch{return json({error:'No se pudo leer la imagen.'},400)}
  const file=form.get('avatar');
  if(!file||typeof file.arrayBuffer!=='function')return json({error:'Selecciona una imagen.'},400);
  const allowed=new Set(['image/jpeg','image/png','image/webp','image/gif']);
  if(!allowed.has(String(file.type||'').toLowerCase()))return json({error:'Usa JPG, PNG, WEBP o GIF.'},400);
  if(!file.size||file.size>3145728)return json({error:'La foto debe ocupar como máximo 3 MB.'},400);
  const objectPath=`${s.user.id}/avatar`;
  let up;
  try{
    up=await fetch(`${env.SUPABASE_URL}/storage/v1/object/a90-avatars/${objectPath}`,{
      method:'POST',
      headers:{'apikey':env.SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${s.access}`,'Content-Type':file.type,'x-upsert':'true','Cache-Control':'3600'},
      body:file
    });
  }catch{return json({error:'No se pudo subir la foto.'},503)}
  if(!up.ok){const detail=await up.text().catch(()=> '');console.error('avatar upload failed',up.status,detail.slice(0,300));return json({error:'No se pudo guardar la foto de perfil.'},502)}
  const avatarUrl=`${env.SUPABASE_URL}/storage/v1/object/public/a90-avatars/${objectPath}?v=${Date.now()}`;
  const patch=await supabase(env,`/rest/v1/profiles?id=eq.${encodeURIComponent(s.user.id)}`,s.access,{method:'PATCH',headers:{'Prefer':'return=minimal'},body:JSON.stringify({avatar_url:avatarUrl})});
  if(!patch.res.ok)return json({error:'La imagen se subió, pero no se pudo actualizar el perfil.'},502);
  return json({ok:true,avatar_url:avatarUrl},200);
}

async function removeAvatar(request,env){
  const s=await session(request,env);
  if(!s.user)return json({error:'Inicia sesión primero.'},401);
  const objectPath=`${s.user.id}/avatar`;
  try{await fetch(`${env.SUPABASE_URL}/storage/v1/object/a90-avatars/${objectPath}`,{method:'DELETE',headers:{'apikey':env.SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${s.access}`}})}catch{}
  const patch=await supabase(env,`/rest/v1/profiles?id=eq.${encodeURIComponent(s.user.id)}`,s.access,{method:'PATCH',headers:{'Prefer':'return=minimal'},body:JSON.stringify({avatar_url:null})});
  if(!patch.res.ok)return json({error:'No se pudo quitar la foto del perfil.'},502);
  return json({ok:true},200);
}

async function mfaStatus(request,env){
  const s=await session(request,env);if(!s.user)return json({error:'Inicia sesión primero.'},401);
  const role=await roleOf(env,s.access,s.user.id),factors=await listFactors(env,s.access,s.user);
  return json({ok:true,role,mfa:mfaPayload(s,role,factors)});
}
async function mfaEnroll(request,env){
  const s=await requireSuperAdmin(request,env);if(s.error)return s.error;
  const factors=await listFactors(env,s.access,s.user);if(factors.some(f=>f.factor_type==='totp'&&f.status==='verified'))return json({error:'El MFA ya está activado.'},409);
  for(const f of factors.filter(f=>f.factor_type==='totp'&&f.status!=='verified'))await supabase(env,`/auth/v1/factors/${encodeURIComponent(f.id)}`,s.access,{method:'DELETE'});
  const r=await supabase(env,'/auth/v1/factors',s.access,{method:'POST',body:JSON.stringify({factor_type:'totp',friendly_name:'A90 Super Admin'})});
  if(!r.res.ok||!r.body?.id||!r.body?.totp)return json({error:'No se pudo iniciar la activación MFA.'},r.res.status||502);
  return json({ok:true,factor_id:r.body.id,qr_code:r.body.totp.qr_code,secret:r.body.totp.secret,uri:r.body.totp.uri});
}
async function mfaVerify(request,env){
  const s=await requireSuperAdmin(request,env);if(s.error)return s.error;
  let data;try{data=await request.json()}catch{return json({error:'Datos MFA no válidos.'},400)}
  const factorId=String(data?.factor_id||''),code=String(data?.code||'').trim();
  if(!uuid(factorId)||!/^[0-9]{6,10}$/.test(code))return json({error:'Código MFA no válido.'},400);
  const factors=await listFactors(env,s.access,s.user),factor=factors.find(f=>f.id===factorId&&f.factor_type==='totp');if(!factor)return json({error:'Factor MFA no válido.'},400);
  const ch=await supabase(env,`/auth/v1/factors/${encodeURIComponent(factorId)}/challenge`,s.access,{method:'POST',body:'{}'});
  if(!ch.res.ok||!ch.body?.id)return json({error:'No se pudo iniciar el desafío MFA.'},ch.res.status||502);
  const vr=await supabase(env,`/auth/v1/factors/${encodeURIComponent(factorId)}/verify`,s.access,{method:'POST',body:JSON.stringify({challenge_id:ch.body.id,code})});
  if(!vr.res.ok||!vr.body?.access_token)return json({error:'Código MFA incorrecto o caducado.'},vr.res.status===400?401:vr.res.status);
  return new Response(JSON.stringify({ok:true}),{status:200,headers:tokenHeaders(vr.body)});
}

async function requireSuperAdmin(request,env){const s=await session(request,env);if(!s.user)return {error:json({error:'Inicia sesión primero.'},401)};const role=await roleOf(env,s.access,s.user.id);if(role!=='super_admin')return {error:json({error:'Acceso reservado al Super Admin.'},403)};return s}
async function session(request,env){const access=parseCookies(request)[ACCESS_COOKIE]||'';if(!access)return {access:'',user:null};return {access,user:await authUser(env,access)}}
async function authUser(env,access){const r=await supabase(env,'/auth/v1/user',access);return r.res.ok?r.body:null}
async function roleOf(env,access,id){const r=await supabase(env,`/rest/v1/user_roles?user_id=eq.${encodeURIComponent(id)}&select=role&limit=1`,access);return r.res.ok&&Array.isArray(r.body)&&r.body[0]?.role?r.body[0].role:'user'}
function mfaPayload(s,role,factors){const f=factors||[];return {required:role==='super_admin',current_level:aal(s.access),verified:f.some(x=>x.factor_type==='totp'&&x.status==='verified'),factors:f}}
async function listFactors(env,access,user){const r=await supabase(env,'/auth/v1/factors',access);if(r.res.ok){const b=r.body||{};let raw=[];if(Array.isArray(b))raw=b;else if(Array.isArray(b.all))raw=b.all;else raw=[...(Array.isArray(b.totp)?b.totp:[]),...(Array.isArray(b.phone)?b.phone:[])];const out=normalizeFactors(raw);if(out.length||raw.length===0)return out}return normalizeFactors(Array.isArray(user?.factors)?user.factors:[])}
function normalizeFactors(raw){return raw.map(f=>({id:String(f.id||''),status:String(f.status||''),factor_type:String(f.factor_type||f.factorType||f.type||'').toLowerCase(),friendly_name:String(f.friendly_name||f.friendlyName||'')})).filter(f=>uuid(f.id))}
function aal(token){try{const p=String(token).split('.')[1]||'',n=p.replace(/-/g,'+').replace(/_/g,'/'),v=JSON.parse(atob(n+'='.repeat((4-n.length%4)%4)));return v?.aal==='aal2'?'aal2':'aal1'}catch{return 'aal1'}}
function uuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''))}
function parseCookies(request){const out={};for(const part of (request.headers.get('Cookie')||'').split(';')){const i=part.indexOf('=');if(i<0)continue;const k=part.slice(0,i).trim();if(!k)continue;try{out[k]=decodeURIComponent(part.slice(i+1).trim())}catch{out[k]=part.slice(i+1).trim()}}return out}
function sbHeaders(env,access){const key=env.SUPABASE_PUBLISHABLE_KEY;return {'apikey':key,'Authorization':`Bearer ${access||key}`,'Content-Type':'application/json','Accept':'application/json'}}
async function supabase(env,path,access,options={}){const res=await fetch(env.SUPABASE_URL+path,{...options,headers:{...sbHeaders(env,access),...(options.headers||{})}});const text=await res.text();let body=null;if(text){try{body=JSON.parse(text)}catch{body=text}}return {res,body}}
function tokenHeaders(tokens){const h=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});if(tokens?.access_token)h.append('Set-Cookie',`a90_access=${encodeURIComponent(tokens.access_token)}; Path=/; Max-Age=${Math.max(60,Number(tokens.expires_in)||ACCESS_MAX_AGE)}; HttpOnly; Secure; SameSite=Lax`);if(tokens?.refresh_token)h.append('Set-Cookie',`a90_refresh=${encodeURIComponent(tokens.refresh_token)}; Path=/; Max-Age=${REFRESH_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`);return h}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}
