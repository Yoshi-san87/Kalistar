# Final Fantasy VI, XV et XIII / propositions Kalistar

29 illustrations individuelles, generees avec l'outil integre `image_gen`.
Statut : propositions en attente de selection, pas de nouvelles cartes jouables.

- FFVI : 14 images, dont Terra normale et Terra en transe.
- FFXV : 7 images. Le nom Gladiolus corrige la coquille de la demande.
- FFXIII : 8 images, avec les tenues de Final Fantasy XIII.

Ouvrir `index.html` pour la galerie locale, avec filtre par jeu et originaux
accessibles depuis les images. `ensemble.jpg` et les trois planches par jeu
offrent des vues comparatives. Les PNG originaux sont conserves sans retouche.

## Direction artistique

Les illustrations Momo et Valazar ont ete examinees avant generation : peinture
texturee, plans de couleurs visibles, matieres usees, lumiere expressive et
gestes vivants. Les scenes proposent des moments narratifs varies ; elles ne
pretendent pas reproduire exactement une sequence officielle des jeux.

Terra en transe est une reinterpretation vetue : tunique opaque et leggings,
transformation visible sur le visage, les cheveux et la lumiere. Une premiere
tentative a ete refusee par l'outil ; les deux prompts et le changement de
contenu sont consignes dans `02-terra-transe-attempts.json`.

## Tracabilite

- `prompts.json` : plan initial, prompts et sources de recherche.
- `02-terra-transe-attempts.json` : prompt final de la transe, tentative 2.
- `provenance.json` : sorties originales, dimensions et SHA-256.
- `manifest.json` : propositions effectivement generees et source du prompt
  exact de chacune. Ce manifeste fait foi pour l'etat de livraison ; les
  statuts pending du plan initial sont conserves comme historique.
- `ingest.cjs` : copie non destructive des sorties du generateur.
- `build-gallery.cjs` : verification des sources et construction des apercus.
- `gallery.test.cjs` : verification de la galerie sur ordinateur et mobile.

Les references officielles sont les pages Final Fantasy VI, XV et XIII de
Square Enix, repertoriees dans `prompts.json`. Les illustrations restent separees
du catalogue, des profils, des statistiques et des cadres de cartes valides.

## Verification locale

```text
node V4/propositions/2026-10-09-ff6-ff15-ff13/build-gallery.cjs
node V4/propositions/2026-10-09-ff6-ff15-ff13/gallery.test.cjs
```
