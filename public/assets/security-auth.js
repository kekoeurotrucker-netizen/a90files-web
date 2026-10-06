const SITE_KEY='0x4AAAAAAEyoSaRze-QyG4-4';
const TURNSTILE_ENABLED=false;
const tokens={login:'',signup:'',resend:''};
const widgets={login:null,signup:null,resend:null};
let pendingEmail='';
let turnstilePromise=null;

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
function addCss(){if(document.querySelector('link[data-a90-security-auth]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/security-auth.css?v=20261006-no-turnstile-2';l.dataset.a90SecurityAuth='1';document.head.appendChild(l)}
function loadTurnstile(){if(window.turnstile)return Promise.resolve(window.turnstile);if(turnstilePromise)return turnstilePromise;turnstilePromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.defer=true;s.onload=()=>window.turnstile?resolve(window.turnstile):reject(new Error('Turnstile no disponible'));s.onerror=()=>reject(new Error('No se pudo cargar Turnstile'));document.head.appendChild(s)});return turnstilePromise}
function ensureBox(kind){if(kind==='resend')return $('#a90-turnstile-resend');const form=$(kind==='login'?'#a90-login-form':'#a90-register-form');if(!form)return null;let box=$(`#a90-turnstile-${kind}`);if(!box){box=document.createElement('div');box.id=`a90-turnstile-${kind}`;box.className='a90-turnstile';box.setAttribute('aria-label','Verificación anti-bot');form.insertBefore(box,form.querySelector('button[type="submit"]'))}return box}
async function renderTurnstile(kind){if(!TURNSTILE_ENABLED)return;const box=ensureBox(kind);if(!box||widgets[kind]!==null)return;try{const t=await loadTurnstile();widgets[kind]=t.render(box,{sitekey:SITE_KEY,action:kind,theme:'auto',callback:v=>{tokens[kind]=v},'expired-callback':()=>{tokens[kind]=''},'error-callback':()=>{tokens[kind]='';message('No se pudo completar la verificación anti-bot.','error')}})}catch{message('No se pudo cargar la verificación anti-bot.','error')}}
function reset(kind){tokens[kind]='';if(window.turnstile&&widgets[kind]!==null){try{window.turnstile.reset(widgets[kind])}catch{}}}

async function submitLogin(){const token=TURNSTILE_ENABLED?tokens.login:'';message('Iniciando sesión…');try{await call('/api/auth/login',{method:'POST',body:{email:$('#a90-email')?.value.trim()||'',password:$('#a90-password')?.value||'',turnstile_token:token}});location.reload()}catch(e){message(e.message,'error');if(TURNSTILE_ENABLED)reset('login')}}
function showEmailVerify(email){
 pendingEmail=String(email||'').trim().toLowerCase();
 const panel=$('#a90-email-verify'),form=$('#a90-register-form');
 if(!panel||!form)return;
 form.classList.add('a90-auth-hidden');panel.classList.remove('a90-auth-hidden');
 const addr=$('#a90-email-verify-address');if(addr)addr.textContent=pendingEmail;
 const title=$('#a90-auth-title');if(title)title.textContent='Verificar correo';
 message('Código enviado. Revisa también la carpeta de spam.','ok');
 setTimeout(()=>{$('#a90-email-code-grid input')?.focus();void renderTurnstile('resend')},40);
}
function hideEmailVerify(){
 pendingEmail='';
 $('#a90-email-verify')?.classList.add('a90-auth-hidden');
 $('#a90-register-form')?.classList.remove('a90-auth-hidden');
 const title=$('#a90-auth-title');if(title)title.textContent='Crear cuenta';
 message('');
}
function readEmailCode(){return [...document.querySelectorAll('#a90-email-code-grid input')].map(i=>String(i.value||'').replace(/\D/g,'')).join('').slice(0,6)}
async function verifyEmailCode(){
 const token=readEmailCode();
 if(!pendingEmail||!/^[0-9]{6}$/.test(token)){message('Introduce los 6 dígitos del correo.','error');return}
 message('Verificando código…');
 try{await call('/api/auth/email/verify',{method:'POST',body:{email:pendingEmail,token}});message('Correo verificado. Entrando…','ok');setTimeout(()=>location.reload(),250)}
 catch(e){message(e.message,'error')}
}
async function resendEmailCode(){
 const token=TURNSTILE_ENABLED?tokens.resend:'';
 if(!pendingEmail){hideEmailVerify();return}
 message('Reenviando código…');
 try{await call('/api/auth/email/resend',{method:'POST',body:{email:pendingEmail,turnstile_token:token}});message('Código reenviado. Revisa tu correo.','ok');if(TURNSTILE_ENABLED)reset('resend')}
 catch(e){message(e.message,'error');if(TURNSTILE_ENABLED)reset('resend')}
}
async function uploadAvatar(file){
 if(!file)return;
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){message('Usa una foto JPG, PNG, WEBP o GIF.','error');return}
 if(file.size>3*1024*1024){message('La foto debe ocupar como máximo 3 MB.','error');return}
 message('Subiendo foto…');
 const fd=new FormData();fd.append('avatar',file);
 try{const res=await fetch('/api/auth/avatar',{method:'POST',credentials:'same-origin',body:fd});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data?.error||'No se pudo subir la foto.');message('Foto actualizada.','ok');setTimeout(()=>location.reload(),200)}
 catch(e){message(e.message,'error')}
}
async function removeAvatar(){
 message('Quitando foto…');
 try{await call('/api/auth/avatar/remove',{method:'POST',body:{}});message('Foto eliminada.','ok');setTimeout(()=>location.reload(),200)}
 catch(e){message(e.message,'error')}
}
async function submitSignup(){
 const token=TURNSTILE_ENABLED?tokens.signup:'';
 message('Creando cuenta…');
 const email=$('#a90-reg-email')?.value.trim()||'';
 try{const d=await call('/api/auth/signup',{method:'POST',body:{email,password:$('#a90-reg-password')?.value||'',display_name:$('#a90-reg-name')?.value.trim()||'',turnstile_token:token}});if(d.requires_confirmation){if(TURNSTILE_ENABLED)reset('signup');if(d.confirmation_method==='otp')showEmailVerify(email);else message('Cuenta creada. Revisa tu correo y abre el enlace de confirmación; después podrás iniciar sesión.','ok')}else location.reload()}
 catch(e){message(e.message,'error');if(TURNSTILE_ENABLED)reset('signup')}
}

