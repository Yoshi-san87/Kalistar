# Kalistar 4.6.70 - Titres des socles Collection

## Perimetre

Centrage et typographie des noms sur les socles, sans changer les cartes,
la matiere du socle, la pagination, les regles ou les sauvegardes.
Les publications Map 4.6.68 et Home 4.6.69 du parent restent intactes.

`collection-pedestal.css` reste l'unique proprietaire de cette mise en page :

- Deux rails lateraux de meme largeur maintiennent le nom sur l'axe de la
  carte, avec ou sans selecteur de versions et quel que soit son nombre de postes.
- Le centre vertical suit la face peinte, qui depasse de 8px au-dessus du socle.
- Les paliers typographiques dependent de la largeur du socle, pas du viewport.
- Les petits socles partagent tous une ligne de titre et une ligne de controles.
- Les noms longs gardent leur ajustement borne existant ; `fitPocketNames`
  respecte aussi les marges horizontales pour ne pas toucher les ornements.

Aucun media cree ou modifie, aucun verrou natif ou registre d'images retouche.
Les autres travaux non termines du checkout sont exclus de cette livraison.

## Verification

- Suite locale complete : 87 groupes valides apres mise a jour de l'assertion
  UI qui figeait l'ancien padding. Les nouveaux tests exigent un centre exact.
- Collection : sept formats, PC/Razr/phone et paysage, clavier, tactile,
  Reduced Motion, contraste force, pagination, filtres et rechargement.
- 60 cas de noms reels longs, huit cas longs avec cinq postes et 42 cas FF9.
  Aucun decalage horizontal mesure pour la rangee FF9 ; les noms courts gardent
  leur taille CSS avec ou sans editions. Changer d'edition ne deplace pas le titre.
- Regression historique des versions : compteurs, favoris, clavier, changements
  rapides, annulation et sept formats passes.
- Verification du build fige puis du site public, avec Collection, Decks,
  Arene et sauvegarde/reprise dans des profils navigateur jetables.

Captures et journaux conserves localement dans `work/qa/pedestal-titles/`.
Publication du commit exact avec tag annote `v4.6.70`, puis envoi direct au
projet Cloudflare personnel existant. Version PC/phone et assertions synchronisees.
