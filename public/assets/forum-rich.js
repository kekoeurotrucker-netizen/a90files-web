(()=>{
'use strict';

const SAFE_SCHEMES=new Set(['http:','https:']);
const safeUrl=value=>{try{const u=new URL(String(value||'').trim(),location.origin);return SAFE_SCHEMES.has(u.protocol)?u.href:null}catch{return null}};
const appendText=(parent,text)=>parent.appendChild(document.createTextNode(text));

function openTag(tag,arg){
  tag=tag.toLowerCase();
  if(tag==='b')return document.createElement('strong');
  if(tag==='i')return document.createElement('em');
  if(tag==='u'){const e=document.createElement('span');e.className='forum-rich-u';return e}
  if(tag==='s')return document.createElement('s');
  if(tag==='center'){const e=document.createElement('span');e.className='forum-rich-center';return e}
  if(tag==='quote'){const e=document.createElement('span');e.className='forum-rich-quote';return e}
  if(tag==='code')return document.createElement('code');
  if(tag==='spoiler'){const e=document.createElement('span');e.className='forum-rich-spoiler';e.tabIndex=0;e.setAttribute('role','button');e.setAttribute('aria-label','Mostrar u ocultar spoiler');return e}
  if(tag==='h2'){const e=document.createElement('span');e.className='forum-rich-heading forum-rich-h2';return e}
  if(tag==='h3'){const e=document.createElement('span');e.className='forum-rich-heading forum-rich-h3';return e}
  if(tag==='color'){
    const color=String(arg||'').trim();
    if(!/^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(color))return null;
    const e=document.createElement('span');e.className='forum-rich-color';e.style.color=color;return e;
  }
  if(tag==='size'){
    const size=String(arg||'').toLowerCase();
    if(!['small','normal','large','xlarge'].includes(size))return null;
    const e=document.createElement('span');e.className='forum-rich-size forum-rich-size-'+size;return e;
  }
  if(tag==='url'||tag==='button'){
    const href=safeUrl(arg);if(!href)return null;
    const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer nofollow ugc';
    if(tag==='button')a.className='forum-rich-button';
    return a;
  }
  return null;
}

function parseBbcode(text){
  const frag=document.createDocumentFragment();
  const stack=[{tag:null,node:frag}];
  const re=/\[(\/)?(b|i|u|s|center|quote|code|spoiler|h2|h3|color|size|url|button)(?:=([^\]\n]+))?\]/ig;
  let last=0;
  for(const m of text.matchAll(re)){
    const current=stack[stack.length-1].node;
    if(m.index>last)appendText(current,text.slice(last,m.index));
    const closing=!!m[1],tag=m[2].toLowerCase(),arg=m[3];
    if(closing){
      if(stack.length>1&&stack[stack.length-1].tag===tag)stack.pop();
      else appendText(current,m[0]);
    }else{
      const node=openTag(tag,arg);
      if(node){current.appendChild(node);stack.push({tag,node});}
      else appendText(current,m[0]);
    }
    last=m.index+m[0].length;
  }
  appendText(stack[stack.length-1].node,text.slice(last));
  return frag;
}

function transformTextNode(node){
  const text=node.nodeValue||'';
  if(!/\[(?:\/?)(?:b|i|u|s|center|quote|code|spoiler|h2|h3|color|size|url|button)(?:=|\])/i.test(text))return;
  node.replaceWith(parseBbcode(text));
}

function enhanceMarkup(root=document){
  const blocks=root.querySelectorAll?.('.forum-live-body p:not([data-rich]),.forum-live-body blockquote:not([data-rich]),.forum-live-preview p:not([data-rich]),.forum-live-preview blockquote:not([data-rich])')||[];
  blocks.forEach(block=>{
    block.dataset.rich='1';
    const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(transformTextNode);
  });
}

function insert(textarea,before,after=''){
  const s=textarea.selectionStart,e=textarea.selectionEnd,sel=textarea.value.slice(s,e);
  textarea.setRangeText(before+sel+after,s,e,'end');textarea.focus();textarea.dispatchEvent(new Event('input',{bubbles:true}));
}
function ask(label,def=''){const value=prompt(label,def);return value===null?null:value.trim()}
function tool(label,title,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.addEventListener('click',fn);return b}

function showHelp(){
  document.querySelector('.forum-rich-help')?.remove();
  const overlay=document.createElement('div');overlay.className='forum-rich-help';
  const card=document.createElement('section');card.className='forum-rich-help-card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','Ayuda de formato del foro');
  const close=tool('×','Cerrar ayuda',()=>overlay.remove());close.className='forum-rich-help-close';
  const h=document.createElement('h2');h.textContent='Formato del foro';
  const p=document.createElement('p');p.textContent='Puedes usar los botones del editor o escribir BBCode seguro directamente. El HTML crudo nunca se ejecuta.';
  const pre=document.createElement('pre');pre.textContent='[b]Negrita[/b]\n[i]Cursiva[/i]\n[u]Subrayado[/u]\n[h2]Título[/h2]\n[center]Centrado[/center]\n[color=#49d7e6]Color[/color]\n[quote]Cita[/quote]\n[spoiler]Spoiler[/spoiler]\n[url=https://ejemplo.com]Enlace[/url]\n[button=https://ejemplo.com]Botón[/button]';
  card.append(close,h,p,pre);overlay.append(card);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});document.body.append(overlay);close.focus();
}

