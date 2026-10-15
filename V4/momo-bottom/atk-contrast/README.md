# Momo V4 : contraste des chiffres ATK

Source preservee : `../../templates/MOMO_V4_05_CHIFFRES_LISIBLES.psd`.

- PSD editable : `../../templates/MOMO_V4_06_CONTRASTE_ATK.psd`
- PNG : `../../cartes/MOMO_V4_06_CONTRASTE_ATK.png`
- Apercu : `preview.png`
- Comparaison avant / apres a 180 puis 240 pixels de largeur : `game-size-comparison.png`
- Detail avant / apres : `atk-comparison.png`

Seuls les styles natifs des textes ATK 202, 167, 84 et 29 changent : contour exterieur bleu-noir de 2 pixels a 90 %, ombre Multiply a 90 %, distance 2 pixels, taille 4 pixels. Ces effets sont editables dans Photoshop. Aucun aplat ni retouche peinte sur les capsules.

Le blanc chaud, la police, la taille et le centrage des chiffres restent identiques. Les fonds jaunes et l'electricite ne sont pas modifies. Les chiffres DEF, les capacites, le drapeau, son ombre, le code-barres, les positions et le bloc inferieur sont preserves.

`contrast.json` consigne les textes, polices, corps et limites des glyphes avant, apres et apres reouverture. `verification.json` controle les differences de pixels uniquement autour de ces quatre textes, les empreintes des sources et le rendu du PSD sauvegarde. Scripts reproductibles : `../../scripts/momo-bottom/improve-atk-contrast.jsx` et `verify-atk-contrast.cjs`.

Dimensions inchangees : 897 x 1497 pixels, 300 ppp, sRGB. Epreuve de design RGB, pas un BAT d'imprimerie.
