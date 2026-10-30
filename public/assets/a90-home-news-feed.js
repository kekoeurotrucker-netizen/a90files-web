/* A 90 Files portada: noticias 1–5 en carrusel y 6–10 en scroller.
   Se comparten fuente, fechas y deduplicación, también para noticias CMS. */
(()=>{'use strict';
const root=document.querySelector('.a90-home-v3');
const carousel=root?.querySelector('[data-a90-main-carousel]');
const list=root?.querySelector('[data-a90-news-list]');
if(!carousel||!list)return;
const stage=carousel.querySelector('.a90-feature-stage');
const dotBar=carousel.querySelector('.a90-slide-dots');
const count=carousel.querySelector('[data-a90-main-count]');
const countNews=root.querySelector('[data-a90-news-count]');
const more=root.querySelector('.a90-news-more');
if(!stage||!dotBar)return;
const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
const icons={
 '/novedades/fuera-de-registro-diario-ia-premiere/':'/assets/channel/channel-icon.svg',
 '/novedades/marea-studio-1-3-28-1-3-29-hotfix/':'/assets/marea/marea-icon.webp',
 '/novedades/vaultpool-3-0-11-multinube-espacio-gratis-windows/':'/assets/vaultpool/vaultpool-icon-20261005.png',
 '/novedades/pilot-station/':'/assets/pilot-station/pilot-station-official-icon.png',
 '/novedades/kookikeeper-proximamente-microsoft-store/':'/assets/kookikeeper/icon.webp',
 '/novedades/roadtrip-es-windows-espanol/':'/assets/roadtrip-es/roadtrip-recomp-icon.png',
 '/novedades/vaultpool-v3-estable-nuevas-nubes/':'/assets/vaultpool/vaultpool-icon-20261005.png',
 '/novedades/metal-gear-msx2-port-windows-espanol/':'/assets/metal-gear-msx2/metal-gear-msx2-editorial-art.png',
 '/novedades/marea-studio-1-3-26/':'/assets/marea/marea-icon.webp',
 '/novedades/marea-studio-ya-en-microsoft-store/':'/assets/marea/marea-icon.webp',
 '/novedades/logistic-trucker-primeras-capturas-3d/':'/assets/project-trucker/project-trucker-logo-300.webp',
 '/novedades/surviving-the-fallout/':'/assets/home-modules/games-banner.webp'
};
const projectLinks={
 '/novedades/fuera-de-registro-diario-ia-premiere/':'/proyectos/fuera-de-registro/',
 '/novedades/marea-studio-1-3-28-1-3-29-hotfix/':'/software/marea-studio/',
 '/novedades/vaultpool-3-0-11-multinube-espacio-gratis-windows/':'/descargas/#vaultpool',
 '/novedades/vaultpool-v3-estable-nuevas-nubes/':'/software/vaultpool/',
 '/novedades/metal-gear-msx2-port-windows-espanol/':'/juegos/metal-gear-msx2/',
 '/novedades/pilot-station/':'/software/pilot-station/',
 '/novedades/roadtrip-es-windows-espanol/':'/juegos/',
 '/novedades/kookikeeper-proximamente-microsoft-store/':'/software/kookikeeper/',
 '/novedades/marea-studio-1-3-26/':'/software/marea-studio/'
};
const friendlyHeadlines={
 '/novedades/fuera-de-registro-diario-ia-premiere/':['Fuera de Registro.','GPT aprende Premiere.'],
 '/novedades/marea-studio-1-3-28-1-3-29-hotfix/':['Marea 1.3.30.','PyTorch arreglado.'],
 '/novedades/vaultpool-3-0-11-multinube-espacio-gratis-windows/':['VaultPool 3.0.11.','Tus nubes, a mano.'],
 '/novedades/metal-gear-msx2-ingenieria-inversa-descubrimientos/':['Metal Gear (1987).','Descifrándolo al 100 %.'],
 '/novedades/vaultpool-v3-estable-nuevas-nubes/':['VaultPool V3.','Más nubes.'],
 '/novedades/metal-gear-msx2-port-windows-espanol/':['Metal Gear MSX2.','Port para Windows.'],
 '/novedades/pilot-station/':['Tu inicio.','Bajo control.'],
 '/novedades/roadtrip-es-windows-espanol/':['RoadTrip-ES.','En español.'],
 '/novedades/kookikeeper-proximamente-microsoft-store/':['KookiKeeper.','Tus sesiones.'],
 '/novedades/marea-studio-1-3-26/':['Marea Studio.','Más música.']
};
const monthIndex={ene:0,jan:0,feb:1,mar:2,apr:3,abr:3,may:4,jun:5,jul:6,ago:7,aug:7,sep:8,oct:9,nov:10,dec:11,dic:11};
const dateFromText=text=>{
 const m=String(text||'').toLowerCase().match(/(\d{1,2})\s+([a-záéíóúñ]{3,})\.?\s+(\d{4})/i);
 if(!m)return 0;
 const n=monthIndex[m[2].normalize('NFD').replace(/[\u0300-\u036f]/g,'').slice(0,3)];
 return n===undefined?0:Date.UTC(Number(m[3]),n,Number(m[1]));
};
const dateFrom=(iso,text)=>{
 if(iso){const exact=Date.parse(iso);if(Number.isFinite(exact))return exact}
 return dateFromText(text);
};
const displayDate=stamp=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(stamp));
const pathFrom=href=>{
 try{
  const u=new URL(href,location.origin);
  if(u.origin!==location.origin||!/^\/(?:novedades|articulos)\/[^/]+\/?$/.test(u.pathname))return '';
  return u.pathname.replace(/\/+$/,'')+'/';
 }catch{return ''}
};
const asset=src=>typeof src==='string'&&/^\/assets\/[a-z0-9_./-]+(?:\?[a-z0-9_=&-]+)?$/i.test(src)?src:'';
const textOf=node=>(node?.textContent||'').replace(/\s+/g,' ').trim();
const clip=(value,max=170)=>value.length>max?value.slice(0,max-1).trimEnd()+'…':value;
function makeItem(values){
 const href=pathFrom(values.href),title=String(values.title||'').trim(),stamp=Number(values.stamp)||0;
 if(!href||!title||!stamp)return null;
 return {href,title,stamp,date:displayDate(stamp),
  summary:String(values.summary||'').trim(),kicker:String(values.kicker||'').trim(),
  icon:icons[href]||asset(values.icon),cover:asset(values.cover),
  weight:Number(values.weight)||0};
}
function fromEditorial(doc){
 const out=[];
 const push=(href,title,time,date,cover,summary,kicker,icon,weight)=>{
  const item=makeItem({href,title,stamp:dateFrom(time,date),cover,summary,kicker,icon,weight});
  if(item)out.push(item);
 };
 for(const card of doc.querySelectorAll('.news-grid > .news-card')){
  const body=card.querySelector('.news-card-copy');
  push(card.getAttribute('href'),textOf(card.querySelector('h3')),card.dataset.publishedAt,
   textOf(card.querySelector('time')),card.querySelector('img')?.getAttribute('src'),
   textOf(body?.querySelector('p')),textOf(body?.querySelector('.news-kicker')),
   card.querySelector('img')?.getAttribute('src'),3);
 }
 const featured=doc.querySelector('.news-featured');
 if(featured)push(featured.querySelector('a[href]')?.getAttribute('href'),textOf(featured.querySelector('h2')),
  '',textOf(featured.querySelector('.news-kicker')),featured.querySelector('.news-featured-media img')?.getAttribute('src'),
  textOf(featured.querySelector('.news-featured-copy p')),textOf(featured.querySelector('.news-kicker')),
  featured.querySelector('img')?.getAttribute('src'),2);
 const promo=doc.querySelector('.rt-news-promo');
 if(promo)push(promo.getAttribute('href'),textOf(promo.querySelector('strong')),'',
  textOf(promo.querySelector('small')),'/assets/roadtrip-es/port-reference-town.png',
  textOf(promo.querySelector('p')),'PORT WINDOWS · EN DESARROLLO',
  promo.querySelector('img')?.getAttribute('src'),2);
 const mini=doc.querySelector('.news-lt-mini');
 if(mini)push(mini.querySelector('a[href]')?.getAttribute('href'),textOf(mini.querySelector('h2')),'',
  textOf(mini.querySelector('.news-lt-mini-label')),mini.querySelector('img')?.getAttribute('src'),
  textOf(mini.querySelector('p')),'VIDEOJUEGOS · DESARROLLO',
  mini.querySelector('img')?.getAttribute('src'),2);
 return out;
}
function fromPreloaded(){
 const out=[];
 for(const slide of stage.querySelectorAll('[data-a90-main-slide]')){
  const title=slide.dataset.newsTitle||textOf(slide.querySelector('h1,h2'));
  const item=makeItem({href:slide.dataset.newsHref||slide.querySelector('.a90-feature-image')?.getAttribute('href'),
   title,stamp:dateFrom(slide.dataset.newsDate,''),kicker:textOf(slide.querySelector('.a90-state')),
   summary:textOf(slide.querySelector('p')),cover:slide.querySelector('.a90-feature-image img')?.getAttribute('src'),
   icon:slide.querySelector('.a90-hero-icon,.a90-pilot-wordmark')?.getAttribute('src'),weight:1});
  if(item)out.push(item);
 }
 for(const a of list.querySelectorAll('a.a90-news-entry')){
  const item=makeItem({href:a.getAttribute('href'),title:textOf(a.querySelector('strong')),
   stamp:dateFrom(a.dataset.newsDate,textOf(a.querySelector('small'))),
   cover:a.querySelector('img')?.getAttribute('src'),icon:a.querySelector('img')?.getAttribute('src'),weight:0});
  if(item)out.push(item);
 }
 return out;
}
function sortUnique(items){
 const unique=new Map();
 for(const item of items){
  if(!item)continue;
  const previous=unique.get(item.href);
  if(!previous||item.stamp>previous.stamp||item.stamp===previous.stamp&&
    (item.weight>previous.weight||item.weight===previous.weight&&item.summary.length>previous.summary.length)){
   unique.set(item.href,item);
  }
 }
 return [...unique.values()].sort((a,b)=>b.stamp-a.stamp||a.title.localeCompare(b.title,'es'));
}
function node(tag,className,text){
 const e=document.createElement(tag);
 if(className)e.className=className;
 if(text!==undefined)e.textContent=text;
 return e;
}
function headline(item){
 if(friendlyHeadlines[item.href])return friendlyHeadlines[item.href];
 const parts=item.title.split(/\s*[:—]\s*/);
 if(parts.length>1&&parts[0].length<=35)return[clip(parts[0],37),clip(parts.slice(1).join(' — '),34)];
 const words=item.title.split(' ');
 if(words.length<=4)return[item.title,''];
 const cut=Math.max(2,Math.min(words.length-1,Math.ceil(words.length*.45)));
 return[clip(words.slice(0,cut).join(' '),35),clip(words.slice(cut).join(' '),34)];
}
function makeSlide(item,i){
 const slide=node('article','a90-feature-slide'+(item.href==='/novedades/metal-gear-msx2-port-windows-espanol/'?' a90-feature-slide--metal-gear':'')+(i===0?' is-active':''));
 slide.setAttribute('data-a90-main-slide','');
 slide.dataset.newsHref=item.href;
 slide.dataset.newsTitle=item.title;
 slide.dataset.newsDate=new Date(item.stamp).toISOString();
 slide.hidden=i!==0;
 const copy=node('div','a90-feature-copy');
 copy.append(node('span','a90-state',clip(item.kicker||'A 90 FILES · NOVEDADES',44)));
 let logo=asset(item.icon);
 if(item.href==='/novedades/pilot-station/')logo='/assets/pilot-station/pilot-station-logo-transparent.png';
 if(logo){
  const img=node('img',item.href==='/novedades/pilot-station/'?'a90-pilot-wordmark':'a90-hero-icon');
  img.src=logo;img.alt='';img.loading=i?'lazy':'eager';
  copy.append(img);
 }
 const [first,second]=headline(item);
 const h=node(i===0?'h1':'h2','a90-news-feature-heading');
 h.title=item.title;
 h.append(document.createTextNode(first));
 if(second){h.append(document.createElement('br'),node('em','',second))}
 copy.append(h);
 copy.append(node('p','',clip(item.summary||item.title,170)));
 const actions=node('div','a90-actions');
 const primary=node('a','a90-button primary','Leer noticia ↗');
 primary.href=item.href;primary.setAttribute('aria-label','Leer noticia: '+item.title);
 const secondary=node('a','a90-button outline',projectLinks[item.href]?'Ver proyecto':'Todas las noticias');
 secondary.href=projectLinks[item.href]||'/novedades/';
 actions.append(primary,secondary);copy.append(actions);
 const chips=node('div','a90-chips');
 chips.append(node('span','',item.date));
 chips.append(node('span','',clip(item.kicker||'A90 FILES',38)));
 copy.append(chips);
 const visual=node('a','a90-feature-image');
 visual.href=item.href;visual.setAttribute('aria-label','Leer noticia: '+item.title);
 const image=node('img');
 image.src=item.href==='/novedades/metal-gear-msx2-port-windows-espanol/'?'/assets/metal-gear-msx2/metal-gear-msx2-editorial-art.png':(item.cover||item.icon||'/assets/brand/a90-velocity.svg');
 image.alt='Imagen de la noticia: '+item.title;
 image.loading=i?'lazy':'eager';if(i===0)image.fetchPriority='high';
 visual.append(image);
 slide.append(copy,visual);
 return slide;
}
let slides=[],dots=[],index=0,timer=null;
function draw(indexNext){
 if(!slides.length)return;
 index=(indexNext+slides.length)%slides.length;
 slides.forEach((slide,i)=>{
  const active=i===index;slide.hidden=!active;
  slide.classList.toggle('is-active',active);
  slide.setAttribute('aria-hidden',String(!active));
 });
 dots.forEach((dot,i)=>{
  const active=i===index;
  dot.classList.toggle('is-active',active);
  dot.setAttribute('aria-current',String(active));
 });
 if(count)count.textContent=String(index+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
}
function stop(){if(timer){clearInterval(timer);timer=null}}
function start(){stop();if(slides.length>1&&!reduce&&!document.hidden)timer=setInterval(()=>draw(index+1),10000)}
function go(next){draw(next);start()}
carousel.querySelector('[data-a90-main-prev]')?.addEventListener('click',()=>go(index-1));
carousel.querySelector('[data-a90-main-next]')?.addEventListener('click',()=>go(index+1));
dotBar.addEventListener('click',e=>{
 const dot=e.target.closest('[data-a90-main-dot]');
 if(dot&&dotBar.contains(dot))go(dots.indexOf(dot));
});
// Avance automático incluso con el ratón encima o tras usar las flechas.
carousel.addEventListener('keydown',e=>{
 if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(index+(e.key==='ArrowRight'?1:-1))}
});
document.addEventListener('visibilitychange',start);
let touchX=null;
stage.addEventListener('touchstart',e=>{touchX=e.touches[0]?.clientX??null},{passive:true});
stage.addEventListener('touchend',e=>{
 const dx=(e.changedTouches[0]?.clientX??0)-(touchX??0);
 if(touchX!==null&&Math.abs(dx)>65)go(index+(dx<0?1:-1));
 touchX=null;
},{passive:true});
function makeNewsEntry(item){
 const a=node('a','a90-news-entry');a.href=item.href;
 const imageSrc=item.icon||item.cover;
 if(imageSrc){const img=node('img');img.src=imageSrc;img.alt='';img.loading='lazy';a.append(img)}
 else{const badge=node('span','a90-news-rt','A90');badge.setAttribute('aria-hidden','true');a.append(badge)}
 const body=node('span');
 body.append(node('strong','',item.title),node('small','',item.date));
 const arrow=node('b','','↗');arrow.setAttribute('aria-hidden','true');
 a.append(body,arrow);
 return a;
}
function render(items){
 const sorted=sortUnique(items);
 if(!sorted.length)return;
 const top=sorted.slice(0,5),rest=sorted.slice(5,10);
 slides=top.map(makeSlide);
 stage.replaceChildren(...slides);
 dots=top.map((item,i)=>{
  const dot=node('button');dot.type='button';dot.setAttribute('data-a90-main-dot','');
  dot.setAttribute('aria-label','Noticia '+(i+1)+': '+item.title);
  return dot;
 });
 dotBar.replaceChildren(...dots);
 draw(0);start();
 list.replaceChildren(...rest.map(makeNewsEntry));
 list.scrollTop=0;
 list.setAttribute('aria-label','Noticias de la sexta a la décima; desplazamiento vertical');
 if(countNews)countNews.textContent=rest.length+' artículo'+(rest.length===1?'':'s');
 if(more){
  more.href=sorted.length>10?'/novedades/#historico':'/novedades/';
  more.setAttribute('aria-label',sorted.length>10?'Ver más artículos a partir de la noticia 11':'Ver todas las noticias');
 }
 carousel.setAttribute('aria-label','Las cinco noticias más recientes');
}
const preloaded=fromPreloaded();
render(preloaded);
// CMS articles may be published at any hour: merge exact timestamps with static news.
Promise.allSettled([
 fetch('/novedades/',{cache:'no-store',credentials:'same-origin'}).then(async r=>{
  if(!r.ok)throw Error('Novedades no disponibles');
  return fromEditorial(new DOMParser().parseFromString(await r.text(),'text/html'));
 }),
 fetch('/api/cms/published',{cache:'no-store',credentials:'same-origin'}).then(async r=>{
  if(!r.ok)throw Error('CMS no disponible');
  const data=await r.json();
  return (Array.isArray(data.articles)?data.articles:[]).map(a=>makeItem({
   href:'/articulos/'+encodeURIComponent(a.slug||'')+'/',
   title:a.title_es,stamp:dateFrom(a.published_at||a.created_at,''),
   summary:a.excerpt_es,kicker:'A90 FILES · ARTÍCULO',
   cover:a.cover_path,icon:a.cover_path,weight:4
  })).filter(Boolean);
 })
]).then(results=>{
 const editorial=results[0].status==='fulfilled'?results[0].value:preloaded;
 const cms=results[1].status==='fulfilled'?results[1].value:[];
 if(editorial.length||cms.length)render([...editorial,...cms]);
}).catch(()=>{});
// Same slow two-way animation; pause on hover, focus, manual scrolling,
// hidden tab, touch devices and reduced-motion preferences.
if(!reduce&&window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches){
 let holdUntil=0;
 const pause=()=>{holdUntil=Date.now()+12000};
 list.addEventListener('wheel',pause,{passive:true});
 list.addEventListener('touchstart',pause,{passive:true});
 list.addEventListener('keydown',pause);
 list.addEventListener('pointerdown',pause);
 let last=0,direction=1;
 const animate=time=>{
  if(!list.isConnected)return;
  if(last&&time-last>=90){
   if(document.visibilityState==='visible'&&!list.matches(':hover')&&!list.matches(':focus-within')&&Date.now()>holdUntil&&list.scrollHeight>list.clientHeight+2){
    const max=list.scrollHeight-list.clientHeight;
    if(list.scrollTop>=max-1)direction=-1;
    else if(list.scrollTop<=1)direction=1;
    list.scrollTop=Math.max(0,Math.min(max,list.scrollTop+direction*0.7));
   }
   last=time;
  }else if(!last)last=time;
  requestAnimationFrame(animate);
 };
 requestAnimationFrame(animate);
}
})();
