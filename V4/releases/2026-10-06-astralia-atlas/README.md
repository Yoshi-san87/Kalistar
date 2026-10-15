# Kalistar V4.5.47 - Collection Astralia

La grille de Collection et son sommaire quittent le livre ouvert pour une seule
carte d'Astralia. Le parchemin brun conserve la matiere Kalistar ; la Terre
remaniee par l'impact est centree sur l'Atlantique et une terre emergee.
Rivages, reliefs, mesures, lignes de navigation et rose des vents sont peints
dans l'image, sans nouveaux noms ni changements du roman.

Original, prompt exact, conversion WebP et empreintes dans
`../../propositions/2026-10-06-astralia-atlas-v1/`.
Runtime : `../../site/assets/ui/collection-astralia-planisphere-v1.webp`.
L'outil integre `image_gen` a produit l'image ; le WebP de 1774x887 pese 554542
octets, sans agrandissement. Aucun canvas ni animation de fond permanente.

Le fond appartient au workbench et garde ses proportions : il ne se duplique
pas dans les deux groupes de cartes. La reliure et les folios decoratifs sont
retires. Le cadrage mobile centre la terre d'Astralia. Les marges laterales sont
symetriques, les noms et compteurs restent sur une bande de parchemin calme.
Carnets de personnage, Story, PNG approuves, equipements et saves sont preserves.

## Validation

`collection-map.browser.test.cjs` : sept formats de 320 a 2041px, absence de
reliure et de debordement, image decodee, proportions, contraste 4.5:1 des noms,
legendes contenues, pagination, index, filtres, versions, carnet et Story,
rechargement et controles tactiles Razr 50. Captures dans `verification/`.

Les controles media et de publication sont ajoutes au test build existant.

- Tests build/PWA cibles : 8/8 OK.
- 433 tests workflow OK ; build 232 cartes / 913 fichiers OK.
- Test atlas local et statique : sept formats et commandes tactiles OK.
- Regression versions/animations et lisibilite Fiche/Carriere/Exemplaires : OK
  sur sept formats, dans le snapshot isole ; anciens rapports preserves.
- Captures PC et Razr 50 inspectees, contraste des favoris tactiles corrige.
- Publication personnelle ciblee sur main avec tag annote v4.5.47.
