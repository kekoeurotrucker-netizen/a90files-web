/* A 90 Files — compartir noticias y artículos (estáticos y CMS). */
(()=>{
  'use strict';
  const pathname=window.location.pathname.replace(/^\/en(?=\/|$)/,'');
  if(!/^\/(?:novedades|actualidad|articulos)\/[^/]+\/?$/.test(pathname))return;
  const main=document.querySelector('main');
  if(!main||document.querySelector('[data-a90-share]'))return;
  const heading=main.querySelector('h1');
  if(!heading)return;

  const english=/^\/en(?:\/|$)/.test(window.location.pathname)
    ||document.documentElement.lang.toLowerCase().startsWith('en');
  const labels=english?{
    eyebrow:'A 90 FILES / SHARE',title:'Share this article',
    intro:'Share this story with your community.',
    copy:'Copy link',copied:'Link copied',failed:'Select and copy the link:',
  }:{
    eyebrow:'A 90 FILES / COMPARTE',title:'Comparte esta noticia',
    intro:'Ayúdanos a dar a conocer los proyectos de A 90 Files.',
    copy:'Copiar enlace',copied:'Enlace copiado',failed:'Selecciona y copia este enlace:',
  };

  // URL canónica, sin parámetros publicitarios. La versión de tarjeta evita
  // reutilizar una vista previa obsoleta tras actualizar su imagen de portada.
  const current=new URL(window.location.pathname,window.location.origin);
  const canonical=document.querySelector('link[rel="canonical"]')?.href;
  if(canonical){
    try{
      const target=new URL(canonical,window.location.origin);
      const normal=p=>p.replace(/\/+$/,'')+'/';
      if(target.origin===current.origin&&normal(target.pathname)===normal(current.pathname))current.pathname=target.pathname;
    }catch{}
  }
  const cover=document.querySelector('meta[name="twitter:image"]')?.content
    ||document.querySelector('meta[property="og:image"]')?.content||'';
  const cardKey=Array.from(cover).reduce((hash,char)=>((hash*31+char.charCodeAt(0))>>>0),2166136261).toString(36);
  current.searchParams.set('card','a90-20261023-'+cardKey);
  const url=current.href;
  const title=(heading.textContent||document.title).replace(/\s+/g,' ').trim()||document.title;
  const encode=encodeURIComponent;

  function elem(tag,cls,text){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!=null)node.textContent=text;
    return node;
  }
  const iconPaths={
    x:'<path d="M18.901 2H22l-6.772 7.74L23.196 22h-6.24l-4.886-7.44L5.56 22H2.46l7.244-8.28L1.87 2h6.4l4.418 6.745L18.901 2Zm-1.095 18h1.717L7.337 3.895H5.495Z"/>',
    facebook:'<path d="M22 12a10 10 0 1 0-11.562 9.876v-6.988H7.898V12h2.54V9.797c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.888h-2.33v6.988A10.002 10.002 0 0 0 22 12Z"/>',
    whatsapp:'<path d="M20.52 3.48A11.83 11.83 0 0 0 12.05 0C5.46 0 .08 5.36.08 11.95c0 2.11.55 4.17 1.6 5.98L0 24l6.23-1.63a12 12 0 0 0 5.81 1.48h.01c6.59 0 11.97-5.37 11.97-11.96a11.88 11.88 0 0 0-3.5-8.41Zm-8.47 18.35a9.94 9.94 0 0 1-5.05-1.38l-.36-.21-3.7.97.99-3.6-.24-.38a9.94 9.94 0 0 1-1.53-5.28C2.16 6.5 6.6 2.07 12.06 2.07a9.82 9.82 0 0 1 7 2.91 9.83 9.83 0 0 1 2.89 7c0 5.45-4.44 9.85-9.9 9.85Zm5.42-7.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.23-.65.08-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.62-.92-2.21-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.08-.79.38-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.1 4.48.71.31 1.27.49 1.7.63.71.22 1.36.19 1.87.12.57-.08 1.77-.72 2.02-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z"/>',
    telegram:'<path d="M22.944 2.476a1.4 1.4 0 0 0-1.488-.23L1.05 10.107c-1.35.55-1.33 1.31-.248 1.64l5.23 1.633 12.107-7.64c.572-.35 1.096-.16.665.224l-9.81 8.853-.38 5.247c.56 0 .81-.256 1.124-.558l2.7-2.626 5.614 4.146c1.033.57 1.777.276 2.034-.956l3.66-17.25c.377-1.51-.57-2.19-1.8-1.54Z"/>',
    linkedin:'<path d="M20.447 20.452h-3.554v-5.57c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.94v5.667H9.351V9h3.413v1.561h.049c.475-.9 1.637-1.85 3.369-1.85 3.603 0 4.268 2.37 4.268 5.455v6.286ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .775 0 1.73v20.54C0 23.225.792 24 1.771 24h20.454C23.203 24 24 23.225 24 22.27V1.73C24 .775 23.203 0 22.225 0Z"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.8"/>'
  };
  function icon(key){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('fill','currentColor');
    svg.setAttribute('aria-hidden','true');
    svg.classList.add('a90-share__icon');
    svg.innerHTML=iconPaths[key];
    return svg;
  }
  const block=elem('aside','a90-share');
  block.setAttribute('data-a90-share','');
  block.setAttribute('aria-label',labels.title);
  const info=elem('div','a90-share__info');
  info.append(elem('span','a90-share__eyebrow',labels.eyebrow));
  info.append(elem('strong','a90-share__title',labels.title));
  info.append(elem('p','a90-share__intro',labels.intro));
  const controls=elem('div','a90-share__controls');

  const networks=[
    {key:'x',name:'X',href:'https://twitter.com/intent/tweet?text='+encode(title)+'&url='+encode(url)},
    {key:'facebook',name:'Facebook',href:'https://www.facebook.com/sharer/sharer.php?u='+encode(url)},
    {key:'whatsapp',name:'WhatsApp',href:'https://api.whatsapp.com/send?text='+encode(title+' — '+url)},
    {key:'telegram',name:'Telegram',href:'https://t.me/share/url?url='+encode(url)+'&text='+encode(title)},
    {key:'linkedin',name:'LinkedIn',href:'https://www.linkedin.com/sharing/share-offsite/?url='+encode(url)}
  ];
  for(const network of networks){
    const a=elem('a','a90-share__button a90-share__button--'+network.key);
    a.href=network.href;
    a.target='_blank';
    a.rel='noopener noreferrer nofollow';
    a.setAttribute('aria-label',(english?'Share on ':'Compartir en ')+network.name);
    const mark=elem('span','a90-share__mark');
    mark.append(icon(network.key));
    mark.setAttribute('aria-hidden','true');
    a.append(mark,elem('span','a90-share__name',network.name));
    controls.append(a);
  }

  const status=elem('span','a90-share__status');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  const copy=elem('button','a90-share__button a90-share__button--copy');
  copy.type='button';
  const copyIcon=elem('span','a90-share__mark');
  copyIcon.append(icon('copy'));
  copyIcon.setAttribute('aria-hidden','true');
  const copyName=elem('span','a90-share__name',labels.copy);
  copy.append(copyIcon,copyName);
  let resetTimer;
  function copied(){
    copyName.textContent=labels.copied;
    copy.classList.add('is-copied');
    status.textContent=labels.copied;
    window.clearTimeout(resetTimer);
    resetTimer=window.setTimeout(()=>{
      copyName.textContent=labels.copy;
      copy.classList.remove('is-copied');
      status.textContent='';
    },2600);
  }
  copy.addEventListener('click',async()=>{
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(url);
      }else{
        const field=elem('textarea');
        field.value=url;
        field.setAttribute('aria-label',labels.copy);
        field.style.cssText='position:fixed;top:0;left:0;opacity:0';
        document.body.append(field);
        field.focus();
        field.select();
        const ok=document.execCommand('copy');
        field.remove();
        if(!ok)throw Error('Copy unavailable');
      }
      copied();
    }catch{
      status.textContent=labels.failed;
      const field=elem('input','a90-share__fallback');
      field.type='text';
      field.value=url;
      field.readOnly=true;
      field.setAttribute('aria-label',labels.failed);
      status.replaceChildren(document.createTextNode(labels.failed),field);
      field.focus();
      field.select();
    }
  });
  controls.append(copy);


  const actions=elem('div','a90-share__actions');
  actions.append(controls,status);
  block.append(info,actions);

  // Los artículos de CMS tienen cabecera dentro de <article>.
  const cmsHeader=main.querySelector('.cms-reading-head');
  if(cmsHeader){
    cmsHeader.after(block);
  }else{
    // En las noticias editoriales, dejamos la barra justo después de la portada.
    const section=heading.closest('section');
    if(section&&section.parentElement===main)section.after(block);
    else{
      const header=heading.closest('header');
      if(header&&header.parentElement===main)header.after(block);
      else main.append(block);
    }
  }
})();
