(()=>{
'use strict';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const $=(s,r=document)=>r.querySelector(s);

function cleanReturnPath(){
  const u=new URL(location.href);
  u.searchParams.delete('auth_error');
  u.searchParams.delete('provider');
  return u.pathname+u.search;
}

function showMessage(text,type='error'){
  const el=$('#a90-auth-message');
  if(!el)return;
  el.textContent=text;
  el.className='a90-auth-message '+type;
}

async function fetchExtra(){
  try{
    const res=await fetch('/api/auth/extra-providers',{credentials:'same-origin',cache:'no-store'});
    if(!res.ok)throw new Error();
    return await res.json();
  }catch{
    return {available:false,providers:{apple:false},instagram:{supported_for_general_login:false,professional_accounts_only:true}};
  }
}

function ensureModalButtons(extra){
  const grid=$('.a90-social-grid');
  if(!grid)return;

  if(!grid.querySelector('[data-extra-oauth="apple"]')){
    const apple=document.createElement('button');
    apple.type='button';
    apple.className='provider-item provider-apple';
    apple.dataset.extraOauth='apple';
    apple.textContent='Apple';
    grid.appendChild(apple);
    apple.addEventListener('click',()=>startApple(extra));
  }

  if(!grid.querySelector('[data-extra-oauth="instagram"]')){
    const ig=document.createElement('button');
    ig.type='button';
    ig.className='provider-item provider-instagram provider-extra-pending';
    ig.dataset.extraOauth='instagram';
    ig.textContent='Instagram';
    ig.title='Instagram: solo cuentas profesionales mediante la API actual de Meta';
    grid.appendChild(ig);
    ig.addEventListener('click',()=>{
      showMessage('Instagram no ofrece ahora un inicio de sesión general para cuentas personales compatible con este sistema. La API oficial de Meta con Instagram Login está orientada a cuentas profesionales (Business/Creator), así que no vamos a fingir un acceso que la mayoría no podría usar.','error');
    });
  }

  const apple=grid.querySelector('[data-extra-oauth="apple"]');
  const ready=!!extra?.providers?.apple;
  apple?.classList.toggle('is-provider-ready',ready);
  apple?.classList.toggle('provider-extra-pending',!ready);
  if(apple) apple.title=ready?'Continuar con Apple':'Apple preparado · falta configurar Sign in with Apple en Supabase';
}

function ensureForumButtons(extra){
  const grid=$('#foro-login .provider-grid');
  if(!grid)return;

  if(!grid.querySelector('.provider-apple')){
    const apple=document.createElement('span');
    apple.className='provider-item provider-apple';
    apple.textContent='Apple';
    apple.setAttribute('role','button');
    apple.setAttribute('tabindex','0');
    const act=()=>startApple(extra);
    apple.addEventListener('click',act);
    apple.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act()}});
    grid.appendChild(apple);
  }

  if(!grid.querySelector('.provider-instagram')){
    const ig=document.createElement('span');
    ig.className='provider-item provider-instagram provider-extra-pending';
    ig.textContent='Instagram';
    ig.setAttribute('role','button');
    ig.setAttribute('tabindex','0');
    const act=()=>{
      window.A90Auth?.open?.();
      setTimeout(()=>showMessage('Instagram queda visible como opción futura, pero la API oficial actual de Meta solo sirve para cuentas profesionales. No lo activaremos como login general hasta que exista una vía válida para usuarios normales.','error'),30);
    };
    ig.addEventListener('click',act);
    ig.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act()}});
    grid.appendChild(ig);
  }
}

function startApple(extra){
  const ready=!!extra?.providers?.apple;
  if(!ready){
    window.A90Auth?.open?.();
    setTimeout(()=>showMessage('Apple ya está preparado en A 90 Files, pero falta crear/configurar Sign in with Apple en tu cuenta de Apple Developer y habilitar Apple en Supabase.','error'),20);
    return;
  }
  const target='/api/auth/oauth/start?provider=apple&return='+encodeURIComponent(cleanReturnPath());
  location.assign(target);
}

function updateNote(extra){
  const note=$('.a90-provider-note');
  if(!note)return;
  const ready=!!extra?.providers?.apple;
  const base=note.textContent.replace(/\s*Apple[^.]*\.?$/,'').trim();
  note.textContent=base+(ready?' Apple también está disponible.':' Apple queda preparado para activarlo cuando añadamos sus credenciales.');
}

async function init(){
  let tries=0;
  while(!$('.a90-social-grid')&&tries<80){await sleep(50);tries++}
  const extra=await fetchExtra();
  ensureModalButtons(extra);
  ensureForumButtons(extra);
  updateNote(extra);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
