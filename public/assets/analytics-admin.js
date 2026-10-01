(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
let days=30;

const nf=new Intl.NumberFormat('es-ES');
function n(v){return nf.format(Number(v)||0)}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function api(path){const r=await fetch(path,{credentials:'same-origin',headers:{'Accept':'application/json'}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||'No se pudo cargar la analítica.');return d}

function rows(items,columns,empty='Todavía no hay datos.'){
  if(!items?.length)return '<p class="analytics-empty">'+empty+'</p>';
  return '<div class="analytics-table">'+items.map(item=>'<div class="analytics-row">'+columns.map((c,i)=>'<span class="'+(i?'num':'label')+'">'+esc(c(item))+'</span>').join('')+'</div>').join('')+'</div>';
}

function renderChart(data){
  const el=$('#analytics-chart');if(!el)return;
  if(!data?.length){el.innerHTML='<p class="analytics-empty">Todavía no hay datos.</p>';return}
  const max=Math.max(1,...data.flatMap(x=>[Number(x.sessions)||0,Number(x.page_views)||0]));
  el.innerHTML=data.map((x,i)=>{
    const sh=Math.max(2,Math.round((Number(x.sessions)||0)/max*100));
    const vh=Math.max(2,Math.round((Number(x.page_views)||0)/max*100));
    const showLabel=data.length<=10||i===0||i===data.length-1||i%Math.ceil(data.length/8)===0;
    const label=String(x.date||'').slice(5).split('-').reverse().join('/');
    return '<div class="analytics-day" title="'+esc(x.date)+' · '+n(x.sessions)+' sesiones · '+n(x.page_views)+' vistas"><div class="analytics-bars"><i class="bar views" style="height:'+vh+'%"></i><i class="bar sessions" style="height:'+sh+'%"></i></div><small>'+ (showLabel?esc(label):'') +'</small></div>';
  }).join('');
}

function render(d){
  const s=d.summary||{};
  $('#kpi-sessions').textContent=n(s.period_sessions);$('#kpi-sessions-total').textContent=n(s.all_time_sessions)+' totales';
  $('#kpi-views').textContent=n(s.period_page_views);$('#kpi-views-total').textContent=n(s.all_time_page_views)+' totales';
  $('#kpi-clicks').textContent=n(s.period_clicks);$('#kpi-downloads').textContent=n(s.period_downloads);
  $('#kpi-today').textContent=n(s.today_sessions);$('#kpi-today-views').textContent=n(s.today_page_views)+' páginas vistas';
  $('#analytics-generated').textContent=d.generated_at?'Actualizado '+new Date(d.generated_at).toLocaleString('es-ES'):'';
  renderChart(d.daily||[]);
  $('#top-pages').innerHTML=rows(d.top_pages,[x=>x.path,x=>n(x.views)+' vistas',x=>n(x.sessions)+' sesiones']);
  $('#top-targets').innerHTML=rows(d.top_targets,[x=>x.target,x=>n(x.clicks)+' clics',x=>n(x.downloads)+' descargas']);
  $('#referrers').innerHTML=rows(d.referrers,[x=>x.source,x=>n(x.sessions)+' sesiones']);
  $('#analytics-status').classList.add('analytics-hidden');$('#analytics-content').classList.remove('analytics-hidden');
}

async function load(){
  $('#analytics-status').classList.remove('analytics-hidden');$('#analytics-status').textContent='Cargando analítica…';
  try{render(await api('/api/analytics/dashboard?days='+days))}
  catch(e){$('#analytics-content').classList.add('analytics-hidden');$('#analytics-status').textContent=e.message}
}
$$('[data-days]').forEach(b=>b.addEventListener('click',()=>{days=Number(b.dataset.days)||30;$$('[data-days]').forEach(x=>x.classList.toggle('active',x===b));void load()}));
void load();
})();
