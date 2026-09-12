const menuButton=document.querySelector('.menu-button');const mobileNav=document.getElementById('mobile-nav');if(menuButton&&mobileNav){menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')==='true';menuButton.setAttribute('aria-expanded',String(!open));mobileNav.hidden=open;});}const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();

function addStylesheet(href){if(document.querySelector(`link[href="${href}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)}
addStylesheet('/assets/auth.css');

const topbarInner=document.querySelector('.topbar-inner');if(topbarInner&&!document.querySelector('[data-a90-account]')){const btn=document.createElement('button');btn.type='button';btn.className='a90-account-button';btn.setAttribute('data-a90-account','');btn.innerHTML='<span class="a90-account-dot" aria-hidden="true"></span><span class="a90-account-label">Entrar</span>';const menu=topbarInner.querySelector('.menu-button');topbarInner.insertBefore(btn,menu||null)}

const providerGrid=document.querySelector('.provider-grid');if(providerGrid){addStylesheet('/assets/auth-icons.css');const names=['google','facebook','x','discord','github','email'];providerGrid.querySelectorAll(':scope > span').forEach((item,index)=>{const name=names[index];if(!name)return;item.classList.add('provider-item',`provider-${name}`);if(name==='x'){item.textContent='';item.setAttribute('aria-label','X');}})}

const authScript=document.createElement('script');authScript.src='/assets/auth.js';authScript.defer=true;document.head.appendChild(authScript);