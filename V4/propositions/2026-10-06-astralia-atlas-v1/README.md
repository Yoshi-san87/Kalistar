# Astralia - Planisphere V1

Fond de Collection demande par l'auteur le 6 octobre 2026 : Terre remaniee
apres une meteorite, vue cartographique centree sur l'Atlantique et une terre
emergee au milieu. Parchemin brun, cotes brisees, montagnes hachurees, echelles,
lignes de navigation et rose des vents. Aucun royaume ou lieu nouveau nomme.
Cette illustration d'ambiance ne fixe pas une geographie canonique precise.

Generation par l'outil integre `image_gen`. Prompt exact dans `prompt.txt` ;
original PNG conserve dans `astralia-planisphere-original-v1.png`.
`prepare.cjs` produit le WebP runtime de 1774x887, sans agrandissement ni retouche
de l'illustration. `manifest.json` conserve dimensions, taille et empreintes.

Le runtime `../../site/assets/ui/collection-astralia-planisphere-v1.webp`
remplace le livre derriere la grille et dans le sommaire de Collection.
La carte est une seule surface continue : pas de reliure, de page ou de pli.
Le mode cover conserve les proportions sur PC et centre la terre emergee
sur telephone. Les legendes des cartes reposent sur une petite bande de
parchemin uni pour garder leur contraste sans masquer la carte du monde.

Story, les carnets de personnage et les autres surfaces gardent leurs textures.
Les anciens fichiers grimoire restent preserves et utilises dans ces vues.

Reproduction : `node V4/propositions/2026-10-06-astralia-atlas-v1/prepare.cjs`.
QA navigateur : `node V4/site/collection-map.browser.test.cjs`.
