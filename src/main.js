import authWorker from './index.js';
import {handleForumApi} from './forum-api.js';
import {handleModApi} from './mod-api.js';
import {handleExtraAuth} from './oauth-extra.js';
import {handleHealth} from './health.js';

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);

    const health=await handleHealth(request,env,url);
    if(health)return health;

    const extraAuth=await handleExtraAuth(request,env,url);
    if(extraAuth)return extraAuth;

    if(url.pathname.startsWith('/api/mod/')){
      if(!['GET','POST'].includes(request.method)) return json({error:'Método no permitido.'},405);
      if(request.method==='POST'&&!sameOrigin(request,url)) return json({error:'Solicitud rechazada.'},403);
      return handleModApi(request,env,url);
    }
    if(url.pathname.startsWith('/api/forum/')){
      if(!['GET','POST'].includes(request.method)) return json({error:'Método no permitido.'},405);
      if(request.method==='POST'&&!sameOrigin(request,url)) return json({error:'Solicitud rechazada.'},403);
      return handleForumApi(request,env,url);
    }

    const response=await authWorker.fetch(request,env,ctx);
    if(url.pathname.startsWith('/api/'))return response;
    return hardenStatic(response);
  }
};

function sameOrigin(request,url){
  const origin=request.headers.get('Origin');
  if(origin&&origin!==url.origin)return false;
  const site=request.headers.get('Sec-Fetch-Site');
  return !site||site==='same-origin'||site==='same-site'||site==='none';
}

function hardenStatic(response){
  const headers=new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('X-Frame-Options','DENY');
  headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  headers.set('Content-Security-Policy',"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://ugwdxcmmxeqzoxgdofkd.supabase.co");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

function json(data,status){
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
