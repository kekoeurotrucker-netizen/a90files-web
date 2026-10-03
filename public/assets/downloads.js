(()=>{"use strict";
const cards=[...document.querySelectorAll("[data-dl-project]")];
const buttons=[...document.querySelectorAll("[data-dl-filter]")];
const input=document.getElementById("dl-search"),empty=document.getElementById("dl-no-results");
if(!cards.length)return;
let selected="all";
const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
function refresh(){
 const term=norm(input?.value);let count=0;
 for(const card of cards){
   const match=(selected==="all"||selected===card.dataset.category)&&norm(card.textContent).includes(term);
   card.hidden=!match;if(match)count++;
 }
 if(empty)empty.hidden=count!==0;
}
for(const b of buttons)b.addEventListener("click",()=>{
 selected=b.dataset.dlFilter;
 for(const other of buttons){
   const active=other===b;
   other.classList.toggle("is-selected",active);
   other.setAttribute("aria-pressed",String(active));
 }
 refresh();
});
input?.addEventListener("input",refresh);
document.getElementById("dl-reset")?.addEventListener("click",()=>{
 if(input)input.value="";
 buttons.find(b=>b.dataset.dlFilter==="all")?.click();input?.focus();
});
refresh();
})();