# Kalistar 4.6.3 - Gotham

Publication personnelle vers `Yoshi-san87/Kalistar`, branche main et tag
annote `v4.6.3`, apres la v4.6.2 des medaillons d'equipement.

## Contenu

- Huit nouvelles cartes natives : Double-Face, Poison Ivy, Le Sphinx,
  L'Epouvantail, Mr Freeze, Catwoman, Ra's al Ghul et Le Pingouin.
- Collection Batman dans la liste deroulante ; faction Gotham.
- Banniere originale noire et or a tour gothique, alternative explicitement
  choisie par l'utilisateur.
- Poison Ivy TOXINAR et Catwoman FELINEUS ; profils varies respectant les
  roles et les effets existants. Aucun changement des regles ou matrices.
- Catalogue : 296 vers 304 cartes, anciennes entrees conservees.
- Titres et versions desktop/mobile synchronises en 4.6.3. Edition V4 et
  schema des sauvegardes inchanges.

## Validation

- Huit PSD editables, PNG 897 x 1497 a 300 ppp, illustrations approuvees intactes.
- Huit preuves natives : zero difference fixe, zero difference au rechargement
  du PSD, codes-barres valides.
- 29 tests d'integration/collection/build passes, dont 48 faces ATK,
  48 faces DEF et 32 parties ABBA completes.
- 56 scenarios IndexedDB isoles passes sur les huit nouvelles cartes :
  anciens backups, exemplaires, transferts, conflits et matchs preserves.
- 24 fiches controlees a 1440/412/320 px ; arene desktop/mobile et reload.
- Suite elargie : 46/47 succes. Le seul echec est l'ancienne fixture Voloden
  de `catalogue-evolution.test.cjs:19`, qui suppose encore un seul ajout depuis
  septembre. Aucun ID Gotham ne participe a cette assertion. Le test et son
  rapport historique ne sont pas modifies pour masquer cet echec.
- Les six tests d'integration Gotham rejoignent le workflow Pages, avec
  hydratation explicite de leurs sources de preuve LFS.

Les tests de la serie ne pretendent pas etablir un taux de victoire cible.
Le detail des profils, des captures et des commandes de verification est dans
`V4/expansions/2026-10-09-gotham/README.md`.

## Perimetre preserve

Les changements d'equipement de 4.6.2 sont conserves. La modification locale
independante ajoutant le test de performance au workflow n'est pas incluse
dans cette release. Aucun fichier protege, ancien rapport ou hash de reference
n'est retouche. Les personnages sans illustration livree ne sont pas ajoutes.
