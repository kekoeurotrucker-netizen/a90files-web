/* Marea 1.3.26: progressive-enhancement lightbox for real app screenshots. */
(()=>{
'use strict';
const dialog=document.getElementById('m126-lightbox');
const gallery=document.querySelector('[data-marea-gallery]');
if(!dialog||!gallery||typeof dialog.showModal!=='function')return;
const links=[...gallery.querySelectorAll('[data-marea-full]')];
const img=dialog.querySelector('#m126-lightbox-image');
const title=dialog.querySelector('#m126-lightbox-title');
const close=dialog.querySelector('[data-m126-close]');
let current=0;
let trigger=null;
const english=document.documentElement.lang==='en'||location.pathname.startsWith('/en/');
function show(i){
 current=(i+links.length)%links.length;
 const link=links[current];
 const url=link.getAttribute('data-marea-full');
 if(!url||!url.startsWith('/assets/marea/1-3-26/'))return;
 img.src=url;
 img.alt=link.querySelector('img')?.alt||link.getAttribute('data-marea-label')||'Marea Studio';
 title.textContent=(link.getAttribute('data-marea-label')||'Marea Studio')+' · '+(current+1)+'/'+links.length;
}
links.forEach((link,i)=>link.addEventListener('click',e=>{
 if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
 e.preventDefault();trigger=link;show(i);dialog.showModal();close.focus();
}));
close.addEventListener('click',()=>dialog.close());
dialog.querySelector('[data-m126-prev]')?.addEventListener('click',()=>show(current-1));
dialog.querySelector('[data-m126-next]')?.addEventListener('click',()=>show(current+1));
dialog.addEventListener('click',e=>{
 if(e.target===dialog)dialog.close();
});
dialog.addEventListener('close',()=>{if(trigger){trigger.focus();trigger=null;}});
dialog.addEventListener('keydown',e=>{
 if(e.key==='ArrowLeft'){e.preventDefault();show(current-1);}
 else if(e.key==='ArrowRight'){e.preventDefault();show(current+1);}
});
if(english){
 const dict=new Map([['Cerrar ✕','Close ✕'],['← Anterior','← Previous'],['Siguiente →','Next →']]);
 for(const button of dialog.querySelectorAll('button')){
  const value=button.textContent.trim();if(dict.has(value))button.textContent=dict.get(value);
 }
}
})();