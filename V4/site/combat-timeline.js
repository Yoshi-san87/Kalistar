(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./turn-order.js'):root.KalistarTurnOrder);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarCombatTimeline=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Order){
  'use strict';
  function sequence(state){
    if(state.phase==='setup'||state.phase==='initiative')return [];
    let round=0,previous=null;
    return Array.from({length:200},(_,index)=>{
      const turn=index+1,side=state.initiative?Order.sideAt(state.initiative,turn):state.turn^((turn-state.round)&1);
      if(side!==previous)round++;
      previous=side;return {turn,round,side};
    });
  }
  function position(state,turn=state.round){return sequence(state)[Math.min(200,Math.max(1,turn))-1]||null;}
  function windowStart(current,count){return Math.max(1,Math.min(current-Math.floor(count/2),201-count));}
  function view(state){
    if(['setup','initiative','over'].includes(state.phase))return [];
    const all=sequence(state),current=state.round,start=windowStart(current,11),phoneStart=windowStart(current,5);
    const steps=all.slice(start-1,start+10).map(step=>({...step,past:step.turn<current,current:step.turn===current,
      resolved:step.turn===current&&state.phase==='result',phone:step.turn>=phoneStart&&step.turn<phoneStart+5}));
    // A clipped round keeps its own heading at the first visible station.
    for(const scope of ['desktop','phone']){
      const visible=steps.filter(step=>scope==='desktop'||step.phone);
      for(let i=0;i<visible.length;i++){
        const step=visible[i],first=i===0||visible[i-1].round!==step.round;
        step[scope+'Lead']=first;
        if(first)step[scope+'Span']=visible.filter(next=>next.round===step.round).length;
      }
    }
    return steps;
  }
  return Object.freeze({position,view});
});
