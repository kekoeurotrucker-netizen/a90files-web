(()=>{
'use strict';
const board=document.querySelector('.board');
const focus=document.getElementById('forum-live-focus');
if(!board)return;

const palette=['cyan','blue','violet','amber','coral','cyan','blue','offtopic'];
const reactions=['👍','❤️','😂','😮','😢','👏'];
let currentUser=null;
let activeReplyTarget=null;

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
function avatarNode(profile){const box=el('div','forum-post-avatar');const raw=profile?.avatar_url;let safe='';if(raw){try{const u=new URL(String(raw),location.origin);if(['https:','http:'].includes(u.protocol))safe=u.href}catch{}}if(safe){const img=document.createElement('img');img.src=safe;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>{img.remove();box.textContent=initials(profile)},{once:true});box.append(img)}else box.textContent=initials(profile);return box}
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
  const audioMatch=line.match(/^\[audio:([^\]\\n]{1,120})\]\(([^\\s)]+)\)$/i);
  if(audioMatch){const href=safeUrl(audioMatch[2]);if(href&&new URL(href).origin===location.origin&&/\\.mp3(?:$|[?#])/i.test(href)){const card=el('section','forum-audio-card');const top=el('div','forum-audio-head');top.append(el('span','forum-audio-kicker','MAREA STUDIO · AUDIO'),el('strong','',audioMatch[1]));const player=document.createElement('audio');player.controls=true;player.preload='metadata';player.src=href;const dl=el('a','forum-audio-download','Descargar MP3 ↓');dl.href=href;dl.download='Mi-proxima-marea-Marea-Studio.mp3';card.append(top,player,dl);wrap.append(card);i++;continue}}
  const quoteStart=line.match(/^\[quote="([^"]{1,80})"(?: post="(\d+)")?\]$/);
  if(quoteStart){
    const quoteLines=[];i++;
    while(i<lines.length&&lines[i]!=='[/quote]'){quoteLines.push(lines[i]);i++}
    if(i<lines.length&&lines[i]==='[/quote]')i++;
    const q=el('blockquote','forum-quote');
    const qh=el('div','forum-quote-author');
    qh.append(el('strong','',quoteStart[1]));
    if(quoteStart[2]){const a=el('a','','#'+quoteStart[2]);a.href='#post-'+quoteStart[2];a.textContent='mensaje #'+quoteStart[2];qh.append(a)}
    const qb=el('div','forum-quote-body');
    quoteLines.forEach((ql,qi)=>{if(qi)qb.append(document.createElement('br'));renderInline(qb,ql)});
    const quotePlain=quoteLines.join('\n').replace(/\s+/g,' ').trim();
    const isLong=quotePlain.length>280||quoteLines.length>4;
    if(isLong){
      q.classList.add('is-collapsed');
      const toggle=button('Ver más','forum-quote-toggle',()=>{
        const expanded=q.classList.toggle('is-expanded');
        q.classList.toggle('is-collapsed',!expanded);
        toggle.textContent=expanded?'Ver menos':'Ver más';
      });
      q.append(qh,qb,toggle);
    }else q.append(qh,qb);
    wrap.append(q);continue;
  }
  if(line.startsWith('> ')){const q=el('blockquote');renderInline(q,line.slice(2));wrap.append(q);i++;continue}
  if(line.startsWith('- ')){const ul=el('ul');while(i<lines.length&&lines[i].startsWith('- ')){const li=el('li');renderInline(li,lines[i].slice(2));ul.append(li);i++}wrap.append(ul);continue}
  const p=el('p');renderInline(p,line);wrap.append(p);i++;
 }
 return wrap;
}

function loading(text='Cargando foro…',target=board){target.replaceChildren(status(text,'loading'))}
function fail(err,target=board){target.replaceChildren(status(err?.message||'No se pudo cargar el foro.','error'),button('Reintentar','forum-live-primary',route))}
function showFocus(){if(!focus)return board;focus.hidden=false;return focus}
function hideFocus(){if(focus){focus.hidden=true;focus.replaceChildren()}}

async function renderBoard({setPageTitle=true}={}){
 loading();if(setPageTitle)setTitle('');
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
 const target=showFocus();loading('Cargando temas…',target);
 const data=await api(`/api/forum/topics?category=${encodeURIComponent(slug)}&page=${page}`);setTitle(data.category?.name||'Foro');
 target.replaceChildren();
 const view=el('section','forum-live-view');const head=el('header','forum-live-view-head');const titleWrap=el('div');titleWrap.append(linkButton('← Todos los foros','/foro/'),el('small','',data.category?.description||''),el('h1','',data.category?.name||'Foro'));
 const actions=el('div','forum-live-actions');actions.append(button('Nuevo tema','forum-live-primary',async()=>{const auth=await authState();if(!auth){openLogin();return}openComposer({mode:'topic',category:data.category})}));head.append(titleWrap,actions);view.append(head);
 const list=el('div','forum-topic-list');
 if(!data.topics?.length)list.append(status('Todavía no hay temas. Puedes abrir el primero cuando hayas iniciado sesión.','empty'));
 for(const t of data.topics||[]){const a=el('a','forum-topic-row');a.href=`/foro/?t=${t.id}`;const icon=el('span','forum-topic-icon',t.is_pinned?'📌':t.is_locked?'🔒':'#');const main=el('div','forum-topic-main');const top=el('div','forum-topic-title');top.append(el('strong','',t.title));if(t.is_pinned)top.append(el('span','forum-chip','FIJADO'));if(t.is_locked)top.append(el('span','forum-chip','CERRADO'));main.append(top,el('small','',`${nameOf(t.author)} · ${roleName(t.author?.role)} · ${fmtDate(t.created_at)}`));const meta=el('div','forum-topic-meta');meta.append(el('b','',String(t.replies||0)),el('span','',` respuesta${t.replies===1?'':'s'}`),el('small','',fmtDate(t.last_post_at)));a.append(icon,main,meta);list.append(a)}
 view.append(list);
 const pager=el('nav','forum-live-pager');if(page>1)pager.append(linkButton('← Anterior',`/foro/?c=${encodeURIComponent(slug)}&p=${page-1}`,'forum-live-secondary'));if(data.has_more)pager.append(linkButton('Siguiente →',`/foro/?c=${encodeURIComponent(slug)}&p=${page+1}`,'forum-live-secondary'));view.append(pager);target.append(view);
 await renderBoard({setPageTitle:false});
 target.scrollIntoView({block:'start',behavior:'auto'});
}

async function renderTopic(id){
 activeReplyTarget=null;
 const target=showFocus();loading('Cargando conversación…',target);
 const data=await api(`/api/forum/topic?id=${id}`);setTitle(data.topic?.title||'Tema');await authState();
 target.replaceChildren();const view=el('section','forum-live-view');const head=el('header','forum-live-view-head');const titleWrap=el('div');titleWrap.append(linkButton(`← ${data.category?.name||'Foro'}`,`/foro/?c=${encodeURIComponent(data.category?.slug||'')}`));const badges=el('div','forum-topic-title');badges.append(el('h1','',data.topic.title));if(data.topic.is_pinned)badges.append(el('span','forum-chip','FIJADO'));if(data.topic.is_locked)badges.append(el('span','forum-chip','CERRADO'));titleWrap.append(badges,el('small','',`${nameOf(data.topic.author)} · ${fmtDate(data.topic.created_at)}`));head.append(titleWrap);view.append(head);
 const conversationWrap=el('section','forum-conversation-wrap');
 const conversationBar=el('div','forum-conversation-bar');
 conversationBar.append(el('span','forum-conversation-label','ORDENAR COMENTARIOS'));
 const sort=el('select','forum-conversation-sort');
 [
   ['oldest','Más antiguos'],
   ['newest','Más recientes'],
   ['popular','Más populares']
 ].forEach(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;sort.append(o)});
 const postsHost=el('div','forum-conversation-host');
 const paintConversation=()=>{postsHost.replaceChildren(renderConversation(data.posts||[],data.topic,sort.value))};
 sort.addEventListener('change',paintConversation);
 conversationBar.append(sort);
 conversationWrap.append(conversationBar,postsHost);
 paintConversation();
 view.append(conversationWrap);
 const reply=el('section','forum-reply-box');
 if(data.topic.is_locked)reply.append(status('Este tema está cerrado y no admite nuevas respuestas.','empty'));
 else if(!currentUser)reply.append(el('h2','','Responder al hilo'),status('Inicia sesión con tu Cuenta A 90 para responder.','empty'),button('Entrar','forum-live-primary',openLogin));
 else{
  const replyTitle=el('h2','','Responder al hilo');
  const context=el('div','forum-reply-context');context.hidden=true;
  const contextCopy=el('div','forum-reply-context-copy');
  const contextCancel=button('Cancelar','forum-reply-context-cancel',()=>setReplyTarget(null));
  context.append(contextCopy,contextCancel);
  const ta=el('textarea','forum-live-textarea');ta.maxLength=20000;ta.placeholder='Escribe una respuesta general al hilo…';
  const tools=makeMiniToolbar(ta);
  const preview=el('div','forum-live-preview');
  ta.addEventListener('input',()=>preview.replaceChildren(renderBody(ta.value)));
  const send=button('Publicar respuesta','forum-live-primary',async()=>{
    const body=ta.value.trim();if(!body)return;
    send.disabled=true;send.textContent='Publicando…';
    try{
      await api('/api/forum/reply',{method:'POST',body:JSON.stringify({
        topic_id:data.topic.id,
        body,
        reply_to_post_id:activeReplyTarget?.id||null
      })});
      await renderTopic(data.topic.id)
    }catch(e){reply.append(status(e.message,'error'));send.disabled=false;send.textContent='Publicar respuesta'}
  });
  reply.append(replyTitle,context,tools,ta,preview,send)
 }
 view.append(reply);target.append(view);
 await renderBoard({setPageTitle:false});
 target.scrollIntoView({block:'start',behavior:'auto'});
}

function quotedParentId(post){
 if(post?.reply_to?.id)return Number(post.reply_to.id);
 const body=String(post?.body||'');
 const m=body.match(/\[quote="[^"]{1,80}" post="(\d+)"\]/);
 return m?Number(m[1]):null;
}

function reactionScore(post){
 const counts=post?.reactions?.counts||{};
 return Object.values(counts).reduce((sum,n)=>sum+(Number(n)||0),0);
}

function renderConversation(items,topic,mode='oldest'){
 const list=el('div','forum-post-list forum-comment-list');
 const ordered=[...items].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 const byId=new Map(ordered.map(p=>[Number(p.id),p]));
 const directParent=new Map();
 for(const post of ordered){
   const parentId=quotedParentId(post);
   if(parentId&&parentId!==Number(post.id)&&byId.has(parentId))directParent.set(Number(post.id),parentId);
 }

 const rootOf=id=>{
   let cur=Number(id),guard=0;
   while(directParent.has(cur)&&guard++<50){
     const next=directParent.get(cur);
     if(!byId.has(next)||next===cur)break;
     cur=next;
   }
   return cur;
 };

 const roots=ordered.filter(p=>!directParent.has(Number(p.id)));
 const groups=new Map(roots.map(p=>[Number(p.id),[]]));
 for(const post of ordered){
   const id=Number(post.id);
   if(!directParent.has(id))continue;
   const root=rootOf(id);
   if(!groups.has(root))groups.set(root,[]);
   groups.get(root).push(post);
 }

 let sortedRoots=[...roots];
 if(mode==='newest')sortedRoots.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 else if(mode==='popular')sortedRoots.sort((a,b)=>{
   const aReplies=groups.get(Number(a.id))?.length||0;
   const bReplies=groups.get(Number(b.id))?.length||0;
   const aScore=reactionScore(a)+(aReplies*.25);
   const bScore=reactionScore(b)+(bReplies*.25);
   return bScore-aScore||new Date(a.created_at)-new Date(b.created_at);
 });
 else sortedRoots.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));

 for(const root of sortedRoots){
   const group=el('section','forum-comment-group');
   group.append(renderPost(root,topic));
   const replies=[...(groups.get(Number(root.id))||[])].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
   if(replies.length){
     const controls=el('div','forum-comment-replies-head');
     const toggle=button(`${replies.length} respuesta${replies.length===1?'':'s'}`,'forum-comment-replies-toggle');
     const branch=el('div','forum-comment-replies');
     const initiallyCollapsed=replies.length>3;
     branch.hidden=initiallyCollapsed;
     toggle.setAttribute('aria-expanded',String(!initiallyCollapsed));
     toggle.addEventListener('click',()=>{
       branch.hidden=!branch.hidden;
       toggle.setAttribute('aria-expanded',String(!branch.hidden));
       toggle.textContent=branch.hidden?`${replies.length} respuesta${replies.length===1?'':'s'}`:'Ocultar respuestas';
     });
     controls.append(toggle);
     group.append(controls,branch);
     for(const reply of replies)branch.append(renderPost(reply,topic));
   }
   list.append(group);
 }
 return list;
}