document.addEventListener('submit',e=>{
 if(e.target?.id==='a90-login-form'){e.preventDefault();e.stopImmediatePropagation();void submitLogin()}
 else if(e.target?.id==='a90-register-form'){e.preventDefault();e.stopImmediatePropagation();void submitSignup()}
},true);
document.addEventListener('click',e=>{
 const tab=e.target.closest?.('[data-tab]');
 if(tab){if(tab.dataset.tab!=='register')hideEmailVerify();setTimeout(()=>void renderTurnstile(tab.dataset.tab==='register'?'signup':'login'),0)}
 if(e.target.closest?.('#a90-email-verify-btn'))void verifyEmailCode();
 if(e.target.closest?.('#a90-email-resend-btn'))void resendEmailCode();
 if(e.target.closest?.('#a90-email-change-btn'))hideEmailVerify();
 if(e.target.closest?.('#a90-avatar-remove'))void removeAvatar();
},true);
document.addEventListener('change',e=>{if(e.target?.id==='a90-avatar-file')void uploadAvatar(e.target.files?.[0])},true);
document.addEventListener('input',e=>{
 if(!e.target.matches?.('#a90-email-code-grid input'))return;
 const inputs=[...document.querySelectorAll('#a90-email-code-grid input')];
 e.target.value=String(e.target.value||'').replace(/\D/g,'').slice(-1);
 const i=inputs.indexOf(e.target);if(e.target.value&&i>=0&&i<inputs.length-1)inputs[i+1].focus();
},true);
document.addEventListener('keydown',e=>{
 if(!e.target.matches?.('#a90-email-code-grid input'))return;
 const inputs=[...document.querySelectorAll('#a90-email-code-grid input')],i=inputs.indexOf(e.target);
 if(e.key==='Backspace'&&!e.target.value&&i>0)inputs[i-1].focus();
 if(e.key==='Enter'){e.preventDefault();void verifyEmailCode()}
},true);
document.addEventListener('paste',e=>{
 if(!e.target.matches?.('#a90-email-code-grid input'))return;
 const code=(e.clipboardData?.getData('text')||'').replace(/\D/g,'').slice(0,6);if(code.length<2)return;
 e.preventDefault();const inputs=[...document.querySelectorAll('#a90-email-code-grid input')];
 inputs.forEach((input,i)=>input.value=code[i]||'');inputs[Math.min(code.length,6)-1]?.focus();if(code.length===6)void verifyEmailCode();
},true);

addCss();
const ready=()=>{document.documentElement.classList.toggle('a90-no-turnstile',!TURNSTILE_ENABLED);if(TURNSTILE_ENABLED)void renderTurnstile('login')};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
