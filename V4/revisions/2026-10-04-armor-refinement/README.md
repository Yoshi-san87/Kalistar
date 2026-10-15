# Armures Kalistel - retouches de lisibilite

Demande du 4 octobre 2026, apres la version 4.5.10.

## Perimetre

- Eryss, Velran, Saelor et Liorne : gemmes Herbo et nervures des epaulettes
  nettement plus lumineuses, sans modifier les formes du bois ou leurs scenes.
- Neryk : casque tenu en main vide, verre sombre reflechissant sans oeil.
- Orven : canines deployees jusqu'au bas du visage, mecanisme retractable
  suggere aux attaches, visiere active uniquement entre les deux canines.
- Aeren (49900311) : retrait du catalogue et des six fichiers de creation actifs.
  Vessa reste presente. Les sources historiques approuvees et rapports restent
  preserves, ainsi que les sauvegardes de cette revision.

Les Kalistels montes sur les armures sont autorises visuellement par l'utilisateur
meme pour un personnage NONE. Orven et Velran restent NONE, sans magie ni barriere
personnelle. Aucun bonus, chiffre ou regle de combat n'est modifie.

## Sources et methode

Images retouchees avec l'outil integre image_gen, une generation par illustration.
Prompts complets, references et sorties retenues : art-prompts.json.
Images finales versionnees : V4/Illustrations/City_Guards_Orven_04.png,
City_Guards_Neryk_04.png et Arborium_Guards_{Eryss,Velran,Saelor,Liorne}_03.png.
Copies de travail : selected-art/. Cartes natives et preuves : cards/.

Le pipeline reprend le composeur V4 valide, avec textes natifs editables,
illustration en objet dynamique et verification du PSD reouvert. Aucune
regeneration du cadre. before.json et before/ figent l'etat initial ; ils ne
sont jamais remis a zero pour contourner un controle.

Commandes : node build.cjs freeze, prepare, render, verify, game, publish, retire.
Les actions Photoshop/publication demandent respectivement les variables
KALISTAR_ARMOR_PS et KALISTAR_ARMOR_PUBLISH egales a 2026-10-04.
La suppression active controle les chemins resolus, les six fichiers exacts,
leurs empreintes et leurs sauvegardes avant tout retrait.

## Validation

- native-checks.json : geometrie fixe, code-barres, rendu reouvert et pixels
  hors illustration pour les six cartes.
- revision.test.cjs : profils et catalogue compares au snapshot hors Aeren,
  fichiers natifs controles, absence d'Aeren et maintien de Vessa.
- integration.test.cjs : les 18 soldats restants, deux decks valides et 24
  rencontres completes avec sauvegarde/reprise et soutiens.
- browser.test.cjs : lecteurs, cartes, filtre CRUSTOS, arene et reload en
  1440 x 1000 et 412 x 915, sans modifier les donnees du navigateur personnel.

Ces tests courants remplacent dans le workflow les tests de publication des
lots precedents, qui restent intacts et documentent leur perimetre historique.
