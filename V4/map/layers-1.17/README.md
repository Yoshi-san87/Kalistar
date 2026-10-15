# Foret cotiere et lisibilite d'Arborium - 1.17

Generation du recadrage forestier seul, depuis le terrain 1.16. Bosquets,
clairieres, petits ruisseaux et lisiere plus naturelle vers la cote.
Integration par masque editable au-dessus des retouches precedentes.

`kalistar-map-1.17.psd` conserve le fond initial verrouille, le relief neigeux,
le nouveau calque forestier et les trois groupes de villes. Arborium gagne
un calque Voile parchemin de lisibilite sous son monument et son nom : halo
ovale doux, couleur de papier, sans neon. Il peut etre masque independamment.
Les images, noms et positions des trois villes ne sont pas modifies.

Le fond exporte `../kalistar-map-1.17-base.png` reste sans villes ni halo.
`kalistar-map-1.17-preview.png` montre l'assemblage final. Les references,
sortie generative, masque, recadrages avant/apres et halo sont conserves.
`zone.json` contient les coordonnees et le polygone de retouche.

Reconstruction : `node V4/map/layers-1.17/build-zone-map.cjs` depuis le checkout,
avec les memes dependances isolees que la 1.15. Le PSD parent est la 1.16.
La ville est recompositee au-dessus du terrain, jamais integree au fond.

Controle : zero pixel modifie hors du masque ; calque neigeux, fond original,
monuments, textes et positions des villes preserves. Le masque, le composite
et les calques sont relus depuis le PSD. Inspection de la zone et carte entiere.
Ouverture native Photoshop non testee ici. Site et anciennes versions inchanges.
