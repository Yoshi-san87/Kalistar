# Kalistar 4.6.8 : panneau central d'arene

## Perimetre

Habillage cuivre grave, metal sombre, texture grimoire et titres Cinzel du
panneau central. Embleme d'Arene partage avec le menu et petit Kalistel rainbow.
Les chiffres, cartes natives, equipements, moteur, RNG et sauvegardes ne changent pas.

Le cote du joueur actif porte un reflet mobile leger; le lancer et la resolution
declenchent une lueur metallique contenue. Animations CSS transform/opacity,
aucun canvas/timer/listener supplementaire. Pause sous les popups, suppression
en Reduced Motion et destruction naturelle a la sortie de l'arene.

Le telephone conserve sa bande centrale de 110px. Le cadre ne gagne pas de
largeur; l'action reste utilisable au pouce. Le detail complet reste dans le journal.

## Verification

Les tests du composant et les controles navigateur couvrent l'attaque, la
defense adverse, la resolution, le lancer reel, la sauvegarde/reprise, le
resize, les variantes historiques de matiere, une popup, Reduced Motion,
la fin de match et la sortie de l'arene. Profils QA isoles uniquement.

Formats : 1440x1000, 1920x1080, Razr 412x1007, 320x568 et paysage 844x390.
Captures finales et resultats du site construit :
`../../revisions/2026-10-09-arena-console/qa/built/`.
Les captures PC et Razr ont ete inspectees. Les 610 tests de publication
passent sur l'export isole de l'index, sans les changements d'autres taches.
Le build contient 315 cartes, 1134 fichiers et 765.5 MiB environ.
Suite complete et construction : `qa/publication.json` et `qa/build.txt`.
Le controle du joueur actif passe sur 21 etats moteur reels, soit 42 controles
PC/telephone : `../../revisions/2026-10-09-arena-console/qa/turn-cue/results.json`.

## Publication

Cible exclusive : https://github.com/Yoshi-san87/Kalistar.git, branche main,
tag annote v4.6.8, apres v4.6.7. Les fichiers de version PC/telephone et leurs
assertions sont mis a jour ensemble. Le staging exclut les changements d'autres
taches, notamment Collection et la ligne locale de test performance du workflow.
Verification du workflow Pages et des fichiers publics apres le push.
