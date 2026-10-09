(()=>{'use strict';
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('[data-mini-carousel]').forEach(root=>{
 const slides=[...root.querySelectorAll('[data-mini-slide]')],dots=[...root.querySelectorAll('[data-mini-dot]')],count=root.querySelector('[data-mini-count]');
 if(!slides.length)return;
 let index=0,timer=0;
 const change=(i,manual=false)=>{
  index=(i+slides.length)%slides.length;
  slides.forEach((s,j)=>{const active=j===index;s.classList.toggle('is-active',active);s.hidden=!active;s.setAttribute('aria-hidden',String(!active));});
  dots.forEach((d,j)=>d.setAttribute('aria-current',String(j===index)));
  if(count)count.textContent=String(index+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
  if(manual)root.dataset.miniManual='true';
  reset();
 };
 const reset=()=>{
  clearTimeout(timer);timer=0;
  if(!reduce.matches&&!document.hidden&&!root.matches(':hover,:focus-within')&&root.dataset.miniManual!=='true'&&slides.length>1)
   timer=setTimeout(()=>change(index+1),6500);
 };
 root.querySelector('[data-mini-prev]')?.addEventListener('click',()=>change(index-1,true));
 root.querySelector('[data-mini-next]')?.addEventListener('click',()=>change(index+1,true));
 dots.forEach((d,i)=>d.addEventListener('click',()=>change(i,true)));
 root.addEventListener('mouseenter',()=>clearTimeout(timer));
 root.addEventListener('mouseleave',()=>{delete root.dataset.miniManual;reset()});
 root.addEventListener('focusin',()=>clearTimeout(timer));
 root.addEventListener('focusout',()=>{if(!root.contains(document.activeElement)){delete root.dataset.miniManual;reset()}});
 document.addEventListener('visibilitychange',reset);
 change(0);
});
})();