const ACCESS_COOKIE='a90_access';
const ROLES={user:10,moderator:20,admin:30,super_admin:40};

export async function handleCommunityProjectsSetup(request,env,url){
  if(url.pathname!=='/api/admin/community-projects-setup')return null;
  if(request.method!=='POST')return json({error:'Método no permitido.'},405);
  if(!sameOrigin(request,url))return json({error:'Solicitud rechazada.'},403);

  const access=parseCookies(request)[ACCESS_COOKIE]||'';
  if(!access)return json({error:'Inicia sesión.'},401);
  const user=await authUser(env,access);
  if(!user)return json({error:'La sesión ha caducado.'},401);
  const role=await roleOf(env,access,user.id);
  if(role!=='super_admin')return json({error:'Se requiere Super Admin.'},403);
  if(jwtAal(access)!=='aal2')return json({error:'Verifica MFA antes de continuar.',code:'mfa_required'},403);

  const parent=await ensureCategory(env,access,{
    parent_id:null,
    slug:'proyectos-de-la-comunidad',
    name:'Proyectos de la comunidad',
    description:'Un espacio para enseñar lo que estás creando, descubrir proyectos de otros usuarios y encontrar feedback o colaboradores.',
    sort_order:55,
    min_role_to_post:'user',
    is_locked:false,
    is_visible:true
  });
  if(!parent.ok)return json({error:'No se pudo crear la categoría principal.',details:parent.details},502);

  const present=await ensureCategory(env,access,{
    parent_id:parent.category.id,
    slug:'presenta-tu-proyecto',
    name:'Presenta tu proyecto',
    description:'Programas, juegos, música, webs, mods, arte, vídeos, hardware y cualquier otra creación propia.',
    sort_order:10,
    min_role_to_post:'user',
    is_locked:false,
    is_visible:true
  });
  if(!present.ok)return json({error:'No se pudo crear el subforo de presentaciones.',details:present.details},502);

  const collab=await ensureCategory(env,access,{
    parent_id:parent.category.id,
    slug:'feedback-y-colaboracion',
    name:'Feedback y colaboración',
    description:'Busca opiniones, testers o colaboradores y ayuda a otros proyectos de la comunidad.',
    sort_order:20,
    min_role_to_post:'user',
    is_locked:false,
    is_visible:true
  });
  if(!collab.ok)return json({error:'No se pudo crear el subforo de colaboración.',details:collab.details},502);

  const title='Bienvenidos a Proyectos de la comunidad — presenta lo que estás creando';
  const body=`[h2]Este espacio es para vuestros proyectos[/h2]\n\nA 90 Files no quiere ser solo un sitio donde descargar o comentar nuestros proyectos. También queremos que cualquier miembro de la comunidad tenga un lugar donde enseñar lo que está creando y recibir opiniones de otras personas.\n\nAquí tienen cabida proyectos de todo tipo:\n- Programas, aplicaciones y herramientas.\n- Juegos, mods y prototipos.\n- Música, podcasts y proyectos de audio.\n- Páginas web y servicios online.\n- Vídeos, animación, diseño, ilustración y fotografía.\n- Hardware, electrónica, impresión 3D y proyectos físicos.\n- Proyectos educativos, experimentales o simplemente hechos por afición.\n- Y, en general, cualquier creación propia que quieras compartir.\n\n[h3]¿Dónde publico?[/h3]\n\n[b]Presenta tu proyecto[/b] es el lugar para abrir un tema propio y explicar qué estás haciendo.\n\n[b]Feedback y colaboración[/b] sirve para pedir opiniones más concretas, encontrar testers, músicos, artistas, programadores, diseñadores u otras personas que quieran colaborar.\n\n[h3]Qué recomendamos incluir[/h3]\n\n- Nombre del proyecto.\n- Qué es y para qué sirve.\n- En qué estado se encuentra: idea, prototipo, beta, publicado, etc.\n- Capturas, vídeo o imágenes si ayudan a entenderlo.\n- Enlace oficial, repositorio o descarga cuando exista.\n- Qué tipo de feedback o ayuda estás buscando.\n\nNo hace falta ser profesional ni tener algo terminado. Un proyecto pequeño, raro, experimental o hecho por hobby es igual de válido si quieres enseñarlo.\n\n[h3]Unas reglas sencillas[/h3]\n\nPuedes hablar de proyectos gratuitos o de pago, pero esto no es un tablón de spam. Presenta algo en lo que participes de verdad y explica qué es. No se permite malware, engaños, piratería, enlaces maliciosos, contenido que vulnere derechos de terceros ni publicaciones puramente publicitarias repetidas.\n\nLas críticas deben intentar ayudar. Se puede decir que algo no gusta o que funciona mal, pero sin convertir el feedback en ataques personales.\n\n[quote]La idea es sencilla: enseñar lo que hacemos, aprender unos de otros y ayudar a que los proyectos salgan mejores.[/quote]\n\nSi estás creando algo, abre tu tema y cuéntanoslo. Aunque esté empezando. 🚀\n\n— [b]A90Admin · Super Admin[/b]`;

  const topic=await ensureTopic(env,access,present.category.id,title,body);
  if(!topic.ok)return json({error:'La sección se creó, pero no se pudo crear el hilo de bienvenida.',details:topic.details},502);

  const pin=await db(env,`/rest/v1/forum_topics?id=eq.${topic.id}`,access,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({is_pinned:true})});
  if(!pin.res.ok)return json({error:'El hilo se creó, pero no se pudo fijar.',details:pin.body},502);

  return json({ok:true,parent_id:parent.category.id,present_id:present.category.id,collab_id:collab.category.id,topic_id:topic.id});
}

