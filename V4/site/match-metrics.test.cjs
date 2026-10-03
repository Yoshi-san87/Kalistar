'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const T=require('./trophies.js'),window={},context={window,KalistarTrophies:T};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'match-metrics.js'),'utf8'),context);
test('combat kill medals replace only the number to the right of the skull, with the exact count accessible',()=>{
  for(let kills=0;kills<=12;kills++){
    const html=window.KalistarMatchMetrics.strip({uid:'0-1',kills,attack:172,defense:291});
    const dd=html.match(/<dd aria-label="Kills : [^"]*">([\s\S]*?)<\/dd>/)[1];
    assert(html.includes('data-lucide="skull"'));
    assert(html.includes('aria-label="Kills : '+kills+'"'));
    if(kills<2)assert.equal(dd,String(kills));
    else {assert.equal(dd,T.medal(kills));assert.equal((html.match(/class="kill-medal"/g)||[]).length,1);}
    assert(html.includes('<dd aria-label="ATK cumul')&&html.includes('>172</dd>'));
  }
  const partial=window.KalistarMatchMetrics.strip({uid:'0-1',kills:3},{partial:true,fromRound:7});
  assert(!partial.includes('class="kill-medal"'));assert(partial.includes('<dd aria-label="Kills : 3">3</dd>'));
  assert.equal(window.KalistarMatchMetrics.strip(null),'');
});
