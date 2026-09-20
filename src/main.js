import authWorker from './index.js';
import {handleForumApi} from './forum-api.js';
import {handleModApi} from './mod-api-secure.js';
import {handleExtraAuth} from './oauth-extra.js';
import {handleHealth} from './health.js';
import {handleSecurityAuth} from './security-auth-api.js';

const FORUM_BUILD='20260921-users-privacy-2';
const GLOBAL_BUILD='20260921-social-8';
const SOCIAL_RAIL=`<nav class="a90-social-rail" aria-label="Redes sociales de A 90 por Hora">
<a class="a90-social-link" href="https://www.facebook.com/a90porhorafb/?locale=es_ES" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.414c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97H15.83c-1.491 0-1.956.931-1.956 1.887v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg></a>
<a class="a90-social-link" href="https://www.instagram.com/a90porhora/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.849.07 1.17.053 1.805.249 2.227.413a4.412 4.412 0 0 1 1.608 1.045 4.412 4.412 0 0 1 1.045 1.608c.164.422.36 1.057.413 2.227.058 1.265.07 1.645.07 4.849s-.012 3.584-.07 4.849c-.053 1.17-.249 1.805-.413 2.227a4.412 4.412 0 0 1-1.045 1.608 4.412 4.412 0 0 1-1.608 1.045c-.422.164-1.057.36-2.227.413-1.265.058-1.645.07-4.849.07s-3.584-.012-4.849-.07c-1.17-.053-1.805-.249-2.227-.413a4.412 4.412 0 0 1-1.608-1.045 4.412 4.412 0 0 1-1.045-1.608c-.164-.422-.36-1.057-.413-2.227-.058-1.265-.07-1.645-.07-4.849s.012-3.584.07-4.849c.053-1.17.249-1.805.413-2.227A4.412 4.412 0 0 1 3.691 3.316 4.412 4.412 0 0 1 5.299 2.271c.422-.164 1.057-.36 2.227-.413C8.416 2.175 8.796 2.163 12 2.163zm0 3.675A6.162 6.162 0 1 0 12 18.162 6.162 6.162 0 0 0 12 5.838zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-10.605a1.44 1.44 0 1 1 0 2.88 1.44 1.44 0 0 1 0-2.88z"/></svg></a>
<a class="a90-social-link" href="https://www.youtube.com/@A90PorHora" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.016 3.016 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>
<a class="a90-social-link" href="https://www.tiktok.com/@a90porhora" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94a7.95 7.95 0 0 1-4.28 3.05c-1.36.37-2.84.39-4.2.04-1.55-.39-2.96-1.23-4.03-2.41A8.08 8.08 0 0 1 .68 16.6c-.02-.85-.01-1.7-.01-2.55.17-1.85.89-3.65 2.18-5a7.9 7.9 0 0 1 4.62-2.34c.83-.08 1.67-.06 2.5-.02v4.16c-.83-.27-1.78-.2-2.57.16a3.49 3.49 0 0 0-1.88 2.14c-.2.49-.14 1.03-.13 1.55.2 1.42 1.57 2.61 3.01 2.48.96-.01 1.88-.57 2.38-1.38.16-.28.35-.57.36-.9.09-1.62.05-3.24.06-4.87.01-3.67-.01-7.34.02-11.01.44.01.88.01 1.31 0z"/></svg></a>
</nav>`;

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);

    if(url.pathname==='/assets/auth.js'){
      const original=await env.ASSETS.fetch(request);
      if(!original.ok)return original;
      const text=await original.text();
      const headers=new Headers(original.headers);
      headers.set('Content-Type','application/javascript; charset=utf-8');
      headers.set('Cache-Control','no-cache, no-store, must-revalidate');
      return new Response(text+"\n;import('/assets/security-auth.js');\n",{status:original.status,headers});
    }

    if(url.pathname==='/foro/'||url.pathname.startsWith('/foro/')){
      const original=await env.ASSETS.fetch(request);
      if(!original.ok)return hardenStatic(original);
      const type=original.headers.get('Content-Type')||'';
      if(!type.includes('text/html'))return hardenStatic(original);
      let html=await original.text();
      const styles=`\n<link rel="stylesheet" href="/assets/forum-live.css?v=${FORUM_BUILD}">\n<link rel="stylesheet" href="/assets/forum-mod.css?v=${FORUM_BUILD}">\n<link rel="stylesheet" href="/assets/forum-rich.css?v=${FORUM_BUILD}">\n<link rel="stylesheet" href="/assets/forum-polish.css?v=${FORUM_BUILD}">\n<link rel="stylesheet" href="/assets/forum-users.css?v=${FORUM_BUILD}">\n<link rel="stylesheet" href="/assets/forum-recent.css?v=${FORUM_BUILD}">\n`;
      const scripts=`\n<script src="/assets/forum-app.js?v=${FORUM_BUILD}" defer></script>\n<script src="/assets/forum-mod.js?v=${FORUM_BUILD}" defer></script>\n<script src="/assets/forum-rich.js?v=${FORUM_BUILD}" defer></script>\n<script src="/assets/forum-community-intro.js?v=${FORUM_BUILD}" defer></script>\n<script src="/assets/forum-users.js?v=${FORUM_BUILD}" defer></script>\n<script src="/assets/forum-recent.js?v=${FORUM_BUILD}" defer></script>\n`;
      if(!html.includes(`/assets/forum-polish.css?v=${FORUM_BUILD}`))html=html.replace('</head>',styles+'</head>');
      if(!html.includes(`/assets/forum-community-intro.js?v=${FORUM_BUILD}`))html=html.replace('</body>',scripts+'</body>');
      const headers=new Headers(original.headers);
      headers.set('Content-Type','text/html; charset=utf-8');
      headers.set('Cache-Control','no-cache, no-store, must-revalidate');
      return hardenStatic(await injectGlobalUi(new Response(html,{status:original.status,statusText:original.statusText,headers}),true));
    }

    const health=await handleHealth(request,env,url);
    if(health)return hardenApi(health);

    const secureAuth=await handleSecurityAuth(request,env,url,authWorker);
    if(secureAuth){
      if(url.pathname==='/api/auth/mfa/enroll'&&request.method==='POST')return hardenApi(await normalizeMfaEnrollResponse(secureAuth));
      return hardenApi(secureAuth);
    }

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
    const pageRoute=url.pathname==='/'||url.pathname.endsWith('/');
    return hardenStatic(await injectGlobalUi(response,pageRoute));
  }
};

