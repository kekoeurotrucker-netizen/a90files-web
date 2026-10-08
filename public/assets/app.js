const menuButton=document.querySelector('.menu-button');const mobileNav=document.getElementById('mobile-nav');if(menuButton&&mobileNav){menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')==='true';menuButton.setAttribute('aria-expanded',String(!open));mobileNav.hidden=open;});}const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
{let fav=document.querySelector('link[rel~="icon"]');if(!fav){fav=document.createElement('link');fav.rel='icon';document.head.appendChild(fav)}fav.type='image/svg+xml';fav.href='/assets/brand/a90-velocity.svg?v=20261005-favicon-2'}
if(!document.querySelector('link[rel~="icon"]')){const fav=document.createElement('link');fav.rel='icon';fav.href='/favicon.ico?v=20261005-a90';document.head.appendChild(fav)}

function addStylesheet(href){if(document.querySelector(`link[href="${href}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)}
function addScript(src){if(document.querySelector(`script[src="${src}"]`))return;const s=document.createElement('script');s.src=src;s.defer=true;document.head.appendChild(s)}
addStylesheet('/assets/auth.css?v=20261006-email-avatar-1');
addStylesheet('/assets/auth-icons.css');
addStylesheet('/assets/auth-extra.css?v=20261009-user-notifications-1');
addStylesheet('/assets/software-menu.css?v=20261009-elegant-icons-1');
addStylesheet('/assets/social-global.css?v=20260916-social-3');
addStylesheet('/assets/header-velocity.css?v=20261004-v3');
addStylesheet('/assets/staff-notifications.css?v=20261005-1');

const softwareProjects=[
  {href:'/software/vaultpool/',name:'VaultPool Storage',meta:'Multinube local · Windows',icon:'/assets/vaultpool/vaultpool-icon-20261005.png?v=1',key:'vaultpool'},
  {href:'/software/autominer/',name:'AutoMiner',meta:'Minería adaptativa · Próximamente',icon:'/assets/autominer/autominer-icon.webp',key:'autominer'},
  {href:'/novedades/startwise-en-desarrollo/',name:'StartWise',meta:'Optimización de Windows · En desarrollo',icon:'/assets/startwise/startwise-icon.svg',key:'startwise'},
  {href:'/software/marea-studio/',name:'Marea Studio',meta:'Generación musical local · En desarrollo',icon:'/assets/marea/marea-icon.webp?v=20261005-marea-fixed-2',key:'marea'}
];
function makeProjectLink(project){const a=document.createElement('a');a.href=project.href;a.dataset.project=project.key;const icon=document.createElement('span');icon.className='software-nav-icon';if(project.icon){const img=document.createElement('img');img.src=project.icon;img.alt='';icon.append(img)}else{icon.textContent=project.mark};const copy=document.createElement('span');copy.className='software-nav-item-copy';const strong=document.createElement('strong');strong.textContent=project.name;const small=document.createElement('small');small.textContent=project.meta;copy.append(strong,small);a.append(icon,copy);return a}
function enhanceSoftwareNavigation(){const path=location.pathname;document.querySelectorAll('.nav').forEach(nav=>{if(nav.querySelector('.software-nav'))return;const link=[...nav.children].find(el=>el.tagName==='A'&&new URL(el.getAttribute('href')||'',location.origin).pathname==='/software/');if(!link)return;const details=document.createElement('details');details.className='software-nav';const summary=document.createElement('summary');summary.className='software-nav-trigger';if(path.startsWith('/software/'))summary.classList.add('active');summary.setAttribute('aria-label','Software: abrir proyectos');const label=document.createElement('span');label.textContent='Software';const chev=document.createElement('span');chev.className='software-nav-chevron';chev.setAttribute('aria-hidden','true');chev.textContent='⌄';summary.append(label,chev);const menu=document.createElement('div');menu.className='software-nav-menu';menu.setAttribute('aria-label','Proyectos de software');softwareProjects.forEach(p=>menu.append(makeProjectLink(p)));details.append(summary,menu);link.replaceWith(details)});if(mobileNav&&!mobileNav.querySelector('.mobile-software-nav')){const link=[...mobileNav.children].find(el=>el.tagName==='A'&&new URL(el.getAttribute('href')||'',location.origin).pathname==='/software/');if(link){const details=document.createElement('details');details.className='mobile-software-nav';const summary=document.createElement('summary');summary.textContent='Software';const menu=document.createElement('div');menu.className='mobile-software-menu';softwareProjects.forEach(p=>{const a=document.createElement('a');a.href=p.href;a.textContent=p.name;menu.append(a)});details.append(summary,menu);link.replaceWith(details)}}}
enhanceSoftwareNavigation();
function ensureDownloadsNav(){
  for(const nav of document.querySelectorAll('.nav,#mobile-nav')){
    if(nav.querySelector('a[href="/descargas/"]'))continue;
    const link=document.createElement('a');link.href='/descargas/';link.textContent='Descargas';
    if(location.pathname.startsWith('/descargas/'))link.classList.add('active');
    const before=[...nav.querySelectorAll('a')].find(el=>el.getAttribute('href')==='/novedades/')
      || [...nav.querySelectorAll('a')].find(el=>el.getAttribute('href')==='/soporte/');
    nav.insertBefore(link,before||null);
  }
}
ensureDownloadsNav();
document.addEventListener('click',event=>{document.querySelectorAll('.software-nav[open]').forEach(item=>{if(!item.contains(event.target))item.removeAttribute('open')})});document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.software-nav[open],.mobile-software-nav[open]').forEach(item=>item.removeAttribute('open'))});

const topbarInner=document.querySelector('.topbar-inner');if(topbarInner&&!document.querySelector('[data-a90-account]')){const btn=document.createElement('button');btn.type='button';btn.className='a90-account-button';btn.setAttribute('data-a90-account','');btn.innerHTML='<span class="a90-account-avatar" aria-hidden="true"><span class="a90-account-monogram">↗</span><span class="a90-account-dot"></span></span><span class="a90-account-label">Entrar</span><span class="a90-account-chevron" aria-hidden="true"></span>';const menu=topbarInner.querySelector('.menu-button');topbarInner.insertBefore(btn,menu||null)}

const providerGrid=document.querySelector('.provider-grid');if(providerGrid){const names=['google','facebook','x','discord','github','email'];providerGrid.querySelectorAll(':scope > span').forEach((item,index)=>{const name=names[index];if(!name)return;item.classList.add('provider-item',`provider-${name}`);if(name==='x'){item.textContent='';item.setAttribute('aria-label','X');}})}

const vaultPoolPublicBase='https://ugwdxcmmxeqzoxgdofkd.supabase.co/storage/v1/object/public/vaultpool-public/';
const vaultPoolPublicMap=new Map([
  ['/assets/vaultpool/promo.jpg',vaultPoolPublicBase+'vaultpool-promo.jpg'],
  ['/assets/vaultpool/clouds.jpg',vaultPoolPublicBase+'vaultpool-clouds.jpg'],
  ['/assets/vaultpool/ui-light.jpg',vaultPoolPublicBase+'vaultpool-ui-light.jpg'],
  ['/assets/vaultpool/ui-dark.jpg',vaultPoolPublicBase+'vaultpool-ui-dark.jpg'],
  ['/downloads/Vault-Pool-Storage-Installer.exe',vaultPoolPublicBase+'Vault-Pool-Storage-Installer.exe']
]);
function rewriteVaultPoolPublicAssets(root=document){
  const nodes=[];
  if(root?.matches?.('img[src],a[href]'))nodes.push(root);
  root?.querySelectorAll?.('img[src],a[href]').forEach(n=>nodes.push(n));
  for(const node of nodes){
    const attr=node.tagName==='IMG'?'src':'href';
    const raw=node.getAttribute(attr);if(!raw)continue;
    let path;try{path=new URL(raw,location.origin).pathname}catch{continue}
    const target=vaultPoolPublicMap.get(path);if(!target)continue;
    node.setAttribute(attr,target);
    if(node.tagName==='A'&&path.endsWith('.exe')){node.setAttribute('download','Vault-Pool-Storage-Installer.exe');node.setAttribute('rel','noopener')}
  }
}
rewriteVaultPoolPublicAssets();
const vaultPoolAssetObserver=new MutationObserver(mutations=>{for(const mutation of mutations)for(const node of mutation.addedNodes)if(node.nodeType===1)rewriteVaultPoolPublicAssets(node)});
vaultPoolAssetObserver.observe(document.documentElement,{childList:true,subtree:true});

addScript('/assets/social-global.js?v=20260916-social-3');
addScript('/assets/auth.js?v=20261009-account-header-fix-4');
addScript('/assets/auth-extra.js');
addScript('/assets/staff-notifications.js?v=20261005-1');


function initHomeNewsSlider(){
  document.querySelectorAll('[data-news-slider]').forEach(slider=>{
    const items=[...slider.querySelectorAll('.home-news-item')];
    const prev=slider.querySelector('[data-news-prev]');
    const next=slider.querySelector('[data-news-next]');
    if(items.length<2)return;
    let index=0,timer=null,paused=false;
    const render=()=>{
      items.forEach((item,i)=>{
        item.classList.toggle('is-active',i===index);
        const text=item.querySelector('span');
        if(text){text.style.animation='none';void text.offsetWidth;text.style.animation='';}
      });
    };
    const stop=()=>{if(timer){clearInterval(timer);timer=null;}};
    const start=()=>{stop();if(!paused)timer=setInterval(()=>{index=(index+1)%items.length;render();},8000);};
    const go=step=>{index=(index+step+items.length)%items.length;render();start();};
    prev?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();go(-1);});
    next?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();go(1);});
    slider.addEventListener('mouseenter',()=>{paused=true;stop();});
    slider.addEventListener('mouseleave',()=>{paused=false;start();});
    slider.addEventListener('focusin',()=>{paused=true;stop();});
    slider.addEventListener('focusout',event=>{if(!slider.contains(event.relatedTarget)){paused=false;start();}});
    render();start();
  });
}
initHomeNewsSlider();
