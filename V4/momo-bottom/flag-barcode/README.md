# Momo V4 : finition du drapeau et code couleur

## Livrables

- `V4/templates/MOMO_V4_03_DRAPEAU_CODE_COULEUR.psd`
- `V4/cartes/MOMO_V4_03_DRAPEAU_CODE_COULEUR.png`

Chemins relatifs au projet Kalistar. La revision precedente est conservee.

## Retouches

Le tissu du drapeau et son ombre ont ete translates de 8 pixels vers la gauche, sans changement de taille. Le masque du groupe `15 FACTION` s'arrete a x=776 pour proteger le montant droit. Le tissu occupe maintenant x=678 a 774.

L'ombre d'origine `FACTION - Chroma - ombre portee` est reactivee dans le groupe V3. Un masque doux conserve uniquement l'effet autour de l'attache, avec une transition autour de y=848. Le tissu conserve son ombre independante.

Le groupe `16 CODE-BARRES` contient un objet dynamique en mode Produit, calibre exactement sur x=132..154 et y=848..1058. Son degrade cyan, violet, rose et dore colore le Code128 existant sans changer son trace ni son identifiant 30000001. La geometrie du code est toujours dans l'objet dynamique V3 original.

## Controles

- Canevas conserve : 897 x 1497 pixels, 300 ppp, sRGB.
- Aucun pixel modifie en dehors des zones drapeau et code-barres.
- Positions et bloc inferieur strictement inchanges.
- Montant droit identique au cadre propre de la premiere epreuve hybride.
- Export identique apres reouverture du PSD.
- Code128 30000001 decode sur l'export, en couleur et en niveaux de gris, a taille native et a 4x.

Le test de lecture est numerique. Une impression reelle et ses conditions de lecture restent a verifier ; ce fichier n'est pas un BAT d'imprimerie.

Details reproductibles : `assembly.json`, `verification.json`, `barcode-palette.json`, `barcode-before.json`, `barcode-after.json`. Les scripts sont dans `V4/scripts/momo-bottom/` : `prepare-barcode-tint.cjs`, `refine-flag-barcode.jsx`, `verify-flag-barcode.cjs`, `check-barcode-color.py`.
