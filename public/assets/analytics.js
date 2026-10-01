(()=>{
'use strict';
if(location.pathname.startsWith('/admin/analytics/'))return;

const SESSION_KEY='a90_analytics_session';
const STARTED_KEY='a90_analytics_started';

function sessionId(){
  try{
    let id=sessionStorage.getItem(SESSION_KEY);
    if(!id&&crypto?.randomUUID){id=crypto.randomUUID();sessionStorage.setItem(SESSION_KEY,id)}
    return id||null;
  }catch{return null}
}
function isEntry(){
  try{const first=sessionStorage.getItem(STARTED_KEY)!=='1';if(first)sessionStorage.setItem(STARTED_KEY,'1');return first}catch{return true}
}
function referrerHost(entry){
  if(!entry||!document.referrer)return null;
  try{const u=new URL(document.referrer);return u.hostname===location.hostname?null:u.host}catch{return null}
}
function send(event_type,target=null,entry=false){
  const payload={event_type,path:location.pathname,target,referrer_host:referrerHost(entry),session_id:sessionId(),is_entry:entry};
  const body=JSON.stringify(payload);
  try{
    if(navigator.sendBeacon){
      const ok=navigator.sendBeacon('/api/analytics/event',new Blob([body],{type:'application/json'}));
      if(ok)return;
    }
  }catch{}
  fetch('/api/analytics/event',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body}).catch(()=>{});
}
function targetFor(a,u){
  const path=u.pathname;
  if(u.origin===location.origin){
    if(path.startsWith('/software/vaultpool/'))return 'project:vaultpool';
    if(path.startsWith('/software/autominer/'))return 'project:autominer';
    if(path.startsWith('/juegos/project-trucker/'))return 'project:project-trucker';
    if(path.startsWith('/foro/'))return 'section:forum';
    if(path.startsWith('/novedades/'))return 'section:news';
    if(path.startsWith('/software/'))return 'section:software';
    if(path.startsWith('/juegos/'))return 'section:games';
    if(path.startsWith('/soporte/'))return 'section:support';
    return null;
  }
  const host=u.hostname.replace(/^www\./,'');
  if(host==='apps.microsoft.com')return 'external:microsoft-store';
  if(host==='paypal.me')return 'external:donations';
  if(/(^|\.)youtube\.com$/.test(host))return 'social:youtube';
  if(/(^|\.)instagram\.com$/.test(host))return 'social:instagram';
  if(/(^|\.)facebook\.com$/.test(host))return 'social:facebook';
  if(host==='tiktok.com'||host.endsWith('.tiktok.com'))return 'social:tiktok';
  return null;
}
function isDownload(a,u){
  if(a.hasAttribute('download'))return true;
  return /\.(zip|exe|msix|msixupload|msi|7z|rar|pdf)(?:$|\?)/i.test(u.pathname+u.search);
}

const entry=isEntry();
send('page_view',null,entry);

document.addEventListener('click',e=>{
  const a=e.target.closest?.('a[href]');
  if(!a)return;
  let u;try{u=new URL(a.href,location.href)}catch{return}
  if(!/^https?:$/.test(u.protocol))return;
  if(isDownload(a,u)){send('download','download:'+u.pathname.split('/').pop());return}
  const target=targetFor(a,u);
  if(target)send('click',target);
},{capture:true});
})();
