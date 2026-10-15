# Kalistar 4.6.30 : les veilleurs blancs de Grivka

Cinq nouvelles cartes originales : Hrold, Sevrane, Taevrik, Ulvren et Nivra.
Tous sont Okami / Grivka / Cryo. Illustrations approuvees, dont la regeneration
complete de Nivra (06), conservees sans modification. Cartes natives 897 x 1497,
PSD editables, code-barres propre a chaque modele (49902201 a 49902205).

Roles et effets distincts dans les limites existantes. Aucune modification
du moteur, des sauvegardes, des equipements ou des regles. Aucun ancien
personnage ni composant verrouille ne change.

Verification native : cinq cadres fixes identiques, cinq PSD reouverts sans
ecart, cinq codes-barres valides. Tests des soixante faces, soutiens consommes,
Mort contre Esquive, barrieres, 24 matchs et restaurations. Migration du
catalogue : ajout unique des cinq cartes aux anciens profils locaux.

La publication utilise un export isole de l'index Git pour eviter les travaux
paralleles. Captures PC, Razr 50 et 320 px dans qa/browser/ (emulations,
pas un essai physique). La version est affichee sur PC et telephone.

## Resultats locaux

- 916 tests passes, 73 commandes de validation de publication.
- Build GitHub Pages : 356 cartes, 1293 fichiers, 849,6 MiB.
- Les cinq lecteurs testes en 1440, 412 et 320 px ; duel PC/Razr et reload.
- Migration d'une ancienne collection : 351 vers 356, aucun doublon.
- Zero erreur navigateur et zero ressource en echec dans le parcours Grivka.
- Une assertion de titre Armes encore restee en 4.6.27 a ete actualisee en
  4.6.30, en plus des versions visibles. Le pilote corrige est teste dans
  le meme export isole ; aucun code de jeu n'a ete modifie pour ce controle.
