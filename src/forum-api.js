const ACCESS_COOKIE='a90_access';
const REFRESH_COOKIE='a90_refresh';
const ACCESS_MAX_AGE=60*60;
const REFRESH_MAX_AGE=60*60*24*30;
const PAGE_SIZE=30;

export async function handleForumApi(request,env,url){
  try{
    if(url.pathname==='/api/forum/board'&&request.method==='GET') return board(request,env);
    if(url.pathname==='/api/forum/topics'&&request.method==='GET') return topics(request,env,url);
    if(url.pathname==='/api/forum/topic'&&request.method==='GET') return topic(request,env,url);
    if(url.pathname==='/api/forum/topic'&&request.method==='POST') return createTopic(request,env);
    if(url.pathname==='/api/forum/reply'&&request.method==='POST') return createReply(request,env);
    if(url.pathname==='/api/forum/reaction'&&request.method==='POST') return toggleReaction(request,env);
    if(url.pathname==='/api/forum/report'&&request.method==='POST') return createReport(request,env);
    if(url.pathname==='/api/forum/users'&&request.method==='GET') return publicUsers(request,env);
    if(url.pathname==='/api/forum/presence'&&request.method==='POST') return presencePing(request,env);
    return respond({error:'Ruta del foro no encontrada.'},404);
  }catch(error){
    console.error('A90 forum error',error?.message||error);
    return respond({error:'No se pudo completar la operación del foro.'},500);
  }
}

function parseCookies(request){
  const out={};
  const raw=request.headers.get('Cookie')||'';
  for(const part of raw.split(';')){
    const i=part.indexOf('=');
    if(i<0)continue;
    const key=part.slice(0,i).trim();
    const value=part.slice(i+1).trim();
    if(!key)continue;
    try{out[key]=decodeURIComponent(value)}catch{out[key]=value}
  }
  return out;
}

