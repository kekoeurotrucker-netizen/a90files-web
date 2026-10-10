/* A 90 Files · Homepage four-card editorial rotators + real public forum activity.
   Content and links are supplied by the existing, read-only public forum endpoint. */
(()=>{
'use strict';
const roots=[...document.querySelectorAll('.a90-lower-modules [data-mini-carousel]')];
if(!roots.length)return;
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
const english=document.documentElement.lang==='en'||location.pathname.startsWith('/en/');
const rootPrefix=english?'/en/foro/':'/foro/';
const translations=new Map(Object.entries({
'PROYECTOS':'PROJECTS','DESARROLLO':'DEVELOPMENT','MÁS VISTOS':'MOST VIEWED','COMUNIDAD':'COMMUNITY',
'Juegos':'Games','Soporte y foro':'Support & Forum','Ver sección':'Explore',
'VaultPool Storage':'VaultPool Storage','Tu almacenamiento multinube, en Microsoft Store.':'Your multi-cloud storage, on Microsoft Store.',
'Descubrir VaultPool':'Explore VaultPool','Marea Studio Composer':'Marea Studio Composer',
'Tu estudio de creación musical local. Próximamente en Store.':'Your local music creation studio. Coming soon to the Store.',
'Descubrir Marea':'Explore Marea','Minería adaptativa, con prioridad para tu equipo.':'Adaptive mining with your hardware as the priority.',
'Conocer AutoMiner':'Discover AutoMiner','Personalización y optimización inteligente de Windows.':'Intelligent Windows customization and optimization.',
'Conocer StartWise':'Discover StartWise','Del transporte profesional a una nueva simulación 3D.':'From professional trucking to a new 3D simulation.',
'Ver el proyecto':'View the project','Un proyecto futuro. Las bases ya están puestas.':'A future project. Its foundations are already in place.',
'Descubrir el misterio':'Discover the mystery','Reproducir':'Play',
'CENTRO DE AYUDA':'HELP CENTER','¿Necesitas una mano?':'Need a hand?',
'Guías, incidencias y contacto con A 90 Files.':'Guides, issue reports and contact with A 90 Files.',
'Ir a Soporte':'Visit Support','COMUNIDAD EN DIRECTO':'LIVE COMMUNITY',
'Últimos posts':'Latest topics','LA CONVERSACIÓN CONTINÚA':'THE CONVERSATION CONTINUES',
'Últimas respuestas':'Latest replies','Consultando el foro…':'Loading the forum…',
'Todos los temas':'All topics','Ir al foro':'Visit the forum'
}));
if(english){
 const targets=document.querySelectorAll('.a90-lower-modules .mini-module-eyebrow,.a90-lower-modules .mini-module-title,.a90-lower-modules .mini-module-toplink,.a90-lower-modules .mini-name,.a90-lower-modules .mini-desc,.a90-lower-modules .mini-cta,.a90-lower-modules .mini-subline,.a90-lower-modules .mini-forum-more,.a90-lower-modules .mini-forum-wait');
 for(const target of targets){
   for(const node of target.childNodes){
     if(node.nodeType!==3)continue;
     const original=node.nodeValue||'';
     const clean=original.trim();
     let translated=translations.get(clean);
     if(!translated&&clean.includes(' · ')){
       const [prefix,...rest]=clean.split(' · ');
       if(translations.has(rest.join(' · ')))translated=prefix+' · '+translations.get(rest.join(' · '));
     }
     if(translated)node.nodeValue=original.replace(clean,translated);
   }
 }
}
const formatRelative=value=>{
 const d=new Date(value);
 if(!value||Number.isNaN(d.getTime()))return '';
 const minutes=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));
 if(minutes<1)return english?'now':'ahora';
 if(minutes<60)return minutes+(english?'m':' min');
 if(minutes<1440)return Math.floor(minutes/60)+' h';
 if(minutes<10080)return Math.floor(minutes/1440)+' d';
 return new Intl.DateTimeFormat(english?'en-GB':'es-ES',{day:'numeric',month:'short'}).format(d);
};
const hrefFor=(entry,kind)=>{
 const cat=entry?.category,category=english?(cat?.slug_en||cat?.slug):(cat?.slug||cat?.slug_en);
 const topic=kind==='reply'?(english?(entry?.topic_slug_en||entry?.topic_slug):(entry?.topic_slug||entry?.topic_slug_en)):(english?(entry?.slug_en||entry?.slug):(entry?.slug||entry?.slug_en));
 const id=kind==='reply'?entry?.topic_id:entry?.id;
 const valid=v=>typeof v==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
 let url=valid(category)&&valid(topic)?rootPrefix+encodeURIComponent(category)+'/'+encodeURIComponent(topic)+'/':rootPrefix+'?t='+encodeURIComponent(id);
 if(kind==='reply'&&entry?.id)url+='#post-'+encodeURIComponent(entry.id);
 return url;
};
const writeRows=(target,items,kind)=>{
 if(!target)return;
 target.replaceChildren();
 if(!items.length){
   const message=document.createElement('p');message.className='mini-forum-wait';
   message.textContent=kind==='reply'?(english?'No recent replies yet. Start the conversation!':'Todavía no hay respuestas recientes. ¡Participa en el foro!'):(english?'No recent topics yet. Be the first!':'Todavía no hay temas nuevos. ¡Participa en el foro!');
   target.append(message);return;
 }
 for(const item of items.slice(0,3)){
   const link=document.createElement('a');link.className='mini-forum-entry';link.href=hrefFor(item,kind);
   const title=document.createElement('strong');title.textContent=kind==='reply'?(item.topic_title||'Tema'):(item.title||'Tema');
   const meta=document.createElement('small');
   const author=item.author?.display_name||item.author?.username||(english?'Community':'Comunidad');
   const category=item.category?.name||(english?'Forum':'Foro');
   meta.textContent=category+' · '+author+' · '+formatRelative(item.created_at);
   link.append(title,meta);target.append(link);
 }
};
const forumRoot=document.querySelector('.a90-lower-modules [data-forum-carousel]');
let forumLoading=false,forumLoadedAt=0;
async function loadForum(){
 if(!forumRoot||forumLoading)return;
 if(Date.now()-forumLoadedAt<120000)return;
 forumLoading=true;
 try{
   const response=await fetch('/api/forum/recent',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error('Forum unavailable');
   const data=await response.json();
   writeRows(forumRoot.querySelector('[data-forum-topics]'),Array.isArray(data.topics)?data.topics:[],'topic');
   writeRows(forumRoot.querySelector('[data-forum-replies]'),Array.isArray(data.replies)?data.replies:[],'reply');
   forumLoadedAt=Date.now();
 }catch{
   for(const list of forumRoot.querySelectorAll('.mini-forum-list')){
     if(list.querySelector('.mini-forum-entry'))continue;
     list.replaceChildren();
     const msg=document.createElement('p');msg.className='mini-forum-wait';
     msg.textContent=english?'Activity is unavailable right now. Open the forum directly.':'No se pudo consultar la actividad. Puedes entrar al foro.';
     list.append(msg);
   }
 }finally{forumLoading=false;}
}
for(const [n,root] of roots.entries()){
 const slides=[...root.querySelectorAll('[data-mini-slide]')];
 const dots=[...root.querySelectorAll('[data-mini-dot]')];
 const count=root.querySelector('[data-mini-count]');
 if(!slides.length)return;
 let index=0,timer=0;
 const cycle=[8100,9400,10500,9800][n]||9500;
 const reset=()=>{
   clearTimeout(timer);timer=0;
   if(!reduced?.matches&&!document.hidden&&!root.matches(':hover,:focus-within')&&root.dataset.miniManual!=='true'&&slides.length>1)
     timer=setTimeout(()=>change(index+1),cycle);
 };
 const change=(i,manual=false)=>{
   index=(i+slides.length)%slides.length;
   slides.forEach((slide,j)=>{
     const active=j===index;
     slide.classList.toggle('is-active',active);slide.hidden=!active;
     slide.setAttribute('aria-hidden',String(!active));
   });
   dots.forEach((dot,j)=>dot.setAttribute('aria-current',String(j===index)));
   if(count)count.textContent=String(index+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
   if(manual)root.dataset.miniManual='true';
   if(root===forumRoot&&index>0)void loadForum();
   reset();
 };
 root.querySelector('[data-mini-prev]')?.addEventListener('click',()=>change(index-1,true));
 root.querySelector('[data-mini-next]')?.addEventListener('click',()=>change(index+1,true));
 dots.forEach((dot,j)=>dot.addEventListener('click',()=>change(j,true)));
 root.addEventListener('mouseenter',()=>clearTimeout(timer));
 root.addEventListener('mouseleave',()=>{delete root.dataset.miniManual;reset()});
 root.addEventListener('focusin',()=>clearTimeout(timer));
 root.addEventListener('focusout',()=>{
   if(!root.contains(document.activeElement)){delete root.dataset.miniManual;reset();}
 });
 document.addEventListener('visibilitychange',reset);
 change(0);
}
// Fetch discreetly while the help slide is in view, without waiting for the first rotation.
if(forumRoot)void loadForum();
})();