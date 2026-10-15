# Kaylis : Promesse et Eclipse

Revision du 14 octobre 2026, V4 moderne uniquement.

## Demande

- Renommer La Promesse Blanche en **Promesse**.
- Ajouter une seconde rapiere noire et rouge, tres ouvragee, avec une magie
  discrete autour de la poignee. Nom propose : **Eclipse**.

## Identite et regles

Promesse conserve son identifiant `white-oath-rapier`, son numero ARM-003,
ses illustrations, son cercle et ses restrictions. Le renommage intervient
apres la capture des definitions historiques : les archives et matchs deja
commences conservent leur libelle et leur effet.

Eclipse : `kaylis-eclipse-rapier`, ARM-063, famille `Epée courte`,
restriction `characterId: kaylis` ET famille imprimee identique.
La version `49055457`, L’Elan des couleurs, est compatible ; `30000012`,
La Premiere Breche (Dague), ne l’est pas. Aucune carte native n’est modifiee.

Les deux armes ont exactement le meme effet moderne : **+20 ATK sur un
jet ATK 6 numerique conserve, pour ce duel uniquement**. Eclipse est un
choix visuel et narratif, pas une augmentation de puissance. Elle ne
s’ajoute pas a Promesse : le profil ne porte qu’une arme a la fois.
Les emplacements Protection et Relique restent independants.

## Images

Generation par l’outil integre `image_gen`, trois appels distincts :
objet detoure, peinture en situation, cercle creux personnalise.
Les prompts exacts, roles des references et fichiers d’origine sont dans
`prompts.json`. Les PNG sont conserves dans `V4/weapon-cards/sources/` :

- `kaylis-eclipse-rapier-v1.png`
- `kaylis-eclipse-rapier-scene-v1.png`
- `kaylis-eclipse-rapier-ring-v1.png`

`build-assets.cjs` produit les WebP en conservant l’alpha, la toile optique
488 x 488 et le centre [244, 242] des medaillons du jeu. Le moteur et les
animations existantes ne changent pas. Le corps de l’arme et le cercle
restent independants ; le cercle tourne seulement dans les etats prevus.
`media-provenance.json` documente les hashes, dimensions et exports.

## Verification

- `node --test V4/site/kaylis-rapiers.test.cjs`
- `node --test V4/site/weapon-art.test.cjs V4/site/equipment-v2.test.cjs V4/site/equipment-categories.test.cjs`
- `node V4/site/kaylis-rapiers.browser.test.cjs`

Le test navigateur utilise une origine et une base IndexedDB isolees :
aucune sauvegarde personnelle n’est remplacee. PC 1440 x 1000, Razr50
412 x 1007 et compact 320 x 740 avec Reduced Motion. Equipement,
confirmation de remplacement, desequipement, reload, inspection du deck,
arene inactive/active, carte adverse et resize sont verifies.
Les scenarios moteur jouent aussi huit parties natives completes avec
validation et restauration apres chaque action.

Les captures et mesures sont sous `qa/`. La publication sera coordonnee
apres les lots Map et Collection ; aucun changement etranger n’est inclus.
