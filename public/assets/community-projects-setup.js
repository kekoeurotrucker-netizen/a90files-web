(()=>{
'use strict';
const out=document.getElementById('setup-status');
(async()=>{
  try{
    const r=await fetch('/api/admin/community-projects-setup',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d?.error||'No se pudo completar la configuración.');
    out.textContent=`Listo. Categoría creada y hilo oficial publicado (tema #${d.topic_id}).`;
    const a=document.createElement('a');a.href=`/foro/?t=${encodeURIComponent(d.topic_id)}`;a.textContent='Abrir hilo oficial';a.style.display='inline-block';a.style.marginTop='12px';out.after(a);
  }catch(e){out.textContent=e.message||'No se pudo completar la configuración.'}
})();
})();
