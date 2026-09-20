(()=> {
'use strict';

const hero=document.querySelector('.forum-hero');
if(!hero)return;

const POLL_MS=45000;
let panel=null;
let timer=null;

const ROLE_ORDER=['super_admin','admin','moderator','user'];
const ROLE_NAMES={
  super_admin:'Super Admin',
  admin:'Admin',
  moderator:'Moderador',
  user:'Usuario'
};

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

function makeSummary(title,total,counts,online){
  const section=el('section','forum-users-summary '+(online?'online':'offline'));
  const head=el('header','forum-users-summary-head');
  head.append(el('h3','',title),el('span','forum-users-summary-total',String(total||0)));

  const grid=el('div','forum-users-role-grid');
  for(const role of ROLE_ORDER){
    const item=el('div','forum-users-role-item');
    item.append(
      el('span','forum-users-role-name',ROLE_NAMES[role]),
      el('strong','forum-users-role-count',String(Number(counts?.[role])||0))
    );
    grid.append(item);
  }

  section.append(head,grid);
  return section;
}

function ensurePanel(){
  if(panel?.isConnected)return panel;
  panel=el('section','forum-users-panel');
  panel.id='forum-users';
  panel.setAttribute('aria-labelledby','forum-users-title');
  const board=document.querySelector('.board');
  (board||hero).insertAdjacentElement('afterend',panel);
  return panel;
}

function render(data){
  const target=ensurePanel();
  const online=Number(data?.online)||0;
  const offline=Number(data?.offline)||0;
  const total=Number(data?.total)||(online+offline);
  const byRole=data?.by_role||{};

  const head=el('header','forum-users-head');
  const copy=el('div');
  const title=el('h2','', 'Usuarios del foro');title.id='forum-users-title';
  copy.append(el('small','','COMUNIDAD EN VIVO'),title);

  const stats=el('div','forum-users-stats');
  stats.append(
    el('span','forum-users-online-count',`${online} conectados`),
    el('span','',`${total} registrados`)
  );
  head.append(copy,stats);

  const groups=el('div','forum-users-groups');
  groups.append(
    makeSummary('Conectados',online,byRole.online,true),
    makeSummary('Desconectados',offline,byRole.offline,false)
  );

  target.replaceChildren(head,groups);
}

async function refresh(){
  try{
    const session=await api('/api/auth/session');
    if(session?.authenticated){
      await api('/api/forum/presence',{method:'POST'}).catch(()=>{});
    }
    render(await api('/api/forum/users'));
  }catch(error){
    const target=ensurePanel();
    target.replaceChildren(el('p','forum-users-error','No se pudo cargar el resumen de usuarios.'));
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