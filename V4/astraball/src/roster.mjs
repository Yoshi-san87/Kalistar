import { TEAMS } from '../data/teams.mjs';
import { SPRITES } from './sprites.mjs';
import { createSpriteLibrary } from './sprite-library.mjs';

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
    return Object.freeze({id,name:player.name,characterId:id,...SPRITES[id],portrait:'assets/portraits/'+id+'.webp',faction:team.name});
  }));
  const extras=libraryData?createSpriteLibrary(libraryData).entries.filter(entry=>!originals.some(c=>c.url===entry.file&&c.characterId===entry.characterId)).map(entry=>Object.freeze({
    id:entry.id,name:entry.name,characterId:entry.characterId,url:entry.file,scale:entry.scale,portrait:null,faction:entry.faction,
  })):[];
  const entries=Object.freeze([...originals,...extras]),byId=new Map(entries.map(entry=>[entry.id,entry]));
  const defaults=()=>TEAMS.map(team=>Object.fromEntries(team.players.map(player=>[player.role,player.id.slice(3)])));
  function normalize(value) {
    return defaults().map((fallback,team)=>{
      const proposed=value?.[team];
      if(!proposed||POSITIONS.some(p=>!byId.has(proposed[p.id])))return fallback;
      const identities=POSITIONS.map(p=>byId.get(proposed[p.id]).characterId);
      return new Set(identities).size===5?Object.fromEntries(POSITIONS.map(p=>[p.id,proposed[p.id]])):fallback;
    });
  }
  function fromUnits(units) {
    return normalize([0,1].map(team=>Object.fromEntries(units.filter(u=>u.team===team).map(u=>[u.role,u.character||u.id.slice(3)]))));
  }
  function teams(value) {
    const selection=normalize(value);
    return TEAMS.map(team=>({...team,players:POSITIONS.map(position=>{
      const character=byId.get(selection[team.id][position.id]);
      return {id:'t'+team.id+'-'+character.id,name:character.name,role:position.id,character:character.id};
    })}));
  }
  function select(value,team,role,id) {
    const result=normalize(value),character=byId.get(id);
    if(![0,1].includes(team)||!POSITIONS.some(p=>p.id===role)||!character)throw Error('Invalid lineup choice');
    const other=POSITIONS.find(p=>p.id!==role&&byId.get(result[team][p.id]).characterId===character.characterId);
    if(other)result[team][other.id]=result[team][role];
    result[team][role]=id;return result;
  }
  return Object.freeze({entries,get:id=>byId.get(id)||null,defaults,normalize,fromUnits,teams,select,
    forUnit:unit=>byId.get(unit.character||unit.id.slice(3))||byId.get(defaults()[unit.team]?.[unit.role])||null});
}
