(()=> {
'use strict';

const hero=document.querySelector('.forum-hero');
if(!hero)return;

const POLL_MS=45000;
let panel=null;
let timer=null;

const el=(tag,className,text)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
};

async function api(path,opts={}){
  const res=await fetch(path,{credentials:'same-origin',cache:'no-store',...opts});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.error||'No se pudo cargar.');
  return data;
}

function displayName(user){return user?.username||user?.display_name||'Usuario'}
function roleName(role){return({user:'Usuario',moderator:'Moderador',admin:'Admin',super_admin:'Super Admin'})[role]||'Usuario'}
function initials(user){
  const chars=displayName(user).match(/[A-Za-zÁÉÍÓÚÜÑ0-9]/gi)||['A','9'];
  return chars.slice(0,2).join('').toUpperCase();
}
function safeAvatar(value){
  try{
    const u=new URL(value);
    return u.protocol==='https:'?u.href:null;
  }catch{return null}
}

function makeUser(user){
  const row=el('li','forum-user-row '+(user.is_online?'is-online':'is-offline'));
  const avatar=el('span','forum-user-avatar');
  const src=safeAvatar(user.avatar_url);
  if(src){
    const img=document.createElement('img');
    img.src=src;
    img.alt='';
    img.loading='lazy';
    img.referrerPolicy='no-referrer';
    avatar.append(img);
  }else avatar.textContent=initials(user);

  const copy=el('span','forum-user-copy');
  copy.append(el('strong','',displayName(user)),el('small','',roleName(user.role)));
  const state=el('span','forum-user-state',user.is_online?'Conectado':'Desconectado');
  state.prepend(el('i','forum-user-dot'));
  row.append(avatar,copy,state);
  return row;
}

function makeGroup(title,users,online){
  const section=el('section','forum-users-group '+(online?'online':'offline'));
  const head=el('header','forum-users-group-head');
  head.append(el('h3','',title),el('span','',String(users.length)));
  const list=el('ul','forum-users-list');
  if(users.length)users.forEach(user=>list.append(makeUser(user)));
  else list.append(el('li','forum-users-empty',online?'No hay usuarios conectados ahora mismo.':'No hay usuarios desconectados.'));
  section.append(head,list);
  return section;
}

function ensurePanel(){
  if(panel?.isConnected)return panel;
  panel=el('section','forum-users-panel');
  panel.id='forum-users';
  panel.setAttribute('aria-labelledby','forum-users-title');
  hero.insertAdjacentElement('afterend',panel);
  return panel;
}

function render(data){
  const target=ensurePanel();
  const users=Array.isArray(data.users)?data.users:[];
  const online=users.filter(u=>u?.is_online);
  const offline=users.filter(u=>!u?.is_online);

  const head=el('header','forum-users-head');
  const copy=el('div');
  copy.append(el('small','','COMUNIDAD EN VIVO'),el('h2','', 'Usuarios del foro'));
  const stats=el('div','forum-users-stats');
  stats.append(el('span','forum-users-online-count',`${online.length} conectados`),el('span','',`${users.length} registrados`));
  head.append(copy,stats);

  const groups=el('div','forum-users-groups');
  groups.append(makeGroup('Conectados',online,true),makeGroup('Desconectados',offline,false));
  target.replaceChildren(head,groups);
}

async function refresh(){
  try{
    const session=await api('/api/auth/session');
    if(session?.authenticated){
      await api('/api/forum/presence',{method:'POST'}).catch(()=>{});
    }
    const users=await api('/api/forum/users');
    render(users);
  }catch(error){
    const target=ensurePanel();
    target.replaceChildren(el('p','forum-users-error','No se pudo cargar la lista de usuarios.'));
  }
}

function schedule(){
  clearInterval(timer);
  timer=setInterval(()=>{if(document.visibilityState==='visible')refresh()},POLL_MS);
}

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
refresh();
schedule();
})();