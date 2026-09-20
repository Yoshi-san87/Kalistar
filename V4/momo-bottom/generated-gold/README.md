# Momo V4 : matiere or generative integree

## Livrables

- PSD : `../../templates/MOMO_V4_09_OR_GENERE_INTEGRE.psd`
- PNG : `../../cartes/MOMO_V4_09_OR_GENERE_INTEGRE.png`
- Apercu : `preview.png`
- Comparaison avant / apres a 180 puis 240 pixels : `game-size-comparison.png`
- Details avant (haut) / apres (bas) : `capsules-before-after.png`

## Integration

Source : `MOMO_V4_08_OR_DEGRADE_CENTRAGE.psd`, conservee intacte.

La matiere de `../../propositions/ronds-generatifs-02/ROND_OR_NUANCE_BORD_SIMPLE.png`, validee par l'utilisateur, est integree dans les six fonds ATK. La zone interieure doree de l'image est utilisee ; sa bordure generee n'est pas superposee a celle de la carte. Les contours et les coordonnees des capsules existantes sont ainsi preserves.

Chaque calque `ATK Dn - OR GENERE - objet dynamique partage` est un objet dynamique incorpore, issu de la duplication de la meme source, avec un masque vectoriel circulaire. Aucune rasterisation ni mise a l'echelle cumulative. La matiere source reste a sa resolution originale dans le PSD, avec une transformation uniforme par instance.

Les six objets sont places sous les chiffres, les pictogrammes et les halos electriques. Les quatre degrades natifs precedents sont masques, pas supprimes. Le fond des capacites ATK (trefle et potion) utilise maintenant la meme matiere que les valeurs numeriques.

## Conservation

Les calques de texte et leurs styles, les pictogrammes et leur centrage optique, les halos, la DEF, le drapeau et son ombre, les positions, le code-barres, l'illustration et le bloc inferieur ne changent pas. La source utilisateur et l'image generative originale sont preservees.

Le site, le gameplay et la base de donnees ne sont pas modifies.

## Controle

`verification.json` confirme : aucun pixel modifie hors des interieurs ATK ; aucune modification inattendue des calques originaux ; typographie conservee ; six objets dynamiques avec masques vectoriels couvrant bien leurs capsules ; export identique apres reouverture du PSD ; empreintes des deux sources inchangees.

Le script verifie aussi la surface de chaque masque par son histogramme alpha, comparee a celle d'un disque. Les coordonnees de trace Photoshop sont converties en points a partir de la resolution de 300 ppp.

`integration.json` conserve les transformations, la geometrie des masques et les etats de calques avant/apres. Scripts reproductibles : `../../scripts/momo-bottom/integrate-generated-gold.jsx` et `verify-generated-gold.cjs`.

Dimensions : 897 x 1497 pixels, 300 ppp, sRGB. Epreuve de design RGB, pas un BAT d'imprimerie.
