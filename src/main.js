import authWorker from './index.js';
import {handleForumApi} from './forum-api.js';
import {handleModApi} from './mod-api-secure.js';
import {handleExtraAuth} from './oauth-extra.js';
import {handleHealth} from './health.js';
import {handleSecurityAuth} from './security-auth-api.js';

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);

    if(url.pathname==='/assets/auth.js'){
      const original=await env.ASSETS.fetch(request);
      if(!original.ok)return original;
      const text=await original.text();
      const headers=new Headers(original.headers);
      headers.set('Content-Type','application/javascript; charset=utf-8');
      headers.set('Cache-Control','no-cache, no-store, must-revalidate');
      const inlineMfa=`\n;(function(){const __name=(fn)=>fn;(${mfaClientBootstrap.toString()})();})();\n`;
      return new Response(text+inlineMfa+"\n;import('/assets/security-auth.js');\n",{status:original.status,headers});
    }

    const health=await handleHealth(request,env,url);
    if(health)return hardenApi(health);

    const secureAuth=await handleSecurityAuth(request,env,url,authWorker);
    if(secureAuth)return hardenApi(secureAuth);

    const extraAuth=await handleExtraAuth(request,env,url);
    if(extraAuth)return hardenApi(extraAuth);

    if(url.pathname.startsWith('/api/mod/')){
      if(!['GET','POST'].includes(request.method)) return hardenApi(json({error:'Método no permitido.'},405));
      if(request.method==='POST'&&!sameOrigin(request,url)) return hardenApi(json({error:'Solicitud rechazada.'},403));
      return hardenApi(await handleModApi(request,env,url));
    }
    if(url.pathname.startsWith('/api/forum/')){
      if(!['GET','POST'].includes(request.method)) return hardenApi(json({error:'Método no permitido.'},405));
      if(request.method==='POST'&&!sameOrigin(request,url)) return hardenApi(json({error:'Solicitud rechazada.'},403));
      return hardenApi(await handleForumApi(request,env,url));
    }

    const response=await authWorker.fetch(request,env,ctx);
    if(url.pathname.startsWith('/api/'))return hardenApi(response);
    return hardenStatic(response);
  }
};

