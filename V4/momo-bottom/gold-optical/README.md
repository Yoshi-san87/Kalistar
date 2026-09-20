# Momo V4 : or degrade et centrage optique

## Livrables

- PSD editable : `../../templates/MOMO_V4_08_OR_DEGRADE_CENTRAGE.psd`
- PNG : `../../cartes/MOMO_V4_08_OR_DEGRADE_CENTRAGE.png`
- Apercu : `preview.png`
- Ancien fond sombre / nouveau fond or, a 180 puis 240 pixels : `game-size-comparison.png`
- Pictogrammes avant (haut) / apres (bas) : `icons-before-after.png`

## Direction

Le bleu-noir de la revision 07 est abandonne au profit du jaune/or demande par l'utilisateur. Les quatre valeurs numeriques ATK retrouvent un fond dore : or ombre en haut, tonalite intermediaire sous les chiffres, jaune plus lumineux en bas. La reference est le grand rond 202 fourni par l'utilisateur. L'electricite et les bordures existantes sont conservees.

Les calques `ATK Dn - OR DEGRADE - fond editable` restent des remplissages degrades natifs a masque vectoriel. Les couleurs sont reglables dans Photoshop. La police, les corps, le centrage et les effets de texte ne changent pas.

Les pictogrammes sont deplaces sans redimensionnement ni regeneration :

- Trefle ATK : +2 pixels horizontalement, +1 verticalement.
- Trefle DEF : +2 pixels horizontalement, +1 verticalement.
- Potion ATK : +1 pixel horizontalement, -2 verticalement pour equilibrer le poids visuel du corps de la fiole.

Le fichier source revision 07 reste intact. Ses retouches utilisateur concernant la place du drapeau sont conservees dans la revision 08.

## Controles

`verification.json` confirme les dimensions 897 x 1497, l'absence de changement hors des quatre fonds et des trois pictogrammes, les textes inchanges, les translations sans redimensionnement, les degrades natifs editables, le rendu identique apres reouverture et l'empreinte du PSD source preservee.

`changes.json` conserve les degrades et l'etat des calques avant/apres. Scripts reproductibles : `../../scripts/momo-bottom/refine-gold-optical.jsx` et `verify-gold-optical.cjs`.

Epreuve sRGB 300 ppp, pas un BAT d'imprimerie. Le site, les donnees de jeu et les anciennes versions ne sont pas modifies.
