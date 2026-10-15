/* A90 Files home v3: real links; keyboard/touch-friendly carousel and forum API. */
(()=>{'use strict';
const root=document.querySelector('.a90-home-v3');
if(!root)return;
const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
const carousel=root.querySelector('[data-a90-main-carousel]');
if(carousel){
 const slides=[...carousel.querySelectorAll('[data-a90-main-slide]')];
 const dots=[...carousel.querySelectorAll('[data-a90-main-dot]')];
 const counter=carousel.querySelector('[data-a90-main-count]');
 let index=0,timer=null,paused=false;
 function render(next){
   index=(next+slides.length)%slides.length;
   slides.forEach((slide,i)=>{const active=i===index;slide.hidden=!active;slide.classList.toggle('is-active',active);slide.setAttribute('aria-hidden',String(!active));});
   dots.forEach((dot,i)=>{const active=i===index;dot.classList.toggle('is-active',active);dot.setAttribute('aria-current',String(active));});
   if(counter)counter.textContent=String(index+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
 }
 function stop(){if(timer){clearInterval(timer);timer=null}}
 function start(){stop();if(!reduce&&!paused&&!document.hidden)timer=setInterval(()=>render(index+1),10000)}
 function go(next){render(next);start()}
 carousel.querySelector('[data-a90-main-prev]')?.addEventListener('click',()=>go(index-1));
 carousel.querySelector('[data-a90-main-next]')?.addEventListener('click',()=>go(index+1));
 dots.forEach((dot,i)=>dot.addEventListener('click',()=>go(i)));
 carousel.addEventListener('mouseenter',()=>{paused=true;stop()});
 carousel.addEventListener('mouseleave',()=>{paused=false;start()});
 carousel.addEventListener('focusin',()=>{paused=true;stop()});
 carousel.addEventListener('focusout',e=>{if(!carousel.contains(e.relatedTarget)){paused=false;start()}});
 carousel.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(index+(e.key==='ArrowRight'?1:-1))}});
 document.addEventListener('visibilitychange',start);
 let touchX=null;
 carousel.querySelector('.a90-feature-stage')?.addEventListener('touchstart',e=>{touchX=e.touches[0]?.clientX??null},{passive:true});
 carousel.querySelector('.a90-feature-stage')?.addEventListener('touchend',e=>{const dx=(e.changedTouches[0]?.clientX??0)-(touchX??0);if(touchX!==null&&Math.abs(dx)>65)go(index+(dx<0?1:-1));touchX=null},{passive:true});
 render(0);start();
}
const track=root.querySelector('[data-a90-project-track]');
if(track){
 function scroll(direction){const first=track.querySelector('.a90-project-tile');const dist=(first?.getBoundingClientRect().width||220)+12;track.scrollBy({left:direction*dist*2,behavior:reduce?'auto':'smooth'})}
 root.querySelector('[data-a90-project-prev]')?.addEventListener('click',()=>scroll(-1));
 root.querySelector('[data-a90-project-next]')?.addEventListener('click',()=>scroll(1));
}
const lookup=[
 ['Pilot Station','Inicio de Windows, gestor de arranque, StartWise','/software/pilot-station/'],
 ['VaultPool Storage','Almacenamiento multinube, archivos, Google Drive, Dropbox, R2','/software/vaultpool/'],
 ['Marea Studio Composer','Composición, audio, música, IA','/software/marea-studio/'],
 ['AutoMiner','Minería GPU CPU rendimiento','/software/autominer/'],
 ['KookiKeeper','Sesiones cookies navegadores','/software/kookikeeper/'],
 ['Project Trucker 3D','Videojuego, simulador de camiones, Logistic Trucker','/juegos/project-trucker/'],
 ['Surviving the Fallout','Juego de supervivencia en desarrollo','/juegos/surviving-the-fallout/'],
 ['Noticias','Novedades noticias desarrollos','/novedades/'],
 ['Descargas','Microsoft Store versiones instaladores','/descargas/'],
 ['Guías y manuales','Tutoriales documentación preguntas frecuentes','/guias/'],
 ['Soporte','Ayuda incidencias errores','/soporte/'],
 ['Foro','Comunidad feedback sugerencias','/foro/'],
 ['A 90 por Hora','Canal videos camiones','/canal/']
];
const search=root.querySelector('[data-a90-search]'),input=search?.querySelector('input'),results=search?.querySelector('.a90-search-results');
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function findMatches(query){const text=norm(query.trim());return text?lookup.filter(([name,keywords])=>norm(name+' '+keywords).includes(text)).slice(0,7):[]}
function showMatches(){
 if(!input||!results)return;
 const text=input.value.trim();results.replaceChildren();const matches=findMatches(text);
 results.hidden=!text;input.setAttribute('aria-expanded',String(Boolean(text)));
 if(!text)return;
 if(!matches.length){const msg=document.createElement('p');msg.textContent='No hay proyectos o secciones con ese nombre.';results.append(msg);return}
 for(const [name,keywords,url] of matches){const a=document.createElement('a');a.href=url;a.textContent=name+' ↗';a.title=keywords;results.append(a)}
}
input?.addEventListener('input',showMatches);
input?.addEventListener('keydown',e=>{if(e.key==='Escape'){results.hidden=true;input.setAttribute('aria-expanded','false');input.blur()}});
search?.addEventListener('submit',e=>{e.preventDefault();const first=findMatches(input.value)?.[0];if(first){location.assign(first[2])}else{showMatches()}});
document.addEventListener('click',e=>{if(search&&!search.contains(e.target)&&results){results.hidden=true;input?.setAttribute('aria-expanded','false')}});
const feed=root.querySelector('[data-a90-forum-feed]');
if(feed){
 const forumFallback=(message)=>{feed.replaceChildren();const p=document.createElement('p');p.textContent=message;const link=document.createElement('a');link.href='/foro/';link.textContent='Visitar el foro ↗';feed.append(p,link)};
 const formatDate=v=>{const dt=new Date(v);return Number.isNaN(dt.getTime())?'':new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short'}).format(dt)};
 const toSlug=s=>typeof s==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
 const safeHref=topic=>{
   const cat=topic.category?.slug,slug=topic.slug;
   return toSlug(cat)&&toSlug(slug)?'/foro/'+encodeURIComponent(cat)+'/'+encodeURIComponent(slug)+'/':'/foro/?t='+encodeURIComponent(topic.id||'');
 };
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),8500);
 fetch('/api/forum/recent',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal})
 .then(async r=>{if(!r.ok)throw new Error('API offline');return r.json()})
 .then(data=>{
   feed.replaceChildren();const topics=Array.isArray(data.topics)?data.topics.slice(0,4):[];
   if(!topics.length){forumFallback('Todavía no hay temas públicos recientes.');return}
   for(const topic of topics){
     const a=document.createElement('a');a.href=safeHref(topic);
     const txt=document.createElement('span');
     const title=document.createElement('strong');title.textContent=topic.title||'Tema del foro';
     const meta=document.createElement('small');
     meta.textContent=[topic.category?.name,topic.author?.display_name||topic.author?.username,formatDate(topic.created_at)].filter(Boolean).join(' · ');
     const arrow=document.createElement('b');arrow.textContent='↗';
     txt.append(title,meta);a.append(txt,arrow);feed.append(a);
   }
 }).catch(()=>forumFallback('La actividad del foro no se puede consultar ahora.')).finally(()=>clearTimeout(timeout));
}
})();