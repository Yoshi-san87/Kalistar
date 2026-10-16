(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarJourneyDefinitions=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const revision='journeys-1',copy=value=>JSON.parse(JSON.stringify(value));
  const base=['30000007','30000002','30000021','30000001','30000012','30000013','30000018','30000008','30000023','30000006'];
  const replace=(deck,changes)=>deck.map(id=>changes[id]||id);
  const first=(deck,id)=>[id,...deck.filter(value=>value!==id)];
  const definitions=[
    {id:'momo-petits-bonheurs',title:'Pour ceux que l\u2019on oublie',subtitle:'Momo',characterId:'momo',rewardModelId:'30000001',element:'ELECTRO',stages:[
      {id:'rebuts',title:'Une lumi\u00e8re dans la ferraille',imageModelId:'30000001',arenaId:'electro',captain:'30000001',deck:base,outro:['La m\u00e9lodie ne demande pas de r\u00e9ponse. Elle laisse simplement une place \u00e0 ceux que personne ne regarde.']},
      {id:'passage',title:'Le passage gard\u00e9',imageModelId:'30000013',arenaId:'electro',captain:'30000013',deck:first(base,'30000013'),outro:['Sous la cuirasse caboss\u00e9e, la loyaut\u00e9 n\u2019a pas disparu. Prot\u00e9ger les oubli\u00e9s donne encore un sens au passage.']},
      {id:'carillons',title:'Le bal des objets perdus',imageModelId:'30000014',arenaId:'electro',captain:'30000014',deck:replace(base,{'30000001':'30000014'}),outro:['Personne n\u2019applaudit. Pourtant, cette nuit ne ressemble plus tout \u00e0 fait aux autres.']},
      {id:'rester',title:'Pour ceux qui restent',imageModelId:'40243854',arenaId:'electro',captain:'40243854',deck:replace(base,{'30000001':'30000005','30000012':'40243854'}),outro:['La fl\u00fbte peut se taire. Rester pr\u00e8s des autres est encore une fa\u00e7on de ne pas les oublier.']}
    ]},
    {id:'balmhyr-retour',title:'Le poids du retour',subtitle:'Balmhyr',characterId:'balmhyr',rewardModelId:'49900802',element:'MINERO',stages:[
      {id:'horizon',title:'Un royaume \u00e0 l\u2019horizon',imageModelId:'30000007',arenaId:'minero',captain:'30000007',deck:base,outro:['L\u2019horizon demeure. Un roi peut perdre son tr\u00f4ne sans perdre toute sa force de guide.']},
      {id:'durane',title:'Les chemins de Durane',imageModelId:'30000018',arenaId:'minero',captain:'30000013',deck:first(base,'30000013'),outro:['Le chemin ne retire rien au poids du retour. Il lui donne seulement une direction.']},
      {id:'guide',title:'La patience du guide',imageModelId:'30000007',arenaId:'minero',captain:'30000007',deck:first(base,'30000007'),outro:['Ceux qui croisent son regard n\u2019y cherchent pas seulement un roi. Ils y trouvent encore un guide.']},
      {id:'portes',title:'Derri\u00e8re les portes',imageModelId:'49900802',arenaId:'trone-fer',captain:'49900802',deck:first(replace(base,{'30000007':'30000024','30000018':'49900802'}),'49900802'),outro:['Le fer a un poids que ses mains connaissent. Celui du retour ne se mesure pas de la m\u00eame mani\u00e8re.']}
    ]},
    {id:'kaylis-prochain-pas',title:'Choisir son prochain pas',subtitle:'Kaylis',characterId:'kaylis',rewardModelId:'49055457',element:'RAINBOW',stages:[
      {id:'breche',title:'La premi\u00e8re br\u00e8che',imageModelId:'30000012',arenaId:'z13',captain:'30000012',deck:base,outro:['La peur est encore l\u00e0. Elle n\u2019occupe plus toute la place.']},
      {id:'couleurs',title:'L\u2019\u00e9lan des couleurs',imageModelId:'49055457',arenaId:'minero',captain:'49055457',deck:first(replace(base,{'30000012':'49055457','30000018':'30000003'}),'49055457'),outro:['L\u2019\u00e9lan n\u2019est plus seulement quelque chose qui l\u2019emporte. Il peut devenir un mouvement choisi.']},
      {id:'ligne',title:'Une ligne nette',imageModelId:'49055457',arenaId:'rainbow',captain:'49055457',deck:first(replace(base,{'30000012':'49055457','30000018':'30000003'}),'49055457'),outro:['Les couleurs courent sur ses bras. La lame dessine une ligne nette, et la fuite ne choisit plus le chemin.']},
      {id:'seuil',title:'Le prochain pas',imageModelId:'49902701',arenaId:'trone-fer',captain:'49902701',deck:first(replace(base,{'30000012':'49902701','30000018':'30000003'}),'49902701'),outro:['Le risque ne s\u2019efface pas au seuil. Avancer demeure son choix.']}
    ]}
  ];
  function catalogue(data){
    const byId=new Map(data.cards.map(c=>[c.id,c]));
    return definitions.map(book=>({...copy(book),revision,stages:book.stages.map(stage=>({...copy(stage),intro:[byId.get(stage.imageModelId)?.text||'']}))}));
  }
  function validate(data,engine,Team){
    const books=catalogue(data);
    for(const book of books){
      if(book.stages.length!==4)throw Error('Chaque livre doit comporter exactement quatre combats.');
      if(!engine.byId[book.rewardModelId]||engine.byId[book.rewardModelId].characterId!==book.characterId)throw Error('Recompense de parcours inconnue.');
      for(const stage of book.stages){
        if(!engine.byId[stage.imageModelId]||!data.arenas.some(a=>a.id===stage.arenaId))throw Error('Illustration ou arene de parcours inconnue.');
        const team=Team.fromPreset({name:book.subtitle,cards:stage.deck});
        const errors=engine.validateComposition(team);if(errors.length)throw Error('Composition de parcours invalide : '+book.id+'/'+stage.id+' '+errors.join(' '));
        if(!team.formation.includes(stage.captain))throw Error('Capitaine de parcours absent : '+book.id+'/'+stage.id);
      }
    }
    return books;
  }
  return {revision,catalogue,validate};
});
