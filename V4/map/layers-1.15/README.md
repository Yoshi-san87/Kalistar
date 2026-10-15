# Atlas a calques 1.15

## Fichiers

- `../kalistar-map-1.15-base.png` : terrain sans les trois villes.
- `kalistar-map-1.15.psd` : document RGB 8 bits, 1774 x 887 pixels.
- `kalistar-map-1.15-preview.png` : apercu assemble des calques visibles.
- `icons/` : trois illustrations originales haute resolution, alpha transparent.
- `layout.json` : positions et tailles des villes, font et couleur des noms.
- `sources/` : prompts exacts et deux etapes du fond avant correction finale.
- `provenance.json` : generations et empreintes des fichiers livres.

## Organisation du PSD

Fond verrouille, puis groupes Kalistopolis, Durane et Arborium. Chaque groupe
contient un calque raster Monument et un calque texte Nom editable. Les noms
ont un tres fin contour parchemin pour rester lisibles sur le relief.
Deplacer le groupe pour deplacer monument et nom ensemble. Les monuments
ne sont ni des objets dynamiques ni des vecteurs ; les PNG haute resolution
sont conserves pour les agrandir sans repartir du petit calque de la carte.

Le fond conserve de la foret sous Arborium : masquer le groupe restaure donc
la foret, pas une clairiere vide. Durane est situe contre le rebord sud-est
du cratere refait ; Kalistopolis reste sur la petite ile centrale.

## Reconstitution et controle

`node V4/map/layers-1.15/build-layered-map.cjs` depuis le checkout.
La bibliotheque ag-psd est isolee dans `tooling/` et ne modifie pas le jeu.
Installer ses dependances avec `npm ci --prefix V4/map/layers-1.15/tooling`
si elles ne sont pas presentes. Sharp utilise le runtime local deja disponible.

Le script verifie la transparence des trois sources, relit le PSD genere,
controle les groupes et noms editables, le verrou du fond et l'identite
des pixels du composite. Apercu inspecte visuellement. Photoshop n'est pas
installe ici : l'ouverture native n'a pas ete testee. Il peut demander une
mise a jour du rendu des calques texte ; la police est Times New Roman gras
italique, avec apercu bitmap conserve. Les PNG sont independants du logiciel.

## Ajouter une ville

Generer seulement son monument transparent dans la meme DA, le placer dans
`icons/`, puis ajouter son nom, centre et taille dans `layout.json`. Le script
reconstruit le PSD sans regeneration du terrain. Adapter le nombre de groupes
attendu dans le controle du script lorsqu'une ville est ajoutee. Ne pas
ecraser le document apres retouches manuelles sans une nouvelle version.

Le site et son fond de production ne sont pas modifies par cette livraison.
