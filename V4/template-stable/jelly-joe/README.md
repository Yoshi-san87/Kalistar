# Jelly-Joe V4 - La maree des chopes

Historique de la premiere proposition. La revision suivante, avec visage humain et badges communs agrandis, est documentee dans `../revision-03/README.md`. Ne pas confondre les presentes epreuves 01 avec la revision active 02.

## Livrables

- Carte : `../../cartes/JELLY_JOE_V4_01_TEMPLATE_ELECTRO.png`.
- PSD editable : `../../templates/JELLY_JOE_V4_01_TEMPLATE_ELECTRO.psd`.
- Illustration originale : `../../assets/illustrations/32_ELECTRO_JELLY_JOE_V4_01.png`.
- Template etendu : `../KALISTAR_V4_TEMPLATE_02_ELECTRO.psd`.
- Profil separe : `card.json` ; registre des variantes : `../registry-electro-02.json`.

## Direction artistique

Illustration generee avec l'outil image_gen integre, a partir de Momo et Valazar comme references picturales. Tete de meduse humanoide, manteau noir, marin d'age mur, ivresse joyeuse dans une taverne de Crabazar. L'image est conservee telle que generee, sans retouche locale ni regeneration du cadre.

Regle d'or : `../../DIRECTION_ARTISTIQUE.md`, egalement referencee dans `../../AGENTS.md`. Prompt : `../../donnees/prompt-jelly-joe-v4-01.txt`. Provenance, empreintes et decoupe du tissu : `assets.json`.

## Construction

Canevas du template : 897 x 1497 pixels, 300 ppp, sRGB. Le cadre, le cristal Electro, les fonds or et la typographie viennent du template stable. La nouvelle illustration reste un objet dynamique incorpore en pleine definition, avec mise a l'echelle uniforme dans la fenetre existante.

Les donnees de jeu restent celles de la V3 : P5, Lance, Tantalak, Crabazar ; ATK 171 / mana / 114 / buff ATK / 50 / bouclier ; DEF 203 / 166 / 136 / 99 / 62 / 25. Halos ATK D6/D4/D2 et barrieres DEF D6/D3.

Les pictogrammes de l'arme et de la race proviennent des objets dynamiques du PSD V3. Leur email de fond est separe du cerclage fixe V4. Le drapeau Crabazar garde son ratio et reste a l'interieur du montant droit ; seule la partie suspendue est reprise, sous la barre DEF et son ombre de contact. Son ombre de detachement est adaptee a sa silhouette.

## Verifications

`verification.json` controle le rendu du template avant/apres extension, le cadre fixe, le PSD reouvert, les champs natifs, les effets, les limites du drapeau, les donnees V3, l'illustration originale et les empreintes des sources protegees.

Le moteur de rendu a aussi reproduit Taulio pour un test de non-regression. La comparaison est faite avec le PSD Taulio original reexporte dans la meme version de Photoshop. Photoshop 26.11.7 differe de l'ancien export sur 11 pixels d'ombre de chiffres, d'un seul niveau RGB ; aucune geometrie ne change. A moteur identique, la comparaison est exacte.

`barcode-verification.json` confirme la lecture numerique de 30000032 en couleur et en niveaux de gris. Cela ne remplace ni une authentification de possession ni un test d'impression reel.

Controle visuel : `preview.png`, `family-comparison.png`, `small-180.png`, `lower.png`, `left.png`, `right.png`, `flag.png`.

## Reproduction

1. `../../scripts/stable/prepare-jelly.cjs` prepare les donnees et le tissu depuis les sources locales.
2. `extend-electro.jsx` cree le template 02 depuis le 01 sans l'ecraser.
3. `render-jelly.jsx` utilise le moteur commun `registered.jsx`, exporte Jelly-Joe et les controles de structure.
4. `check-engine.jsx`, `verify-jelly.cjs` et `verify-barcode.py --card V4/template-stable/jelly-joe/card.json` effectuent les controles.

Les PSD Momo, Taulio, le template 01, la V3, le site et la BDD ne sont pas modifies. Cette epreuve attend le retour artistique utilisateur et n'est pas un BAT imprimeur.
