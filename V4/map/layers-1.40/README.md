# Map 1.40 - Archipel relie par de petits ponts

Proposition locale du 22 novembre 2026, depuis la carte approuvee 1.39.
Elle ne remplace pas le fond Map ou Collection du site avant validation visuelle.

Les petites iles a l'est de Durane sont redessinees avec des cotes naturelles,
du relief grave et une vegetation espacee. De fins ponts relient l'arc principal
et sa branche occidentale ; l'acces continental est au nord seulement.
La foret de WoodLand, son lac, le centre de navigation et les huit villes
restent ceux de la carte approuvee. Aucun nouveau nom ni recit n'est ajoute.

## Sources et fichiers

- `zone-generated.png` : sortie exacte de l'outil integre image_gen.
- `zone.prompt.txt` : prompt exact ; entree 1 = recadrage de la version 1.39,
  entree 2 = map 1.0 uniquement pour la gravure, l'encre et le parchemin.
- `location-reference.png` : recadrage fourni par l'auteur.
- `zone.json` : placement natif, contours du masque et zones preservees.
- `kalistar-map-1.40-base.png` : terrain sans emblemes de villes.
- `kalistar-map-1.40-preview.png` : assemblage complet avec les huit villes.
- `islands-detail.png`, `coastal-context.png` : apercus integres.
- `kalistar-map-1.40.psd` : tous les calques precedents et un nouveau calque
  local a masque editable, place sous les villes independantes.
- `verification.json`, `provenance.json` : controles et empreintes SHA-256.
- `visual-review.json` : inspection de l'archipel integre et du planisphere.

Le controle final compte 8 237 pixels de terrain modifies dans le masque,
zero a l'exterieur ; les huit groupes de villes et tous les calques precedents
sont identiques apres relecture du PSD. Le lac, la foret, le cratere et le
centre de navigation preserves gardent leurs pixels initiaux.

## Reproduction et limites

Definir `KALISTAR_NODE_MODULES` avec les bibliotheques du poste, puis lancer
`node V4/map/layers-1.40/build-proposal.cjs` depuis la racine du depot actif.
La generation artistique utilise l'outil integre, sans API ou CLI de secours.
Sharp assure uniquement le recadrage, le masque, le raccord et les exports.

Le builder verifie les pixels hors masque, les zones preservees, les calques
precedents et le composite apres relecture PSD. Les fichiers 1.39, la source
1.0, l'asset web et site-config.js doivent garder leurs empreintes initiales.
Photoshop natif n'est pas invoque ; sa reouverture n'est donc pas revendiquee.
Le site et les donnees joueur ne sont pas modifies. Les tests complets de
publication web ne sont pas lances pour cette proposition de terrain locale.
