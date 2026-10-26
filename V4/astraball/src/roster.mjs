import { TEAMS } from '../data/teams.mjs';
import { SPRITES } from './sprites.mjs';
import { createSpriteLibrary } from './sprite-library.mjs';
import { getAthlete, canPlayPosition } from '../data/athletes.mjs';
import { ATHLETE_CHOICES } from '../data/athlete-choices.mjs';

export const POSITIONS=Object.freeze([
  {id:'meneur',name:'Meneur',icon:'route'},
  {id:'scoreur',name:'Scoreur',icon:'crosshair'},
  {id:'middle',name:'Middle',icon:'diamond'},
  {id:'sentry',name:'Sentry',icon:'wind'},
  {id:'pilier',name:'Pilier',icon:'shield'},
].map(Object.freeze));

export function createRoster(libraryData) {
  const originals=TEAMS.flatMap(team=>team.players.map(player=>{
    const id=player.id.slice(3);
    const metadata=libraryData?.entries?.find(entry=>entry.characterId===id);
    return Object.freeze({id,name:player.name,characterId:id,...SPRITES[id],calibration:metadata?.calibration,portrait:'assets/portraits/'+id+'.webp',faction:metadata?.faction||team.name});
  }));
  const extras=libraryData?createSpriteLibrary(libraryData).entries.filter(entry=>!originals.some(c=>c.url===entry.file&&c.characterId===entry.characterId)).map(entry=>Object.freeze({
    id:entry.id,name:entry.name,characterId:entry.characterId,url:entry.file,scale:entry.scale,calibration:entry.calibration,portrait:null,faction:entry.faction,
  })):[];
  const entries=Object.freeze([...originals,...extras].filter(c=>getAthlete(c.characterId)&&ATHLETE_CHOICES[c.characterId]).map(c=>Object.freeze({...c,athlete:getAthlete(c.characterId)})));
  const byId=new Map(entries.map(entry=>[entry.id,entry]));
  const preferred=[
    {meneur:'momo',scoreur:'lanio',middle:'bex-kalistar',sentry:'kaylis',pilier:'taulio'},
    {meneur:'ombrine-kalistar',scoreur:'nereth-kalistar',middle:'varkhen-kalistar',sentry:'voloden',pilier:'lok'},
  ];
  const defaults=()=>preferred.map(team=>{
    const used=new Set();
    return Object.fromEntries(POSITIONS.map(p=>{
      const allowed=c=>canPlayPosition(c.athlete,p.id)&&!used.has(c.characterId);
      const c=entries.find(c=>c.characterId===team[p.id]&&allowed(c))||entries.find(allowed);
      if(!c)throw Error('Incomplete athlete catalogue: '+p.id);
      used.add(c.characterId);return [p.id,c.id];
    }));
  });
  function normalize(value) {
    return defaults().map((fallback,team)=>{
      const proposed=value?.[team];
      if(!proposed||typeof proposed!=='object'||Array.isArray(proposed))return fallback;
      const result={},used=new Set();
      const assign=(role,c)=>{result[role]=c.id;used.add(c.characterId);};
      // Repair only the next-match draft; keep already-compatible choices first.
      for(const p of POSITIONS){
        const c=byId.get(proposed[p.id]);
        if(c&&canPlayPosition(c.athlete,p.id)&&!used.has(c.characterId))assign(p.id,c);
      }
      for(const p of POSITIONS){
        const c=byId.get(proposed[p.id]);
        if(c&&!result[c.athlete.position]&&!used.has(c.characterId))assign(c.athlete.position,c);
      }
      return Object.fromEntries(POSITIONS.map(p=>[p.id,result[p.id]||fallback[p.id]]));
    });
  }
  function fromUnits(units) {
    return normalize([0,1].map(team=>Object.fromEntries(units.filter(u=>u.team===team).map(u=>[u.role,u.character||u.id.slice(3)]))));
  }
  function teams(value) {
    const selection=normalize(value);
    return TEAMS.map(team=>({...team,players:POSITIONS.map(position=>{
      const character=byId.get(selection[team.id][position.id]);
      return {id:'t'+team.id+'-'+character.id,name:character.name,role:position.id,character:character.id,athleteId:character.characterId};
    })}));
  }
  function select(value,team,role,id) {
    const result=normalize(value),character=byId.get(id);
    if(![0,1].includes(team)||!canPlayPosition(character?.athlete,role))throw Error('Invalid lineup choice');
    const other=POSITIONS.find(p=>p.id!==role&&byId.get(result[team][p.id]).characterId===character.characterId);
    if(other)throw Error('Duplicate character identity');
    result[team][role]=id;return result;
  }
  function canSelect(value,team,role,id){try{select(value,team,role,id);return true;}catch{return false;}}
  function shuffle(random=Math.random){
    const pool=[...new Map(entries.map(c=>[c.characterId,c])).values()];
    for(let i=pool.length-1;i>0;i--){const draw=random();if(!Number.isFinite(draw)||draw<0||draw>=1)throw Error('Invalid random source');const j=Math.floor(draw*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const order=[...POSITIONS].sort((a,b)=>pool.filter(c=>canPlayPosition(c.athlete,a.id)).length-pool.filter(c=>canPlayPosition(c.athlete,b.id)).length);
    const picked={},used=new Set();
    function fill(i){
      if(i===order.length)return true;
      const role=order[i].id;
      for(const c of pool)if(!used.has(c.characterId)&&canPlayPosition(c.athlete,role)){
        picked[role]=c.id;used.add(c.characterId);if(fill(i+1))return true;used.delete(c.characterId);
      }
      return false;
    }
    if(!fill(0))throw Error('No complete team available');
    return Object.fromEntries(POSITIONS.map(p=>[p.id,picked[p.id]]));
  }
  return Object.freeze({entries,get:id=>byId.get(id)||null,defaults,normalize,fromUnits,teams,select,canSelect,shuffle,
    forUnit:unit=>byId.get(unit.character)||byId.get(unit.id.slice(3))||byId.get(TEAMS[unit.team]?.players.find(p=>p.role===unit.role)?.id.slice(3))||null});
}
