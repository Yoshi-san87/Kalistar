(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./equipment.js'):root.KalistarEquipment);if(node)module.exports=api;else root.KalistarJourneyDefinitions=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Equipment){
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
  // These encounters evoke each character's trials, not new canonical alliances.
  const sequels={
    'momo-petits-bonheurs':{
      bonusReveal:{title:'Ce qui r\u00e9pond encore',paragraphs:[
        'La nuit pourrait finir ici, aupr\u00e8s des visages \u00e9teints. Pourtant, lorsque Momo se rel\u00e8ve, quelque chose tinte sous son pied. Pas une r\u00e9ponse. Un morceau assez petit pour tenir dans sa main, et une raison de ne pas la refermer tout de suite.'
      ]},
      bonusStages:[
        {id:'souffle',title:'La note qui manque',imageModelId:'30000014',arenaId:'electro',captain:'30000013',
          deck:['30000013','49900313','49800201','49902604','44263045','49900710','30000040','49900314','49900702','49901402'],
          rewardEquipmentId:'little-joys-flute',rewardKind:'weapon',
          intro:[
            'Momo ramasse une petite lame de cuivre au pied des robots immobiles. Elle a d\u00fb appartenir \u00e0 un carillon ; son bord porte encore une trace de peinture claire. Il la pose sur une caisse, loin de la poussi\u00e8re, puis reprend sa fl\u00fbte. La premi\u00e8re note se perd dans le grincement des t\u00f4les. Il essaie plus fort. Le son devient aigu, presque impatient, et Momo s\u2019interrompt. Ce n\u2019est pas ainsi qu\u2019il voulait revenir aupr\u00e8s d\u2019eux.',
            'Au passage, Taulio tient sa place. Sa cuirasse laisse \u00e0 peine entrer la lumi\u00e8re des ateliers. Derri\u00e8re lui, les silhouettes et les charges se croisent sans ralentir ; un bruit en chasse un autre, et les objets fragiles glissent vers les bords. Momo regarde la caisse. Pour reprendre la petite lame, il faudra traverser ce mouvement, accepter les chocs, trouver un espace qui ne soit pas d\u00e9j\u00e0 pris.',
            'Il pourrait attendre une nuit plus calme. Mais la caisse sera peut-\u00eatre renvers\u00e9e avant l\u2019aube. Momo approche de nouveau l\u2019instrument de son visage. Cette fois, il n\u2019essaie pas de couvrir la ville. Il cherche seulement une note assez nette pour ne pas la perdre lui-m\u00eame, puis avance avec elle.'
          ],
          outro:[
            'La caisse a chang\u00e9 de place, mais la petite lame n\u2019est pas tomb\u00e9e. Momo la retrouve entre deux rainures du bois. Il la soul\u00e8ve avec pr\u00e9caution et attend que ses mains cessent de trembler. Autour de lui, les machines continuent leur travail. Rien ne s\u2019est arr\u00eat\u00e9 pour son passage ; il lui suffit pourtant de pouvoir entendre \u00e0 nouveau le frottement discret du cuivre contre ses doigts.',
            'La Fl\u00fbte des Petits Bonheurs repose contre son bras. Il en essuie les marques avec un coin de tissu, puis joue sans chercher la note qu\u2019il avait manqu\u00e9e. Une phrase plus simple vient \u00e0 sa place. Les grincements n\u2019ont pas disparu, mais ils semblent moins serr\u00e9s autour de lui. Momo laisse entre deux sons le temps qu\u2019il faut pour regarder les visages. Aucun ne lui doit un sourire.',
            'Quand il range la fl\u00fbte, il garde le cuivre dans sa paume. Au-del\u00e0 des piles de ferraille, une passerelle m\u00e8ne vers les ateliers o\u00f9 l\u2019on sait encore r\u00e9parer les petites choses. Son plancher remue sous les rafales. Momo v\u00e9rifie que le morceau ne peut plus glisser, puis se dirige vers les sangles suspendues \u00e0 l\u2019entr\u00e9e du passage.'
          ]},
        {id:'coutures',title:'Ce qui tient dans une couture',imageModelId:'30000001',arenaId:'electro',captain:'49900313',
          deck:['49900313','49902608','30000002','49900314','44263045','49900312','49900710','30000015','49901402','49983331'],
          rewardEquipmentId:'kalistar-chroma-harness',rewardKind:'shield',
          intro:[
            'Les sangles pendent sous un auvent trop court. Momo choisit un harnais dont une boucle n\u2019a pas la m\u00eame couleur que les autres. Il suit du doigt les coutures : certaines sont droites, d\u2019autres reprennent un ancien trou pour ne pas fragiliser le cuir. Dans les ateliers de Chroma, m\u00eame les pi\u00e8ces mises au rebut peuvent revenir \u00e0 leur place. Il reconna\u00eet cette patience sans savoir \u00e0 qui appartenaient les mains.',
            'Il passe une premi\u00e8re sangle, puis la retire. En serrant ainsi, il ne pourrait plus lever sa fl\u00fbte. Le cuivre attend dans une poche ferm\u00e9e ; l\u2019instrument, lui, doit rester libre. Momo recommence plus lentement. Sur la passerelle, la lumi\u00e8re de Nerval oscille avec le vent. Plus loin, les silhouettes se rapprochent et les planches r\u00e9sonnent sous des pas qui ne sont pas les siens.',
            'Momo voudrait d\u00e9j\u00e0 \u00eatre de l\u2019autre c\u00f4t\u00e9. Il imagine une table, de petits outils, le tintement rendu au carillon. La traction soudaine du harnais le ram\u00e8ne \u00e0 la rampe. Avant de sauver un son, il faut apprendre \u00e0 porter ce qui l\u2019emp\u00eachera de tomber. Il \u00e9prouve chaque attache, laisse du jeu \u00e0 son bras et s\u2019engage.'
          ],
          outro:[
            'Au bout de la passerelle, Momo s\u2019assied avant de d\u00e9faire les sangles. Une couture a p\u00e2li sous la traction ; elle n\u2019a pas c\u00e9d\u00e9. Il la regarde longtemps. Le Harnais des Passerelles ne lui ressemble pas : il est lourd, fait de morceaux in\u00e9gaux, plus large que n\u00e9cessaire \u00e0 certains endroits. Pourtant, quelqu\u2019un a pris soin d\u2019un passage que cette personne n\u2019emprunterait peut-\u00eatre jamais avec lui.',
            'Momo replace la boucle d\u00e9pareill\u00e9e dans son logement. Il ne veut pas rendre le harnais avec une pi\u00e8ce pr\u00eate \u00e0 l\u00e2cher pour le suivant. Du c\u00f4t\u00e9 des ateliers, une porte reste ouverte. Il pose sur la table la lame de cuivre, puis les quelques rouages qu\u2019il gardait depuis d\u2019autres promenades. Aucun ne para\u00eet venir du m\u00eame objet. Cela l\u2019inqui\u00e8te moins maintenant qu\u2019il a travers\u00e9 gr\u00e2ce \u00e0 des sangles assembl\u00e9es de la m\u00eame fa\u00e7on.',
            'Il sort enfin sa fl\u00fbte. Quelques notes suffisent pour essayer le son du cuivre ; le petit morceau r\u00e9pond de travers. Momo penche la t\u00eate, recommence, puis rapproche les rouages. Il ne cherche plus \u00e0 retrouver un carillon entier. Une bo\u00eete assez modeste pour tenir pr\u00e8s de quelqu\u2019un lui semble d\u00e9sormais une bonne taille.'
          ]},
        {id:'boite',title:'Un air pour la place vide',imageModelId:'40243854',arenaId:'electro',captain:'49901402',
          deck:['49901402','30000013','49900602','49902604','49900603','49902702','49902610','30000034','49900601','49900713'],
          rewardEquipmentId:'little-joys-box',rewardKind:'relic',
          intro:[
            'La bo\u00eete joue trois notes, accroche la quatri\u00e8me et s\u2019arr\u00eate. Momo soul\u00e8ve le couvercle. Il a pos\u00e9 la lame de cuivre trop pr\u00e8s d\u2019un rouage ; le m\u00e9tal en porte une rayure neuve. Il pourrait la remplacer. Il n\u2019a pourtant pas travers\u00e9 la passerelle pour jeter la premi\u00e8re pi\u00e8ce qui r\u00e9siste. Il d\u00e9place le rouage, reprend l\u2019\u00e9cart et \u00e9coute le silence avant de tourner encore la petite manivelle.',
            'Dehors, les bruits se font plus rares. Momo pense aux robots pr\u00e8s desquels il est rest\u00e9 sans jouer. Il ne veut pas leur apporter une machine qui promettrait de r\u00e9parer leur silence. La fl\u00fbte ne l\u2019a jamais fait. Mais quelqu\u2019un, pr\u00e8s d\u2019eux, pourrait avoir besoin d\u2019entendre autre chose que le vent. Il referme la bo\u00eete avant d\u2019avoir trouv\u00e9 une m\u00e9lodie parfaitement droite.',
            'Sur le retour, le harnais frotte contre son \u00e9paule. Momo serre la bo\u00eete quand les pr\u00e9sences autour de lui se resserrent \u00e0 leur tour. Il reste moins d\u2019espace, moins de voix auxquelles r\u00e9pondre. Son premier mouvement serait de garder ce qu\u2019il porte \u00e0 l\u2019abri, pour lui seul. Il ouvre pourtant les doigts : le couvercle doit encore pouvoir se lever.'
          ],
          outro:[
            'La quatri\u00e8me note accroche toujours. Elle ne bloque plus la suivante. Momo laisse la Bo\u00eete des Petits Bonheurs achever son air, puis attend sans remonter aussit\u00f4t le m\u00e9canisme. Le silence revenu n\u2019est pas un \u00e9chec \u00e0 corriger. Pr\u00e8s de lui, les visages \u00e9teints n\u2019ont pas chang\u00e9, et il ne leur invente pas une r\u00e9ponse pour se consoler. Il pose seulement la bo\u00eete de fa\u00e7on que quelqu\u2019un d\u2019autre puisse l\u2019entendre.',
            'La petite lame trouv\u00e9e sous son pied vibre parmi des pi\u00e8ces qui ne se connaissaient pas. Momo reconna\u00eet sa note, l\u00e9g\u00e8rement de travers, au milieu des autres. Il pense \u00e0 la boucle d\u2019une autre couleur, \u00e0 la couture blanchie, \u00e0 la place laiss\u00e9e par Taulio dans le passage. Il n\u2019a fabriqu\u00e9 aucune de ces attentions. Il a pu les recevoir, puis continuer avec ce qu\u2019elles lui permettaient de porter.',
            'Lorsque l\u2019air repart, Momo n\u2019accompagne pas tout de suite la bo\u00eete. Sa fl\u00fbte reste sur ses genoux, le harnais contre la caisse. Il \u00e9coute jusqu\u2019au bout. Puis il ajoute une seule note, assez basse pour que le petit m\u00e9canisme garde sa voix. Cette nuit, il n\u2019a pas besoin d\u2019occuper toute la place pour rester aupr\u00e8s des autres.'
          ]}
      ]
    },
    'balmhyr-retour':{
      bonusReveal:{title:'Avant que les portes s\u2019ouvrent',paragraphs:[
        'Le Conseil est toujours derri\u00e8re les portes. Balmhyr pose sa main gant\u00e9e sur le bois du banc. Le fer, la pierre et l\u2019empreinte d\u2019un sceau ne lui donneront pas les mots qu\u2019il cherche ; il lui reste \u00e0 d\u00e9cider comment les porter.'
      ]},
      bonusStages:[
        {id:'serment',title:'Une main qui peut s\u2019ouvrir',imageModelId:'49900802',arenaId:'minero',captain:'49900306',
          deck:['49900306','49900308','49900307','49900705','49900906','49902605','49902613','30000040','49902603','49900711'],
          rewardEquipmentId:'mythic-iron-gauntlet',rewardKind:'weapon',
          intro:[
            'Balmhyr fl\u00e9chit les doigts dans le gant que Madania lui a gard\u00e9. Une articulation r\u00e9siste, puis c\u00e8de avec un bruit bref. Il conna\u00eet ce bruit mieux que celui de ses propres pas dans les couloirs de Durane. Le fer a travers\u00e9 les ann\u00e9es sans lui demander d\u2019explication. Les portes, elles, demeurent closes. Il n\u2019attend pas d\u2019un objet fid\u00e8le qu\u2019il lui \u00e9pargne ce qu\u2019il faudra dire aux vivants.',
            'Il desserre une courroie et recommence le mouvement. Fermer le poing est facile ; le rouvrir sans laisser le m\u00e9tal d\u00e9cider de sa main demande davantage d\u2019attention. Dans les chemins de son retour, il a souvent suffi d\u2019un passage \u00e9troit pour que les autres attendent son geste. Il aurait pu prendre cette attente pour une ob\u00e9issance. Il y a surtout reconnu la fatigue de ceux qui n\u2019avaient plus beaucoup de routes.',
            'Le gant porte maintenant son nom de Serment de Fer. Balmhyr ne prononce aucun v\u0153u nouveau. Il pense \u00e0 une \u00e9paule que sa main doit pouvoir soutenir, \u00e0 une porte qu\u2019elle doit retenir sans l\u2019arracher. Devant la r\u00e9sistance qui l\u2019attend, il l\u00e8ve le bras. Il voudrait retrouver sa force sans lui abandonner toute la r\u00e9ponse.'
          ],
          outro:[
            'La paume s\u2019ouvre. Balmhyr y laisse entrer un peu d\u2019air avant de refermer les doigts, un \u00e0 un. Le choc a r\u00e9veill\u00e9 une douleur ancienne, l\u00e0 o\u00f9 le cuir frotte sous le m\u00e9tal. Il ajuste la courroie au lieu de la serrer davantage. Ce soin minuscule l\u2019occupe plus honn\u00eatement que l\u2019image du roi in\u00e9branlable qu\u2019il aurait pu offrir au couloir.',
            'Madania a gard\u00e9 le gant ; elle ne lui a pas rendu les ann\u00e9es. Balmhyr \u00e9prouve une gratitude qui ne sait pas encore trouver sa phrase. Le Serment de Fer p\u00e8se toujours autant lorsqu\u2019il repose sur son genou. Pourtant, sa main n\u2019y cherche plus seulement le moyen de r\u00e9pondre au prochain coup. Il se rappelle avoir montr\u00e9 une prise, attendu qu\u2019un \u00e9l\u00e8ve recommence, retir\u00e9 ses doigts lorsque l\u2019autre avait trouv\u00e9 son \u00e9quilibre.',
            'Il se l\u00e8ve et ramasse le bouclier appuy\u00e9 pr\u00e8s du banc. Les marteaux crois\u00e9s portent des marques qu\u2019aucun polissage ne ferait dispara\u00eetre sans emporter un peu de pierre. Balmhyr passe l\u2019avant-bras dans la sangle. La main de fer peut rester ouverte derri\u00e8re le Rempart de Durane. Il lui faut maintenant apprendre \u00e0 tenir sans fermer le passage \u00e0 ceux qui marchent apr\u00e8s lui.'
          ]},
        {id:'rempart',title:'La largeur d\u2019un passage',imageModelId:'49900802',arenaId:'minero',captain:'30000024',
          deck:['30000024','49900306','49900307','49900906','49900704','49902613','30000034','49900713','49902603','49902605'],
          rewardEquipmentId:'durane-rampart',rewardKind:'shield',
          intro:[
            'Le bord du Rempart de Durane fr\u00f4le la pierre du couloir. Balmhyr le redresse aussit\u00f4t. Un bouclier qui barre toute la largeur ne prot\u00e8ge pas ceux qui doivent passer ; il devient une porte de plus. Il recule le pied, tourne l\u2019\u00e9paule et retrouve la place n\u00e9cessaire. Dans la rainure int\u00e9rieure, le Kalistel gris accroche la lumi\u00e8re. Les marteaux crois\u00e9s restent tourn\u00e9s vers ce qui approche.',
            'On raconte que les portes de Durane furent taill\u00e9es dans la m\u00eame pierre. Balmhyr ne cherche pas \u00e0 \u00e9prouver cette histoire. Il conna\u00eet assez les portes pour savoir que leur solidit\u00e9 n\u2019explique jamais tout : certaines gardent le froid dehors, d\u2019autres retiennent ceux qui voudraient sortir. La diff\u00e9rence tient parfois \u00e0 la personne qui demeure pr\u00e8s du verrou, et \u00e0 ce qu\u2019elle accepte d\u2019entendre.',
            'Il sent le poids du gant contre la poign\u00e9e. L\u2019effort du premier passage est encore dans son bras ; il n\u2019en fera pas un pr\u00e9texte pour demander aux autres de se h\u00e2ter. La r\u00e9sistance devant lui semble occuper toute la galerie. Balmhyr abaisse son centre de gravit\u00e9, garde un espace derri\u00e8re son \u00e9paule et attend le choc. Il mesure moins la distance qu\u2019il peut gagner que celle qu\u2019il doit laisser libre.'
          ],
          outro:[
            'Le choc a gliss\u00e9 le long du bouclier. Balmhyr ne poursuit pas aussit\u00f4t le mouvement ; il regarde derri\u00e8re son \u00e9paule. Le passage est encore libre. Il garde cette position le temps de reprendre son souffle, puis redresse lentement le Rempart de Durane. La pierre lui a transmis toute la force re\u00e7ue. Elle ne lui a pas appris \u00e0 qui la rendre.',
            'Il essuie la poussi\u00e8re sur les marteaux crois\u00e9s. Un homme qui le regarderait de loin pourrait croire qu\u2019il retrouve une ancienne posture de souverain. Balmhyr pense plut\u00f4t au bras fatigu\u00e9, \u00e0 la jambe qui h\u00e9site avant une marche, au temps n\u00e9cessaire pour se relever sans \u00eatre tir\u00e9 brutalement. Il a longtemps su attendre devant un horizon. Ici, l\u2019attente a la largeur d\u2019un corps et la dur\u00e9e d\u2019un souffle.',
            'Quand il revient pr\u00e8s du banc, il pose le bouclier de biais afin qu\u2019il ne g\u00eane personne. Son gant retombe contre sa cuisse ; un objet plus petit p\u00e8se dans sa poche. Il le sort avec la main nue. Le sceau est \u00e9br\u00e9ch\u00e9 sur un bord. Balmhyr en suit l\u2019empreinte du pouce, sans cire ni document devant lui, puis s\u2019assied pour comprendre ce qu\u2019il peut encore en faire.'
          ]},
        {id:'empreinte',title:'Sans cire ni d\u00e9cret',imageModelId:'30000007',arenaId:'trone-fer',captain:'49900306',
          deck:['49900306','49900308','49900705','30000018','49900906','49902605','30000034','49902613','49902603','49900711'],
          rewardEquipmentId:'exiled-king-seal',rewardKind:'relic',
          intro:[
            'Le Sceau du Roi sans Tr\u00f4ne tient dans une main, mais Balmhyr ne le trouve pas l\u00e9ger. Il tourne l\u2019empreinte vers la lumi\u00e8re. L\u2019\u00e9br\u00e9chure interrompt un trait autrefois net. Ce manque ne rendrait pas une parole plus juste ; une empreinte parfaite ne l\u2019aurait pas garantie non plus. Il referme les doigts sans presser. Dans le couloir, personne n\u2019attend qu\u2019il marque une feuille pour poursuivre son chemin.',
            'Il repense \u00e0 la place gard\u00e9e derri\u00e8re le bouclier. Tenir un choc n\u2019avait servi que parce que d\u2019autres pouvaient encore bouger. Le fer aurait pu rester dress\u00e9 au milieu du passage, admirable et inutile. Balmhyr pose le sceau sur son genou et regarde ses deux mains. L\u2019une porte le gant conserv\u00e9 par Madania ; l\u2019autre peut donner un objet sans commander de le recevoir.',
            'Les voix paraissent lointaines derri\u00e8re les portes. Ce qui l\u2019attend pourrait lui faire oublier les visages du couloir, r\u00e9duire chaque pr\u00e9sence \u00e0 un soutien ou \u00e0 un obstacle. Il conna\u00eet cette tentation. Avant de se relever, il garde un instant le sceau visible dans sa paume. Il veut pouvoir traverser l\u2019\u00e9preuve sans transformer ceux qui restent pr\u00e8s de lui en sujets d\u2019un royaume qu\u2019il n\u2019a pas retrouv\u00e9.'
          ],
          outro:[
            'Balmhyr retient le mouvement qui lui ferait ranger aussit\u00f4t le sceau. Apr\u00e8s la r\u00e9sistance du passage, ses doigts voudraient se fermer sur quelque chose de certain. Il les ouvre au contraire. Une main proche peut sentir un instant le poids de l\u2019empreinte, puis le lui rendre. Ce geste ne fonde aucune promesse d\u2019ob\u00e9issance. Balmhyr n\u2019en demande pas davantage ; il sait ce qu\u2019un simple poids peut dire lorsque les paroles se pressent trop.',
            'Le Serment de Fer, le Rempart de Durane et le sceau ne forment pas une couronne retrouv\u00e9e. Le gant garde la trace de son effort ; le bouclier porte la poussi\u00e8re du couloir ; l\u2019empreinte demeure incompl\u00e8te. Il remet chaque objet \u00e0 sa place avec une attention presque domestique. Il aurait reconnu cette fa\u00e7on de v\u00e9rifier une courroie chez Madania, et cette pens\u00e9e lui permet enfin de respirer plus librement.',
            'Au bout du couloir, les portes sont toujours ferm\u00e9es. Aucun des gestes accomplis ne d\u00e9cide de ce qui se dira derri\u00e8re elles. Balmhyr se tient pr\u00eat, la main moins crisp\u00e9e. Quand quelqu\u2019un passe pr\u00e8s de lui, il se d\u00e9cale pour laisser assez d\u2019espace. Il peut commencer par cela, avant m\u00eame qu\u2019on lui donne la parole.'
          ]}
      ]
    },
    'kaylis-prochain-pas':{
      bonusReveal:{title:'Ce qu\u2019elle emporte',paragraphs:[
        'Kaylis n\u2019a pas encore quitt\u00e9 le seuil. Sa main v\u00e9rifie la garde de Promesse, puis descend vers une attache. Partir demande parfois ces quelques gestes que personne ne remarque : une prise reprise, une botte ajust\u00e9e, un morceau de tissu qui cesse de g\u00eaner le mouvement.'
      ]},
      bonusStages:[
        {id:'promesse',title:'La place de ses doigts',imageModelId:'49055457',arenaId:'minero',captain:'30000007',
          deck:['30000007','30000022','49900307','49900705','30000021','49900906','30000023','49902613','49902603','49902605'],
          rewardEquipmentId:'white-oath-rapier',rewardKind:'weapon',
          intro:[
            'Promesse ne bouge pas encore, mais Kaylis serre d\u00e9j\u00e0 trop fort sa poign\u00e9e. Elle s\u2019en aper\u00e7oit au blanc de ses jointures et rel\u00e2che un doigt, puis un autre. Au seuil de la maison de Madania, ce petit effort la ram\u00e8ne \u00e0 la pierre sur laquelle Balmhyr lui avait appris \u00e0 guider son \u00e9lan. La lame pouvait para\u00eetre l\u00e9g\u00e8re ; cela ne suffisait pas \u00e0 lui donner une bonne prise.',
            'Elle retrouve le souvenir de son poignet trop bas, de la pointe cherchant la terre, de l\u2019espace laiss\u00e9 devant elle lorsqu\u2019une correction \u00e9tait termin\u00e9e. Balmhyr ne pouvait pas choisir \u00e0 sa place le mouvement suivant. Le pr\u00e9sent qu\u2019il lui avait fait gardait cette m\u00eame limite. La rapi\u00e8re blanche n\u2019\u00e9tait ni un ordre de devenir courageuse, ni une dette \u00e0 rembourser par une victoire.',
            'Kaylis \u00e9carte le tissu qui fr\u00f4le son bras et l\u00e8ve la garde. Les couleurs sur sa peau ne lui disent pas comment r\u00e9ussir. Elle doit encore regarder, attendre et accepter de ne pas atteindre tout de suite la distance qu\u2019elle voudrait. Face \u00e0 la r\u00e9sistance, elle cherche la ligne apprise sans copier la main qui la lui a montr\u00e9e. Son prochain geste doit pouvoir rester le sien.'
          ],
          outro:[
            'La pointe s\u2019arr\u00eate \u00e0 l\u2019endroit choisi. Kaylis la regarde avant de baisser le bras. Elle n\u2019a pas besoin de pr\u00e9tendre que le mouvement fut facile : son poignet tire, et la derni\u00e8re avanc\u00e9e l\u2019a laiss\u00e9e trop pr\u00e8s de son appui. Elle reprend sa place, sans attendre une remarque. Ce retour lui appartient autant que la ligne nette dessin\u00e9e par la lame.',
            'Elle passe un tissu sur Promesse. Le m\u00e9tal blanc lui rappelle une main tendue, mais cette pens\u00e9e ne lui impose plus d\u2019\u00eatre \u00e0 la hauteur de quelqu\u2019un \u00e0 chaque instant. Balmhyr lui a montr\u00e9 comment tenir ; elle apprend aussi quand desserrer. Les couleurs glissent sur ses bras pendant qu\u2019elle v\u00e9rifie la garde. Elle les laisse passer sans en faire une explication de tout ce qu\u2019elle vient de r\u00e9ussir.',
            'Lorsqu\u2019elle remet la rapi\u00e8re \u00e0 sa place, sa botte accroche l\u00e9g\u00e8rement le bord du seuil. Kaylis baisse les yeux. Elle avait surveill\u00e9 sa main au point d\u2019oublier la mani\u00e8re dont son pied arrivait. Le cuir brun porte la poussi\u00e8re de ses essais. Elle s\u2019accroupit, reprend l\u2019ajustement autour de sa cheville et fait une place, dans son attention, \u00e0 ce qui la porte.'
          ]},
        {id:'appuis',title:'La poussi\u00e8re sur le cuir',imageModelId:'49055457',arenaId:'geo',captain:'30000019',
          deck:['30000019','30000011','49902614','30000002','49900704','30000021','49902613','30000023','49900911','49900711'],
          rewardEquipmentId:'kaylis-next-step-boots',rewardKind:'shield',
          intro:[
            'Kaylis ajuste ses bottes brunes sans chercher \u00e0 leur enlever toute la poussi\u00e8re. Un pli du cuir la g\u00eane lorsqu\u2019elle fl\u00e9chit le pied. Elle le redresse, se rel\u00e8ve, essaie encore. Au seuil, le sol ne demande rien d\u2019extraordinaire ; c\u2019est pr\u00e9cis\u00e9ment l\u00e0 qu\u2019elle peut entendre ce d\u00e9tail au lieu de l\u2019oublier jusqu\u2019\u00e0 la douleur. Promesse repose contre sa hanche, assez pr\u00e8s pour \u00eatre saisie, assez loin pour laisser avancer la jambe.',
            'Sur la pierre soulev\u00e9e pendant l\u2019entra\u00eenement, elle regardait d\u2019abord o\u00f9 aller. Ses pieds devaient suivre. Ils lui avaient appris le contraire \u00e0 chaque d\u00e9s\u00e9quilibre : choisir une direction ne dispensait pas de sentir l\u2019endroit quitt\u00e9. Kaylis retrouve la lenteur de ces essais, le poids d\u00e9plac\u00e9 trop t\u00f4t, le genou qui cherchait encore \u00e0 retenir une course d\u00e9j\u00e0 commenc\u00e9e.',
            'Elle pose maintenant le talon sans se pr\u00e9cipiter vers la pointe. La r\u00e9sistance devant elle semble pouvoir la repousser d\u2019un seul mouvement. Kaylis ne veut pas confondre tenir et se raidir. Les Bottes du Prochain Pas ne marcheront pas pour elle ; le cuir lui donne seulement un appui qu\u2019elle doit apprendre \u00e0 sentir. Elle plie l\u00e9g\u00e8rement les jambes et attend, pr\u00eate \u00e0 c\u00e9der de la place sans abandonner sa direction.'
          ],
          outro:[
            'Kaylis recule d\u2019un pas et demeure debout. Elle aurait autrefois compt\u00e9 ce recul comme une faute avant m\u00eame de regarder la suite. Cette fois, elle sent le sol sous ses deux pieds. Le cuir a accompagn\u00e9 le mouvement ; le pli qui blessait sa cheville ne tire plus. Elle reprend sa respiration et laisse son poids revenir l\u00e0 o\u00f9 elle peut le porter.',
            'La poussi\u00e8re dessine une ligne plus claire sur le c\u00f4t\u00e9 d\u2019une botte. Kaylis l\u2019effleure du pouce sans l\u2019effacer. Ce n\u2019est pas la marque d\u2019un voyage d\u00e9j\u00e0 accompli, seulement celle d\u2019un appui retrouv\u00e9. Elle se rel\u00e8ve plus doucement qu\u2019elle ne s\u2019\u00e9tait accroupie. Promesse ne heurte pas sa jambe. Sa main, son \u00e9paule et ses pieds cessent un instant de lui demander trois efforts s\u00e9par\u00e9s.',
            'Un pan de tissu bleu nuit flotte \u00e0 sa taille. Les motifs dor\u00e9s prennent un reflet diff\u00e9rent lorsque la lumi\u00e8re de ses bras les atteint. Kaylis le retient avant qu\u2019il vienne se coincer pr\u00e8s de la garde. Elle reconna\u00eet ce tissu qui l\u2019accompagnait pendant les exercices. Il reste \u00e0 l\u2019attacher sans l\u2019immobiliser tout entier, comme elle vient d\u2019apprendre \u00e0 tenir sur ses pieds sans se figer.'
          ]},
        {id:'ruban',title:'L\u2019\u00e9lan qui revient',imageModelId:'49902701',arenaId:'rainbow',captain:'30000022',
          deck:['30000022','49900308','49900705','49900307','49900906','49902702','30000023','49902613','49902603','49902605'],
          rewardEquipmentId:'kaylis-colours-ribbon',rewardKind:'relic',
          intro:[
            'Kaylis reprend un morceau du tissu bleu nuit qui flotte \u00e0 sa taille. Les motifs dor\u00e9s suivent un pli ancien ; elle les remet \u00e0 plat avant de nouer le lien. Elle veut que le ruban reste pr\u00e8s d\u2019elle sans g\u00eaner la rapi\u00e8re. Un premier n\u0153ud serre trop. Elle le d\u00e9fait avec patience, recommence et garde assez de souplesse pour passer un doigt sous le tissu.',
            'La lumi\u00e8re de ses tatouages pose des reflets changeants sur l\u2019or. Le ruban ne lui r\u00e9v\u00e8le rien. Il porte seulement, dans ses plis, la couleur de ce qui se passe sur ses bras. Kaylis y reconna\u00eet un d\u00e9tail des heures d\u2019apprentissage, lorsque tout son effort tenait parfois dans un geste \u00e0 recommencer. Elle n\u2019\u00e9tait pas devenue s\u00fbre d\u2019elle ; elle avait appris \u00e0 revenir apr\u00e8s s\u2019\u00eatre interrompue.',
            'Il reste devant elle une r\u00e9sistance plus difficile \u00e0 mesurer que la distance d\u2019une pointe. Quand les appuis se rar\u00e9fient autour d\u2019elle et qu\u2019un choc la trouve, Kaylis sent combien il serait facile de ne plus penser qu\u2019\u00e0 le subir encore. Elle touche le n\u0153ud, puis lib\u00e8re sa main. Rester debout ne sera qu\u2019un commencement. Il faudra retrouver assez d\u2019\u00e9lan pour choisir aussi ce qu\u2019elle fera apr\u00e8s.'
          ],
          outro:[
            'Le choc est pass\u00e9. Kaylis ne cherche pas \u00e0 se convaincre qu\u2019il ne lui a rien co\u00fbt\u00e9. Elle sent sa fatigue, le cuir sous ses pieds, la poign\u00e9e de Promesse revenue dans sa main. Il y a moins de pr\u00e9sences autour d\u2019elle qu\u2019elle ne le voudrait. Elle prend le temps d\u2019un souffle avant de relever les yeux. Elle peut encore d\u00e9cider d\u2019un mouvement, m\u00eame si rien ne lui promet qu\u2019il sera facile.',
            'Le Ruban des Couleurs accompagne le d\u00e9placement de sa taille. Un reflet traverse le motif dor\u00e9, puis se perd dans le bleu nuit. Kaylis ne le retient pas. Le n\u0153ud tient sans tirer ; elle peut avancer le bras librement. Ce modeste lien ne lui pr\u00eate pas une autre histoire. Il lui rappelle la patience de ses propres doigts, capables de d\u00e9faire ce qui g\u00eane et de recommencer sans tout arracher.',
            'Au seuil de la maison de Madania, les objets ont repris leur place. Promesse attend contre sa hanche, les bottes brunes reposent sur la pierre, le tissu suit le l\u00e9ger courant d\u2019air. La Tour de Fer demeure devant elle, sans r\u00e9ponse offerte d\u2019avance. Kaylis v\u00e9rifie une derni\u00e8re fois qu\u2019elle peut bouger, puis avance. Cette fois, son attention accompagne le pas jusqu\u2019au bout.'
          ]}
      ]
    }
  };
  function catalogue(data){
    const byId=new Map(data.cards.map(c=>[c.id,c]));
    return definitions.map(book=>({...copy(book),...copy(sequels[book.id]),revision,stages:book.stages.map(stage=>({...copy(stage),intro:[byId.get(stage.imageModelId)?.text||'']}))}));
  }
  // Accept a catalogue book; the validated runtime view is already flattened.
  function combatStages(book){return book.stages.concat(book.bonusStages||[]);}
  function validate(data,engine,Team){
    const books=catalogue(data);
    for(const book of books){
      if(book.stages.length!==4)throw Error('Chaque livre doit comporter exactement quatre combats.');
      if(book.bonusStages.length!==3)throw Error('Chaque livre doit comporter exactement trois combats bonus.');
      if(!engine.byId[book.rewardModelId]||engine.byId[book.rewardModelId].characterId!==book.characterId)throw Error('Recompense de parcours inconnue.');
      const stages=combatStages(book);
      if(new Set(stages.map(stage=>stage.id)).size!==7)throw Error('Etape de parcours dupliquee.');
      for(const [index,stage] of book.bonusStages.entries()){
        const reward=Equipment.catalogue.weapons.find(item=>item.id===stage.rewardEquipmentId);
        if(!reward||stage.rewardKind!==['weapon','shield','relic'][index]||Equipment.catalogue.kind(reward)!==stage.rewardKind)throw Error('Equipement de parcours inconnu ou de type incorrect : '+book.id+'/'+stage.id);
        if(!Equipment.compatible(reward,engine.byId[book.rewardModelId]))throw Error('Equipement de parcours incompatible : '+book.id+'/'+stage.id);
      }
      for(const stage of stages){
        if(!engine.byId[stage.imageModelId]||!data.arenas.some(a=>a.id===stage.arenaId))throw Error('Illustration ou arene de parcours inconnue.');
        const team=Team.fromPreset({name:book.subtitle,cards:stage.deck});
        const errors=engine.validateComposition(team);if(errors.length)throw Error('Composition de parcours invalide : '+book.id+'/'+stage.id+' '+errors.join(' '));
        if(!team.formation.includes(stage.captain))throw Error('Capitaine de parcours absent : '+book.id+'/'+stage.id);
      }
    }
    return books.map(book=>({...book,stages:combatStages(book)}));
  }
  return {revision,catalogue,combatStages,validate};
});
