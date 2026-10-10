const ACCESS_COOKIE='a90_access';
const REFRESH_COOKIE='a90_refresh';
const ACCESS_MAX_AGE=60*60;
const REFRESH_MAX_AGE=60*60*24*30;
const PAGE_SIZE=30;

export async function handleForumApi(request,env,url){
  try{
    if(url.pathname==='/api/forum/board'&&request.method==='GET') return board(request,env);
    if(url.pathname==='/api/forum/resolve'&&request.method==='GET') return resolveForumRoute(request,env,url);
    if(url.pathname==='/api/forum/topics'&&request.method==='GET') return topics(request,env,url);
    if(url.pathname==='/api/forum/topic'&&request.method==='GET') return topic(request,env,url);
    if(url.pathname==='/api/forum/topic'&&request.method==='POST') return createTopic(request,env);
    if(url.pathname==='/api/forum/reply'&&request.method==='POST') return createReply(request,env);
    if(url.pathname==='/api/forum/reaction'&&request.method==='POST') return toggleReaction(request,env);
    if(url.pathname==='/api/forum/report'&&request.method==='POST') return createReport(request,env);
    if(url.pathname==='/api/forum/notifications'&&request.method==='GET') return userNotifications(request,env);
    if(url.pathname==='/api/forum/notifications/read'&&request.method==='POST') return markUserNotificationsRead(request,env);
    if(url.pathname==='/api/forum/staff-notifications'&&request.method==='GET') return staffNotifications(request,env);
    if(url.pathname==='/api/forum/staff-notifications/read'&&request.method==='POST') return markStaffNotificationsRead(request,env);
    if(url.pathname==='/api/forum/users'&&request.method==='GET') return publicUsers(request,env);
    if(url.pathname==='/api/forum/presence'&&request.method==='POST') return presencePing(request,env);
    if(url.pathname==='/api/forum/recent'&&request.method==='GET') return recentActivity(request,env);
    if(url.pathname==='/api/forum/translate'&&request.method==='POST') return translateForumPost(request,env);
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
    db(env,'/rest/v1/forum_categories?select=id,parent_id,slug,slug_en,name,description,sort_order,min_role_to_post,is_locked&is_visible=eq.true&order=sort_order.asc,id.asc',s.token),
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
  const {res,body}=await db(env,`/rest/v1/forum_categories?slug=eq.${encodeURIComponent(slug)}&is_visible=eq.true&select=id,parent_id,slug,slug_en,name,description,min_role_to_post,is_locked&limit=1`,token);
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

// Persistent bilingual topic/category slugs; numeric IDs remain internal and old links can redirect.
async function resolveForumRoute(request,env,url){
  const locale=url.searchParams.get('lang')==='en'?'en':'es';
  const catSlug=String(url.searchParams.get('category')||'');
  const topicSlug=String(url.searchParams.get('topic')||'');
  const topicId=integer(url.searchParams.get('id'));
  if(!topicId && (!validSlug(catSlug)||topicSlug&&!validSlug(topicSlug)))
    return respond({error:'Dirección del foro no válida.'},400);
  const s=await visibleContext(request,env);
  let cat=null,topic=null;
  if(topicId){
    const found=await db(env,`/rest/v1/forum_topics?id=eq.${topicId}&is_hidden=eq.false&select=id,category_id,title,slug,slug_en&limit=1`,s.token);
    topic=found.res.ok&&Array.isArray(found.body)?found.body[0]||null:null;
    if(!topic)return respond({error:'Tema no encontrado.'},404,s.refreshed);
    const cr=await db(env,`/rest/v1/forum_categories?id=eq.${topic.category_id}&is_visible=eq.true&select=id,slug,slug_en,name&limit=1`,s.token);
    cat=cr.res.ok&&Array.isArray(cr.body)?cr.body[0]||null:null;
  } else {
    const col=locale==='en'?'slug_en':'slug';
    const cr=await db(env,`/rest/v1/forum_categories?${col}=eq.${encodeURIComponent(catSlug)}&is_visible=eq.true&select=id,slug,slug_en,name&limit=1`,s.token);
    cat=cr.res.ok&&Array.isArray(cr.body)?cr.body[0]||null:null;
    // An old Spanish link embedded in an English article can still find its real category.
    if(!cat&&locale==='en'){
      const oldCat=await db(env,`/rest/v1/forum_categories?slug=eq.${encodeURIComponent(catSlug)}&is_visible=eq.true&select=id,slug,slug_en,name&limit=1`,s.token);
      cat=oldCat.res.ok&&Array.isArray(oldCat.body)?oldCat.body[0]||null:null;
    }
    if(!cat)return respond({error:'Categoría no encontrada.'},404,s.refreshed);
    if(topicSlug){
      const tr=await db(env,`/rest/v1/forum_topics?category_id=eq.${cat.id}&${col}=eq.${encodeURIComponent(topicSlug)}&is_hidden=eq.false&select=id,category_id,title,slug,slug_en&limit=1`,s.token);
      topic=tr.res.ok&&Array.isArray(tr.body)?tr.body[0]||null:null;
      if(!topic&&locale==='en'){
        const oldTopic=await db(env,`/rest/v1/forum_topics?category_id=eq.${cat.id}&slug=eq.${encodeURIComponent(topicSlug)}&is_hidden=eq.false&select=id,category_id,title,slug,slug_en&limit=1`,s.token);
        topic=oldTopic.res.ok&&Array.isArray(oldTopic.body)?oldTopic.body[0]||null:null;
      }
    }
  }
  if(!cat || topicSlug&&!topic)return respond({error:'Página del foro no encontrada.'},404,s.refreshed);
  const es='/foro/'+cat.slug+'/'+(topic?topic.slug+'/':'');
  const en='/en/foro/'+(cat.slug_en||cat.slug)+'/'+(topic?(topic.slug_en||topic.slug)+'/':'');
  return respond({kind:topic?'topic':'category',topic_id:topic?.id||null,topic,category:cat,urls:{es,en}},200,s.refreshed);
}

async function topics(request,env,url){
  const slug=String(url.searchParams.get('category')||'');
  if(!validSlug(slug))return respond({error:'Categoría no válida.'},400);
  const page=pageNumber(url.searchParams.get('page'));
  const offset=(page-1)*PAGE_SIZE;
  const s=await visibleContext(request,env);
  const category=await getCategoryBySlug(env,s.token,slug);
  if(!category)return respond({error:'Categoría no encontrada.'},404,s.refreshed);

  const path=`/rest/v1/forum_topics?category_id=eq.${category.id}&select=id,category_id,author_id,title,slug,slug_en,is_pinned,is_locked,created_at,updated_at,last_post_at&order=is_pinned.desc,last_post_at.desc&limit=${PAGE_SIZE+1}&offset=${offset}`;
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
  const tr=await db(env,`/rest/v1/forum_topics?id=eq.${id}&select=id,category_id,author_id,title,slug,slug_en,is_pinned,is_locked,created_at,updated_at,last_post_at&limit=1`,s.token);
  if(!tr.res.ok||!Array.isArray(tr.body)||!tr.body[0])return respond({error:'Tema no encontrado.'},404,s.refreshed);
  const item=tr.body[0];
  const [cat,postsRes]=await Promise.all([
    db(env,`/rest/v1/forum_categories?id=eq.${item.category_id}&select=id,slug,slug_en,name,description,min_role_to_post,is_locked&limit=1`,s.token),
    db(env,`/rest/v1/forum_posts?topic_id=eq.${id}&select=id,topic_id,author_id,body,reply_to_post_id,edited_at,created_at,updated_at&deleted_at=is.null&is_hidden=eq.false&order=created_at.asc&limit=500`,s.token)
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
  const postMap=new Map(posts.map(p=>[Number(p.id),p]));
  const enriched=posts.map(p=>{
    const parent=p.reply_to_post_id?postMap.get(Number(p.reply_to_post_id)):null;
    const replyTo=parent?{
      id:Number(parent.id),
      author:authors[parent.author_id]||null,
      excerpt:String(parent.body||'').replace(/\s+/g,' ').trim().slice(0,1200)
    }:null;
    return {...p,author:authors[p.author_id]||null,reactions:reactions[p.id]||{counts:{},mine:[]},reply_to:replyTo};
  });
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

async function roleOf(env,access,userId){
  const r=await db(env,`/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`,access);
  if(!r.res.ok||!Array.isArray(r.body)||!r.body[0]?.role)return 'user';
  return r.body[0].role;
}

async function requireStaff(request,env){
  const s=await requireSession(request,env);
  if(s.error)return s;
  const role=await roleOf(env,s.access,s.user.id);
  if(!['moderator','admin','super_admin'].includes(role))return {error:respond({error:'Acceso reservado al equipo de moderación.'},403,s.refreshed)};
  return {...s,role};
}

async function userNotifications(request,env){
  const s=await requireSession(request,env);if(s.error)return s.error;
  const userId=encodeURIComponent(s.user.id);
  const [listRes,unreadRes]=await Promise.all([
    db(env,`/rest/v1/forum_user_notifications?recipient_user_id=eq.${userId}&select=id,kind,title,body,href,topic_id,post_id,source_post_id,actor_user_id,created_at,read_at&order=created_at.desc&limit=40`,s.access),
    db(env,`/rest/v1/forum_user_notifications?recipient_user_id=eq.${userId}&read_at=is.null&select=id&limit=1000`,s.access)
  ]);
  if(!listRes.res.ok||!unreadRes.res.ok)return respond({error:'No se pudieron cargar las notificaciones.'},502,s.refreshed);
  const notifications=Array.isArray(listRes.body)?listRes.body:[];
  const actors=await profilesFor(env,s.access,notifications.map(n=>n.actor_user_id).filter(Boolean));
  return respond({
    ok:true,
    unread:Array.isArray(unreadRes.body)?unreadRes.body.length:0,
    notifications:notifications.map(n=>({...n,actor:n.actor_user_id?actors[n.actor_user_id]||null:null}))
  },200,s.refreshed);
}

async function markUserNotificationsRead(request,env){
  const s=await requireSession(request,env);if(s.error)return s.error;
  let data;try{data=await readJson(request)}catch{return respond({error:'Datos no válidos.'},400,s.refreshed)}
  const all=data?.all===true;
  const id=all?null:integer(data?.id);
  if(!all&&!id)return respond({error:'Notificación no válida.'},400,s.refreshed);
  const filter=all
    ?`recipient_user_id=eq.${encodeURIComponent(s.user.id)}&read_at=is.null`
    :`id=eq.${id}&recipient_user_id=eq.${encodeURIComponent(s.user.id)}`;
  const r=await db(env,`/rest/v1/forum_user_notifications?${filter}`,s.access,{
    method:'PATCH',
    headers:{'Prefer':'return=minimal'},
    body:JSON.stringify({read_at:new Date().toISOString()})
  });
  if(!r.res.ok)return respond({error:'No se pudo actualizar la notificación.'},400,s.refreshed);
  return respond({ok:true},200,s.refreshed);
}

async function staffNotifications(request,env){
  const s=await requireStaff(request,env);if(s.error)return s.error;
  const userId=encodeURIComponent(s.user.id);
  const [listRes,unreadRes]=await Promise.all([
    db(env,`/rest/v1/forum_staff_notifications?recipient_user_id=eq.${userId}&select=id,kind,title,body,href,topic_id,post_id,report_id,created_at,read_at&order=created_at.desc&limit=40`,s.access),
    db(env,`/rest/v1/forum_staff_notifications?recipient_user_id=eq.${userId}&read_at=is.null&select=id&limit=1000`,s.access)
  ]);
  if(!listRes.res.ok||!unreadRes.res.ok)return respond({error:'No se pudieron cargar las notificaciones.'},502,s.refreshed);
  const notifications=Array.isArray(listRes.body)?listRes.body:[];
  const unread=Array.isArray(unreadRes.body)?unreadRes.body.length:0;
  return respond({ok:true,role:s.role,unread,notifications},200,s.refreshed);
}

async function markStaffNotificationsRead(request,env){
  const s=await requireStaff(request,env);if(s.error)return s.error;
  let data;try{data=await readJson(request)}catch{return respond({error:'Datos no válidos.'},400,s.refreshed)}
  const all=data?.all===true;
  const id=all?null:integer(data?.id);
  if(!all&&!id)return respond({error:'Notificación no válida.'},400,s.refreshed);
  const filter=all
    ?`recipient_user_id=eq.${encodeURIComponent(s.user.id)}&read_at=is.null`
    :`id=eq.${id}&recipient_user_id=eq.${encodeURIComponent(s.user.id)}`;
  const r=await db(env,`/rest/v1/forum_staff_notifications?${filter}`,s.access,{
    method:'PATCH',
    headers:{'Prefer':'return=minimal'},
    body:JSON.stringify({read_at:new Date().toISOString()})
  });
  if(!r.res.ok)return respond({error:'No se pudo actualizar la notificación.'},400,s.refreshed);
  return respond({ok:true},200,s.refreshed);
}

async function rpc(env,access,name,payload){
  return db(env,`/rest/v1/rpc/${name}`,access,{method:'POST',headers:{'Prefer':'return=representation'},body:JSON.stringify(payload)});
}


async function publicUsers(request,env){
  const s=await visibleContext(request,env);
  const r=await rpc(env,s.token,'forum_public_users',{});
  if(!r.res.ok)return respond({error:'No se pudo cargar el resumen de usuarios.'},502,s.refreshed);

  const users=Array.isArray(r.body)?r.body:[];
  const roles=['super_admin','admin','moderator','user'];
  const emptyCounts=()=>Object.fromEntries(roles.map(role=>[role,0]));
  const onlineByRole=emptyCounts();
  const offlineByRole=emptyCounts();

  for(const user of users){
    const role=roles.includes(user?.role)?user.role:'user';
    if(user?.is_online)onlineByRole[role]++;
    else offlineByRole[role]++;
  }

  const online=Object.values(onlineByRole).reduce((sum,n)=>sum+n,0);
  const offline=Object.values(offlineByRole).reduce((sum,n)=>sum+n,0);

  return respond({
    total:online+offline,
    online,
    offline,
    by_role:{
      online:onlineByRole,
      offline:offlineByRole
    }
  },200,s.refreshed);
}

async function presencePing(request,env){
  const s=await requireSession(request,env);if(s.error)return s.error;
  const r=await rpc(env,s.access,'forum_presence_ping',{});
  if(!r.res.ok)return respond({error:'No se pudo actualizar el estado de conexión.'},400,s.refreshed);
  return respond({ok:true},200,s.refreshed);
}


async function recentActivity(request,env){
  const s=await visibleContext(request,env);

  const [topicsRes,postsRes]=await Promise.all([
    db(env,'/rest/v1/forum_topics?select=id,category_id,author_id,title,slug,slug_en,created_at,last_post_at&is_hidden=eq.false&order=created_at.desc&limit=8',s.token),
    db(env,'/rest/v1/forum_posts?select=id,topic_id,author_id,body,created_at&deleted_at=is.null&is_hidden=eq.false&order=created_at.desc&limit=40',s.token)
  ]);

  if(!topicsRes.res.ok||!postsRes.res.ok)return respond({error:'No se pudo cargar la actividad reciente.'},502,s.refreshed);

  const latestTopics=Array.isArray(topicsRes.body)?topicsRes.body:[];
  const recentPosts=Array.isArray(postsRes.body)?postsRes.body:[];
  const topicIds=[...new Set([...latestTopics.map(t=>t.id),...recentPosts.map(p=>p.topic_id)].filter(Boolean))];

  let topicMap={};
  let categoryMap={};
  const rootIds=new Set();

  if(topicIds.length){
    const [allTopicsRes,allPostsRes]=await Promise.all([
      db(env,`/rest/v1/forum_topics?id=in.(${topicIds.join(',')})&select=id,category_id,author_id,title,slug,slug_en,created_at&is_hidden=eq.false&limit=200`,s.token),
      db(env,`/rest/v1/forum_posts?topic_id=in.(${topicIds.join(',')})&select=id,topic_id,created_at&deleted_at=is.null&is_hidden=eq.false&order=created_at.asc,id.asc&limit=5000`,s.token)
    ]);

    if(allTopicsRes.res.ok&&Array.isArray(allTopicsRes.body)){
      for(const item of allTopicsRes.body)topicMap[item.id]=item;
      const categoryIds=[...new Set(allTopicsRes.body.map(t=>t.category_id).filter(Boolean))];
      if(categoryIds.length){
        const cr=await db(env,`/rest/v1/forum_categories?id=in.(${categoryIds.join(',')})&select=id,name,slug,slug_en&is_visible=eq.true&limit=200`,s.token);
        if(cr.res.ok&&Array.isArray(cr.body))for(const item of cr.body)categoryMap[item.id]=item;
      }
    }

    if(allPostsRes.res.ok&&Array.isArray(allPostsRes.body)){
      const seen=new Set();
      for(const post of allPostsRes.body){
        if(seen.has(post.topic_id))continue;
        seen.add(post.topic_id);
        rootIds.add(post.id);
      }
    }
  }

  const replies=recentPosts.filter(p=>!rootIds.has(p.id)&&topicMap[p.topic_id]).slice(0,8);
  const authorIds=[...latestTopics.map(t=>t.author_id),...replies.map(p=>p.author_id)];
  const authors=await profilesFor(env,s.token,authorIds);

  const cleanExcerpt=value=>{
    const text=String(value||'')
      .replace(/\[(.*?)\]\((?:https?:\/\/)?[^)]+\)/g,'$1')
      .replace(/[\*_~>#|]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
    return text.length>150?text.slice(0,147)+'…':text;
  };

  const topicsOut=latestTopics.slice(0,6).map(t=>({
    id:t.id,
    title:t.title,slug:t.slug,slug_en:t.slug_en,
    created_at:t.created_at,
    category:categoryMap[t.category_id]||null,
    author:authors[t.author_id]||null
  }));

  const repliesOut=replies.slice(0,6).map(p=>{
    const topic=topicMap[p.topic_id];
    return {
      id:p.id,
      topic_id:p.topic_id,
      topic_title:topic?.title||'Tema',
      topic_slug:topic?.slug||null,
      topic_slug_en:topic?.slug_en||null,
      created_at:p.created_at,
      excerpt:cleanExcerpt(p.body),
      category:topic?categoryMap[topic.category_id]||null:null,
      author:authors[p.author_id]||null
    };
  });

  return respond({topics:topicsOut,replies:repliesOut},200,s.refreshed);
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
  const replyTo=integer(data?.reply_to_post_id);
  const body=cleanText(data?.body,20000);
  if(!topicId||!body)return respond({error:'Escribe una respuesta.'},400,s.refreshed);
  const r=await rpc(env,s.access,'forum_create_reply',{p_topic_id:topicId,p_body:body,p_reply_to_post_id:replyTo||null});
  if(!r.res.ok)return respond({error:forumError(r.body,r.res.status)},r.res.status===403?403:400,s.refreshed);
  return respond({ok:true,post_id:Number(r.body)||r.body,reply_to_post_id:replyTo||null},201,s.refreshed);
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


const AUTO_LANGS={
  es:new Set('el la los las de del al que por para con como este esta esto hay una uno un es son en su sus se lo te me nos mi si no más pero aquí cuando desde sobre hola gracias mensaje foro puedes ayuda quiero necesito pregunta'.split(' ')),
  en:new Set('the this that for with you your when what where why how are is it and or from have has can will would should not but there here hello thanks please post forum message help need want'.split(' ')),
  pt:new Set('não uma um que para por com como este esta isso você vocês obrigado olá mensagem fórum estou temos quando onde'.split(' ')),
  fr:new Set('une les des est sont pas pour avec dans sur bonjour merci vous nous votre cette comment pourquoi quand message forum'.split(' ')),
  de:new Set('und der die das ist sind nicht mit für von aber wie wenn ich du sie wir danke hallo bitte einen eine nach'.split(' ')),
  it:new Set('non una uno per con nel nella come che sono ciao grazie quando questo questa dove perché voi noi il gli'.split(' '))
};
function detectPostLanguage(text){
  const cleaned=String(text||'').replace(/https?:\/\/\S+/g,' ').replace(/(?:\x60{3})[\s\S]*?\x60{3}/g,' ').toLowerCase();
  const words=(cleaned.match(/\p{L}{2,}/gu)||[]).slice(0,150);
  if(words.length<3)return 'und';
  const scores=Object.fromEntries(Object.keys(AUTO_LANGS).map(lang=>[lang,0]));
  for(const word of words){
    for(const [lang,set] of Object.entries(AUTO_LANGS))if(set.has(word))scores[lang]++;
  }
  const sorted=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  return sorted[0][1]>=2&&sorted[0][1]>sorted[1][1]?sorted[0][0]:'und';
}
async function translateForumPost(request,env){
  // Translation is opt-in, authenticated, and fetches only an existing visible public post.
  const s=await visibleContext(request,env);
  if(!s.user)return respond({error:'Sign in to translate forum messages.'},401,s.refreshed);
  if(!env.AI)return respond({error:'Translation service is not configured yet.'},503,s.refreshed);
  let input;try{input=await readJson(request)}catch{return respond({error:'Invalid request.'},400,s.refreshed)}
  const id=integer(input?.post_id,1,Number.MAX_SAFE_INTEGER);
  const target=['es','en'].includes(input?.target_lang)?input.target_lang:null;
  if(!id||!target)return respond({error:'Invalid message or target language.'},400,s.refreshed);
  const row=await db(env,'/rest/v1/forum_posts?id=eq.'+id+'&is_hidden=eq.false&deleted_at=is.null&select=id,topic_id,body,updated_at&limit=1',s.token);
  const post=row.res.ok&&Array.isArray(row.body)?row.body[0]:null;
  if(!post)return respond({error:'The message is not available.'},404,s.refreshed);
  const topicResult=await db(env,'/rest/v1/forum_topics?id=eq.'+post.topic_id+'&is_hidden=eq.false&select=id&limit=1',s.token);
  if(!topicResult.res.ok||!Array.isArray(topicResult.body)||!topicResult.body.length)
    return respond({error:'The conversation is not public.'},404,s.refreshed);
  const source=detectPostLanguage(post.body);
  if(source==='und')return respond({error:'Could not reliably detect this message language. Short or multilingual texts may need manual translation.'},422,s.refreshed);
  if(source===target)return respond({original_language:source,target_language:target,same_language:true,translation:null},200,s.refreshed);
  // The source post remains untouched. The translated extract is plain text, never executable HTML.
  const cleaned=String(post.body||'')
    .replace(/\x60{3}[\s\S]*?\x60{3}/g,'[code omitted]')
    .replace(/https?:\/\/[^\s)]+/g,'[link]')
    .replace(/\[(?:\/)?(?:b|i|u|s|quote|code|url|img|color|size|button|center|h2|h3|spoiler)[^\]]*\]/gi,'')
    .replace(/\s+/g,' ').trim();
  const excerpt=cleaned.slice(0,1400);
  if(!excerpt)return respond({error:'This post has no translatable text.'},422,s.refreshed);
  const cacheKey=new Request('https://a90-i18n-cache.invalid/forum/'+id+'/'+target+'/'+encodeURIComponent(post.updated_at||'initial'));
  let cached=null;
  try{cached=await caches.default.match(cacheKey)}catch{}
  if(cached){const data=await cached.json().catch(()=>null);if(data)return respond(data,200,s.refreshed)}
  let output;
  try{output=await env.AI.run('@cf/meta/m2m100-1.2b',{text:excerpt,source_lang:source,target_lang:target})}
  catch{return respond({error:'Automatic translation is temporarily unavailable.'},503,s.refreshed)}
  const translated=String(output?.translated_text||output?.translation||output?.answer||'').trim();
  if(!translated)return respond({error:'The translation service returned no text.'},503,s.refreshed);
  const data={translation:translated.slice(0,5000),original_language:source,target_language:target,truncated:cleaned.length>excerpt.length,automated:true};
  try{await caches.default.put(cacheKey,new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=604800'}}))}catch{}
  return respond(data,200,s.refreshed);
}
