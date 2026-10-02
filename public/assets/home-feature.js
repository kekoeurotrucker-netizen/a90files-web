/* A 90 Files / headline carousel; homepage only, independent of app.js */
(()=>{'use strict';
const root=document.querySelector('[data-feature-news]');
if(!root)return;
const slides=[...root.querySelectorAll('[data-feature-slide]')];
const dots=[...root.querySelectorAll('[data-feature-dot]')];
const prev=root.querySelector('[data-feature-prev]');
const next=root.querySelector('[data-feature-next]');
const count=root.querySelector('[data-feature-count]');
const run=root.querySelector('[data-feature-ticker-run]');
const ticker=root.querySelector('[data-feature-ticker-link]');
const announcement=root.querySelector('[data-feature-announcement]');
const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)');
let current=0,timer=null,pointerInside=false,focusInside=false;

function stop(){if(timer!==null){clearInterval(timer);timer=null}}
function canAuto(){return slides.length>1&&!reduce?.matches&&!document.hidden&&!pointerInside&&!focusInside}
function start(){stop();if(canAuto())timer=window.setInterval(()=>activate((current+1)%slides.length,false),9600)}
function activate(index,manual){
  if(!slides.length)return;
  current=(index+slides.length)%slides.length;
  slides.forEach((slide,i)=>{
    const selected=i===current;
    slide.hidden=!selected;
    slide.classList.toggle('is-active',selected);
    slide.setAttribute('aria-hidden',String(!selected));
  });
  dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===current)));
  if(count)count.textContent=String(current+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
  const selected=slides[current];
  const title=selected.dataset.headline||'Novedades';
  const desc=selected.dataset.ticker||'';
  const link=selected.dataset.link||'/novedades/';
  if(run){run.textContent=title+'  —  '+desc;run.style.animation='none';void run.offsetWidth;run.style.animation=''}
  if(ticker){ticker.href=link;ticker.setAttribute('aria-label','Leer: '+title)}
  if(manual&&announcement)announcement.textContent='Novedad '+(current+1)+': '+title;
  start();
}
prev?.addEventListener('click',()=>activate(current-1,true));
next?.addEventListener('click',()=>activate(current+1,true));
dots.forEach((dot,i)=>dot.addEventListener('click',()=>activate(i,true)));
root.addEventListener('mouseenter',()=>{pointerInside=true;stop()});
root.addEventListener('mouseleave',()=>{pointerInside=false;start()});
root.addEventListener('focusin',()=>{focusInside=true;stop()});
root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget)){focusInside=false;start()}});
root.addEventListener('keydown',e=>{
  if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&root.contains(document.activeElement)&&document.activeElement?.closest('.feature-news-controls,.feature-news-dots')){
    e.preventDefault();activate(current+(e.key==='ArrowRight'?1:-1),true);
  }
});
document.addEventListener('visibilitychange',start);
reduce?.addEventListener?.('change',start);
root.querySelectorAll('.feature-news-photo img').forEach(img=>{
  img.addEventListener('error',()=>{img.hidden=true;img.closest('.feature-news-photo')?.classList.add('image-unavailable')},{once:true});
});
activate(0,false);
})();