async function injectGlobalUi(response,force=false){
  const type=response.headers.get('Content-Type')||'';
  if(!force&&!type.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('</body>')&&!html.includes('</head>'))return response;
  const stylesheet=`<link rel="stylesheet" href="/assets/social-global.css?v=${GLOBAL_BUILD}">`;
  if(!html.includes('/assets/social-global.css'))html=html.replace('</head>',`${stylesheet}\n</head>`);
  if(!html.includes('class="a90-social-rail"'))html=html.replace('</body>',`${SOCIAL_RAIL}\n</body>`);
  const headers=new Headers(response.headers);
  headers.set('Content-Type','text/html; charset=utf-8');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function normalizeMfaEnrollResponse(response){
  if(!response.ok)return response;
  let data;try{data=await response.clone().json()}catch{return response}
  const qr=typeof data?.qr_code==='string'?data.qr_code.trim():'';
  if(!qr)return response;

  let normalized=qr;
  if(/^data:image\/svg\+xml/i.test(qr)){
    const comma=qr.indexOf(',');
    if(comma>=0&&!/;base64/i.test(qr.slice(0,comma))){
      let payload=qr.slice(comma+1);
      try{payload=decodeURIComponent(payload)}catch{}
      const svgIndex=payload.toLowerCase().indexOf('<svg');
      if(svgIndex>=0)normalized='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(payload.slice(svgIndex));
    }
  }else if(!/^data:image\//i.test(qr)&&!/^https?:\/\//i.test(qr)){
    const svgIndex=qr.toLowerCase().indexOf('<svg');
    if(svgIndex>=0)normalized='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr.slice(svgIndex));
  }

  if(normalized===qr)return response;
  data.qr_code=normalized;
  const headers=new Headers(response.headers);
  headers.set('Content-Type','application/json; charset=utf-8');
  headers.set('Cache-Control','private, no-store');
  return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
}

function sameOrigin(request,url){const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return false;const site=request.headers.get('Sec-Fetch-Site');return !site||site==='same-origin'||site==='same-site'||site==='none'}
function baseSecurityHeaders(headers){headers.set('X-Content-Type-Options','nosniff');headers.set('X-Frame-Options','DENY');headers.set('Referrer-Policy','no-referrer');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');headers.set('X-Permitted-Cross-Domain-Policies','none');return headers}
function hardenApi(response){const headers=baseSecurityHeaders(new Headers(response.headers));headers.set('Cross-Origin-Resource-Policy','same-origin');if(!headers.has('Cache-Control'))headers.set('Cache-Control','private, no-store');return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
function hardenStatic(response){const headers=baseSecurityHeaders(new Headers(response.headers));headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('Cross-Origin-Opener-Policy','same-origin');headers.set('Cross-Origin-Resource-Policy','same-origin');headers.set('Origin-Agent-Cluster','?1');headers.set('X-DNS-Prefetch-Control','off');headers.set('Content-Security-Policy',"default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com; media-src 'self'; frame-src https://challenges.cloudflare.com; worker-src 'self'; manifest-src 'self'; upgrade-insecure-requests");return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
function json(data,status){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}