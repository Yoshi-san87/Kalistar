(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarTurnOrder=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const pattern=Object.freeze([0,1,1,0]);
  const die=v=>Number.isInteger(v)&&v>=1&&v<=6;
  function create(seed){
    let rng=2166136261;
    for(const char of String(seed)+'\0captains')rng=Math.imul(rng^char.charCodeAt(0),16777619)>>>0;
    return {version:1,order:'ABBA',first:null,rolls:[],rng:rng||1};
  }
  function sideAt(order,round){return order.first^pattern[(round-1)%4];}
  function roll(order,forced){
    if(order.first!==null||order.rolls.length>=1000)throw Error('Tirage des capitaines indisponible.');
    if(forced!==undefined&&(!Array.isArray(forced)||forced.length!==2||!forced.every(die)))throw Error('Deux jets D6 valides sont requis.');
    const values=[0,1].map(side=>{
      if(forced)return forced[side];
      order.rng=(Math.imul(order.rng,1664525)+1013904223)>>>0||1;
      return Math.floor(order.rng/4294967296*6)+1;
    });
    order.rolls.push(values);
    if(values[0]!==values[1])order.first=values[0]>values[1]?0:1;
    return {dice:values.slice(),first:order.first,attempt:order.rolls.length};
  }
  function preview(state,count=5){
    if(state.phase==='setup'||state.phase==='initiative'||state.phase==='over')return [];
    return Array.from({length:Math.min(count,201-state.round)},(_,offset)=>({
      round:state.round+offset,side:state.initiative?sideAt(state.initiative,state.round+offset):(state.turn+offset)%2,
      current:offset===0,resolved:offset===0&&state.phase==='result'
    }));
  }
  function validate(state){
    const o=state.initiative;
    if(o===undefined){if(state.phase==='initiative')throw Error('Tirage manquant.');return;}
    if(!o||o.version!==1||o.order!=='ABBA'||![null,0,1].includes(o.first)||
      !Number.isInteger(o.rng)||o.rng<1||o.rng>4294967295||!Array.isArray(o.rolls)||o.rolls.length>1000||
      o.rolls.some(pair=>!Array.isArray(pair)||pair.length!==2||!pair.every(die)))throw Error('Initiative invalide.');
    const last=o.rolls.at(-1),decided=!!last&&last[0]!==last[1];
    if(o.rolls.slice(0,-1).some(pair=>pair[0]!==pair[1])||decided!==(o.first!==null)||
      decided&&o.first!==(last[0]>last[1]?0:1))throw Error('Jets des capitaines incoherents.');
    if(o.first===null){
      if(!['setup','initiative'].includes(state.phase)||state.round!==1||state.turn!==0||state.duel!==null||
        state.lastDuel!==null||state.match?.events.length||state.winner!==null||
        state.kalistel?.spent.length||state.players.some(p=>p.dead.length))throw Error('Tirage en attente incoherent.');
      if(state.phase==='setup'&&o.rolls.length)throw Error('Tirage avant le deploiement.');
    }else{
      if(['setup','initiative'].includes(state.phase)||state.turn!==sideAt(o,state.round)||
        state.match?.events.some(e=>Number(e.attacker[0])!==sideAt(o,e.round)))throw Error('Ordre ABBA incoherent.');
    }
  }
  return Object.freeze({create,roll,sideAt,preview,validate,pattern});
});
