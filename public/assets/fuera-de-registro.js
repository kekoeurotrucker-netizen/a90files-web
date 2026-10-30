/* Reproductores bajo demanda: YouTube no se conecta hasta que se pulsa reproducir. */
(()=>{'use strict';
  for(const button of document.querySelectorAll('[data-fdr-play]')){
    button.addEventListener('click',()=>{
      const id=button.getAttribute('data-fdr-play')||'';
      if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;
      const frame=button.closest('.fdr-media');
      if(!frame||frame.querySelector('iframe'))return;
      const iframe=document.createElement('iframe');
      iframe.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?autoplay=1&rel=0';
      iframe.title='Reproductor de YouTube: '+(button.getAttribute('aria-label')||'Fuera de Registro');
      iframe.loading='lazy';
      iframe.referrerPolicy='strict-origin-when-cross-origin';
      iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen=true;
      frame.append(iframe);
      button.remove();
    },{once:true});
  }
})();