function mfaClientBootstrap(){
  const q=(s,r=document)=>r.querySelector(s);
  let mounting=false;
  let factorId='';
  async function api(path,{method='GET',body}={}){
    const res=await fetch(path,{method,credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data?.error||'No se pudo completar la operación.');
    return data;
  }
  function msg(text,type=''){
    const el=q('#a90-auth-message');
    if(!el)return;
    el.textContent=text||'';
    el.className='a90-auth-message'+(type?' '+type:'');
  }
  async function verify(id,code){
    if(!id||!/^[0-9]{6,10}$/.test(code)){msg('Introduce un código MFA válido.','error');return;}
    msg('Verificando MFA…');
    try{
      await api('/api/auth/mfa/verify',{method:'POST',body:{factor_id:id,code}});
      location.reload();
    }catch(e){msg(e.message,'error');}
  }
  function render(card,status){
    if(q('#a90-security-mfa-card'))return;
    const m=status.mfa||{};
    const wrap=document.createElement('div');
    wrap.id='a90-security-mfa-card';
    wrap.style.cssText='margin:14px 0;padding:14px;border:1px solid rgba(74,222,255,.28);border-radius:12px;background:rgba(7,31,43,.78);display:grid;gap:10px';
    if(m.verified&&m.current_level==='aal2'){
      wrap.innerHTML='<strong>Seguridad del Super Admin</strong><p style="margin:0">MFA activo · sesión verificada (AAL2).</p><span>✓ Protegido</span>';
    }else if(m.verified){
      const f=(m.factors||[]).find(x=>x.factor_type==='totp'&&x.status==='verified');
      wrap.innerHTML='<strong>Seguridad del Super Admin</strong><p style="margin:0">MFA activo · introduce el código para desbloquear la moderación.</p><label>Código de la app<input id="a90-inline-mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10"></label><button id="a90-inline-mfa-verify" class="a90-auth-primary" type="button">Verificar MFA</button>';
      q('#a90-inline-mfa-verify',wrap)?.addEventListener('click',()=>verify(f?.id||'',q('#a90-inline-mfa-code',wrap)?.value.trim()||''));
    }else{
      wrap.innerHTML='<strong>Seguridad del Super Admin</strong><p style="margin:0">MFA obligatorio · todavía no está activado.</p><div id="a90-inline-mfa-actions"><button id="a90-inline-mfa-start" class="a90-auth-primary" type="button">Activar MFA</button></div>';
      q('#a90-inline-mfa-start',wrap)?.addEventListener('click',async()=>{
        msg('Preparando MFA…');
        try{
          const d=await api('/api/auth/mfa/enroll',{method:'POST',body:{}});
          factorId=d.factor_id||'';
          const actions=q('#a90-inline-mfa-actions',wrap);
          if(!actions)return;
          actions.innerHTML='<div style="display:grid;gap:10px"><img id="a90-inline-mfa-qr" alt="QR para configurar MFA" style="width:180px;max-width:100%;background:#fff;padding:8px;border-radius:10px"><p style="margin:0">Escanea el QR con tu app Authenticator.</p><label>Código de la app<input id="a90-inline-mfa-enroll-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10"></label><button id="a90-inline-mfa-enroll-verify" class="a90-auth-primary" type="button">Verificar y activar</button></div>';
          q('#a90-inline-mfa-qr',wrap).src=d.qr_code||'';
          q('#a90-inline-mfa-enroll-verify',wrap)?.addEventListener('click',()=>verify(factorId,q('#a90-inline-mfa-enroll-code',wrap)?.value.trim()||''));
          msg('Escanea el QR e introduce el código generado.','ok');
        }catch(e){msg(e.message,'error');}
      });
    }
    const field=card.querySelector('.a90-profile-field');
    card.insertBefore(wrap,field||card.lastChild);
  }
  async function mount(){
    if(mounting||q('#a90-security-mfa-card'))return;
    const card=q('.a90-profile-card');
    if(!card)return;
    mounting=true;
    try{
      const status=await api('/api/auth/mfa/status');
      if(status.role==='super_admin')render(card,status);
    }catch(e){
      console.warn('MFA UI:',e);
    }finally{mounting=false;}
  }
  function schedule(){[0,80,250,700].forEach(ms=>setTimeout(()=>void mount(),ms));}
  document.addEventListener('click',schedule,true);
  new MutationObserver(()=>{if(q('.a90-profile-card'))schedule();}).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
}

function sameOrigin(request,url){const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return false;const site=request.headers.get('Sec-Fetch-Site');return !site||site==='same-origin'||site==='same-site'||site==='none'}
function baseSecurityHeaders(headers){headers.set('X-Content-Type-Options','nosniff');headers.set('X-Frame-Options','DENY');headers.set('Referrer-Policy','no-referrer');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');headers.set('X-Permitted-Cross-Domain-Policies','none');return headers}
function hardenApi(response){const headers=baseSecurityHeaders(new Headers(response.headers));headers.set('Cross-Origin-Resource-Policy','same-origin');if(!headers.has('Cache-Control'))headers.set('Cache-Control','private, no-store');return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
function hardenStatic(response){const headers=baseSecurityHeaders(new Headers(response.headers));headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('Cross-Origin-Opener-Policy','same-origin');headers.set('Cross-Origin-Resource-Policy','same-origin');headers.set('Origin-Agent-Cluster','?1');headers.set('X-DNS-Prefetch-Control','off');headers.set('Content-Security-Policy',"default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com; media-src 'self'; frame-src https://challenges.cloudflare.com; worker-src 'self'; manifest-src 'self'; upgrade-insecure-requests");return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
function json(data,status){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}