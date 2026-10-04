# Kalistar 4.5.7

Publication personnelle : Yoshi-san87/Kalistar, main, tag annote v4.5.7.

Ajout de 17 personnages originaux : cinq gardes de Draevenheim, cinq membres
de l'Ordre de Fer de Durane, quatre gardiens aeriens de Nestown et trois marins
Crustos de Crabazar. Le catalogue passe de 193 a 210 cartes.

La direction artistique a ete corrigee apres examen des 193 cartes existantes :
vetements classiques Kalistar, grain peint, scenes personnelles, originalite
technique discrete des armes et boucliers. Les uniformes tactiques rejetes
ne sont pas inclus dans la selection publiee.

CRUSTOS ajoute seulement une race et son embleme calibre. Aucun changement
du moteur, de la matrice des armes, des plafonds de role ou du schema de
sauvegarde. Aucun deck de demonstration ajoute. Les cartes existantes et les
references protegees sont conservees.

Source, prompts, audit, 17 PSD editables et preuves :
`../../expansions/2026-10-04-city-guards/`.

## Controles

- 17 controles natifs valides : zero pixel fixe modifie, zero difference
  apres reouverture des PSD, codes-barres corrects et hexagones NONE eteints.
- Quatre tests de modele et trois tests d'integration, dont 24 matchs complets
  avec effets de soutien et rechargements. Les 17 personnages participent.
- 49 tests cibles de catalogue, equipes, sauvegardes et profils passes.
- 17 fiches ouvertes dans Chrome isole, captures 1440 x 1000 et 412 x 915,
  filtre CRUSTOS, affichage du plateau et reprise de partie controles.
- Construction Pages : 210 cartes, 668 fichiers, environ 523.5 Mo.

Les 134 tests du workflow et le build Pages ont reussi sur l'instantane Git
isole `aea6caefadad16bbc652eb81a7b8f54deb1d767b`. La suite generale navigateur
Pages a aussi reussi avec 210 cartes et aucune erreur HTTP ou JavaScript.
Les empreintes SHA-256 des 193 anciens PNG sont toutes identiques a l'audit.
Les resultats sont conserves dans `workflow-results.json`. Le controle public
`public-check.cjs` verifie ensuite le commit, la version et les 17 images en ligne.
