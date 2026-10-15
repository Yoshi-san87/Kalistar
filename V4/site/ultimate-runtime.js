(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarUltimateRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const is=w=>w?.effect?.trigger==='ULTIMATE';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const keys=(x,allowed)=>object(x)&&Object.keys(x).every(k=>allowed.includes(k));
  const fail=()=>{throw new Error('Etat des ultimes invalide.');};
  const traits=['luck','reraise','ward','mana','physical'];
  const all=s=>s.players.flatMap(p=>[...p.board.filter(Boolean),...p.reserve,...p.dead]);
  const unit=(s,uid)=>all(s).find(u=>u.uid===uid);
  const board=(s,uid)=>s.players[Number(uid[0])].board.filter(Boolean);
  const live=(s,uid)=>board(s,uid).some(u=>u.uid===uid);
  const enemy=(s,uid)=>s.players[1-Number(uid[0])].board.filter(Boolean);
  const outnumbered=(s,uid)=>board(s,uid).length<enemy(s,uid).length;
  const state=s=>s.equipment?.rituals;
  const init=s=>s.equipment.rituals??={version:1,records:{},events:[],uses:[],deployments:[]};
  const record=(s,uid)=>state(s)?.records[uid];
  const source=(s,r,c)=>{const u=unit(s,r.sourceUid);return c.equipped(s,u,c.card(u));};
  const playing=s=>!['setup','initiative','over'].includes(s.phase);
  const enabled=s=>s.equipment?.definitions.some(is);
  function validateEffect(w){
    const e=w.effect,a=e?.action;
    if(w.rulesVersion!==2||w.slot!=='relic'||!keys(e,['trigger','duration','event','count','distinct','traits','when','action'])||e.duration!=='ONCE_MATCH'||
      !['BLOCK','SUPPORT','ALLIED_DEATH','WARD_SAVED','RERAISE_USED','POWER_USED','CLOVER_SAVED','UNINVOLVED','SURVIVED','ATTACK','TARGETED','ALLY_TARGETED','INSUFFICIENT_DEFENSE','DEPLOYED'].includes(e.event)||
      e.count!==undefined&&![1,2].includes(e.count)||e.distinct!==undefined&&e.distinct!==true||e.traits!==undefined&&(!Array.isArray(e.traits)||!e.traits.length||e.traits.some(t=>!traits.includes(t))))fail();
    if(e.when!==undefined&&(!keys(e.when,['outnumbered','activeAtMost','magic','elementPositive','elementNegative'])||Object.entries(e.when).some(([k,v])=>k==='magic'?typeof v!=='boolean':k==='activeAtMost'?v!==2:v!==true)))fail();
    if(!object(a))fail();
    if(a.kind==='GRANT'){
      if(!keys(a,['kind','traits','target','max','chooseTrait'])||!Array.isArray(a.traits)||!a.traits.length||a.traits.length>2||new Set(a.traits).size!==a.traits.length||a.traits.some(t=>!traits.includes(t))||
        !['chooseAllies','selfAndAlly','recipient','self','nextAlly'].includes(a.target)||a.max!==undefined&&![1,2].includes(a.max)||a.chooseTrait!==undefined&&a.chooseTrait!==true)fail();
    }else if(a.kind==='ARM'){
      if(!keys(a,['kind','stat','value','target','against','magic'])||!['ATK','DEF','DUEL'].includes(a.stat)||![40,50,60].includes(a.value)||!['self','nextAlly'].includes(a.target)||a.against!==undefined&&!['killer','attacker'].includes(a.against)||a.magic!==undefined&&a.magic!==true)fail();
    }else if(a.kind==='BONUS'){
      if(!keys(a,['kind','stat','value'])||!['ATK','DEF'].includes(a.stat)||a.value!==60)fail();
    }else if(a.kind==='MITIGATE'){
      if(!keys(a,['kind','components','value','direction'])||![40,60].includes(a.value)||!['penalty','advantage'].includes(a.direction)||!Array.isArray(a.components)||!a.components.length||new Set(a.components).size!==a.components.length||a.components.some(k=>!['weapon','element','faction','arenaAttack'].includes(k)))fail();
    }else if(a.kind==='DEBUFF'){
      if(!keys(a,['kind','value'])||a.value!==40)fail();
    }else if(a.kind==='COIN'){
      if(!keys(a,['kind','value'])||a.value!==60)fail();
    }else if(a.kind==='PREDICT'){
      if(!keys(a,['kind','value'])||a.value!==50)fail();
    }else fail();
    return w;
  }
  function ensure(s,u,w){
    return init(s).records[u.uid]??={sourceUid:u.uid,weaponId:w.id,status:'tracking',progress:[],seen:[]};
  }
  function visual(s,r,kind,extra={}){
    const x=init(s),event={id:'u'+x.events.length,round:s.round,kind,weaponId:r.weaponId,sourceUid:r.sourceUid,...extra};
    x.events.push(event);
    if(s.duel&&s.duel.round===s.round)(s.duel.ultimateEvents??=[]).push(clone(event));
    return event;
  }
  function spend(s,r){r.status='spent';r.spentRound=s.round;delete r.choice;}
  function matches(s,u,when={},ev={}){
    return (!when.outnumbered||outnumbered(s,u.uid))&&(!when.activeAtMost||board(s,u.uid).length<=when.activeAtMost)&&
      (when.magic===undefined||s.duel?.magic===when.magic)&&(!when.elementPositive||ev.threat?.element>0)&&(!when.elementNegative||ev.threat?.element<0);
  }
  function view(s,u,w){
    const r=record(s,u.uid),used=s.duel?.ultimateEvents?.some(e=>e.sourceUid===u.uid&&['bonus','grant'].includes(e.kind))&&['defense','result'].includes(s.phase);
    const ready=playing(s)&&live(s,u.uid)&&(r?.status==='ready'||r?.status==='choice'||(!r||r.status==='tracking')&&['ATTACK','TARGETED','ALLY_TARGETED','INSUFFICIENT_DEFENSE'].includes(w.effect.event)&&matches(s,u,w.effect.when));
    return {weapon:w,active:!!(ready||used),ready:!!ready,status:r?.status||'inactive',progress:r?.progress.length||0,targetUid:r?.targetUid||null};
  }
  function eligible(s,r,a){
    const list=a.kind==='DEBUFF'?enemy(s,r.sourceUid):board(s,r.sourceUid);
    return list.filter(u=>a.kind==='DEBUFF'||u.uid!==r.sourceUid&&u.uid!==r.excludeUid&&!(r.selected||[]).includes(u.uid)&&a.traits.some(t=>!u[t]));
  }
  function gift(s,r,u,kind,c){
    if(!u||!live(s,u.uid)||u[kind]||u.uid[0]!==r.sourceUid[0])return false;
    // A spent charge is recorded before any downstream support event is emitted.
    c.grant(u,kind,r.sourceUid);
    const grants=s.match.ultimateGrants??=[],g={id:'g'+grants.length,round:s.round,weaponId:r.weaponId,sourceUid:r.sourceUid,recipient:u.uid,kind};
    grants.push(g);visual(s,r,'grant',{recipient:u.uid,trait:kind});
    c.log(source(s,r,c).name+' : '+c.card(u).name+' re\u00e7oit '+({luck:'un tr\u00e8fle',reraise:'un Reraise',ward:'une Garde',mana:'une Potion',physical:'une Puissance'}[kind])+'.');
    dispatch(s,{id:'gift:'+g.id,event:'SUPPORT',actor:r.sourceUid,recipient:u.uid,trait:kind},c);
    return true;
  }
  function addModifier(s,r,recipient,stat,value,c){
    const d=s.duel;if(!d||typeof d.attackValue!=='number'||!value)return false;
    const part=stat==='ATK'?'attack':'defense',mods=d.ultimateModifiers??=[];
    const existing=mods.filter(m=>m.recipient===recipient&&m.stat===stat);
    const baseline=d.equipment?.[part]?.value||0;
    const positive=Math.max(baseline,...existing.map(m=>Math.max(0,m.value))),negative=Math.min(0,...existing.map(m=>m.value));
    if(value>0?value<=positive:value>=negative)return false;
    spend(s,r);
    const x=init(s),m={id:'m'+x.uses.length,round:s.round,weaponId:r.weaponId,sourceUid:r.sourceUid,recipient,stat,value};
    x.uses.push(m);mods.push(clone(m));visual(s,r,'bonus',{recipient,stat,value});
    c.log(source(s,r,c).name+' : '+(value>0?'+':'')+value+' '+stat+'.');return true;
  }
  function arm(s,r,ev){
    r.status='ready';r.armedRound=s.round;
    if(ev.recipient)r.beneficiary=ev.recipient;
    visual(s,r,'ready',r.targetUid?{targetUid:r.targetUid}:{});
  }
  function activate(s,r,w,ev,c){
    const a=w.effect.action,u=unit(s,r.sourceUid);
    if(a.kind==='GRANT'){
      if(a.target==='nextAlly'){arm(s,r,{});r.waitingDeployment=true;return;}
      if(a.target==='chooseAllies'){
        if(ev.event==='POWER_USED')r.excludeUid=ev.recipient;
        if(!eligible(s,r,a).length)return;
        r.status='choice';r.choice={mode:'target',remaining:a.max||1};r.selected=[];visual(s,r,'ready');return;
      }
      const targets=a.target==='self'?[u]:a.target==='selfAndAlly'?board(s,r.sourceUid):[unit(s,ev.recipient)];
      const available=targets.filter(v=>v&&live(s,v.uid)&&a.traits.some(t=>!v[t]));
      if(!available.length)return;
      if(a.chooseTrait){r.status='choice';r.beneficiary=available[0].uid;r.choice={mode:'trait',remaining:1};visual(s,r,'ready');return;}
      spend(s,r);for(const v of available.slice(0,2))for(const t of a.traits)gift(s,r,v,t,c);
    }else if(a.kind==='ARM'){
      if(a.against)r.targetUid=ev.enemy||s.duel?.attacker;
      if(a.target==='nextAlly')r.waitingDeployment=true;
      arm(s,r,{});
      if(ev.event==='ATTACK')useReady(s,r,w,'ATK',ev,c);
    }else if(a.kind==='BONUS')addModifier(s,r,a.stat==='ATK'?s.duel.attacker:s.duel.target,a.stat,a.value,c);
    else if(a.kind==='MITIGATE'){
      if(ev.event==='SUPPORT'){arm(s,r,{});return;}
      mitigate(s,r,a,ev.threat,c);
    }else if(a.kind==='DEBUFF'){
      if(!enemy(s,r.sourceUid).length)return;
      r.status='choice';r.choice={mode:'target',remaining:1};visual(s,r,'ready');
    }else if(a.kind==='COIN'){
      // The coin is drawn once, after the attack is retained, from the match RNG.
      spend(s,r);r.coin=c.random()<.5?'heads':'tails';
      c.log(w.name+' : '+(r.coin==='heads'?'pile':'face')+'.');
      if(r.coin==='heads')addModifier(s,r,s.duel.attacker,'ATK',a.value,c);
      else gift(s,r,u,'ward',c);
    }else if(a.kind==='PREDICT')arm(s,r,{});
  }
  function mitigate(s,r,a,threat,c){
    if(!threat)return;
    const amount=Math.min(a.value,a.components.reduce((n,k)=>n+Math.max(0,(threat[k]||0)*(a.direction==='penalty'?-1:1)),0));
    if(amount)addModifier(s,r,s.duel.attacker,'ATK',a.direction==='penalty'?amount:-amount,c);
  }
  function dispatch(s,ev,c){
    if(!enabled(s)||!playing(s))return;
    // UID order breaks ties reproducibly; bigger direct modifiers are considered first.
    const bearers=s.players.flatMap(p=>p.board.filter(Boolean)).map(u=>({u,w:c.equipped(s,u,c.card(u))})).filter(v=>is(v.w))
      .sort((a,b)=>(b.w.effect.action.value||0)-(a.w.effect.action.value||0)||a.u.uid.localeCompare(b.u.uid));
    for(const {u,w} of bearers){
      const e=w.effect;if(e.event!==ev.event)continue;
      const relevant=e.event==='ALLIED_DEATH'?ev.recipient[0]===u.uid[0]&&ev.recipient!==u.uid:
        e.event==='ALLY_TARGETED'?ev.recipient[0]===u.uid[0]&&ev.recipient!==u.uid:
        e.event==='DEPLOYED'?ev.recipient[0]===u.uid[0]&&ev.recipient!==u.uid:ev.actor===u.uid;
      if(!relevant||!matches(s,u,e.when,ev)||e.traits&&!e.traits.includes(ev.trait)||e.event==='SUPPORT'&&ev.recipient===u.uid)continue;
      const r=ensure(s,u,w);if(r.status!=='tracking'||r.seen.includes(ev.id))continue;
      r.seen.push(ev.id);
      if(!e.distinct||!r.progress.some(p=>p.recipient===ev.recipient))r.progress.push({id:ev.id,round:s.round,...(ev.recipient?{recipient:ev.recipient}:{})});
      r.progress=r.progress.slice(-(e.count||1));
      if(r.progress.length>=(e.count||1))activate(s,r,w,ev,c);
    }
  }
  function useReady(s,r,w,stat,ev,c){
    if(r.status!=='ready'||r.waitingDeployment)return;
    const a=w.effect.action,d=s.duel,recipient=r.beneficiary||r.sourceUid;
    if(a.kind==='ARM'){
      if(![stat,'DUEL'].includes(a.stat)||recipient!==(stat==='ATK'?d.attacker:d.target)||a.magic!==undefined&&d.magic!==a.magic||r.targetUid&&r.targetUid!==(stat==='ATK'?d.target:d.attacker))return;
      addModifier(s,r,recipient,stat,a.value,c);
    }else if(a.kind==='MITIGATE'&&stat==='DEF'&&d.target===r.sourceUid)mitigate(s,r,a,ev.threat,c);
    else if(a.kind==='DEBUFF'&&stat==='ATK'&&d.attacker===r.targetUid)addModifier(s,r,d.attacker,'ATK',-a.value,c);
  }
  function lock(s,c){
    if(!enabled(s))return;
    s.duel.round=s.round;
    s.duel.ultimateRosters=s.players.map(p=>p.board.filter(Boolean).map(u=>u.uid));
    const u=unit(s,s.duel.target),w=c.equipped(s,u,c.card(u)),r=record(s,u.uid);
    if(is(w)&&w.effect.action.kind==='PREDICT'&&r?.status==='ready'){
      r.status='choice';r.choice={mode:'parity',remaining:1};visual(s,r,'ready');
    }
  }
  function accepted(s,threat,c){
    if(!enabled(s)||typeof s.duel.attackValue!=='number')return;
    const d=s.duel,ev={threat};d.ultimateThreat=clone(threat);
    dispatch(s,{...ev,id:s.round+':attack',event:'ATTACK',actor:d.attacker,recipient:d.target},c);
    dispatch(s,{...ev,id:s.round+':targeted',event:'TARGETED',actor:d.target,recipient:d.target},c);
    dispatch(s,{...ev,id:s.round+':allyTargeted',event:'ALLY_TARGETED',recipient:d.target},c);
    for(const r of Object.values(state(s)?.records||{})){
      const w=source(s,r,c);useReady(s,r,w,'ATK',ev,c);
      if(w.effect.action.kind==='PREDICT'&&r.predictedRound===s.round&&r.parity===(d.attackDie%2?'odd':'even'))addModifier(s,r,d.target,'DEF',w.effect.action.value,c);
    }
  }
  function numeric(s,f,c){
    if(!enabled(s))return;
    for(const r of Object.values(state(s)?.records||{}))useReady(s,r,source(s,r,c),'DEF',{threat:f},c);
    totals(s.duel,f);
  }
  function totals(d,f){
    for(const [stat,part,uid] of [['ATK','attack',d.attacker],['DEF','defense',d.target]]){
      const mods=(d.ultimateModifiers||[]).filter(m=>m.stat===stat&&m.recipient===uid),base=d.equipment?.[part]?.value||0;
      if(mods.length)f[stat==='ATK'?'ultimateAttack':'ultimateDefense']=Math.max(base,...mods.map(m=>m.value))-base+Math.min(0,...mods.map(m=>m.value));
    }
  }
  function insufficient(s,c){
    const d=s.duel,b=unit(s,d.target);
    if(!enabled(s)||b.luck||d.luckUsed||d.defenseRolls.slice(0,-1).some(die=>typeof c.card(b).defense[6-die]==='number'))return;
    dispatch(s,{id:s.round+':insufficient',event:'INSUFFICIENT_DEFENSE',actor:b.uid,recipient:b.uid},c);
  }
  function after(s,c){
    if(!enabled(s))return;
    const d=s.duel,e=s.match.events.find(e=>e.round===s.round);if(!e)return;
    const emit=(event,extra)=>dispatch(s,{id:s.round+':'+event,event,...extra},c);
    if(e.support&&!e.refresh)emit('SUPPORT',{actor:e.attacker,recipient:e.recipient,trait:e.support});
    if(e.hold)emit('BLOCK',{actor:e.target});
    if(!e.support&&!e.kill)emit('SURVIVED',{actor:e.target,enemy:e.attacker});
    if(e.kill)emit('ALLIED_DEATH',{recipient:e.target,enemy:e.attacker});
    if(e.hold&&e.luck&&d.failedDefense?.attack>d.failedDefense?.defense)emit('CLOVER_SAVED',{actor:e.target});
    const ward=e.sources?.ward;
    if(ward&&e.hold&&!e.magic&&!e.dodge&&!e.shield&&e.attack>Math.max(0,e.defense-e.ward)&&ward.donor!==e.target)emit('WARD_SAVED',{actor:ward.donor,recipient:e.target});
    const heart=e.sources?.reraise;
    if(heart&&e.reraise&&heart.donor!==e.target)emit('RERAISE_USED',{actor:heart.donor,recipient:e.target});
    const power=e.sources?.buff;
    if(power?.kind==='physical'&&e.buff&&power.donor!==e.attacker)emit('POWER_USED',{actor:power.donor,recipient:e.attacker});
    for(const u of s.players.flatMap(p=>p.board.filter(Boolean))){
      const w=c.equipped(s,u,c.card(u));if(!is(w)||w.effect.event!=='UNINVOLVED')continue;
      const r=ensure(s,u,w);if(r.status!=='tracking')continue;
      if([e.attacker,e.target].includes(u.uid))r.progress=[];
      else emit('UNINVOLVED',{actor:u.uid});
    }
    for(const r of Object.values(state(s)?.records||{})){
      if(r.status==='ready'&&(r.targetUid&&!live(s,r.targetUid)||r.beneficiary&&!live(s,r.beneficiary))){r.status='lost';r.lostRound=s.round;visual(s,r,'spent');}
    }
  }
  function deployed(s,u,c){
    if(!enabled(s)||s.phase==='setup')return;
    init(s).deployments.push({round:s.round,uid:u.uid,rosters:s.players.map(p=>p.board.filter(Boolean).map(v=>v.uid))});
    for(const r of Object.values(state(s)?.records||{})){
      if(r.status!=='ready'||!r.waitingDeployment||r.sourceUid===u.uid||r.sourceUid[0]!==u.uid[0]||!live(s,r.sourceUid))continue;
      const w=source(s,r,c),a=w.effect.action;
      if(a.kind==='GRANT'){
        if(!a.traits.some(t=>!u[t]))continue;
        spend(s,r);delete r.waitingDeployment;r.beneficiary=u.uid;for(const t of a.traits)gift(s,r,u,t,c);
      }else {delete r.waitingDeployment;r.beneficiary=u.uid;visual(s,r,'ready',{recipient:u.uid});}
    }
    dispatch(s,{id:s.round+':deploy:'+u.uid,event:'DEPLOYED',recipient:u.uid},c);
  }
  function choice(s,c){
    const r=Object.values(state(s)?.records||{}).find(r=>r.status==='choice');if(!r)return null;
    const w=source(s,r,c),a=w.effect.action,mode=r.choice.mode;
    const options=mode==='parity'?[{value:'even',label:'Pair'},{value:'odd',label:'Impair'}]:mode==='trait'?a.traits.filter(t=>!unit(s,r.beneficiary)?.[t]).map(t=>({value:t,label:t==='mana'?'Potion magique':'Puissance physique',uid:r.beneficiary})):
      eligible(s,r,a).map(u=>({value:u.uid,uid:u.uid,label:c.card(u).name}));
    return {type:'ultimate',mode,sourceUid:r.sourceUid,weaponId:w.id,weapon:w,remaining:r.choice.remaining,targets:options.map(o=>o.uid).filter(Boolean),options};
  }
  function choose(s,value,c){
    const ch=choice(s,c);if(!ch||!ch.options.some(o=>o.value===value))fail();
    const r=record(s,ch.sourceUid),a=ch.weapon.effect.action;
    if(ch.mode==='parity'){spend(s,r);r.parity=value;r.predictedRound=s.round;return;}
    if(ch.mode==='trait'){spend(s,r);gift(s,r,unit(s,r.beneficiary),value,c);return;}
    if(a.kind==='DEBUFF'){r.status='ready';delete r.choice;r.targetUid=value;r.armedRound=s.round;visual(s,r,'mark',{targetUid:value});return;}
    const left=r.choice.remaining-1;r.selected.push(value);spend(s,r);
    for(const t of a.traits)gift(s,r,unit(s,value),t,c);
    if(left&&eligible(s,r,a).length){r.status='choice';r.choice={mode:'target',remaining:left};}
  }
  function validate(s,c){
    const x=state(s),grants=s.match?.ultimateGrants;
    if(!enabled(s)){if(x!==undefined||grants!==undefined||[s.duel,s.lastDuel].some(d=>d&&(d.ultimateEvents||d.ultimateModifiers||d.ultimateRosters||d.ultimateThreat||[d.formula,d.failedDefense].some(f=>f&&(f.ultimateAttack!==undefined||f.ultimateDefense!==undefined))))||s.match?.events.some(e=>e.ultimateRosters||e.ultimateThreat))fail();return;}
    const validBoards=rosters=>Array.isArray(rosters)&&rosters.length===2&&rosters.every((row,side)=>Array.isArray(row)&&row.length<=5&&new Set(row).size===row.length&&row.every(uid=>!!unit(s,uid)&&Number(uid[0])===side));
    for(const e of s.match?.events||[])if(!validBoards(e.ultimateRosters)||!e.ultimateRosters[Number(e.attacker[0])].includes(e.attacker)||!e.ultimateRosters[Number(e.target[0])].includes(e.target))fail();
    for(const d of [s.duel,s.lastDuel])if(d){
      if(!validBoards(d.ultimateRosters)||!Number.isInteger(d.round)||d.round<1||d.round>s.round)fail();
      const current=d.round===s.round&&!['replace','over'].includes(s.phase);
      if(current){
        const actual=s.players.map(p=>p.board.map(u=>u?.uid||null)),e=s.match.events.find(e=>e.round===s.round);
        if(e?.kill)actual[1-d.side][d.targetSlot]=d.target;
        if(JSON.stringify(actual.map(row=>row.filter(Boolean)))!==JSON.stringify(d.ultimateRosters))fail();
      }
      if(d.ultimateThreat!==undefined){
        const t=d.ultimateThreat;
        if(!keys(t,['weapon','element','faction','arenaAttack'])||!['weapon','element','faction','arenaAttack'].every(k=>Number.isInteger(t[k])&&Math.abs(t[k])<=100)||t.faction<0||t.faction>40||t.arenaAttack<0||t.arenaAttack>25)fail();
        if(c.threat){const expected=c.threat(d);if(['weapon','element','arenaAttack',...(current?['faction']:[])].some(k=>expected[k]!==t[k]))fail();}
        for(const f of [d.formula,d.failedDefense])if(f&&Object.keys(t).some(k=>t[k]!==f[k]))fail();
      }
    }
    if(x===undefined){if(grants?.length||[s.duel,s.lastDuel].some(d=>d?.ultimateModifiers?.length||[d?.formula,d?.failedDefense].some(f=>f&&(f.ultimateAttack!==undefined||f.ultimateDefense!==undefined))))fail();return;}
    if(!keys(x,['version','records','events','uses','deployments'])||x.version!==1||!object(x.records)||Object.keys(x.records).length>20||!Array.isArray(x.events)||x.events.length>240||!Array.isArray(x.uses)||x.uses.length>20||!Array.isArray(x.deployments)||x.deployments.length>20||s.phase==='setup'&&Object.keys(x.records).length)fail();
    const validRound=n=>Number.isInteger(n)&&n>=1&&n<=s.round;
    const validUid=uid=>!!unit(s,uid);
    const validRosters=rosters=>Array.isArray(rosters)&&rosters.length===2&&rosters.every((row,side)=>Array.isArray(row)&&row.length<=5&&new Set(row).size===row.length&&row.every(uid=>validUid(uid)&&Number(uid[0])===side));
    for(const dep of x.deployments)if(!keys(dep,['round','uid','rosters'])||!validRound(dep.round)||!validUid(dep.uid)||!validRosters(dep.rosters)||!dep.rosters[Number(dep.uid[0])].includes(dep.uid))fail();
    if(new Set(x.deployments.map(d=>d.uid)).size!==x.deployments.length)fail();
    const evidence=n=>s.match.events.find(e=>e.round===n)||(n===s.round?s.duel:null);
    const hasSupport=(r,p,w)=>{
      const e=evidence(p.round),k=w.effect.traits;
      return !!(e?.support&&!e.refresh&&e.attacker===r.sourceUid&&e.recipient===p.recipient&&(!k||k.includes(e.support))||
        grants?.some(g=>g.round===p.round&&g.sourceUid===r.sourceUid&&g.recipient===p.recipient&&(!k||k.includes(g.kind))));
    };
    const progressValid=(r,p,w)=>{
      const e=evidence(p.round),source=r.sourceUid,kind=w.effect.event;
      if(kind==='DEPLOYED'){
        const dep=x.deployments.find(v=>v.round===p.round&&v.uid===p.recipient),side=Number(source[0]);
        return p.id===p.round+':deploy:'+p.recipient&&dep&&dep.rosters[side].includes(source)&&p.recipient!==source&&p.recipient[0]===source[0]&&(!w.effect.when?.outnumbered||dep.rosters[side].length<dep.rosters[1-side].length);
      }
      if(!e||!e.ultimateRosters?.[Number(source[0])].includes(source))return false;
      const suffix={ATTACK:'attack',TARGETED:'targeted',ALLY_TARGETED:'allyTargeted',INSUFFICIENT_DEFENSE:'insufficient'}[kind]||kind;
      if(p.id!==p.round+':'+suffix&&!(kind==='SUPPORT'&&grants?.some(g=>'gift:'+g.id===p.id&&g.round===p.round&&g.sourceUid===source&&g.recipient===p.recipient)))return false;
      const roster=e.ultimateRosters,when=w.effect.when||{};
      if(when.outnumbered&&roster[Number(source[0])].length>=roster[1-Number(source[0])].length||when.activeAtMost&&roster[Number(source[0])].length>when.activeAtMost||when.magic!==undefined&&e.magic!==when.magic)return false;
      if(kind==='SUPPORT')return hasSupport(r,p,w)&&p.recipient!==source;
      if(kind==='BLOCK')return e.target===source&&e.hold;
      if(kind==='ALLIED_DEATH')return e.kill&&e.target===p.recipient&&p.recipient!==source&&p.recipient[0]===source[0];
      if(kind==='UNINVOLVED')return ![e.attacker,e.target].includes(source);
      if(kind==='SURVIVED')return e.target===source&&!e.support&&!e.kill;
      if(kind==='CLOVER_SAVED')return e.target===source&&e.luck&&e.hold;
      if(kind==='WARD_SAVED')return e.sources?.ward?.donor===source&&e.target===p.recipient&&e.hold&&!e.magic&&!e.dodge&&!e.shield&&e.attack>Math.max(0,e.defense-e.ward);
      if(kind==='RERAISE_USED')return e.sources?.reraise?.donor===source&&e.reraise&&e.target===p.recipient;
      if(kind==='POWER_USED')return e.sources?.buff?.donor===source&&e.sources.buff.kind==='physical'&&e.buff&&e.attacker===p.recipient;
      if(kind==='INSUFFICIENT_DEFENSE')return e.target===source&&!!(e.luck||e.luckUsed);
      const current=e===s.duel;
      if(current?typeof e.attackValue!=='number':e.support||!e.attackRolls)return false;
      if(when.elementPositive&&!(e.ultimateThreat?.element>0)||when.elementNegative&&!(e.ultimateThreat?.element<0))return false;
      return kind==='ATTACK'?e.attacker===source:kind==='TARGETED'?e.target===source:kind==='ALLY_TARGETED'&&e.target!==source&&e.target[0]===source[0];
    };
    for(const [uid,r] of Object.entries(x.records)){
      const u=unit(s,uid),w=u&&c.equipped(s,u,c.card(u));
      if(!is(w)||r.sourceUid!==uid||r.weaponId!==w.id||!keys(r,['sourceUid','weaponId','status','progress','seen','armedRound','spentRound','lostRound','targetUid','beneficiary','choice','selected','excludeUid','waitingDeployment','parity','predictedRound','coin'])||
        !['tracking','ready','choice','spent','lost'].includes(r.status)||!Array.isArray(r.progress)||r.progress.length>(w.effect.count||1)||!Array.isArray(r.seen)||r.seen.length>1000||new Set(r.seen).size!==r.seen.length||r.seen.some(id=>typeof id!=='string'||id.length>90)||
        r.progress.some(p=>!keys(p,['id','round','recipient'])||!r.seen.includes(p.id)||!validRound(p.round)||p.recipient!==undefined&&!validUid(p.recipient)||!progressValid(r,p,w))||new Set(r.progress.map(p=>p.id)).size!==r.progress.length)fail();
      if(w.effect.distinct&&new Set(r.progress.map(p=>p.recipient)).size!==r.progress.length||w.effect.event==='UNINVOLVED'&&r.progress.some((p,i)=>i&&p.round!==r.progress[i-1].round+1)||r.status!=='tracking'&&r.progress.length<(w.effect.count||1))fail();
      for(const key of ['armedRound','spentRound','lostRound','predictedRound'])if(r[key]!==undefined&&!validRound(r[key]))fail();
      if(r.status==='spent'&&!validRound(r.spentRound)||r.status==='lost'&&!validRound(r.lostRound)||r.status==='ready'&&!validRound(r.armedRound)||r.status==='choice'&&!keys(r.choice,['mode','remaining'])||r.status!=='choice'&&r.choice!==undefined)fail();
      if(r.spentRound!==undefined&&!['spent','choice'].includes(r.status))fail();
      if(r.choice&&(!['target','trait','parity'].includes(r.choice.mode)||![1,2].includes(r.choice.remaining)||!choiceForRecord(s,r,c).length))fail();
      if(r.targetUid!==undefined&&(!validUid(r.targetUid)||r.targetUid[0]===uid[0])||r.beneficiary!==undefined&&(!validUid(r.beneficiary)||r.beneficiary[0]!==uid[0])||r.excludeUid!==undefined&&(!validUid(r.excludeUid)||r.excludeUid[0]!==uid[0]))fail();
      if(r.selected!==undefined&&(!Array.isArray(r.selected)||r.selected.length>2||new Set(r.selected).size!==r.selected.length||r.selected.some(v=>!validUid(v)||v[0]!==uid[0]||v===uid)))fail();
      if(r.waitingDeployment!==undefined&&(r.waitingDeployment!==true||w.effect.action.target!=='nextAlly')||r.parity!==undefined&&(!['even','odd'].includes(r.parity)||w.effect.action.kind!=='PREDICT'||!validRound(r.predictedRound))||r.coin!==undefined&&(!['heads','tails'].includes(r.coin)||w.effect.action.kind!=='COIN'))fail();
    }
    const definition=e=>{const r=x.records[e?.sourceUid],w=r&&source(s,r,c);if(!r||!is(w)||e.weaponId!==w.id)fail();return w;};
    x.uses.forEach((m,i)=>{
      const w=definition(m),a=w.effect.action,r=x.records[m.sourceUid];
      if(!keys(m,['id','round','weaponId','sourceUid','recipient','stat','value'])||m.id!=='m'+i||!validRound(m.round)||!validUid(m.recipient)||!['ATK','DEF'].includes(m.stat)||!Number.isInteger(m.value)||!m.value||Math.abs(m.value)>(a.value||0)||r.spentRound!==m.round||!['ARM','BONUS','MITIGATE','COIN','PREDICT','DEBUFF'].includes(a.kind))fail();
      if(a.kind==='DEBUFF'||a.kind==='MITIGATE'&&a.direction==='advantage'){if(m.value>=0||m.stat!=='ATK'||m.recipient[0]===m.sourceUid[0])fail();}
      else if(m.value<=0||m.recipient[0]!==m.sourceUid[0])fail();
      if(a.kind!=='MITIGATE'&&Math.abs(m.value)!==a.value||a.kind==='COIN'&&r.coin!=='heads'||a.kind==='PREDICT'&&r.predictedRound!==m.round)fail();
      const ev=evidence(m.round);if(!ev||m.recipient!==(m.stat==='ATK'?ev.attacker:ev.target)||ev.support)fail();
      if(a.kind==='ARM'&&(r.armedRound>=m.round&&w.effect.event!=='ATTACK'||r.beneficiary&&r.beneficiary!==m.recipient||r.targetUid&&r.targetUid!==(m.stat==='ATK'?ev.target:ev.attacker)))fail();
      if(a.kind==='DEBUFF'&&r.targetUid!==m.recipient)fail();
      if(a.kind==='MITIGATE'){
        const t=ev.ultimateThreat;if(!t)fail();
        const expected=Math.min(a.value,a.components.reduce((n,k)=>n+Math.max(0,(t[k]||0)*(a.direction==='penalty'?-1:1)),0));
        if(Math.abs(m.value)!==expected)fail();
      }
      if(x.uses.some((n,j)=>j<i&&n.sourceUid===m.sourceUid))fail();
    });
    if(grants!==undefined){
      if(!Array.isArray(grants)||grants.length>80)fail();
      grants.forEach((g,i)=>{
        const w=definition(g),a=w.effect.action,r=x.records[g.sourceUid];
        if(!keys(g,['id','round','weaponId','sourceUid','recipient','kind'])||g.id!=='g'+i||!validRound(g.round)||!validUid(g.recipient)||g.recipient[0]!==g.sourceUid[0]||!traits.includes(g.kind)||!(a.kind==='GRANT'&&a.traits.includes(g.kind)||a.kind==='COIN'&&r.coin==='tails'&&g.kind==='ward')||r.spentRound!==g.round)fail();
        if(grants.some((h,j)=>j<i&&h.sourceUid===g.sourceUid&&h.recipient===g.recipient&&h.kind===g.kind))fail();
        if(a.target==='self'&&g.recipient!==g.sourceUid||a.target==='chooseAllies'&&(g.recipient===g.sourceUid||g.recipient===r.excludeUid||!r.selected?.includes(g.recipient))||a.target==='recipient'&&!r.progress.some(p=>p.recipient===g.recipient)||a.kind==='COIN'&&g.recipient!==g.sourceUid)fail();
        if(a.target==='nextAlly'&&(g.recipient!==r.beneficiary||!x.deployments.some(d=>d.round===g.round&&d.uid===g.recipient&&d.rosters[Number(g.sourceUid[0])].includes(g.sourceUid))))fail();
        const own=grants.filter(h=>h.sourceUid===g.sourceUid),maximum=a.kind==='COIN'?1:a.traits.length*(a.target==='selfAndAlly'?2:a.max||1);
        if(own.length>maximum)fail();
      });
    }
    x.events.forEach((ev,i)=>{
      definition(ev);if(ev.id!=='u'+i||!validRound(ev.round)||!['ready','grant','bonus','mark','spent'].includes(ev.kind)||!keys(ev,['id','round','kind','weaponId','sourceUid','recipient','targetUid','trait','stat','value']))fail();
      if(ev.kind==='grant'&&!grants?.some(g=>g.round===ev.round&&g.sourceUid===ev.sourceUid&&g.recipient===ev.recipient&&g.kind===ev.trait)||ev.kind==='bonus'&&!x.uses.some(m=>m.round===ev.round&&m.sourceUid===ev.sourceUid&&m.recipient===ev.recipient&&m.stat===ev.stat&&m.value===ev.value))fail();
      if(ev.targetUid!==undefined&&(!validUid(ev.targetUid)||ev.targetUid[0]===ev.sourceUid[0])||ev.recipient!==undefined&&!validUid(ev.recipient))fail();
    });
    for(const d of [s.duel,s.lastDuel])if(d){
      for(const [key,ledger] of [['ultimateEvents',x.events],['ultimateModifiers',x.uses]])if(d[key]!==undefined){
        if(!Array.isArray(d[key])||d[key].length>60||new Set(d[key].map(e=>e.id)).size!==d[key].length||d[key].some(e=>!ledger.some(t=>JSON.stringify(t)===JSON.stringify(e))||e.round!==d.round))fail();
      }
      for(const f of [d.formula,d.failedDefense])if(f){const expected={};totals(d,expected);for(const key of ['ultimateAttack','ultimateDefense'])if((f[key]||0)!==(expected[key]||0)||f[key]!==undefined&&!Number.isInteger(f[key]))fail();}
    }
  }
  function choiceForRecord(s,r,c){
    const a=source(s,r,c).effect.action;
    return r.choice.mode==='parity'?['even','odd']:r.choice.mode==='trait'?a.traits.filter(t=>!unit(s,r.beneficiary)?.[t]):eligible(s,r,a);
  }
  return {is,validateEffect,view,lock,accepted,numeric,insufficient,after,deployed,choice,choose,validate,totals};
});
