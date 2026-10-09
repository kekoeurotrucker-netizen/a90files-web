(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const nf=new Intl.NumberFormat('es-ES');
const countries=typeof Intl.DisplayNames==='function'?new Intl.DisplayNames(['es'],{type:'region'}):null;
let days=30,lastData=null;
function n(v){return nf.format(Number(v)||0)}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function text(sel,val){const el=$(sel);if(el)el.textContent=val}
async function api(path){
  const r=await fetch(path,{credentials:'same-origin',cache:'no-store',headers:{'Accept':'application/json'}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d?.error||'No se pudieron consultar las estadísticas.');
  return d;
}
function plainRows(items,label,value,empty='Todavía no hay datos para este periodo.'){
  if(!Array.isArray(items)||!items.length)return '<p class="analytics-empty">'+esc(empty)+'</p>';
  return '<div class="analytics-rows">'+items.map(x=>
    '<div class="analytics-row"><span class="label" title="'+esc(label(x))+'">'+esc(label(x))+'</span><span class="num">'+esc(value(x))+'</span></div>'
  ).join('')+'</div>';
}
function barRows(items,label,value,detail,accent=false){
  if(!Array.isArray(items)||!items.length)return '<p class="analytics-empty">Sin información disponible para el periodo.</p>';
  const max=Math.max(1,...items.map(x=>Number(value(x))||0));
  return '<div class="analytics-rank-list">'+items.map(x=>{
    const amount=Number(value(x))||0,pct=Math.round(amount/max*100);
    return '<div class="analytics-rank-row"><div class="analytics-rank-line"><span class="analytics-rank-label" title="'+esc(label(x))+'">'+esc(label(x))+'</span><span class="analytics-rank-amount">'+n(amount)+' <small>'+esc(detail)+'</small></span></div><div class="analytics-meter'+(accent?' amber':'')+'"><i style="width:'+pct+'%"></i></div></div>';
  }).join('')+'</div>';
}

/* Donut visualizations use only server aggregate counts; no personal profiles are inferred. */
const PIE_PALETTE=['#56cedb','#eeb15b','#67c5ab','#d08a52','#598fae'];
function renderPie(selector,items,describe,getValue,metric){
  const target=$(selector);
  if(!target)return;
  const source=Array.isArray(items)?items:[];
  const values=source.map(item=>({
    label:String(describe(item)),
    value:Math.max(0,Number(getValue(item))||0)
  })).filter(item=>item.value>0).sort((a,b)=>b.value-a.value);
  const total=values.reduce((sum,item)=>sum+item.value,0);
  if(!total){
    target.innerHTML='<div class="analytics-pie-empty"><span class="analytics-donut-empty" aria-hidden="true"></span><span><strong>Sin datos suficientes</strong><small>La distribución aparecerá cuando haya actividad registrada.</small></span></div>';
    return;
  }
  const visible=values.slice(0,4);
  if(values.length>4)visible.push({label:'Otros',value:values.slice(4).reduce((sum,item)=>sum+item.value,0)});
  let cumulative=0;
  const stops=visible.map((item,index)=>{
    const start=360*cumulative/total;
    cumulative+=item.value;
    const end=360*cumulative/total;
    return PIE_PALETTE[index]+' '+start.toFixed(3)+'deg '+end.toFixed(3)+'deg';
  });
  const gradient='conic-gradient('+stops.join(',')+')';
  const details=visible.map((item,index)=>{
    const percent=(100*item.value/total).toLocaleString('es-ES',{maximumFractionDigits:1});
    return '<li class="analytics-pie-legend-item" title="'+esc(item.label)+'"><span class="pie-label"><i class="pie-dot" style="background:'+PIE_PALETTE[index]+'"></i><span>'+esc(item.label)+'</span></span><strong>'+percent+'%</strong></li>';
  }).join('');
  const accessible=visible.map(item=>item.label+': '+n(item.value)).join('; ');
  target.innerHTML='<div class="analytics-pie-layout"><div class="analytics-donut" role="img" aria-label="'+esc('Distribución de '+metric+'. '+accessible)+'" style="background:'+gradient+'"><div class="analytics-donut-core" aria-hidden="true"><strong>'+n(total)+'</strong><small>'+esc(metric)+'</small></div></div><ul class="analytics-pie-legend">'+details+'</ul></div>';
}

function drawDayChart(data){
  const el=$('#analytics-chart');if(!el)return;
  if(!Array.isArray(data)||!data.length){el.innerHTML='<p class="analytics-empty">Sin datos por día.</p>';return}
  el.classList.toggle('dense',data.length>100);
  const max=Math.max(1,...data.flatMap(x=>[Number(x.sessions)||0,Number(x.page_views)||0]));
  const labelEvery=Math.max(1,Math.ceil(data.length/9));
  el.innerHTML=data.map((x,i)=>{
    const sh=Math.round((Number(x.sessions)||0)/max*100);
    const vh=Math.round((Number(x.page_views)||0)/max*100);
    const label=String(x.date||'').slice(5).split('-').reverse().join('/');
    const show=i===0||i===data.length-1||i%labelEvery===0;
    return '<div class="analytics-day" title="'+esc(x.date)+' · '+n(x.sessions)+' sesiones · '+n(x.page_views)+' páginas"><div class="analytics-bars"><i class="analytics-bar views'+(vh?'':' zero')+'" style="height:'+vh+'%"></i><i class="analytics-bar sessions'+(sh?'':' zero')+'" style="height:'+sh+'%"></i></div><small>'+ (show?esc(label):'')+'</small></div>';
  }).join('');
}
function countryName(v){
  if(!v||v==='Desconocido')return 'Ubicación no registrada';
  try{return (countries?.of(v)||v)+' · '+v}catch{return v}
}
function screenName(v){
  return ({Compacta:'Pantalla compacta · menos de 640 px',Mediana:'Pantalla mediana · 640–1099 px',Amplia:'Pantalla amplia · 1100 px o más',Desconocido:'Tamaño no registrado'})[v]||'Tamaño no registrado';
}
function renderHistory(d){
  lastData=d;
  const s=d.summary||{},g=d.geography||{};
  text('#kpi-sessions',n(s.period_sessions));text('#kpi-sessions-total',n(s.all_time_sessions)+' acumuladas');
  text('#kpi-views',n(s.period_page_views));text('#kpi-views-total',n(s.all_time_page_views)+' acumuladas');
  text('#kpi-clicks',n(s.period_clicks));text('#kpi-downloads',n(s.period_downloads));
  text('#kpi-today',n(s.today_sessions));text('#kpi-today-views',n(s.today_page_views)+' páginas vistas hoy');
  text('#analytics-generated',d.generated_at?'Actualizado '+new Date(d.generated_at).toLocaleTimeString('es-ES'):'');
  drawDayChart(d.daily||[]);
  renderPie('#geo-countries-pie',g.countries,x=>countryName(x.country),x=>x.sessions,'sesiones');
  renderPie('#geo-regions-pie',g.regions,x=>(x.region==='Sin región'?'Región no registrada':x.region)+' · '+(x.country||'—'),x=>x.sessions,'sesiones');
  renderPie('#screen-types-pie',d.screens,x=>screenName(x.category),x=>x.sessions,'sesiones');
  renderPie('#referrers-pie',d.referrers,x=>x.source,x=>x.sessions,'entradas');
  renderPie('#top-pages-pie',d.top_pages,x=>x.path,x=>x.views,'vistas destacadas');
  renderPie('#top-targets-pie',[
    {label:'Clics',count:Number(s.period_clicks)||0},
    {label:'Descargas',count:Number(s.period_downloads)||0}
  ],x=>x.label,x=>x.count,'acciones');
  $('#top-pages').innerHTML=plainRows(d.top_pages,x=>x.path,x=>n(x.views)+' vistas');
  $('#top-targets').innerHTML=plainRows(d.top_targets,x=>x.target,x=>n(x.clicks)+' clics · '+n(x.downloads)+' desc.');
  $('#referrers').innerHTML=barRows(d.referrers,x=>x.source,x=>x.sessions,'entradas');
  $('#geo-countries').innerHTML=barRows(g.countries,x=>countryName(x.country),x=>x.sessions,'sesiones');
  $('#geo-regions').innerHTML=barRows(g.regions,x=>(x.region==='Sin región'?'Región no registrada':x.region)+' · '+(x.country||'—'),x=>x.sessions,'sesiones',true);
  $('#screen-types').innerHTML=barRows(d.screens,x=>screenName(x.category),x=>x.sessions,'sesiones');
  $('#analytics-status').classList.add('analytics-hidden');
  $('#analytics-content').classList.remove('analytics-hidden');
  $('#analytics-export').disabled=false;
}
function renderLive(d){
  text('#live-active',n(d.active_5m));text('#live-sessions',n(d.sessions_30m));text('#live-views',n(d.views_30m));
  text('#analytics-live-updated',d.generated_at?'Sincronizado a las '+new Date(d.generated_at).toLocaleTimeString('es-ES'):'En directo');
  const a=Array.isArray(d.timeline)?d.timeline:[];
  const max=Math.max(1,...a.map(x=>Number(x.views)||0));
  $('#analytics-live-chart').innerHTML=a.map(x=>{
    const v=Number(x.views)||0,h=Math.round(v/max*100);
    return '<i class="live-minute'+(v?'':' zero')+'" title="'+esc(x.time)+' · '+n(v)+' vistas" style="height:'+h+'%"></i>';
  }).join('');
  $('#live-pages').innerHTML=plainRows(d.recent_pages,x=>x.path,x=>n(x.views),'Sin páginas vistas en los últimos cinco minutos.');
  $('#analytics-live-warning').classList.add('analytics-hidden');
}
async function loadHistory(){
  $('#analytics-status').textContent='Actualizando estadísticas…';
  $('#analytics-status').classList.remove('analytics-hidden');
  try{renderHistory(await api('/api/analytics/dashboard?days='+days))}
  catch(e){$('#analytics-status').textContent=e.message;if(!lastData)$('#analytics-content').classList.add('analytics-hidden')}
}
async function loadLive(){
  try{renderLive(await api('/api/analytics/live'))}
  catch(e){const el=$('#analytics-live-warning');el.textContent='No se pudo actualizar la actividad en directo: '+e.message;el.classList.remove('analytics-hidden');text('#analytics-live-updated','Sin conexión · reintentando')}
}
function csvCell(v){
  let s=String(v??'');
  if(/^[=+\-@]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
function exportCSV(){
  if(!lastData)return;
  const s=lastData.summary||{},geo=lastData.geography||{};
  const rows=[['A90 Pulse','Periodo (días)',days],['Resumen','Sesiones',s.period_sessions],['Resumen','Páginas vistas',s.period_page_views],['Resumen','Clics',s.period_clicks],['Resumen','Descargas',s.period_downloads]];
  (lastData.daily||[]).forEach(x=>rows.push(['Día '+x.date,'Sesiones',x.sessions],['Día '+x.date,'Vistas',x.page_views]));
  (geo.countries||[]).forEach(x=>rows.push(['País',x.country,x.sessions]));
  (geo.regions||[]).forEach(x=>rows.push(['Región '+x.country,x.region,x.sessions]));
  (lastData.screens||[]).forEach(x=>rows.push(['Pantalla',x.category,x.sessions]));
  (lastData.top_pages||[]).forEach(x=>rows.push(['Página',x.path,x.views]));
  (lastData.referrers||[]).forEach(x=>rows.push(['Origen',x.source,x.sessions]));
  const csv='\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='a90-pulse-'+days+'dias.csv';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
$$('[data-days]').forEach(b=>b.addEventListener('click',()=>{
  days=Number(b.dataset.days)||30;$$('[data-days]').forEach(x=>x.classList.toggle('active',x===b));void loadHistory();
}));
$('#analytics-export').addEventListener('click',exportCSV);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void loadLive()});
void loadHistory();void loadLive();setInterval(()=>{if(!document.hidden)void loadLive()},20000);
})();