function renderPost(post,topic){
 const card=el('article','forum-post');card.dataset.postId=String(post.id);card.id='post-'+String(post.id);
 const side=el('aside','forum-post-user');side.append(avatarNode(post.author),el('strong','',nameOf(post.author)),el('small','',roleName(post.author?.role)));
 const main=el('div','forum-post-content');
 const meta=el('header','forum-post-meta');meta.append(el('span','',fmtDate(post.created_at)));if(post.edited_at)meta.append(el('small','','editado'));
 const actions=el('div','forum-post-actions');
 actions.append(button('Responder','forum-post-action forum-post-reply',()=>replyPost(post)));
 actions.append(button('Citar','forum-post-action forum-post-quote',()=>quotePost(post,card)));
 actions.append(button('Reportar','forum-post-action forum-post-report',()=>reportPost(post.id)));
 meta.append(actions);main.append(meta);
 if(post.reply_to){
   const direct=el('div','forum-direct-reply');
   const jump=el('a','forum-direct-reply-label','↳ En respuesta a ');
   jump.href='#post-'+post.reply_to.id;
   jump.append(el('strong','',nameOf(post.reply_to.author)));
   const full=String(post.reply_to.excerpt||'Abrir mensaje original');
   const short=full.length>280?full.slice(0,280).trimEnd()+'…':full;
   const excerpt=el('span','forum-direct-reply-excerpt',short);
   direct.append(jump,excerpt);
   if(full.length>280){
     const more=button('Ver más','forum-direct-reply-toggle',()=>{
       const expanded=direct.classList.toggle('is-expanded');
       excerpt.textContent=expanded?full:short;
       more.textContent=expanded?'Ver menos':'Ver más';
     });
     direct.append(more);
   }
   main.append(direct);
 }
 main.append(renderBody(post.body));
 const react=el('div','forum-reactions');
 for(const r of reactions){const count=post.reactions?.counts?.[r]||0;const b=button(`${r} ${count}`,'forum-reaction'+(post.reactions?.mine?.includes(r)?' active':''),()=>reactPost(post.id,r,topic.id));b.setAttribute('aria-pressed',String(post.reactions?.mine?.includes(r)||false));react.append(b)}
 main.append(react);card.append(side,main);return card;
}

