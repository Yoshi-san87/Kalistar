'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),qa=path.join(__dirname,'qa');
const report=JSON.parse(fs.readFileSync(path.join(qa,'publication.json'),'utf8'));
assert(report.passed&&report.tests===753);
for(const name of ['positions','composition','identities','navigation','sleeves','shell','statistics','detail','pages','prompts','desktop','lineup']){
  const check=JSON.parse(fs.readFileSync(path.join(qa,name,'passed.json'),'utf8'));
  assert(check.passed&&check.tree===report.tree,name+' must verify this build');
}
assert(JSON.parse(fs.readFileSync(path.join(qa,'stage.json'),'utf8')).passed);
const files=fs.globSync('**/*',{cwd:qa}).filter(f=>fs.statSync(path.join(qa,f)).isFile()&&(/(?:^|[/\\])(?:passed|results|results-built|summary|publication|snapshot|samples|stage)\.json$/.test(f)||/(?:^|[/\\])(?:run|tests-\d+|build)\.txt$/.test(f)));
const images=['positions/desktop-deck.png','positions/short-desktop-deck.png','positions/razr-deck.png','positions/desktop-arena.png','positions/razr-arena.png','positions/desktop-detail.png','positions/razr-detail.png','positions/desktop-report.png','positions/razr-report.png','navigation/desktop-decks.png','navigation/short-window-decks.png','navigation/razr50-decks.png','navigation/landscape-decks.png','sleeves/collection-1440x1000.png','sleeves/collection-razr-touch.png','sleeves/collection-320x568.png','statistics/desktop-unchanged.png','statistics/razr-open.png','composition/weapons-412.png','desktop/desktop-p1.png','desktop/mobile-412-p5.png','lineup/normal/razr-p1-weapon.jpg','lineup/normal/razr-tipoff.jpg','lineup/rotation/razr-p5-reveal.jpg','pages/arena-desktop.png','pages/arena-phone.png','prompts/razr-choose.png'];
for(const file of images)assert(fs.existsSync(path.join(qa,file)),file);
const selected=[...new Set([...files,...images])].map(f=>path.relative(root,path.join(qa,f)).replaceAll('\\','/'));
execFileSync('git',['add','--',...selected],{cwd:root,stdio:'inherit'});
console.log('Saved '+files.length+' result/log records and '+images.length+' representative captures.');
