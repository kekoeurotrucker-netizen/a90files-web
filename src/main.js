import authWorker from './index.js';
import {handleForumApi} from './forum-api.js';
import {handleModApi} from './mod-api.js';

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
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
    return authWorker.fetch(request,env,ctx);
  }
};

function sameOrigin(request,url){
  const origin=request.headers.get('Origin');
  if(origin&&origin!==url.origin)return false;
  const site=request.headers.get('Sec-Fetch-Site');
  return !site||site==='same-origin'||site==='same-site'||site==='none';
}

function json(data,status){
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
