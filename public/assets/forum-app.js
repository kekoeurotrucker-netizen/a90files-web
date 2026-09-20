(()=>{
'use strict';
const board=document.querySelector('.board');
if(!board)return;

const palette=['cyan','blue','violet','amber','coral','cyan','blue','offtopic'];
const reactions=['👍','❤️','😂','😮','😢','👏'];
let currentUser=null;

const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n};
const api=async(path,opts={})=>{const res=await fetch(path,{credentials:'same-origin',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data?.error||'No se pudo completar la operación.');return data};

async function authState(){
 try{const d=await api('/api/auth/session');currentUser=d.authenticated?d:null;return currentUser}catch{currentUser=null;return null}
}
function openLogin(){if(window.A90Auth?.open)window.A90Auth.open();else document.querySelector('[data-a90-account]')?.click()}
function nameOf(profile){return profile?.username||profile?.display_name||'Usuario'}
function roleName(role){return({user:'Usuario',moderator:'Moderador',admin:'Admin',super_admin:'Super Admin'})[role]||'Usuario'}
function fmtDate(value){if(!value)return '—';try{return new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return '—'}}
function initials(profile){const name=nameOf(profile).trim();return (name.match(/[A-Za-zÁÉÍÓÚÜÑ0-9]/gi)||['A','9']).slice(0,2).join('').toUpperCase()}
function setTitle(value){document.title=value?`${value} · Foro · A 90 Files`:'Foro · A 90 Files'}

function button(label,className,fn){const b=el('button',className,label);b.type='button';if(fn)b.addEventListener('click',fn);return b}
function linkButton(label,href,className='forum-live-back'){const a=el('a',className,label);a.href=href;return a}
function status(message,type=''){const p=el('p','forum-live-status'+(type?' '+type:''),message);return p}

function safeUrl(value){try{const u=new URL(value,location.origin);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}}
function appendText(parent,text){parent.appendChild(document.createTextNode(text))}
function renderInline(parent,text){
 const token=/(`[^`\n]+`|\*\*[^*\n]+\*\*|~~[^~\n]+~~|\*[^*\n]+\*|\|\|[^|\n]+\|\||\[[^\]\n]+\]\([^\s)]+\)|@[A-Za-z0-9_.-]{2,32})/g;
 let last=0;
 for(const match of text.matchAll(token)){
  if(match.index>last)appendText(parent,text.slice(last,match.index));
  const raw=match[0];let n=null;
  if(raw.startsWith('`')){n=el('code');n.textContent=raw.slice(1,-1)}
  else if(raw.startsWith('**')){n=el('strong');n.textContent=raw.slice(2,-2)}
  else if(raw.startsWith('~~')){n=el('s');n.textContent=raw.slice(2,-2)}
  else if(raw.startsWith('*')){n=el('em');n.textContent=raw.slice(1,-1)}
  else if(raw.startsWith('||')){n=button(raw.slice(2,-2),'forum-spoiler',e=>e.currentTarget.classList.toggle('revealed'));n.setAttribute('aria-label','Mostrar u ocultar spoiler')}
  else if(raw.startsWith('[')){const m=raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/);const href=m&&safeUrl(m[2]);if(href){n=el('a');n.href=href;n.target='_blank';n.rel='noopener noreferrer nofollow ugc';n.textContent=m[1]}}
  else if(raw.startsWith('@')){n=el('span','forum-mention',raw)}
  if(n)parent.appendChild(n);else appendText(parent,raw);
  last=match.index+raw.length;
 }
 if(last<text.length)appendText(parent,text.slice(last));
}
function renderBody(source){
 const wrap=el('div','forum-live-body');
 const lines=String(source||'').replace(/\r\n?/g,'\n').split('\n');let i=0;
 while(i<lines.length){
  const line=lines[i];
  if(line.startsWith('```')){const lang=line.slice(3).trim().replace(/[^A-Za-z0-9_+#.-]/g,'').slice(0,24);i++;const code=[];while(i<lines.length&&!lines[i].startsWith('```')){code.push(lines[i]);i++}if(i<lines.length)i++;const box=el('div','code-block');box.append(el('div','code-head',lang||'código'));const pre=el('pre');const c=el('code');c.textContent=code.join('\n');pre.append(c);box.append(pre);wrap.append(box);continue}
  if(!line.trim()){wrap.append(el('div','forum-live-break'));i++;continue}
  if(line.startsWith('> ')){const q=el('blockquote');renderInline(q,line.slice(2));wrap.append(q);i++;continue}
  if(line.startsWith('- ')){const ul=el('ul');while(i<lines.length&&lines[i].startsWith('- ')){const li=el('li');renderInline(li,lines[i].slice(2));ul.append(li);i++}wrap.append(ul);continue}
  const p=el('p');renderInline(p,line);wrap.append(p);i++;
 }
 return wrap;
}

function loading(text='Cargando foro…'){board.replaceChildren(status(text,'loading'))}
function fail(err){board.replaceChildren(status(err?.message||'No se pudo cargar el foro.','error'),button('Reintentar','forum-live-primary',route))}

async function renderBoard(){
 loading();setTitle('');
 const data=await api('/api/forum/board');
 const categories=data.categories||[];const stats=data.stats||{};
 const parents=categories.filter(c=>c.parent_id==null);const children=new Map();
 for(const c of categories.filter(c=>c.parent_id!=null)){const k=String(c.parent_id);if(!children.has(k))children.set(k,[]);children.get(k).push(c)}
 board.replaceChildren();
 parents.forEach((parent,index)=>{
  const article=el('article',`forum-section forum-section--${palette[index%palette.length]}`);article.id=parent.slug;
  const head=el('header','forum-section-head');const left=el('div');const code=el('span','section-code',parent.slug==='normas-y-avisos'?'!':String(parent.name).slice(0,3).toUpperCase());const copy=el('div');copy.append(el('small','',parent.parent_id?'SUBFORO':'COMUNIDAD'));copy.append(el('h2','',parent.name));left.append(code,copy);head.append(left,el('span','section-note',parent.description||''));article.append(head);
  const list=el('div','subforum-list');const sub=children.get(String(parent.id))||[];const rows=sub.length?sub:[parent];
  rows.forEach(cat=>{
    const st=stats[String(cat.id)]||{topics:0,last_post_at:null};const row=button('','subforum live-subforum',()=>{location.href=`/foro/?c=${encodeURIComponent(cat.slug)}`});
    row.removeAttribute('aria-label');const icon=el('span','subforum-icon',cat.is_locked?'🔒':'#');const main=el('div');main.append(el('strong','',cat.name),el('p','',cat.description||''));const meta=el('span','empty-state',st.topics?`${st.topics} tema${st.topics===1?'':'s'}${st.last_post_at?` · ${fmtDate(st.last_post_at)}`:''}`:'Sin temas');row.append(icon,main,meta);list.append(row);
  });
  article.append(list);board.append(article);
 });
 const summary=document.querySelector('.forum-summary');if(summary){const count=categories.length;const top=parents.length;summary.replaceChildren();const a=el('span');a.append(el('b','',String(top)),document.createTextNode(' categorías'));const sep=el('i');const b=el('span');b.append(el('b','',String(count)),document.createTextNode(' foros y subforos'));const sep2=el('i');summary.append(a,sep,b,sep2,el('span','','Datos en vivo'))}
}

async function renderTopics(slug,page=1){
 loading('Cargando temas…');
 const data=await api(`/api/forum/topics?category=${encodeURIComponent(slug)}&page=${page}`);setTitle(data.category?.name||'Foro');
 board.replaceChildren();
 const view=el('section','forum-live-view');const head=el('header','forum-live-view-head');const titleWrap=el('div');titleWrap.append(linkButton('← Todos los foros','/foro/'),el('small','',data.category?.description||''),el('h1','',data.category?.name||'Foro'));
 const actions=el('div','forum-live-actions');actions.append(button('Nuevo tema','forum-live-primary',async()=>{const auth=await authState();if(!auth){openLogin();return}openComposer({mode:'topic',category:data.category})}));head.append(titleWrap,actions);view.append(head);
 const list=el('div','forum-topic-list');
 if(!data.topics?.length)list.append(status('Todavía no hay temas. Puedes abrir el primero cuando hayas iniciado sesión.','empty'));
 for(const t of data.topics||[]){const a=el('a','forum-topic-row');a.href=`/foro/?t=${t.id}`;const icon=el('span','forum-topic-icon',t.is_pinned?'📌':t.is_locked?'🔒':'#');const main=el('div','forum-topic-main');const top=el('div','forum-topic-title');top.append(el('strong','',t.title));if(t.is_pinned)top.append(el('span','forum-chip','FIJADO'));if(t.is_locked)top.append(el('span','forum-chip','CERRADO'));main.append(top,el('small','',`${nameOf(t.author)} · ${roleName(t.author?.role)} · ${fmtDate(t.created_at)}`));const meta=el('div','forum-topic-meta');meta.append(el('b','',String(t.replies||0)),el('span','',` respuesta${t.replies===1?'':'s'}`),el('small','',fmtDate(t.last_post_at)));a.append(icon,main,meta);list.append(a)}
 view.append(list);
 const pager=el('nav','forum-live-pager');if(page>1)pager.append(linkButton('← Anterior',`/foro/?c=${encodeURIComponent(slug)}&p=${page-1}`,'forum-live-secondary'));if(data.has_more)pager.append(linkButton('Siguiente →',`/foro/?c=${encodeURIComponent(slug)}&p=${page+1}`,'forum-live-secondary'));view.append(pager);board.append(view);
}

async function renderTopic(id){
 loading('Cargando conversación…');
 const data=await api(`/api/forum/topic?id=${id}`);setTitle(data.topic?.title||'Tema');await authState();
 board.replaceChildren();const view=el('section','forum-live-view');const head=el('header','forum-live-view-head');const titleWrap=el('div');titleWrap.append(linkButton(`← ${data.category?.name||'Foro'}`,`/foro/?c=${encodeURIComponent(data.category?.slug||'')}`));const badges=el('div','forum-topic-title');badges.append(el('h1','',data.topic.title));if(data.topic.is_pinned)badges.append(el('span','forum-chip','FIJADO'));if(data.topic.is_locked)badges.append(el('span','forum-chip','CERRADO'));titleWrap.append(badges,el('small','',`${nameOf(data.topic.author)} · ${fmtDate(data.topic.created_at)}`));head.append(titleWrap);view.append(head);
 const posts=el('div','forum-post-list');
 for(const p of data.posts||[])posts.append(renderPost(p,data.topic));
 view.append(posts);
 const reply=el('section','forum-reply-box');
 if(data.topic.is_locked)reply.append(status('Este tema está cerrado y no admite nuevas respuestas.','empty'));
 else if(!currentUser)reply.append(el('h2','','Responder'),status('Inicia sesión con tu Cuenta A 90 para responder.','empty'),button('Entrar','forum-live-primary',openLogin));
 else{reply.append(el('h2','','Responder'));const ta=el('textarea','forum-live-textarea');ta.maxLength=20000;ta.placeholder='Escribe tu respuesta…';const tools=makeMiniToolbar(ta);const preview=el('div','forum-live-preview');ta.addEventListener('input',()=>preview.replaceChildren(renderBody(ta.value)));const send=button('Publicar respuesta','forum-live-primary',async()=>{const body=ta.value.trim();if(!body)return;send.disabled=true;send.textContent='Publicando…';try{await api('/api/forum/reply',{method:'POST',body:JSON.stringify({topic_id:data.topic.id,body})});await renderTopic(data.topic.id)}catch(e){reply.append(status(e.message,'error'));send.disabled=false;send.textContent='Publicar respuesta'}});reply.append(tools,ta,preview,send)}
 view.append(reply);board.append(view);
}

function renderPost(post,topic){
 const card=el('article','forum-post');card.dataset.postId=String(post.id);card.id='post-'+String(post.id);const side=el('aside','forum-post-user');side.append(el('div','forum-post-avatar',initials(post.author)),el('strong','',nameOf(post.author)),el('small','',roleName(post.author?.role)));const main=el('div','forum-post-content');const meta=el('header','forum-post-meta');meta.append(el('span','',fmtDate(post.created_at)));if(post.edited_at)meta.append(el('small','','editado'));const actions=el('div','forum-post-actions');actions.append(button('Reportar','forum-post-action',()=>reportPost(post.id)));meta.append(actions);main.append(meta,renderBody(post.body));const react=el('div','forum-reactions');for(const r of reactions){const count=post.reactions?.counts?.[r]||0;const b=button(`${r} ${count}`,'forum-reaction'+(post.reactions?.mine?.includes(r)?' active':''),()=>reactPost(post.id,r,topic.id));b.setAttribute('aria-pressed',String(post.reactions?.mine?.includes(r)||false));react.append(b)}main.append(react);card.append(side,main);return card;
}

async function reactPost(postId,reaction,topicId){const auth=await authState();if(!auth){openLogin();return}try{await api('/api/forum/reaction',{method:'POST',body:JSON.stringify({post_id:postId,reaction})});await renderTopic(topicId)}catch(e){alert(e.message)}}
async function reportPost(postId){const auth=await authState();if(!auth){openLogin();return}const reason=prompt('Indica brevemente el motivo del reporte:');if(!reason?.trim())return;try{await api('/api/forum/report',{method:'POST',body:JSON.stringify({post_id:postId,reason:reason.trim()})});alert('Reporte enviado a moderación.')}catch(e){alert(e.message)}}

function makeMiniToolbar(textarea){
 const bar=el('div','forum-live-toolbar');const wrap=(before,after=before)=>{const s=textarea.selectionStart,e=textarea.selectionEnd,sel=textarea.value.slice(s,e);textarea.setRangeText(before+sel+after,s,e,'end');textarea.focus();textarea.dispatchEvent(new Event('input'))};
 [['B','**'],['I','*'],['S','~~'],['</>','`'],['Spoiler','||']].forEach(([label,token])=>bar.append(button(label,'',()=>wrap(token))));bar.append(button('{ }','',()=>wrap('```\n','\n```')),button('🔗','',()=>wrap('[texto](','https://example.com)')),button('@','',()=>wrap('@usuario','')));
 const emoji=el('span','forum-live-emoji');['😀','😂','👍','❤️','🔥','🚛','☁️','🐛','✅'].forEach(e=>emoji.append(button(e,'',()=>wrap(e,''))));bar.append(emoji);return bar;
}

function openComposer({mode,category}){
 document.querySelector('.forum-compose-overlay')?.remove();const overlay=el('div','forum-compose-overlay');const modal=el('section','forum-compose-modal');const head=el('header','forum-compose-head');head.append(el('div','',''),button('×','forum-compose-close',()=>overlay.remove()));head.firstChild.append(el('small','',mode==='topic'?'NUEVO TEMA':'RESPUESTA'),el('h2','',category?.name||'Foro'));modal.append(head);
 let title=null;if(mode==='topic'){title=el('input','forum-live-input');title.maxLength=180;title.placeholder='Título del tema';modal.append(title)}
 const ta=el('textarea','forum-live-textarea');ta.maxLength=20000;ta.placeholder='Escribe tu mensaje…';const preview=el('div','forum-live-preview');ta.addEventListener('input',()=>preview.replaceChildren(renderBody(ta.value)));modal.append(makeMiniToolbar(ta),ta,preview);const foot=el('footer','forum-compose-foot');const msg=el('span','forum-compose-message');const send=button('Publicar tema','forum-live-primary',async()=>{const body=ta.value.trim();const subject=title?.value.trim()||'';if(!body||subject.length<3){msg.textContent='Escribe un título y un mensaje.';return}send.disabled=true;send.textContent='Publicando…';try{const d=await api('/api/forum/topic',{method:'POST',body:JSON.stringify({category_id:category.id,title:subject,body})});location.href=`/foro/?t=${encodeURIComponent(d.topic_id)}`}catch(e){msg.textContent=e.message;send.disabled=false;send.textContent='Publicar tema'}});foot.append(msg,send);modal.append(foot);overlay.append(modal);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});document.body.append(overlay);title?.focus();
}

async function route(){
 try{
  const q=new URLSearchParams(location.search);const topicId=Number(q.get('t'));const category=q.get('c');const page=pageNumber(q.get('p'));
  if(Number.isSafeInteger(topicId)&&topicId>0)return renderTopic(topicId);
  if(category&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category))return renderTopics(category,page);
  return renderBoard();
 }catch(e){fail(e)}
}
function pageNumber(value){const n=Number(value);return Number.isSafeInteger(n)&&n>0&&n<10000?n:1}
route();
})();
