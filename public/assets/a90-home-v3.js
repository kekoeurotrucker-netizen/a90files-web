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

// A90 latest news realtime: merge all dated editorial pieces with published CMS posts.
const recentNews=root.querySelector('[data-a90-news-list]');
if(recentNews){
  const countEl=root.querySelector('[data-a90-news-count]');
  const monthIndex={ene:0,jan:0,feb:1,mar:2,abr:3,apr:3,may:4,jun:5,jul:6,ago:7,aug:7,sep:8,oct:9,nov:10,dic:11,dec:11};
  const parseDate=text=>{
    if(!text)return 0;
    const m=String(text).toLowerCase().match(/(\d{1,2})\s+([a-záéíóúñ]{3,})\.?\s+(\d{4})/i);
    if(!m)return 0;
    const key=m[2].normalize('NFD').replace(/[\u0300-\u036f]/g,'').slice(0,3);
    const month=monthIndex[key];
    if(month===undefined)return 0;
    const d=Date.UTC(Number(m[3]),month,Number(m[1]));
    return Number.isFinite(d)?d:0;
  };
  const existing=[...recentNews.querySelectorAll('a[href]')].map(a=>({
    href:a.getAttribute('href'),title:a.querySelector('strong')?.textContent?.trim()||'',
    date:a.querySelector('small')?.textContent?.trim()||'',stamp:parseDate(a.querySelector('small')?.textContent),
    icon:a.querySelector('img')?.getAttribute('src')||'',legacy:true
  }));
  const specialIcons={
    '/novedades/pilot-station/':'/assets/pilot-station/pilot-station-official-icon.png',
    '/novedades/kookikeeper-proximamente-microsoft-store/':'/assets/kookikeeper/icon.webp',
    '/novedades/roadtrip-es-windows-espanol/':'/assets/roadtrip-es/roadtrip-recomp-icon.png',
    '/novedades/marea-studio-1-3-26/':'/assets/marea/marea-icon.webp',
    '/novedades/marea-studio-ya-en-microsoft-store/':'/assets/marea/marea-icon.webp',
    '/novedades/logistic-trucker-primeras-capturas-3d/':'/assets/project-trucker/project-trucker-logo-300.webp'
  };
  const displayDate=stamp=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(stamp));
  function render(items){
    const unique=new Map();
    // Respect the actual publication timestamp, never invent dates for undated features.
    for(const item of items){
      if(!item?.href||!item?.title||!item.stamp||!item.href.startsWith('/'))continue;
      const key=item.href.replace(/\/+$/,'')+'/';
      const old=unique.get(key);
      if(!old||item.stamp>old.stamp)unique.set(key,item);
    }
    const latest=[...unique.values()].sort((a,b)=>b.stamp-a.stamp||a.title.localeCompare(b.title,'es')).slice(0,10);
    if(!latest.length)return;
    const list=document.createDocumentFragment();
    for(const item of latest){
      const a=document.createElement('a');a.className='a90-news-entry';a.href=item.href;
      const icon=specialIcons[item.href]!==undefined?specialIcons[item.href]:item.icon||'';
      if(icon&&icon.startsWith('/assets/')){
        const img=document.createElement('img');img.src=icon;img.alt='';img.loading='lazy';a.append(img);
      }else{
        const mark=document.createElement('span');mark.className='a90-news-rt';mark.setAttribute('aria-hidden','true');mark.textContent=item.href.includes('roadtrip')?'RT':'A90';a.append(mark);
      }
      const body=document.createElement('span');
      const title=document.createElement('strong');title.textContent=item.title;
      const date=document.createElement('small');date.textContent=item.date||displayDate(item.stamp);
      const arrow=document.createElement('b');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
      body.append(title,date);a.append(body,arrow);list.append(a);
    }
    recentNews.replaceChildren(list);
    if(countEl)countEl.textContent=latest.length+' artículos';
    recentNews.scrollTop=0;
  }
  Promise.allSettled([
    fetch('/novedades/',{cache:'no-store',credentials:'same-origin'}).then(async r=>{
      if(!r.ok)throw new Error('News index unavailable');
      const doc=new DOMParser().parseFromString(await r.text(),'text/html');
      const items=[];
      for(const card of doc.querySelectorAll('.news-grid > .news-card')){
        const href=card.getAttribute('href')||'';
        const title=card.querySelector('h3')?.textContent?.trim()||'';
        const date=card.querySelector('time')?.textContent?.trim()||'';
        const stamp=parseDate(date);
        const icon=card.querySelector('img')?.getAttribute('src')||'';
        if(stamp&&href&&title)items.push({href,title,date,stamp,icon});
      }
      const featured=doc.querySelector('.news-featured');
      if(featured){
        const href=featured.querySelector('a[href]')?.getAttribute('href');
        const title=featured.querySelector('h2')?.textContent?.trim();
        const date=featured.querySelector('.news-kicker')?.textContent||'';
        if(href&&title&&parseDate(date))items.push({href,title,date:displayDate(parseDate(date)),stamp:parseDate(date)});
      }
      const lt=doc.querySelector('.news-lt-mini');
      if(lt){
        const href=lt.querySelector('a[href]')?.getAttribute('href');
        const title=lt.querySelector('h2')?.textContent?.trim().replace(/\s+/g,' ')||'';
        const date=lt.querySelector('.news-lt-mini-label')?.textContent||'';
        if(href&&title&&parseDate(date))items.push({href,title,date:displayDate(parseDate(date)),stamp:parseDate(date)});
      }
      const promo=doc.querySelector('.rt-news-promo');
      if(promo){
        const href=promo.getAttribute('href'),title=promo.querySelector('strong')?.textContent?.trim();
        const date=promo.querySelector('small')?.textContent||'';
        if(href&&title&&parseDate(date))items.push({href,title,date:displayDate(parseDate(date)),stamp:parseDate(date)});
      }
      return items;
    }),
    fetch('/api/cms/published',{cache:'no-store',credentials:'same-origin'}).then(async r=>{
      if(!r.ok)throw new Error('CMS news unavailable');
      const data=await r.json();
      return (Array.isArray(data.articles)?data.articles:[]).map(article=>{
        const stamp=Date.parse(article.published_at||article.created_at||'')||0;
        return {href:'/articulos/'+encodeURIComponent(article.slug)+'/',title:article.title_es||'',
          date:stamp?displayDate(stamp):'',stamp,icon:article.cover_path?.startsWith('/assets/')?article.cover_path:''};
      }).filter(article=>article.stamp&&article.title);
    })
  ]).then(results=>{
    const additional=results.filter(r=>r.status==='fulfilled').flatMap(r=>r.value);
    // Never re-add retired static news if the live editorial feed loaded.
    const fallback=results[0].status==='fulfilled'?[]:existing;
    if(additional.length||fallback.length)render([...additional,...fallback]);
  }).catch(()=>{});
  // Ticker scrolls slowly like the original, but always allows normal wheel/touch/keyboard scrolling.
  // No automatic motion on touch screens, focused elements, hidden tabs or reduced-motion devices.
  if(!reduce&&window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches){
    let holdUntil=0;
    const pause=()=>{holdUntil=Date.now()+12000};
    recentNews.addEventListener('wheel',pause,{passive:true});
    recentNews.addEventListener('touchstart',pause,{passive:true});
    recentNews.addEventListener('keydown',pause);
    recentNews.addEventListener('pointerdown',pause);
    let last=0,direction=1;
    const animate=time=>{
      if(!recentNews.isConnected)return;
      if(last&&time-last>=90){
        if(document.visibilityState==='visible'&&!recentNews.matches(':hover')&&!recentNews.matches(':focus-within')&&Date.now()>holdUntil&&recentNews.scrollHeight>recentNews.clientHeight+2){
          const max=recentNews.scrollHeight-recentNews.clientHeight;
          if(recentNews.scrollTop>=max-1)direction=-1;
          else if(recentNews.scrollTop<=1)direction=1;
          // Reverse rather than jumping to scrollTop=0 at the end.
          recentNews.scrollTop=Math.max(0,Math.min(max,recentNews.scrollTop+direction*0.7));
        }
        last=time;
      }else if(!last)last=time;
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
}

})();