async function ensureCategory(env,access,row){
  const existing=await db(env,`/rest/v1/forum_categories?slug=eq.${encodeURIComponent(row.slug)}&select=id,parent_id,slug,name,description,sort_order,min_role_to_post,is_locked,is_visible&limit=1`,access);
  if(existing.res.ok&&Array.isArray(existing.body)&&existing.body[0])return {ok:true,category:existing.body[0]};
  const created=await db(env,'/rest/v1/forum_categories',access,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
  if(!created.res.ok||!Array.isArray(created.body)||!created.body[0])return {ok:false,details:created.body};
  return {ok:true,category:created.body[0]};
}

async function ensureTopic(env,access,categoryId,title,body){
  const existing=await db(env,`/rest/v1/forum_topics?category_id=eq.${categoryId}&title=eq.${encodeURIComponent(title)}&select=id&limit=1`,access);
  if(existing.res.ok&&Array.isArray(existing.body)&&existing.body[0]?.id)return {ok:true,id:Number(existing.body[0].id)};
  const created=await db(env,'/rest/v1/rpc/forum_create_topic',access,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_category_id:categoryId,p_title:title,p_body:body})});
  if(!created.res.ok)return {ok:false,details:created.body};
  const id=Number(created.body);
  if(!Number.isSafeInteger(id)||id<1)return {ok:false,details:created.body};
  return {ok:true,id};
}

function parseCookies(request){const out={};for(const part of (request.headers.get('Cookie')||'').split(';')){const i=part.indexOf('=');if(i<0)continue;const key=part.slice(0,i).trim();if(!key)continue;try{out[key]=decodeURIComponent(part.slice(i+1).trim())}catch{out[key]=part.slice(i+1).trim()}}return out}
function sameOrigin(request,url){const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return false;const site=request.headers.get('Sec-Fetch-Site');return !site||site==='same-origin'||site==='same-site'||site==='none'}
function headers(env,access){return {'apikey':env.SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${access}`,'Content-Type':'application/json','Accept':'application/json'}}
async function db(env,path,access,options={}){const res=await fetch(env.SUPABASE_URL+path,{...options,headers:{...headers(env,access),...(options.headers||{})}});const text=await res.text();let body=null;if(text){try{body=JSON.parse(text)}catch{body=text}}return {res,body}}
async function authUser(env,access){const r=await db(env,'/auth/v1/user',access);return r.res.ok?r.body:null}
async function roleOf(env,access,userId){const r=await db(env,`/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`,access);return r.res.ok&&Array.isArray(r.body)&&r.body[0]?.role?r.body[0].role:'user'}
function jwtAal(token){try{const raw=String(token).split('.')[1]||'';const normalized=raw.replace(/-/g,'+').replace(/_/g,'/');const padded=normalized+'='.repeat((4-normalized.length%4)%4);return JSON.parse(atob(padded))?.aal==='aal2'?'aal2':'aal1'}catch{return 'aal1'}}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}
