# Kalistar 4.7.28 - Collection sans defilement

## Demande

La galerie Collection doit tenir sur un ecran fixe, sur ordinateur comme sur
telephone. Les cartes suivantes restent accessibles par pagination, geste
lateral et index des pages, sans defilement vertical de la galerie.

## Correction

- La capacite de la page depend de la largeur ET de la hauteur disponibles :
  une ou deux rangees, deux a six colonnes (huit en affichage compact).
- Chaque image garde son ratio natif, avec son socle et ses commandes visibles.
  Un conteneur CSS dimensionne l'image sans boucle de reduction des polices.
- Sur petit ecran, les cristaux restent dans les filtres et le titre de version
  reste dans la fiche ; ces doublons laissent la place aux cartes.
- En paysage tres bas, la selection Mes cartes / Catalogue rejoint la barre
  d'outils et le socle passe a cote de la carte.
- Retour de la fiche a la meme page, pagination complete, favoris et versions
  conserves. Les fiches detaillees et les dialogues gardent leur defilement
  interne pour ne jamais masquer un recit ou une information.

Aucun changement de catalogue, de possessions, de sauvegardes, de base de
donnees ou de regles. Aucun nouveau media binaire.

## Verification

Les preuves sont conservees sous `work/qa/collection-fixed*`, avec des profils
jetables. Les tests de galerie verifient desormais l'absence de debordement
vertical de la page ET de la zone Collection, chaque carte et chaque socle
entiers, les noms longs, les cinq positions et les filtres. Ils controlent
aussi la pagination, le retour/focus et les gestes tactiles.

- Matrice visuelle : 186 controles sur neuf formats de 320x568 a 2560x1440,
  dans les deux densites, sans echec ni erreur JavaScript.
- Fenetre PC 1440x600 : carte de 240 px de haut, socle et commandes entiers.
- Parcours navigateur PC et mobile complets, versions et telechargement du PNG
  natif sur sept formats : passes, avec profils jetables.
- Suite locale : 14 invocations passees. L'ancien garde-fou qui interdisait
  toute adaptation aux fenetres PC basses est actualise : le cadrage compact
  reste limite a la galerie, sans convertir sa fiche en interface telephone.

Controles de livraison : suites CI et locale, tests de geometrie PC/phone,
parcours navigateur complet, mobile, versions de cartes, build fige et acces
prive en ligne. Le paquet publie est prepare depuis le commit exact, pas
depuis les autres brouillons du dossier partage.
