# Publication V4 - 24 septembre 2026

## Catalogue et livrables

22 cartes et une arene ont ete publiees. Le jeu contient maintenant 80 cartes
et 23 arenes : 38 references approuvees et 42 creations verifiees.

- Automata : Commander White, Devola et Popola.
- Replicant : Nier, Kaine, Devola et Popola, avec leur banniere propre et
  l'arene Village de Nier. Le filtre Replicant est distinct d'Automata.
- Kalistar : Zviri (deux versions), Julienne, Verminia (deux versions), Polux,
  Nazar, Capitaine Skully, Xiaomi, Gen (deux versions), Lanio (deux versions),
  Reevus et Kognus.

Onze conversions conservent exactement leurs identifiants et caracteristiques
V3. Les autres cartes sont de nouvelles editions, pas des remplacements.
Devola et Popola partagent leur identite entre leurs versions ; leurs factions
et synergies restent distinctes. Aucune regle de combat n'a ete modifiee.

Les PNG sont au format natif 897 x 1497. Chaque carte conserve son PSD avec
textes editables et composants incorpores. Le registre courant fait autorite
pour leurs chemins : `../../atelier/data/references.json` et
`../../donnees/catalogue.json`. Sources et preuves restent dans `cards/`.

Kaine utilise la derniere revision demandee : une lame sur l'epaule, une lame
abaissee, deux longues lames courbes a dos crante. Le cadrage degage les armes
des colonnes de statistiques. Illustration et prompts sont archives dans
`art-c/revisions/kaine-20260924-framing/`; le cadre et les stats sont inchanges.

## Controles effectues

- 22 verifications natives individuelles ; les trois planches
  `visual-review/native-*.png` ont ete examinees.
- Regression complete 38/38 : zero difference de pixels, avant et apres
  reouverture des PSD ; codes-barres verifies sur les images finales.
- Les 193 fichiers proteges precedents et les 31 creations anterieures sont
  preserves. Le nouveau registre protege 293 fichiers.
- `gameplay-review.json` : 22 matchs simules termines avec decks valides,
  conservation exacte des 11 profils historiques. Ce test ne constitue pas
  une validation d'equilibrage competitif.
- `browser-review/report.json` : 1600 x 1000 et 390 x 844, toutes les 22 cartes
  sur ordinateur et six cartes sur telephone, images servies identiques aux
  exports, quatre cartes Replicant accessibles, nouvelle arene, dix positions
  deployees et restauration du match apres rechargement. Aucune erreur HTTP
  ou JavaScript. Les captures collection, lecteur et arene ont ete examinees.
- Construction statique : 80 cartes, 332 fichiers, 270,8 Mo. Le test navigateur
  de `../../deploy/browser.test.cjs` passe sur ordinateur et telephone :
  lecture, telechargement PNG, decks, arene, sauvegarde et ajout de catalogue.

La premiere verification mobile supposait quatre cartes simultanement alors
que le classeur affiche deux cartes par page. Le test parcourt maintenant la
pagination visible du pied de page et verifie les quatre identifiants sans
doublon. Aucun changement de presentation n'a ete fait pour ce controle.
Le constat initial est archive dans `browser-review/attempt-01-pagination/`.

Ces controles techniques et cette revue visuelle ne remplacent pas une
approbation artistique explicite de l'utilisateur.

## Transactions et reprise

- Cartes : `published.json`, transaction
  `3dec3b29-9754-49bd-b79c-084adbdbe245`.
- Arene et banniere : `arena/publication/`, transaction
  `f953f6cc-207f-4e7b-ac98-131890d73b29`.
- Production et revisions : `RAPPORT_NATIVE.md`, `ATTEMPT-01.md` a
  `ATTEMPT-04.md`, et preuves portables de regression dans `evidence/`.

Ne pas relancer capture, preparation ou publication du lot termine. Les
preuves de preparation concernent l'ancien registre avant son ajout explicite.
La finalisation de secours est documentee dans `FINALIZE-PUBLICATION.md` ;
elle n'a pas ete necessaire pour cette publication.

Le serveur local a ete relance sur `http://127.0.0.1:4304/jeu/`. L'integrite
et la porte de verification native passent avec le nouveau registre.
Les tests utilisent des navigateurs isoles, pas les possessions de l'utilisateur.

Le nettoyage autorise a supprime uniquement l'archive racine `Kalistar.zip`,
soit 7 372 398 907 octets. Les PSD, sources et sauvegardes de revisions sont
conserves. Voir `../../../maintenance/cleanup-2026-09-24/RAPPORT.md`.

La destination Git demandee et verifiee est le depot personnel
`https://github.com/Yoshi-san87/Kalistar.git`, branche `main`. Le clone de
transfert conserve ses propres regles LFS ; aucun depot professionnel n'est
utilise. L'historique Git constitue la preuve du commit et du push, pas ce
rapport de publication locale.
