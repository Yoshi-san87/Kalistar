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
    "rewardModelId": "30000001",
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
        "title": "Et la nuit \u00e9couta",
        "imageModelId": "30000001",
        "arenaId": "electro",
        "captain": "30000001",
        "deck": [
          "30000013",
          "49800201",
          "30000001",
          "49900710",
          "49900702",
          "49900313",
          "49902604",
          "44263045",
          "49902702",
          "49901402"
        ],
        "intro": [
          "La nuit gagne la casse. Momo garde la fl\u00fbte contre lui. Il conna\u00eet la place des chaussures, l\u2019heure des repas, les gestes pour faire dispara\u00eetre une tache. Mais aucun ordre ne lui apprend \u00e0 choisir sa propre place.",
          "Quelques marches offrent un peu de hauteur. Taulio d\u00e9gage le passage, puis laisse son ami monter seul. Momo s\u2019assied face aux carcasses. Elles sont toujours l\u00e0 ; leur silence lui fait moins peur. Sa petite lumi\u00e8re bleue ne cherche plus la porte de la maison.",
          "Il pose ses doigts sur les clefs. La m\u00e9lodie revient, avec ce geste familier qu\u2019il ne sait pas expliquer. Personne ne lui demande de jouer ni d\u2019\u00eatre utile. Cette fois, il voudrait aller jusqu\u2019au bout sans s\u2019excuser d\u2019\u00eatre diff\u00e9rent."
        ],
        "outro": [
          "Une note flotte au-dessus des marches. Momo ne l\u2019arr\u00eate pas. La lumi\u00e8re glisse hors de la fl\u00fbte et se m\u00eale au bleu du ciel. Il termine la phrase, puis en commence une autre, plus douce. Cette fois, il joue pour lui.",
          "Taulio reste en retrait, sans demander davantage. Momo regarde ses mains, les m\u00eames que l\u2019on jugeait trop lentes. Elles viennent de faire quelque chose que personne ne leur avait ordonn\u00e9. Il ne comprend pas cette lumi\u00e8re, mais cesse d\u2019en avoir honte.",
          "Une main pench\u00e9e sur un \u00e9tabli revient dans la m\u00e9lodie. Le visage lui \u00e9chappe. Momo ne force pas le souvenir : il garde son ami pr\u00e8s de lui et cette envie de savoir. Ce n\u2019\u00e9tait peut-\u00eatre pas un d\u00e9faut. Quelque chose, en lui, se souvenait. Et la nuit \u00e9coutait."
        ]
      }
    ],
    "bonusReveal": {
      "title": "Ce qu\u2019il veut retrouver",
      "paragraphs": [
        "Apr\u00e8s cette nuit, Momo ne range pas la fl\u00fbte. La main entrevue dans sa m\u00e9moire a fait na\u00eetre une question qu\u2019il ne peut plus remettre \u00e0 plus tard. Avant de partir, il lui reste \u00e0 \u00e9couter, \u00e0 se pr\u00e9parer et \u00e0 trouver comment demander de l\u2019aide."
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
    "rewardModelId": "30000007",
    "element": "MINERO",
    "stages": [
      {
        "id": "horizon",
        "title": "Le fr\u00e8re qui refusait d\u2019\u00eatre second",
        "imageModelId": "30000018",
        "arenaId": "trone-fer",
        "captain": "30000018",
        "deck": [
          "49900306",
          "30000018",
          "49900906",
          "30000023",
          "49902603",
          "30000024",
          "30000025",
          "49900307",
          "49902613",
          "49902605"
        ],
        "intro": [
          "Apr\u00e8s la mort d\u2019Igmhar le Vertueux, Balmhyr devait devenir roi. Il connaissait les salles de Durane, les devoirs qu\u2019on lui avait enseign\u00e9s et la voix de son fr\u00e8re cadet. Il avait moins bien compris ce que Lok entendait, lui, chaque fois qu\u2019on rappelait lequel des deux \u00e9tait l\u2019a\u00een\u00e9. Les d\u00e9cisions provisoires s\u2019\u00e9taient accumul\u00e9es. Lorsque Balmhyr avait voulu les discuter, les portes qu\u2019il connaissait n\u2019avaient plus ouvert de la m\u00eame fa\u00e7on.",
          "Lok refusait d\u2019\u00eatre second. Son fr\u00e8re devenait un obstacle, surtout lorsqu\u2019il s\u2019opposait aux pers\u00e9cutions contre les peuples mut\u00e9s. Balmhyr croyait encore pouvoir lui parler. Il allait d\u00e9couvrir ce qu\u2019une trahison retire \u00e0 une voix famili\u00e8re."
        ],
        "outro": [
          "Lok ne lui laisse pas seulement un tr\u00f4ne vide \u00e0 regretter. Il le fait bannir loin de Durane, dans un territoire o\u00f9 un champ magn\u00e9tique reconna\u00eetra son identit\u00e9 et l\u2019emp\u00eachera de revenir. Balmhyr cherche d\u2019abord une faille dans l\u2019ordre, un homme qui acceptera d\u2019entendre son nom autrement que comme une consigne \u00e0 ex\u00e9cuter. Son fr\u00e8re a pr\u00e9vu le silence apr\u00e8s son d\u00e9part.",
          "Dans le royaume, on parlera d\u2019un disparu, puis d\u2019un mort possible. Balmhyr, lui, demeure vivant. Il regarde la route et pense \u00e0 Madania. Il voudrait lui dire o\u00f9 il est, avant m\u00eame de lui expliquer comment celui qu\u2019il appelait son fr\u00e8re a pu l\u2019y envoyer."
        ]
      },
      {
        "id": "durane",
        "title": "Une prison sans murs",
        "imageModelId": "30000007",
        "arenaId": "minero",
        "captain": "30000024",
        "deck": [
          "30000024",
          "30000025",
          "49900308",
          "30000023",
          "49902603",
          "49900306",
          "49900705",
          "49900906",
          "49902613",
          "49902605"
        ],
        "intro": [
          "La prison ne ressemble pas \u00e0 un cachot. Balmhyr peut marcher entre les maisons du canyon, entretenir son abri, recevoir Belrog. Mais sur la route de Durane, une ancienne borne r\u00e9agit \u00e0 son approche. Une lumi\u00e8re bleue remonte du poignet au coude ; son souffle se coupe. Devant lui, la poussi\u00e8re reste libre. D\u2019autres y passent sans m\u00eame ralentir.",
          "Il recommence, puis apprend \u00e0 reconna\u00eetre l\u2019instant o\u00f9 son corps ne supportera plus d\u2019insister. Les appareils ne portent pas sa voix jusqu\u2019\u00e0 Madania. Certains soirs, il pr\u00e9pare pourtant les mots qu\u2019il lui dira, comme si une phrase assez exacte pouvait enfin traverser la limite."
        ],
        "outro": [
          "Les ann\u00e9es prennent la forme de gestes r\u00e9p\u00e9t\u00e9s : chercher l\u2019eau, r\u00e9parer la maison, s\u2019arr\u00eater avant la borne. Balmhyr sait que ces gestes le maintiennent vivant. Il sait aussi qu\u2019ils peuvent finir par ressembler \u00e0 un choix, vus de loin. Il redoute que Madania croie un jour qu\u2019il a pr\u00e9f\u00e9r\u00e9 ce silence \u00e0 leur vie.",
          "Puis Kaylis arrive avec ses compagnons. Le nain leur ouvre sa porte, leur donne du temps, observe des capacit\u00e9s qu\u2019il ne comprend pas enti\u00e8rement. L\u2019espoir de rentrer lui revient avec une honte pr\u00e9cise : il pourrait \u00eatre tent\u00e9 de leur demander davantage qu\u2019ils n\u2019ont choisi de lui offrir. Il faudra le leur dire."
        ]
      },
      {
        "id": "guide",
        "title": "Le second pas",
        "imageModelId": "49055457",
        "arenaId": "minero",
        "captain": "49055457",
        "deck": [
          "30000007",
          "49055457",
          "47414613",
          "49902613",
          "49900711",
          "30000019",
          "49900705",
          "49900704",
          "30000023",
          "49902603"
        ],
        "intro": [
          "Au bord de la gorge, Balmhyr montre la limite. Kaylis a entendu ce qu\u2019il lui avait cach\u00e9 : son sang royal, son fr\u00e8re et l\u2019espoir qu\u2019il avait plac\u00e9 dans ses pouvoirs. Elle veut l\u2019aider sans devenir la solution \u00e0 toutes ses portes ferm\u00e9es. Si elle \u00e9choue, il ne lui demandera pas de recommencer jusqu\u2019\u00e0 tomber. Balmhyr accepte, cette fois en la regardant.",
          "Pr\u00e8s de la borne, elle cherche une pulsation. Nazar suit les signes, Lanio compte, Baba attend pr\u00e8s du nain. La premi\u00e8re tentative \u00e9choue. Balmhyr avance trop t\u00f4t et doit reculer. Kaylis retire sa main. Il lui faudra attendre son signal, m\u00eame si la route est juste l\u00e0."
        ],
        "outro": [
          "Le premier pas reste difficile. Au second, rien ne retient Balmhyr. Il regarde ses bottes, revient sur sa trace, avance encore. Sa main monte \u00e0 sa bouche pour retenir un rire qui lui \u00e9chappe malgr\u00e9 tout. Pendant des ann\u00e9es, il avait imagin\u00e9 une grande victoire ; la libert\u00e9 commence par cette poussi\u00e8re qu\u2019il peut traverser.",
          "Kaylis s\u2019assied, les bras tremblants. Elle ne veut pas que sa r\u00e9ussite devienne une promesse pour la Tour de Fer. Balmhyr revient jusqu\u2019\u00e0 elle et s\u2019assied de l\u2019autre c\u00f4t\u00e9 de l\u2019ancienne limite. Ils attendent. Pour rejoindre Madania, il devra encore parcourir la route ; aujourd\u2019hui, il peut enfin choisir de ne pas partir tout de suite."
        ]
      },
      {
        "id": "portes",
        "title": "La maison qui avait continu\u00e9 de vivre",
        "imageModelId": "49900802",
        "arenaId": "minero",
        "captain": "30000007",
        "deck": [
          "30000007",
          "49900705",
          "49900307",
          "49902613",
          "49902605",
          "49900308",
          "49900906",
          "49902701",
          "30000023",
          "49902603"
        ],
        "intro": [
          "Madania balaie ses marches lorsque Balmhyr prononce son nom. Elle se retourne, laisse tomber le manche, vient toucher son visage avant de le serrer contre elle. Il retrouve l\u2019odeur du savon et de la poussi\u00e8re sur sa manche. Il voudrait expliquer les ann\u00e9es d\u2019un seul souffle. Elle le fait entrer.",
          "La maison n\u2019est pas rest\u00e9e immobile pour lui. Un pot s\u2019est cass\u00e9, la table a \u00e9t\u00e9 r\u00e9par\u00e9e ; Madania a re\u00e7u des visites, v\u00e9cu, dout\u00e9 et parfois d\u00e9branch\u00e9 les appareils pour dormir. Avant d\u2019ouvrir le coffre qu\u2019elle a gard\u00e9, elle lui demande ce qu\u2019il attend de ceux qui l\u2019accompagnent. Balmhyr doit r\u00e9pondre avant de tendre la main."
        ],
        "outro": [
          "Dans le coffre repose le Gant de Fer, la plus grande relique de Durane. Avant le bannissement, il avait \u00e9t\u00e9 cach\u00e9 chez Madania. Elle en a pr\u00e9serv\u00e9 le m\u00e9canisme comme le secret, malgr\u00e9 les fouilles et les rumeurs. Balmhyr reconna\u00eet l\u2019usure des jointures ; sa femme lui montre la courroie qu\u2019il faut desserrer. Le retrouver ne lui rend pas leurs ann\u00e9es.",
          "Le gant amplifie son Minero, pas son droit \u00e0 d\u00e9cider pour les autres. Madania pose sa paume contre la sienne, le m\u00e9tal entre leurs doigts. Balmhyr est revenu aupr\u00e8s d\u2019elle. Il peut maintenant regarder vers le royaume sans oublier la vie qui a continu\u00e9 ici pendant son absence."
        ]
      }
    ],
    "bonusReveal": {
      "title": "Le retour ne s\u2019arr\u00eate pas au seuil",
      "paragraphs": [
        "Madania a rendu le gant, pas effac\u00e9 les ann\u00e9es. Lok tient encore Durane. Avant de l\u2019affronter, Balmhyr reprend sa hache, pr\u00e9pare de quoi prot\u00e9ger le passage vers le Conseil et mesure ce que porter la relique lui demandera lorsqu\u2019il retrouvera son fr\u00e8re."
      ]
    },
    "bonusStages": [
      {
        "id": "serment",
        "title": "La hache du roi d\u00e9chu",
        "imageModelId": "30000007",
        "arenaId": "minero",
        "captain": "30000007",
        "deck": [
          "30000007",
          "49900906",
          "49900308",
          "30000023",
          "49902603",
          "49900306",
          "49900705",
          "49900704",
          "49902613",
          "49902605"
        ],
        "intro": [
          "Balmhyr reprend sa hache avant de quitter la maison. Ses doigts connaissent le manche autrement que les attaches du gant : cette arme appartient aux ann\u00e9es o\u00f9 personne ne venait s\u2019incliner devant lui. Il v\u00e9rifie la prise, laisse son \u00e9paule trouver l\u2019\u00e9quilibre. Madania le regarde pr\u00e9parer ce d\u00e9part qui ne ressemble pas au pr\u00e9c\u00e9dent.",
          "Il pense \u00e0 Lok, puis interrompt le mouvement commenc\u00e9 trop vite. La col\u00e8re raccourcit ce qu\u2019il voit autour de lui. Kaylis est l\u00e0, les autres aussi. Il faudra pouvoir arr\u00eater une attaque sans laisser la suivante les atteindre. Balmhyr recommence plus lentement, en gardant une place derri\u00e8re son bras."
        ],
        "outro": [
          "La lame s\u2019immobilise l\u00e0 o\u00f9 il l\u2019a voulu. Balmhyr ne cherche pas un coup plus grand. Il v\u00e9rifie qu\u2019il peut revenir en garde, d\u00e9placer son poids et laisser passer quelqu\u2019un \u00e0 ses c\u00f4t\u00e9s. La Hache du Roi D\u00e9chu reste lourde ; il retrouve surtout la responsabilit\u00e9 de la retenir.",
          "Il la porte sans la lever lorsqu\u2019il quitte le seuil. Madania n\u2019a pas demand\u00e9 qu\u2019il renonce \u00e0 rentrer dans son royaume. Elle lui a demand\u00e9 de voir les personnes qui feront ce chemin avec lui. Devant les acc\u00e8s du Conseil, cette attention devra prendre une forme plus concr\u00e8te encore : un bras qui tient, une protection et assez de largeur pour traverser."
        ],
        "rewardEquipmentId": "fallen-king-axe",
        "rewardKind": "weapon"
      },
      {
        "id": "rempart",
        "title": "Un passage vers le Conseil",
        "imageModelId": "49900306",
        "arenaId": "trone-fer",
        "captain": "49900306",
        "deck": [
          "49900306",
          "49900705",
          "49900307",
          "49902613",
          "49902605",
          "30000024",
          "49900906",
          "49900308",
          "30000023",
          "49902603"
        ],
        "intro": [
          "Dans le couloir du Conseil, les voix arrivent avant les visages. Balmhyr reconna\u00eet celle de Lok. Sa main se ferme, puis il ajuste le Rempart de Durane contre son bras. La largeur du bouclier le rassure jusqu\u2019\u00e0 ce qu\u2019il remarque la place qu\u2019il retire aux autres. Il pivote pour d\u00e9gager le passage.",
          "Le gant reste envelopp\u00e9 : il ne doit pas \u00eatre reconnu trop t\u00f4t. Kaylis porte les dossiers, Farouk surveille les acc\u00e8s. Balmhyr ne leur demande pas de regarder son retour. Il v\u00e9rifie o\u00f9 ils pourront reculer si les portes se ferment. Derri\u00e8re la pierre, la col\u00e8re de Lok couvre de plus en plus souvent les autres voix."
        ],
        "outro": [
          "Quand les gardes se mettent en mouvement, Balmhyr tient le passage au lieu de les poursuivre. Le choc traverse le Rempart jusque dans son \u00e9paule. Il garde les pieds au sol, assez de biais pour que les autres franchissent l\u2019ouverture. La protection ne vaut pas seulement par ce qu\u2019elle arr\u00eate, mais par ceux qu\u2019elle laisse avancer.",
          "Dans la salle, son nom circule avant qu\u2019il ait pu le dire. Il d\u00e9couvre le Gant de Fer. Certains reconnaissent l\u2019h\u00e9ritier qu\u2019on disait disparu. Balmhyr leur demande de rester debout, d\u2019aider ceux qui en ont besoin. Lok regarde la relique, puis son fr\u00e8re. Sa main n\u2019a pas quitt\u00e9 sa dague."
        ],
        "rewardEquipmentId": "durane-rampart",
        "rewardKind": "shield"
      },
      {
        "id": "empreinte",
        "title": "Les deux fr\u00e8res",
        "imageModelId": "30000018",
        "arenaId": "trone-fer",
        "captain": "30000018",
        "deck": [
          "30000024",
          "30000018",
          "49900906",
          "49902613",
          "49902605",
          "49900306",
          "49900705",
          "49900307",
          "30000023",
          "49902603"
        ],
        "intro": [
          "Lok ne regarde pas un souvenir revenu prendre place. Il voit son fr\u00e8re a\u00een\u00e9 devant lui, avec le gant qu\u2019il n\u2019a jamais pu lui enlever. La dague monte. Balmhyr pare, r\u00e9duit la distance, cherche \u00e0 emp\u00eacher Lok de revenir vers les si\u00e8ges. Sous le m\u00e9tal, sa main retrouve la peur de la limite invisible.",
          "Puis le champ le saisit de nouveau. Le gant vibre, son dos heurte le mur et son souffle se brise. Toute la force retrouv\u00e9e ne suffit pas \u00e0 le lib\u00e9rer. Kaylis voit ses doigts retenus dans le fer. Balmhyr doit encore accepter qu\u2019une autre main puisse l\u2019aider, jusque dans cette salle o\u00f9 il voulait revenir en roi."
        ],
        "outro": [
          "Kaylis rompt la pression. Balmhyr retombe, se rel\u00e8ve et saisit le poignet de Lok tandis qu\u2019elle \u00e9carte la dague. Farouk ramasse l\u2019arme. Cette fois, le fr\u00e8re cadet ne peut plus prolonger sa col\u00e8re en ordre. Lorsque les gardes le prennent en charge, il est vivant, d\u00e9sarm\u00e9. Balmhyr ne l\u2019embrasse pas ; il ne demande pas non plus qu\u2019on le tue.",
          "Lok prononce le nom de Madania, puis quelques mots de regret. Balmhyr les entend sans leur laisser effacer le reste. Il baisse enfin le Gant de Fer. Porter la relique ne lui demande pas d\u2019\u00e9craser son fr\u00e8re vaincu. Il laisse Lok sous garde, ouvre les passages pour les secours et reprend la responsabilit\u00e9 de Durane. Le royaume lui revient avec des habitants \u00e0 prot\u00e9ger, pas avec des ann\u00e9es qu\u2019il pourrait recommencer."
        ],
        "rewardEquipmentId": "mythic-iron-gauntlet",
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
