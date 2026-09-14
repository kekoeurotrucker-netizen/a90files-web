const SITE_KEY='0x4AAAAAAEyoSaRze-QyG4-4';
const tokens={login:'',signup:''};
const widgets={login:null,signup:null};
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
document.addEventListener('click',e=>{const tab=e.target.closest?.('[data-tab]');if(tab)setTimeout(()=>void renderTurnstile(tab.dataset.tab==='register'?'signup':'login'),0)},true);

addCss();
const ready=()=>void renderTurnstile('login');
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