function enhanceToolbar(bar){
  if(bar.dataset.richToolbar)return;bar.dataset.richToolbar='1';
  const parent=bar.closest('.forum-compose-modal,.forum-reply-box,.editor-card')||bar.parentElement;
  const ta=parent?.querySelector('textarea');if(!ta)return;
  const sep=document.createElement('span');sep.className='forum-rich-sep';sep.setAttribute('aria-hidden','true');bar.append(sep);
  bar.append(
    tool('U','Subrayado',()=>insert(ta,'[u]','[/u]')),
    tool('Título','Título destacado',()=>insert(ta,'[h2]','[/h2]')),
    tool('Cita','Cita',()=>insert(ta,'[quote]','[/quote]')),
    tool('Centrar','Centrar texto',()=>insert(ta,'[center]','[/center]')),
    tool('Botón','Insertar botón con enlace',()=>{const url=ask('URL del botón:','https://');if(!url||!safeUrl(url))return;const label=ask('Texto del botón:','Abrir enlace');if(label===null)return;insert(ta,`[button=${url}]${label||'Abrir enlace'}[/button]`)}),
    tool('Color','Color del texto',()=>{const color=ask('Color (#RRGGBB o nombre CSS):','#49d7e6');if(!color)return;insert(ta,`[color=${color}]`,'[/color]')}),
    tool('Enlace','Insertar enlace',()=>{const url=ask('URL:','https://');if(!url||!safeUrl(url))return;const label=ask('Texto del enlace:','Enlace');if(label===null)return;insert(ta,`[url=${url}]${label||url}[/url]`)}),
    tool('Ayuda','Ver códigos de formato',showHelp)
  );
}

function scan(root=document){enhanceMarkup(root);root.querySelectorAll?.('.forum-live-toolbar,.editor-toolbar').forEach(enhanceToolbar)}

const observer=new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1)scan(n)});
observer.observe(document.documentElement,{childList:true,subtree:true});
scan();

document.addEventListener('click',e=>{const t=e.target;if(t instanceof HTMLElement&&t.classList.contains('forum-rich-spoiler'))t.classList.toggle('revealed')});
document.addEventListener('keydown',e=>{const t=e.target;if(t instanceof HTMLElement&&t.classList.contains('forum-rich-spoiler')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();t.classList.toggle('revealed')}});
})();