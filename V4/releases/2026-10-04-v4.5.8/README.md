# Kalistar 4.5.8

Revision des gardes, retrait de Sovra et Helvik et ajout de quatre soldats
d'Arborium. Le catalogue passe de 210 a 212 cartes.

Les nouveaux Arborium ont une armure militaire en bois articule : Eryss,
Toxinar ; Velran, Humain sans cristal ; Saelor et Liorne, Cerelf.
Les retouches conservees restent dans la direction artistique peinte Kalistar.

Sources, prompts, PSD editables et controles :
`../../revisions/2026-10-04-guards-arborium/`.

Version desktop et smartphone : 4.5.8. Edition et sauvegardes : V4, inchangees.
Publication prevue sur Yoshi-san87/Kalistar, main et tag annote v4.5.8.
Les anciennes compositions avec les deux cartes retirees doivent etre completees.

## Verification

- 16 exports natifs valides : zero difference de cadre, reouverture PSD exacte,
  16 codes-barres corrects, descriptions sur quatre lignes maximum.
- Douze comparaisons avant/apres : aucun pixel change hors des zones demandees.
- Trois tests d'integration, dont 24 matchs complets avec les 19 soldats,
  effets de soutien et restaurations repetees des sauvegardes.
- 19 fiches controlees dans Chrome isole ; captures desktop 1440 x 1000 et
  Razr 50 412 x 915, filtre Crustos et reprise d'arene sans erreur.
- Suite navigateur generale Pages valide : collection, telechargement PNG,
  decks, arene, sauvegarde et publication additive.
- Build Pages : 212 cartes, 670 fichiers, environ 526.7 Mo.
- 81 fichiers individuels de Sovra et Helvik retires avec manifeste SHA-256.
- Les 196 cartes non revisees/retirees gardent leurs fichiers anterieurs.

Les 134 tests du workflow et le build ont reussi sur l'instantane Git isole
`ecbcd984f126786acd8e90fd8ed30a95e7220db9`. Resultats conserves dans
`workflow-results.json`. Le script `public-check.cjs` verifie ensuite la version,
le commit, les 16 PNG publics et l'absence des deux cartes retirees.
