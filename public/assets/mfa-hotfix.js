(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
let mounting=false;
let factorId='';
async function api(path,{method='GET',body}={}){
 const res=await fetch(path,{method,credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(data?.error||'No se pudo completar la operación.');
 return data;
}
function ensureCss(){if(document.querySelector('link[data-a90-security-auth]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/security-auth.css';l.dataset.a90SecurityAuth='1';document.head.appendChild(l)}
function msg(text,type=''){const el=$('#a90-auth-message');if(!el)return;el.textContent=text||'';el.className='a90-auth-message'+(type?' '+type:'')}
async function verify(id,code){if(!id||!/^[0-9]{6,10}$/.test(code)){msg('Introduce un código MFA válido.','error');return}msg('Verificando MFA…');try{await api('/api/auth/mfa/verify',{method:'POST',body:{factor_id:id,code}});location.reload()}catch(e){msg(e.message,'error')}}
function render(card,status){
 if($('#a90-security-mfa-card'))return;
 ensureCss();
 const m=status.mfa||{};
 const wrap=document.createElement('div');wrap.id='a90-security-mfa-card';wrap.className='a90-mfa-card';
 if(m.verified&&m.current_level==='aal2'){
  wrap.innerHTML='<strong>Seguridad del Super Admin</strong><p>MFA activo · esta sesión está verificada (AAL2).</p><span class="a90-mfa-ok">✓ Protegido</span>';
 }else if(m.verified){
  const f=m.factors?.find(x=>x.factor_type==='totp'&&x.status==='verified');
  wrap.innerHTML='<strong>Seguridad del Super Admin</strong><p>MFA activo · introduce el código para desbloquear la moderación.</p><label>Código de la app<input id="a90-hotfix-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10"></label><button id="a90-hotfix-verify" class="a90-auth-primary" type="button">Verificar MFA</button>';
  wrap.querySelector('#a90-hotfix-verify').addEventListener('click',()=>verify(f?.id||'',wrap.querySelector('#a90-hotfix-code')?.value.trim()||''));
 }else{
  wrap.innerHTML='<strong>Seguridad del Super Admin</strong><p>MFA obligatorio · todavía no está activado.</p><div id="a90-hotfix-actions"><button id="a90-hotfix-start" class="a90-auth-primary" type="button">Activar MFA</button></div>';
  wrap.querySelector('#a90-hotfix-start').addEventListener('click',async()=>{
   msg('Preparando MFA…');
   try{
    const d=await api('/api/auth/mfa/enroll',{method:'POST',body:{}});factorId=d.factor_id||'';
    wrap.querySelector('#a90-hotfix-actions').innerHTML='<div id="a90-hotfix-setup"><img id="a90-hotfix-qr" alt="QR para configurar MFA"><p>Escanea el QR con tu app Authenticator.</p><label>Código de la app<input id="a90-hotfix-enroll-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10"></label><button id="a90-hotfix-enroll-verify" class="a90-auth-primary" type="button">Verificar y activar</button></div>';
    wrap.querySelector('#a90-hotfix-qr').src=d.qr_code||'';
    wrap.querySelector('#a90-hotfix-enroll-verify').addEventListener('click',()=>verify(factorId,wrap.querySelector('#a90-hotfix-enroll-code')?.value.trim()||''));
    msg('Escanea el QR e introduce el código generado.','ok');
   }catch(e){msg(e.message,'error')}
  });
 }
 const field=card.querySelector('.a90-profile-field');card.insertBefore(wrap,field||card.lastChild);
}
async function mount(){
 if(mounting||$('#a90-security-mfa-card'))return;
 const card=$('.a90-profile-card');if(!card)return;
 mounting=true;
 try{const status=await api('/api/auth/mfa/status');if(status.role==='super_admin')render(card,status)}catch{}finally{mounting=false}
}
function schedule(){[0,100,350,900].forEach(ms=>setTimeout(()=>void mount(),ms))}
function openDirectMfa(){
 if(new URL(location.href).searchParams.get('mfa')!=='1')return;
 let tries=0;
 const timer=setInterval(()=>{
  tries++;
  if(window.A90Auth?.open){clearInterval(timer);window.A90Auth.open();schedule();}
  else if(tries>30)clearInterval(timer);
 },100);
}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-a90-account]'))schedule()},true);
new MutationObserver(()=>{if($('.a90-profile-card'))schedule()}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{schedule();openDirectMfa()},{once:true});else{schedule();openDirectMfa()}
})();
