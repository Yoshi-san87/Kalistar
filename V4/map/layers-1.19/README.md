# Velane - 1.19

Village de cabanes habite principalement par des humains, ajoute a la demande
directe de l'auteur le 12 octobre 2026. Repere : arbre portant une cabane en
bois accueillante, sur fond transparent, dans la DA gravee sepia de l'atlas.

Retouche du seul recadrage de lisiere fourni : remplacement des grands
symboles anguleux par une foret fine et naturelle, bosquets, sentiers et
petits cours d'eau. Aucune regeneration du monde entier.

Le PSD reprend tous les calques 1.18 inchanges, ajoute un calque forestier
masque et un groupe Velane : ombre, arbre-cabane et nom editable. Velane se
trouve au nord-ouest d'Arborium. Les trois anciennes villes restent intactes.
Le fond exporte est sans ville ; l'apercu et le WebP web sont composites.

- `velane-icon.png` : source transparente haute resolution.
- `zone-before.png` / `zone-after.png` : inspection de la zone.
- `zone-generated.png` / `zone-fitted.png` : sortie originale et mise a l'echelle.
- `zone-mask.png` / `zone.json` : masque editable et parametres de la zone.
- `kalistar-map-1.19.psd` / `kalistar-map-1.19-preview.png` : livraison.
- `verification.json` / `provenance.json` : controle et empreintes.
- Les deux prompts exacts et le recadrage utilisateur sont conserves.

Reconstruction : `node V4/map/layers-1.19/build-velane.cjs` depuis le checkout,
avec les dependances isolees de la 1.15. Inspection de l'assemblage et de la
zone. Comparaison : 16 514 pixels de terrain modifies, zero hors du masque.
Zero changement du composite hors du masque et du nouvel emblème de Velane.
Anciennes couches, noms et positions verifies identiques apres relecture
du PSD. Ouverture native dans Photoshop non testee ici.
