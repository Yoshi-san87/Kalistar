# Embleme Map et vignettes des villes

Nouvel atlas illustre cuivre/parchemin cree dans la DA des menus Collection
et Story. Source PNG transparente et prompt exact conserves. Generation :
exec-54da85f0-5d57-4c19-bf2a-79dbbe8b11a6, 12 octobre 2026.

`build-menu-assets.cjs` produit l'embleme Map en WebP sans perte 128x128,
avec marges transparentes et centrage optique. Les quatre vignettes de villes
sont derivees des sources transparentes : aucune nouvelle generation de
monument ni modification des anciens fichiers.

Le site lit `assets/navigation/map-v1.webp` et `assets/map/*-v1.webp`.
Les villes du module map-view.js utilisent des ancrages natifs dans l'atlas
1774x887 ; actualiser ces points si un monument est deplace dans le PSD.
Les details sont tires des reperes de l'auteur et de story-content.json :
sanctuaire de Kalistopolis, Obelisque de Durane, dome d'Arborium et cabanes
principalement humaines de Velane. Ne pas inventer une faction ou une histoire
precise pour combler des informations absentes.
