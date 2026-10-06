(() => {
  const NS='http://www.w3.org/2000/svg';

  function applySocialGradients(root=document){
    root.querySelectorAll('.a90-social-link svg').forEach((svg,index)=>{
      if(svg.dataset.a90GradientReady==='1') return;
      svg.dataset.a90GradientReady='1';

      const id='a90-social-gradient-'+index+'-'+Math.random().toString(36).slice(2,8);
      const defs=document.createElementNS(NS,'defs');
      const gradient=document.createElementNS(NS,'linearGradient');

      gradient.setAttribute('id',id);
      gradient.setAttribute('x1','0%');
      gradient.setAttribute('y1','0%');
      gradient.setAttribute('x2','100%');
      gradient.setAttribute('y2','100%');

      [
        ['0%','#67d9ea'],
        ['48%','#8beaf2'],
        ['100%','#f2b35b']
      ].forEach(([offset,color])=>{
        const stop=document.createElementNS(NS,'stop');
        stop.setAttribute('offset',offset);
        stop.setAttribute('stop-color',color);
        gradient.appendChild(stop);
      });

      defs.appendChild(gradient);
      svg.prepend(defs);

      svg.querySelectorAll('path,circle,rect,polygon,ellipse,line,polyline').forEach(shape=>{
        if(shape.closest('defs')) return;
        const currentFill=shape.getAttribute('fill');
        const currentStroke=shape.getAttribute('stroke');

        if(currentFill!=='none'){
          shape.style.setProperty('fill',`url(#${id})`,'important');
        }
        if(currentStroke && currentStroke!=='none'){
          shape.style.setProperty('stroke',`url(#${id})`,'important');
        }
      });
    });
  }

  const run=()=>applySocialGradients(document);
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',run,{once:true});
  }else{
    run();
  }

  const observer=new MutationObserver(()=>applySocialGradients(document));
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();