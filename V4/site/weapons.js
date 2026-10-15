(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./ultimate-definitions.js'):root.KalistarUltimateDefinitions);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarWeapons=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(ultimateDefinitions){
  'use strict';
  if(!ultimateDefinitions)throw new Error('Load ultimate-definitions.js before weapons.js.');
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
  const additions=[
    ['tide-pavise','shield','Pavois des Marées','Pavois',{factions:['Crabazar']},25,'DEFENSE',{attack:'physical'},'self','Première défense physique.','Le sel a rongé les rivets, jamais le passage derrière eux.','Une carapace marine cerclée de cuivre veille sur les quais de Crabazar. Quand la marée emporte les cris, son porteur tient encore le pont.'],
    ['sentinel-carapace','shield','Carapace de la Sentinelle','Plastron',{characterIds:['taulio']},20,'BLOCK',{},'self','Après un Block.','Chaque choc apprend à ses plaques à tenir.','Taulio ne compte pas les coups reçus. Sous ses plaques, un relais retient leur cadence et prépare le prochain geste de protection.'],
    ['sap-cuirass','shield','Cuirasse de Sève','Cuirasse',{factions:['Arborium']},25,'DEFENSE',{alliedFaction:'Arborium'},'self','Un autre Arborium actif.','Deux racines résistent mieux qu’une.','La sève relie les lamelles de bois sans les figer. Auprès d’un autre enfant de la forêt, le porteur retrouve la souplesse des branches qui plient ensemble.'],
    ['gate-gauntlets','shield','Gantelets de la Porte','Gantelets',{characterIds:['magnar']},30,'DEFENSE',{activeAtMost:1},'self','Dernier combattant actif.','La porte reste fermée derrière ses poings.','Magnar referme ses gantelets de pierre comme les verrous d’une porte ancienne. Même seul, il se souvient de ceux qui attendent de l’autre côté.'],
    ['rhinoz-hauberk','shield','Haubert des Rhinoz','Haubert',{races:['RHINOZ']},25,'DEFENSE',{outnumbered:true},'self','En infériorité numérique.','La force des anciens tient maille après maille.','Des mailles épaisses portent des pièces de corne sculptée. Les Rhinoz y reconnaissent des mains disparues et la patience de ceux qui protégeaient déjà leurs foyers.'],
    ['first-thaw-cloak','shield','Manteau du Premier Dégel','Manteau',{factions:['Ysilis']},25,'DEFENSE',{attack:'magic'},'self','Première défense magique.','Sous le givre, une chaleur demeure.','Les agrafes de glace retiennent une fourrure grise patinée par les voyages. À Niveria, on prête ce manteau comme on promet un retour au printemps.'],
    ['abyss-plastron','shield','Plastron des Abysses','Plastron',{factions:['Thalassea']},25,'DEFENSE',{},'self','Première défense.','La nacre garde le calme des profondeurs.','Des courbes de coquillage répartissent le premier choc. Entre leurs strates sombres demeure le souvenir d’une eau que la tempête n’atteint jamais.'],
    ['cold-blood-mantle','shield','Mantelet du Sang-Froid','Mantelet',{factions:['Draevenheim']},25,'ALLY_FALL',{},'self','Après une élimination alliée.','Le velours retient la nuit, pas le souvenir.','Sous le fermoir ailé, la doublure rouge reste chaude. Chaque place vide sur le rempart rappelle au porteur pourquoi il ne peut pas encore céder.'],
    ['last-vigil-cuirass','shield','Cuirasse du Dernier Vigile','Cuirasse',{factions:['Cryptown']},25,'DEFENSE',{alliedFaction:'Cryptown'},'self','Un autre Cryptown actif.','Deux veilleurs se souviennent du même serment.','Les inscriptions violettes ont perdu leurs noms, pas leur sens. Près d’un autre gardien de Cryptown, les plaques retrouvent l’accord silencieux de la relève.'],
    ['dawn-gorget','shield','Gorgerin de l’Aube','Gorgerin',{factions:['Solaria']},25,'DEFENSE',{opponentElement:'NECRO'},'self','Contre un cristal Ténèbres.','Un rayon suffit pour retrouver le chemin.','Sur le métal ivoire, de fines rainures dorées recueillent la première lumière. Solaria les confie à ceux qui devront parler encore quand la nuit se rapprochera.'],
    ['last-forge-apron','shield','Tablier de la Dernière Forge','Tablier',{characterIds:['darnako']},30,'DEFENSE',{opponentElement:'PYRO'},'self','Contre un cristal Feu.','La braise connaît déjà ses coutures.','Le cuir brûlé porte des bandes de métal martelé. Darnako y a laissé des heures de forge, assez pour reconnaître le souffle du feu avant qu’il frappe.'],
    ['ninth-life-boots','shield','Bottes de la Neuvième Vie','Bottes',{characterIds:['rikka']},20,'DODGE',{},'self','Après une esquive.','Un pas évité. Une vie à rejoindre.','Sous le cuir tacheté courent des attaches électriques fines. Rikka les ajuste sans ralentir : ce qui compte n’est pas de fuir plus loin, mais de pouvoir revenir.'],
    ['octocamo','shield','OctoCamo','Combinaison',{characterIds:['solid-snake-mgs'],factions:['MGS4']},25,'DEFENSE',{},'self','Première défense.','La surface change. L’homme tient encore.','La combinaison d’Old Snake emprunte la couleur du sol. Sous le camouflage, le poids des années demeure, et avec lui la volonté d’achever la mission.'],
    ['cyborg-ninja-armor','shield','Blindage du Cyborg Ninja','Blindage',{characterIds:['raiden-mgs'],factions:['MGS4']},25,'DEFENSE',{outnumbered:true},'self','En infériorité numérique.','Sous le blindage, un choix reste humain.','Les plaques blanches et noires protègent les fibres artificielles de Raiden. Quand le front se vide, elles lui laissent encore le temps de choisir qui protéger.'],
    ['zanarkand-pauldron','shield','Épaulière de Zanarkand','Épaulière',{characterIds:['tidus-ff10']},20,'BLOCK',{},'self','Après un Block.','L’épaule se relève avec le sourire.','Le bleu porte les marques du voyage. Tidus reprend son souffle, secoue son bras et se replace : le prochain pas appartient encore aux vivants.'],
    ['leon-body-armor','shield','Gilet pare-balles','Gilet',{characterIds:['leon-kennedy-re'],factions:['RE4']},30,'DEFENSE',{attack:'physical'},'self','Première défense physique.','Une couche de plus pour rentrer vivant.','Sur le tissu noir de Leon, les sangles usées gardent leur tension. Rien d’héroïque dans cet équipement : seulement une chance de plus à ne pas gaspiller.'],
    ['stars-vest','shield','Gilet S.T.A.R.S.','Gilet',{characterIds:['chris-redfield-re'],factions:['RE1']},25,'DEFENSE',{alliedCharacter:'jill-valentine-re'},'self','Jill active à ses côtés.','L’écusson rappelle qu’il n’est pas seul.','Le gilet vert de Chris porte l’emblème de son unité. Apercevoir Jill dans la ligne suffit à lui rappeler qu’un équipier se protège avant de se compter.'],
    ['guardian-red-coat','shield','Manteau rouge du Gardien','Manteau',{characterIds:['auron-ff10']},30,'DEFENSE',{activeAtMost:1},'self','Dernier combattant actif.','Le voyage continue par celui qui reste.','Le grand manteau rouge glisse sur une épaule. Auron n’a pas besoin de le relever pour tenir sa place : il connaît déjà le poids des adieux.'],
    ['scarlet-cape','shield','Cape écarlate','Cape',{characterIds:['vincent-ff7']},25,'ALLY_FALL',{},'self','Après une élimination alliée.','Les déchirures n’emportent pas les promesses.','Les boucles métalliques retiennent un tissu abîmé par les années. Vincent ramène sa cape contre lui lorsque manque une voix, comme pour en garder la trace.'],
    ['wolf-school-armor','shield','Cuirasse de l’École du Loup','Cuirasse',{characterIds:['geralt-witcher']},25,'DEFENSE',{attack:'physical'},'self','Première défense physique.','Des sangles refaites. Encore un contrat.','Le cuir sombre et la maille de Geralt ont été réparés plus souvent que remplacés. Chaque couture témoigne d’un chemin dont il est revenu.'],
    ['white-materia','relic','Matéria blanche','Relique',{characterIds:['aeris-ff7']},20,'SUPPORT',{supports:['reraise']},'support','Après un nouveau Reraise.','Dans le ruban, une prière reste discrète.','La petite sphère repose au creux du ruban rose d’Aeris. Sa lumière n’efface aucune perte : elle accompagne le souffle qu’une autre présence parvient à préserver.'],
    ['griever-pendant','relic','Pendentif Griever','Relique',{characterIds:['squall-ff8']},25,'DEFENSE',{activeAtMost:1},'self','Dernier combattant actif.','Un lion contre le silence.','Squall referme les doigts sur l’emblème argenté. Quand il ne reste plus personne près de lui, le métal lui rappelle moins la force que la nécessité de tenir.'],
    ['zanarkand-abes-pendant','relic','Pendentif des Zanarkand Abes','Relique',{characterIds:['tidus-ff10']},20,'BLOCK',{},'self','Après un Block.','Un ancien terrain. Un prochain départ.','Le symbole des Abes balance contre Tidus. Il y retrouve le rythme d’un jeu et, l’espace d’un instant, un monde où se relever allait de soi.'],
    ['guardian-jug','relic','Gourde du Gardien','Relique',{characterIds:['auron-ff10']},25,'DEFENSE',{activeAtMost:2},'self','Deux combattants actifs ou moins.','Une pause que personne n’ose demander.','La corde usée retient la gourde d’Auron. Il la repose sans hâte : parfois, un geste familier suffit à rendre le silence moins lourd aux derniers compagnons.'],
    ['jill-lockpicks','relic','Crochets de déverrouillage','Relique',{characterIds:['jill-valentine-re']},20,'DEPLOY',{},'self','À son entrée depuis la réserve.','Une issue tient parfois entre deux doigts.','Jill connaît chaque pièce de son étui. Avant de rejoindre les autres, elle vérifie les crochets : une porte fermée n’est pas encore la fin d’un chemin.'],
    ['pod-153','relic','Pod 153','Relique',{characterIds:['9s-nier']},20,'SUPPORT',{supports:['mana']},'support','Après une nouvelle potion.','Une petite silhouette suit le signal.','Le Pod noir accompagne les gestes de 9S. Il transmet les données, puis corrige sa position pour demeurer auprès de celui qui vient de recevoir de l’aide.'],
    ['lunar-tear','relic','Larme lunaire','Relique',{characterIds:['kaine-replicant']},25,'ALLY_FALL',{},'self','Après une élimination alliée.','Une fleur pour ce qui ne doit pas disparaître.','Les pétales blancs sont presque trop fins pour survivre au voyage. Kainé les garde pourtant près d’elle, avec cette colère tendre qui refuse de tout laisser partir.'],
    ['infiltration-box','relic','Carton d’infiltration','Relique',{characterIds:['solid-snake-mgs']},20,'DEPLOY',{},'self','À son entrée depuis la réserve.','Ordinaire, tant que personne ne regarde dessous.','Le carton a pris la pluie et connu trop de couloirs. Snake en teste encore un coin : les solutions les plus simples gardent parfois une longueur d’avance.'],
    ['metal-gear-mkii','relic','Metal Gear Mk.II','Relique',{characterIds:['otacon-mgs'],factions:['MGS4']},20,'SUPPORT',{supports:['ward']},'support','Après une nouvelle garde.','Une liaison reste ouverte dans les ruines.','Otacon guide le petit robot entre les débris. Sur son écran, une présence répond encore ; le mécanisme se rapproche pour prolonger le geste de protection.'],
    ['wolf-medallion','relic','Médaillon du Loup','Relique',{characterIds:['geralt-witcher','vesemir-witcher']},25,'DEFENSE',{attack:'magic'},'self','Première défense magique.','Le métal frissonne avant les ombres.','La tête du loup repose contre le cuir. Geralt et Vesemir connaissent ce frémissement : juste assez d’avertissement pour ne pas subir l’inconnu immobile.'],
    ['obsidian-star','relic','Étoile d’obsidienne','Relique',{characterIds:['yennefer-witcher']},20,'SUPPORT',{supports:['mana']},'support','Après une nouvelle potion.','Une étoile noire, un geste précis.','L’obsidienne demeure sombre au cou de Yennefer. Quand elle accorde son aide, la lumière se pose ailleurs, sur quelqu’un qui en a davantage besoin.'],
    ['straw-hat','relic','Chapeau de paille','Relique',{characterIds:['monkey-d-luffy-op']},25,'ALLY_FALL',{},'self','Après une élimination alliée.','La paille porte une promesse plus grande qu’elle.','Le ruban rouge a vu la mer et la poussière. Luffy rabat son chapeau lorsqu’un compagnon tombe : il n’y a rien d’autre à dire avant d’avancer.'],
    ['log-pose','relic','Log Pose','Relique',{characterIds:['nami-op']},20,'ALLY_DEPLOY',{},'deployed','Premier allié entrant de réserve.','L’aiguille trouve encore un lendemain.','Sous le verre du bracelet, l’aiguille poursuit sa route. Nami la consulte puis indique un passage : arriver au bon endroit est déjà une manière de protéger.'],
    ['rumble-ball','relic','Rumble Ball','Relique',{characterIds:['tony-tony-chopper-op']},25,'SUPPORT',{supports:['luck','mana','reraise','ward','physical']},'self','Après son premier soutien réussi.','Soigner les autres. Tenir un peu plus.','Une bille jaune attend dans le flacon de Chopper. Après avoir aidé un compagnon, il se souvient que celui qui soigne doit aussi trouver la force de rester.'],
    ['cola-reserve','relic','Réserve de cola','Relique',{characterIds:['franky-op']},25,'BLOCK',{},'self','Après un Block.','Une gorgée, et le métal reprend courage.','La bouteille tinte dans son compartiment. Franky s’accorde un instant après le choc : pas de miracle, seulement de quoi remettre les épaules en place.'],
    ['little-joys-box','relic','Boîte des Petits Bonheurs','Relique',{characterIds:['momo']},20,'ALLY_FALL',{},'ally','Après une élimination alliée.','Une mélodie réparée pour ceux qui restent.','Momo a rassemblé des pièces qui ne jouaient plus ensemble. Quand une voix s’éteint, il ouvre la boîte et offre le petit air de travers à quelqu’un qui écoute encore.'],
    ['current-compass','relic','Boussole des Courants','Relique',{characterIds:['ruby']},25,'DEFENSE',{opponentElement:'HYDRO'},'self','Contre un cristal Eau.','L’eau écrit des chemins sous le verre.','Ruby suit le mouvement d’une goutte suspendue dans son instrument. Les courants qu’elle aime peuvent aussi la bousculer ; elle a appris à en reconnaître l’élan.'],
    ['last-garden-seed','relic','Graine du Dernier Jardin','Relique',{characterIds:['thalie']},20,'SUPPORT',{supports:['reraise']},'support','Après un nouveau Reraise.','Quelque chose peut encore recommencer.','La capsule mêle verre et racines autour d’une graine. Thalie la porte sans promettre un printemps : elle garde seulement une place pour ce qui pourrait revenir.'],
    ['exiled-king-seal','relic','Sceau du Roi sans Trône','Relique',{characterIds:['balmhyr']},20,'BLOCK',{},'ally','Après son premier Block.','Le sceau est ébréché, pas la parole.','Balmhyr n’a plus de décret à sceller. Après avoir tenu un choc, il confie un instant la lourde empreinte à un compagnon : régner n’a jamais valu autant que veiller.'],
    ['lost-names-bell','relic','Clochette des Noms Perdus','Relique',{characterIds:['ombrine-kalistar']},20,'SUPPORT',{supports:['mana']},'support','Après une nouvelle potion.','Un nom retrouve un souffle dans le cuivre.','Ombrine connaît les gravures cachées dans la clochette. Son tintement accompagne l’aide qu’elle transmet, assez bas pour laisser aux vivants leur propre voix.']
  ];
  const numbers={shield:1,relic:1};
  for(const [id,kind,name,family,restrictions,value,event,when,recipient,condition,flavour,lore] of additions){
    weapons.push({id,slot:'weapon',kind,name,family,visual:kind==='shield'?'axe':'flute',art:id+'-v1',restrictions,
      effect:{trigger:'ONCE_DEFENSE',stat:'DEF',value,duration:'NEXT_DEFENSE',event,when,recipient},condition,lore,
      collectible:{number:(kind==='shield'?'PRO':'REL')+'-'+String(++numbers[kind]).padStart(3,'0'),illustration:id+'-v1.webp',cutout:true,flavour,alt:name+', équipement Kalistar.'}});
  }
  // FFIX: existing declarative effects, never a replacement for the printed family.
  const ff9Weapons=[
    ['ff9-orichalque','Orichalque','Dague','djidane-ff9','ATK',20,{outnumbered:true},'En infériorité numérique.','Tendre la main. Garder la lame prête.','Djidane connaît le poids de cette dague mieux que celui des trésors qu’il emporte. Quand les autres sont moins nombreux, sa place est auprès d’eux, pas déjà de l’autre côté du mur.'],
    ['ff9-magekane','Magekane','Bâton','vivi-ff9','ATK',20,{activeAtMost:2},'Deux combattants actifs ou moins.','Un petit mage. Une lumière qui demeure.','Le bois porte les marques de doigts qui ont longtemps tremblé. Vivi serre son bâton lorsque les voix s’éloignent : il ne sait pas combien de temps lui reste, mais il sait avec qui il veut le partager.'],
    ['ff9-excalibur','Excalibur','Epée longue','steiner-ff9','ATK',20,{reserveAtMost:0},'Aucun combattant en réserve.','Le serment ne demande pas de relève.','Steiner inspecte encore le fil avant de reprendre sa garde. Une épée légendaire ne rend pas le devoir plus léger. Lorsque personne ne viendra le remplacer, elle lui rappelle simplement où rester.'],
    ['ff9-save-the-queen','Save the Queen','Epée longue','beate-ff9','ATK',30,null,'Dernière combattante active.','Choisir enfin à qui va son serment.','Beate a longtemps cru qu’une lame droite suffisait à tracer le bon chemin. Elle porte désormais Save the Queen pour les visages qu’elle a appris à regarder, même lorsque plus personne ne se tient à ses côtés.'],
    ['ff9-dragonade','Dragonade','Lance','freyja-ff9','ATK',20,{outnumbered:true},'En infériorité numérique.','La pluie passe. La garde demeure.','La hampe glisse dans une main qui connaît la pluie de Bloumécia. Freyja ne peut retenir tous ceux qui partent. Elle peut encore tenir cette lance devant les compagnons qui marchent avec elle.'],
    ['ff9-runigriffe','Runigriffe','Poing','tarask-ff9','ATK',20,{activeAtMost:2},'Deux combattants actifs ou moins.','Rester est aussi une forme de force.','Tarask resserre les attaches sans demander qu’on le regarde. Il aurait autrefois choisi la solitude. Quand les rangs se vident, le poids de ses griffes lui rappelle qu’il a choisi de rester.'],
    ['ff9-gastrette','Gastrette','Lance','kweena-ff9','DEF',20,'support','Après une nouvelle potion accordée.','Un bol tendu vaut parfois une promesse.','Kweena pose la grande fourchette près de la marmite. Personne ne sait exactement ce qui mijote, mais les bols reviennent vides. Le prochain départ paraît moins rude quand quelqu’un a pensé au repas.'],
    ['ff9-backstage-hammer','Marteau des Coulisses','Marteau','cina-ff9','DEF',20,{reserveAtMost:0},'Aucun combattant en réserve.','Le décor tient. La troupe aussi.','Cina connaît les planches qui grincent et les clous qui cèdent. Quand la troupe n’a plus de remplaçant, son marteau ne prépare pas un nouvel acte : il répare ce qui permet encore aux autres de tenir.']
  ];
  ff9Weapons.forEach(([id,name,family,characterId,stat,value,when,condition,flavour,lore],i)=>{
    const effect=when==='support'?{trigger:'AFTER_SUPPORT',supports:['mana'],stat,value,duration:'NEXT_DUEL'}:
      when?{trigger:'TEAM_STATE',stat,value,duration:'WHILE_TRUE',when}:{trigger:'LAST_STANDING',stat,value,duration:'WHILE_TRUE'};
    weapons.push({id,slot:'weapon',name,family,visual:'axe',art:id+'-v1',restrictions:{characterIds:[characterId],families:[family]},effect,condition,lore,
      collectible:{number:'ARM-'+String(34+i).padStart(3,'0'),illustration:id+'-v1.webp',cutout:true,flavour,alt:name+', équipement de Final Fantasy IX.'}});
  });
  const ff9Defensive=[
    ['ff9-oath-helm','shield','Casque du Serment','Casque','steiner-ff9',30,'DEFENSE',{attack:'physical'},'self','Première défense physique.','Sous les bosses, le devoir tient bon.','Le casque a reçu plus de chocs que de compliments. Steiner en redresse le bord sur le banc de garde. La princesse peut dormir : il lui reste assez de métal, et davantage encore de fidélité.'],
    ['ff9-vivi-hat','shield','Chapeau de Vivi','Chapeau','vivi-ff9',25,'DEFENSE',{attack:'magic'},'self','Première défense magique.','Un peu d’ombre pour garder sa lumière.','Sous le large bord, le monde paraît moins immense. Vivi reprend une couture et repose son chapeau avec soin. Il ne cache pas sa peur : il se donne seulement un endroit d’où lui faire face.'],
    ['ff9-burmecia-coat','shield','Manteau de Bloumécia','Manteau','freyja-ff9',25,'ALLY_FALL',{},'self','Après une élimination alliée.','La pluie n’efface pas les compagnons.','Le rouge garde la pluie des rues désertées. Freyja ramène son manteau contre elle quand une voix manque à l’appel. Il ne remplace personne, mais il porte encore la chaleur des chemins partagés.'],
    ['ff9-solitary-wraps','shield','Bandages du Solitaire','Bandages','tarask-ff9',25,'BLOCK',{},'self','Après son premier Block.','Les mains serrées apprennent à rester.','Tarask enroule le tissu sur les traces du dernier choc. Ses mains pourraient encore se fermer sur la colère. Il les prépare plutôt à tenir une place que les autres n’auront pas à reprendre.'],
    ['ff9-reunion-bandana','shield','Bandana des Retrouvailles','Bandana','franck-ff9',25,'DEPLOY',{},'self','À son entrée depuis la réserve.','Revenir vers ceux qui ont attendu.','Le bandeau a gardé l’odeur des arbres et les plis d’un long silence. Franck le renoue avant de rejoindre la troupe. Aucun grand discours : on lui a gardé une place et il vient la reprendre.'],
    ['ff9-garnet-pendant','relic','Pendentif de Grenat','Relique','grenat-ff9',25,'SUPPORT',{supports:['mana','reraise']},'support','Après une nouvelle potion ou un Reraise.','Un héritage à porter, pas à subir.','Le bijou balance près de son cœur, plus ancien que le nom de Dagga. Grenat ne peut choisir tout ce qu’elle a reçu. Elle peut choisir à qui offrir la lumière qu’elle en garde.'],
    ['ff9-mog-ribbon','relic','Ruban de Mog','Relique','eiko-ff9',30,'SUPPORT',{supports:['reraise']},'support','Après un nouveau Reraise accordé.','Une petite présence qui ne s’éloigne pas.','Eiko déplie le ruban avec une douceur qu’elle cache aux autres. Elle y retrouve moins une puissance qu’une présence. Lorsqu’elle aide quelqu’un à tenir, un peu de cette présence l’accompagne.'],
    ['ff9-final-act-feather','relic','Plume du Dernier Acte','Relique','kuja-ff9',25,'DEFENSE',{activeAtMost:2},'self','Deux combattants actifs ou moins.','Après les applaudissements, un souffle.','La plume blanche repose sur le velours, loin des regards. Kuja la fait tourner entre ses doigts lorsque le silence gagne la scène. Pour un instant, survivre compte davantage que paraître éternel.'],
    ['ff9-terra-fragment','relic','Fragment de Terra','Relique','garland-ff9',25,'ALLY_DEPLOY',{},'deployed','Premier allié entrant de réserve.','Un monde ancien attend encore une relève.','Dans le cristal persiste la lumière d’un monde qui refuse de s’éteindre. Garland observe l’arrivée du nouveau combattant. Le fragment s’éclaire, comme si transmettre une veille pouvait encore la justifier.'],
    ['ff9-tantalus-script','relic','Manuscrit des Tantalas','Relique','ruby-ff9',25,'SUPPORT',{supports:['physical']},'support','Après un nouveau buff physique accordé.','Une réplique pour retrouver sa place.','Ruby a corrigé les marges jusqu’à user le papier. Entre deux répliques, elle a noté les silences où un partenaire hésite. Un mot soufflé au bon moment suffit parfois à lui rendre la scène.']
  ];
  const ff9Numbers={shield:21,relic:21};
  for(const [id,kind,name,family,characterId,value,event,when,recipient,condition,flavour,lore] of ff9Defensive){
    weapons.push({id,slot:'weapon',kind,name,family,visual:kind==='shield'?'axe':'flute',art:id+'-v1',restrictions:{characterIds:[characterId]},
      effect:{trigger:'ONCE_DEFENSE',stat:'DEF',value,duration:'NEXT_DEFENSE',event,when,recipient},condition,lore,
      collectible:{number:(kind==='shield'?'PRO':'REL')+'-'+String(++ff9Numbers[kind]).padStart(3,'0'),illustration:id+'-v1.webp',cutout:true,flavour,alt:name+', équipement de Final Fantasy IX.'}});
  }
  const kind=w=>w?.kind||'weapon';
  const categories=freeze({weapon:{label:'Armes',singular:'Arme',icon:'sword'},shield:{label:'Protections',singular:'Protection',icon:'shield'},relic:{label:'Reliques',singular:'Relique',icon:'gem'}});
  for(const weapon of weapons)if(kind(weapon)==='weapon')weapon.restrictions.families=[weapon.family];
  // Started matches retain these definitions; only new loadouts use the 4.6 rules.
  const legacyWeapons=JSON.parse(JSON.stringify(weapons));legacyWeapons.forEach(freeze);
  const promise=weapons.find(item=>item.id==='white-oath-rapier');
  promise.name='Promesse';
  promise.collectible.alt='Promesse : rapière blanche offerte à Kaylis par Balmhyr.';
  for(const item of weapons){
    item.slot=kind(item);item.rulesVersion=2;
    if(item.slot!=='relic'){
      const stat=item.slot==='weapon'?'ATK':'DEF';
      item.effect={trigger:'RETAINED_SIX',stat,value:item.effect.value,duration:'DUEL'};
      item.condition='Jet '+stat+' 6 num\u00e9rique conserv\u00e9 : +'+item.effect.value+' '+stat+' pour ce duel.';
    }
  }
  // Additions after the frozen legacy snapshot are available only to modern loadouts.
  weapons.push(...[
    {
      "id": "gotham-catwoman-whip",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Fouet de Selina",
      "family": "Fouet",
      "visual": "axe",
      "art": "gotham-catwoman-whip-v1",
      "restrictions": {
        "characterIds": [
          "catwoman-batman"
        ],
        "families": [
          "Fouet"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 20,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +20 ATK pour ce duel.",
      "lore": "Selina vérifie la tresse avant de retrouver les toits. Ce cuir usé connaît les corniches et les portes fermées. Il ne choisit pas son camp à sa place ; il lui laisse une seconde pour le faire.",
      "collectible": {
        "number": "ARM-042",
        "illustration": "gotham-catwoman-whip-v1.webp",
        "cutout": true,
        "flavour": "La ville tient au bout d'un fil.",
        "alt": "Fouet de Selina, équipement de la collection Batman."
      }
    },
    {
      "id": "gotham-freeze-gun",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Fusil Cryogénique",
      "family": "Gun",
      "visual": "axe",
      "art": "gotham-freeze-gun-v1",
      "restrictions": {
        "characterIds": [
          "mr-freeze-batman"
        ],
        "families": [
          "Gun"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
      "lore": "Victor resserre le collier du canon avec une patience de chercheur. Le givre gagne le métal. Chaque intervention devait être la dernière ; au fond du laboratoire, Nora attend toujours.",
      "collectible": {
        "number": "ARM-043",
        "illustration": "gotham-freeze-gun-v1.webp",
        "cutout": true,
        "flavour": "Arrêter le monde, pas son espoir.",
        "alt": "Fusil Cryogénique, équipement de la collection Batman."
      }
    },
    {
      "id": "gotham-demon-sword",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Lame de la Ligue",
      "family": "Epée longue",
      "visual": "axe",
      "art": "gotham-demon-sword-v1",
      "restrictions": {
        "characterIds": [
          "ras-al-ghul-batman"
        ],
        "families": [
          "Epée longue"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
      "lore": "Ra's al Ghul essuie la lame avant de la ranger. Les hommes qui lui jurèrent fidélité ont changé, jamais la précision de ce geste. L'acier ne lui promet pas un monde meilleur ; il porte le poids de celui qu'il veut imposer.",
      "collectible": {
        "number": "ARM-044",
        "illustration": "gotham-demon-sword-v1.webp",
        "cutout": true,
        "flavour": "Des siècles. Un seul fil.",
        "alt": "Lame de la Ligue, équipement de la collection Batman."
      }
    },
    {
      "id": "gotham-penguin-umbrella",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Parapluie de l'Iceberg",
      "family": "Gun",
      "visual": "axe",
      "art": "gotham-penguin-umbrella-v1",
      "restrictions": {
        "characterIds": [
          "pingouin-batman"
        ],
        "families": [
          "Gun"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 20,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +20 ATK pour ce duel.",
      "lore": "Cobblepot lisse le tissu noir comme s'il attendait seulement la pluie. L'argent du pommeau ne porte aucune empreinte. À l'Iceberg, la courtoisie est un langage dont il conserve toujours le dernier mot.",
      "collectible": {
        "number": "ARM-045",
        "illustration": "gotham-penguin-umbrella-v1.webp",
        "cutout": true,
        "flavour": "La politesse garde une réserve.",
        "alt": "Parapluie de l'Iceberg, équipement de la collection Batman."
      }
    },
    {
      "id": "gotham-cryo-suit",
      "slot": "shield",
      "kind": "shield",
      "rulesVersion": 2,
      "name": "Scaphandre Cryogénique",
      "family": "Scaphandre",
      "visual": "axe",
      "art": "gotham-cryo-suit-v1",
      "restrictions": {
        "characterIds": [
          "mr-freeze-batman"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "DEF",
        "value": 30,
        "duration": "DUEL"
      },
      "condition": "Jet DEF 6 numérique conservé : +30 DEF pour ce duel.",
      "lore": "Le joint du col doit rester impeccable. Victor le vérifie encore, puis écoute le souffle régulier du circuit. Ce froid qui l'isole des autres est aussi ce qui lui laisse le temps de poursuivre.",
      "collectible": {
        "number": "PRO-028",
        "illustration": "gotham-cryo-suit-v1.webp",
        "cutout": true,
        "flavour": "Un hiver pour garder une promesse.",
        "alt": "Scaphandre Cryogénique, équipement de la collection Batman."
      }
    },
    {
      "id": "gotham-cat-goggles",
      "slot": "shield",
      "kind": "shield",
      "rulesVersion": 2,
      "name": "Lunettes de Selina",
      "family": "Lunettes",
      "visual": "axe",
      "art": "gotham-cat-goggles-v1",
      "restrictions": {
        "characterIds": [
          "catwoman-batman"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "DEF",
        "value": 20,
        "duration": "DUEL"
      },
      "condition": "Jet DEF 6 numérique conservé : +20 DEF pour ce duel.",
      "lore": "Selina passe le pouce sur une rayure du verre. La ville est différente derrière ces lentilles : les ombres y ont des bords, les fenêtres une distance. Elle sait déjà où poser le prochain pied.",
      "collectible": {
        "number": "PRO-029",
        "illustration": "gotham-cat-goggles-v1.webp",
        "cutout": true,
        "flavour": "Voir une issue là où tout se ferme.",
        "alt": "Lunettes de Selina, équipement de la collection Batman."
      }
    },
    {
      "id": "gotham-fear-mask",
      "slot": "shield",
      "kind": "shield",
      "rulesVersion": 2,
      "name": "Masque de l'Épouvantail",
      "family": "Masque",
      "visual": "axe",
      "art": "gotham-fear-mask-v1",
      "restrictions": {
        "characterIds": [
          "epouvantail-batman"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "DEF",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet DEF 6 numérique conservé : +25 DEF pour ce duel.",
      "lore": "Crane replace le filtre sous la toile grossière. Derrière les coutures, l'air doit rester parfaitement calme. Il connaît trop bien ce que ses expériences font aux autres pour vouloir en respirer le moindre souvenir.",
      "collectible": {
        "number": "PRO-030",
        "illustration": "gotham-fear-mask-v1.webp",
        "cutout": true,
        "flavour": "Il garde son souffle. Pas ses remords.",
        "alt": "Masque de l'Épouvantail, équipement de la collection Batman."
      }
    },
    {
      "id": "gotham-harvey-coin",
      "slot": "relic",
      "kind": "relic",
      "rulesVersion": 2,
      "name": "La Pièce de Harvey",
      "family": "Relique",
      "visual": "flute",
      "art": "gotham-harvey-coin-v1",
      "restrictions": {
        "characterIds": [
          "double-face-batman"
        ]
      },
      "effect": {
        "trigger": "ONCE_DEFENSE",
        "stat": "DEF",
        "value": 20,
        "duration": "NEXT_DEFENSE",
        "event": "DEFENSE",
        "when": {
          "attack": "physical"
        },
        "recipient": "self"
      },
      "condition": "Première défense physique.",
      "lore": "Harvey retourne la pièce et reconnaît chaque entaille. Il dit que le hasard est juste. Pourtant, avant de la lancer, sa main se referme toujours un peu trop longtemps.",
      "collectible": {
        "number": "REL-027",
        "illustration": "gotham-harvey-coin-v1.webp",
        "cutout": true,
        "flavour": "Le métal décide de ce qu'il tait.",
        "alt": "La Pièce de Harvey, équipement de la collection Batman."
      }
    },
    {
      "id": "gotham-riddle-box",
      "slot": "relic",
      "kind": "relic",
      "rulesVersion": 2,
      "name": "Le Dernier Point d'Interrogation",
      "family": "Relique",
      "visual": "flute",
      "art": "gotham-riddle-box-v1",
      "restrictions": {
        "characterIds": [
          "sphinx-batman"
        ]
      },
      "effect": {
        "trigger": "ONCE_DEFENSE",
        "stat": "DEF",
        "value": 20,
        "duration": "NEXT_DEFENSE",
        "event": "SUPPORT",
        "when": {
          "supports": [
            "physical"
          ]
        },
        "recipient": "support"
      },
      "condition": "Après un nouveau buff physique accordé.",
      "lore": "L'Homme Mystère referme le petit coffret avec un sourire contrarié. Il a trouvé la solution avant tout le monde. Il lui reste à décider qui aura le droit de s'en servir.",
      "collectible": {
        "number": "REL-028",
        "illustration": "gotham-riddle-box-v1.webp",
        "cutout": true,
        "flavour": "Une solution offerte, jamais gratuitement.",
        "alt": "Le Dernier Point d'Interrogation, équipement de la collection Batman."
      }
    },
    {
      "id": "gotham-ivy-seed",
      "slot": "relic",
      "kind": "relic",
      "rulesVersion": 2,
      "name": "La Dernière Graine",
      "family": "Relique",
      "visual": "flute",
      "art": "gotham-ivy-seed-v1",
      "restrictions": {
        "characterIds": [
          "poison-ivy-batman"
        ]
      },
      "effect": {
        "trigger": "ONCE_DEFENSE",
        "stat": "DEF",
        "value": 25,
        "duration": "NEXT_DEFENSE",
        "event": "SUPPORT",
        "when": {
          "supports": [
            "mana",
            "reraise"
          ]
        },
        "recipient": "support"
      },
      "condition": "Après une nouvelle potion ou un Reraise.",
      "lore": "Ivy protège cette graine dans le creux d'une capsule. Elle ne vient d'aucun jardin que Gotham ait su conserver. Quand la coque s'entrouvre, quelque chose de fragile recommence à demander de la place.",
      "collectible": {
        "number": "REL-029",
        "illustration": "gotham-ivy-seed-v1.webp",
        "cutout": true,
        "flavour": "Une vie minuscule réclame sa place.",
        "alt": "La Dernière Graine, équipement de la collection Batman."
      }
    },
    {
      "id": "gotham-utility-belt",
      "slot": "relic",
      "kind": "relic",
      "rulesVersion": 2,
      "name": "Ceinture de la Dernière Issue",
      "family": "Relique",
      "visual": "flute",
      "art": "gotham-utility-belt-v1",
      "restrictions": {
        "characterIds": [
          "batman-batman"
        ]
      },
      "effect": {
        "trigger": "ONCE_DEFENSE",
        "stat": "DEF",
        "value": 20,
        "duration": "NEXT_DEFENSE",
        "event": "SUPPORT",
        "when": {
          "supports": [
            "ward"
          ]
        },
        "recipient": "support"
      },
      "condition": "Après une nouvelle garde accordée.",
      "lore": "Bruce recompte les compartiments avant de partir. Alfred lui rappelle qu'il ne peut pas tout prévoir. Il le sait ; il veut seulement qu'au moment critique, quelqu'un ait encore une issue.",
      "collectible": {
        "number": "REL-030",
        "illustration": "gotham-utility-belt-v1.webp",
        "cutout": true,
        "flavour": "Toujours prévoir le retour des autres.",
        "alt": "Ceinture de la Dernière Issue, équipement de la collection Batman."
      }
    },
    {
      "id": "gotham-lazarus-vial",
      "slot": "relic",
      "kind": "relic",
      "rulesVersion": 2,
      "name": "Mémoire de Lazare",
      "family": "Relique",
      "visual": "flute",
      "art": "gotham-lazarus-vial-v1",
      "restrictions": {
        "characterIds": [
          "ras-al-ghul-batman"
        ]
      },
      "effect": {
        "trigger": "ONCE_DEFENSE",
        "stat": "DEF",
        "value": 25,
        "duration": "NEXT_DEFENSE",
        "event": "ALLY_FALL",
        "when": {},
        "recipient": "self"
      },
      "condition": "Après une élimination alliée.",
      "lore": "Ra's conserve un peu de l'eau verte dans un flacon scellé. Il a vu tant de fidèles tomber qu'il prétend ne plus les compter. Le verre serré dans sa paume dit autre chose.",
      "collectible": {
        "number": "REL-031",
        "illustration": "gotham-lazarus-vial-v1.webp",
        "cutout": true,
        "flavour": "Survivre ne rend pas ce qui est perdu.",
        "alt": "Mémoire de Lazare, équipement de la collection Batman."
      }
    }
  ]);
  // Castlevania and native Kalistar additions use the V4.6 equipment rules only.
  weapons.push(...[
    {
      "id": "castlevania-vampire-killer",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Vampire Killer",
      "family": "Fouet",
      "visual": "axe",
      "art": "castlevania-vampire-killer-v1",
      "restrictions": {
        "characterIds": [
          "trevor-belmont-castlevania",
          "simon-belmont-castlevania"
        ],
        "families": [
          "Fouet"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
      "lore": "Les Belmont se transmettent un fouet et une tâche qu'aucun d'eux n'a choisie. Le cuir porte la marque des mains qui l'ont serré avant eux. Trevor et Simon n'y trouvent pas une promesse de victoire, seulement une raison de tenir.",
      "collectible": {
        "number": "ARM-046",
        "illustration": "castlevania-vampire-killer-v1.webp",
        "cutout": true,
        "flavour": "Un héritage plus lourd que son acier.",
        "alt": "Vampire Killer, équipement Castlevania."
      }
    },
    {
      "id": "castlevania-alucard-sword",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Épée d’Alucard",
      "family": "Epée longue",
      "visual": "axe",
      "art": "castlevania-alucard-sword-v1",
      "restrictions": {
        "characterIds": [
          "alucard-castlevania"
        ],
        "families": [
          "Epée longue"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
      "lore": "La lame glisse dans le silence avec la précision d'une pensée. Alucard aurait voulu ne rien devoir à son père ; même sa façon de protéger les vivants porte pourtant quelque chose de ce nom.",
      "collectible": {
        "number": "ARM-047",
        "illustration": "castlevania-alucard-sword-v1.webp",
        "cutout": true,
        "flavour": "L’héritier choisit qui sa lame protège.",
        "alt": "Épée d’Alucard, équipement Castlevania."
      }
    },
    {
      "id": "castlevania-isaac-dagger",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Dague du Maître-Forgeur",
      "family": "Dague",
      "visual": "axe",
      "art": "castlevania-isaac-dagger-v1",
      "restrictions": {
        "characterIds": [
          "isaac-castlevania"
        ],
        "families": [
          "Dague"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 20,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +20 ATK pour ce duel.",
      "lore": "Isaac a longtemps cru que sa dague ne pouvait qu'obéir à la colère. Il en nettoie désormais le fil comme on prépare un outil. Pour la première fois, l'avenir qu'il imagine ne ressemble pas seulement à une vengeance.",
      "collectible": {
        "number": "ARM-048",
        "illustration": "castlevania-isaac-dagger-v1.webp",
        "cutout": true,
        "flavour": "La main apprend un autre avenir.",
        "alt": "Dague du Maître-Forgeur, équipement Castlevania."
      }
    },
    {
      "id": "castlevania-alucard-shield",
      "slot": "shield",
      "kind": "shield",
      "rulesVersion": 2,
      "name": "Bouclier d’Alucard",
      "family": "Protection",
      "visual": "axe",
      "art": "castlevania-alucard-shield-v1",
      "restrictions": {
        "characterIds": [
          "alucard-castlevania"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "DEF",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet DEF 6 numérique conservé : +25 DEF pour ce duel.",
      "lore": "Sur le métal rouge et argent, un visage farouche veille encore. Alucard passe le bras dans les courroies usées. Recevoir le choc à la place d'un autre est parfois la réponse la plus simple à son héritage.",
      "collectible": {
        "number": "PRO-031",
        "illustration": "castlevania-alucard-shield-v1.webp",
        "cutout": true,
        "flavour": "Se placer entre la nuit et les vivants.",
        "alt": "Bouclier d’Alucard, équipement Castlevania."
      }
    },
    {
      "id": "castlevania-styria-mantle",
      "slot": "shield",
      "kind": "shield",
      "rulesVersion": 2,
      "name": "Manteau de Styrie",
      "family": "Protection",
      "visual": "axe",
      "art": "castlevania-styria-mantle-v1",
      "restrictions": {
        "characterIds": [
          "carmilla-castlevania"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "DEF",
        "value": 20,
        "duration": "DUEL"
      },
      "condition": "Jet DEF 6 numérique conservé : +20 DEF pour ce duel.",
      "lore": "Le manteau ne garde presque aucune trace des longues nuits de conseil. Carmilla l'ajuste avant d'entrer, et la salle se tait. Elle a fait de cette étoffe une frontière que personne n'est invité à franchir.",
      "collectible": {
        "number": "PRO-032",
        "illustration": "castlevania-styria-mantle-v1.webp",
        "cutout": true,
        "flavour": "Une frontière cousue de velours.",
        "alt": "Manteau de Styrie, équipement Castlevania."
      }
    },
    {
      "id": "castlevania-speaker-robe",
      "slot": "shield",
      "kind": "shield",
      "rulesVersion": 2,
      "name": "Robe des Orateurs",
      "family": "Protection",
      "visual": "axe",
      "art": "castlevania-speaker-robe-v1",
      "restrictions": {
        "characterIds": [
          "sypha-castlevania"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "DEF",
        "value": 20,
        "duration": "DUEL"
      },
      "condition": "Jet DEF 6 numérique conservé : +20 DEF pour ce duel.",
      "lore": "La robe de Sypha a connu la poussière des routes et la chaleur des foyers étrangers. Ses reprises racontent ce qu'aucun livre ne conserve : les nuits où une communauté entière s'est serrée pour ne laisser personne dehors.",
      "collectible": {
        "number": "PRO-033",
        "illustration": "castlevania-speaker-robe-v1.webp",
        "cutout": true,
        "flavour": "Le savoir voyage avec ceux qu’il abrite.",
        "alt": "Robe des Orateurs, équipement Castlevania."
      }
    },
    {
      "id": "castlevania-hector-ring",
      "slot": "relic",
      "kind": "relic",
      "rulesVersion": 2,
      "name": "Anneau de Styrie",
      "family": "Relique",
      "visual": "flute",
      "art": "castlevania-hector-ring-v1",
      "restrictions": {
        "characterIds": [
          "hector-castlevania"
        ]
      },
      "effect": {
        "trigger": "ONCE_DEFENSE",
        "stat": "DEF",
        "value": 25,
        "duration": "NEXT_DEFENSE",
        "event": "SUPPORT",
        "when": {
          "supports": [
            "ward",
            "reraise"
          ]
        },
        "recipient": "support"
      },
      "condition": "Nouvelle garde ou Reraise accordé.",
      "lore": "Hector connaît maintenant la différence entre être protégé et être possédé. Il regarde l'anneau avant de tendre la main à un allié. Cette fois, le secours qu'il offre ne demande rien en retour.",
      "collectible": {
        "number": "REL-032",
        "illustration": "castlevania-hector-ring-v1.webp",
        "cutout": true,
        "flavour": "Aider sans retenir.",
        "alt": "Anneau de Styrie, équipement Castlevania."
      }
    },
    {
      "id": "castlevania-lisa-memory",
      "slot": "relic",
      "kind": "relic",
      "rulesVersion": 2,
      "name": "Souvenir de Lisa",
      "family": "Relique",
      "visual": "flute",
      "art": "castlevania-lisa-memory-v1",
      "restrictions": {
        "characterIds": [
          "dracula-castlevania"
        ]
      },
      "effect": {
        "trigger": "ONCE_DEFENSE",
        "stat": "DEF",
        "value": 25,
        "duration": "NEXT_DEFENSE",
        "event": "ALLY_FALL",
        "when": {},
        "recipient": "self"
      },
      "condition": "Après une élimination alliée.",
      "lore": "Dans le petit cadre, Lisa ne regarde ni un monstre ni un seigneur. Dracula laisse son pouce sur le cuivre usé. Une voix qu'il n'entendra plus lui rappelle encore que les vivants ne sont pas tous ses ennemis.",
      "collectible": {
        "number": "REL-033",
        "illustration": "castlevania-lisa-memory-v1.webp",
        "cutout": true,
        "flavour": "Il reste une voix dans le silence.",
        "alt": "Souvenir de Lisa, équipement Castlevania."
      }
    },
    {
      "id": "kalistar-vulkar-hammer",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Cœur de Fournaise",
      "family": "Marteau",
      "visual": "axe",
      "art": "kalistar-vulkar-hammer-v1",
      "restrictions": {
        "factions": [
          "Vulkar"
        ],
        "families": [
          "Marteau"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
      "lore": "À Vulkar, on ne prête ce marteau qu'à ceux qui savent écouter le métal. Maudre le pose parfois contre le four pour en sentir les vibrations. Le bon coup ne force pas la matière : il arrive quand elle est prête.",
      "collectible": {
        "number": "ARM-049",
        "illustration": "kalistar-vulkar-hammer-v1.webp",
        "cutout": true,
        "flavour": "Frapper juste, pas seulement fort.",
        "alt": "Cœur de Fournaise, équipement Kalistar."
      }
    },
    {
      "id": "kalistar-neriska-bow",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "La Lettre Inachevée",
      "family": "Arc",
      "visual": "axe",
      "art": "kalistar-neriska-bow-v1",
      "restrictions": {
        "characterIds": [
          "neriska-kalistar"
        ],
        "families": [
          "Arc"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
      "lore": "Neriska a fixé un petit étui de cuivre sous la poignée de son arc. La lettre y reste sèche quand le col disparaît sous la neige. Elle vérifie la corde, puis le sceau : un nom effacé mérite encore d'arriver à destination.",
      "collectible": {
        "number": "ARM-050",
        "illustration": "kalistar-neriska-bow-v1.webp",
        "cutout": true,
        "flavour": "La neige n’efface pas une promesse.",
        "alt": "La Lettre Inachevée, équipement Kalistar."
      }
    },
    {
      "id": "kalistar-chroma-harness",
      "slot": "shield",
      "kind": "shield",
      "rulesVersion": 2,
      "name": "Harnais des Passerelles",
      "family": "Protection",
      "visual": "axe",
      "art": "kalistar-chroma-harness-v1",
      "restrictions": {
        "factions": [
          "Chroma"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "DEF",
        "value": 20,
        "duration": "DUEL"
      },
      "condition": "Jet DEF 6 numérique conservé : +20 DEF pour ce duel.",
      "lore": "Les ateliers de Chroma fabriquent ces harnais avec des pièces que la ville a abandonnées. Chaque boucle a été éprouvée par une autre main. Quand une passerelle cède, on découvre combien de soin peut tenir dans une couture.",
      "collectible": {
        "number": "PRO-034",
        "illustration": "kalistar-chroma-harness-v1.webp",
        "cutout": true,
        "flavour": "La ville tient aussi par ses coutures.",
        "alt": "Harnais des Passerelles, équipement Kalistar."
      }
    },
    {
      "id": "kalistar-grivka-pelisse",
      "slot": "shield",
      "kind": "shield",
      "rulesVersion": 2,
      "name": "Pelisse du Dernier Col",
      "family": "Protection",
      "visual": "axe",
      "art": "kalistar-grivka-pelisse-v1",
      "restrictions": {
        "factions": [
          "Grivka"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "DEF",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet DEF 6 numérique conservé : +25 DEF pour ce duel.",
      "lore": "Dans les refuges de Grivka, cette pelisse passe de porte-manteau en porte-manteau. On y trouve parfois un bouton qui ne vient pas du même village. Ceux qui sont rentrés l'ont réparée pour celui qui tarde encore.",
      "collectible": {
        "number": "PRO-035",
        "illustration": "kalistar-grivka-pelisse-v1.webp",
        "cutout": true,
        "flavour": "Un peu de chaleur pour le dernier.",
        "alt": "Pelisse du Dernier Col, équipement Kalistar."
      }
    },
    {
      "id": "kalistar-nestown-beacon",
      "slot": "relic",
      "kind": "relic",
      "rulesVersion": 2,
      "name": "Balise du Retour",
      "family": "Relique",
      "visual": "flute",
      "art": "kalistar-nestown-beacon-v1",
      "restrictions": {
        "factions": [
          "Nestown"
        ]
      },
      "effect": {
        "trigger": "ONCE_DEFENSE",
        "stat": "DEF",
        "value": 20,
        "duration": "NEXT_DEFENSE",
        "event": "ALLY_DEPLOY",
        "when": {},
        "recipient": "deployed"
      },
      "condition": "Un autre allié entre depuis la réserve.",
      "lore": "Les messagers de Nestown accrochent cette balise au dernier toit sûr. Son verre garde un point de lumière dans le brouillard. Quand une silhouette rejoint enfin la ligne, quelqu'un sait déjà par où la ramener.",
      "collectible": {
        "number": "REL-034",
        "illustration": "kalistar-nestown-beacon-v1.webp",
        "cutout": true,
        "flavour": "Une lumière pour rejoindre les siens.",
        "alt": "Balise du Retour, équipement Kalistar."
      }
    },
    {
      "id": "kalistar-nerval-lantern",
      "slot": "relic",
      "kind": "relic",
      "rulesVersion": 2,
      "name": "La Lampe qui Attend",
      "family": "Relique",
      "visual": "flute",
      "art": "kalistar-nerval-lantern-v1",
      "restrictions": {
        "characterIds": [
          "nerval-kalistar"
        ]
      },
      "effect": {
        "trigger": "ONCE_DEFENSE",
        "stat": "DEF",
        "value": 20,
        "duration": "NEXT_DEFENSE",
        "event": "SUPPORT",
        "when": {
          "supports": [
            "ward",
            "mana"
          ]
        },
        "recipient": "support"
      },
      "condition": "Nouvelle garde ou potion accordée.",
      "lore": "Nerval ne baisse jamais sa lanterne au premier silence. Sous le cuivre cabossé, la flamme électrique reste douce. Celui qui hésite sur la passerelle n'y voit pas un ordre d'avancer, mais quelqu'un qui l'attendra.",
      "collectible": {
        "number": "REL-035",
        "illustration": "kalistar-nerval-lantern-v1.webp",
        "cutout": true,
        "flavour": "Personne ne traverse tout à fait seul.",
        "alt": "La Lampe qui Attend, équipement Kalistar."
      }
    }
  ]);
  weapons.push(
  {
    "id": "chrono-rainbow",
    "slot": "weapon",
    "rulesVersion": 2,
    "name": "Rainbow",
    "family": "Katana",
    "visual": "axe",
    "art": "chrono-rainbow-v1",
    "restrictions": {
      "characterIds": [
        "crono-chrono-trigger"
      ],
      "families": [
        "Katana"
      ]
    },
    "effect": {
      "trigger": "RETAINED_SIX",
      "stat": "ATK",
      "value": 25,
      "duration": "DUEL"
    },
    "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
    "lore": "Melchior a réuni la lumière du soleil et les couleurs d'une coquille venue d'un autre âge. Crono lève la lame et y retrouve les visages de ceux qui ont rendu cette rencontre possible. Même le temps ne se traverse pas seul.",
    "collectible": {
      "number": "ARM-051",
      "illustration": "chrono-rainbow-v1.webp",
      "cutout": true,
      "flavour": "Toutes les couleurs d’un avenir possible.",
      "alt": "Rainbow, équipement de crono, adaptation Kalistar de Chrono Trigger."
    }
  },
  {
    "id": "chrono-valkyrie",
    "slot": "weapon",
    "rulesVersion": 2,
    "name": "Arc Valkyrie",
    "family": "Arc",
    "visual": "axe",
    "art": "chrono-valkyrie-v1",
    "restrictions": {
      "characterIds": [
        "marle-chrono-trigger"
      ],
      "families": [
        "Arc"
      ]
    },
    "effect": {
      "trigger": "RETAINED_SIX",
      "stat": "ATK",
      "value": 20,
      "duration": "DUEL"
    },
    "condition": "Jet ATK 6 numérique conservé : +20 ATK pour ce duel.",
    "lore": "Marle a quitté les salles où l'on décidait de sa vie à voix basse. Dans sa main, l'arc ne porte aucun ordre royal. Elle tend la corde pour ceux qu'elle a choisis, et sa volonté ne tremble plus.",
    "collectible": {
      "number": "ARM-052",
      "illustration": "chrono-valkyrie-v1.webp",
      "cutout": true,
      "flavour": "Choisir sa route, puis tenir sa ligne.",
      "alt": "Arc Valkyrie, équipement de marle, adaptation Kalistar de Chrono Trigger."
    }
  },
  {
    "id": "chrono-wondershot",
    "slot": "weapon",
    "rulesVersion": 2,
    "name": "Wondershot",
    "family": "Gun",
    "visual": "axe",
    "art": "chrono-wondershot-v1",
    "restrictions": {
      "characterIds": [
        "lucca-chrono-trigger"
      ],
      "families": [
        "Gun"
      ]
    },
    "effect": {
      "trigger": "RETAINED_SIX",
      "stat": "ATK",
      "value": 25,
      "duration": "DUEL"
    },
    "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
    "lore": "Lucca a passé la nuit à régler le mécanisme nourri par la Pierre du Soleil. Le cuivre garde la chaleur de ses doigts. Elle ne cherche pas seulement à construire une arme : elle veut prouver qu'une invention peut encore offrir un lendemain.",
    "collectible": {
      "number": "ARM-053",
      "illustration": "chrono-wondershot-v1.webp",
      "cutout": true,
      "flavour": "Un peu de soleil dans la mécanique.",
      "alt": "Wondershot, équipement de lucca, adaptation Kalistar de Chrono Trigger."
    }
  },
  {
    "id": "chrono-masamune",
    "slot": "weapon",
    "rulesVersion": 2,
    "name": "Masamune",
    "family": "Epée longue",
    "visual": "axe",
    "art": "chrono-masamune-v1",
    "restrictions": {
      "characterIds": [
        "frog-chrono-trigger"
      ],
      "families": [
        "Epée longue"
      ]
    },
    "effect": {
      "trigger": "RETAINED_SIX",
      "stat": "ATK",
      "value": 25,
      "duration": "DUEL"
    },
    "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
    "lore": "Frog a longtemps porté cette lame comme on porte une faute. Le souvenir de Cyrus n'exige pourtant pas qu'il reste prisonnier du passé. Quand il referme la main sur la garde, Glenn choisit enfin ce qu'il lui reste à protéger.",
    "collectible": {
      "number": "ARM-054",
      "illustration": "chrono-masamune-v1.webp",
      "cutout": true,
      "flavour": "Le courage survit au nom du héros.",
      "alt": "Masamune, équipement de frog, adaptation Kalistar de Chrono Trigger."
    }
  },
  {
    "id": "chrono-teraton-arm",
    "slot": "weapon",
    "rulesVersion": 2,
    "name": "Bras Tératon",
    "family": "Poing",
    "visual": "axe",
    "art": "chrono-teraton-arm-v1",
    "restrictions": {
      "characterIds": [
        "robo-chrono-trigger"
      ],
      "families": [
        "Poing"
      ]
    },
    "effect": {
      "trigger": "RETAINED_SIX",
      "stat": "ATK",
      "value": 20,
      "duration": "DUEL"
    },
    "condition": "Jet ATK 6 numérique conservé : +20 ATK pour ce duel.",
    "lore": "Le métal de ce bras garde les marques d'un futur sans voix. Robo en règle chaque articulation avec patience. La même main peut briser un obstacle ou abriter une pousse : sa force tient désormais au choix qu'il fait.",
    "collectible": {
      "number": "ARM-055",
      "illustration": "chrono-teraton-arm-v1.webp",
      "cutout": true,
      "flavour": "La force apprend aussi à prendre soin.",
      "alt": "Bras Tératon, équipement de robo, adaptation Kalistar de Chrono Trigger."
    }
  },
  {
    "id": "chrono-doom-scythe",
    "slot": "weapon",
    "rulesVersion": 2,
    "name": "Faux du Désespoir",
    "family": "Faucille",
    "visual": "axe",
    "art": "chrono-doom-scythe-v1",
    "restrictions": {
      "characterIds": [
        "magus-chrono-trigger"
      ],
      "families": [
        "Faucille"
      ]
    },
    "effect": {
      "trigger": "RETAINED_SIX",
      "stat": "ATK",
      "value": 25,
      "duration": "DUEL"
    },
    "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
    "lore": "Magus ne dit jamais ce qu'il cherche au-delà du prochain passage. Sa faux trace dans l'air une ligne froide, puis le silence revient. Sous le titre et la colère, un enfant continue de chercher sa sœur.",
    "collectible": {
      "number": "ARM-056",
      "illustration": "chrono-doom-scythe-v1.webp",
      "cutout": true,
      "flavour": "Derrière la colère, un nom demeure.",
      "alt": "Faux du Désespoir, équipement de magus, adaptation Kalistar de Chrono Trigger."
    }
  }
  );
  // Faction equipment is additive; historical match definitions stay immutable.
  weapons.push(...[
    {
      "id": "grivka-pass-fang",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Croc du Col",
      "family": "Epée courte",
      "visual": "axe",
      "art": "grivka-pass-fang-v1",
      "restrictions": {
        "factions": [
          "Grivka"
        ],
        "families": [
          "Epée courte"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
      "lore": "Hrold essuie toujours la lame avant de compter ceux qui ont franchi le col. Le givre bleu suit son tranchant ; les entailles de la garde, elles, ne disparaissent jamais.",
      "collectible": {
        "number": "ARM-057",
        "illustration": "grivka-pass-fang-v1.webp",
        "cutout": true,
        "flavour": "Le dernier passage restera ouvert.",
        "alt": "Croc du Col, équipement de Grivka inspiré des illustrations des personnages."
      }
    },
    {
      "id": "grivka-silent-howl",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Hurlement Muet",
      "family": "Gun",
      "visual": "axe",
      "art": "grivka-silent-howl-v1",
      "restrictions": {
        "factions": [
          "Grivka"
        ],
        "families": [
          "Gun"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
      "lore": "Taevrik ne grave pas ses victoires sur la crosse. Il y marque les nuits où la patrouille est rentrée entière. Le canon reste froid longtemps après le dernier guetteur.",
      "collectible": {
        "number": "ARM-058",
        "illustration": "grivka-silent-howl-v1.webp",
        "cutout": true,
        "flavour": "On entend surtout ceux qui rentrent.",
        "alt": "Hurlement Muet, équipement de Grivka inspiré des illustrations des personnages."
      }
    },
    {
      "id": "grivka-silence-bow",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Arc des Neiges Muettes",
      "family": "Arc",
      "visual": "axe",
      "art": "grivka-silence-bow-v1",
      "restrictions": {
        "factions": [
          "Grivka"
        ],
        "families": [
          "Arc"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 20,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +20 ATK pour ce duel.",
      "lore": "Nivra retend la corde avec les mêmes gestes que sa mère. Entre deux sapins, la flèche de givre indique un chemin que ses compagnons seuls savent lire.",
      "collectible": {
        "number": "ARM-059",
        "illustration": "grivka-silence-bow-v1.webp",
        "cutout": true,
        "flavour": "Une trace que le vent ne garde pas.",
        "alt": "Arc des Neiges Muettes, équipement de Grivka inspiré des illustrations des personnages."
      }
    },
    {
      "id": "froz-rank-breaker",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Brise-Rangs",
      "family": "Hache",
      "visual": "axe",
      "art": "froz-rank-breaker-v1",
      "restrictions": {
        "factions": [
          "Froz"
        ],
        "families": [
          "Hache"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
      "lore": "Kaervan pose cette hache contre la porte avant d'appeler les absents. Sous le métal noir, trois crocs retiennent encore les fils rouges des manteaux qu'il a tirés hors de la neige.",
      "collectible": {
        "number": "ARM-060",
        "illustration": "froz-rank-breaker-v1.webp",
        "cutout": true,
        "flavour": "Ouvrir la ligne. Ramener les siens.",
        "alt": "Brise-Rangs, équipement de Froz inspiré des illustrations des personnages."
      }
    },
    {
      "id": "froz-velvet-fangs",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Crocs de Velours",
      "family": "Dague",
      "visual": "axe",
      "art": "froz-velvet-fangs-v1",
      "restrictions": {
        "factions": [
          "Froz"
        ],
        "families": [
          "Dague"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 20,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +20 ATK pour ce duel.",
      "lore": "Nyrska enveloppe ses deux dagues dans un ruban que sa sœur a recousu. Le velours a perdu sa couleur à force de voyages ; aucune des deux lames n'a perdu le chemin du retour.",
      "collectible": {
        "number": "ARM-061",
        "illustration": "froz-velvet-fangs-v1.webp",
        "cutout": true,
        "flavour": "Deux crocs, un même chemin du retour.",
        "alt": "Crocs de Velours, équipement de Froz inspiré des illustrations des personnages."
      }
    },
    {
      "id": "froz-blizzard-voice",
      "slot": "weapon",
      "rulesVersion": 2,
      "name": "Lame du Ralliement",
      "family": "Epée longue",
      "visual": "axe",
      "art": "froz-blizzard-voice-v1",
      "restrictions": {
        "factions": [
          "Froz"
        ],
        "families": [
          "Epée longue"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "ATK",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet ATK 6 numérique conservé : +25 ATK pour ce duel.",
      "lore": "Saevra n'élève pas la voix dans le blizzard. Elle lève sa lame, attend que chacun ait trouvé sa place, puis ouvre elle-même le premier pas dans la neige.",
      "collectible": {
        "number": "ARM-062",
        "illustration": "froz-blizzard-voice-v1.webp",
        "cutout": true,
        "flavour": "Un éclat suffit pour se retrouver.",
        "alt": "Lame du Ralliement, équipement de Froz inspiré des illustrations des personnages."
      }
    },
    {
      "id": "grivka-white-watch-armor",
      "slot": "shield",
      "kind": "shield",
      "rulesVersion": 2,
      "name": "Tenue de la Garde Blanche",
      "family": "Protection",
      "visual": "axe",
      "art": "grivka-white-watch-armor-v1",
      "restrictions": {
        "factions": [
          "Grivka"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "DEF",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet DEF 6 numérique conservé : +25 DEF pour ce duel.",
      "lore": "Sous les plaques rivetées, la laine verte porte le nom des cols traversés. La fourrure blanche n'est pas un grade : elle rappelle à chaque garde qu'il doit être visible pour ceux qui cherchent un refuge.",
      "collectible": {
        "number": "PRO-036",
        "illustration": "grivka-white-watch-armor-v1.webp",
        "cutout": true,
        "flavour": "Tenir le col, garder la chaleur.",
        "alt": "Tenue de la Garde Blanche, équipement de Grivka inspiré des illustrations des personnages."
      }
    },
    {
      "id": "froz-crimson-coat",
      "slot": "shield",
      "kind": "shield",
      "rulesVersion": 2,
      "name": "Tenue du Régiment Pourpre",
      "family": "Protection",
      "visual": "axe",
      "art": "froz-crimson-coat-v1",
      "restrictions": {
        "factions": [
          "Froz"
        ]
      },
      "effect": {
        "trigger": "RETAINED_SIX",
        "stat": "DEF",
        "value": 25,
        "duration": "DUEL"
      },
      "condition": "Jet DEF 6 numérique conservé : +25 DEF pour ce duel.",
      "lore": "La neige colle aux longs manteaux rouges bien avant de toucher l'acier. Chacun répare la doublure du suivant : au matin, personne ne demande à qui appartenaient les coutures.",
      "collectible": {
        "number": "PRO-037",
        "illustration": "froz-crimson-coat-v1.webp",
        "cutout": true,
        "flavour": "Le froid n'emportera pas le dernier.",
        "alt": "Tenue du Régiment Pourpre, équipement de Froz inspiré des illustrations des personnages."
      }
    },
    {
      "id": "grivka-silent-breath",
      "slot": "relic",
      "kind": "relic",
      "rulesVersion": 2,
      "name": "Muselière du Souffle Calme",
      "family": "Relique",
      "visual": "axe",
      "art": "grivka-silent-breath-v1",
      "restrictions": {
        "factions": [
          "Grivka"
        ]
      },
      "effect": {
        "trigger": "ULTIMATE",
        "duration": "ONCE_MATCH",
        "event": "SURVIVED",
        "when": {
          "outnumbered": true
        },
        "action": {
          "kind": "ARM",
          "stat": "DEF",
          "value": 40,
          "target": "self"
        }
      },
      "condition": "Après avoir survécu à une attaque en infériorité numérique : +40 DEF pour le prochain duel à défense chiffrée. Une fois par partie.",
      "lore": "Le masque conduit le givre loin de la gorge et rend chaque souffle régulier. Quand les voix de la patrouille se font moins nombreuses, ce rythme discret rappelle au porteur qu'il peut encore tenir.",
      "collectible": {
        "number": "REL-036",
        "illustration": "grivka-silent-breath-v1.webp",
        "cutout": true,
        "flavour": "Un souffle calme au milieu du manque.",
        "alt": "Muselière du Souffle Calme, équipement de Grivka inspiré des illustrations des personnages."
      }
    },
    {
      "id": "froz-crystal-bandolier",
      "slot": "relic",
      "kind": "relic",
      "rulesVersion": 2,
      "name": "Bandoulière du Givre Captif",
      "family": "Relique",
      "visual": "axe",
      "art": "froz-crystal-bandolier-v1",
      "restrictions": {
        "factions": [
          "Froz"
        ]
      },
      "effect": {
        "trigger": "ULTIMATE",
        "duration": "ONCE_MATCH",
        "event": "SURVIVED",
        "when": {
          "magic": true
        },
        "action": {
          "kind": "ARM",
          "stat": "ATK",
          "value": 40,
          "target": "self",
          "magic": true
        }
      },
      "condition": "Après avoir survécu à une attaque magique : +40 ATK à la prochaine attaque magique chiffrée conservée. Une fois par partie.",
      "lore": "Les deux veines bleues de la bandoulière ramènent la morsure de la magie vers son cristal. Les soldats de Froz disent qu'il garde un peu de chaque tempête pour les aider à traverser la suivante.",
      "collectible": {
        "number": "REL-037",
        "illustration": "froz-crystal-bandolier-v1.webp",
        "cutout": true,
        "flavour": "Garder la tempête pour le bon instant.",
        "alt": "Bandoulière du Givre Captif, équipement de Froz inspiré des illustrations des personnages."
      }
    }
  ]);
  weapons.push({
    id:'kaylis-eclipse-rapier',slot:'weapon',rulesVersion:2,name:'Éclipse',
    family:'Epée courte',visual:'axe',art:'kaylis-eclipse-rapier-v1',
    restrictions:{characterIds:['kaylis'],families:['Epée courte']},
    effect:{trigger:'RETAINED_SIX',stat:'ATK',value:20,duration:'DUEL'},
    condition:'Jet ATK 6 numérique conservé : +20 ATK pour ce duel.',
    lore:'Kaylis garde Promesse comme on garde une main tendue. Avec Éclipse, elle apprend un autre geste : ne plus reculer devant sa propre ombre. Sous le cuir noir, un fil de magie rouge répond à la pression de ses doigts, assez doux pour accompagner sa main sans jamais la guider.',
    collectible:{number:'ARM-063',illustration:'kaylis-eclipse-rapier-v1.webp',cutout:true,
      flavour:'Son ombre, son propre chemin.',
      alt:'Éclipse, rapière noire et rouge de Kaylis, magie discrète autour de la poignée.'}
  });
  // Reactive ultimates affect new matches only; saved definitions stay immutable.
  const ultimates={
    'little-joys-box':{
      effect:{trigger:'OUTNUMBERED_GIFT',event:'TARGETED',trait:'luck',recipient:'allies',duration:'ONCE_MATCH'},
      condition:'En infériorité numérique, lorsque Momo est attaqué : un trèfle à chaque autre compagnon actif qui n’en possède pas. Une fois par partie.'
    },
    'white-materia':{
      effect:{trigger:'OUTNUMBERED_GIFT',event:'ELIMINATED',trait:'reraise',recipient:'choice',duration:'ONCE_MATCH'},
      condition:'En infériorité numérique au début du duel, si Aeris est éliminée : choisissez un autre allié actif sans cœur. Il reçoit un Reraise. Une fois par partie.'
    },
    'pod-042':{
      effect:{trigger:'TACTICAL_REPRISAL',stat:'ATK',value:60,duration:'NEXT_TARGET_ATTACK',advantages:['weapon','element','faction','arenaAttack']},
      condition:'Survivre à une attaque numérique avec avantage d’arme, cristal, faction ou arène : le Pod marque cet adversaire. Prochaine attaque numérique contre lui : +60 ATK. Une fois par partie.'
    }
  };
  for(const item of weapons)if(ultimates[item.id])Object.assign(item,ultimates[item.id]);
  for(const item of weapons)if(ultimateDefinitions[item.id])Object.assign(item,ultimateDefinitions[item.id]);
  weapons.forEach(freeze);freeze(legacyRestrictions);
  return Object.freeze({version:2,weapons:Object.freeze(weapons),legacyWeapons:Object.freeze(legacyWeapons),legacyRestrictions,kind,categories});
});
