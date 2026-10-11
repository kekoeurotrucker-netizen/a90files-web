/* A90 Files · VaultPool / Marea Studio spotlight.
   No network or global dependencies; keyboard and motion preferences respected. */
(()=>{
  'use strict';
  const root=document.querySelector('[data-project-spotlight]');
  if(!root)return;
  const slides=[...root.querySelectorAll('[data-spotlight-slide]')];
  const dots=[...root.querySelectorAll('[data-spotlight-dot]')];
  const prev=root.querySelector('[data-spotlight-prev]');
  const next=root.querySelector('[data-spotlight-next]');
  if(slides.length!==2||dots.length!==2||!prev||!next)return;

  const english=document.documentElement.lang==='en'||location.pathname.startsWith('/en/');
  if(english){
    const labels=[
      [prev,'Previous featured project'],[next,'Next featured project'],
      [dots[0],'Show VaultPool'],[dots[1],'Show Marea Studio']
    ];
    for(const [element,label] of labels)element.setAttribute('aria-label',label);
    root.setAttribute('aria-label','Featured projects: VaultPool and Marea Studio');
  }
  const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const delayMs=12500;
  let current=0,timer=null,hovered=false,focused=false;

  const clear=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
  const schedule=()=>{
    clear();
    if(document.hidden||motion?.matches||hovered||focused)return;
    timer=setTimeout(()=>show(current+1),delayMs);
  };
  const show=(index)=>{
    current=(index+slides.length)%slides.length;
    slides.forEach((slide,i)=>{
      const active=i===current;
      slide.hidden=!active;
      slide.classList.toggle('is-active',active);
      slide.setAttribute('aria-hidden',String(!active));
    });
    dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===current)));
    schedule();
  };

  prev.addEventListener('click',()=>show(current-1));
  next.addEventListener('click',()=>show(current+1));
  dots.forEach((dot,i)=>dot.addEventListener('click',()=>show(i)));
  root.addEventListener('mouseenter',()=>{hovered=true;clear();});
  root.addEventListener('mouseleave',()=>{hovered=false;schedule();});
  root.addEventListener('focusin',()=>{focused=true;clear();});
  root.addEventListener('focusout',()=>{
    focused=root.contains(document.activeElement);
    if(!focused)schedule();
  });
  document.addEventListener('visibilitychange',schedule);
  if(motion?.addEventListener)motion.addEventListener('change',schedule);
  show(0);
})();