async function replyPost(post){
 const auth=await authState();if(!auth){openLogin();return}
 activeReplyTarget={
   id:Number(post.id),
   author:nameOf(post.author),
   excerpt:String(post.body||'').replace(/\s+/g,' ').trim().slice(0,180)
 };
 setReplyTarget(activeReplyTarget);
 const ta=document.querySelector('.forum-reply-box .forum-live-textarea');
 ta?.focus();
 ta?.scrollIntoView({block:'center',behavior:'smooth'});
}

function setReplyTarget(target){
 activeReplyTarget=target||null;
 const box=document.querySelector('.forum-reply-box');if(!box)return;
 const context=box.querySelector('.forum-reply-context');
 const copy=box.querySelector('.forum-reply-context-copy');
 const title=box.querySelector('h2');
 const ta=box.querySelector('.forum-live-textarea');
 if(!context||!copy||!title||!ta)return;
 if(!activeReplyTarget){
   context.hidden=true;copy.replaceChildren();
   title.textContent='Responder al hilo';
   ta.placeholder='Escribe una respuesta general al hilo…';
   return;
 }
 context.hidden=false;copy.replaceChildren();
 const top=el('div','forum-reply-context-title','Respondiendo a ');
 top.append(el('strong','',activeReplyTarget.author));
 copy.append(top,el('p','',activeReplyTarget.excerpt||'Mensaje seleccionado'));
 title.textContent='Responder a '+activeReplyTarget.author;
 ta.placeholder='Escribe tu respuesta para '+activeReplyTarget.author+'…';
}

