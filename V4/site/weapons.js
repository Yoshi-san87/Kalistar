(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarWeapons=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const weapons=[
    {id:'fallen-king-axe',slot:'weapon',name:'Hache du Roi D\u00e9chu',family:'Hache',visual:'axe',art:'fallen-king-axe-v2',
      restrictions:{characterIds:['balmhyr']},effect:{trigger:'LAST_STANDING',stat:'ATK',value:30,duration:'WHILE_TRUE'},
      condition:'Dernier combattant actif de son \u00e9quipe.',
      lore:'Quand il ne reste plus personne derri\u00e8re lui, Balmhyr retrouve le poids du roi qu\u2019il fut.'},
    {id:'little-joys-flute',slot:'weapon',name:'La Fl\u00fbte des Petits Bonheurs',family:'Instrument',visual:'flute',art:'little-joys-flute-v2',
      restrictions:{characterIds:['momo']},effect:{trigger:'AFTER_SUPPORT',supports:['luck','mana'],stat:'DEF',value:30,duration:'NEXT_DUEL'},
      condition:'Apr\u00e8s un nouveau tr\u00e8fle ou une nouvelle potion, le b\u00e9n\u00e9ficiaire gagne +30 DEF pour son prochain duel. Une seule charge.',
      lore:'Pour Momo, cette fl\u00fbte n\u2019est pas une arme. Quand il joue, les machines grincent moins fort, les visages semblent moins lourds et, pendant quelques instants, m\u00eame les choses cass\u00e9es paraissent heureuses.'}
    ,...[
      {
        "id": "white-oath-rapier",
        "slot": "weapon",
        "name": "La Promesse Blanche",
        "family": "Epée courte",
        "visual": "axe",
        "art": "white-oath-rapier-v1",
        "restrictions": {
          "characterIds": [
            "kaylis"
          ],
          "families": [
            "Epée courte"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "ATK",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "outnumbered": true
          }
        },
        "condition": "Moins de combattants actifs que l’adversaire.",
        "lore": "Quand les leurs sont moins nombreux, Kaylis tient la ligne que Balmhyr lui a apprise. Il lui a offert cette rapière blanche non pour gagner un royaume, mais pour choisir elle-même où poser le prochain pas.",
        "collectible": {
          "number": "ARM-003",
          "illustration": "white-oath-rapier-v1.webp",
          "flavour": "Un présent pour choisir son propre chemin.",
          "alt": "La Promesse Blanche : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "brotherhood",
        "slot": "weapon",
        "name": "Fraternité",
        "family": "Epée longue",
        "visual": "flute",
        "art": "brotherhood-v1",
        "restrictions": {
          "characterIds": [
            "tidus-ff10"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "DEF",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "activeAtMost": 2
          }
        },
        "condition": "Au plus deux combattants actifs dans l’équipe.",
        "lore": "La lame bleue garde quelque chose de Besaid : la mer, une confiance reçue et des mains que l'on refuse de lâcher. Quand les gardiens se font rares, Tidus reste auprès des siens.",
        "collectible": {
          "number": "ARM-004",
          "illustration": "brotherhood-v1.webp",
          "flavour": "La mer veille encore entre ses mains.",
          "alt": "Fraternité : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "virtuous-contract",
        "slot": "weapon",
        "name": "Virtuous Contract",
        "family": "Katana",
        "visual": "axe",
        "art": "virtuous-contract-v1",
        "restrictions": {
          "characterIds": [
            "2b-nier"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "ATK",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "outnumbered": true
          }
        },
        "condition": "Moins de combattants actifs que l’adversaire.",
        "lore": "Une lame blanche, presque silencieuse. Lorsque le front se vide, 2B resserre sa prise : son prochain geste doit encore ouvrir une issue à ceux qui restent.",
        "collectible": {
          "number": "ARM-005",
          "illustration": "virtuous-contract-v1.webp",
          "flavour": "Une ligne blanche dans le silence.",
          "alt": "Virtuous Contract : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "virtuous-treaty",
        "slot": "weapon",
        "name": "Virtuous Treaty",
        "family": "Epée longue",
        "visual": "axe",
        "art": "virtuous-treaty-v1",
        "restrictions": {
          "characterIds": [
            "2b-nier"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "DEF",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "activeAtMost": 2
          }
        },
        "condition": "Au plus deux combattants actifs dans l’équipe.",
        "lore": "La grande lame n'est pas seulement un poids à porter. Entre le danger et un dernier compagnon, 2B en fait un rempart, le temps d'un souffle que personne ne lui a ordonné de protéger.",
        "collectible": {
          "number": "ARM-006",
          "illustration": "virtuous-treaty-v1.webp",
          "flavour": "Porter une lame. Préserver une présence.",
          "alt": "Virtuous Treaty : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "socom",
        "slot": "weapon",
        "name": "SOCOM",
        "family": "Gun",
        "visual": "axe",
        "art": "socom-v1",
        "restrictions": {
          "characterIds": [
            "solid-snake-mgs"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "ATK",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "reserveAtMost": 0
          }
        },
        "condition": "Aucun combattant en réserve.",
        "lore": "Quand le renfort ne viendra plus, Snake vérifie une dernière fois sa prise. Ce pistolet ne promet ni gloire ni fracas : seulement le geste précis qui permet encore de rentrer.",
        "collectible": {
          "number": "ARM-007",
          "illustration": "socom-v1.webp",
          "flavour": "Le silence avant le dernier passage.",
          "alt": "SOCOM : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "lulu-mog",
        "slot": "weapon",
        "name": "Poupée Mog",
        "family": "Tome",
        "visual": "flute",
        "art": "lulu-mog-v1",
        "restrictions": {
          "characterIds": [
            "lulu-ff10"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "DEF",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "activeAtMost": 2
          }
        },
        "condition": "Au plus deux combattants actifs dans l’équipe.",
        "lore": "Des coutures fatiguées retiennent bien plus que du coton. Lulu garde son Mog près d'elle lorsque les voix s'éteignent autour du groupe, comme une petite présence qui refuse de céder.",
        "collectible": {
          "number": "ARM-008",
          "illustration": "lulu-mog-v1.webp",
          "flavour": "Un peu de douceur au bord de l'ombre.",
          "alt": "Poupée Mog : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "leopard-lightning",
        "slot": "weapon",
        "name": "La Griffe d'Orage",
        "family": "Fouet",
        "visual": "flute",
        "art": "leopard-lightning-v1",
        "restrictions": {
          "characterIds": [
            "rikka"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "ATK",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "outnumbered": true
          }
        },
        "condition": "Moins de combattants actifs que l’adversaire.",
        "lore": "Rikka a tressé des conducteurs sous le cuir tacheté de son fouet. Ses éclats ne cherchent pas à remplir la rue de lumière : ils dessinent la brèche étroite par laquelle elle fera passer les siens.",
        "collectible": {
          "number": "ARM-009",
          "illustration": "leopard-lightning-v1.webp",
          "flavour": "Une étincelle. Une issue.",
          "alt": "La Griffe d'Orage : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "mythic-iron-gauntlet",
        "slot": "weapon",
        "name": "Le Serment de Fer",
        "family": "Poing",
        "visual": "axe",
        "art": "mythic-iron-gauntlet-v1",
        "restrictions": {
          "characterIds": [
            "balmhyr"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "DEF",
          "value": 25,
          "duration": "WHILE_TRUE",
          "when": {
            "activeAtMost": 1
          }
        },
        "condition": "Dernier combattant actif de son équipe.",
        "lore": "Le gant a survécu aux portes de Durane et aux années sans trône. Quand Balmhyr se retrouve seul debout, il referme cette main de fer : ce qu'il protège vaut davantage que ce qu'il a perdu.",
        "collectible": {
          "number": "ARM-010",
          "illustration": "mythic-iron-gauntlet-v1.webp",
          "flavour": "Le roi est tombé. Sa main tient encore.",
          "alt": "Le Serment de Fer : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "post-bow",
        "slot": "weapon",
        "name": "L'Arc des Dernières Lettres",
        "family": "Arc",
        "visual": "axe",
        "art": "post-bow-v1",
        "restrictions": {
          "characterIds": [
            "cana"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "DEF",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "reserveAtMost": 0
          }
        },
        "condition": "Aucun combattant en réserve.",
        "lore": "Cana a fixé au bois de son arc un petit étui étanche pour le courrier. Quand toutes les routes de renfort se ferment, elle poursuit la sienne : quelque part, quelqu'un attend encore une lettre.",
        "collectible": {
          "number": "ARM-011",
          "illustration": "post-bow-v1.webp",
          "flavour": "Il reste toujours quelqu'un qui attend.",
          "alt": "L'Arc des Dernières Lettres : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "grimoire-weiss",
        "slot": "weapon",
        "name": "Grimoire Weiss",
        "family": "Tome",
        "visual": "flute",
        "art": "grimoire-weiss-v1",
        "restrictions": {
          "characterIds": [
            "nier-replicant"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "DEF",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "activeAtMost": 2
          }
        },
        "condition": "Au plus deux combattants actifs dans l’équipe.",
        "lore": "Le livre proteste contre la poussière, le danger et l'entêtement de Nier. Pourtant, lorsque leurs compagnons se font rares, ses pages demeurent ouvertes. Certaines promesses méritent bien une dernière objection.",
        "collectible": {
          "number": "ARM-012",
          "illustration": "grimoire-weiss-v1.webp",
          "flavour": "Il proteste. Puis tourne encore une page.",
          "alt": "Grimoire Weiss : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "gen-mechanical-arm",
        "slot": "weapon",
        "name": "Le Bras qui Insiste",
        "family": "Projectile",
        "visual": "flute",
        "art": "gen-mechanical-arm-v1",
        "restrictions": {
          "characterIds": [
            "gen"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "ATK",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "reserveAtMost": 0
          }
        },
        "condition": "Aucun combattant en réserve.",
        "lore": "Gen a réparé ce bras avec des pièces qui n'étaient pas faites pour vivre ensemble. Quand la réserve est vide, un relais tient encore. Il connaît ce bruit-là : ce n'est pas la fin, seulement une autre panne.",
        "collectible": {
          "number": "ARM-013",
          "illustration": "gen-mechanical-arm-v1.webp",
          "flavour": "Une autre panne. Pas encore la dernière.",
          "alt": "Le Bras qui Insiste : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "violet-reaping",
        "slot": "weapon",
        "name": "La Faux du Siège Vacant",
        "family": "Faucille",
        "visual": "flute",
        "art": "violet-reaping-v1",
        "restrictions": {
          "characterIds": [
            "voloden"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "ATK",
          "value": 25,
          "duration": "WHILE_TRUE",
          "when": {
            "activeAtMost": 1
          }
        },
        "condition": "Dernier combattant actif de son équipe.",
        "lore": "Repliée, elle ressemble à une canne de cérémonie. Déployée, sa longue lame violette rappelle à Voloden ce qu'un siège vide exige de celui qui demeure : porter seul une décision trop lourde.",
        "collectible": {
          "number": "ARM-014",
          "illustration": "violet-reaping-v1.webp",
          "flavour": "Le silence a gardé toute sa longueur.",
          "alt": "La Faux du Siège Vacant : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "mantis-mask",
        "slot": "weapon",
        "name": "Le Masque du Silence",
        "family": "Orbe",
        "visual": "flute",
        "art": "mantis-mask-v1",
        "restrictions": {
          "characterIds": [
            "psycho-mantis-mgs"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "DEF",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "outnumbered": true
          }
        },
        "condition": "Moins de combattants actifs que l’adversaire.",
        "lore": "Derrière le masque, les pensées étrangères deviennent un bourdonnement lointain. Quand le cercle se resserre autour de lui, Mantis y cherche moins une menace qu'un instant de silence.",
        "collectible": {
          "number": "ARM-015",
          "illustration": "mantis-mask-v1.webp",
          "flavour": "Pour ne plus entendre tout le monde.",
          "alt": "Le Masque du Silence : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "revolver-gunblade",
        "slot": "weapon",
        "name": "Revolver",
        "family": "Epée longue",
        "visual": "axe",
        "art": "revolver-gunblade-v1",
        "restrictions": {
          "characterIds": [
            "squall-ff8"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "ATK",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "activeAtMost": 2
          }
        },
        "condition": "Au plus deux combattants actifs dans l’équipe.",
        "lore": "Squall connaît le poids exact de sa gunblade. Quand les rangs s'éclaircissent, il avance sans discours : il faut parfois une lame tenue fermement pour que les autres trouvent encore leur place.",
        "collectible": {
          "number": "ARM-016",
          "illustration": "revolver-gunblade-v1.webp",
          "flavour": "Rester, sans avoir à le promettre.",
          "alt": "Revolver : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "wolf-steel",
        "slot": "weapon",
        "name": "L'Acier du Loup",
        "family": "Epée longue",
        "visual": "axe",
        "art": "wolf-steel-v1",
        "restrictions": {
          "characterIds": [
            "geralt-witcher"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "DEF",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "outnumbered": true
          }
        },
        "condition": "Moins de combattants actifs que l’adversaire.",
        "lore": "L'acier accompagne les routes où les contrats ne disent jamais toute la vérité. Geralt lève cette lame lorsque le nombre devient une menace, sans demander à ceux qu'il protège ce qu'ils pourront payer.",
        "collectible": {
          "number": "ARM-017",
          "illustration": "wolf-steel-v1.webp",
          "flavour": "Tous les contrats ne se paient pas.",
          "alt": "L'Acier du Loup : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "wolf-silver",
        "slot": "weapon",
        "name": "L'Argent du Loup",
        "family": "Epée longue",
        "visual": "axe",
        "art": "wolf-silver-v1",
        "restrictions": {
          "characterIds": [
            "geralt-witcher"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "ATK",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "reserveAtMost": 0
          }
        },
        "condition": "Aucun combattant en réserve.",
        "lore": "L'argent porte les marques de nuits trop longues. Quand nul ne peut plus prendre le relais, Geralt garde le fil propre : il lui reste un travail à finir avant que le jour revienne.",
        "collectible": {
          "number": "ARM-018",
          "illustration": "wolf-silver-v1.webp",
          "flavour": "Finir le travail avant l'aube.",
          "alt": "L'Argent du Loup : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "kaine-saw",
        "slot": "weapon",
        "name": "La Lame de Kainé",
        "family": "Epée longue",
        "visual": "axe",
        "art": "kaine-saw-v1",
        "restrictions": {
          "characterIds": [
            "kaine-replicant"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "ATK",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "outnumbered": true
          }
        },
        "condition": "Moins de combattants actifs que l’adversaire.",
        "lore": "Le tranchant dentelé accroche la lumière comme sa voix accroche les silences. Kainé ne demande pas qu'on la comprenne. Elle se place simplement là où le nombre commence à faire peur.",
        "collectible": {
          "number": "ARM-019",
          "illustration": "kaine-saw-v1.webp",
          "flavour": "Elle ne recule pas pour faire plaisir.",
          "alt": "La Lame de Kainé : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "buster-sword",
        "slot": "weapon",
        "name": "Buster Sword",
        "family": "Epée longue",
        "visual": "axe",
        "art": "buster-sword-v1",
        "restrictions": {
          "characterIds": [
            "cloud-ff7"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "ATK",
          "value": 25,
          "duration": "WHILE_TRUE",
          "when": {
            "activeAtMost": 1
          }
        },
        "condition": "Dernier combattant actif de son équipe.",
        "lore": "Cette épée est plus lourde que l'acier dont elle est faite. Lorsque Cloud reste seul en première ligne, les promesses reçues ne deviennent pas des mots : elles l'aident à faire encore un pas.",
        "collectible": {
          "number": "ARM-020",
          "illustration": "buster-sword-v1.webp",
          "flavour": "Des promesses plus lourdes que l'acier.",
          "alt": "Buster Sword : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "psg1",
        "slot": "weapon",
        "name": "PSG1",
        "family": "Gun",
        "visual": "axe",
        "art": "psg1-v1",
        "restrictions": {
          "characterIds": [
            "sniper-wolf-mgs"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "ATK",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "reserveAtMost": 0
          }
        },
        "condition": "Aucun combattant en réserve.",
        "lore": "Wolf attend que les mouvements cessent de mentir. Même lorsque plus personne n'est en réserve, sa respiration ne se presse pas. Le long canon demeure droit, et le froid devient une mesure.",
        "collectible": {
          "number": "ARM-021",
          "illustration": "psg1-v1.webp",
          "flavour": "Le froid apprend à ne pas se presser.",
          "alt": "PSG1 : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "single-action-army",
        "slot": "weapon",
        "name": "Single Action Army",
        "family": "Gun",
        "visual": "axe",
        "art": "single-action-army-v1",
        "restrictions": {
          "characterIds": [
            "revolver-ocelot-mgs"
          ]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "ATK",
          "value": 20,
          "duration": "WHILE_TRUE",
          "when": {
            "outnumbered": true
          }
        },
        "condition": "Moins de combattants actifs que l’adversaire.",
        "lore": "Ocelot fait rouler le poids du revolver dans sa paume avant de le stabiliser. Être moins nombreux n'a jamais suffi à le faire taire : il aime les situations dont chaque geste semble déjà un défi.",
        "collectible": {
          "number": "ARM-022",
          "illustration": "single-action-army-v1.webp",
          "flavour": "Le défi tient dans une seule main.",
          "alt": "Single Action Army : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "wardens-spear",
        "slot": "weapon",
        "name": "La Veille des Remparts",
        "family": "Lance",
        "visual": "axe",
        "art": "wardens-spear-v1",
        "restrictions": {
          "jobs": [
            "GARDIEN",
            "GARDIENNE"
          ],
          "families": ["Lance"]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "DEF",
          "value": 15,
          "duration": "WHILE_TRUE",
          "when": {
            "activeAtMost": 2
          }
        },
        "condition": "Au plus deux combattants actifs dans l’équipe.",
        "lore": "Une lance entretenue de garde en garde. Lorsque le rempart humain se réduit, son porteur resserre les rangs et laisse aux derniers compagnons l'espace de respirer.",
        "collectible": {
          "number": "ARM-023",
          "illustration": "wardens-spear-v1.webp",
          "flavour": "Tenir la place laissée par les autres.",
          "alt": "La Veille des Remparts : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "soldiers-blade",
        "slot": "weapon",
        "name": "La Lame de Relève",
        "family": "Epée courte",
        "visual": "axe",
        "art": "soldiers-blade-v1",
        "restrictions": {
          "jobs": [
            "SOLDAT"
          ],
          "families": ["Epée courte"]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "ATK",
          "value": 15,
          "duration": "WHILE_TRUE",
          "when": {
            "reserveAtMost": 0
          }
        },
        "condition": "Aucun combattant en réserve.",
        "lore": "Une lame réglementaire, sans nom gravé. Ceux qui la portent savent ce que signifie une relève qui n'arrive pas : achever proprement le geste appris, puis rester ensemble.",
        "collectible": {
          "number": "ARM-024",
          "illustration": "soldiers-blade-v1.webp",
          "flavour": "La relève attendra. Pas les compagnons.",
          "alt": "La Lame de Relève : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      },
      {
        "id": "commanders-sabre",
        "slot": "weapon",
        "name": "Le Fil du Ralliement",
        "family": "Epée longue",
        "visual": "axe",
        "art": "commanders-sabre-v1",
        "restrictions": {
          "jobs": [
            "COMMANDANT",
            "COMMANDANTE"
          ],
          "families": ["Epée longue"]
        },
        "effect": {
          "trigger": "TEAM_STATE",
          "stat": "DEF",
          "value": 15,
          "duration": "WHILE_TRUE",
          "when": {
            "outnumbered": true
          }
        },
        "condition": "Moins de combattants actifs que l’adversaire.",
        "lore": "Le sabre sert moins à désigner l'ennemi qu'à rendre un point de ralliement visible. Quand l'équipe est en infériorité, son porteur donne aux siens une ligne à retrouver.",
        "collectible": {
          "number": "ARM-025",
          "illustration": "commanders-sabre-v1.webp",
          "flavour": "Une ligne à retrouver dans la mêlée.",
          "alt": "Le Fil du Ralliement : illustration de l’arme, entière et isolée.",
          "cutout": true
        }
      }
    ],
    {id:'arborium-twinstring-bow',slot:'weapon',name:'L’Accord Sylvestre',family:'Arc',visual:'flute',art:'arborium-twinstring-bow-v1',
      restrictions:{factions:['Arborium'],families:['Arc']},
      effect:{trigger:'TEAM_STATE',stat:'ATK',value:20,duration:'WHILE_TRUE',when:{outnumbered:true}},
      condition:'Moins de combattants actifs dans son équipe que chez l’adversaire : +20 ATK numérique tant que cette condition dure.',
      lore:'Les armuriers d’Arborium façonnent cet arc dans un bois dont la sève garde la lumière. Ses deux cordes sont accordées ensemble avant chaque relève. Quand la ligne s’amenuise, leur vibration rappelle à son porteur qu’il tient encore sa place parmi les siens.',
      collectible:{number:'ARM-026',illustration:'arborium-twinstring-bow-v1.webp',flavour:'Deux cordes, un seul serment.',
        alt:'Arc Arborium en bois ouvragé, deux cordes et veines vert fluorescent.',cutout:true}},
    {id:'arborium-thorn-dagger',slot:'weapon',name:'Le Cran de Ronce',family:'Dague',visual:'flute',art:'arborium-thorn-dagger-v1',
      restrictions:{factions:['Arborium'],families:['Dague']},
      effect:{trigger:'TEAM_STATE',stat:'ATK',value:20,duration:'WHILE_TRUE',when:{reserveAtMost:0}},
      condition:'Aucun combattant dans sa réserve : +20 ATK numérique tant que cette condition dure. Le venin ne crée pas de dégâts persistants.',
      lore:'Sous le petit bouton de cuivre dort une sève amère, confiée aux seuls habitants d’Arborium. Le cran discret du tranchant est leur signe de reconnaissance. Quand aucune relève ne viendra, cette lame rappelle les clairières et les foyers qu’il leur reste à défendre.',
      collectible:{number:'ARM-027',illustration:'arborium-thorn-dagger-v1.webp',flavour:'La forêt veille au fil de la lame.',
        alt:'Dague empoisonnée d’Arborium, lame droite à petit cran et bouton de cuivre.',cutout:true}},
    {id:'draevenheim-wing-spear',slot:'weapon',name:'Les Ailes du Rempart',family:'Lance',visual:'flute',art:'draevenheim-wing-spear-v1',
      restrictions:{factions:['Draevenheim'],families:['Lance']},
      effect:{trigger:'TEAM_STATE',stat:'DEF',value:20,duration:'WHILE_TRUE',when:{outnumbered:true}},
      condition:'Moins de combattants actifs dans son équipe que chez l’adversaire : +20 DEF numérique tant que cette condition dure.',
      lore:'Née dans les mêmes forges que la lance d’Orven, sa longue hampe noire abrite un fil de lumière rouge. Deux lames articulées s’ouvrent sous la pointe comme des ailes de chauve-souris. À Draevenheim, ceux qui la portent savent qu’un rempart vaut surtout par les vies qu’il laisse derrière lui.',
      collectible:{number:'ARM-028',illustration:'draevenheim-wing-spear-v1.webp',flavour:'Deux ailes pour tenir la nuit.',
        alt:'Longue lance noire et rouge, deux lames métalliques déployées en ailes de chauve-souris.',cutout:true}},
    {id:'draevenheim-crimson-crossbow',slot:'weapon',name:'L’Arbalète Écarlate',family:'Arc',visual:'flute',art:'draevenheim-crimson-crossbow-v1',
      restrictions:{factions:['Draevenheim'],families:['Arc']},
      effect:{trigger:'TEAM_STATE',stat:'ATK',value:20,duration:'WHILE_TRUE',when:{activeAtMost:2}},
      condition:'Au plus deux combattants actifs dans son équipe : +20 ATK numérique tant que cette condition dure.',
      lore:'Ses branches de métal noir et ses finitions écarlates portent les marques des veilles sur les murs de Draevenheim. Le carreau rouge repose dans sa rainure comme une promesse retenue. Quand les voix se font rares sur le rempart, son porteur sait qu’un dernier trait peut encore offrir aux autres le temps de rentrer.',
      collectible:{number:'ARM-029',illustration:'draevenheim-crimson-crossbow-v1.webp',flavour:'Un trait rouge, une relève espérée.',
        alt:'Grande arbalète de métal noir, finitions rouges, cuivre patiné et carreau rouge droit.',cutout:true}},
    {id:'cryptown-oath-sword',slot:'weapon',name:'Le Serment sans Visage',family:'Epée longue',visual:'flute',art:'cryptown-oath-sword-v1',
      restrictions:{factions:['Cryptown'],families:['Epée longue']},
      effect:{trigger:'TEAM_STATE',stat:'ATK',value:20,duration:'WHILE_TRUE',when:{outnumbered:true}},
      condition:'Moins de combattants actifs dans son équipe que chez l’adversaire : +20 ATK numérique tant que cette condition dure.',
      lore:'Varkhen a oublié les visages, pas le poids de cette lame. Sa garde de cuivre serre un éclat violet, et son fil droit garde le passage des portes de Cryptown. Quand les rangs se vident, celui qui la porte retrouve un geste plus ancien que sa mémoire : se tenir entre les siens et la nuit.',
      collectible:{number:'ARM-030',illustration:'cryptown-oath-sword-v1.webp',flavour:'Les visages passent. Le serment demeure.',
        alt:'Épée de Varkhen, longue lame droite argentée, sillon violet et garde anguleuse en cuivre sombre.',cutout:true}},
    {id:'cryptown-vigil-rifle',slot:'weapon',name:'La Relève Muette',family:'Gun',visual:'flute',art:'cryptown-vigil-rifle-v1',
      restrictions:{factions:['Cryptown'],families:['Gun']},
      effect:{trigger:'TEAM_STATE',stat:'ATK',value:20,duration:'WHILE_TRUE',when:{reserveAtMost:0}},
      condition:'Aucun combattant dans sa réserve : +20 ATK numérique tant que cette condition dure. Aucun bonus sur Mort.',
      lore:'Nereth entretenait déjà ce fusil quand les tours de garde avaient encore une fin. Dans la lunette violette, il guette le signal d’une relève qui ne vient plus. Le long canon reste immobile au-dessus des murs de Cryptown : tant que quelqu’un veille, les portes ne sont pas seules.',
      collectible:{number:'ARM-031',illustration:'cryptown-vigil-rifle-v1.webp',flavour:'Le signal ne vient pas. La veille continue.',
        alt:'Fusil de Nereth à long canon droit, crosse ajourée, lunette violette et mécanisme de crâne en métal noir et cuivre.',cutout:true}},
    {id:'cryptown-watch-flail',slot:'weapon',name:'Le Glas des Veilleurs',family:'Fléau',visual:'flute',art:'cryptown-watch-flail-v1',
      restrictions:{factions:['Cryptown'],families:['Fléau']},
      effect:{trigger:'TEAM_STATE',stat:'DEF',value:20,duration:'WHILE_TRUE',when:{activeAtMost:2}},
      condition:'Au plus deux combattants actifs dans son équipe : +20 DEF numérique tant que cette condition dure.',
      lore:'Les maillons de Draust donnent leur cadence aux pas de la garde. Dans la cage de fer, le cristal violet éclaire un crâne qui ne baisse jamais les yeux. Lorsque les compagnons ne sont plus qu’une poignée, le fléau cesse de sonner : son porteur a pris sa place devant eux.',
      collectible:{number:'ARM-032',illustration:'cryptown-watch-flail-v1.webp',flavour:'Les chaînes se taisent. La garde tient.',
        alt:'Fléau de Draust, manche noir, chaîne de cuivre sombre et tête en cage ornée d’un crâne et d’un cristal violet.',cutout:true}},
    {id:'rhinoz-ancestral-horn',slot:'weapon',name:'La Corne des Anciens',family:'Hache',visual:'axe',art:'rhinoz-ancestral-horn-v2',
      restrictions:{races:['RHINOZ'],families:['Hache']},
      effect:{trigger:'TEAM_STATE',stat:'ATK',value:20,duration:'WHILE_TRUE',when:{outnumbered:true}},
      condition:'Moins de combattants actifs dans son équipe que chez l’adversaire : +20 ATK numérique tant que cette condition dure.',
      lore:'Sa lame reprend la courbe d’une corne, mais c’est dans le métal que les anciens l’ont forgée. Le cuivre porte les traces de plusieurs mains ; le manche a été réparé, jamais abandonné. Elle se transmet avec une consigne simple : quand les rangs s’éclaircissent, garder le passage pour ceux qui rentrent encore.',
      collectible:{number:'ARM-033',illustration:'rhinoz-ancestral-horn-v2.webp',flavour:'La force passe. Le passage demeure.',
        alt:'Hache Rhinoz à large lame en forme de corne, acier gris ivoire, embase cuirassée, cuivre patiné et manche droit.',cutout:true}}
  ];
  function freeze(value){Object.values(value).forEach(v=>{if(v&&typeof v==='object')freeze(v);});return Object.freeze(value);}
  // Historical restrictions only for reading profiles saved before family matching.
  const legacyRestrictions={
    "fallen-king-axe": {"characterIds":["balmhyr"]},
    "little-joys-flute": {"characterIds":["momo"]},
    "white-oath-rapier": {"characterIds":["kaylis"],"families":["Epée courte"]},
    "brotherhood": {"characterIds":["tidus-ff10"]},
    "virtuous-contract": {"characterIds":["2b-nier"]},
    "virtuous-treaty": {"characterIds":["2b-nier"]},
    "socom": {"characterIds":["solid-snake-mgs"]},
    "lulu-mog": {"characterIds":["lulu-ff10"]},
    "leopard-lightning": {"characterIds":["rikka"]},
    "mythic-iron-gauntlet": {"characterIds":["balmhyr"]},
    "post-bow": {"characterIds":["cana"]},
    "grimoire-weiss": {"characterIds":["nier-replicant"]},
    "gen-mechanical-arm": {"characterIds":["gen"]},
    "violet-reaping": {"characterIds":["voloden"]},
    "mantis-mask": {"characterIds":["psycho-mantis-mgs"]},
    "revolver-gunblade": {"characterIds":["squall-ff8"]},
    "wolf-steel": {"characterIds":["geralt-witcher"]},
    "wolf-silver": {"characterIds":["geralt-witcher"]},
    "kaine-saw": {"characterIds":["kaine-replicant"]},
    "buster-sword": {"characterIds":["cloud-ff7"]},
    "psg1": {"characterIds":["sniper-wolf-mgs"]},
    "single-action-army": {"characterIds":["revolver-ocelot-mgs"]},
    "wardens-spear": {"jobs":["GARDIEN","GARDIENNE"]},
    "soldiers-blade": {"jobs":["SOLDAT"]},
    "commanders-sabre": {"jobs":["COMMANDANT","COMMANDANTE"]},
    "arborium-twinstring-bow": {"factions":["Arborium"]},
    "arborium-thorn-dagger": {"factions":["Arborium"]},
    "draevenheim-wing-spear": {"factions":["Draevenheim"]},
    "draevenheim-crimson-crossbow": {"factions":["Draevenheim"]},
    "cryptown-oath-sword": {"factions":["Cryptown"]},
    "cryptown-vigil-rifle": {"factions":["Cryptown"]},
    "cryptown-watch-flail": {"factions":["Cryptown"]},
    "rhinoz-ancestral-horn": {"races":["RHINOZ"]}
  };
  weapons.push(
    {id:'durane-rampart',slot:'weapon',kind:'shield',name:'Le Rempart de Durane',family:'Bouclier',visual:'axe',art:'durane-rampart-v1',
      restrictions:{factions:['Durane']},effect:{trigger:'FIRST_DEFENSE',stat:'DEF',value:30,duration:'NEXT_DEFENSE'},
      condition:'Lors de sa premi\u00e8re d\u00e9fense : +30 DEF num\u00e9rique pour ce duel. Une fois par partie, m\u00eame si une face sp\u00e9ciale est obtenue.',
      lore:'On raconte que les portes de Durane furent taill\u00e9es dans la m\u00eame pierre. Sous les marteaux crois\u00e9s, un Kalistel gris \u00e9claire la rainure int\u00e9rieure. Le premier choc lui prend sa lumi\u00e8re, jamais sa promesse : laisser aux autres le temps de se relever.',
      collectible:{number:'BOU-001',illustration:'durane-rampart-v1.webp',cutout:true,flavour:'La pierre c\u00e8de. Durane tient.',alt:'Bouclier de pierre grise aux marteaux de Durane, \u00e9clair\u00e9 sur son contour int\u00e9rieur.'}},
    {id:'pod-042',slot:'weapon',kind:'relic',name:'Pod 042',family:'Relique',visual:'flute',art:'pod-042-v1',
      restrictions:{characterIds:['2b-nier']},effect:{trigger:'AFTER_BLOCK',stat:'DEF',value:20,duration:'NEXT_DEFENSE'},
      condition:'Apr\u00e8s un Block r\u00e9ussi de 2B : +20 DEF num\u00e9rique \u00e0 sa prochaine d\u00e9fense. Une seule charge par partie, consomm\u00e9e m\u00eame sur une face sp\u00e9ciale.',
      lore:'Le Pod enregistre le choc, calcule une trajectoire et se rapproche de quelques centim\u00e8tres. Aucune instruction ne lui demande de rester aussi pr\u00e8s. Au milieu des ruines, cette petite marge devient parfois la diff\u00e9rence entre une mission et un retour.',
      collectible:{number:'REL-001',illustration:'pod-042-v1.webp',cutout:true,flavour:'Une pr\u00e9sence, m\u00eame apr\u00e8s le silence.',alt:'Pod 042, drone ivoire aux bras m\u00e9caniques noirs, dans les ruines.'}}
  );
  const kind=w=>w?.kind||'weapon';
  const categories=freeze({weapon:{label:'Armes',singular:'Arme',icon:'sword'},shield:{label:'Boucliers',singular:'Bouclier',icon:'shield'},relic:{label:'Reliques',singular:'Relique',icon:'gem'}});
  for(const weapon of weapons)if(kind(weapon)==='weapon')weapon.restrictions.families=[weapon.family];
  weapons.forEach(freeze);freeze(legacyRestrictions);
  return Object.freeze({version:1,weapons:Object.freeze(weapons),legacyRestrictions,kind,categories});
});
