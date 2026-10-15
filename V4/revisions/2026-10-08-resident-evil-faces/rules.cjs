'use strict';
const assert=require('node:assert/strict'),bounds=require('../../../V3/donnees/regles_demo.json').roleBounds;
const REV='2026-10-08-resident-evil-faces',FIELDS=['atk','defense','magic','barriers','canGuard','canHeal'];
const statName=n=>/^(ATK|DEF) D[1-6] - /.test(n);
function after(before,row){
 const p={...before,atk:row.atk,defense:row.defense,magic:row.magic||before.magic,barriers:row.barriers||before.barriers,
 canGuard:row.atk.includes('guard'),canHeal:row.atk.includes('revive')};
 validate(before,p);return p;
}
function validate(before,p){
 assert.deepEqual({...p,...Object.fromEntries(FIELDS.map(k=>[k,before[k]]))},before,'Only combat faces and derived ability flags may change');
 assert.notDeepEqual(p.atk.concat(p.defense),before.atk.concat(before.defense));
 for(const side of ['atk','defense']){
  assert.equal(p[side].length,6);assert(p[side].filter(v=>typeof v==='number').length>=3);
  p[side].forEach((v,i)=>{
   if(typeof v==='number')assert(Number.isInteger(v)&&v>=(bounds[p.role][side][i+1]||0)&&v<=bounds[p.role][side][i],p.id+' '+side+' D'+(6-i));
   else assert((side==='atk'?['guard','revive','retry','mana','buff_atk','death']:['retry','dodge']).includes(v));
  });
 }
 if(p.atk.includes('guard'))assert([1,5].includes(p.role));
 if(p.atk.includes('revive'))assert.equal(p.role,5);
 assert.equal(p.canGuard,p.atk.includes('guard'));assert.equal(p.canHeal,p.atk.includes('revive'));
 for(const [field,side]of [['magic','atk'],['barriers','defense']]){
  assert.equal(new Set(p[field]).size,p[field].length);
  assert(p[field].every(d=>Number.isInteger(d)&&d>=1&&d<=6&&typeof p[side][6-d]==='number'));
 }
 if(p.element==='NONE')assert.equal(p.magic.length+p.barriers.length,0);
 return p;
}
function unchangedState(layers){
 return layers.filter(l=>!statName(l.name)).map(({id,...l})=>l).sort((a,b)=>a.path.localeCompare(b.path));
}
function changedCircles(before,p){
 const ys=[147,372.5,476.5,577.5,677.5,774.5],out=[];
 for(const side of ['atk','defense'])for(let i=0;i<6;i++){
  const die=6-i,mode=side==='atk'?'magic':'barriers';
  if(before[side][i]===p[side][i]&&before[mode].includes(die)===p[mode].includes(die))continue;
  out.push({name:side+' D'+die,x:side==='atk'?(i?157.5:142):(i?736.5:756),y:ys[i],radius:i?73:92});
 }
 return out;
}
module.exports={REV,FIELDS,statName,after,validate,unchangedState,changedCircles};

