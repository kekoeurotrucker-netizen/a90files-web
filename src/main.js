import authWorker from './index.js';
import {handleForumApi} from './forum-api.js';
import {handleModApi} from './mod-api-secure.js';
import {handleExtraAuth} from './oauth-extra.js';
import {handleHealth} from './health.js';
import {handleSecurityAuth} from './security-auth-api.js';

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);

    if(url.pathname==='/assets/auth.js'){
      const original=await env.ASSETS.fetch(request);
      if(!original.ok)return original;
      const text=await original.text();
      const headers=new Headers(original.headers);
      headers.set('Content-Type','application/javascript; charset=utf-8');
      headers.set('Cache-Control','no-cache');
      return new Response(text+"\n;import('/assets/security-auth.js');\n",{status:original.status,headers});
    }

    const health=await handleHealth(request,env,url);
    if(health)return hardenApi(health);

    const secureAuth=await handleSecurityAuth(request,env,url,authWorker);
    if(secureAuth)return hardenApi(secureAuth);

    const extraAuth=await handleExtraAuth(request,env,url);
    if(extraAuth)return hardenApi(extraAuth);

    if(url.pathname.startsWith('/api/mod/')){
      if(!['GET','POST'].includes(request.method)) return hardenApi(json({error:'Método no permitido.'},405));
      if(request.method==='POST'&&!sameOrigin(request,url)) return hardenApi(json({error:'Solicitud rechazada.'},403));
      return hardenApi(await handleModApi(request,env,url));
    }
    if(url.pathname.startsWith('/api/forum/')){
      if(!['GET','POST'].includes(request.method)) return hardenApi(json({error:'Método no permitido.'},405));
      if(request.method==='POST'&&!sameOrigin(request,url)) return hardenApi(json({error:'Solicitud rechazada.'},403));
      return hardenApi(await handleForumApi(request,env,url));
    }

    const response=await authWorker.fetch(request,env,ctx);
    if(url.pathname.startsWith('/api/'))return hardenApi(response);
    return hardenStatic(response);
  }
};
function sameOrigin(request,url){const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return false;const site=request.headers.get('Sec-Fetch-Site');return !site||site==='same-origin'||site==='same-site'||site==='none'}
function baseSecurityHeaders(headers){headers.set('X-Content-Type-Options','nosniff');headers.set('X-Frame-Options','DENY');headers.set('Referrer-Policy','no-referrer');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');headers.set('X-Permitted-Cross-Domain-Policies','none');return headers}
function hardenApi(response){const headers=baseSecurityHeaders(new Headers(response.headers));headers.set('Cross-Origin-Resource-Policy','same-origin');if(!headers.has('Cache-Control'))headers.set('Cache-Control','private, no-store');return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
function hardenStatic(response){const headers=baseSecurityHeaders(new Headers(response.headers));headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('Cross-Origin-Opener-Policy','same-origin');headers.set('Cross-Origin-Resource-Policy','same-origin');headers.set('Origin-Agent-Cluster','?1');headers.set('X-DNS-Prefetch-Control','off');headers.set('Content-Security-Policy',"default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; media-src 'self'; frame-src https://challenges.cloudflare.com; worker-src 'self'; manifest-src 'self'; upgrade-insecure-requests");return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
function json(data,status){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}
