# Momo V4 : positions et drapeau

## Livrables

- PSD : `V4/templates/MOMO_V4_02_POSITIONS_DRAPEAU.psd`
- PNG : `V4/cartes/MOMO_V4_02_POSITIONS_DRAPEAU.png`

Ces chemins sont relatifs au projet Kalistar. La precedente epreuve reste disponible et inchangee.

## Modifications

Les cases P3 et P4 ont ete deplacees ensemble, sans changement de taille, de police ni de dessin. Leur groupe occupe maintenant `[198, 992, 298, 1057]`, a droite du code-barres, avec une lecture horizontale.

Le drapeau utilise le tissu central de la source `V3/assets/factions/Chroma.png`, sans regeneration ni sur-echantillonnage. Le tissu extrait mesure 112 x 265 pixels et est affiche sur environ 96 x 228 pixels. Sa silhouette et son embleme restent ceux de Chroma.

Le groupe `15 FACTION - drapeau sous la barre DEF` contient le nouvel objet dynamique et son ombre separee. Son masque commence a y=829 pour laisser le tissu sous la barre de DEF. Le precedent drapeau et son ombre sont masques dans le groupe V3, sans etre detruits. Ce groupe autonome conserve les masques d'ecretage historiques du cadre.

## Verification

`verification.json` confirme :

- Canevas inchange : 897 x 1497 pixels.
- Aucun pixel modifie hors des deux zones demandees.
- Code-barres et bloc inferieur strictement identiques.
- Rendu identique apres reouverture du PSD enregistre.
- Sources V3 et precedente epreuve V4 inchangees.

Les scripts `prepare-flag.cjs`, `revise-positions-flag.jsx` et `verify-positions-flag.cjs`, dans `V4/scripts/momo-bottom/`, reproduisent cette revision.
