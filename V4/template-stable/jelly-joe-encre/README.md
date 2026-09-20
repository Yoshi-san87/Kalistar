# Jelly-Joe V4 - Encre 08B

## Fichiers actifs

- Carte : `../../cartes/JELLY_JOE_V4_03_ENCRE.png`.
- PSD editable : `../../templates/JELLY_JOE_V4_03_ENCRE.psd`.
- Illustration incorporee : `../../assets/illustrations/32_ELECTRO_JELLY_JOE_V4_03_ENCRE.png`.
- Maitre : `../KALISTAR_V4_TEMPLATE_03B_ELECTRO_ENCRE.psd`.
- Registre : `../registry-electro-03b.json`.
- Profil de production : `card.json`.

L'utilisateur a valide l'illustration Encre 08B puis demande les positions **3 et 5**. Le profil V4 et les deux badges natifs ont ete ajustes. ATK, DEF, effets, cristal, arme, race, faction, nom et description sont conserves. La V3 jouable n'est pas modifiee.

## Fabrication

L'illustration validee est copiee integralement depuis `../../propositions/jelly-joe-dandy-02/08b-encre-visage-affine.png`, sans nouvelle generation ni retouche locale. Elle est placee dans un nouvel objet dynamique incorpore, avec une mise a l'echelle uniforme et un cadrage legerement decale a gauche pour degager la lance du rail DEF. Le masque du cadre reste intact. Provenance generative : `../../propositions/jelly-joe-dandy-02/revision-08b.json` et `prompt-08b.txt` dans ce meme dossier de propositions.

Le nouveau maitre 03B conserve la geometrie d'Electro 03 : 897 x 1497 px, 300 ppp, sRGB. Seul l'asset Jelly-Joe est actualise dans la banque d'illustrations ; Momo reste visible par defaut et son rendu est compare pixel par pixel au maitre precedent. Les anciens PSD et PNG restent intacts.

Les valeurs, positions, textes, effets et pictogrammes restent editables. Les positions sont des textes Myriad Pro Regular natifs, avec supports en objets dynamiques et ombres de calque conservees. Leur ordre est 3 puis 5, horizontalement pres du code-barres.

## Production et controles

1. `../../scripts/stable/prepare-encre.cjs` prepare le profil, le registre et les empreintes de protection.
2. `render-encre.jsx` construit le maitre 03B et la carte. `render-encre-card.jsx` permet de regenerer uniquement la carte depuis le maitre, notamment apres un changement de profil.
3. `verify-encre.cjs` verifie les pixels hors illustration/positions, le cadre fixe, les deux PSD reouverts, les champs natifs, les statistiques, les effets et les sources protegees. Il produit le PNG final sRGB.
4. `verify-barcode.py --card V4/template-stable/jelly-joe-encre/card.json` decode le code-barres de l'export final.

Rapports : `verification.json`, `barcode-verification.json`, `render.json`, `assets.json`. Apercus : `preview.png`, `small-240.png`, `positions.png`.

La verification numerique du code-barres ne remplace pas un test d'impression reel. Ce fichier RGB n'est pas un BAT CMJN.
