/* A90 Control CMS — Supabase JWT/RLS enforced; super admin + verified MFA for writes and drafts. */
const TABLES={articles:'cms_articles',modules:'cms_modules',media:'cms_media',settings:'cms_settings'};
const COOKIE='a90_access';
const fields={
  articles:'id,slug,title_es,title_en,excerpt_es,excerpt_en,body_es,body_en,cover_path,status,is_featured,author_id,published_at,created_at,updated_at',
  modules:'key,sort_order,enabled,title_es,title_en,updated_at',
  media:'id,label,asset_path,alt_es,alt_en,created_at',
  settings:'key,value,updated_at'
};
const clean=(v,max=4000)=>String(v??'').trim().slice(0,max);
const validSlug=s=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)&&s.length<=100;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function result(value,status=200){return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}
function cookie(request){for(const p of (request.headers.get('Cookie')||'').split(';')){const [k,...v]=p.trim().split('=');if(k===COOKIE){try{return decodeURIComponent(v.join('='))}catch{return v.join('=')}}}return ''}
function originOK(request,url){const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return false;return !['cross-site'].includes(request.headers.get('Sec-Fetch-Site'))}
function aal(token){try{const part=token.split('.')[1]||'';return JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')))?.aal==='aal2'}catch{return false}}
async function query(env,path,token='',options={}){
  const key=env.SUPABASE_PUBLISHABLE_KEY;
  const headers={'apikey':key,'Authorization':'Bearer '+(token||key),'Content-Type':'application/json','Accept':'application/json',...(options.headers||{})};
  const response=await fetch(env.SUPABASE_URL+'/rest/v1/'+path,{...options,headers});
  const text=await response.text();let data=null;try{data=text?JSON.parse(text):null}catch{data={message:'Respuesta inesperada'}}
  return {ok:response.ok,status:response.status,data};
}
async function superAdmin(request,env){
 const token=cookie(request);
 if(!token)return {error:result({error:'Inicia sesión con la Cuenta A90.'},401)};
 let user;try{
  const r=await fetch(env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+token}});
  if(!r.ok)return {error:result({error:'La sesión ha caducado.'},401)};
  user=await r.json();
 }catch{return {error:result({error:'No se pudo verificar la sesión.'},503)}}
 const role=await query(env,'user_roles?user_id=eq.'+encodeURIComponent(user.id)+'&select=role&limit=1',token);
 if(!role.ok||!Array.isArray(role.data)||role.data[0]?.role!=='super_admin')return {error:result({error:'Panel reservado al Super Admin.'},403)};
 if(!aal(token))return {error:result({error:'Verifica MFA para administrar contenidos.',code:'mfa_required'},403)};
 return {token,user};
}
async function publicArticles(env,slug){
 const filter=slug?'&slug=eq.'+encodeURIComponent(slug):'';
 const res=await query(env,TABLES.articles+'?select='+fields.articles+'&status=eq.published'+filter+'&order=published_at.desc.nullslast,created_at.desc&limit='+(slug?'1':'36'));
 return res.ok?res.data:null;
}
export async function loadPublishedArticle(env,slug){
 if(!validSlug(slug))return null;
 const found=await publicArticles(env,slug);
 return Array.isArray(found)?found[0]||null:null;
}
export async function handleCmsApi(request,env,url){
 if(!url.pathname.startsWith('/api/cms/'))return null;
 const part=url.pathname.slice('/api/cms/'.length);
 if(request.method==='GET'&&part==='published'){
  const rows=await publicArticles(env,null);
  if(!rows)return result({error:'No se pudo cargar la información editorial.'},503);
  return result({articles:rows});
 }
 if(request.method==='GET'&&part==='public-modules'){
  const rows=await query(env,TABLES.modules+'?select='+fields.modules+'&order=sort_order.asc');
  if(!rows.ok)return result({error:'Módulos no disponibles.'},503);
  return result({modules:rows.data||[]});
 }
 if(request.method==='GET'&&part==='article'){
  const slug=clean(url.searchParams.get('slug'),100);
  if(!validSlug(slug))return result({error:'Ruta de artículo inválida.'},400);
  const article=await loadPublishedArticle(env,slug);
  return article?result({article}):result({error:'Artículo no encontrado.'},404);
 }
 const admin=await superAdmin(request,env);
 if(admin.error)return admin.error;
 if(request.method==='GET'&&part==='dashboard'){
  const parts=await Promise.all([
   query(env,TABLES.articles+'?select='+fields.articles+'&order=updated_at.desc&limit=100',admin.token),
   query(env,TABLES.modules+'?select='+fields.modules+'&order=sort_order.asc',admin.token),
   query(env,TABLES.media+'?select='+fields.media+'&order=created_at.desc&limit=200',admin.token),
   query(env,TABLES.settings+'?select='+fields.settings+'&order=key.asc',admin.token)
  ]);
  if(parts.some(x=>!x.ok))return result({error:'No se pudieron cargar todos los datos del panel.',status:parts.map(x=>x.status)},502);
  return result({articles:parts[0].data,modules:parts[1].data,media:parts[2].data,settings:parts[3].data});
 }
 if(request.method!=='POST')return result({error:'Operación no disponible.'},405);
 if(!originOK(request,url))return result({error:'Solicitud de otro origen rechazada.'},403);
 if(Number(request.headers.get('Content-Length')||0)>140000)return result({error:'Contenido demasiado grande.'},413);
 let data;
 try{data=await request.json()}catch{return result({error:'JSON no válido.'},400)}
 if(!data||typeof data!=='object'||Array.isArray(data))return result({error:'Datos inválidos.'},400);
 if(part==='article'){
  const slug=clean(data.slug,100).toLowerCase();
  const id=Number(data.id);
  if(!validSlug(slug))return result({error:'La URL solo permite minúsculas, números y guiones.'},400);
  const status=clean(data.status,25)||'draft';
  const cover=clean(data.cover_path,260);
  if(!['draft','published','archived'].includes(status))return result({error:'Estado incorrecto.'},400);
  if(cover&&!/^\/assets\/[a-zA-Z0-9/_-]+\.(?:webp|jpg|jpeg|png|svg)$/.test(cover))return result({error:'Selecciona una imagen de la biblioteca.'},400);
  const item={
   slug,title_es:clean(data.title_es,180),title_en:clean(data.title_en,180),
   excerpt_es:clean(data.excerpt_es,500),excerpt_en:clean(data.excerpt_en,500),
   body_es:clean(data.body_es,60000),body_en:clean(data.body_en,60000),
   cover_path:cover,status,is_featured:data.is_featured===true,
   published_at:status==='published'?(typeof data.published_at==='string'&&data.published_at?data.published_at:new Date().toISOString()):null
  };
  if(item.title_es.length<3||!item.body_es)return result({error:'Escribe un título y contenido en español.'},400);
  const updating=Number.isSafeInteger(id)&&id>0;
  const endpoint=TABLES.articles+(updating?'?id=eq.'+id:'');
  if(!updating)item.author_id=admin.user.id;
  const save=await query(env,endpoint,admin.token,{method:updating?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(item)});
  if(!save.ok)return result({error:save.status===409?'Ese identificador ya existe.':'No se pudo guardar el artículo.',detail:save.status},save.status===409?409:502);
  if(!Array.isArray(save.data)||save.data.length!==1)return result({error:'No se modificó el artículo; recarga e inténtalo de nuevo.'},409);
  return result({ok:true,article:save.data[0]});
 }
 if(part==='module'){
  const key=clean(data.key,40);
  if(!['software','games','channel','support'].includes(key))return result({error:'Módulo desconocido.'},400);
  const order=Number(data.sort_order);
  if(!Number.isInteger(order)||order<1||order>4)return result({error:'Orden inválido.'},400);
  const all=await query(env,TABLES.modules+'?select=key,sort_order',admin.token);
  if(!all.ok)return result({error:'No se pudo comprobar el orden.'},502);
  const current=all.data.find(x=>x.key===key);
  if(!current)return result({error:'El módulo no existe.'},404);
  // Perform a two-step swap in one admin action, using a temporary fifth rank.
  if(current.sort_order!==order){
    const other=all.data.find(x=>x.sort_order===order);
    if(other){
      const temp=await query(env,TABLES.modules+'?key=eq.'+encodeURIComponent(other.key),admin.token,{method:'PATCH',body:JSON.stringify({sort_order:5})});
      // The database constrains orders to 1..4; editing order is handled in a dedicated endpoint below.
      if(!temp.ok)return result({error:'No se pudo reordenar. Prueba desactivar o cambiar el nombre del módulo.'},409);
      await query(env,TABLES.modules+'?key=eq.'+encodeURIComponent(other.key),admin.token,{method:'PATCH',body:JSON.stringify({sort_order:current.sort_order})});
    }
  }
  const item={enabled:data.enabled===true,title_es:clean(data.title_es,80),title_en:clean(data.title_en,80),sort_order:order};
  if(item.title_es.length<2||item.title_en.length<2)return result({error:'Introduce ambos títulos.'},400);
  const saved=await query(env,TABLES.modules+'?key=eq.'+encodeURIComponent(key),admin.token,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(item)});
  if(!saved.ok)return result({error:'No se pudo actualizar el módulo.'},502);
  return result({ok:true,module:saved.data?.[0]});
 }
 if(part==='media'){
  const asset_path=clean(data.asset_path,260);
  const label=clean(data.label,140);
  if(label.length<2||!/^\/assets\/[a-zA-Z0-9/_-]+\.(?:webp|jpg|jpeg|png|svg)$/.test(asset_path))return result({error:'Usa la ruta de una imagen ya publicada en /assets/.'},400);
  const saved=await query(env,TABLES.media,admin.token,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({label,asset_path,alt_es:clean(data.alt_es,180),alt_en:clean(data.alt_en,180)})});
  if(!saved.ok)return result({error:'No se pudo incorporar la imagen.'},502);
  return result({ok:true,media:saved.data?.[0]});
 }
 if(part==='settings'){
  const key=clean(data.key,50);
  if(!['site_announcement','editorial_banner'].includes(key))return result({error:'Ajuste no reconocido.'},400);
  const saved=await query(env,TABLES.settings+'?key=eq.'+key,admin.token,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({value:clean(data.value,4000)})});
  if(!saved.ok)return result({error:'No se pudo guardar el ajuste.'},502);
  return result({ok:true,setting:saved.data?.[0]});
 }
 return result({error:'Acción no disponible.'},404);
}
// Render user-authored Markdown as safely escaped text. HTML is never accepted.
export function renderCmsMarkdown(text){
 return String(text||'').slice(0,60000).split(/\n\s*\n/).map(par=>{
  const value=par.trim();
  if(!value)return '';
  if(value.startsWith('### '))return '<h3>'+esc(value.slice(4))+'</h3>';
  if(value.startsWith('## '))return '<h2>'+esc(value.slice(3))+'</h2>';
  const lines=value.split('\n');
  if(lines.every(x=>x.startsWith('- ')))return '<ul>'+lines.map(line=>'<li>'+esc(line.slice(2))+'</li>').join('')+'</ul>';
  return '<p>'+esc(value).replace(/\n/g,'<br>')+'</p>';
 }).join('');
}
export function renderPublicCmsArticle(article,language,url){
 const en=language==='en',title=(en&&article.title_en)||article.title_es,summary=(en&&article.excerpt_en)||article.excerpt_es;
 const body=(en&&article.body_en)||article.body_es;
 const original=url.origin+'/articulos/'+article.slug+'/',english=url.origin+'/en/articulos/'+article.slug+'/';
 const cover=article.cover_path?'<img src="'+esc(article.cover_path)+'" alt="" loading="eager">':'';
 return '<!doctype html><html lang="'+language+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><meta name="description" content="'+esc(summary)+'"><title>'+esc(title)+' — A90 Files</title><link rel="canonical" href="'+(en?english:original)+'"><link rel="alternate" hreflang="es" href="'+original+'"><link rel="alternate" hreflang="en" href="'+english+'"><link rel="alternate" hreflang="x-default" href="'+original+'"><link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/home-lower-cards.css?v=20261010-elegant-4"><link rel="stylesheet" href="/assets/cms-article.css?v=1"></head><body class="a90-cms-article"><header class="topbar"><div class="topbar-inner shell"><a class="brand" href="/"><strong>A 90 Files</strong></a><nav class="nav"><a href="'+(en?'/en/':'/')+'">'+(en?'Home':'Inicio')+'</a><a href="'+(en?'/en/novedades/':'/novedades/')+'">'+(en?'News':'Novedades')+'</a><a href="'+(en?'/en/foro/':'/foro/')+'">'+(en?'Forum':'Foro')+'</a></nav></div></header><main class="cms-reading shell"><div class="cms-crumb"><a href="'+(en?'/en/novedades/':'/novedades/')+'">'+(en?'NEWS':'NOVEDADES')+'</a><span>/</span><span>A 90 FILES</span></div><article><header class="cms-reading-head"><small>'+(en?'OFFICIAL ARTICLE':'ARTÍCULO OFICIAL')+'</small><h1>'+esc(title)+'</h1><p>'+esc(summary)+'</p><time datetime="'+esc(article.published_at||article.created_at)+'">'+esc(new Date(article.published_at||article.created_at).toLocaleDateString(en?'en-GB':'es-ES',{day:'2-digit',month:'long',year:'numeric'}))+'</time></header>'+ (cover?'<figure>'+cover+'</figure>':'')+'<div class="cms-article-body">'+renderCmsMarkdown(body)+'</div></article><footer><a href="'+(en?'/en/novedades/':'/novedades/')+'">← '+(en?'Back to news':'Volver a Novedades')+'</a></footer></main><script src="/assets/app.js?v=20261009-gradient-frame-1" defer></script></body></html>';
}