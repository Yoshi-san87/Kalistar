# Terrain De Zarok

Peintures originales creees avec l'outil image_gen integre le 25 octobre 2026.
Les PNG sources restent sur le PC ; aucun binaire dans Git.

## Direction Retenue

- Reference principale : `V3/assets/illustrations/21_NONE_LANIO.png`.
- Reference complementaire : `V3/assets/illustrations/19_MINERO_BELROG.png`.
- Zarok dans le recit existant : village accroche a la roche, bois, cordages,
  passerelles, eau conduite, ardoise et lanternes. Pas de palais desertique.
- Terrain communal ferme, sable compact, sans dunes ni ruines monumentales.
- Les limites blanches et la grille sont dessinees par le moteur au meme endroit
  que les cases interactives ; pas de marquages peints dans le fond.

Les premieres propositions `*-v1.png` sont des essais non retenus. Les versions
publiees sont `rhinoz-horizontal-v2.png` et `rhinoz-isometric-v2.png`, derivees
des consignes de [prompts-v2.json](prompts-v2.json). Le premier fichier de
consignes reste historique, sans autorite sur le decor retenu.

`node V4/astraball/tools/prepare-rhinoz.cjs` produit les deux WebP 1536 x 1024
de qualite 87. [media-report.json](media-report.json) contient leurs empreintes,
les empreintes sources et les tailles. Les medias publics sont inscrits
explicitement dans les deux listes runtime.

Sauvegarde native hors checkout :
`Documents/Sauvegardes-Kalistar/2026-10-25-astraball-rhinoz-v1/`.
Les exports sont cosmetiques ; aucun bonus Rhinoz ni changement de probabilite.
