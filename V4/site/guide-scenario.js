(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./engine.js'):root.KalistarEngine);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarGuideScenario=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Engine){
  'use strict';
  const formations=[['30000007','30000018','30000001','30000005','30000012'],['30000011','30000010','30000008','30000040','30000006']];
  const reserves=[['30000013','30000002','30000021','30000034','30000003'],['30000019','30000004','30000009','30000039','30000041']];
  const chapters=[
    ['formation','Les dix compagnons','Formation, capitaine et initiative'],
    ['block','Le premier duel','Attaquant, cible, jets et Block'],
    ['kill','Ouvrir une brèche','Élimination et remplacement'],
    ['kalistel','Une seconde chance','Éclat partagé et résultat obligatoire'],
    ['magic','Le cristal et la barrière','Attaque magique et calcul détaillé'],
    ['equipment','Les deux six','Arme ATK, protection DEF'],
    ['guard','Tenir la ligne','Garde physique et consommation'],
    ['clover','Un peu de chance','Trèfle et seconde défense'],
    ['mana','Préparer la magie','Potion et attaque magique'],
    ['physical','Prêter sa force','Puissance et attaque physique'],
    ['heart','Refuser la mort','Cœur, Mort et Reraise'],
    ['dodge','Hors de portée','Esquive et faces de relance'],
    ['momo','Les petits bonheurs','Relique de Momo en infériorité'],
    ['captain','Les liens du capitaine','Faction, race et commandement'],
    ['arena','Le terrain compte','Affinité du lieu et limites'],
    ['materia','La dernière fleur','Don d’Aeris et choix du bénéficiaire'],
    ['pod','La cible du Pod','Riposte de 2B, cible et consommation'],
    ['finale','La dernière ligne','Fin de rencontre et palmarès']
  ].map(([id,title,subtitle])=>Object.freeze({id,title,subtitle}));
  function create(data){
    const E=Engine.createEngine(data);
    function base(first=0,variant=''){
      const teams=formations.map((f,side)=>({name:side?'Les Sentinelles':'Les Compagnons',cards:[...f,...reserves[side]],formation:f.slice(),captain:f[0],equipment:{weapon:side?{}:{balmhyr:'fallen-king-axe',momo:'little-joys-flute'},shield:side?{}:{balmhyr:'durane-rampart'},relic:side?{}:{momo:'little-joys-box'}}}));
      if(variant==='materia'||variant==='pod'){
        const slot=variant==='materia'?4:1,id=variant==='materia'?'48210516':'45911726';
        teams[0].cards[slot]=id;teams[0].formation[slot]=id;
        teams[0].equipment.relic[variant==='materia'?'aeris-ff7':'2b-nier']=variant==='materia'?'white-materia':'pod-042';
      }
      const s=E.newGame(...teams,{mode:'local',seed:'KALISTAR-GUIDE',turnOrder:'ABBA',arenaId:variant==='arena'?'electro':'ruins'});
      E.rollInitiative(s,first===0?[5,2]:[2,5]);return s;
    }
    const unit=(s,side,slot)=>s.players[side].board[slot];
    const targets=s=>s.players[s.turn].board.flatMap((a,i)=>a?s.players[1-s.turn].board.flatMap((b,j)=>b?[[i,j]]:[]):[]);
    function invoke(s,op){
      if(op.method.startsWith('grant'))return E[op.method](s,unit(s,op.side,op.slot).uid);
      return E[op.method](s,...(op.args||[]));
    }
    function duel(s,a,b,atk,def){
      E.lock(s,a,b);E.rollAttack(s,atk);if(s.phase==='kalistel')E.acceptAttack(s);
      for(const d of def)if(s.phase==='defense')E.rollDefense(s,d);
      if(s.phase!=='result')throw Error('Exercice non résolu : '+s.phase);
    }
    function advance(s){E.next(s);while(s.phase==='replace')E.autoDeploy(s,s.replacing);}
    // Prelude exchanges use legal engine actions, never injected traits or deaths.
    function safe(s){
      for(const [a,b] of targets(s))for(let x=1;x<=6;x++)for(let y=6;y>=1;y--){
        const trial=E.clone(s);try{duel(trial,a,b,x,[y]);}catch{continue;}
        if(trial.match.events.at(-1)?.hold&&!trial.match.events.at(-1)?.luck&&!E.equipmentChoice(trial)){duel(s,a,b,x,[y]);return;}
      }
      throw Error('Aucun échange de préparation sûr.');
    }
    function toSide(s,side){while(s.turn!==side){safe(s);advance(s);}}
    function killSlot(s,side,slot){
      toSide(s,side);
      for(const [a,b] of targets(s).filter(pair=>pair[1]===slot))for(let x=6;x>=1;x--)for(let y=1;y<=6;y++){
        const trial=E.clone(s);try{duel(trial,a,b,x,[y]);}catch{continue;}
        if(trial.match.events.at(-1)?.kill&&!E.equipmentChoice(trial)){duel(s,a,b,x,[y]);return;}
      }
      throw Error('Élimination préparatoire impossible.');
    }
    function lesson(id){
      const meta=chapters.find(c=>c.id===id);if(!meta)throw Error('Chapitre inconnu.');
      let s=base(),ops=[],intro='',conclusion='';
      const add=(method,args,text,extra={})=>ops.push({method,args,text,...extra});
      const engage=(a,b,text)=>add('lock',[a,b],text,{select:true});
      const attack=(die,text)=>add('rollAttack',[die],text);
      const accept=text=>add('acceptAttack',[],text);
      const defend=(die,text)=>add('rollDefense',[die],text);
      const grant=(method,side,slot,text)=>add(method,[],text,{side,slot,select:true});
      if(id==='formation'){
        s=base();s=E.newGame(...s.composition.teams,{mode:'local',seed:'KALISTAR-GUIDE',turnOrder:'ABBA',arenaId:'ruins'});
        intro='Dix cartes distinctes : cinq titulaires, cinq réservistes. Chaque poste doit être couvert au moins deux fois. Balmhyr et Nazar sont capitaines ; une seule Rainbow par équipe.';
        add('rollInitiative',[[3,3]],'Lance les dés des capitaines. En cas d’égalité, les deux relancent.');
        add('rollInitiative',[[5,2]],'Relance : le plus grand jet ouvre la rencontre.');
        conclusion='Les Compagnons ouvrent. Puis les Sentinelles jouent deux actions, les Compagnons deux, et ainsi de suite. Une défense ou un remplacement ne fait pas avancer cette séquence.';
      }else if(id==='block'){
        intro='Un seul duel à la fois. Choisis Balmhyr puis Nazar. Pour cet entraînement, les faces des dés sont préparées ; les profils et calculs sont ceux du jeu.';
        engage(0,0,'Choisis Balmhyr, puis Nazar comme cible.');attack(3,'Lance l’ATK : un 3 est préparé.');accept('Garde ce jet, sans dépenser d’éclat.');defend(6,'Lance la DEF : Nazar obtient son 6.');
        conclusion='La défense tient si son total atteint ou dépasse l’ATK. Une égalité est également un Block. Le résultat reste consultable avant Tour suivant.';
      }else if(id==='kill'){
        intro='Lok ouvre une brèche dans la ligne de Zviri. Seule une élimination définitive marque un kill.';
        engage(1,1,'Choisis Lok puis Zviri.');attack(6,'Lance le 6 ATK de Lok.');accept('Conserve le jet.');defend(1,'Zviri obtient son 1 DEF.');add('next',[],'Passe au tour suivant : une place devient disponible.');add('autoDeploy',[1],'Fais entrer le réserviste compatible.');
        conclusion='Darnako prend le poste libéré. Une réserve est commune, mais chaque remplaçant doit être compatible avec le poste. Les cartes vivantes ne changent pas de place.';
      }else if(id==='kalistel'){
        intro='Deux éclats par équipe, pas deux par carte. Une relance garde les mêmes participants et impose le second résultat, même moins bon.';
        engage(1,0,'Choisis Lok puis Nazar.');attack(6,'Lok obtient un 6. Pour comprendre le risque, relance-le.');add('useKalistel',[1],'Dépense un éclat : le nouveau jet est un 1.');defend(6,'Résous la défense.');
        conclusion='Le 6 abandonné n’a produit aucun effet. Le 1 est obligatoire. Il reste un éclat aux Compagnons ; les Sentinelles ont encore leurs deux charges.';
      }else if(id==='magic'){
        intro='Malinia attaque par magie. La barrière de Soryn ne vaut pas de la DEF : elle réduit une ATK magique de 30 sur cette face.';
        engage(3,3,'Choisis Malinia puis Soryn.');attack(4,'Lance le 4 magique de Malinia.');accept('Garde le jet.');defend(4,'Soryn défend avec sa face barrière 4.');
        conclusion='Le récapitulatif sépare arme imprimée, cristal, faction, terrain et barrière. La barrière ne réduit jamais une attaque physique ; la garde physique est un autre effet.';
      }else if(id==='equipment'){
        intro='La Hache du Roi Déchu et le Rempart de Durane sont équipés sur Balmhyr. Au repos ils sont visibles, mais ne donnent rien. Leur bonus n’arrive que sur un 6 numérique conservé.';
        engage(0,0,'Choisis Balmhyr puis Nazar.');attack(6,'Balmhyr obtient un 6 ; le bonus n’est pas encore engagé.');accept('Conserve le 6 : la Hache ajoute réellement +30 ATK.');defend(6,'Résous la première défense.');add('next',[],'Les Sentinelles jouent.');engage(1,0,'Choisis Zviri puis Balmhyr.');attack(5,'Zviri obtient une attaque numérique.');accept('Garde ce jet.');defend(6,'Balmhyr obtient un 6 DEF : le Rempart ajoute +30 DEF.');
        conclusion='Le type Hache imprimé reste celui des matchups. La protection contribue même si le duel devait être perdu ; sans son activation, un Block garde son animation habituelle.';
      }else if(id==='guard'){
        intro='Un soutien est une action entière. Balmhyr peut préparer une garde pour Lok ; elle attend une vraie défense numérique physique.';
        engage(0,1,'Choisis Balmhyr puis Zviri.');attack(2,'La face 2 de Balmhyr donne Garde, pas un score ATK.');accept('Conserve la face de soutien.');grant('grantGuard',0,1,'Choisis Lok : il reçoit une garde de +60.');add('next',[],'Passe à l’action adverse.');engage(1,1,'Choisis Zviri puis Lok.');attack(2,'Lance une attaque physique.');accept('Garde le jet.');defend(3,'Lok défend : la garde entre dans le total.');
        conclusion='La garde est consommée une fois. Elle reste valable pour les relances du même duel, mais la magie, l’esquive et Mort ne la consomment pas. Deux gardes ne se cumulent pas.';
      }else if(id==='clover'){
        intro='Momo donne de la chance à Lok. Le trèfle attend une défense numérique insuffisante ; il ne s’use pas sur un Block ni contre Mort.';
        engage(2,1,'Choisis Momo puis Zviri.');attack(4,'Le 4 ATK de Momo est un trèfle.');accept('Garde ce soutien.');grant('grantClover',0,1,'Donne le trèfle à Lok.');add('next',[],'Passe à l’action adverse.');engage(1,1,'Choisis Zviri puis Lok.');attack(2,'Lance une attaque physique.');accept('Garde le jet.');defend(1,'Lok obtient une défense faible : son trèfle est consommé.');defend(6,'Effectue la seconde défense automatique.');
        conclusion='Une seule chance supplémentaire. Le deuxième calcul est le résultat final ; les statistiques ne comptent pas deux duels. Les traits de catégories différentes peuvent coexister.';
      }else if(id==='mana'){
        intro='La potion de Momo attend la prochaine attaque numérique magique de son bénéficiaire. Un soutien ou une attaque physique ne la dépense pas.';
        engage(2,0,'Choisis Momo puis Nazar.');attack(2,'Le 2 de Momo donne une potion.');accept('Garde le soutien.');grant('grantPotion',0,3,'Donne la potion à Malinia.');add('next',[],'Observe les deux actions suivantes des Sentinelles.');
        conclusion='La potion donnera +60 à Malinia sur son prochain jet magique conservé. L’exercice suivant permet d’en voir l’utilisation réelle.';
        // Keep the practice interactive without making the learner play unrelated filler.
        add('continueMagic',[],'Rejoins la prochaine action de Malinia.');engage(3,0,'Choisis Malinia puis Nazar.');attack(5,'Lance une attaque magique.');accept('Conserve le jet : la potion est maintenant consommée.');defend(6,'Résous la défense.');
      }else if(id==='physical'){
        // Taulio enters legally after Balmhyr falls, retaining the common reserve rule.
        s=base(1);killSlot(s,1,0);advance(s);toSide(s,0);
        intro='Balmhyr est tombé pendant la préparation ; Taulio a pris sa place. Son soutien physique prépare Lok.';
        engage(0,0,'Choisis Taulio puis Nazar.');attack(1,'Le 1 de Taulio donne une puissance physique.');accept('Garde la face de soutien.');grant('grantPhysical',0,1,'Donne la puissance à Lok.');add('continuePhysical',[],'Rejoins la prochaine action des Compagnons.');engage(1,0,'Choisis Lok puis Nazar.');attack(5,'Lance une attaque physique de Lok.');accept('Garde le jet : +60 physique, charge consommée.');defend(6,'Résous la défense.');
        conclusion='Potion et puissance sont deux charges distinctes : +60 magique ou +60 physique, jamais les deux sur une même attaque. Les relances abandonnées ne les consomment pas.';
      }else if(id==='heart'){
        intro='Kaylis confie un cœur à Lok. Zviri possède une face Mort : elle ignore les scores, mais pas l’Esquive ni le Reraise.';
        engage(4,1,'Choisis Kaylis puis Zviri.');attack(1,'Kaylis obtient Reraise.');accept('Conserve le soutien.');grant('grantReraise',0,1,'Donne le cœur à Lok.');add('next',[],'Passe à l’action adverse.');engage(1,1,'Choisis Zviri puis Lok.');attack(4,'Zviri obtient Mort.');accept('Garde cette face spéciale.');defend(5,'Lok défend ; son cœur le sauve malgré Mort.');
        conclusion='Lok reste à sa place et le cœur disparaît. Aucun kill, aucun remplacement. Le Reraise n’empile pas de cœurs ; il peut sauver une seule fois par charge.';
      }else if(id==='dodge'){
        intro='Une face spéciale n’est jamais un zéro numérique. Zviri peut esquiver ; Momo possède aussi une face DEF Relance.';
        engage(1,1,'Choisis Lok puis Zviri.');attack(6,'Lance une attaque forte.');accept('Garde le jet.');defend(6,'Zviri obtient Esquive : l’attaque est annulée.');add('next',[],'Passe à l’action adverse.');engage(1,2,'Choisis Zviri puis Momo.');attack(5,'Lance une attaque numérique.');accept('Garde le jet.');defend(4,'Momo obtient Relance en DEF : un nouveau jet est nécessaire.');defend(6,'Relance immédiatement la DEF.');
        conclusion='Esquive annule même Mort. Une face DEF Relance se relance immédiatement sans éclat et sans trèfle. Le duel ne se termine qu’une fois sa défense résolue.';
      }else if(id==='momo'){
        s=base(1);killSlot(s,1,0);advance(s);killSlot(s,1,0);advance(s);toSide(s,1);
        intro='Les deux combattants du poste de Tank sont tombés. Les Compagnons sont quatre contre cinq. Momo porte la Boîte des Petits Bonheurs, une relique distincte de sa Flûte.';
        engage(1,2,'Choisis Zviri puis Momo comme cible.');attack(5,'Lance une attaque numérique hostile.');accept('Garde le jet : la Boîte offre ses trèfles avant la défense.');defend(6,'Résous la défense de Momo.');
        conclusion='Les autres alliés actifs sans trèfle reçoivent une charge. Momo et la réserve sont exclus ; les trèfles existants ne sont pas rafraîchis. Une activation par match, seulement si un destinataire existe.';
      }else if(id==='captain'){
        intro='Balmhyr et Lok partagent Durane et Nain. Le capitaine ajoute +10 ATK à sa faction et +10 DEF à sa race tant qu’un autre allié actif partage ce lien.';
        engage(1,0,'Choisis Lok puis Nazar.');attack(5,'Lance l’ATK de Lok.');accept('Garde ce jet.');defend(6,'Affiche le calcul et le commandement de Balmhyr.');
        conclusion='La faction compte en ATK, la race en DEF : 1 à 5 alliés donnent +0, +10, +20, +30, +40. Le capitaine ajoute un seul +10 par lien. Réserve et morts ne comptent pas ; sa mort définitive retire le commandement.';
      }else if(id==='arena'){
        s=base(0,'arena');intro='Le lieu est choisi avant le match et ne change plus. Dans la décharge de Chroma, Momo reçoit +15 ATK pour son cristal Electro, plus +10 ATK / +10 DEF pour son affinité personnelle.';
        engage(2,0,'Choisis Momo puis Nazar.');attack(5,'Lance une attaque magique de Momo.');accept('Garde le jet.');defend(6,'Observe la contribution du terrain.');
        conclusion='Le terrain est commun aux deux camps. Son maximum est +25 ATK / +10 DEF ; il modifie les scores numériques, jamais Mort, Esquive ou une face de soutien.';
      }else if(id==='materia'){
        s=base(1,'materia');killSlot(s,1,0);advance(s);killSlot(s,1,0);advance(s);toSide(s,1);
        intro='Aeris remplace Kaylis dans cet exercice. Elle porte la Materia blanche. Son équipe est en infériorité avant le duel ; sa disparition définitive peut transmettre un cœur.';
        engage(1,4,'Choisis Zviri puis Aeris.');attack(4,'Zviri obtient Mort.');accept('Garde le jet.');defend(1,'Aeris n’a pas de cœur : son élimination est définitive.');grant('grantEquipment',0,1,'Choisis Lok comme bénéficiaire de la Materia.');
        conclusion='La Materia ne ressuscite pas Aeris : elle donne un Reraise à un autre allié actif sans cœur. Ce choix doit être fait avant Tour suivant. Une activation par match ; un Reraise qui aurait sauvé Aeris empêche ce déclenchement.';
      }else if(id==='pod'){
        s=base(1,'pod');intro='2B prend la place de Lok et porte le Pod 042. Survivre à une attaque numérique possédant un avantage d’arme, cristal, faction ou terrain prépare une riposte contre son auteur précis.';
        engage(1,1,'Choisis Zviri puis 2B.');attack(2,'Lance une attaque avec avantage de cristal.');accept('Garde ce jet.');defend(6,'2B survit et son Pod mémorise Zviri.');add('next',[],'Les Compagnons jouent.');engage(1,1,'Choisis 2B puis la même Zviri.');attack(3,'Lance une attaque numérique contre la cible mémorisée.');accept('Conserve le jet : le Pod ajoute +60 ATK.');defend(5,'Résous la riposte.');
        conclusion='La riposte est consommée même si la cible esquive. Un autre adversaire, Mort, un soutien ou un jet abandonné ne la consomme pas. La mort définitive de la cible invalide le marquage ; son remplaçant ne l’hérite jamais.';
      }else if(id==='finale'){
        s=base();let guard=0;
        while(guard++<200){
          let resolved=false;
          for(const [a,b] of targets(s)){
            for(let x=6;x>=1&&!resolved;x--)for(let y=1;y<=6&&!resolved;y++){
              const t=E.clone(s);try{duel(t,a,b,x,[y]);}catch{continue;}
              if(t.match.events.at(-1)?.kill&&!E.equipmentChoice(t)){s=t;resolved=true;}
            }
            if(resolved)break;
          }
          if(!resolved)safe(s);
          const n=E.clone(s);advance(n);if(n.phase==='over')break;s=n;
        }
        if(s.phase!=='result')throw Error('Fin de guide impossible.');
        intro='La rencontre préparée arrive à son dernier résultat. Le journal conserve toutes les actions réellement résolues, soutiens compris.';
        add('next',[],'Termine ce dernier duel et ouvre le bilan.');
        conclusion='Un Reraise ne marque pas de kill. Le moteur termine aussi si un camp n’a plus de combattant actif après recherche des remplaçants compatibles : des réservistes incompatibles peuvent rester. À 200 échanges, c’est un nul de démonstration. Le palmarès découle des événements réels ; les médailles de kills sont honorifiques.';
      }
      E.assertState(s);return {meta,state:s,ops,intro,conclusion};
    }
    function perform(s,op){
      if(op.method==='continueMagic'){toSide(s,0);return s;}
      if(op.method==='continuePhysical'){advance(s);toSide(s,0);return s;}
      invoke(s,op);E.assertState(s);return s;
    }
    return {E,lesson,perform,formations,reserves};
  }
  return {create,chapters};
});
