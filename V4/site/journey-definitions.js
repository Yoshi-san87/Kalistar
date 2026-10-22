(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./equipment.js'):root.KalistarEquipment);if(node)module.exports=api;else root.KalistarJourneyDefinitions=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Equipment){
  'use strict';
  const revision='journeys-1',copy=value=>JSON.parse(JSON.stringify(value));
  // Each fixed cast represents the episode's setting and trials, not a new canon alliance.
  // The first five entries explicitly fill P1..P5, keeping the episode's hero active.
  const definitions=[
  {
    "id": "momo-petits-bonheurs",
    "title": "Pour ceux que l\u2019on oublie",
    "subtitle": "Momo",
    "characterId": "momo",
    "rewardModelId": "30000014",
    "element": "ELECTRO",
    "stages": [
      {
        "id": "rebuts",
        "title": "Celui qui ressentait trop",
        "imageModelId": "30000001",
        "arenaId": "electro",
        "captain": "30000001",
        "deck": [
          "49900301",
          "49900302",
          "30000001",
          "30000023",
          "49900303",
          "49900704",
          "49902604",
          "49900710",
          "49900702",
          "49900910"
        ],
        "intro": [
          "Dans la maison, Momo connaissait l\u2019heure des repas, la place des chaussures et les taches qu\u2019il fallait faire dispara\u00eetre avant le retour des ma\u00eetres. Il s\u2019arr\u00eatait pourtant devant des choses inutiles : une chanson derri\u00e8re une porte, un objet cass\u00e9 que l\u2019on allait jeter. On le grondait pour ces retards. Il recommen\u00e7ait son travail, plus vite, sans parvenir \u00e0 ne plus rien sentir.",
          "Un matin, on ne lui donna aucune t\u00e2che. Le diagnostic disait \u00ab d\u00e9fectueux \u00bb. Momo attendit qu\u2019on le corrige. On le chargea avec les appareils hors d\u2019usage et le d\u00e9posa \u00e0 la casse. Longtemps apr\u00e8s le d\u00e9part du v\u00e9hicule, il regardait encore l\u2019endroit o\u00f9 la maison avait disparu."
        ],
        "outro": [
          "Le soir arrive sans qu\u2019une voix lui ordonne de rentrer. Momo se rel\u00e8ve entre deux carcasses et ramasse machinalement une tasse intacte. Il cherche o\u00f9 la ranger, puis comprend qu\u2019ici personne ne lui demandera de pr\u00e9parer le lendemain. Cette pens\u00e9e lui fait plus peur que les grands bruits du d\u00e9p\u00f4t.",
          "Il pose la tasse sur une caisse, \u00e0 l\u2019abri. C\u2019est peu, mais il a choisi cet endroit lui-m\u00eame. Autour de lui, des visages de m\u00e9tal gardent les yeux ferm\u00e9s. Momo ne sait pas r\u00e9parer ceux qui ne r\u00e9pondent plus. Il s\u2019assied pr\u00e8s d\u2019eux. Au bout de l\u2019all\u00e9e, une lourde silhouette vient de s\u2019arr\u00eater."
        ]
      },
      {
        "id": "passage",
        "title": "Une place pr\u00e8s de Taulio",
        "imageModelId": "30000013",
        "arenaId": "electro",
        "captain": "30000013",
        "deck": [
          "30000013",
          "49902604",
          "44263045",
          "30000001",
          "49900702",
          "49900313",
        "49900302",
          "49900710",
          "49901402",
          "49900303"
        ],
        "intro": [
          "La silhouette est trop grande pour passer entre les caisses sans les d\u00e9placer. Momo recule, pr\u00eat \u00e0 recevoir un nouvel ordre. Mais le robot s\u2019accroupit \u00e0 distance et pousse vers lui un morceau de toile s\u00e8che. Il s\u2019appelle Taulio. Sa cuirasse porte les marques d\u2019un ancien service ; lui aussi a \u00e9t\u00e9 jet\u00e9 apr\u00e8s avoir ressenti ce qu\u2019on ne lui demandait pas de ressentir.",
          "Momo attend une question sur ce qu\u2019il sait faire. Taulio n\u2019en pose aucune. Quand les engins reviennent d\u00e9placer les rebuts, il se met entre leurs roues et le petit abri. Momo d\u00e9couvre une pr\u00e9sence qui reste sans exiger de lui qu\u2019il soit utile."
        ],
        "outro": [
          "Les engins s\u2019\u00e9loignent. Taulio garde encore un instant son bras devant Momo, puis le baisse avec pr\u00e9caution. Une plaque a gliss\u00e9 de son \u00e9paule. Momo la ramasse et cherche comment la remettre. Ses petits doigts insistent sur l\u2019attache tordue ; Taulio attend, sans rire de cette r\u00e9paration minuscule sur un corps aussi lourd.",
          "Leurs gestes deviennent une habitude. Taulio d\u00e9gage les passages, Momo retrouve ce qui s\u2019est perdu entre les pi\u00e8ces. Ils partagent l\u2019abri, puis leurs silences. Un jour, sous un coffret ouvert, Momo aper\u00e7oit un tube clair muni de petites clefs. Taulio soul\u00e8ve la caisse qui le retenait. L\u2019instrument n\u2019est presque pas ab\u00eem\u00e9."
        ]
      },
      {
        "id": "carillons",
        "title": "La premi\u00e8re m\u00e9lodie",
        "imageModelId": "30000014",
        "arenaId": "electro",
        "captain": "30000014",
        "deck": [
          "30000013",
          "49800201",
          "30000014",
          "49900710",
          "49900702",
          "49900704",
          "49902604",
          "44263045",
          "30000040",
          "49901402"
        ],
        "intro": [
          "Momo essuie la fl\u00fbte traversi\u00e8re avec la toile que Taulio lui a donn\u00e9e. Les clefs bougent encore. Il la tourne plusieurs fois avant de la tenir de c\u00f4t\u00e9, surpris de reconna\u00eetre ce geste. Aucun ordre ne lui a appris \u00e0 jouer. Pourtant, une suite de notes revient lorsqu\u2019il ferme les yeux, incompl\u00e8te mais assez pr\u00e9cise pour qu\u2019il entende ses propres erreurs.",
          "Il essaie pendant des heures. Taulio reste assis pr\u00e8s de lui. Enfin, deux phrases se rejoignent. Une lumi\u00e8re tremble au bord de la fl\u00fbte. Momo s\u2019interrompt aussit\u00f4t, persuad\u00e9 d\u2019avoir encore cass\u00e9 quelque chose. La lueur s\u2019\u00e9teint. Taulio regarde l\u2019instrument, puis son ami, et attend qu\u2019il ose recommencer."
        ],
        "outro": [
          "Cette fois, Momo termine la phrase. Un reflet dor\u00e9 suit le son et passe entre les dents d\u2019un vieux carillon. Le m\u00e9tal remue sans que Taulio le touche. Momo baisse la fl\u00fbte, observe ses mains et recommence plus doucement. Il ne comprend pas ce qu\u2019elles viennent de faire ; il sait seulement que la lumi\u00e8re r\u00e9pond \u00e0 la musique.",
          "Un souvenir traverse alors la m\u00e9lodie : le bord d\u2019une table, une main pench\u00e9e sur lui, quelqu\u2019un qui attendait d\u00e9j\u00e0 sa r\u00e9ponse. Le visage manque. Momo voudrait retenir cette image, mais plus il se d\u00e9p\u00eache, plus elle se d\u00e9fait. Taulio lui fait une place contre son \u00e9paule. Ils ont encore du temps."
        ]
      },
      {
        "id": "rester",
        "title": "Le bal des objets perdus",
        "imageModelId": "30000014",
        "arenaId": "electro",
        "captain": "30000014",
        "deck": [
          "30000013",
          "49800201",
          "30000014",
          "49900710",
          "49900702",
          "49900313",
          "49902604",
          "44263045",
          "49902702",
          "49901402"
        ],
        "intro": [
          "Au coucher du soleil, Momo se tient debout au milieu des objets qu\u2019il a mis de c\u00f4t\u00e9. La tasse est toujours l\u00e0. Les carillons, eux, attendent une note qu\u2019il sait d\u00e9sormais retrouver. Taulio veille pr\u00e8s du passage. Momo ne joue plus pour couvrir le bruit de la casse : il essaie d\u2019\u00e9couter ce qui revient \u00e0 travers lui.",
          "\u00c0 chaque reprise, la main du souvenir devient un peu plus nette. Elle ajustait quelque chose avec soin, bien avant la maison o\u00f9 on le grondait. Momo h\u00e9site devant cette diff\u00e9rence. Quelqu\u2019un l\u2019a donc regard\u00e9 autrement. Il reprend la m\u00e9lodie, d\u00e9cid\u00e9 \u00e0 ne plus traiter ce souvenir comme une panne."
        ],
        "outro": [
          "Les vieux carillons se soul\u00e8vent un \u00e0 un. Leur son est irr\u00e9gulier, parfois faux, et Momo sourit malgr\u00e9 lui. Pour la premi\u00e8re fois, il finit une m\u00e9lodie sans attendre qu\u2019on lui dise si elle a servi. Taulio regarde les objets tourner au-dessus de sa t\u00eate. Le petit robot ne se cache plus derri\u00e8re son \u00e9paule.",
          "Lorsque la lumi\u00e8re retombe, le souvenir de la main demeure. Momo ne conna\u00eet ni le visage de son cr\u00e9ateur ni l\u2019endroit o\u00f9 le chercher. Mais il veut apprendre. Plus tard, il pourra confier cette question \u00e0 Kaylis. Ce soir, il la garde pr\u00e8s de lui, avec sa fl\u00fbte et son ami."
        ]
      }
    ],
    "bonusReveal": {
      "title": "Ce qu\u2019il veut retrouver",
      "paragraphs": [
        "Apr\u00e8s le bal, Momo ne range pas la fl\u00fbte. La main entrevue dans sa m\u00e9moire a fait na\u00eetre une question qu\u2019il ne peut plus remettre \u00e0 plus tard. Avant de partir, il lui reste \u00e0 \u00e9couter, \u00e0 se pr\u00e9parer et \u00e0 trouver comment demander de l\u2019aide."
      ]
    },
    "bonusStages": [
      {
        "id": "souffle",
        "title": "La note retenue",
        "imageModelId": "30000014",
        "arenaId": "electro",
        "captain": "30000014",
        "deck": [
          "30000013",
          "49902702",
          "30000014",
          "49900710",
          "49900702",
          "49900704",
          "49902604",
          "44263045",
          "30000040",
          "49901402"
        ],
        "intro": [
          "Momo conna\u00eet maintenant la suite des notes, mais une seule lui \u00e9chappe lorsqu\u2019il pense \u00e0 la main du souvenir. Il serre les clefs, force le souffle et ne produit qu\u2019un son coup\u00e9. Taulio lui apporte le tissu pos\u00e9 sur la caisse. Momo nettoie lentement l\u2019instrument ; ce travail familier l\u2019aide \u00e0 retrouver la patience qu\u2019il vient de perdre.",
          "Il d\u00e9couvre une clef qui ferme mal, la remet en place et essaie sans chercher \u00e0 tout revoir d\u2019un coup. La lumi\u00e8re appara\u00eet, plus fine. Derri\u00e8re elle, une couleur jaune se refl\u00e8te sur un \u00e9tabli et sur des fils ouverts. Momo garde le rythme, malgr\u00e9 son envie de regarder davantage."
        ],
        "outro": [
          "La derni\u00e8re note tient. Momo laisse retomber ses mains et reste longtemps sans parler. Il a aper\u00e7u un \u00e9clat jaune, pr\u00e8s de circuits qu\u2019il reconnaissait comme les siens. Puis la main a quitt\u00e9 l\u2019outil pour se poser contre son petit bras. Ce geste-l\u00e0 n\u2019avait rien du diagnostic qui l\u2019avait envoy\u00e9 \u00e0 la casse.",
          "Il ne sait pas encore ce qui lui a \u00e9t\u00e9 fait ni pourquoi la musique r\u00e9veille ces images. La Fl\u00fbte des Petits Bonheurs n\u2019apporte pas toutes les r\u00e9ponses ; elle lui permet de revenir jusqu\u2019\u00e0 cette question sans avoir peur de lui-m\u00eame. Il enveloppe soigneusement l\u2019instrument. Pour l\u2019emporter, il lui faudra autre chose que ses mains."
        ],
        "rewardEquipmentId": "little-joys-flute",
        "rewardKind": "weapon"
      },
      {
        "id": "coutures",
        "title": "Les mains de son ami",
        "imageModelId": "30000001",
        "arenaId": "electro",
        "captain": "30000013",
        "deck": [
          "30000013",
          "49900314",
          "30000014",
          "49900710",
          "49901402",
          "49900313",
          "49800201",
          "49902604",
          "49900702",
          "49900312"
        ],
        "intro": [
          "Pr\u00e8s de la passerelle, Taulio pr\u00e9sente un harnais \u00e0 Momo. Le petit robot en suit les coutures, puis passe un bras dans la mauvaise ouverture. Taulio attend qu\u2019il ressorte et rapproche doucement la boucle. Ses grandes mains sont moins \u00e0 l\u2019aise avec le cuir qu\u2019avec les charges de la casse, mais aucune ne se presse.",
          "Momo accroche la fl\u00fbte et fait quelques pas. La sangle tire lorsqu\u2019il se penche ; Taulio l\u2019arr\u00eate pour reprendre le r\u00e9glage. Il ne veut pas emp\u00eacher son ami de partir. Il veut que rien de ce qu\u2019il porte ne le fasse tomber. Momo comprend la diff\u00e9rence en levant les yeux vers lui."
        ],
        "outro": [
          "Le harnais suit enfin ses mouvements. Momo traverse quelques planches, revient, se baisse et se rel\u00e8ve sans retenir la fl\u00fbte contre lui. Taulio v\u00e9rifie encore la boucle. Le petit robot pose sa main sur la sienne pour lui montrer que cela suffit. Le geste dure une seconde de plus que la v\u00e9rification.",
          "Le Harnais des Passerelles ne rendra pas le chemin sans danger. Il laisse simplement \u00e0 Momo les mains libres pour s\u2019y tenir et pour jouer. Avant de quitter l\u2019abri, il veut ranger les derni\u00e8res trouvailles. Au fond d\u2019une caisse, une petite bo\u00eete attend encore. Son m\u00e9canisme semble intact, mais le couvercle r\u00e9siste."
        ],
        "rewardEquipmentId": "kalistar-chroma-harness",
        "rewardKind": "shield"
      },
      {
        "id": "boite",
        "title": "Un nom dans la musique",
        "imageModelId": "30000014",
        "arenaId": "electro",
        "captain": "30000014",
        "deck": [
          "30000013",
          "49055457",
          "30000014",
          "49900710",
          "49900702",
          "49900313",
          "49902702",
          "49902604",
          "49901402",
          "44703335"
        ],
        "intro": [
          "Kaylis reste pr\u00e8s de la table pendant que Momo soul\u00e8ve le couvercle. Il lui a montr\u00e9 les clefs de la fl\u00fbte, la lumi\u00e8re et ce geste dont il se souvient sans pouvoir nommer son auteur. Elle l\u2019\u00e9coute jusqu\u2019au bout. Taulio se tient derri\u00e8re eux, assez pr\u00e8s pour aider, assez loin pour laisser Momo raconter.",
          "La petite bo\u00eete joue une phrase courte. Momo la reprend \u00e0 la fl\u00fbte ; les deux airs ne sont pas identiques, mais une note commune suffit \u00e0 rouvrir l\u2019image de l\u2019\u00e9tabli. Il revoit le reflet jaune, les fils, puis la main. Cette fois, un nom accompagne enfin le souvenir. Momo s\u2019arr\u00eate avant de le perdre."
        ],
        "outro": [
          "\u00ab Gezinho. \u00bb Momo prononce le nom une seconde fois. Il ne sait pas encore s\u2019il retrouvera son cr\u00e9ateur ni ce que celui-ci pourra lui expliquer. Kaylis l\u2019inscrit pour lui. Elle ne promet pas une r\u00e9ponse au bout de la route ; elle accepte de l\u2019aider \u00e0 chercher. Taulio se penche pour regarder le mot, puis regarde son ami.",
          "Momo referme la Bo\u00eete des Petits Bonheurs et la glisse contre le harnais. Il garde la fl\u00fbte \u00e0 port\u00e9e de main. La casse n\u2019est plus le seul endroit o\u00f9 il peut imaginer demain. Devant la porte, il attend Kaylis et Taulio. Pour une fois, partir ne signifie pas \u00eatre abandonn\u00e9."
        ],
        "rewardEquipmentId": "little-joys-box",
        "rewardKind": "relic"
      }
    ]
  },
  {
    "id": "balmhyr-retour",
    "title": "Le poids du retour",
    "subtitle": "Balmhyr",
    "characterId": "balmhyr",
    "rewardModelId": "49900802",
    "element": "MINERO",
    "stages": [
      {
        "id": "horizon",
        "title": "Un royaume \u00e0 l\u2019horizon",
        "imageModelId": "30000007",
        "arenaId": "minero",
        "captain": "30000007",
        "deck": [
          "30000007",
          "30000002",
        "30000021",
        "30000023",
        "49901402",
        "49900313",
        "49902604",
        "30000040",
        "49902613",
        "49900702"
        ],
        "intro": [
          "Balmhyr brosse lentement le flanc de son ours. Depuis les hauteurs de Canyonero, Durane demeure visible certains jours, lorsque la poussi\u00e8re laisse un peu de place au loin. Il conna\u00eet cette direction sans avoir besoin de la chercher. Le royaume continue sans lui ; cette id\u00e9e change de poids selon les matins.",
          "Il v\u00e9rifie l\u2019eau, replace un outil et s\u2019attarde devant le chemin. Rien ici ne l\u2019appelle roi. Pourtant, ceux qui arrivent \u00e9puis\u00e9s trouvent encore sa porte et une place \u00e0 sa table. Avant de songer \u00e0 reprendre la route, Balmhyr doit regarder ce qu\u2019il est devenu loin du tr\u00f4ne : un homme capable d\u2019attendre quelqu\u2019un."
        ],
        "outro": [
          "La journ\u00e9e s\u2019ach\u00e8ve par des gestes ordinaires. Balmhyr rapproche un si\u00e8ge, d\u00e9gage l\u2019acc\u00e8s \u00e0 la r\u00e9serve d\u2019eau et referme le coffre laiss\u00e9 ouvert. Il aurait autrefois confi\u00e9 ces d\u00e9tails \u00e0 d\u2019autres. Aujourd\u2019hui, ils lui permettent de mesurer pr\u00e9cis\u00e9ment ce qu\u2019il a fait pour ceux qui viennent reprendre souffle.",
          "Il regarde une derni\u00e8re fois vers Durane. L\u2019exil n\u2019a pas effac\u00e9 son attachement, mais il lui a retir\u00e9 les phrases faciles. Revenir ne pourra pas seulement signifier retrouver une place perdue. Il faudra regarder ceux qui ont continu\u00e9 \u00e0 vivre sans lui, leurs blessures, leurs habitudes et ce qu\u2019ils attendent d\u00e9sormais. Balmhyr rentre avant que le repas refroidisse."
        ]
      },
      {
        "id": "durane",
        "title": "Les chemins de Durane",
        "imageModelId": "30000018",
        "arenaId": "minero",
        "captain": "30000018",
        "deck": [
        "49900308",
          "30000018",
        "49900906",
          "30000023",
        "49902603",
        "30000024",
          "30000025",
        "49900306",
        "49902613",
        "49902605"
        ],
        "intro": [
          "Durane ne se r\u00e9sume pas au si\u00e8ge occup\u00e9 par Lok. Il y a les galeries, les d\u00e9parts avant le jour, les familles qui attendent pr\u00e8s d\u2019un pont r\u00e9par\u00e9. Balmhyr conna\u00eet ces vies, mais la distance les a parfois rendues trop simples dans son souvenir. Imaginer son retour l\u2019oblige \u00e0 leur rendre leurs difficult\u00e9s.",
          "Dans les mines, on ne d\u00e9place pas une charge en lui annon\u00e7ant que son roi revient. Il faut des mains, des appuis et un passage s\u00fbr. Balmhyr pense \u00e0 la pierre qui peut prot\u00e9ger autant qu\u2019enfermer. Pour avancer vers les portes, il devra apprendre \u00e0 entendre ce qui se passe de leur autre c\u00f4t\u00e9."
        ],
        "outro": [
          "Le chemin devient plus concret lorsqu\u2019il cesse d\u2019y voir une marche vers son ancien titre. Balmhyr se repr\u00e9sente les arr\u00eats, la fatigue, l\u2019espace qu\u2019il faudra laisser aux autres. Il sait ce qu\u2019une entr\u00e9e imposante peut dissimuler : un homme qui pr\u00e9f\u00e8re \u00eatre reconnu plut\u00f4t que r\u00e9pondre aux questions.",
          "Lok demeure sur le tr\u00f4ne. Cela ne donne \u00e0 Balmhyr ni une victoire future ni le droit de disposer de ceux qui pourraient l\u2019aider. Il ram\u00e8ne son attention \u00e0 ce qu\u2019il peut pr\u00e9parer aujourd\u2019hui. Avant d\u2019entrer dans une salle o\u00f9 chacun parlera pour les autres, il veut \u00eatre capable de guider quelqu\u2019un sans d\u00e9cider de tous ses pas."
        ]
      },
      {
        "id": "guide",
        "title": "La patience du guide",
        "imageModelId": "30000007",
        "arenaId": "minero",
        "captain": "30000007",
        "deck": [
          "30000007",
          "49900705",
        "49900308",
          "49902613",
        "49902605",
        "49900307",
          "30000011",
          "49900906",
          "30000023",
        "49902603"
        ],
        "intro": [
          "Dans la cour, Kaylis recommence un mouvement qu\u2019elle voudrait d\u00e9j\u00e0 r\u00e9ussir. Balmhyr remarque la tension de sa main, puis celle de son visage lorsqu\u2019il approche. Il lui montre o\u00f9 placer les doigts et se retire. La correction doit lui laisser assez d\u2019espace pour essayer seule, pas la garder sous son regard.",
          "Les pierres qu\u2019il soul\u00e8ve ne dispensent personne de sentir ses appuis. Il pourrait rendre l\u2019exercice spectaculaire ; il pr\u00e9f\u00e8re voir le geste se terminer sans douleur. La patience lui co\u00fbte parfois davantage qu\u2019un effort de force. Elle l\u2019oblige \u00e0 accepter que la personne devant lui n\u2019avance ni au rythme de ses souvenirs ni pour lui faire plaisir."
        ],
        "outro": [
          "Kaylis s\u2019arr\u00eate \u00e0 la distance qu\u2019elle a choisie. Balmhyr n\u2019annonce pas une victoire. Il lui demande o\u00f9 repose son poids, puis la laisse r\u00e9pondre avec son corps. Quand elle recommence sans attendre sa main, il retrouve quelque chose qu\u2019un ordre n\u2019aurait jamais obtenu.",
          "Il ramasse les linges pr\u00e8s du coffre. Aider ne lui rendra pas son royaume, et ce travail ne l\u2019absout de rien. Il a pourtant donn\u00e9 une chose r\u00e9elle : un peu de temps pour apprendre sans \u00eatre humili\u00e9. Plus tard, \u00e0 Durane, il lui faudra conserver cette attention au milieu des portes et des titres. Il ferme le coffre en pensant \u00e0 ceux qui marchent avec lui."
        ]
      },
      {
        "id": "portes",
        "title": "Le poids du retour",
        "imageModelId": "49900802",
      "arenaId": "minero",
        "captain": "49900802",
        "deck": [
        "49900308",
          "49900705",
          "49900802",
          "49902613",
          "49902605",
          "30000024",
          "49900307",
          "49900906",
          "30000023",
          "49902603"
        ],
        "intro": [
          "Dans les couloirs de Durane, Balmhyr ralentit malgr\u00e9 lui. Il porte le gant que Madania lui a gard\u00e9. Le fer est familier ; la sensation de le retrouver apr\u00e8s tant d\u2019ann\u00e9es ne l\u2019est pas. Ses doigts cherchent leur place et rencontrent aussi le souvenir de mains qui ont v\u00e9cu sans les siennes.",
          "Derri\u00e8re les portes, le Conseil si\u00e8ge. Balmhyr entend des voix sans distinguer toutes les phrases. Il pourrait se pr\u00e9parer seulement \u00e0 para\u00eetre solide. Il pr\u00e9f\u00e8re penser aux questions auxquelles il devra r\u00e9pondre, aux absences qu\u2019aucun retour ne r\u00e9pare d\u2019un geste. Le gant reste ouvert. Il n\u2019est pas venu jusqu\u2019ici pour que le poids du fer parle \u00e0 sa place."
        ],
        "outro": [
          "Balmhyr retrouve une respiration r\u00e9guli\u00e8re. Le couloir ne s\u2019est pas \u00e9largi, les voix ne se sont pas tues, et aucune couronne ne l\u2019attend au bout de cette \u00e9preuve. Pourtant, il peut regarder les portes sans d\u00e9tourner aussit\u00f4t les yeux vers une certitude ancienne.",
          "Il touche la fermeture du gant, comme Madania l\u2019a fait lorsqu\u2019elle le lui a rendu. Elle avait conserv\u00e9 l\u2019objet ; elle n\u2019avait pas arr\u00eat\u00e9 sa vie autour de lui. Cette diff\u00e9rence l\u2019accompagnera lorsqu\u2019il entrera. Avant de se lever, Balmhyr laisse passer quelqu\u2019un dans le couloir. Son retour commence aussi par cette place qu\u2019il accepte de ne pas occuper enti\u00e8rement."
        ]
      }
    ],
    "bonusReveal": {
      "title": "Ce qu\u2019il choisit de porter",
      "paragraphs": [
        "Le gant retrouv\u00e9 ne suffit pas \u00e0 pr\u00e9parer Balmhyr. Dans l\u2019attente devant le Conseil, chaque objet lui demande un geste diff\u00e9rent : serrer juste, prot\u00e9ger sans enfermer, parler sans exiger l\u2019ob\u00e9issance. Il lui reste \u00e0 \u00e9prouver ces choix avant de franchir les portes."
      ]
    },
    "bonusStages": [
      {
        "id": "serment",
        "title": "La main rendue",
        "imageModelId": "49900802",
        "arenaId": "minero",
        "captain": "49900802",
        "deck": [
          "49900306",
          "49900906",
          "49900802",
          "30000023",
          "49902603",
          "49900704",
          "49900705",
          "49900302",
          "49902613",
          "49902605"
        ],
        "intro": [
          "Balmhyr ouvre et referme le gant conserv\u00e9 par Madania. Une articulation r\u00e9siste l\u00e9g\u00e8rement. Il pourrait forcer ; il pr\u00e9f\u00e8re reprendre l\u2019ajustement, retrouver la position qui laisse le mouvement entier. L\u2019objet n\u2019a pas chang\u00e9 pour lui cacher le temps \u00e9coul\u00e9. Ses mains, elles, ont connu d\u2019autres efforts.",
          "Il revoit Madania le reconna\u00eetre avant de lui demander une explication. Ce souvenir rend la prise moins facile, pas moins s\u00fbre. Le Serment de Fer porte une force qu\u2019il devra diriger avec pr\u00e9cision. Balmhyr ne veut pas confondre cette puissance retrouv\u00e9e avec une r\u00e9ponse \u00e0 toutes les ann\u00e9es o\u00f9 il n\u2019\u00e9tait pas l\u00e0. Il pose les pieds et essaie."
        ],
        "outro": [
          "Le gant accompagne enfin le mouvement sans tirer sur son poignet. Balmhyr le laisse retomber contre sa cuisse et attend que l\u2019effort quitte son bras. Ce qu\u2019il vient de retrouver n\u2019est pas la facilit\u00e9 d\u2019autrefois. C\u2019est une prise qu\u2019il conna\u00eet de nouveau assez pour ne pas lui demander ce qu\u2019elle ne peut donner.",
          "Il essuie le fer avec le linge laiss\u00e9 pr\u00e8s du banc. Madania n\u2019a pas gard\u00e9 ce gant pour qu\u2019il remplace ses paroles. Il le sait en prenant le temps de plier le tissu. \u00c0 c\u00f4t\u00e9 repose un bouclier marqu\u00e9 de marteaux crois\u00e9s. Il lui faudra aussi apprendre \u00e0 tenir une place sans fermer le passage."
        ],
        "rewardEquipmentId": "mythic-iron-gauntlet",
        "rewardKind": "weapon"
      },
      {
        "id": "rempart",
        "title": "La largeur d\u2019un passage",
        "imageModelId": "30000024",
        "arenaId": "minero",
        "captain": "30000024",
        "deck": [
          "30000024",
          "49900307",
          "49900802",
          "49902613",
          "49902605",
          "49900308",
          "49900906",
          "49900704",
          "30000023",
          "49902603"
        ],
        "intro": [
          "Le Rempart de Durane fr\u00f4le la pierre lorsque Balmhyr le soul\u00e8ve. Il tourne l\u2019\u00e9paule pour d\u00e9gager le couloir. Un bouclier qui occupe toute la largeur prot\u00e8ge peut-\u00eatre celui qui le tient ; il emp\u00eache aussi les autres d\u2019avancer. Balmhyr reprend sa position en regardant derri\u00e8re lui.",
          "Les marteaux crois\u00e9s portent des marques qu\u2019il ne cherche pas \u00e0 polir. Le Kalistel gris accroche la lumi\u00e8re, mais ce n\u2019est pas lui qui d\u00e9cidera de la place laiss\u00e9e libre. Le bras encore fatigu\u00e9 par le gant, Balmhyr mesure l\u2019espace d\u2019un corps, puis celui d\u2019un second. Tenir n\u2019aura de sens que si quelqu\u2019un peut encore passer."
        ],
        "outro": [
          "Le choc glisse sur le bord du bouclier. Balmhyr garde ses appuis au lieu de poursuivre aussit\u00f4t le mouvement. Derri\u00e8re son \u00e9paule, le passage demeure libre. Il v\u00e9rifie cela avant de se redresser ; la solidit\u00e9 du Rempart ne lui aurait servi \u00e0 rien s\u2019il avait lui-m\u00eame barr\u00e9 la route.",
          "Il pose le bouclier de biais contre le banc. La pierre a transmis la force re\u00e7ue jusque dans son bras. Elle ne lui a pas appris \u00e0 qui la rendre. Balmhyr desserre la sangle et masse son poignet. Dans sa poche, un petit objet heurte ses doigts. Il sort le sceau, dont une \u00e9br\u00e9chure interrompt encore l\u2019empreinte."
        ],
        "rewardEquipmentId": "durane-rampart",
        "rewardKind": "shield"
      },
      {
        "id": "empreinte",
        "title": "Sans cire ni d\u00e9cret",
        "imageModelId": "49900306",
        "arenaId": "trone-fer",
        "captain": "49900306",
        "deck": [
          "49900306",
          "49900705",
          "49900802",
          "30000017",
          "49902603",
          "49900308",
          "49900307",
          "49900906",
          "30000023",
          "49902605"
        ],
        "intro": [
          "Le Sceau du Roi sans Tr\u00f4ne tient dans la paume de Balmhyr. Il suit l\u2019empreinte du pouce, sans document \u00e0 marquer devant lui. Le manque sur le bord ne rendrait aucune d\u00e9cision meilleure. Une forme intacte n\u2019aurait pas garanti davantage la justice de ce qu\u2019il aurait demand\u00e9.",
          "Il pense \u00e0 la place gard\u00e9e derri\u00e8re le bouclier. Les personnes qui la traversaient n\u2019\u00e9taient pas des sujets venus confirmer son retour. Elles avaient besoin de passer. Balmhyr voudrait conserver cette \u00e9vidence lorsque les titres recommenceront \u00e0 peser dans la conversation. Il laisse le sceau visible, le temps d\u2019affronter ce que son ancien pouvoir lui donne encore envie d\u2019exiger."
        ],
        "outro": [
          "Apr\u00e8s l\u2019effort, Balmhyr rouvre la main. Il n\u2019a scell\u00e9 aucun ordre. Le gant repose pr\u00e8s de lui, le bouclier ne g\u00eane personne et l\u2019empreinte garde son d\u00e9faut. Aucun de ces objets ne lui promet l\u2019issue du Conseil. Ils lui demandent seulement de rester attentif \u00e0 la fa\u00e7on dont il s\u2019en sert.",
          "Il range le sceau et se l\u00e8ve lentement. Sa premi\u00e8re pens\u00e9e n\u2019est plus de retrouver la silhouette d\u2019un roi devant les portes. Il v\u00e9rifie que le couloir reste libre, puis rejoint ceux qui l\u2019attendent. Le retour n\u2019effacera pas ce qui s\u2019est pass\u00e9 en son absence. Il peut au moins commencer sans demander aux autres de l\u2019oublier."
        ],
        "rewardEquipmentId": "exiled-king-seal",
        "rewardKind": "relic"
      }
    ]
  },
  {
    "id": "kaylis-prochain-pas",
    "title": "Choisir son prochain pas",
    "subtitle": "Kaylis",
    "characterId": "kaylis",
    "rewardModelId": "49055457",
    "element": "RAINBOW",
    "stages": [
      {
        "id": "breche",
        "title": "La premi\u00e8re br\u00e8che",
        "imageModelId": "30000012",
        "arenaId": "z13",
        "captain": "30000012",
        "deck": [
        "49900704",
          "30000025",
        "30000026",
          "30000023",
          "30000012",
        "30000024",
        "49900307",
          "49902613",
        "49902603",
        "49900302"
        ],
        "intro": [
          "Dans la poussi\u00e8re de la Z13, Kaylis regarde ses bras. La lumi\u00e8re vient de sa peau et atteint la roche devant elle. Elle voudrait pouvoir la ranger avec les outils, lui donner une place o\u00f9 elle cesserait de faire peur. Mais les marques continuent de r\u00e9pondre \u00e0 quelque chose qu\u2019elle ne sait pas nommer.",
          "Elle conna\u00eet la voix de Baba, l\u2019obstination de Gen et le rire de Lanio. Aucun ne commence par lui regarder les tatouages. Cette familiarit\u00e9 l\u2019aide \u00e0 respirer quand tout para\u00eet soudain diff\u00e9rent. Il lui faut affronter ce premier mouvement sans laisser la panique d\u00e9cider de ce qu\u2019elle fera, ni de celle qu\u2019elle doit devenir."
        ],
        "outro": [
          "Kaylis reprend son souffle. La peur n\u2019a pas disparu, mais elle entend de nouveau ce qui l\u2019entoure au lieu de chercher uniquement le prochain danger. Elle baisse les bras, puis les rel\u00e8ve pour les regarder sans d\u00e9tourner aussit\u00f4t les yeux. Ils sont toujours les siens.",
          "Les questions peuvent attendre une respiration de plus. Elle n\u2019a pas \u00e0 expliquer toute cette lumi\u00e8re pour accepter l\u2019aide qu\u2019on lui offre. Baba reste assez pr\u00e8s pour qu\u2019elle le voie ; ailleurs, Gen continue de chercher comment faire tenir ce qui r\u00e9siste. Kaylis retrouve cette mesure famili\u00e8re : un geste possible, puis un autre. La suite demandera d\u2019apprendre, pas seulement d\u2019\u00e9chapper."
        ]
      },
      {
        "id": "couleurs",
        "title": "Apprendre sans fuir",
        "imageModelId": "30000007",
        "arenaId": "minero",
        "captain": "30000007",
        "deck": [
          "30000007",
          "49055457",
          "47414613",
          "49902613",
          "49900711",
          "30000022",
          "49900705",
          "30000023",
          "49902603",
          "30000011"
        ],
        "intro": [
          "Dans la cour de Balmhyr, Kaylis d\u00e9couvre qu\u2019une lame l\u00e9g\u00e8re peut rendre une main maladroite. Son poignet s\u2019incline, la pointe touche la terre et elle s\u2019attend d\u00e9j\u00e0 \u00e0 ce qu\u2019on lui retire l\u2019arme. Le nain lui montre une autre prise. Il ne lui demande pas de recommencer plus vite.",
          "Un rep\u00e8re pr\u00e8s de son pied r\u00e9duit la distance qu\u2019elle voulait parcourir. Kaylis le trouve presque humiliant, puis sent que sa jambe peut terminer le geste sans protester. Autour d\u2019elle, les exercices se poursuivent. Elle doit accepter cette petite mesure : regarder ses limites assez longtemps pour choisir un mouvement qui ne soit pas une nouvelle fuite."
        ],
        "outro": [
          "La pointe revient devant elle sans heurter le sol. Kaylis reste immobile, surprise par la simplicit\u00e9 du r\u00e9sultat. Le geste n\u2019a pas impressionn\u00e9 la cour ; il lui a seulement permis de finir l\u00e0 o\u00f9 elle voulait. Balmhyr se retire pour qu\u2019elle puisse le retrouver seule.",
          "Elle recommence, manque la distance, puis reprend ses appuis. Cette fois, l\u2019erreur ne lui retire pas sa place. Lanio travaille plus loin, Baba m\u00e9nage une \u00e9paule douloureuse, et personne n\u2019avance exactement au m\u00eame rythme. Kaylis l\u00e8ve la lame une fois encore. Les couleurs sur ses bras ne lui \u00e9pargnent aucun de ces essais ; elles cessent peu \u00e0 peu de les interrompre."
        ]
      },
      {
        "id": "ligne",
        "title": "Une ligne choisie",
        "imageModelId": "49055457",
        "arenaId": "minero",
        "captain": "49055457",
        "deck": [
          "30000007",
          "49055457",
          "49900906",
          "44703335",
          "49902603",
          "30000011",
          "49900705",
          "49900307",
          "49902613",
          "49900711"
        ],
        "intro": [
          "La pierre soulev\u00e9e par Balmhyr bouge sous ses pieds. Kaylis veut corriger tout son corps \u00e0 la fois et manque de perdre l\u2019\u00e9quilibre. Elle abaisse la lame, sent o\u00f9 porte son poids, puis rel\u00e8ve seulement la main. La pointe attend. Elle peut prendre le temps de choisir sa ligne.",
          "Les couleurs courent sur ses bras sans lui indiquer le moment juste. Il faut regarder, laisser passer une h\u00e9sitation et engager enfin le mouvement. Kaylis ne cherche plus \u00e0 copier le geste du nain. Elle veut reconna\u00eetre le sien, celui qu\u2019elle pourra recommencer m\u00eame lorsque la peur reviendra brouiller les distances. Elle avance d\u2019un pas mesur\u00e9."
        ],
        "outro": [
          "La lame s\u2019arr\u00eate avant que son \u00e9paule l\u2019emporte. Kaylis regarde la ligne parcourue, puis l\u2019espace qui reste autour d\u2019elle. Elle peut encore reculer, tourner et revenir en garde. R\u00e9ussir ne l\u2019a pas laiss\u00e9e prisonni\u00e8re du mouvement qu\u2019elle venait de choisir.",
          "Elle baisse le bras. Rien ne garantit qu\u2019elle retrouvera cette pr\u00e9cision dans un couloir plein de bruit. Mais elle sait maintenant reconna\u00eetre un appui, une prise trop serr\u00e9e et le moment o\u00f9 elle se pr\u00e9cipite. Balmhyr n\u2019a pas choisi la suite pour elle. Kaylis reprend la position de d\u00e9part sans attendre son signal. Il lui reste \u00e0 \u00e9prouver cette attention quand les gestes devront s\u2019encha\u00eener."
        ]
      },
      {
        "id": "seuil",
        "title": "Le prochain pas",
        "imageModelId": "49902701",
        "arenaId": "z13",
        "captain": "49055457",
        "deck": [
          "47884687",
        "30000027",
          "49055457",
          "44703335",
          "49900911",
          "30000007",
        "47414613",
          "30000025",
          "49902613",
          "49900711"
        ],
        "intro": [
          "Au seuil de la maison de Madania, Kaylis v\u00e9rifie sa garde. Elle retrouve les gestes appris dans la cour, mais le calme de l\u2019exercice ne l\u2019accompagne plus enti\u00e8rement. La Tour de Fer l\u2019attend et ses questions ne se laisseront pas r\u00e9soudre par une belle ligne dans l\u2019air.",
          "Elle pense \u00e0 ceux qu\u2019elle conna\u00eet autrement que par leur force. Baba garde une place, Gen insiste devant une m\u00e9canique, Lanio trouve encore un d\u00e9tour qui fait rire. Elle ne veut pas que le danger r\u00e9duise ces pr\u00e9sences \u00e0 ce qu\u2019elles pourraient lui permettre de gagner. Kaylis ajuste ses appuis. Avancer doit rester son choix, avec eux, pas \u00e0 leur place."
        ],
        "outro": [
          "Kaylis s\u2019arr\u00eate au seuil avant de repartir. Elle n\u2019a pas acquis une certitude nouvelle sur la Tour de Fer. Elle a \u00e9prouv\u00e9 ce que les exercices lui laissent quand il faut regarder plusieurs mouvements, reprendre sa place et garder assez d\u2019attention pour les autres.",
          "Les couleurs restent visibles sur ses bras. Elle n\u2019essaie plus de les expliquer avant chaque d\u00e9cision. Ses doigts retrouvent la garde, ses pieds la pierre et son regard la direction qu\u2019elle a choisie. Sous la cape, quelque chose tire encore l\u00e9g\u00e8rement lorsqu\u2019elle bouge. Il reste ces d\u00e9tails tr\u00e8s concrets \u00e0 r\u00e9gler avant le d\u00e9part : une prise, des bottes, un lien qui doit laisser le corps libre."
        ]
      }
    ],
    "bonusReveal": {
      "title": "Ce qu\u2019elle emporte",
      "paragraphs": [
        "Kaylis v\u00e9rifie ce qui l\u2019accompagnera hors de la maison. Promesse, ses bottes noires et le tissu bleu nuit ne choisiront aucun chemin pour elle. Elle peut encore prendre le temps de les ajuster, puis \u00e9prouver la libert\u00e9 de ses gestes avant de partir."
      ]
    },
    "bonusStages": [
      {
        "id": "promesse",
        "title": "La place de ses doigts",
        "imageModelId": "30000007",
        "arenaId": "minero",
        "captain": "30000007",
        "deck": [
          "30000007",
          "49055457",
          "49900307",
          "49902613",
          "49902605",
          "49900306",
          "49900705",
          "49900906",
          "30000023",
          "49902603"
        ],
        "intro": [
          "Promesse repose dans la main de Kaylis. Elle serre d\u00e9j\u00e0 trop fort et le remarque au blanc de ses jointures. Le pr\u00e9sent de Balmhyr lui rappelle la cour, le poignet trop bas, puis l\u2019espace qu\u2019il lui avait laiss\u00e9 pour essayer. Elle desserre un doigt avant de relever la pointe.",
          "La rapi\u00e8re n\u2019est pas une dette qu\u2019il faudrait rembourser par du courage. Elle demande une prise, une distance et le temps de revenir en garde. Kaylis \u00e9carte le tissu qui fr\u00f4le son bras. Elle veut retrouver la pr\u00e9cision apprise sans avoir besoin du regard de son guide pour d\u00e9cider si elle peut continuer. Son premier mouvement reste volontairement court."
        ],
        "outro": [
          "La pointe s\u2019immobilise \u00e0 l\u2019endroit choisi. Kaylis ne baisse pas imm\u00e9diatement la main : elle v\u00e9rifie qu\u2019elle peut encore revenir sans perdre ses appuis. Son poignet tire un peu. Elle raccourcit le geste suivant au lieu de faire comme si cette fatigue n\u2019existait pas.",
          "Un tissu passe sur le m\u00e9tal clair de Promesse. Balmhyr lui a montr\u00e9 comment tenir ; elle apprend aussi quand desserrer. En rangeant la rapi\u00e8re, Kaylis accroche l\u00e9g\u00e8rement le bord du seuil avec sa botte noire. Elle baisse les yeux et sourit de s\u2019\u00eatre tant occup\u00e9e de ses doigts. Il reste \u00e0 donner la m\u00eame attention \u00e0 ce qui la porte, pas seulement \u00e0 ce qu\u2019elle tient."
        ],
        "rewardEquipmentId": "white-oath-rapier",
        "rewardKind": "weapon"
      },
      {
        "id": "appuis",
        "title": "La poussi\u00e8re sur le cuir noir",
        "imageModelId": "30000019",
        "arenaId": "geo",
        "captain": "30000019",
        "deck": [
          "30000019",
          "49902614",
          "49055457",
          "49902613",
          "49900911",
          "30000011",
          "49900705",
          "30000023",
          "49900711",
          "49900307"
        ],
        "intro": [
          "Kaylis s\u2019accroupit pour ajuster ses bottes noires. Un pli du cuir tire contre sa cheville lorsqu\u2019elle fl\u00e9chit le pied. Elle le redresse, se rel\u00e8ve et recommence. La pierre du seuil ne lui demande aucun exploit ; c\u2019est justement ici qu\u2019elle peut \u00e9couter cette g\u00eane avant qu\u2019elle devienne une douleur.",
          "Sur le terrain d\u2019entra\u00eenement, elle regardait d\u2019abord o\u00f9 aller. Ses pieds devaient suivre. Chaque d\u00e9s\u00e9quilibre lui avait rappel\u00e9 qu\u2019une direction ne suffit pas. Kaylis pose maintenant le talon sans se pr\u00e9cipiter vers la pointe. Elle veut pouvoir c\u00e9der un peu de place sous un choc sans perdre toute la suite du mouvement. Promesse repose contre sa hanche."
        ],
        "outro": [
          "Kaylis recule et reste debout. Elle aurait autrefois appel\u00e9 cela une faute sans regarder plus loin. Cette fois, elle sent le sol sous ses deux pieds et peut choisir de repartir. Les Bottes du Prochain Pas accompagnent le mouvement ; elles n\u2019ont pas eu besoin d\u2019immobiliser sa cheville pour la soutenir.",
          "Une trace claire traverse le cuir noir. Kaylis l\u2019effleure sans essayer de tout nettoyer. Elle se rel\u00e8ve doucement, attentive \u00e0 la lame qui ne heurte plus sa jambe. Un pan de tissu bleu nuit passe pr\u00e8s de la garde. Ses motifs dor\u00e9s accrochent la lumi\u00e8re de ses bras. Il lui reste \u00e0 retenir ce tissu sans le rendre rigide."
        ],
        "rewardEquipmentId": "kaylis-next-step-boots",
        "rewardKind": "shield"
      },
      {
        "id": "ruban",
        "title": "L\u2019\u00e9lan qui revient",
        "imageModelId": "49902701",
        "arenaId": "rainbow",
        "captain": "49902701",
        "deck": [
          "47884687",
          "49902701",
          "47414613",
          "44703335",
          "49900911",
          "30000007",
          "30000027",
          "49902702",
          "49900710",
          "49900711"
        ],
        "intro": [
          "Le premier n\u0153ud est trop serr\u00e9. Kaylis le d\u00e9fait patiemment et reprend le morceau de tissu bleu nuit. Elle laisse passer un doigt sous le lien avant de tirer sur les extr\u00e9mit\u00e9s. Les motifs dor\u00e9s suivent le pli, \u00e9clair\u00e9s un instant par les couleurs de ses tatouages.",
          "Ce ruban ne lui apprend rien qu\u2019elle n\u2019ait v\u00e9cu. Il accompagne les reprises, les gestes interrompus, les moments o\u00f9 il faut retrouver assez d\u2019\u00e9lan pour faire autre chose que subir le prochain choc. Kaylis lib\u00e8re sa main et teste le mouvement de sa taille. Si les pr\u00e9sences autour d\u2019elle se rar\u00e9fient, elle veut encore pouvoir regarder devant elle et choisir une r\u00e9ponse."
        ],
        "outro": [
          "Kaylis prend une respiration avant de relever les yeux. L\u2019effort lui a co\u00fbt\u00e9, et elle ne cherche pas \u00e0 le nier. Le cuir tient sous ses pieds, Promesse a retrouv\u00e9 sa main et le Ruban des Couleurs suit le d\u00e9placement sans tirer. Elle peut encore agir sans pr\u00e9tendre que rien ne l\u2019a touch\u00e9e.",
          "Au seuil de la maison, les objets ont repris leur place. Les bottes noires reposent sur la pierre, le m\u00e9tal attend contre sa hanche et le tissu accompagne le courant d\u2019air. La Tour de Fer ne lui offre aucune r\u00e9ponse d\u2019avance. Kaylis v\u00e9rifie qu\u2019elle peut bouger, puis avance. Son attention accompagne cette fois le pas jusqu\u2019au bout."
        ],
        "rewardEquipmentId": "kaylis-colours-ribbon",
        "rewardKind": "relic"
      }
    ]
  }
];
  function catalogue(){
    return definitions.map(book=>({...copy(book),revision}));
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
        if(stage.deck.some(id=>!engine.byId[id]||engine.byId[id].collaboration))throw Error('Carte native publiee requise : '+book.id+'/'+stage.id);
        const team=Team.fromPreset({name:book.subtitle,cards:stage.deck});
        team.captain=stage.captain;
        const errors=engine.validateComposition(team);if(errors.length)throw Error('Composition de parcours invalide : '+book.id+'/'+stage.id+' '+errors.join(' '));
        if(!team.formation.includes(stage.captain))throw Error('Capitaine de parcours absent : '+book.id+'/'+stage.id);
      }
    }
    return books.map(book=>({...book,stages:combatStages(book)}));
  }
  return {revision,catalogue,combatStages,validate};
});
