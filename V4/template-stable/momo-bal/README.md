# Momo - Le Bal des objets perdus

Declinaison V4 du profil V3 `30000014`, sans regeneration de l'illustration et sans modification du jeu V3.

## Livrables

- Carte : `../../cartes/MOMO_BAL_V4_01_TEMPLATE_ELECTRO.png`.
- PSD editable : `../../templates/MOMO_BAL_V4_01_TEMPLATE_ELECTRO.psd`.
- Maitre etendu : `../KALISTAR_V4_TEMPLATE_03C_ELECTRO_MOMO_BAL.psd`.
- Registre : `../registry-electro-03c.json`.
- Donnees dynamiques : `card.json`.

Geometrie conservee : 897 x 1497 pixels, 300 ppp, sRGB. Les variantes Momo original, Taulio et Jelly-Joe Encre restent disponibles dans le maitre. Leurs fichiers approuves ne sont pas remplaces.

## Contenus

Illustration et code-barres importes depuis `../../../V3/templates/14_ELECTRO_MOMO_CARILLON.psd`, en objets dynamiques incorpores. Le cadrage V3 de l'illustration est conserve sans transformation. Le titre, le metier Musicien, la description et les statistiques proviennent de `../../../V3/donnees/cartes.json`.

- Positions : 3 et 4, supports V4 agrandis et ombres natives, de gauche a droite.
- ATK, D6 a D1 : 296, 244, 192, trefle, 95, potion.
- DEF, D6 a D1 : 171, 146, 114, 82, 50, 25.
- Magie : D6, D5, D4, D2. Barrieres : D5, D3.
- Instrument, Robot, Chroma et cristal Electro : composants V4 existants, sans changement de geometrie.

Le trefle et la potion sont des copies des composants V4 approuves. Seule leur translation entre emplacements fixes change ; leur alignement optique est conserve. Tous les nombres et textes restent natifs Photoshop. La teinte du code-barres conserve le degrade V4.

## Production et controles

1. `../../scripts/stable/prepare-momo-bal.cjs` prepare le profil, le registre et les empreintes de protection.
2. `../../scripts/stable/render-momo-bal.jsx` etend une copie du maitre 03B, produit et reouvre les PSD, puis genere les preuves de cadre et les rendus de non-regression.
3. `../../scripts/stable/verify-momo-bal.cjs` compare les pixels, champs natifs, effets et sources. Il exporte le PNG final uniquement si tous les controles passent.
4. `../../scripts/stable/verify-barcode.py --card V4/template-stable/momo-bal/card.json` decode le code-barres final en couleur et en gris.

Rapports : `verification.json`, `barcode-verification.json`, `render.json`, `assets.json`. Apercus : `preview.png`, `small-240.png`, `reference-v3.png`.

Controle Photoshop 26.11.7 : verification globale reussie ; zero pixel de difference sur le cadre fixe, les PSD reouverts et les trois cartes precedemment approuvees. Statistiques, effets, positions et recit V3 verifies. Les empreintes de toutes les sources protegees restent identiques.

Les comparaisons de non-regression utilisent les PSD approuves reouverts dans le meme moteur Photoshop. Les couleurs sont normalisees en sRGB pour comparer les pixels. Les masques d'ecretage du cadre sont conserves.

Epreuve RGB, pas un BAT CMJN. La lisibilite du code-barres imprime sur support physique reste a tester. Ce code visuel ne prouve pas a lui seul la propriete de la carte.
