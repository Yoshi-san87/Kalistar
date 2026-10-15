'use strict';

// Synthetic profiles isolate engine tests from the concurrently authored roster.
function createData(){
  const elements={};
  for(const cycle of [['AERO','HYDRO','PYRO','CRYO','HERBO','GEO','MINERO','ELECTRO'],['LUXO','HEMATO','NECRO']]){
    cycle.forEach((id,i)=>elements[id]={id,strong_against:cycle[(i+1)%cycle.length],weak_against:cycle[(i+cycle.length-1)%cycle.length]});
  }
  elements.RAINBOW={id:'RAINBOW',strong_against:null,weak_against:null};
  elements.NONE={id:'NONE',strong_against:null,weak_against:null};
  const groups=[['Hache','Marteau','Masse','Poing','Fl\u00e9au'],['Arc','Fouet','Gun','Lance','Projectile'],['B\u00e2ton','Instrument','Sceptre','Tome','Orbe'],['Dague','Ep\u00e9e courte','Ep\u00e9e longue','Katana','Faucille']];
  const weapons=Object.fromEntries(groups.flatMap((group,i)=>group.map(a=>[a,Object.fromEntries(groups.flatMap((other,j)=>other.map(b=>[b,i===j||Math.abs(i-j)===2?0:(i+1)%4===j?-50:50])))])));
  const cards=Array.from({length:20},(_,i)=>{
    const id=String(30000001+i),role=i%5+1,element=i%7===0?'NONE':Object.keys(elements)[i%11];
    const atk=[200,160,130,100,70,40],defense=[160,130,100,80,60,40];
    if(role===1)atk[5]='guard';
    if(role===2)atk[5]='buff_atk';
    if(role===3){atk[5]='retry';atk[4]='death';}
    if(role===4)atk[5]='mana';
    if(role===5){atk[5]='revive';atk[4]='guard';}
    defense[4]='retry';defense[5]='dodge';
    return {id,name:'Fixture '+(i+1),characterId:'character-'+(i+1),role,positions:[role],sentry:false,
      canGuard:[1,5].includes(role),canHeal:role===5,element,atk,defense,
      magic:[3,4].includes(role)?[6,5,4]:[],barriers:element==='NONE'?[]:[6],
      weapon:groups.flat()[i],race:'race-'+i%3,faction:'faction-'+i%4,advantage:30,disadvantage:30};
  });
  return {cards,elements,weapons,
    rules:{deck_size:10,rainbow_limit:1,barrier:30,synergy:[0,0,10,20,30,40]},
    demo:{copy_limit:2,token_bonus:60,max_turns:200},
    decks:{player:cards.slice(0,10).map(c=>c.id),enemy:cards.slice(10).map(c=>c.id)},
    arenas:[
      {id:'ruins',name:'Ruins',element:'NONE',elementBonus:0,homeCharacters:[],homeAttack:0,homeDefense:0},
      {id:'forge',name:'Forge',element:'PYRO',elementBonus:15,homeCharacters:['character-3','character-11'],homeAttack:10,homeDefense:10},
      {id:'z13',name:'Z13',element:null,elementBonus:0,homeCharacters:['character-1'],homeAttack:10,homeDefense:10},
      {id:'rainbow-lab',name:'Rainbow lab',element:'RAINBOW',elementBonus:15,homeCharacters:['momo'],homeAttack:10,homeDefense:10}
    ]};
}

function numericData(){
  const data=createData();
  for(const c of data.cards){
    c.atk=Array(6).fill(100);c.defense=Array(6).fill(100);c.magic=[];c.barriers=[];
    c.element='PYRO';c.weapon='Poing';c.faction=c.id;c.race=c.id;
    // Versatile synthetic supports let legacy trait regressions use a fixed slot.
    c.positions=[...new Set([...c.positions,5])];c.role=5;c.canHeal=true;c.canGuard=true;
  }
  return data;
}

module.exports={createData,numericData};
