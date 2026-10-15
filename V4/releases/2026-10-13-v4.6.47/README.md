# Kalistar 4.6.47 - Publication des cinq adversaires

## Correctif de validation

La publication 4.6.46 a ete arretee avant deploiement par le test de boot :
le nouveau module ai-strategies.js porte le total de 56 a 57 modules.
Le test conserve la verification stricte du chargement, controle explicitement
que l'IA precede le moteur et que son absence bloque le demarrage.
Aucun verrou, hash natif ou ancien rapport n'est modifie.

Les neuf tests des strategies IA sont ajoutes aux validations GitHub Pages.
Aucun changement de comportement ou d'equilibrage par rapport a 4.6.46.
Les resultats des 200 simulations et les captures desktop/telephone restent
dans V4/revisions/2026-10-13-ai-opponents/.

## Verification

- Boot, IA et contenu Story : 19 tests passes.
- Build Pages : sept tests passes, 362 cartes, 1318 fichiers, environ 864 MiB.
- Verification Chrome du build : desktop, telephone, lecteur, telechargement PNG,
  decks, arene, reprise et publication additive passent sans erreur HTTP.
- Version applicative 4.6.47, edition des cartes et schema de sauvegarde inchanges.

Publication : Yoshi-san87/Kalistar, main et tag annote v4.6.47.

