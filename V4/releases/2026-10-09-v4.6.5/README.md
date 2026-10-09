# Kalistar V4.6.5 — Préparation Compacte

## Livraison

- Capitaines et noms des decks, sans grille de cartes.
- Adversaire au hasard : dix personnages distincts, couverture minimale de deux
  cartes par position, formation complète, capitaine titulaire, un Rainbow maximum.
- Détente / Équilibré / Tactique : cohésion croissante, sans bonus caché ni
  modification du moteur, des dés, de l'ABBA ou du tip-off.
- Arène au hasard ou choix manuel. Shuffle de moins d'une seconde, annulable,
  Reduced Motion, sans téléchargements d'illustrations intermédiaires.
- Capture du tirage avant l'attente IndexedDB ; sauvegardes existantes conservées.

## Vérification Locale

594 tests de la commande de validation du workflow ont passé sur l'index isolé.
Le premier build a échoué par manque de place sur C:. Seules ses copies temporaires
non utilisées par la publication ont été supprimées, après leurs tests de preuve ;
aucun fichier source du projet n'a été supprimé. La relance a construit 306 cartes,
1075 fichiers, 741,4 MiB. Les logs initiaux gardent la trace de cet échec technique.

12 tests ciblés incluent les 8 nouveaux tests et les contrats de chargement/perf.
La campagne de 100 graines / 300 compositions vérifie une progression de cohésion
pour chaque graine : moyennes 30,88 / 75,26 / 183,16. Il s'agit d'un indicateur de
construction, pas d'une preuve de taux de victoire ou d'équilibrage universel.

Le site construit est vérifié sur PC 1440×1000, Razr 412×1007 et téléphone compact
320×568 en Reduced Motion : choix manuels, trois niveaux, tirages, blocage du
lancement durant le shuffle, Back, composition affichée conservée et reprise.
Le parcours GitHub Pages complet couvre aussi Collection, Story, Deck, Arène,
sauvegarde et absence d'erreurs HTTP. La régression des compositions conserve
formation, capitaine et équipements sur les deux camps.

Sources et captures : [révision avant-match](../../revisions/2026-10-09-pre-match/README.md).
Les preuves JSON et logs sont dans `qa/` ; le manifeste du build final y est conservé.
