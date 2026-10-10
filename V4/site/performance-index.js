(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarPerformanceIndex=api;
})(typeof globalThis==='undefined'?this:globalThis,()=>{
  'use strict';
  const version=2;
  const coefficients=Object.freeze({kills:5,holds:3,attackDivisor:100,defenseDivisor:100,victory:3,support:2,assists:3,cloversConsumedByRecipients:2,reraisesConsumedByRecipients:2,debuffDivisor:30});
  const labels=Object.freeze({kills:'Kills',holds:'Blocks',attack:'ATK',defense:'DEF',victory:'Victoire',support:'Soutiens',assists:'Passes d\u00e9cisives',cloversConsumedByRecipients:'Tr\u00e8fles utilis\u00e9s',reraisesConsumedByRecipients:'Reraise utilis\u00e9s',debuff:'Debuff',reraises:'Vies sauv\u00e9es'});
  const help='5 par kill + 3 par Block + 1 par 100 ATK + 1 par 100 DEF + 3 pour la victoire + 2 par nouveau soutien + 3 par passe d\u00e9cisive + 2 par tr\u00e8fle/Reraise utilis\u00e9 au donneur + 1 par 30 ATK retir\u00e9e.';
  const legacyHelp='Indice historique : 5 par kill + 3 par Block + 2 par soutien + 1 par vie sauv\u00e9e + 1 par 30 ATK retir\u00e9e.';
  const number=n=>Number.isFinite(n)&&n>=0?n:0;
  function breakdown(row,ratingVersion=version){
    const c=coefficients;
    if(ratingVersion===1)return {kills:number(row.kills)*5,holds:number(row.holds)*3,support:number(row.support)*2,reraises:number(row.reraises),debuff:Math.floor(number(row.debuff)/30)};
    return {kills:number(row.kills)*c.kills,holds:number(row.holds)*c.holds,attack:Math.floor(number(row.attack)/c.attackDivisor),defense:Math.floor(number(row.defense)/c.defenseDivisor),victory:row.victory?c.victory:0,support:number(row.support)*c.support,assists:number(row.assists)*c.assists,cloversConsumedByRecipients:number(row.cloversConsumedByRecipients)*c.cloversConsumedByRecipients,reraisesConsumedByRecipients:number(row.reraisesConsumedByRecipients)*c.reraisesConsumedByRecipients,debuff:Math.floor(number(row.debuff)/c.debuffDivisor)};
  }
  const calculate=(row,ratingVersion=version)=>Object.values(breakdown(row,ratingVersion)).reduce((a,b)=>a+b,0);
  const chargeId=source=>source.round+':'+source.kind+':'+source.recipient;
  function grantEvent(match,source){
    return match?.events.find(e=>e.round===source.round&&e.support===source.kind&&!e.refresh&&e.attacker===source.donor&&e.recipient===source.recipient);
  }
  function credits(event,match){
    if(match?.ratingVersion!==version)return [];
    const out=[],sources=event.sources||{};
    const usable=(source,recipient,kinds)=>source&&source.recipient===recipient&&kinds.includes(source.kind)&&grantEvent(match,source);
    const buff=sources.buff;
    if(usable(buff,event.attacker,['physical','mana'])&&buff.donor!==event.attacker&&event.buff>0&&event.kill&&!event.reraise&&!event.dodge&&event.attack>event.defense&&Math.max(0,event.attack-event.buff)<=event.defense)
      out.push({uid:buff.donor,metric:'assists',source:buff,points:coefficients.assists});
    for(const [key,flag,metric] of [['luck','luck','cloversConsumedByRecipients'],['reraise','reraise','reraisesConsumedByRecipients']]){
      const source=sources[key];
      if(event[flag]&&usable(source,event.target,[key]))out.push({uid:source.donor,metric,source,points:coefficients[metric]});
    }
    return out;
  }
  function validateSource(match,source,recipient,kinds,currentRound){
    if(!source||Object.keys(source).sort().join(',')!=='donor,kind,recipient,round'||!/^([01])-[0-9]$/.test(source.donor)||source.donor[0]!==recipient[0]||source.recipient!==recipient||!kinds.includes(source.kind)||!Number.isInteger(source.round)||source.round<1||source.round>currentRound)
      throw new Error('Provenance de soutien invalide.');
    if(!grantEvent(match,source)&&!(match.partial&&source.round<match.fromRound))throw new Error('Attribution de soutien introuvable.');
  }
  return {version,coefficients,labels,help,legacyHelp,breakdown,calculate,chargeId,grantEvent,credits,validateSource};
});
