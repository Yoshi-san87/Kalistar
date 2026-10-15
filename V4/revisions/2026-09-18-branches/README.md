# Revision des branches non Electro

Correction demandee le 18 septembre 2026 : supprimer les restes dores du fond
qui depassaient des branches recolorees, sans modifier les cartes Electro.

## Methode

- Reconstruction du contour transparent de l'objet dynamique, a partir de sa
  texture doree originale (950 x 1655 px), dans Photoshop. Aucun agrandissement,
  decalage de carte, repeinture du cadre ou nouvelle generation d'image.
- Remplacement du contenu de `BRANCHES [ELEMENT] - couleur du cristal`, en
  conservant sa transformation et ses filtres natifs. Les reflets Rainbow
  restent un transfert de degrade ecrete, le cas NONE reste eteint.
- Meme correction incorporee au maitre multi-elements 04. Le maitre 03F Electro
  et les cinq cartes Electro ne sont jamais modifies.

`branches-complete.png` est le composant source corrige. `component.json`
consigne le contour et la resolution. Les PSD finaux l'incorporent : ils ne
dependent pas d'un fichier lie externe pour s'afficher.

## Controle et publication

`prepare.cjs` enregistre les references initiales. `stage.cjs` compose sur des
copies, sous le verrou partage de l'Atelier. `verify.cjs` exige :

- aucun changement de pixels hors des deux bandes de raccord autorisees ;
- aucun changement des autres calques, textes, valeurs, positions ou effets ;
- identite du PNG avec le PSD reouvert ;
- lecture des codes-barres en couleur et en gris, a taille native et x4 ;
- conservation de toutes les empreintes des fichiers sources pendant l'essai.

`prove-master.jsx` compose Ruby depuis le maitre corrige, pour verifier le
chemin de production des futures cartes. `families-before-after.png` presente
les raccords de chaque famille, avant a gauche et apres a droite.

`publish.cjs` ne publie qu'apres les 22 controles (21 cartes et le maitre).
Il sauvegarde les fichiers remplaces dans `originals/` en conservant leurs
chemins relatifs. Les noms actifs sont conserves pour ne pas casser la galerie,
les profils, les brouillons et les liens existants.

Le changement des empreintes de l'Atelier est une migration explicite de
revision graphique, avec l'identifiant precedent et les preuves de comparaison.
Il ne constitue pas une validation automatique : la porte de non-regression
reste fermee jusqu'au nouveau passage reel des 26 modeles dans le generateur.
Ne jamais rafraichir les empreintes pour masquer un echec de test.

`refresh-proofs.cjs` actualise les PNG de reouverture utilises par les deux
series de production, apres comparaison avec les exports verifies. Les anciens
PNG restent dans `originals/`. Le verificateur multi-elements verifie separement
le rafraichissement editorial historique et cette revision structurelle : il
controle les empreintes avant/apres et exige zero changement hors des raccords.
Il ne transforme pas les zones de texte en autorisation de modifier le cadre.

## Rapports

- `verification.json` : controles des 21 cartes et du maitre.
- `master-proof.json` : comparaison du rendu obtenu depuis le maitre.
- `published.json` : publication, sauvegardes et migration des references.
- `complete.json` : resultat final, controles du generateur et des Electro.
- `references-before.json` : verrou precedent, conserve pour la tracabilite.

Ne pas relancer la publication ou les scripts historiques d'extraction pour
refaire la correction. La production courante utilise le maitre 04 corrige et
les PSD actifs. Les revisions de personnages restent independantes de ce
contour structurel.
