# Armes en situation et cercles individuels

## Direction retenue

23 peintures completes remplacent les montages objet/fond. L'arme touche
son support et partage sa lumiere. Decors proches et sobres, sans details
ajoutes pour remplir le vide. La Hache et la Flute initiales restent intactes.
Chaque arme possede maintenant son propre cercle : 23 nouveaux anneaux, plus
les deux anneaux approuves. Le corps de l'arme ne tourne pas avec le cercle.

La Poupee Mog utilise exclusivement `lulu-mog-scene-v4.png` : la v3 melangee
avec la hache est rejetee, conservee comme essai et jamais utilisee par le jeu.
Les scenes v2 des quatre premieres nouvelles armes sont remplacees par des
scenes v3 plus calmes. Prompts dans `../../weapon-cards/scene-prompts-2026-10-04.json`.

## Kaine

La silhouette a ete corrigee d'apres la
[figurine officielle Square Enix](https://gb.store.square-enix-games.com/nier-replicant-ver_1_224744871___-form-ism-figure---kaine).
Lame large au dos dente, extremite non effilee comme un katana, manche
metallique fin et pommeau rond. La scene v3 et le petit objet v2 partagent
cette silhouette. Interpretation peinte Kalistar, pas un export du jeu.

## Integration

- `site/weapon-art.js` associe scene, objet, anneau et accent lumineux par ID.
- Les cles `weapon.art` des sauvegardes et les definitions moteur sont intactes.
- Le renderer partage le meme medaillon entre arsenal, deck, inspection et arene.
- Crop natif, ancrage (244,242), transformations et Reduced Motion conserves.
- Aucun Canvas, timer, modification de PNG/PSD de personnage ou de verrou.
- `build-assets.cjs` produit les WebP et leurs empreintes sans toucher aux
  originaux. `export.cjs` produit les 25 cartes avec le renderer HTML reel.

## Verification

69 tests cibles reussis : moteur, sauvegarde/reprise, profils, composition,
geometrie d'inspection, publication des assets et absence de mutation du schema.
Les 23 nouveaux bonus sont testes des deux cotes, actifs et inactifs, dans
les vraies formules et journaux, puis sur des matchs complets. Hache et Flute
conservent leurs tests, notamment consommation, expiration et absence de cumul.

37 controles navigateur de cartes : six formats, textes, portraits equipes,
filtres et 25 exports. 52 parcours d'arsenal : equipement des 23 objets,
restrictions, remplacement, reload et vrais jets ATK/DEF. 21 gros plans sur
PC, Razr 50 et 320 px. Parcours historique des armes reussi, y compris zoom,
challenger, adversaire, inspection, Reduced Motion et nettoyage.
Captures et rapports dans `layout/`, `combat/`, `details/` et `equipment/`.

Le bonus de DEF transmis par la Flute ne s'ajoute pas a un autre bonus DEF
d'equipement : le meilleur est retenu, puis la charge temporaire est consommee.
Les armes ne transforment jamais Mort, esquive ou soutien en degats numeriques.

Les anciennes variantes et rapports restent des preuves historiques ; seule
l'association dans `weapon-art.js` definit les images actuellement affichees.
