(()=>{
'use strict';
const LOCALE_KEY='a90_preferred_language';
const english=location.pathname==='/en'||location.pathname.startsWith('/en/');
let selected=english?'en':'es';
const dictionary=(()=>{try{return JSON.parse(document.querySelector('#a90-locale-catalog')?.textContent||'{}')}catch{return {}}})();
function getStored(){try{const x=localStorage.getItem(LOCALE_KEY);return x==='en'||x==='es'?x:null}catch{return null}}
function remember(lang){try{localStorage.setItem(LOCALE_KEY,lang)}catch{}}
function localizedPath(path,lang){
  if(!path||path.startsWith('//'))return path;
  const canonical=path.replace(/^\/en(?=\/|$)/,'')||'/';
  if((/^\/(?:api|assets|downloads|\.well-known)(?:\/|$)/.test(canonical) || (canonical.startsWith('/admin/')&&canonical!=='/admin/analytics/'))||/^\/favicon/.test(canonical))return canonical;
  return lang==='en'?'/en'+(canonical==='/'?'/':canonical):canonical;
}
function pathWithQuery(lang){return localizedPath(location.pathname,lang)+location.search+location.hash}
function browserLanguage(){return (navigator.languages?.[0]||navigator.language||'es').toLowerCase().startsWith('es')?'es':'en'}
const saved=getStored();
if(!english && saved==='en' && !/^\/(?:api|assets|admin)\b/.test(location.pathname)){
  location.replace(pathWithQuery('en'));return;
}
if(!english && !saved && browserLanguage()==='en' && !location.pathname.startsWith('/admin/')){
  location.replace(pathWithQuery('en'));return;
}
function flag(code){
 if(code==='es')return '<svg class="a90-language-flag" viewBox="0 0 32 22" aria-hidden="true"><rect width="32" height="22" rx="2" fill="#c51b29"/><rect y="5.5" width="32" height="11" fill="#f8d348"/><rect x="8" y="8" width="3" height="6" rx=".7" fill="#ba2028"/><path d="M8 8h3v2H8z" fill="#fff0a6"/></svg>';
 return '<svg class="a90-language-flag" viewBox="0 0 32 22" aria-hidden="true"><rect width="32" height="22" rx="2" fill="#173b84"/><path d="M0 0l32 22M32 0L0 22" stroke="#fff" stroke-width="5"/><path d="M0 0l32 22M32 0L0 22" stroke="#cc1936" stroke-width="2"/><path d="M16 0v22M0 11h32" stroke="#fff" stroke-width="8"/><path d="M16 0v22M0 11h32" stroke="#c81938" stroke-width="4"/></svg>';
}
function syncLinks(root=document){
 if(!english)return;
 const links=[];
 if(root.nodeType===1&&root.matches?.('a[href]'))links.push(root);
 root.querySelectorAll?.('a[href]').forEach(x=>links.push(x));
 for(const a of links){
   const href=a.getAttribute('href');
   if(href?.startsWith('/')&&!href.startsWith('//')&&!href.startsWith('/en/')){
     a.setAttribute('href',localizedPath(href,'en'));
   }
 }
}
function excluded(node){
 const el=node.parentElement;
 return !el || !!el.closest('script,style,code,pre,textarea,input,select,[contenteditable],.forum-live-body,.forum-live-preview,.forum-quote-body,.forum-post-translation,.forum-post-user,.forum-translation-tools,.forum-direct-reply-excerpt,.forum-topic-title,.forum-reply-context,.a90-language-switcher,[data-no-translate]');
}
function translateNode(node){
 if(!english||excluded(node))return;
 const value=node.nodeValue||'',key=value.trim(),translated=dictionary[key];
 if(translated&&translated!==key){
   const left=value.match(/^\s*/)?.[0]||'',right=value.match(/\s*$/)?.[0]||'';
   node.nodeValue=left+translated+right;
 }
}
function walk(root){
 if(!english)return;
 if(root.nodeType===3){translateNode(root);return}
 if(root.nodeType!==1)return;
 if(root.closest?.('.forum-live-body,.forum-live-preview,.forum-post-translation,[data-no-translate]'))return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const all=[];while(walker.nextNode())all.push(walker.currentNode);all.forEach(translateNode);
}
function setupSwitcher(){
 const bar=document.querySelector('.topbar-inner,.analytics-topbar-inner');
 if(!bar||bar.querySelector('.a90-language-switcher'))return;
 const ui=document.createElement('details');ui.className='a90-language-switcher';
 ui.innerHTML='<summary aria-label="'+(english?'Choose language':'Elegir idioma')+'"><span class="a90-language-current">'+flag(selected)+'</span><strong>'+selected.toUpperCase()+'</strong><svg class="a90-language-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></summary><div class="a90-language-menu" role="group" aria-label="Languages"><button type="button" data-a90-lang="es">'+flag('es')+'<span>Español<small>Spanish</small></span></button><button type="button" data-a90-lang="en">'+flag('en')+'<span>English<small>Inglés</small></span></button></div>';
 ui.querySelectorAll('[data-a90-lang]').forEach(b=>{
   const lang=b.dataset.a90Lang;
   b.classList.toggle('is-selected',lang===selected);
   b.setAttribute('aria-pressed',String(lang===selected));
   b.addEventListener('click',()=>{
     remember(lang);
     // Save to account if logged in; navigation is not blocked by network/guest state.
     fetch('/api/auth/language',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({language:lang}),keepalive:true}).catch(()=>{});
     location.assign(pathWithQuery(lang));
   });
 });
 const menu=bar.querySelector('.menu-button,.analytics-back');
 bar.insertBefore(ui,menu||null);
 document.addEventListener('click',event=>{if(!ui.contains(event.target))ui.removeAttribute('open')});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')ui.removeAttribute('open')});
}
window.A90Locale={getLanguage:()=>selected,localizedPath,translateKey:key=>dictionary[key]||key};
function init(){
 setupSwitcher();
 syncLinks();
 walk(document.body);
 const observer=new MutationObserver(mutations=>{
   for(const m of mutations){
     if(m.type==='characterData')translateNode(m.target);
     if(m.type==='childList')for(const node of m.addedNodes){
       if(node.nodeType===1){syncLinks(node);walk(node)}
       else if(node.nodeType===3)translateNode(node);
     }
   }
 });
 observer.observe(document.body,{childList:true,subtree:true,characterData:true});
 // If the user is logged in and has no device preference, honor their account preference.
 if(!saved&&!english){
   fetch('/api/auth/session',{credentials:'same-origin',headers:{'Accept':'application/json'}})
     .then(r=>r.ok?r.json():null)
     .then(d=>{
       const remote=d?.authenticated&&d?.profile?.preferred_language;
       if(remote==='en'||remote==='es'){
         remember(remote);
         if(remote!==selected)location.replace(pathWithQuery(remote));
       }
     }).catch(()=>{});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
