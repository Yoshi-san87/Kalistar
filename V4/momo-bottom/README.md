# Momo : base V3, bloc inferieur V4

Nouvelle epreuve de design, a valider visuellement. Ni la V3 ni le Momo V4 precedent ne sont remplaces.

Revision suivante : voir `positions-flag/README.md` pour Momo avec les positions a gauche et le drapeau agrandi. Les fichiers de cette premiere epreuve restent inchanges.

Derniere revision : `flag-barcode/README.md`, drapeau rentre du montant droit, ombre d'attache restauree et code-barres en degrade de couleur. Livrable : `MOMO_V4_03_DRAPEAU_CODE_COULEUR`.

Retouche d'ombre suivante : `attachment-shadow/README.md`. Le livrable le plus recent est `MOMO_V4_04_OMBRE_ATTACHE`, avec une ombre de contact visible sur le tissu ; aucun autre changement.

Revision typographique suivante : `number-type/README.md`. Le livrable `MOMO_V4_05_CHIFFRES_LISIBLES` contient les neuf valeurs ATK/DEF en Bahnschrift Bold SemiCondensed, plus hautes et recentrees. Les positions 3 et 4 et les autres elements sont conserves.

Retouche de contraste suivante : `atk-contrast/README.md`. Le livrable `MOMO_V4_06_CONTRASTE_ATK` ajoute un contour sombre et une ombre courte sur les quatre chiffres ATK a fond jaune. Police, corps, centrage et reste de la carte sont conserves.

Revision des fonds sombres : `atk-backgrounds/README.md`, livrable `MOMO_V4_07_FONDS_ATK_LISIBLES`. Reprend les retouches utilisateur de la revision 06, y compris l'etat ouvert non enregistre. Quatre fonds degrades sombres editables ; l'electricite exterieure et tous les autres pixels sont conserves.

Revision or et centrage : `gold-optical/README.md`, livrable `MOMO_V4_08_OR_DEGRADE_CENTRAGE`. Remplace les quatre fonds bleu-noir par des degrades or ombre vers jaune lumineux selon la reference utilisateur. Ajuste legerement le centrage optique des deux trefles et de la potion. Retouches utilisateur du drapeau conservees.

Integration generative : `generated-gold/README.md`, livrable `MOMO_V4_09_OR_GENERE_INTEGRE`. Integre la matiere or generative validee dans les six capsules ATK, avec objets dynamiques et masques vectoriels. Les contours d'origine, les textes, les symboles, les eclairs, la DEF et le drapeau restent inchanges.

Revision courante : `gold-alignment/README.md`, livrable `MOMO_V4_10_FONDS_RECENTRES`. Ajuste les cinq petits fonds a l'ouverture interieure de leur cerclage, et assombrit legerement les six fonds or avec un style de calque reversible. Aucun chiffre ni pictogramme n'est deplace.

## Livrables

- PSD : `../templates/MOMO_V4_BASE_V3_BAS_V4.psd`
- PNG : `../cartes/MOMO_V4_BASE_V3_BAS_V4.png`
- Comparaison du bas : `comparison-bottom.png` (V3 a gauche, nouvelle epreuve a droite).

## Construction

La source est `V3/templates/01_ELECTRO_MOMO.psd`, copiee puis convertie en RGB sRGB pour cette epreuve. Le canevas reste a 897 x 1497 pixels, 300 ppp. L'illustration, les statistiques, le drapeau, le code-barres et les positions restent ceux de la V3.

Le groupe `10 V3 ORIGINALE` conserve les calques V3. Son masque affiche la partie haute jusqu'a la ligne 1067 incluse. Aucun contenu de ces calques n'est reconstruit.

Le groupe `20 BLOC INFERIEUR V4` commence a la ligne 1068. Il provient du fond Momo V4, adapte par une mise a l'echelle uniforme, sans etirement :

- `21 STRUCTURE V4` : fond en objet dynamique, verrouille.
- `22 ARME RACE CRISTAL` : quatre objets dynamiques independants, dont les branches colorees du cristal.
- `23 TITRE METIER RACE RECIT` : quatre calques de texte natifs, editables dans Photoshop.

La ligne des avantages/faiblesses imprimes a disparu dans ce nouveau bas. Le texte de version est `L'ARTISTE MAGIQUE` et la description reprend la derniere version de Momo.

## Controles

`verification.json` compare chaque pixel au-dessus du raccord avec un export RGB du meme PSD V3. Il controle aussi les empreintes des sources et l'identite du rendu apres reouverture du PSD final.

`psd-inspection.json` recense les dimensions, les quatre textes editables et les cinq objets dynamiques du bloc inferieur. `assembly.json` conserve les coordonnees exactes du raccord.

Le PNG inclut les marges noires d'origine. Cette epreuve RGB n'est pas un BAT d'imprimerie : profil CMJN, fond perdu et reperes restent a valider avec l'imprimeur.

Les scripts reproductibles sont dans `../scripts/momo-bottom/`. La V3, son site et sa base de donnees ne sont pas modifies.
