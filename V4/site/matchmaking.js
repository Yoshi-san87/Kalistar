(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarMatchmaking=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const difficulties=['relaxed','balanced','tactical'];
  function random(seed){
    let state=2166136261;
    for(const char of String(seed))state=Math.imul(state^char.charCodeAt(0),16777619)>>>0;
    return ()=>{state+=0x6D2B79F5;let x=state;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return ((x^x>>>14)>>>0)/4294967296;};
  }
  function arena(arenas,current,seed){
    const choices=arenas.filter(a=>a.id!==current);
    const pool=choices.length?choices:arenas;
    if(!pool.length)throw new Error('Aucune arene disponible.');
    return pool[Math.floor(random(seed)()*pool.length)].id;
  }
  function create(engine,teams,pool=Object.values(engine.byId)){
    const cards=pool.filter(c=>engine.byId[c.id]===c),identity=c=>c.characterId||c.id;
    const domains=Array.from({length:5},(_,i)=>cards.filter(c=>c.positions.includes(i+1)));
    function score(team){
      const p={board:team.formation.map(cardId=>({cardId}))};
      let total=p.board.reduce((sum,u)=>sum+engine.synergy(p,u,'faction')+engine.synergy(p,u,'race'),0);
      const captain=engine.byId[team.captain];
      for(const field of ['faction','race']){
        const count=p.board.filter(u=>engine.byId[u.cardId][field]===captain[field]).length;
        if(count>1)total+=count*10;
      }
      // Elemental variety covers more matchups; it never grants an extra buff.
      total+=new Set(team.cards.map(id=>engine.byId[id].element).filter(e=>e&&e!=='NONE')).size*4;
      for(const id of team.cards.filter(id=>!team.formation.includes(id))){
        const c=engine.byId[id];
        total+=p.board.filter(u=>engine.byId[u.cardId].faction===c.faction||engine.byId[u.cardId].race===c.race).length*2;
      }
      return total;
    }
    function candidate(rng,bias){
      const slots=Array.from({length:10},(_,i)=>({index:i,position:i%5})).sort((a,b)=>domains[a.position].length-domains[b.position].length);
      const picked=Array(10),used=new Set();let nodes=0,rainbow=false;
      function visit(depth){
        if(depth===10)return true;
        if(++nodes>4096)return false;
        const slot=slots[depth],chosen=picked.filter(Boolean);
        const options=domains[slot.position].filter(c=>!used.has(identity(c))&&!(rainbow&&c.element==='RAINBOW')).map(c=>{
          const links=chosen.reduce((n,other)=>n+(other.faction===c.faction?1:0)+(other.race===c.race?1:0),0);
          return {c,key:Math.log(Math.max(rng(),Number.EPSILON))/(1+bias*links)};
        }).sort((a,b)=>b.key-a.key);
        for(const {c} of options){
          const before=rainbow;rainbow ||= c.element==='RAINBOW';used.add(identity(c));picked[slot.index]=c;
          if(visit(depth+1))return true;
          picked[slot.index]=null;used.delete(identity(c));rainbow=before;
          if(nodes>4096)break;
        }
        return false;
      }
      if(!visit(0))return null;
      const ids=picked.map(c=>c.id),team=teams.fromPreset({name:'Composition au hasard',cards:ids});
      team.formation=ids.slice(0,5);
      team.captain=team.formation.reduce((best,id)=>{
        const c=engine.byId[id],links=team.formation.reduce((n,x)=>n+(engine.byId[x].faction===c.faction?1:0)+(engine.byId[x].race===c.race?1:0),0);
        return !best||links>best.links?{id,links}:best;
      },null).id;
      if(engine.validateComposition(team).length)return null;
      return team;
    }
    function generate({seed,difficulty='balanced'}={}){
      if(!difficulties.includes(difficulty))throw new Error('Difficulte inconnue.');
      if(new Set(cards.map(identity)).size<10||domains.some(d=>new Set(d.map(identity)).size<2))throw new Error('Catalogue insuffisant pour une equipe valide P1 a P5.');
      const rng=random(seed),candidates=[];
      // Bounded search, including coherent candidates, shared by all difficulties.
      for(let i=0;i<48;i++){const team=candidate(rng,i>=32?3:0);if(team)candidates.push({team,score:score(team)});}
      if(!candidates.length)throw new Error('Aucune composition valide dans ce catalogue.');
      candidates.sort((a,b)=>a.score-b.score);
      const ratio={relaxed:.15,balanced:.5,tactical:.95}[difficulty];
      const selected=candidates[Math.floor((candidates.length-1)*ratio)];
      return {...selected.team,id:'random'};
    }
    return {generate,score};
  }
  return {create,arena,difficulties};
});
