(()=> {
'use strict';

const root=document.getElementById('forum-recent-activity');
if(!root)return;

const el=(tag,className,text)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
};
const nameOf=user=>user?.username||user?.display_name||'Usuario';
const fmtDate=value=>{
  if(!value)return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '';
  const now=Date.now();
  const diff=Math.max(0,now-d.getTime());
  const min=Math.floor(diff/60000);
  if(min<1)return 'ahora';
  if(min<60)return min+' min';
  const h=Math.floor(min/60);
  if(h<24)return h+' h';
  const days=Math.floor(h/24);
  if(days<7)return days+' d';
  return new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short'}).format(d);
};

function row(item,type){
  const href=type==='reply'
    ? '/foro/?t='+encodeURIComponent(item.topic_id)+'#post-'+encodeURIComponent(item.id)
    : '/foro/?t='+encodeURIComponent(item.id);
  const a=el('a','forum-recent-row');
  a.href=href;

  const icon=el('span','forum-recent-icon',type==='reply'?'↩':'#');
  const copy=el('span','forum-recent-copy');
  const title=el('strong','',type==='reply'?item.topic_title:item.title);
  const meta=el('small');
  const cat=item.category?.name||'Foro';
  meta.textContent=cat+' · '+nameOf(item.author)+' · '+fmtDate(item.created_at);
  copy.append(title,meta);

  if(type==='reply'&&item.excerpt){
    copy.append(el('span','forum-recent-excerpt',item.excerpt));
  }
  const arrow=el('span','forum-recent-arrow','›');
  a.append(icon,copy,arrow);
  return a;
}

function module(title,label,items,type){
  const box=el('article','forum-recent-module');
  const head=el('header','forum-recent-head');
  const copy=el('div');
  copy.append(el('small','',label),el('h2','',title));
  const count=el('span','forum-recent-count',String(items.length));
  head.append(copy,count);
  const list=el('div','forum-recent-list');
  if(items.length)items.forEach(item=>list.append(row(item,type)));
  else list.append(el('p','forum-recent-empty',type==='reply'?'Todavía no hay respuestas recientes.':'Todavía no hay temas recientes.'));
  box.append(head,list);
  return box;
}

async function load(){
  try{
    const res=await fetch('/api/forum/recent',{credentials:'same-origin',cache:'no-store'});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data?.error||'No se pudo cargar.');
    root.replaceChildren(
      module('Últimos posts','TEMAS NUEVOS',Array.isArray(data.topics)?data.topics:[],'topic'),
      module('Últimas respuestas','ACTIVIDAD RECIENTE',Array.isArray(data.replies)?data.replies:[],'reply')
    );
    root.classList.add('is-ready');
  }catch{
    root.replaceChildren(el('p','forum-recent-error','No se pudo cargar la actividad reciente del foro.'));
  }
}
load();
})();