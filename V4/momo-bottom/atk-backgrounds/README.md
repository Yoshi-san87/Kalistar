# Momo V4 : fonds ATK lisibles

## Livrables

- PSD editable : `../../templates/MOMO_V4_07_FONDS_ATK_LISIBLES.psd`
- PNG : `../../cartes/MOMO_V4_07_FONDS_ATK_LISIBLES.png`
- Apercu : `preview.png`
- Avant / apres a 180 puis 240 pixels de largeur : `game-size-comparison.png`
- Detail avant / apres : `atk-comparison.png`

## Source utilisateur

La source est `MOMO_V4_06_CONTRASTE_ATK.psd` apres les retouches utilisateur qui degagent de la place pour le drapeau. La copie reprend aussi les modifications non enregistrees presentes dans Photoshop au moment du travail. Le document source reste ouvert dans son etat initial ; aucun enregistrement ni ecrasement de ce fichier.

`before-photoshop.png` conserve l'export exact de cet etat utilisateur, qui differe de l'ancien export PNG de la revision 06.

## Construction

Le centre des quatre capsules numeriques ATK est un degrade radial bleu-noir avec un reflet or discret sur le bord. L'electricite d'origine reste au-dessus. Le jaune marque l'energie sur le pourtour, tandis que le coeur sombre detache les chiffres blancs.

Chaque interieur est un calque de remplissage degrade natif avec masque vectoriel elliptique, nomme `ATK Dn - COEUR SOMBRE - degrade editable`. Double-cliquer sur la vignette permet de modifier les couleurs. Le calque peut etre masque pour retrouver exactement le rendu precedent. Aucun chiffre, glyphe, cercle exterieur ni effet electrique n'est regenere ou aplati.

Le centrage, le corps des chiffres et leurs styles sont conserves. Les DEF, capacites, positions, drapeau, ombre, code-barres, illustration et bas de carte sont inchanges.

## Verification

`verification.json` verifie :

- Aucun pixel modifie hors des quatre disques interieurs ATK.
- Aucun changement de texte, taille, visibilite, position, opacite ou ecretage des calques existants controles.
- Quatre degrades natifs avec masques vectoriels.
- Export du PSD rouvert identique a l'export avant fermeture.
- Empreinte SHA-256 du fichier utilisateur sur disque inchangee.

`backgrounds.json` contient les geometries et les etats des calques. Scripts : `../../scripts/momo-bottom/refine-atk-backgrounds.jsx` et `verify-atk-backgrounds.cjs`.

Canevas preserve : 897 x 1497 pixels, 300 ppp, sRGB. Epreuve de design RGB, pas un BAT d'imprimerie.
