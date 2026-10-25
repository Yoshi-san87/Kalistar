# Kalistar 4.7.4 - Bibliotheque De Sprites

## Perimetre

Vingt personnages Kalistar supplementaires au template Astraball existant :
Rikka, Gen, Keryn, Riko, Vaerok, Elyrane, Brask, Maelka, Ssilas, Eryss,
Varkhen, Dame Ysane, Aelis, Brund, Bex, Nell, Ithrek, Odran, Edris-7F, Nessyra.

Chaque personnage dispose de 16 poses dans un PNG transparent 384 x 384,
avec les memes cellules de 96 et appuis a 90 que le lot 1. Attente, course,
lancer, garde, charge, impact et victoire sont consultables dans une galerie.
320 poses nouvelles pour 778 519 octets ; les dix atlas precedents sont preserves.
Les directions droite/gauche utilisent le miroir, sans nouvelles vues de dos.

La galerie `/jeu/astraball/library.html` propose recherche, factions, zoom
entier, miroir, fond clair/sombre, pause et telechargement. Elle respecte
Reduced Motion et suspend son animation lorsque la page est cachee.

Ce lot est une reserve graphique pour l'integration suivante. Aucun changement
des equipes, regles, statistiques, proprietes de collection ou sauvegardes.
Les cartes natives et leurs illustrations restent intactes.

## Donnees Et Sources

Le [guide](../../astraball/SPRITES.md) decrit le schema et l'ajout d'un sprite.
`data/sprite-library.json` lie chaque apparence a un `characterId` et un
`modelId` existants. Son API pure valide les chemins et identites, et resout
un modele exact sans substitution implicite. Pas de migration Supabase : les
PNG sont des medias communs, pas des donnees personnelles a dupliquer en base.

Les sources et consignes sont sous `astraball/sources/sprites-v2/`.
Generation image_gen d'apres le template Kaylis et les illustrations approuvees,
puis preparation Sharp des atlas. Prompts, provenance, decoupes et SHA-256 sont
versionnes ; les PNG restent hors Git, distribues par le registre runtime.

Sauvegarde native privee verifiee : 48 fichiers, 39 456 943 octets sous
`Documents/Sauvegardes-Kalistar/2026-10-25-astraball-sprites-v2/`.
Les empreintes des originaux et du lot 1 ont ete controlees sans modification
des verrous historiques.

## Verification

- Suite CI complete : 104 invocations reussies, 1 977 tests passes et deux
  cas optionnels ignores par leur configuration existante.
- Suite locale complete : 14 invocations reussies, y compris les bases
  PostgreSQL ephemeres. Aucune ecriture dans la base de production.
- Build Cloudflare : 462 cartes, 1 658 fichiers, 20 nouveaux atlas inclus.
- Six tests dedies : identites reelles, contrats, variantes, cache, 320 cellules,
  transparence, ancrages, mouvements distincts, budget et hashes du lot 1.
- Chrome : 1440 x 960, Razr 412 x 915 et compact 320 x 800 ; sept poses,
  filtres, zoom, miroir, recharge, absence de debordement et Reduced Motion.
- Course : quatre frames effectivement observees ; lancer fini, pause et
  redimensionnement pendant l'animation controles. Aucune erreur console.
- Captures locales : `work/astraball-sprites-v2/qa/`.

Les nouvelles invocations sont ajoutees au registre de validation commun.
Les contrats de distribution autorisent explicitement le seul nouveau JSON
public, `data/sprite-library.json`. Les prompts, PNG sources et JSON prives
restent refuses par le routeur. Les premiers passages ont signale ces contrats
a completer, la configuration locale de Marked et deux assertions de version ;
ils ont ete corriges avant la validation finale, sans changer de verrou natif.
La suite complete, le build fige et l'acces heberge sont verifies avant
l'annonce de publication du tag annote `v4.7.4`.
