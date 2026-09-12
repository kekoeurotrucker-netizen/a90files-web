(()=>{
'use strict';
let state={user:null,profile:null,role:'user'};
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

async function api(path,{method='GET',body}={}){
 const res=await fetch(path,{method,credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok) throw new Error(data?.error||'No se pudo completar la operación.');
 return data;
}

async function loadIdentity(){
 try{
  const d=await api('/api/auth/session');
  if(d.authenticated){state.user=d.user;state.profile=d.profile;state.role=d.role||'user'}else state={user:null,profile:null,role:'user'};
 }catch{state={user:null,profile:null,role:'user'}}
 render();
}

function roleLabel(r){return({user:'Usuario',moderator:'Moderador',admin:'Admin',super_admin:'Super Admin'})[r]||'Usuario'}
function displayName(){return state.profile?.username||state.profile?.display_name||state.user?.network_name||'Cuenta A 90'}

function injectModal(){
 if($('#a90-auth-backdrop'))return;
 const d=document.createElement('div');
 d.id='a90-auth-backdrop';d.className='a90-auth-backdrop';
 d.innerHTML=`<section class="a90-auth-modal" role="dialog" aria-modal="true" aria-labelledby="a90-auth-title">
  <div class="a90-auth-head"><div><small>CUENTA A 90</small><h2 id="a90-auth-title">Acceder</h2></div><button class="a90-auth-close" type="button" aria-label="Cerrar">×</button></div>
  <div id="a90-auth-guest">
   <div class="a90-auth-tabs"><button type="button" data-tab="login" class="active">Iniciar sesión</button><button type="button" data-tab="register">Crear cuenta</button></div>
   <div class="a90-social-grid" aria-label="Inicio social"><button type="button" data-oauth="google">Google</button><button type="button" data-oauth="facebook">Facebook</button><button type="button" data-oauth="x" aria-label="X">𝕏</button><button type="button" data-oauth="discord">Discord</button><button type="button" data-oauth="github">GitHub</button><button type="button" data-email-focus>Correo</button></div>
   <p class="a90-provider-note">El acceso por correo ya está activo. Los proveedores sociales requieren configurar sus credenciales OAuth antes de habilitarlos.</p>
   <div class="a90-divider">con correo</div>
   <form id="a90-login-form" class="a90-auth-form">
    <label>Correo<input id="a90-email" type="email" autocomplete="email" maxlength="254" required></label>
    <label>Contraseña<input id="a90-password" type="password" autocomplete="current-password" minlength="10" maxlength="128" required></label>
    <button class="a90-auth-primary" type="submit">Entrar</button>
   </form>
   <form id="a90-register-form" class="a90-auth-form a90-auth-hidden">
    <label>Correo<input id="a90-reg-email" type="email" autocomplete="email" maxlength="254" required></label>
    <label>Nombre o alias público <span>(opcional)</span><input id="a90-reg-name" type="text" autocomplete="nickname" maxlength="80" placeholder="Lo que verán los demás"></label>
    <label>Contraseña<input id="a90-reg-password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label>
    <button class="a90-auth-primary" type="submit">Crear cuenta</button>
   </form>
  </div>
  <div id="a90-auth-user" class="a90-auth-hidden">
   <div class="a90-profile-card"><div class="a90-profile-summary"><div class="a90-avatar">A90</div><div><strong id="a90-profile-name">Usuario</strong><small>Cuenta compartida web + foro</small><span id="a90-role" class="a90-role-badge">Usuario</span></div></div>
   <div class="a90-profile-field"><label>Alias público del foro<input id="a90-alias" type="text" minlength="3" maxlength="32" pattern="[A-Za-z0-9_.-]{3,32}" placeholder="Tu alias"></label></div>
   <div class="a90-profile-actions"><button id="a90-save-alias" class="a90-auth-primary" type="button">Guardar alias</button><button id="a90-use-network-name" type="button">Usar nombre de la cuenta</button><button id="a90-signout" type="button">Cerrar sesión</button></div>
   <p class="a90-privacy-note">El correo no se publica. La sesión usa cookies HttpOnly y Secure compartidas por toda A 90 Files.</p></div>
  </div>
  <div id="a90-auth-message" class="a90-auth-message" aria-live="polite"></div>
 </section>`;
 document.body.appendChild(d);bindModal(d);
}

function msg(text,type=''){const e=$('#a90-auth-message');if(!e)return;e.textContent=text||'';e.className='a90-auth-message'+(type?' '+type:'')}
function openModal(){injectModal();$('#a90-auth-backdrop').classList.add('is-open');document.body.style.overflow='hidden';renderModal()}
function closeModal(){const b=$('#a90-auth-backdrop');if(b)b.classList.remove('is-open');document.body.style.overflow=''}

function setTab(tab){
 $$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 $('#a90-login-form')?.classList.toggle('a90-auth-hidden',tab!=='login');
 $('#a90-register-form')?.classList.toggle('a90-auth-hidden',tab!=='register');
 const t=$('#a90-auth-title');if(t)t.textContent=tab==='register'?'Crear cuenta':'Acceder';msg('');
}

function socialPending(provider){
 const names={google:'Google',facebook:'Facebook',x:'X',discord:'Discord',github:'GitHub'};
 msg(`${names[provider]||provider} todavía necesita configurar OAuth en el proveedor. Usa Correo para crear tu cuenta ahora.`,'error');
}

function bindModal(root){
 $('.a90-auth-close',root).addEventListener('click',closeModal);
 root.addEventListener('click',e=>{if(e.target===root)closeModal()});
 $$('[data-tab]',root).forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
 $$('[data-oauth]',root).forEach(b=>b.addEventListener('click',()=>socialPending(b.dataset.oauth)));
 $('[data-email-focus]',root).addEventListener('click',()=>{$('#a90-email')?.focus();msg('')});

 $('#a90-login-form',root).addEventListener('submit',async e=>{
  e.preventDefault();msg('Iniciando sesión…');
  try{await api('/api/auth/login',{method:'POST',body:{email:$('#a90-email').value.trim(),password:$('#a90-password').value}});await loadIdentity();msg('Sesión iniciada.','ok')}
  catch(err){msg(err.message,'error')}
 });

 $('#a90-register-form',root).addEventListener('submit',async e=>{
  e.preventDefault();msg('Creando cuenta…');
  try{
   const d=await api('/api/auth/signup',{method:'POST',body:{email:$('#a90-reg-email').value.trim(),password:$('#a90-reg-password').value,display_name:$('#a90-reg-name').value.trim()}});
   if(d.requires_confirmation){msg('Cuenta creada. Revisa tu correo y confirma la dirección; después vuelve aquí e inicia sesión.','ok')}else{await loadIdentity();msg('Cuenta creada y sesión iniciada.','ok')}
  }catch(err){msg(err.message,'error')}
 });

 $('#a90-save-alias',root).addEventListener('click',async()=>{
  const alias=$('#a90-alias').value.trim();
  if(!/^[A-Za-z0-9_.-]{3,32}$/.test(alias)){msg('El alias debe tener entre 3 y 32 caracteres: letras, números, punto, guion o _.','error');return}
  try{await api('/api/auth/profile',{method:'POST',body:{alias}});await loadIdentity();msg('Alias guardado.','ok')}catch(err){msg(err.message,'error')}
 });

 $('#a90-use-network-name',root).addEventListener('click',async()=>{
  try{await api('/api/auth/profile',{method:'POST',body:{mode:'network'}});await loadIdentity();msg('Se usará el nombre de tu cuenta.','ok')}catch(err){msg(err.message,'error')}
 });

 $('#a90-signout',root).addEventListener('click',async()=>{
  try{await api('/api/auth/logout',{method:'POST'})}catch{}
  state={user:null,profile:null,role:'user'};render();msg('Sesión cerrada.','ok');
 });
}

function renderModal(){
 const guest=$('#a90-auth-guest'),user=$('#a90-auth-user');if(!guest||!user)return;
 guest.classList.toggle('a90-auth-hidden',!!state.user);user.classList.toggle('a90-auth-hidden',!state.user);
 if(state.user){$('#a90-profile-name').textContent=displayName();$('#a90-role').textContent=roleLabel(state.role);$('#a90-alias').value=state.profile?.username||''}
}

function render(){
 $$('[data-a90-account]').forEach(btn=>{
  btn.classList.toggle('is-authenticated',!!state.user);
  const lab=$('.a90-account-label',btn);if(lab)lab.textContent=state.user?displayName():'Entrar';
  btn.setAttribute('title',state.user?`${displayName()} · ${roleLabel(state.role)}`:'Iniciar sesión o crear cuenta');
 });
 renderModal();
 const card=$('#foro-login');
 if(card){
  const note=$('.auth-note',card);if(note)note.textContent=state.user?`Sesión activa como ${displayName()} · ${roleLabel(state.role)}. Esta cuenta funciona en toda A 90 Files.`:'El acceso por correo está activo y la misma sesión funciona en la web y en el foro.';
  const p=$('.auth-copy p',card);if(p)p.textContent='Correo ya está activo. Google, Facebook, X, Discord y GitHub se habilitarán cuando configuremos sus credenciales OAuth.';
 }
}

function bindHeader(){
 $$('[data-a90-account]').forEach(b=>b.addEventListener('click',openModal));
 const grid=$('.provider-grid');
 if(grid){
  const mapping=['google','facebook','x','discord','github','email'];
  $$(':scope > .provider-item',grid).forEach((item,i)=>{
   item.setAttribute('aria-disabled','false');item.style.cursor='pointer';
   item.title=mapping[i]==='email'?'Entrar o registrarse con correo':'OAuth pendiente de configurar';
   item.addEventListener('click',e=>{e.stopPropagation();if(mapping[i]==='email')openModal();else{openModal();socialPending(mapping[i])}});
  });
 }
}

document.addEventListener('DOMContentLoaded',async()=>{injectModal();bindHeader();await loadIdentity();window.A90Auth={open:openModal,getUser:()=>state.user,getProfile:()=>state.profile,getRole:()=>state.role}});
})();