async function quotePost(post,card){
 const auth=await authState();if(!auth){openLogin();return}
 const bodyNode=card.querySelector('.forum-live-body');
 const selection=window.getSelection?.();
 let quoted='';
 if(selection&&selection.rangeCount&&bodyNode&&selection.toString().trim()){
   const range=selection.getRangeAt(0);
   if(bodyNode.contains(range.commonAncestorContainer))quoted=selection.toString().trim();
 }
 if(!quoted){
   const hint=el('span','forum-quote-hint','Selecciona primero el fragmento que quieras citar.');
   const actions=card.querySelector('.forum-post-actions');
   actions?.append(hint);
   setTimeout(()=>hint.remove(),2600);
   return;
 }
 quoted=quoted.replace(/\[\/quote\]/gi,'[ /quote ]');
 const ta=document.querySelector('.forum-reply-box .forum-live-textarea');
 if(!ta)return;
 const author=nameOf(post.author).replace(/"/g,'”');
 const block=`[quote="${author}" post="${post.id}"]\n${quoted}\n[/quote]\n\n`;
 const start=ta.selectionStart??ta.value.length,end=ta.selectionEnd??start;
 ta.setRangeText(block,start,end,'end');
 ta.dispatchEvent(new Event('input',{bubbles:true}));
 ta.focus();
 ta.scrollIntoView({block:'center',behavior:'smooth'});
 selection?.removeAllRanges?.();
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
  hideFocus();return renderBoard();
 }catch(e){fail(e)}
}
function pageNumber(value){const n=Number(value);return Number.isSafeInteger(n)&&n>0&&n<10000?n:1}
route();
})();
