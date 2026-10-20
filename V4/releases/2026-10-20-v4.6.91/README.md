# Kalistar 4.6.91

Correction visuelle de la banniere Tomb Raider sur les cinq editions Lara Croft.
Le tissu turquoise et l'or sont conserves. La rose des vents reste circulaire,
sans compression horizontale ou verticale lors de l'insertion native.

## Perimetre

- Cinq PSD/PNG revises, meme emplacement 98 x 223 et memes profils.
- Aucun changement d'illustration, de regle, de texte, de Kalistel ou de sauvegarde.
- Nouvelle source et nouvel asset web versionnes ; sources et verrous historiques
  preserves. La galerie existante montre les sorties courantes.
- Revision : `V4/revisions/2026-10-20-tomb-raider-banner/`.

## Verification

- Cinq verifications natives : aucun pixel modifie hors banniere, aucune difference
  apres reouverture PSD, textes editables et codes-barres conformes.
- Trois tests de revision : proportions uniformes, alpha natif, preservation
  de tous les profils et du catalogue jouable, empreintes historiques intactes.
- Le premier placement Photoshop generique a ete rejete par le controle pixel.
  Le rendu final reprend le transplant pixel exact du composeur de bannieres ;
  le diagnostic initial reste preserve et les controles ne sont pas assouplis.
- `npm test` : 96 groupes valides ; `npm run test:local` : 13 groupes valides.
- Suite repository : 105 tests valides. Organisation et diff stage controles.
- Build Cloudflare : 444 cartes, 1 505 fichiers. Galerie controlee a
  1920/1440/800/412/320 px, clavier, filtres et Reduced Motion.
- Site : cinq lecteurs en desktop, Razr 50 et ecran 320 px ; chaque source native
  chargee est comparee par SHA-256 au PNG courant. Nouvelle banniere web verifiee.
- Collection, Decks, Arene, migration additive et reprise de match : valides.
- Aucun changement de signature executable : le routage du nouvel asset reste
  dans le module visuel collaborations, hors des identites du moteur.

## Conservation

Sauvegarde hors checkout :
`sauvegardes-personnelles/creation/2026-10-20-tomb-raider-banner-native/`
(225 fichiers, 216 143 145 octets, SHA-256 verifies).
Captures et logs : `work/qa/tomb-raider-banner/`.
Publication prevue sur le depot personnel et le projet Cloudflare Kalistar,
depuis le commit fige ; aucun binaire ajoute au Git.
