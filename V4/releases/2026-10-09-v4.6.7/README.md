# Kalistar 4.6.7 : équipements Batman

## Contenu

- 12 nouveaux équipements : 4 armes, 3 protections, 5 reliques.
- 36 illustrations originales : objets détourés, scènes et anneaux uniques.
- 48 WebP distribués dans le site. Les PNG de travail et prompts restent archivés.
- Compatibilités par identités stables et familles de base ; aucune carte native modifiée.
- Règles V4.6 conservées : D6 numérique pour les équipements directs, charges
  défensives ponctuelles pour les reliques.
- Validation du snapshot étendue de 100 à 512 définitions, pour accueillir le
  catalogue de 105 objets. Anciennes définitions et sauvegardes préservées.

Trois propositions de visuels refusées par l'outil ne sont pas incluses :
Batarang, Canne du Dernier Rire, Armure du Chevalier Noir.
Le détail du lot et les références sont dans
[`README.md`](../../revisions/2026-10-09-gotham-equipment/README.md).

## Vérifications

Les tests ciblés utilisent les cartes natives, des deux côtés, sans réécrire
leurs statistiques. Ils couvrent restrictions, D5/D6, supports réels, charges,
consommation, journaux, sauvegarde, isolation des profils et 16 matchs complets.
Les 606 tests de la suite de publication passent sur l'export exact de l'index,
après intégration de la version 4.6.6. Rapports : `verification/publication/`.
Le site statique construit contient 315 cartes et 1 133 fichiers.

Les captures PC, Razr et 320 px contrôlent les douze fiches, les porteurs,
l'équipement/retrait, le reload, les popups de deck/arène, les anneaux actifs,
leur ancrage pendant le resize et Reduced Motion.
Les 36 scénarios passent, ainsi que les 9 aperçus de deck supplémentaires.
Les captures finales ont été inspectées sur ordinateur et téléphone.
Dossier : `../../revisions/2026-10-09-gotham-equipment/qa-release/`.

## Publication

Cible exclusive : `https://github.com/Yoshi-san87/Kalistar.git`, branche `main`.
Version coordonnée après la publication des cartes en 4.6.6.
Tag annoté prévu : `v4.6.7`, branche et tag poussés atomiquement.
Le staging est limité par `release.json` et `stage.cjs`.
`isolate.cjs` exporte exactement l'index et hydrate les seuls médias nécessaires.
La ligne de test performance et les autres changements locaux restent hors lot.

`public-smoke.cjs <commit>` vérifie le manifeste public, la version et les hashes
des 48 nouveaux fichiers et des modules modifiés. Le cache GitHub Pages est
comparé selon la normalisation existante, sans ignorer de différence de contenu.
