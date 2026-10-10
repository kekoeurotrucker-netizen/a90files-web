(()=>{'use strict';
const english=location.pathname.startsWith('/en/');
const root=document.querySelector('.a90-lower-modules');
const list=document.querySelector('.news-grid');
if(!root&&!list)return;
async function get(path){const r=await fetch('/api/cms/'+path,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error(String(r.status));return r.json()}
if(root)get('public-modules').then(data=>{
 const cards={software:root.querySelector('.area-card--software'),games:root.querySelector('.area-card--games'),channel:root.querySelector('.area-card--channel'),support:root.querySelector('.area-card--support')};
 for(const item of data.modules||[]){
  const card=cards[item.key];if(!card)continue;
  card.hidden=!item.enabled;
  const title=card.querySelector('.mini-module-title');
  if(title)title.textContent=(english?item.title_en:item.title_es)||title.textContent;
  root.append(card);
 }
}).catch(()=>{});
if(list)get('published').then(data=>{
 const items=Array.isArray(data.articles)?data.articles:[];
 if(!items.length)return;
 const fragment=document.createDocumentFragment();
 for(const item of items){
  const card=document.createElement('a');card.className='news-card news-card--cms';
  card.href=(english?'/en/':'/')+'articulos/'+encodeURIComponent(item.slug)+'/';
  if(item.cover_path&&item.cover_path.startsWith('/assets/')){
   const img=document.createElement('img');img.src=item.cover_path;img.alt='';img.loading='lazy';card.append(img);
  }
  const body=document.createElement('div');body.className='news-card-copy';
  const time=document.createElement('time');time.textContent=new Date(item.published_at||item.created_at).toLocaleDateString(english?'en-GB':'es-ES',{day:'2-digit',month:'short',year:'numeric'});
  const kicker=document.createElement('div');kicker.className='news-kicker';kicker.textContent=english?'A90 FILES · ARTICLE':'A90 FILES · ARTÍCULO';
  const h=document.createElement('h3');h.textContent=(english&&item.title_en)||item.title_es;
  const p=document.createElement('p');p.textContent=(english&&item.excerpt_en)||item.excerpt_es;
  body.append(time,kicker,h,p);card.append(body);fragment.append(card);
 }
 list.prepend(fragment);
}).catch(()=>{});
})();