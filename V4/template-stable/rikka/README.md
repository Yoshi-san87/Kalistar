# Rikka - Pour une vie de plus

Premiere carte V4 de Rikka, nom choisi par l'utilisateur. Le nom de travail Rilka reste uniquement dans les dossiers historiques de propositions.

## Profil

Felineus de Chroma, voleuse Electro au fouet. Position **P2 uniquement**. Elle derobe un Kalistel **Luxo** dans un musee pour tenter de sauver un ami cher. Le cristal de l'objet vole ne change pas son propre element.

| De | ATK | Type | DEF |
| --- | --- | --- | --- |
| 6 | 288 | Physique | Dodge |
| 5 | 238 | Magique Electro | 138 |
| 4 | 188 | Physique | 108 |
| 3 | 138 | Physique | 78 |
| 2 | 88 | Physique | 48 |
| 1 | 38 | Physique | Trefle |

Pas de barriere, de Reraise, de Mort ni de buff offensif. Le trefle sur une face DEF provoque une relance du de suivant la mecanique existante ; il n'attribue pas un buff a un allie. Avec cette face de relance, le dodge represente 20 % des issues defensives finales.

ATK moyenne 163, contre environ 167,94 pour les P2 V3 ayant six attaques chiffrees. Le dodge remplace la meilleure defense chiffree ; le trefle remplace la plus faible. Les quatre DEF restantes sont legerement reduites. Base de balance, a confirmer par des parties : la moyenne des faces ne suffit pas a garantir l'equilibre de tous les decks.

Donnees editables : [card.json](card.json). Details de comparaison : [balance.json](balance.json).

## Fichiers

- Carte : `../../cartes/RIKKA_V4_01_TEMPLATE_ELECTRO.png`.
- PSD editable : `../../templates/RIKKA_V4_01_TEMPLATE_ELECTRO.psd`.
- Maitre : `../KALISTAR_V4_TEMPLATE_03D_ELECTRO_RIKKA.psd`.
- Registre : `../registry-electro-03d.json`.
- Illustration approuvee conservee intacte : `../../assets/illustrations/42_ELECTRO_RIKKA_V4_01.png`.
- Adaptation de cadrage : `../../assets/illustrations/42_ELECTRO_RIKKA_V4_01_CADRAGE.png`.

Le musee a ete etendu via image_gen integre pour decaler la composition et rendre le reliquaire visible hors de la colonne DEF. La version approuvee 04D reste intacte ; l'adaptation generative ne revendique pas une identite pixel a pixel du personnage. [Prompt](prompt-cadrage.txt), [provenance et placement](framing.json). Le cadre n'est jamais regenere.

## Template

Geometrie 897 x 1497 px, 300 ppp, depuis Electro 03C. Nouveaux etats calibres : pictogramme Fouet V3, embleme Felineus V3, dodge DEF D6, trefle DEF D1 et son support. Valeurs, libelles et description sont des textes Photoshop natifs ; illustration, arme, race, dodge et code-barres sont des objets dynamiques incorpores. Les positions restent horizontales avec cinq supports disponibles.

Le Code128 `40000042` est une reference de cette carte V4, pas un numero d'exemplaire ni une preuve de propriete. Le trace reste independant du degrade de couleur. V3 refuse volontairement les identifiants V4 : aucune integration au site ou a la BDD n'est effectuee a ce stade.

## Production Et Controles

1. `prepare-rikka-barcode.py` produit le Code128.
2. `prepare-rikka.cjs` prepare les assets, le registre et le rapport de balance sans toucher aux sources protegees.
3. `render-rikka.jsx` assemble le maitre, la carte et les quatre rendus de non-regression ; les PSD sont reouverts.
4. `finalize-rikka-framing.jsx` permet d'appliquer le cadrage apres un premier rendu. Seul le contenu et le placement de l'objet dynamique Rikka changent ; tous les autres calques sont compares strictement. Les regressions precedentes restent applicables aux quatre anciennes cartes, dont l'illustration Rikka est masquee.
5. `verify-rikka.cjs` controle pixels du cadre, PSD reouverts, textes natifs, valeurs, types de faces, positions, assets, sources protegees et anciennes cartes.
6. `verify-barcode.py --card V4/template-stable/rikka/card.json` decode le PNG final en couleur et en niveaux de gris, taille native et agrandissement 4x.
7. `test-rikka.cjs` verifie les six attaques, dodge physique/magique et les relances DEF avec le moteur existant. Un identifiant de fixture est utilise uniquement en memoire, sans modifier les donnees V3.

Rapports : `verification.json`, `barcode-verification.json`, `render.json`. Apercus : `preview.png`, `small-240.png`. La lecture du code-barres apres impression reste a tester physiquement ; il s'agit d'une epreuve RGB, pas d'un BAT CMJN.

## Resultats

Verification technique passee : zero difference sur le cadre fixe, les PSD reouverts et les quatre regressions. Aucun calque inattendu modifie. Apres l'ajustement de cadrage, tous les calques feuilles hors illustration Rikka restent identiques ; les sources protegees et la proposition 04D sont intactes. Les quatre lectures du code-barres passent. Onze tests de mecanique passent. Revue visuelle a 897 px et a 240 px : chiffres lisibles, reliquaire visible, composition sans chevauchement du Kalistel par la DEF. Validation artistique finale reservee a l'utilisateur.
