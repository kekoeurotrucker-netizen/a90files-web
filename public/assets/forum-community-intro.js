(()=>{
'use strict';
const intro=document.querySelector('.forum-intro');
const board=document.querySelector('.board');
if(board)board.id='foro-categorias';
if(!intro)return;

const kicker=intro.querySelector('.forum-kicker');
if(kicker)kicker.textContent='COMUNIDAD · PROYECTOS · SOPORTE';

const title=intro.querySelector('h1');
if(title){
 title.textContent='';
 const main=document.createElement('span');main.textContent='Foro';
 const mark=document.createElement('em');mark.textContent='A 90';
 title.append(main,mark);
}

const copy=intro.querySelector('p');
if(copy)copy.textContent='Comparte proyectos, pide ayuda, da feedback y habla de software, juegos, contenido y cualquier creación de la comunidad. Un punto de encuentro para enseñar lo que haces, resolver dudas y descubrir lo que están creando otros usuarios.';

if(!intro.querySelector('.forum-hero-actions')){
 const actions=document.createElement('div');actions.className='forum-hero-actions';
 const links=[
  ['Explorar foros','#foro-categorias','forum-hero-action primary'],
  ['Normas','/foro/?c=normas-y-avisos','forum-hero-action'],
  ['Soporte','/soporte/','forum-hero-action']
 ];
 for(const [label,href,className] of links){const a=document.createElement('a');a.className=className;a.href=href;a.textContent=label;actions.appendChild(a)}
 const summary=intro.querySelector('.forum-summary');
 if(summary)intro.insertBefore(actions,summary);else intro.appendChild(actions);
}
})();
