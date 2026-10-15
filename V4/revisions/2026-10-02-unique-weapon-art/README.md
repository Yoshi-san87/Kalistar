# Armes uniques - Hache et Flute

Design demande le 2 octobre 2026, genere avec l'outil image_gen integre.
Ce lot est visuel uniquement : IDs, compatibilite, conditions et +30 inchanges.

- Hache : acier patine, bois et cuir, cuivre/or ancien, couronne brisee.
- Flute : vraie flute traversiere argent et laiton, cles et embouchure,
  incandescence electro bleu pale autour du metal et petites etincelles dorees.

Les PNG transparents originaux et l'etape avant l'incandescence sont conserves
dans `sources/`. Les trois prompts exacts sont dans `prompts.json`. Les images
Momo et Valazar ont ete consultees pour la peinture et les matieres ; aucune
carte complete ni source native n'a ete regeneree.

`node V4/site/build-weapon-art.cjs` produit les deux WebP lossless 488 x 488.
Le fond et le cuivre proviennent de l'extraction native existante. Le generateur
verifie son hash et ajuste tout le contour alpha du nouvel objet dans le disque
interieur, incandescence comprise. Aucun bord ne coupe l'objet ou ses arcs.
`media-provenance.json` conserve hashes, dimensions et mesures de placement.

Les nouvelles definitions utilisent un champ facultatif `art`. Le rendu partage
choisit `art || visual` : une partie ancienne, dont le snapshot ne possede pas
`art`, conserve ses pictogrammes historiques. Les animations Instrument restent
pilotees par `visual: 'flute'`. Les fichiers legacy et leur preuve originale ne
sont ni remplaces ni reecrits. Les PNG/PSD des personnages restent inchanges.

Les deux equipements utilisent les memes nouveaux medaillons dans l'arsenal,
la fiche et les nouveaux combats, avec les ancres et transitions existantes.
Les sources HD ne sont pas distribuees au navigateur ; seuls les WebP le sont.
