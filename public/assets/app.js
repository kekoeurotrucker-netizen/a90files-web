const menuButton=document.querySelector('.menu-button');const mobileNav=document.getElementById('mobile-nav');if(menuButton&&mobileNav){menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')==='true';menuButton.setAttribute('aria-expanded',String(!open));mobileNav.hidden=open;});}const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();

function addStylesheet(href){if(document.querySelector(`link[href="${href}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)}
function addScript(src){if(document.querySelector(`script[src="${src}"]`))return;const s=document.createElement('script');s.src=src;s.defer=true;document.head.appendChild(s)}
addStylesheet('/assets/auth.css');
addStylesheet('/assets/auth-icons.css');
addStylesheet('/assets/auth-extra.css');
addStylesheet('/assets/software-menu.css');
addStylesheet('/assets/social-global.css?v=20260916-social-3');

const softwareProjects=[
  {href:'/software/vaultpool/',name:'VaultPool Storage',meta:'Multinube local · Windows',mark:'VP',key:'vaultpool'},
  {href:'/software/logistic-trucker/',name:'Logistic Trucker',meta:'Simulación logística · En desarrollo',mark:'LT',key:'logistic-trucker'}
];
function makeProjectLink(project){const a=document.createElement('a');a.href=project.href;a.dataset.project=project.key;const icon=document.createElement('span');icon.className='software-nav-icon';icon.textContent=project.mark;const copy=document.createElement('span');copy.className='software-nav-item-copy';const strong=document.createElement('strong');strong.textContent=project.name;const small=document.createElement('small');small.textContent=project.meta;copy.append(strong,small);a.append(icon,copy);return a}
function enhanceSoftwareNavigation(){const path=location.pathname;document.querySelectorAll('.nav').forEach(nav=>{if(nav.querySelector('.software-nav'))return;const link=[...nav.children].find(el=>el.tagName==='A'&&new URL(el.getAttribute('href')||'',location.origin).pathname==='/software/');if(!link)return;const details=document.createElement('details');details.className='software-nav';const summary=document.createElement('summary');summary.className='software-nav-trigger';if(path.startsWith('/software/'))summary.classList.add('active');summary.setAttribute('aria-label','Software: abrir proyectos');const label=document.createElement('span');label.textContent='Software';const chev=document.createElement('span');chev.className='software-nav-chevron';chev.setAttribute('aria-hidden','true');chev.textContent='⌄';summary.append(label,chev);const menu=document.createElement('div');menu.className='software-nav-menu';menu.setAttribute('aria-label','Proyectos de software');softwareProjects.forEach(p=>menu.append(makeProjectLink(p)));details.append(summary,menu);link.replaceWith(details)});if(mobileNav&&!mobileNav.querySelector('.mobile-software-nav')){const link=[...mobileNav.children].find(el=>el.tagName==='A'&&new URL(el.getAttribute('href')||'',location.origin).pathname==='/software/');if(link){const details=document.createElement('details');details.className='mobile-software-nav';const summary=document.createElement('summary');summary.textContent='Software';const menu=document.createElement('div');menu.className='mobile-software-menu';softwareProjects.forEach(p=>{const a=document.createElement('a');a.href=p.href;a.textContent=p.name;menu.append(a)});details.append(summary,menu);link.replaceWith(details)}}}
enhanceSoftwareNavigation();
document.addEventListener('click',event=>{document.querySelectorAll('.software-nav[open]').forEach(item=>{if(!item.contains(event.target))item.removeAttribute('open')})});document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.software-nav[open],.mobile-software-nav[open]').forEach(item=>item.removeAttribute('open'))});

const topbarInner=document.querySelector('.topbar-inner');if(topbarInner&&!document.querySelector('[data-a90-account]')){const btn=document.createElement('button');btn.type='button';btn.className='a90-account-button';btn.setAttribute('data-a90-account','');btn.innerHTML='<span class="a90-account-dot" aria-hidden="true"></span><span class="a90-account-label">Entrar</span>';const menu=topbarInner.querySelector('.menu-button');topbarInner.insertBefore(btn,menu||null)}

const providerGrid=document.querySelector('.provider-grid');if(providerGrid){const names=['google','facebook','x','discord','github','email'];providerGrid.querySelectorAll(':scope > span').forEach((item,index)=>{const name=names[index];if(!name)return;item.classList.add('provider-item',`provider-${name}`);if(name==='x'){item.textContent='';item.setAttribute('aria-label','X');}})}

addScript('/assets/social-global.js?v=20260916-social-3');
addScript('/assets/auth.js');
addScript('/assets/auth-extra.js');
