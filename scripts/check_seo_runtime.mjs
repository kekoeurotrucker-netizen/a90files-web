import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {enhanceSeo,enhanceEnglishSeo,enhanceCmsArticleSeo} from '../src/seo.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const base='https://a90files-web.a90files.workers.dev';
const routes=[
 '/', '/software/', '/juegos/', '/novedades/', '/guias/', '/foro/',
 '/software/vaultpool/', '/software/kookikeeper/', '/software/marea-studio/',
 '/software/pilot-station/', '/juegos/metal-gear-msx2/',
 '/guias/almacenamiento-multinube-windows/', '/guias/recuperar-sesiones-navegador/',
 '/novedades/metal-gear-msx2-port-windows-espanol/'
];
let pass=0;
for(const route of routes){
 const filename=path.join(root,route,'index.html');
 const source=readFileSync(filename,'utf8');
 const updated=enhanceSeo(source,route);
 assert(updated.includes('<meta property="og:url" content="'+base+route+'">'),route+' og:url');
 assert(updated.includes('name="twitter:card"'),route+' twitter card');
 assert(updated.includes('id="a90-seo-jsonld"'),route+' JSON-LD');
 assert(updated.includes('<link rel="canonical"'),route+' canonical');
 const share=updated.match(/<meta property="og:image" content="([^"]+)"/);
 assert(share&&share[1].startsWith(base+'/assets/'),route+' image');
 const imageLocal=path.join(root,share[1].replace(base+'/',''));
 assert(existsSync(imageLocal),route+' share image missing: '+share[1]);
 const match=updated.match(/<script id="a90-seo-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/);
 const data=JSON.parse(match[1]);assert.equal(data['@context'],'https://schema.org');
 assert(data['@graph'].some(n=>n['@type']==='WebPage'),route+' WebPage');
 assert.equal((updated.match(/id="a90-seo-jsonld"/g)||[]).length,1);
 assert.equal(enhanceSeo(updated,route),updated,route+' must be idempotent');
 if(route==='/')assert(data['@graph'].some(n=>n['@type']==='Organization'));
 if(route==='/software/vaultpool/'||route==='/software/kookikeeper/'){
   const app=data['@graph'].find(n=>n['@type']==='SoftwareApplication');
   assert(app,'software schema missing');assert(!('aggregateRating' in app));
   assert(!('offers' in app),'No fabricated availability/price');
 }
 if(route==='/guias/'||route==='/software/kookikeeper/'){
   assert(updated.includes('data-a90-seo-related'),'internal links');
 }
 pass++;
}
const html=enhanceSeo(readFileSync(path.join(root,'software/vaultpool/index.html'),'utf8'),'/software/vaultpool/');
const localized=enhanceEnglishSeo(html.replace(/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+base+'/en/software/vaultpool/">').replace(/<title>[^<]*<\/title>/,'<title>VaultPool Storage for Windows</title>'),base+'/en/software/vaultpool/');
assert(localized.includes('property="og:url" content="'+base+'/en/software/vaultpool/"'));
assert(localized.includes('name="description" content="VaultPool Storage for Windows'));
const obj=JSON.parse(localized.match(/<script id="a90-seo-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.equal(obj['@graph'].find(n=>n['@type']==='WebPage').inLanguage,'en-GB');
const article=enhanceCmsArticleSeo('<html><head><title>T</title></head><body></body></html>',{
 title_es:'Publicación',excerpt_es:'Una noticia',published_at:'2026-10-23T01:00:00Z',cover_path:'/assets/kookikeeper/cookies-control.webp'
},'es',new URL(base+'/articulos/prueba/'));
const ld=JSON.parse(article.match(/<script id="a90-cms-seo-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.equal(ld.datePublished,'2026-10-23T01:00:00.000Z');
assert.equal(ld.headline,'Publicación');
assert(!article.includes('aggregateRating'));
assert.equal(enhanceSeo('<html><head></head><body>Admin</body></html>','/admin/control/'),'<html><head></head><body>Admin</body></html>');
console.log('PASS: '+pass+' static pages, idempotent OG/Twitter, images, Schema.org, contextual links, English and CMS');
