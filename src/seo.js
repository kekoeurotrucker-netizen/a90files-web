/* A90 Files: factual, static-first SEO metadata for public pages.
   Never overwrite hand-authored social metadata or emit fictional ratings/offers. */
const SITE='https://a90files-web.a90files.workers.dev';
const ORG='A 90 Files';
const IMAGE_BY_ROUTE={
 '/':'/assets/home-modules/software-banner.webp',
 '/software/':'/assets/home-modules/software-banner.webp',
 '/juegos/':'/assets/home-modules/games-banner.webp',
 '/novedades/':'/assets/metal-gear-msx2/metal-gear-investigacion-cover.jpg',
 '/foro/':'/assets/home-modules/support-banner.webp',
 '/guias/':'/assets/home-modules/support-banner.webp',
 '/soporte/':'/assets/home-modules/support-banner.webp',
 '/descargas/':'/assets/home-modules/software-banner.webp',
 '/canal/':'/assets/home-modules/channel-banner.webp',
 '/software/vaultpool/':'/assets/vaultpool/vaultpool-promo-spotlight-20261004.webp',
 '/software/kookikeeper/':'/assets/kookikeeper/cookies-control.webp',
 '/software/marea-studio/':'/assets/marea/marea-hero-studio.webp',
 '/software/autominer/':'/assets/autominer/autominer-cover.jpg',
 '/software/pilot-station/':'/assets/pilot-station/pilot-station-rebrand-hero.webp',
 '/software/logistic-trucker/':'/assets/project-trucker/logistic-trucker-3d-01.png',
 '/juegos/metal-gear-msx2/':'/assets/metal-gear-msx2/metal-gear-investigacion-cover.jpg',
 '/juegos/project-trucker/':'/assets/project-trucker/logistic-trucker-3d-01.png',
 '/juegos/surviving-the-fallout/':'/assets/editorial/surviving-fallout.svg'
};
const RELATED={
 '/software/':[['VaultPool: almacenamiento multinube','/software/vaultpool/'],['KookiKeeper: sesiones de navegador','/software/kookikeeper/'],['Marea Studio: composición musical','/software/marea-studio/']],
 '/juegos/':[['Metal Gear MSX2: preservación y port','/juegos/metal-gear-msx2/'],['Project Trucker','/juegos/project-trucker/'],['Últimas novedades de videojuegos','/novedades/']],
 '/novedades/':[['Software para Windows','/software/'],['Proyectos de videojuegos','/juegos/'],['Guías de usuario','/guias/']],
 '/software/vaultpool/':[['Guía de almacenamiento multinube','/guias/almacenamiento-multinube-windows/'],['Novedades sobre VaultPool V3','/novedades/vaultpool-v3-estable-nuevas-nubes/'],['Soporte y comunidad','/foro/']],
 '/software/kookikeeper/':[['Cómo proteger las sesiones del navegador','/guias/recuperar-sesiones-navegador/'],['Estado actual de KookiKeeper','/novedades/kookikeeper-proximamente-microsoft-store/'],['Guías de usuario','/guias/']],
 '/software/marea-studio/':[['Novedades de Marea Studio','/novedades/marea-studio-1-3-26/'],['Aplicaciones de A90 Files','/software/'],['Guías y soporte','/guias/']],
 '/juegos/metal-gear-msx2/':[['Investigación sobre el Metal Gear de 1987','/novedades/metal-gear-msx2-port-windows-espanol/'],['Otros proyectos de videojuegos','/juegos/'],['Foro de la comunidad','/foro/']],
 '/guias/':[['Almacenamiento multinube en Windows','/guias/almacenamiento-multinube-windows/'],['Protección de sesiones del navegador','/guias/recuperar-sesiones-navegador/'],['Centro de soporte','/soporte/']]
};
const EN_TITLES={
 '/':'A 90 Files | Windows Software, Games and Guides',
 '/software/':'Windows Software | VaultPool, KookiKeeper and More — A 90 Files',
 '/juegos/':'Games and Preservation Projects for Windows | A 90 Files',
 '/novedades/':'Software and Game Development News | A 90 Files',
 '/software/vaultpool/':'VaultPool Storage | Multi-Cloud Management for Windows',
 '/software/kookikeeper/':'KookiKeeper | Browser Session Management Project for Windows',
 '/software/marea-studio/':'Marea Studio Composer | Music Production on Windows',
 '/juegos/metal-gear-msx2/':'Metal Gear MSX2 (1987) | Unofficial Windows Port Research',
 '/canal/':'A 90 por Hora | Trucks, Truckvlogs and Driving Simulators'
};
const EN_DESCRIPTIONS={
 '/':'A 90 Files develops Windows software, cloud storage tools, games and retro-game preservation projects. Explore our updates and guides.',
 '/software/':'Windows software by A 90 Files: VaultPool, KookiKeeper, Marea Studio, AutoMiner and other projects in development.',
 '/juegos/':'Game development and preservation projects by A 90 Files, including Metal Gear MSX2 research and Project Trucker.',
 '/novedades/':'Updates on Windows applications, retro-game preservation, software releases and development at A 90 Files.',
 '/software/vaultpool/':'VaultPool Storage for Windows: manage cloud storage services in one application. Features, releases and project updates.',
 '/software/kookikeeper/':'KookiKeeper is a Windows browser-session management project currently in development. Follow its progress and limitations.',
 '/software/marea-studio/':'Marea Studio Composer for Windows: music composition and track editing, with optional AI-assisted tools.',
 '/juegos/metal-gear-msx2/':'An unofficial research and preservation project exploring the original 1987 MSX2 Metal Gear and a Windows port.'
};
const SOFTWARE={
 '/software/vaultpool/':{name:'VaultPool Storage',category:'UtilitiesApplication',status:'Disponible para Windows; versión estable publicada'},
 '/software/marea-studio/':{name:'Marea Studio Composer',category:'MultimediaApplication',status:'Disponible para Windows'},
 '/software/kookikeeper/':{name:'KookiKeeper',category:'UtilitiesApplication',status:'En desarrollo; sin descarga pública confirmada'},
 '/software/pilot-station/':{name:'Pilot Station',category:'UtilitiesApplication',status:'Prototipo en pruebas; sin descarga pública confirmada'},
 '/software/autominer/':{name:'AutoMiner',category:'UtilitiesApplication',status:'Proyecto de software de A 90 Files'},
 '/software/logistic-trucker/':{name:'Logistic Trucker',category:'GameApplication',status:'Proyecto en desarrollo'}
};
const SECTION_NAMES={software:'Software',juegos:'Juegos',novedades:'Novedades',foro:'Foro',guias:'Guías',descargas:'Descargas',canal:'Canal',soporte:'Soporte'};
function encode(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function decode(s){return String(s||'').replace(/&(?:amp|quot|lt|gt|#39|#x27);/g,c=>({'&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>','&#39;':"'",'&#x27;':"'"}[c]));}
function attr(tag,name){
 const match=tag.match(new RegExp('\\b'+name+'\\s*=\\s*(["\\x27])([\\s\\S]*?)\\1','i'));
 return match?decode(match[2]):'';
}
function headOf(html){return html.slice(0,html.search(/<\/head>/i));}
function tagsOf(html,type){return headOf(html).match(new RegExp('<'+type+'\\b[^>]*>','gi'))||[];}
function getMeta(html,key,kind='name'){
 const found=tagsOf(html,'meta').find(x=>attr(x,kind).toLowerCase()===key.toLowerCase());
 return found?attr(found,'content'):'';
}
function getCanonical(html){
 return attr(tagsOf(html,'link').find(x=>attr(x,'rel').toLowerCase()==='canonical')||'','href');
}
function putMeta(html,kind,key,value){
 if(!value||getMeta(html,key,kind))return html;
 return html.replace(/<\/head>/i,'<meta '+kind+'="'+encode(key)+'" content="'+encode(value)+'">\n</head>');
}
function replaceMeta(html,kind,key,value){
 const match=tagsOf(html,'meta').find(x=>attr(x,kind).toLowerCase()===key.toLowerCase());
 if(!match)return putMeta(html,kind,key,value);
 return html.replace(match,match.replace(/content\s*=\s*(["'])([\s\S]*?)\1/i,'content="'+encode(value)+'"'));
}
function putCanonical(html,url){
 return getCanonical(html)?html:html.replace(/<\/head>/i,'<link rel="canonical" href="'+encode(url)+'">\n</head>');
}
function titleOf(html){return decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'').replace(/<[^>]*>/g,'').trim();}
function imageFor(route,html){
 if(IMAGE_BY_ROUTE[route])return IMAGE_BY_ROUTE[route];
 if(route.startsWith('/novedades/')){
   if(route.includes('metal-gear'))return '/assets/metal-gear-msx2/metal-gear-investigacion-cover.jpg';
   if(route.includes('vaultpool'))return '/assets/vaultpool/v3-windows-nubes-rc.png';
   if(route.includes('kookikeeper'))return '/assets/kookikeeper/cookies-control.webp';
   if(route.includes('marea'))return '/assets/marea/marea-hero-studio.webp';
   if(route.includes('pilot')||route.includes('startwise'))return '/assets/pilot-station/pilot-station-rebrand-hero.webp';
   if(route.includes('trucker'))return '/assets/project-trucker/logistic-trucker-3d-01.png';
   if(route.includes('autominer'))return '/assets/autominer/autominer-cover.jpg';
 }
 const imgs=html.match(/<img\b[^>]*>/gi)||[];
 for(const img of imgs){
   const src=attr(img,'src').split('?')[0];
   if(src.startsWith('/assets/')&&/\.(png|jpe?g|webp)$/i.test(src) && !/\/(?:icon|logo)/i.test(src))return src;
 }
 return '/assets/home-modules/software-banner.webp';
}
function jsonScript(object,id){
 return '<script id="'+id+'" type="application/ld+json">'+JSON.stringify(object).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')+'</script>';
}
function buildGraph(route,title,description,url,image){
 const graph=[{'@type':'WebPage','@id':url+'#webpage',url,name:title,description,inLanguage:'es-ES',isPartOf:{'@id':SITE+'/#website'}}];
 if(route==='/'){
   graph.push({'@type':'WebSite','@id':SITE+'/#website',url:SITE+'/',name:ORG,inLanguage:'es-ES',publisher:{'@id':SITE+'/#organization'}});
   graph.push({'@type':'Organization','@id':SITE+'/#organization',name:ORG,url:SITE+'/',logo:SITE+'/assets/brand/a90-velocity.svg',sameAs:['https://x.com/a90files']});
 }
 const segments=route.split('/').filter(Boolean);
 if(segments.length>1&&SECTION_NAMES[segments[0]]){
   const section='/'+segments[0]+'/';
   const entries=[{'@type':'ListItem',position:1,name:'Inicio',item:SITE+'/'},{'@type':'ListItem',position:2,name:SECTION_NAMES[segments[0]],item:SITE+section}];
   if(segments.length>2){
     entries.push({'@type':'ListItem',position:3,name:segments[1].replace(/-/g,' '),item:SITE+section+segments[1]+'/'});
   }
   entries.push({'@type':'ListItem',position:entries.length+1,name:title.split(' — ')[0].slice(0,100),item:url});
   graph.push({'@type':'BreadcrumbList',itemListElement:entries});
 }
 if(SOFTWARE[route]){
   const app=SOFTWARE[route];
   graph.push({'@type':'SoftwareApplication',name:app.name,url,description,operatingSystem:'Windows',applicationCategory:app.category,mainEntityOfPage:url});
 }
 if(route.startsWith('/novedades/')&&route!=='/novedades/'){
   graph.push({'@type':'Article',headline:title.replace(/ — A ?90 Files$/i,''),description,mainEntityOfPage:url,image,author:{'@type':'Organization',name:ORG},publisher:{'@type':'Organization',name:ORG,url:SITE+'/'},inLanguage:'es-ES'});
 }
 return {'@context':'https://schema.org','@graph':graph};
}
function addRelated(html,route){
 const items=RELATED[route];if(!items||html.includes('data-a90-seo-related'))return html;
 const loc=html.lastIndexOf('</main>');if(loc<0)return html;
 const label='<aside class="a90-seo-related" data-a90-seo-related aria-label="Contenido relacionado"><h2>También te puede interesar</h2><ul>'+
   items.map(([title,url])=>'<li><a href="'+encode(url)+'">'+encode(title)+'</a></li>').join('')+'</ul></aside>';
 html=html.slice(0,loc)+label+'\n'+html.slice(loc);
 const css='<style id="a90-seo-related-style">.a90-seo-related{max-width:1120px;margin:32px auto 22px;padding:20px 24px;border:1px solid rgba(128,180,210,.26);border-radius:16px;background:rgba(10,30,43,.75);color:#dceff6}.a90-seo-related h2{font-size:1.16rem;margin:0 0 12px;color:inherit}.a90-seo-related ul{display:flex;flex-wrap:wrap;gap:10px 24px;list-style:none;margin:0;padding:0}.a90-seo-related a{color:#98dafa;text-decoration:underline;text-underline-offset:3px}.a90-seo-related a:hover{color:#fff}</style>';
 return html.replace(/<\/head>/i,css+'</head>');
}
function indexableRoute(route){
 return route==='/' || (/^\/(?:software|juegos|novedades|foro|guias|descargas|soporte|canal)(?:\/|$)/.test(route) &&
 !/\/(?:admin|api|assets)\//.test(route));
}
export function enhanceSeo(html,pathname,origin=SITE){
 if(!html||!/<\/head>/i.test(html)||!indexableRoute(pathname))return html;
 const route=pathname==='/'?'/':pathname.endsWith('/')?pathname:pathname+'/';
 const title=titleOf(html);
 const description=getMeta(html,'description');
 if(!title||!description)return html; // Never fabricate page-specific copy.
 const canonical=getCanonical(html)||origin+route;
 html=putCanonical(html,canonical);
 const image=getMeta(html,'og:image','property')||origin+imageFor(route,html);
 const hasArticle=route.startsWith('/novedades/')&&route!=='/novedades/';
 for(const [key,value] of Object.entries({
   'og:type':hasArticle?'article':'website','og:site_name':ORG,'og:locale':'es_ES','og:url':canonical,
   'og:title':title,'og:description':description,'og:image':image,'og:image:alt':title
 }))html=putMeta(html,'property',key,value);
 for(const [key,value] of Object.entries({
   'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':image
 }))html=putMeta(html,'name',key,value);
 if(!html.includes('id="a90-seo-jsonld"')){
   html=html.replace(/<\/head>/i,jsonScript(buildGraph(route,title,description,canonical,image),'a90-seo-jsonld')+'\n</head>');
 }
 return addRelated(html,route);
}
export function enhanceEnglishSeo(html,requestUrl){
 const u=new URL(requestUrl),route=u.pathname.replace(/^\/en(?=\/|$)/,'')||'/';
 const canonical=getCanonical(html)||u.href;
 const title=EN_TITLES[route]||titleOf(html);
 if(EN_TITLES[route])html=html.replace(/<title[^>]*>[\s\S]*?<\/title>/i,'<title>'+encode(title)+'</title>');
 const description=EN_DESCRIPTIONS[route]||getMeta(html,'description');
 if(EN_DESCRIPTIONS[route])html=replaceMeta(html,'name','description',description);
 for(const [key,value] of Object.entries({
   'og:url':canonical,'og:title':title,'og:description':description,'og:locale':'en_GB'
 }))html=replaceMeta(html,'property',key,value);
 for(const [key,value] of Object.entries({'twitter:title':title,'twitter:description':description}))
   html=replaceMeta(html,'name',key,value);
 const match=html.match(/<script id="a90-seo-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/);
 if(match){
   try{
     const parsed=JSON.parse(match[1]);
     for(const node of parsed['@graph']||[]){
       if(node['@type']==='WebPage'){
         node.name=title;node.description=description;node.url=canonical;node['@id']=canonical+'#webpage';node.inLanguage='en-GB';
       }else if(node['@type']==='Article'){
         node.description=description;node.headline=title;node.mainEntityOfPage=canonical;node.inLanguage='en-GB';
       }else if(node['@type']==='SoftwareApplication'){node.description=description;node.url=canonical;node.mainEntityOfPage=canonical;}
       else if(node['@type']==='BreadcrumbList'){
         for(const item of node.itemListElement||[])if(item.item?.startsWith(SITE+'/'))item.item=SITE+'/en'+item.item.slice(SITE.length);
       }
     }
     html=html.replace(match[0],jsonScript(parsed,'a90-seo-jsonld'));
   }catch{}
 }
 return html;
}
export function enhanceCmsArticleSeo(html,article,language,url){
 const title=(language==='en'?article.title_en||article.title_es:article.title_es)||'';
 const description=(language==='en'?article.excerpt_en||article.excerpt_es:article.excerpt_es)||'';
 const canonical=url.origin+url.pathname;
 const news={'@context':'https://schema.org','@type':'Article',headline:title,description,
   mainEntityOfPage:canonical,author:{'@type':'Organization',name:ORG},
   publisher:{'@type':'Organization',name:ORG,url:SITE+'/'},inLanguage:language==='en'?'en-GB':'es-ES'};
 const date=article.published_at||article.created_at;
 if(date && !Number.isNaN(Date.parse(date)))news.datePublished=new Date(date).toISOString();
 if(article.updated_at && !Number.isNaN(Date.parse(article.updated_at)))news.dateModified=new Date(article.updated_at).toISOString();
 if(typeof article.cover_path==='string' && /^\/assets\/[a-z0-9/_-]+\.(?:png|webp|jpe?g)$/i.test(article.cover_path))
   news.image=url.origin+article.cover_path;
 return html.includes('id="a90-cms-seo-jsonld"')?html:html.replace(/<\/head>/i,jsonScript(news,'a90-cms-seo-jsonld')+'</head>');
}
