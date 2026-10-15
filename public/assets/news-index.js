/* A90 Novedades: #historico always points to article 11 of the same
   date-sorted feed shown (max ten articles) in the homepage ticker.
   Waits for asynchronously inserted CMS articles before final alignment. */
(()=>{
'use strict';
const grid=document.querySelector('.news-grid');
if(!grid)return;
const month={ene:0,jan:0,feb:1,mar:2,abr:3,apr:3,may:4,jun:5,jul:6,ago:7,aug:7,sep:8,oct:9,nov:10,dic:11,dec:11};
const stamp=text=>{
  const m=String(text||'').toLowerCase().match(/(\d{1,2})\s+([a-záéíóúñ]{3,})\.?\s+(\d{4})/i);
  if(!m)return 0;
  const mm=month[m[2].normalize('NFD').replace(/[\u0300-\u036f]/g,'').slice(0,3)];
  return mm===undefined?0:Date.UTC(Number(m[3]),mm,Number(m[1]));
};
const normalize=url=>url?.startsWith('/')?url.replace(/\/+$/,'')+'/':'';
const get=(element,href,title,date)=>{
  const key=normalize(href);const when=stamp(date);
  return key&&title&&when?{element,href:key,title:title.trim(),stamp:when}:null;
};
let pending=false;
let cmsReady=false;
let lastScrolledHref='';
let hasCmsLoaded=false;
const fallback=setTimeout(()=>{cmsReady=true;later()},4200);
document.addEventListener('a90:news-cms-ready',()=>{
  hasCmsLoaded=true;cmsReady=true;clearTimeout(fallback);later();
},{once:true});
const update=()=>{
  pending=false;
  const list=[];
  const promo=document.querySelector('.rt-news-promo');
  if(promo)list.push(get(promo,promo.getAttribute('href'),promo.querySelector('strong')?.textContent,promo.querySelector('small')?.textContent));
  const lead=document.querySelector('.news-featured');
  if(lead)list.push(get(lead,lead.querySelector('a[href]')?.getAttribute('href'),lead.querySelector('h2')?.textContent,lead.querySelector('.news-kicker')?.textContent));
  const logistic=document.querySelector('.news-lt-mini');
  if(logistic)list.push(get(logistic,logistic.querySelector('.news-lt-mini-read')?.getAttribute('href'),logistic.querySelector('h2')?.textContent?.replace(/\s+/g,' '),logistic.querySelector('.news-lt-mini-label')?.textContent));
  for(const card of grid.querySelectorAll(':scope > .news-card')){
    list.push(get(card,card.getAttribute('href'),card.querySelector('h3')?.textContent,card.querySelector('time')?.textContent));
  }
  const unique=new Map();
  for(const record of list){
    if(!record)continue;
    const old=unique.get(record.href);
    if(!old||record.stamp>old.stamp)unique.set(record.href,record);
  }
  const sorted=[...unique.values()].sort((a,b)=>b.stamp-a.stamp||a.title.localeCompare(b.title,'es'));
  const eleventh=sorted[10]?.element;
  document.querySelectorAll('#historico').forEach(el=>el.removeAttribute('id'));
  if(!eleventh)return;
  eleventh.id='historico';
  eleventh.style.scrollMarginTop='88px';
  // Wait for async CMS insertion before positioning the 11th article.
  // If the CMS updates after the fallback, realign once only when the 11th changes.
  if(location.hash==='#historico' && cmsReady && eleventh){
    const href=normalize(eleventh.getAttribute('href')||eleventh.querySelector('a[href]')?.getAttribute('href'));
    if(href!==lastScrolledHref){
      lastScrolledHref=href;
      requestAnimationFrame(()=>requestAnimationFrame(()=>eleventh.scrollIntoView({block:'start',behavior:'auto'})));
    }
  }
};
const later=()=>{if(pending)return;pending=true;queueMicrotask(update)};
const observer=new MutationObserver(later);
observer.observe(grid,{childList:true}); // CMS prepends cards after the authored page has loaded.
later();
window.addEventListener('hashchange',()=>{
  if(location.hash==='#historico'){
    lastScrolledHref='';
    later();
  }
});
})();