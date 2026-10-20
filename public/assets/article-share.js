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

  // Compartimos la URL pública limpia: sin parámetros de campaña ni anclas.
  const current=new URL(window.location.pathname,window.location.origin);
  const canonical=document.querySelector('link[rel="canonical"]')?.href;
  if(canonical){
    try{
      const target=new URL(canonical,window.location.origin);
      const normal=p=>p.replace(/\/+$/,'')+'/';
      if(target.origin===current.origin&&normal(target.pathname)===normal(current.pathname))current.pathname=target.pathname;
    }catch{}
  }
  const url=current.href;
  const title=(heading.textContent||document.title).replace(/\s+/g,' ').trim()||document.title;
  const encode=encodeURIComponent;

  function elem(tag,cls,text){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!=null)node.textContent=text;
    return node;
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
    {key:'x',name:'X',symbol:'𝕏',href:'https://twitter.com/intent/tweet?text='+encode(title)+'&url='+encode(url)},
    {key:'facebook',name:'Facebook',symbol:'f',href:'https://www.facebook.com/sharer/sharer.php?u='+encode(url)},
    {key:'whatsapp',name:'WhatsApp',symbol:'WA',href:'https://api.whatsapp.com/send?text='+encode(title+' — '+url)},
    {key:'telegram',name:'Telegram',symbol:'➤',href:'https://t.me/share/url?url='+encode(url)+'&text='+encode(title)},
    {key:'linkedin',name:'LinkedIn',symbol:'in',href:'https://www.linkedin.com/sharing/share-offsite/?url='+encode(url)}
  ];
  for(const network of networks){
    const a=elem('a','a90-share__button a90-share__button--'+network.key);
    a.href=network.href;
    a.target='_blank';
    a.rel='noopener noreferrer nofollow';
    a.setAttribute('aria-label',(english?'Share on ':'Compartir en ')+network.name);
    const mark=elem('span','a90-share__mark',network.symbol);
    mark.setAttribute('aria-hidden','true');
    a.append(mark,elem('span','a90-share__name',network.name));
    controls.append(a);
  }

  const status=elem('span','a90-share__status');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  const copy=elem('button','a90-share__button a90-share__button--copy');
  copy.type='button';
  const copyIcon=elem('span','a90-share__mark','⧉');
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