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
const tickerWindow=root.querySelector('.feature-news-ticker-window');
const ticker=root.querySelector('[data-feature-ticker-link]');
const announcement=root.querySelector('[data-feature-announcement]');
const toggle=root.querySelector('[data-feature-toggle]');
// Match each slide's reading time to its ticker length. Typical slide: ~12–18 seconds.
const TICKER_PX_PER_SECOND=72;
const MIN_TICKER_MS=10500;
const MAX_TICKER_MS=16000;
const FINISH_READING_MS=1700;
let slideDelayMs=MIN_TICKER_MS+FINISH_READING_MS;
const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)');
let current=0,timer=null,userPaused=Boolean(reduce?.matches);

function stop(){if(timer!==null){clearInterval(timer);timer=null}}
function canAuto(){return slides.length>1&&!document.hidden&&!userPaused}
function start(){stop();if(canAuto())timer=window.setTimeout(()=>activate((current+1)%slides.length,false),slideDelayMs)}
function syncToggle(){if(!toggle)return;toggle.textContent=userPaused?'▶':'Ⅱ';toggle.setAttribute('aria-label',userPaused?'Reanudar reproducción automática':'Pausar reproducción automática');toggle.setAttribute('aria-pressed',String(userPaused));}
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
  if(run){
    run.textContent=title+'  —  '+desc;
    run.style.animation='none';
    void run.offsetWidth;
    const windowWidth=tickerWindow?.clientWidth||500;
    // The text begins just outside the right edge. Stop with its final words still visible.
    const textWidth=Math.max(0,run.scrollWidth-windowWidth);
    const tickerMs=Math.max(MIN_TICKER_MS,Math.min(MAX_TICKER_MS,Math.ceil(textWidth/TICKER_PX_PER_SECOND*1000)));
    run.style.setProperty('--feature-ticker-window-width',windowWidth+'px');
    run.style.setProperty('--feature-marquee-duration',tickerMs+'ms');
    slideDelayMs=tickerMs+FINISH_READING_MS;
    run.style.animation='';
  }
  if(ticker){ticker.href=link;ticker.setAttribute('aria-label','Leer: '+title)}
  if(manual&&announcement)announcement.textContent='Novedad '+(current+1)+': '+title;
  start();
}
prev?.addEventListener('click',()=>activate(current-1,true));
next?.addEventListener('click',()=>activate(current+1,true));
dots.forEach((dot,i)=>dot.addEventListener('click',()=>activate(i,true)));
toggle?.addEventListener('click',()=>{userPaused=!userPaused;syncToggle();start()});
root.addEventListener('keydown',e=>{
  if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&root.contains(document.activeElement)&&document.activeElement?.closest('.feature-news-controls,.feature-news-dots')){
    e.preventDefault();activate(current+(e.key==='ArrowRight'?1:-1),true);
  }
});
document.addEventListener('visibilitychange',start);
reduce?.addEventListener?.('change',event=>{if(event.matches){userPaused=true;syncToggle()}start()});
root.querySelectorAll('.feature-news-photo img').forEach(img=>{
  img.addEventListener('error',()=>{img.hidden=true;img.closest('.feature-news-photo')?.classList.add('image-unavailable')},{once:true});
});
syncToggle();
activate(0,false);
})();
