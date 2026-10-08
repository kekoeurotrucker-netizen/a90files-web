(()=>{
'use strict';
let state={user:null,profile:null,role:'user'};
let providerState={loaded:false,available:false,providers:{github:false,google:false,discord:false,facebook:false,x:false}};
let mfaState=null;
let pendingMfaFactor='';
let notificationState={unread:0,notifications:[]};
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const PROVIDER_NAMES={github:'GitHub',google:'Google',discord:'Discord',facebook:'Facebook',x:'X'};

async function api(path,{method='GET',body}={}){
 const res=await fetch(path,{method,credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok) throw new Error(data?.error||'No se pudo completar la operación.');
 return data;
}

async function refreshProviders(){
 try{const d=await api('/api/auth/providers');providerState={loaded:true,available:!!d.available,providers:{...providerState.providers,...(d.providers||{})}}}
 catch{providerState={...providerState,loaded:true,available:false}}
 renderProviders();return providerState;
}

async function loadIdentity(){
 try{const d=await api('/api/auth/session');if(d.authenticated){state.user=d.user;state.profile=d.profile;state.role=d.role||'user'}else state={user:null,profile:null,role:'user'}}
 catch{state={user:null,profile:null,role:'user'}}
 if(state.user)await loadNotifications();else notificationState={unread:0,notifications:[]};
 render();
 if(state.role==='super_admin')await refreshMfa();
}

async function loadNotifications(){
 if(!state.user){notificationState={unread:0,notifications:[]};return notificationState}
 try{
   const d=await api('/api/forum/notifications');
   notificationState={unread:Number(d.unread)||0,notifications:Array.isArray(d.notifications)?d.notifications:[]};
 }catch{notificationState={unread:0,notifications:[]}}
 return notificationState;
}

async function markNotificationRead(id=null,all=false){
 if(!state.user)return;
 try{
   await api('/api/forum/notifications/read',{method:'POST',body:all?{all:true}:{id}});
   await loadNotifications();render();
 }catch{}
}

function roleLabel(r){return({user:'Usuario',moderator:'Moderador',admin:'Admin',super_admin:'Super Admin'})[r]||'Usuario'}
function displayName(){return state.profile?.username||state.profile?.display_name||state.user?.network_name||'Cuenta A 90'}
function safeAvatarUrl(value){if(!value)return '';try{const u=new URL(String(value),location.origin);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
function paintAvatar(container,profile,label=''){if(!container)return;const url=safeAvatarUrl(profile?.avatar_url);container.querySelectorAll('img.a90-avatar-photo').forEach(n=>n.remove());const fallback=container.querySelector('.a90-account-monogram,span');if(fallback)fallback.style.display=url?'none':'';if(url){const img=document.createElement('img');img.className='a90-avatar-photo';img.src=url;img.alt=label||'Foto de perfil';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>{img.remove();if(fallback)fallback.style.display=''});container.prepend(img)}}
function msg(text,type=''){const e=$('#a90-auth-message');if(!e)return;e.textContent=text||'';e.className='a90-auth-message'+(type?' '+type:'')}

function injectModal(){
 if($('#a90-auth-backdrop'))return;
 const d=document.createElement('div');d.id='a90-auth-backdrop';d.className='a90-auth-backdrop';
 d.innerHTML=`<section class="a90-auth-modal" role="dialog" aria-modal="true" aria-labelledby="a90-auth-title">
  <div class="a90-auth-head"><div><small>CUENTA A 90</small><h2 id="a90-auth-title">Acceder</h2></div><button class="a90-auth-close" type="button" aria-label="Cerrar">×</button></div>
  <div id="a90-auth-guest">
   <div class="a90-auth-tabs"><button type="button" data-tab="login" class="active">Iniciar sesión</button><button type="button" data-tab="register">Crear cuenta</button></div>
   <div class="a90-social-grid provider-grid" aria-label="Inicio social"><button class="provider-item provider-google" type="button" data-oauth="google">Google</button><button class="provider-item provider-facebook" type="button" data-oauth="facebook">Facebook</button><button class="provider-item provider-x" type="button" data-oauth="x" aria-label="X"></button><button class="provider-item provider-discord" type="button" data-oauth="discord">Discord</button><button class="provider-item provider-github" type="button" data-oauth="github">GitHub</button><button class="provider-item provider-email" type="button" data-email-focus>Correo</button></div>
   <p class="a90-provider-note">Comprobando accesos sociales…</p><div class="a90-divider">con correo</div>
   <form id="a90-login-form" class="a90-auth-form"><label>Correo<input id="a90-email" type="email" autocomplete="email" maxlength="254" required></label><label>Contraseña<input id="a90-password" type="password" autocomplete="current-password" minlength="10" maxlength="128" required></label><button class="a90-auth-primary" type="submit">Entrar</button></form>
   <form id="a90-register-form" class="a90-auth-form a90-auth-hidden"><label>Correo<input id="a90-reg-email" type="email" autocomplete="email" maxlength="254" required></label><label>Nombre o alias público <span>(opcional)</span><input id="a90-reg-name" type="text" autocomplete="nickname" maxlength="80" placeholder="Lo que verán los demás"></label><label>Contraseña<input id="a90-reg-password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label><button class="a90-auth-primary" type="submit">Crear cuenta</button></form>
   <section id="a90-email-verify" class="a90-email-verify a90-auth-hidden" aria-labelledby="a90-email-verify-title"><div class="a90-verify-icon">✉</div><small>VERIFICA TU CORREO</small><h3 id="a90-email-verify-title">Introduce el código de 6 dígitos</h3><p>Te hemos enviado un código a <strong id="a90-email-verify-address"></strong>.</p><div id="a90-email-code-grid" class="a90-code-grid" role="group" aria-label="Código de verificación"><input inputmode="numeric" autocomplete="one-time-code" maxlength="1" aria-label="Dígito 1"><input inputmode="numeric" maxlength="1" aria-label="Dígito 2"><input inputmode="numeric" maxlength="1" aria-label="Dígito 3"><input inputmode="numeric" maxlength="1" aria-label="Dígito 4"><input inputmode="numeric" maxlength="1" aria-label="Dígito 5"><input inputmode="numeric" maxlength="1" aria-label="Dígito 6"></div><button id="a90-email-verify-btn" class="a90-auth-primary" type="button">Verificar y entrar</button><div id="a90-turnstile-resend" class="a90-turnstile a90-turnstile--compact" aria-label="Verificación anti-bot para reenviar"></div><div class="a90-verify-actions"><button id="a90-email-resend-btn" type="button">Reenviar código</button><button id="a90-email-change-btn" type="button">Cambiar correo</button></div></section>
  </div>
  <div id="a90-auth-user" class="a90-auth-hidden"><div class="a90-profile-card"><div class="a90-profile-summary"><div class="a90-avatar" id="a90-profile-avatar"><span>A90</span></div><div class="a90-profile-summary-copy"><strong id="a90-profile-name">Usuario</strong><small>Cuenta compartida web + foro</small><span id="a90-role" class="a90-role-badge">Usuario</span><div class="a90-avatar-actions"><label for="a90-avatar-file">Cambiar foto</label><input id="a90-avatar-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden><button id="a90-avatar-remove" type="button">Quitar</button></div></div></div><section class="a90-user-notifications"><header><div><small>NOTIFICACIONES</small><strong>Actividad del foro</strong></div><button id="a90-notifications-read-all" type="button">Marcar leídas</button></header><div id="a90-notifications-list" class="a90-notifications-list"></div></section><div id="a90-mfa-slot"></div><div class="a90-profile-field"><label>Alias público del foro<input id="a90-alias" type="text" minlength="3" maxlength="32" pattern="[A-Za-z0-9_.-]{3,32}" placeholder="Tu alias"></label></div><div class="a90-profile-actions"><button id="a90-save-alias" class="a90-auth-primary" type="button">Guardar alias</button><button id="a90-use-network-name" type="button">Usar nombre de la cuenta</button><button id="a90-signout" type="button">Cerrar sesión</button></div><a id="a90-analytics-link" class="a90-analytics-link a90-auth-hidden" href="/admin/analytics/">▦ Analítica privada</a><p class="a90-privacy-note">El correo no se publica. La sesión usa cookies HttpOnly y Secure compartidas por toda A 90 Files.</p></div></div>
  <div id="a90-auth-message" class="a90-auth-message" aria-live="polite"></div>
 </section>`;
 document.body.appendChild(d);bindModal(d);renderProviders();
}

async function refreshMfa(){
 if(state.role!=='super_admin'){mfaState=null;renderMfa();return}
 try{mfaState=await api('/api/auth/mfa/status')}catch{mfaState={error:true}}
 renderMfa();
}

function renderMfa(){
 const slot=$('#a90-mfa-slot');if(!slot)return;
 if(state.role!=='super_admin'){slot.innerHTML='';return}
 const m=mfaState?.mfa;
 if(!m){slot.innerHTML='<div style="margin:14px 0;padding:12px;border:1px solid rgba(74,222,255,.25);border-radius:12px">Cargando seguridad MFA…</div>';return}
 if(m.verified&&m.current_level==='aal2'){
  slot.innerHTML='<div style="margin:14px 0;padding:12px;border:1px solid rgba(74,222,255,.25);border-radius:12px"><strong>Seguridad del Super Admin</strong><p style="margin:8px 0 0">✓ MFA activo · sesión verificada (AAL2).</p></div>';return;
 }
 if(m.verified){
  const f=(m.factors||[]).find(x=>x.factor_type==='totp'&&x.status==='verified');
  slot.innerHTML='<div style="margin:14px 0;padding:12px;border:1px solid rgba(74,222,255,.25);border-radius:12px"><strong>Seguridad del Super Admin</strong><p>MFA activo. Introduce el código para desbloquear moderación.</p><label>Código MFA<input id="a90-mfa-login-code" inputmode="numeric" maxlength="10"></label><button id="a90-mfa-login-btn" class="a90-auth-primary" type="button">Verificar MFA</button></div>';
  $('#a90-mfa-login-btn')?.addEventListener('click',()=>verifyMfa(f?.id||'',$('#a90-mfa-login-code')?.value.trim()||''));return;
 }
 slot.innerHTML='<div style="margin:14px 0;padding:12px;border:1px solid rgba(74,222,255,.25);border-radius:12px"><strong>Seguridad del Super Admin</strong><p>MFA obligatorio · todavía no está activado.</p><button id="a90-mfa-start" class="a90-auth-primary" type="button">Activar MFA</button></div>';
 $('#a90-mfa-start')?.addEventListener('click',startMfa);
}

async function startMfa(){
 msg('Preparando MFA…');
 try{
  const d=await api('/api/auth/mfa/enroll',{method:'POST',body:{}});pendingMfaFactor=d.factor_id||'';
  const slot=$('#a90-mfa-slot');if(!slot)return;
  slot.innerHTML='<div style="margin:14px 0;padding:12px;border:1px solid rgba(74,222,255,.25);border-radius:12px"><strong>Seguridad del Super Admin</strong><p>Escanea el QR con tu app Authenticator.</p><img id="a90-mfa-qr" alt="QR MFA" style="width:180px;max-width:100%;background:#fff;padding:8px;border-radius:10px"><label>Código de la app<input id="a90-mfa-enroll-code" inputmode="numeric" maxlength="10"></label><button id="a90-mfa-enroll-btn" class="a90-auth-primary" type="button">Verificar y activar</button></div>';
  $('#a90-mfa-qr').src=d.qr_code||'';$('#a90-mfa-enroll-btn')?.addEventListener('click',()=>verifyMfa(pendingMfaFactor,$('#a90-mfa-enroll-code')?.value.trim()||''));msg('Escanea el QR e introduce el código generado.','ok');
 }catch(e){msg(e.message,'error')}
}

async function verifyMfa(id,code){
 if(!id||!/^[0-9]{6,10}$/.test(code)){msg('Introduce un código MFA válido.','error');return}
 msg('Verificando MFA…');
 try{await api('/api/auth/mfa/verify',{method:'POST',body:{factor_id:id,code}});await refreshMfa();msg('MFA verificado.','ok')}
 catch(e){msg(e.message,'error')}
}

function openModal(){injectModal();$('#a90-auth-backdrop').classList.add('is-open');document.body.style.overflow='hidden';renderModal();if(state.user)void loadNotifications().then(render);if(state.role==='super_admin')void refreshMfa()}
function closeModal(){const b=$('#a90-auth-backdrop');if(b)b.classList.remove('is-open');document.body.style.overflow=''}
function setTab(tab){$$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('#a90-login-form')?.classList.toggle('a90-auth-hidden',tab!=='login');$('#a90-register-form')?.classList.toggle('a90-auth-hidden',tab!=='register');const t=$('#a90-auth-title');if(t)t.textContent=tab==='register'?'Crear cuenta':'Acceder';msg('')}
function cleanReturnPath(){const u=new URL(location.href);u.searchParams.delete('auth_error');u.searchParams.delete('provider');return u.pathname+u.search}

async function startOAuth(provider){
 if(!PROVIDER_NAMES[provider]){msg('Proveedor de acceso no válido.','error');return}
 if(!providerState.loaded)await refreshProviders();
 if(!providerState.available){msg('No se pudo comprobar el estado de OAuth. Prueba de nuevo en unos segundos.','error');return}
 if(!providerState.providers[provider]){msg(`${PROVIDER_NAMES[provider]} está preparado en la web, pero todavía falta habilitar sus credenciales OAuth en Supabase.`,'error');return}
 location.assign('/api/auth/oauth/start?provider='+encodeURIComponent(provider)+'&return='+encodeURIComponent(cleanReturnPath()));
}

function bindModal(root){
 $('.a90-auth-close',root).addEventListener('click',closeModal);root.addEventListener('click',e=>{if(e.target===root)closeModal()});$$('[data-tab]',root).forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));$$('[data-oauth]',root).forEach(b=>b.addEventListener('click',()=>startOAuth(b.dataset.oauth)));$('[data-email-focus]',root).addEventListener('click',()=>{$('#a90-email')?.focus();msg('')});
 $('#a90-login-form',root).addEventListener('submit',async e=>{e.preventDefault();msg('Iniciando sesión…');try{await api('/api/auth/login',{method:'POST',body:{email:$('#a90-email').value.trim(),password:$('#a90-password').value}});await loadIdentity();msg('Sesión iniciada.','ok')}catch(err){msg(err.message,'error')}});
 $('#a90-register-form',root).addEventListener('submit',async e=>{e.preventDefault();msg('Creando cuenta…');try{const d=await api('/api/auth/signup',{method:'POST',body:{email:$('#a90-reg-email').value.trim(),password:$('#a90-reg-password').value,display_name:$('#a90-reg-name').value.trim()}});if(d.requires_confirmation)msg('Cuenta creada. Revisa tu correo y confirma la dirección; después vuelve aquí e inicia sesión.','ok');else{await loadIdentity();msg('Cuenta creada y sesión iniciada.','ok')}}catch(err){msg(err.message,'error')}});
 $('#a90-save-alias',root).addEventListener('click',async()=>{const alias=$('#a90-alias').value.trim();if(!/^[A-Za-z0-9_.-]{3,32}$/.test(alias)){msg('El alias debe tener entre 3 y 32 caracteres: letras, números, punto, guion o _.','error');return}try{await api('/api/auth/profile',{method:'POST',body:{alias}});await loadIdentity();msg('Alias guardado.','ok')}catch(err){msg(err.message,'error')}});
 $('#a90-use-network-name',root).addEventListener('click',async()=>{try{await api('/api/auth/profile',{method:'POST',body:{mode:'network'}});await loadIdentity();msg('Se usará el nombre de tu cuenta.','ok')}catch(err){msg(err.message,'error')}});
 $('#a90-notifications-read-all',root)?.addEventListener('click',()=>void markNotificationRead(null,true));
 $('#a90-signout',root).addEventListener('click',async()=>{try{await api('/api/auth/logout',{method:'POST'})}catch{}state={user:null,profile:null,role:'user'};notificationState={unread:0,notifications:[]};mfaState=null;render();msg('Sesión cerrada.','ok')});
}

function renderNotifications(){
 const list=$('#a90-notifications-list');if(!list)return;
 list.replaceChildren();
 const items=notificationState.notifications||[];
 if(!items.length){const empty=document.createElement('p');empty.className='a90-notifications-empty';empty.textContent='Sin notificaciones nuevas del foro.';list.append(empty)}
 else items.forEach(n=>{
   const a=document.createElement('a');a.className='a90-notification-item'+(n.read_at?'':' is-unread');a.href=n.href||'/foro/';
   const icon=document.createElement('span');icon.className='a90-notification-icon';icon.textContent=n.kind==='quote'?'❝':'↳';
   const copy=document.createElement('span');copy.className='a90-notification-copy';
   const title=document.createElement('strong');title.textContent=n.title||'Actividad del foro';
   const body=document.createElement('small');body.textContent=n.body||'';
   const time=document.createElement('time');try{time.textContent=new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short'}).format(new Date(n.created_at))}catch{time.textContent=''}
   copy.append(title,body,time);a.append(icon,copy);
   a.addEventListener('click',e=>{if(!n.read_at){e.preventDefault();void markNotificationRead(n.id,false).then(()=>{location.href=a.href})}});
   list.append(a);
 });
 const readAll=$('#a90-notifications-read-all');if(readAll)readAll.hidden=notificationState.unread<1;
}

function renderModal(){const guest=$('#a90-auth-guest'),user=$('#a90-auth-user');if(!guest||!user)return;guest.classList.toggle('a90-auth-hidden',!!state.user);user.classList.toggle('a90-auth-hidden',!state.user);const analytics=$('#a90-analytics-link');if(analytics)analytics.classList.toggle('a90-auth-hidden',state.role!=='super_admin');if(state.user){$('#a90-profile-name').textContent=displayName();$('#a90-role').textContent=roleLabel(state.role);$('#a90-alias').value=state.profile?.username||'';paintAvatar($('#a90-profile-avatar'),state.profile,displayName());const rm=$('#a90-avatar-remove');if(rm)rm.hidden=!safeAvatarUrl(state.profile?.avatar_url);renderNotifications();renderMfa()}}
function renderProviders(){$$('[data-oauth]').forEach(button=>{const provider=button.dataset.oauth;const ready=!!providerState.providers[provider];button.classList.toggle('is-provider-ready',ready);button.classList.toggle('is-provider-pending',providerState.loaded&&!ready);button.setAttribute('aria-disabled',ready?'false':'true');button.title=ready?`Continuar con ${PROVIDER_NAMES[provider]}`:`${PROVIDER_NAMES[provider]} · OAuth pendiente`});const ready=Object.entries(providerState.providers).filter(([,enabled])=>enabled).map(([provider])=>PROVIDER_NAMES[provider]);$$('.a90-provider-note').forEach(note=>{if(!providerState.loaded)note.textContent='Comprobando accesos sociales…';else if(!providerState.available)note.textContent='Correo está activo. No se pudo comprobar ahora el estado de los accesos sociales.';else if(ready.length)note.textContent=`Correo está activo. Acceso social disponible: ${ready.join(', ')}.`;else note.textContent='Correo está activo. Los accesos sociales quedan listos para activarse al añadir sus credenciales OAuth.'})}
function render(){$$('[data-a90-account]').forEach(btn=>{btn.classList.toggle('is-authenticated',!!state.user);btn.dataset.accountRole=state.user?state.role:'guest';const lab=$('.a90-account-label',btn);if(lab)lab.textContent=state.user?displayName():'Entrar';const unread=state.user?(Number(notificationState.unread)||0):0;btn.setAttribute('aria-label',state.user?`Abrir la cuenta de ${displayName()} (${roleLabel(state.role)})${unread?` · ${unread} notificación${unread===1?'':'es'}`:''}`:'Iniciar sesión o crear cuenta');const monogram=$('.a90-account-monogram',btn);if(monogram)monogram.textContent=state.user?(Array.from(displayName().trim())[0]||'A').toUpperCase():'↗';paintAvatar($('.a90-account-avatar',btn),state.user?state.profile:null,state.user?displayName():'');let badge=$('.a90-account-notification-badge',btn);if(!badge){badge=document.createElement('span');badge.className='a90-account-notification-badge';btn.append(badge)}badge.hidden=!unread;badge.textContent=unread>99?'99+':String(unread);btn.setAttribute('title',state.user?`${displayName()} · ${roleLabel(state.role)}${unread?` · ${unread} nueva${unread===1?'':'s'}`:''}`:'Iniciar sesión o crear cuenta')});renderModal();renderProviders();const card=$('#foro-login');if(card){const note=$('.auth-note',card);if(note)note.textContent=state.user?`Sesión activa como ${displayName()} · ${roleLabel(state.role)}. Esta cuenta funciona en toda A 90 Files.`:'Correo activo. La misma sesión funciona en toda la web y en el foro.';const p=$('.auth-copy p',card);if(p)p.textContent='Una sola Cuenta A 90 para la web y el foro. El correo nunca se muestra públicamente.'}}
function bindHeader(){$$('[data-a90-account]').forEach(b=>b.addEventListener('click',openModal));const grid=$('#foro-login .provider-grid');if(grid){const mapping=['google','facebook','x','discord','github','email'];$$(':scope > .provider-item',grid).forEach((item,i)=>{const provider=mapping[i];item.style.cursor='pointer';item.setAttribute('role','button');item.setAttribute('tabindex','0');const activate=()=>{if(provider==='email'){openModal();$('#a90-email')?.focus()}else{openModal();startOAuth(provider)}};item.addEventListener('click',e=>{e.stopPropagation();activate()});item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}})})}}
function handleOAuthResult(){const u=new URL(location.href);const error=u.searchParams.get('auth_error');const provider=u.searchParams.get('provider')||'';if(!error)return;const name=PROVIDER_NAMES[provider]||'El proveedor';const messages={provider_disabled:`${name} todavía no está habilitado en Supabase.`,provider_invalid:'Proveedor de acceso no válido.',provider_check_failed:'No se pudo comprobar la configuración del proveedor.',request_rejected:'La solicitud de acceso fue rechazada por seguridad.',oauth_denied:`El acceso con ${name} se canceló o fue rechazado.`,oauth_state_invalid:'La sesión de acceso caducó o no es válida. Vuelve a intentarlo.',oauth_exchange_failed:`No se pudo completar el acceso con ${name}.`};u.searchParams.delete('auth_error');u.searchParams.delete('provider');history.replaceState({},document.title,u.pathname+u.search+u.hash);openModal();msg(messages[error]||'No se pudo completar el acceso social.','error')}
async function init(){injectModal();bindHeader();await Promise.all([refreshProviders(),loadIdentity()]);handleOAuthResult();window.A90Auth={open:openModal,getUser:()=>state.user,getProfile:()=>state.profile,getRole:()=>state.role,refreshProviders}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