function cookie(name,value,maxAge){return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`}

function responseHeaders(refreshed){
  const h=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  if(refreshed?.access_token)h.append('Set-Cookie',cookie(ACCESS_COOKIE,refreshed.access_token,Math.max(60,Number(refreshed.expires_in)||ACCESS_MAX_AGE)));
  if(refreshed?.refresh_token)h.append('Set-Cookie',cookie(REFRESH_COOKIE,refreshed.refresh_token,REFRESH_MAX_AGE));
  return h;
}

function respond(data,status=200,refreshed=null){return new Response(JSON.stringify(data),{status,headers:responseHeaders(refreshed)})}

function dbHeaders(env,access){
  const key=env.SUPABASE_PUBLISHABLE_KEY;
  return {'apikey':key,'Authorization':`Bearer ${access||key}`,'Content-Type':'application/json','Accept':'application/json'};
}

async function db(env,path,access,options={}){
  const headers={...dbHeaders(env,access),...(options.headers||{})};
  const res=await fetch(env.SUPABASE_URL+path,{...options,headers});
  const text=await res.text();
  let body=null;
  if(text){try{body=JSON.parse(text)}catch{body=text}}
  return {res,body};
}

async function getUser(env,access){
  if(!access)return null;
  const {res,body}=await db(env,'/auth/v1/user',access);
  return res.ok?body:null;
}

async function refresh(env,token){
  if(!token)return null;
  const {res,body}=await db(env,'/auth/v1/token?grant_type=refresh_token',null,{method:'POST',body:JSON.stringify({refresh_token:token})});
  return res.ok?body:null;
}

async function session(request,env){
  const cookies=parseCookies(request);
  let access=cookies[ACCESS_COOKIE]||'';
  let refreshToken=cookies[REFRESH_COOKIE]||'';
  let user=await getUser(env,access);
  let refreshed=null;
  if(!user&&refreshToken){
    refreshed=await refresh(env,refreshToken);
    if(refreshed?.access_token){
      access=refreshed.access_token;
      refreshToken=refreshed.refresh_token||refreshToken;
      user=await getUser(env,access);
    }
  }
  return {access,user,refreshed};
}

async function readJson(request){
  const len=Number(request.headers.get('Content-Length')||0);
  if(len>32768)throw new Error('request too large');
  if(!(request.headers.get('Content-Type')||'').toLowerCase().includes('application/json'))throw new Error('invalid content type');
  return request.json();
}

function integer(value,min=1,max=Number.MAX_SAFE_INTEGER){
  const n=Number(value);
  return Number.isSafeInteger(n)&&n>=min&&n<=max?n:null;
}

function pageNumber(value){return integer(value,1,10000)||1}
function cleanText(value,max){return typeof value==='string'?value.trim().replace(/\u0000/g,'').slice(0,max):''}
function validSlug(value){return typeof value==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&value.length<=80}

async function visibleContext(request,env){
  const s=await session(request,env);
  return {...s,token:s.user?s.access:null};
}

async function board(request,env){
  const s=await visibleContext(request,env);
  const [cats,topicsRes]=await Promise.all([
    db(env,'/rest/v1/forum_categories?select=id,parent_id,slug,name,description,sort_order,min_role_to_post,is_locked&is_visible=eq.true&order=sort_order.asc,id.asc',s.token),
    db(env,'/rest/v1/forum_topics?select=id,category_id,last_post_at&is_hidden=eq.false&limit=5000',s.token)
  ]);
  if(!cats.res.ok)return respond({error:'No se pudieron cargar las categorías.'},502,s.refreshed);
  const categories=Array.isArray(cats.body)?cats.body:[];
  const rows=topicsRes.res.ok&&Array.isArray(topicsRes.body)?topicsRes.body:[];
  const stats={};
  for(const row of rows){
    const key=String(row.category_id);
    const st=stats[key]||(stats[key]={topics:0,last_post_at:null});
    st.topics++;
    if(row.last_post_at&&(!st.last_post_at||row.last_post_at>st.last_post_at))st.last_post_at=row.last_post_at;
  }
  return respond({categories,stats},200,s.refreshed);
}

async function getCategoryBySlug(env,token,slug){
  const {res,body}=await db(env,`/rest/v1/forum_categories?slug=eq.${encodeURIComponent(slug)}&is_visible=eq.true&select=id,parent_id,slug,name,description,min_role_to_post,is_locked&limit=1`,token);
  if(!res.ok||!Array.isArray(body)||!body[0])return null;
  return body[0];
}

async function profilesFor(env,token,ids){
  const unique=[...new Set(ids.filter(Boolean))];
  if(!unique.length)return {};
  const filter=unique.join(',');
  const [p,r]=await Promise.all([
    db(env,`/rest/v1/profiles?id=in.(${filter})&select=id,username,display_name,avatar_url`,token),
    db(env,`/rest/v1/user_roles?user_id=in.(${filter})&select=user_id,role`,token)
  ]);
  const out={};
  if(p.res.ok&&Array.isArray(p.body))for(const item of p.body)out[item.id]={...item,role:'user'};
  if(r.res.ok&&Array.isArray(r.body))for(const item of r.body){out[item.user_id]||(out[item.user_id]={id:item.user_id,username:null,display_name:'Usuario',avatar_url:null,role:'user'});out[item.user_id].role=item.role||'user'}
  return out;
}

async function topics(request,env,url){
  const slug=String(url.searchParams.get('category')||'');
  if(!validSlug(slug))return respond({error:'Categoría no válida.'},400);
  const page=pageNumber(url.searchParams.get('page'));
  const offset=(page-1)*PAGE_SIZE;
  const s=await visibleContext(request,env);
  const category=await getCategoryBySlug(env,s.token,slug);
  if(!category)return respond({error:'Categoría no encontrada.'},404,s.refreshed);

  const path=`/rest/v1/forum_topics?category_id=eq.${category.id}&select=id,category_id,author_id,title,is_pinned,is_locked,created_at,updated_at,last_post_at&order=is_pinned.desc,last_post_at.desc&limit=${PAGE_SIZE+1}&offset=${offset}`;
  const tr=await db(env,path,s.token);
  if(!tr.res.ok)return respond({error:'No se pudieron cargar los temas.'},502,s.refreshed);
  const raw=Array.isArray(tr.body)?tr.body:[];
  const hasMore=raw.length>PAGE_SIZE;
  const list=raw.slice(0,PAGE_SIZE);
  const ids=list.map(t=>t.id);
  const authors=await profilesFor(env,s.token,list.map(t=>t.author_id));
  const counts={};
  if(ids.length){
    const pr=await db(env,`/rest/v1/forum_posts?topic_id=in.(${ids.join(',')})&select=id,topic_id&deleted_at=is.null&is_hidden=eq.false&limit=5000`,s.token);
    if(pr.res.ok&&Array.isArray(pr.body))for(const post of pr.body)counts[post.topic_id]=(counts[post.topic_id]||0)+1;
  }
  const result=list.map(t=>({...t,replies:Math.max(0,(counts[t.id]||0)-1),author:authors[t.author_id]||null}));
  return respond({category,topics:result,page,has_more:hasMore},200,s.refreshed);
}

async function topic(request,env,url){
  const id=integer(url.searchParams.get('id'));
  if(!id)return respond({error:'Tema no válido.'},400);
  const s=await visibleContext(request,env);
  const tr=await db(env,`/rest/v1/forum_topics?id=eq.${id}&select=id,category_id,author_id,title,is_pinned,is_locked,created_at,updated_at,last_post_at&limit=1`,s.token);
  if(!tr.res.ok||!Array.isArray(tr.body)||!tr.body[0])return respond({error:'Tema no encontrado.'},404,s.refreshed);
  const item=tr.body[0];
  const [cat,postsRes]=await Promise.all([
    db(env,`/rest/v1/forum_categories?id=eq.${item.category_id}&select=id,slug,name,description,min_role_to_post,is_locked&limit=1`,s.token),
    db(env,`/rest/v1/forum_posts?topic_id=eq.${id}&select=id,topic_id,author_id,body,edited_at,created_at,updated_at&deleted_at=is.null&is_hidden=eq.false&order=created_at.asc&limit=500`,s.token)
  ]);
  const posts=postsRes.res.ok&&Array.isArray(postsRes.body)?postsRes.body:[];
  const authors=await profilesFor(env,s.token,[item.author_id,...posts.map(p=>p.author_id)]);
  const postIds=posts.map(p=>p.id);
  const reactions={};
  if(postIds.length){
    const rr=await db(env,`/rest/v1/forum_reactions?post_id=in.(${postIds.join(',')})&select=post_id,user_id,reaction&limit=5000`,s.token);
    if(rr.res.ok&&Array.isArray(rr.body))for(const r of rr.body){
      const bucket=reactions[r.post_id]||(reactions[r.post_id]={counts:{},mine:[]});
      bucket.counts[r.reaction]=(bucket.counts[r.reaction]||0)+1;
      if(s.user&&r.user_id===s.user.id)bucket.mine.push(r.reaction);
    }
  }
  const enriched=posts.map(p=>({...p,author:authors[p.author_id]||null,reactions:reactions[p.id]||{counts:{},mine:[]}}));
  return respond({topic:{...item,author:authors[item.author_id]||null},category:cat.res.ok&&Array.isArray(cat.body)?cat.body[0]||null:null,posts:enriched,authenticated:Boolean(s.user)},200,s.refreshed);
}

function forumError(body,status){
  const raw=String(body?.message||body?.error||body||'').toLowerCase();
  if(raw.includes('rate limit'))return 'Demasiado rápido. Espera unos segundos antes de volver a publicar.';
  if(raw.includes('authentication required')||status===401)return 'Inicia sesión para participar.';
  if(raw.includes('blocked')||raw.includes('forum_user_blocked'))return 'Tu cuenta no puede publicar en este momento.';
  if(raw.includes('row-level security')||raw.includes('violates row-level security'))return 'No tienes permiso para publicar aquí o el tema está cerrado.';
  if(raw.includes('invalid title'))return 'El título debe tener entre 3 y 180 caracteres.';
  if(raw.includes('invalid body'))return 'El mensaje no es válido o supera el límite permitido.';
  if(raw.includes('invalid reaction'))return 'Reacción no válida.';
  if(raw.includes('not found'))return 'El contenido ya no está disponible.';
  return 'No se pudo guardar el contenido.';
}

async function requireSession(request,env){
  const s=await session(request,env);
  if(!s.user)return {error:respond({error:'Inicia sesión para participar.'},401,s.refreshed)};
  return s;
}

async function rpc(env,access,name,payload){
  return db(env,`/rest/v1/rpc/${name}`,access,{method:'POST',headers:{'Prefer':'return=representation'},body:JSON.stringify(payload)});
}


async function publicUsers(request,env){
  const s=await visibleContext(request,env);
  const r=await rpc(env,s.token,'forum_public_users',{});
  if(!r.res.ok)return respond({error:'No se pudo cargar la lista de usuarios.'},502,s.refreshed);
  const users=Array.isArray(r.body)?r.body:[];
  return respond({users,total:users.length,online:users.filter(u=>u?.is_online).length},200,s.refreshed);
}

async function presencePing(request,env){
  const s=await requireSession(request,env);if(s.error)return s.error;
  const r=await rpc(env,s.access,'forum_presence_ping',{});
  if(!r.res.ok)return respond({error:'No se pudo actualizar el estado de conexión.'},400,s.refreshed);
  return respond({ok:true},200,s.refreshed);
}

async function createTopic(request,env){
  const s=await requireSession(request,env);if(s.error)return s.error;
  let data;try{data=await readJson(request)}catch{return respond({error:'Datos no válidos.'},400,s.refreshed)}
  const categoryId=integer(data?.category_id);
  const title=cleanText(data?.title,180);
  const body=cleanText(data?.body,20000);
  if(!categoryId||title.length<3||!body)return respond({error:'Completa el título y el mensaje.'},400,s.refreshed);
  const r=await rpc(env,s.access,'forum_create_topic',{p_category_id:categoryId,p_title:title,p_body:body});
  if(!r.res.ok)return respond({error:forumError(r.body,r.res.status)},r.res.status===403?403:400,s.refreshed);
  const id=Number(r.body);
  return respond({ok:true,topic_id:Number.isSafeInteger(id)?id:r.body},201,s.refreshed);
}

async function createReply(request,env){
  const s=await requireSession(request,env);if(s.error)return s.error;
  let data;try{data=await readJson(request)}catch{return respond({error:'Datos no válidos.'},400,s.refreshed)}
  const topicId=integer(data?.topic_id);
  const body=cleanText(data?.body,20000);
  if(!topicId||!body)return respond({error:'Escribe una respuesta.'},400,s.refreshed);
  const r=await rpc(env,s.access,'forum_create_reply',{p_topic_id:topicId,p_body:body});
  if(!r.res.ok)return respond({error:forumError(r.body,r.res.status)},r.res.status===403?403:400,s.refreshed);
  return respond({ok:true,post_id:Number(r.body)||r.body},201,s.refreshed);
}

async function toggleReaction(request,env){
  const s=await requireSession(request,env);if(s.error)return s.error;
  let data;try{data=await readJson(request)}catch{return respond({error:'Datos no válidos.'},400,s.refreshed)}
  const postId=integer(data?.post_id);
  const reaction=String(data?.reaction||'');
  if(!postId||!['👍','❤️','😂','😮','😢','👏'].includes(reaction))return respond({error:'Reacción no válida.'},400,s.refreshed);
  const r=await rpc(env,s.access,'forum_toggle_reaction',{p_post_id:postId,p_reaction:reaction});
  if(!r.res.ok)return respond({error:forumError(r.body,r.res.status)},400,s.refreshed);
  return respond({ok:true,active:Boolean(r.body)},200,s.refreshed);
}

async function createReport(request,env){
  const s=await requireSession(request,env);if(s.error)return s.error;
  let data;try{data=await readJson(request)}catch{return respond({error:'Datos no válidos.'},400,s.refreshed)}
  const topicId=data?.topic_id==null?null:integer(data.topic_id);
  const postId=data?.post_id==null?null:integer(data.post_id);
  const reason=cleanText(data?.reason,1000);
  if((topicId===null)===(postId===null)||reason.length<3)return respond({error:'Indica el motivo del reporte.'},400,s.refreshed);
  const r=await rpc(env,s.access,'forum_create_report',{p_topic_id:topicId,p_post_id:postId,p_reason:reason});
  if(!r.res.ok)return respond({error:forumError(r.body,r.res.status)},400,s.refreshed);
  return respond({ok:true,report_id:Number(r.body)||r.body},201,s.refreshed);
}
