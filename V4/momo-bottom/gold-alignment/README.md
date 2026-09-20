# Fonds or recentres et assombris

## Livrables

- PSD : `../../templates/MOMO_V4_10_FONDS_RECENTRES.psd`
- PNG : `../../cartes/MOMO_V4_10_FONDS_RECENTRES.png`
- Comparaison potion : `potion-before-after.png` (avant a gauche, apres a droite).
- Comparaison petit format : `game-size-comparison.png`.

Source conservee : `MOMO_V4_09_OR_GENERE_INTEGRE.psd`. Canevas inchange : 897 x 1497 pixels, 300 ppp, sRGB.

## Construction

Les cinq petits fonds sont ajustes a l'ouverture interieure du cerclage, qui ne coincide pas avec le centre des limites du calque : centre decale de 2 pixels a droite et 1 pixel vers le bas, rayon ramene de 38 a 35,5 pixels. Le grand fond conserve sa geometrie.

Les six objets dynamiques conservent la matiere generative incorporee et leurs masques vectoriels circulaires. Un style de calque noir en mode Produit a 16 % assombrit uniquement la matiere or. Ce reglage reste reversible dans Photoshop.

Les cerclages, eclairs, chiffres, symboles, DEF, illustration, drapeau et autres elements ne sont pas modifies.

## Verification

`verification.json` confirme :

- aucun pixel modifie hors des six interieurs ATK ;
- aucun autre calque modifie ;
- six objets dynamiques editables et masques circulaires alignes ;
- rendu identique apres enregistrement et reouverture du PSD ;
- source PSD inchangee.

Scripts : `../../scripts/momo-bottom/align-gold-interiors.jsx` et `../../scripts/momo-bottom/verify-gold-alignment.cjs`.
