const SITE_KEY='0x4AAAAAAEyoSaRze-QyG4-4';
const tokens={login:'',signup:''};
const widgets={login:null,signup:null};
let turnstilePromise=null;
let pendingFactor='';

const $=(s,r=document)=>r.querySelector(s);
function message(text,type=''){
 const el=$('#a90-auth-message');if(!el)return;
 el.textContent=text||'';el.className='a90-auth-message'+(type?' '+type:'');
}
async function call(path,{method='GET',body}={}){
 const res=await fetch(path,{method,credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok){const e=new Error(data?.error||'No se pudo completar la operación.');e.code=data?.code||'';throw e}
 return data;
}
function addCss(){if(document.querySelector('link[data-a90-security-auth]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/security-auth.css';l.dataset.a90SecurityAuth='1';document.head.appendChild(l)}
function loadTurnstile(){if(window.turnstile)return Promise.resolve(window.turnstile);if(turnstilePromise)return turnstilePromise;turnstilePromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.defer=true;s.onload=()=>window.turnstile?resolve(window.turnstile):reject(new Error('Turnstile no disponible'));s.onerror=()=>reject(new Error('No se pudo cargar Turnstile'));document.head.appendChild(s)});return turnstilePromise}
function ensureBox(kind){const form=$(kind==='login'?'#a90-login-form':'#a90-register-form');if(!form)return null;let box=$(`#a90-turnstile-${kind}`);if(!box){box=document.createElement('div');box.id=`a90-turnstile-${kind}`;box.className='a90-turnstile';box.setAttribute('aria-label','Verificación anti-bot');form.insertBefore(box,form.querySelector('button[type="submit"]'))}return box}
async function renderTurnstile(kind){const box=ensureBox(kind);if(!box||widgets[kind]!==null)return;try{const t=await loadTurnstile();widgets[kind]=t.render(box,{sitekey:SITE_KEY,action:kind,theme:'auto',callback:v=>{tokens[kind]=v},'expired-callback':()=>{tokens[kind]=''},'error-callback':()=>{tokens[kind]='';message('No se pudo completar la verificación anti-bot.','error')}})}catch{message('No se pudo cargar la verificación anti-bot.','error')}}
function reset(kind){tokens[kind]='';if(window.turnstile&&widgets[kind]!==null){try{window.turnstile.reset(widgets[kind])}catch{}}}

async function submitLogin(){const token=tokens.login;if(!token){message('Completa la verificación anti-bot.','error');return}message('Iniciando sesión…');try{await call('/api/auth/login',{method:'POST',body:{email:$('#a90-email')?.value.trim()||'',password:$('#a90-password')?.value||'',turnstile_token:token}});location.reload()}catch(e){message(e.message,'error');reset('login')}}
async function submitSignup(){const token=tokens.signup;if(!token){message('Completa la verificación anti-bot.','error');return}message('Creando cuenta…');try{const d=await call('/api/auth/signup',{method:'POST',body:{email:$('#a90-reg-email')?.value.trim()||'',password:$('#a90-reg-password')?.value||'',display_name:$('#a90-reg-name')?.value.trim()||'',turnstile_token:token}});if(d.requires_confirmation){message('Cuenta creada. Revisa tu correo y confirma la dirección; después vuelve aquí e inicia sesión.','ok');reset('signup')}else location.reload()}catch(e){message(e.message,'error');reset('signup')}}

document.addEventListener('submit',e=>{
 if(e.target?.id==='a90-login-form'){e.preventDefault();e.stopImmediatePropagation();void submitLogin()}
 else if(e.target?.id==='a90-register-form'){e.preventDefault();e.stopImmediatePropagation();void submitSignup()}
},true);
document.addEventListener('click',e=>{const tab=e.target.closest?.('[data-tab]');if(tab)setTimeout(()=>void renderTurnstile(tab.dataset.tab==='register'?'signup':'login'),0);const account=e.target.closest?.('[data-a90-account]');if(account)setTimeout(()=>void refreshMfaCard(),80)},true);

function injectMfaCard(status){
 const card=$('.a90-profile-card');if(!card||$('#a90-security-mfa-card'))return;
 const wrap=document.createElement('div');wrap.id='a90-security-mfa-card';wrap.className='a90-mfa-card';
 wrap.innerHTML='<strong>Seguridad del Super Admin</strong><p id="a90-security-mfa-status"></p><div id="a90-security-mfa-actions"></div><div id="a90-security-mfa-setup" class="a90-auth-hidden"><img id="a90-security-mfa-qr" alt="QR para configurar MFA"><p>Escanea el QR con tu app Authenticator. Si no puedes, usa esta clave:</p><code id="a90-security-mfa-secret"></code><label>Código de la app<input id="a90-security-mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10"></label><button id="a90-security-mfa-verify" class="a90-auth-primary" type="button">Verificar y activar</button></div>';
 const field=card.querySelector('.a90-profile-field');card.insertBefore(wrap,field||card.lastChild);
 $('#a90-security-mfa-verify').addEventListener('click',verifyPendingMfa);
 renderMfaCard(status);
}
function renderMfaCard(status){
 const p=$('#a90-security-mfa-status'),actions=$('#a90-security-mfa-actions');if(!p||!actions)return;
 const m=status.mfa||{};
 if(m.verified&&m.current_level==='aal2'){p.textContent='MFA activo · esta sesión está verificada (AAL2).';actions.innerHTML='<span class="a90-mfa-ok">✓ Protegido</span>';return}
 if(m.verified){p.textContent='MFA activo · verifica el código para desbloquear las funciones de Super Admin.';const f=m.factors?.find(x=>x.factor_type==='totp'&&x.status==='verified');actions.innerHTML='<label>Código de la app<input id="a90-security-mfa-login-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10"></label><button id="a90-security-mfa-login" class="a90-auth-primary" type="button">Verificar MFA</button>';$('#a90-security-mfa-login').addEventListener('click',()=>verifyExistingMfa(f?.id||''));return}
 p.textContent='MFA obligatorio · todavía no hay un factor TOTP verificado.';actions.innerHTML='<button id="a90-security-mfa-start" class="a90-auth-primary" type="button">Activar MFA</button>';$('#a90-security-mfa-start').addEventListener('click',startMfa);
}
async function refreshMfaCard(){try{const s=await call('/api/auth/mfa/status');if(s.role!=='super_admin')return;if(!$('#a90-security-mfa-card'))injectMfaCard(s);else renderMfaCard(s)}catch{}}
async function startMfa(){message('Preparando MFA…');try{const d=await call('/api/auth/mfa/enroll',{method:'POST',body:{}});pendingFactor=d.factor_id;$('#a90-security-mfa-actions').classList.add('a90-auth-hidden');const setup=$('#a90-security-mfa-setup');setup.classList.remove('a90-auth-hidden');$('#a90-security-mfa-qr').src=d.qr_code||'';$('#a90-security-mfa-secret').textContent=d.secret||'';message('Escanea el QR e introduce el código generado.','ok')}catch(e){message(e.message,'error')}}
async function verifyPendingMfa(){const code=$('#a90-security-mfa-code')?.value.trim()||'';if(!pendingFactor||!/^[0-9]{6,10}$/.test(code)){message('Introduce el código de tu app Authenticator.','error');return}message('Verificando MFA…');try{await call('/api/auth/mfa/verify',{method:'POST',body:{factor_id:pendingFactor,code}});location.reload()}catch(e){message(e.message,'error')}}
async function verifyExistingMfa(factorId){const code=$('#a90-security-mfa-login-code')?.value.trim()||'';if(!factorId||!/^[0-9]{6,10}$/.test(code)){message('Introduce un código MFA válido.','error');return}message('Verificando MFA…');try{await call('/api/auth/mfa/verify',{method:'POST',body:{factor_id:factorId,code}});location.reload()}catch(e){message(e.message,'error')}}
function openDirectMfa(){
 if(new URL(location.href).searchParams.get('mfa')!=='1')return;
 let tries=0;
 const timer=setInterval(()=>{
  tries++;
  if(window.A90Auth?.open){
   clearInterval(timer);
   window.A90Auth.open();
   setTimeout(()=>void refreshMfaCard(),100);
  }else if(tries>30){clearInterval(timer)}
 },100);
}

addCss();
const ready=()=>{void renderTurnstile('login');setTimeout(()=>void refreshMfaCard(),150);openDirectMfa()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
