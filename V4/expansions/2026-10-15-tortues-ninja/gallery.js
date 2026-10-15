'use strict';
const search=document.querySelector('#search'),faction=document.querySelector('#faction');
const cards=[...document.querySelectorAll('figure')],normal=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function filter(){
 const q=normal(search.value.trim());let visible=0;
 for(const card of cards){card.hidden=!!((faction.value&&card.dataset.faction!==faction.value)||!normal(card.dataset.search).includes(q));if(!card.hidden)visible++;}
 document.querySelector('#count').textContent=visible+' carte'+(visible===1?'':'s');document.querySelector('#empty').hidden=visible>0;
}
document.querySelector('form').addEventListener('submit',e=>e.preventDefault());
search.addEventListener('input',filter);faction.addEventListener('change',filter);
