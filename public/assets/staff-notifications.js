(()=>{'use strict';
const ENDPOINT='/api/forum/staff-notifications';
const POLL_MS=45000;
let root=null,panel=null,countEl=null,listEl=null,timer=null,data=null;

const esc=s=>String(s||'');
async function request(path,opts={}){
 const res=await fetch(path,{credentials:'same-origin',cache:'no-store',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});
 const body=await res.json().catch(()=>({}));
 return {res,body};
}
function kindLabel(kind){return kind==='topic'?'NUEVO TEMA':kind==='reply'?'NUEVA RESPUESTA':'REPORTE'}
function fmt(value){try{return new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short'}).format(new Date(value))}catch{return ''}}
function ensureUi(){
 if(root)return;
 const account=document.querySelector('[data-a90-account]');
 const host=account?.parentElement||document.querySelector('.topbar-inner');
 if(!host)return;
 root=document.createElement('div');root.className='a90-staff-notify';
 root.innerHTML='<button class="a90-staff-notify-btn" type="button" aria-label="Notificaciones del foro" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span class="a90-staff-notify-count" hidden>0</span></button><section class="a90-staff-notify-panel" hidden><header><div><small>EQUIPO A 90</small><strong>Actividad del foro</strong></div><button type="button" data-notify-read-all>Marcar todo leído</button></header><div class="a90-staff-notify-list"></div><footer>Temas, respuestas y reportes · actualización automática</footer></section>';
 host.insertBefore(root,account||host.querySelector('.menu-button')||null);
 panel=root.querySelector('.a90-staff-notify-panel');countEl=root.querySelector('.a90-staff-notify-count');listEl=root.querySelector('.a90-staff-notify-list');
 const btn=root.querySelector('.a90-staff-notify-btn');
 btn.addEventListener('click',()=>{const open=panel.hidden;panel.hidden=!open;btn.setAttribute('aria-expanded',String(open));if(open)void refresh()});
 root.querySelector('[data-notify-read-all]').addEventListener('click',async()=>{await mark({all:true});await refresh()});
 document.addEventListener('click',e=>{if(root&&!root.contains(e.target)){panel.hidden=true;btn.setAttribute('aria-expanded','false')}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root){panel.hidden=true;btn.setAttribute('aria-expanded','false')}});
}
function render(){
 if(!root||!data)return;
 const unread=Number(data.unread)||0;
 countEl.textContent=unread>99?'99+':String(unread);
 countEl.hidden=unread<1;
 root.querySelector('.a90-staff-notify-btn').classList.toggle('has-unread',unread>0);
 listEl.replaceChildren();
 const rows=Array.isArray(data.notifications)?data.notifications:[];
 if(!rows.length){const empty=document.createElement('p');empty.className='a90-staff-notify-empty';empty.textContent='Sin actividad pendiente.';listEl.append(empty);return}
 for(const n of rows){
  const a=document.createElement('a');a.className='a90-staff-notify-item'+(n.read_at?' is-read':'');a.href=esc(n.href)||'/foro/';
  const top=document.createElement('span');top.className='a90-staff-notify-kind';top.textContent=kindLabel(n.kind);
  const title=document.createElement('strong');title.textContent=esc(n.title);
  const body=document.createElement('span');body.className='a90-staff-notify-body';body.textContent=esc(n.body);
  const time=document.createElement('time');time.textContent=fmt(n.created_at);
  a.append(top,title,body,time);
  a.addEventListener('click',()=>{if(!n.read_at)navigator.sendBeacon?.('/api/forum/staff-notifications/read',new Blob([JSON.stringify({id:n.id})],{type:'application/json'}))});
  listEl.append(a);
 }
}
async function mark(payload){
 const {res}=await request('/api/forum/staff-notifications/read',{method:'POST',body:JSON.stringify(payload)});
 return res.ok;
}
async function refresh(){
 const {res,body}=await request(ENDPOINT);
 if(res.status===401||res.status===403){stop();root?.remove();root=null;return}
 if(!res.ok)return;
 data=body;ensureUi();render();
}
function stop(){if(timer){clearInterval(timer);timer=null}}
function start(){stop();timer=setInterval(()=>{if(!document.hidden)void refresh()},POLL_MS)}
void refresh().then(start);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh()});
window.addEventListener('focus',()=>void refresh());
})();