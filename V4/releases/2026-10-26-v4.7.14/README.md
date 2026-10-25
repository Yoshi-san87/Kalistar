# Kalistar 4.7.14 - Actions Astraball sur le terrain

## Interface

Les commandes quittent le panneau lateral : deplacement, passe, tir, charge
et fin d'activation sont des icones dans un demi-cercle au pied du joueur actif.
Le cristal replie/rouvre le menu. La visee se fait sur le terrain, avec une barre
de confirmation et un retour aux actions. Les options indisponibles restent
attenuees a leur place ; leur raison est disponible au survol.

Le panneau lateral presente les statistiques, les portees, les tirs ouverts,
la possession et la trajectoire choisie (interception ou chance de charge).
Sur telephone, sa presentation compacte laisse davantage de place au terrain.
Le placement avant engagement/apres but conserve ses commandes dediees.

Le menu suit les coordonnees reelles de la camera, essaie quatre orientations
et garde ses six cibles de 44 px dans le terrain. Fleches/Home/End naviguent
entre ses actions disponibles ; Escape replie le menu ou annule la visee.
Il disparait pendant les actions, les tours IA, les popups et l'onglet masque.
Ses transitions sont finies et respectent Reduced Motion et l'option du jeu.
Aucun timer, boucle de rendu, media supplementaire ou filtre GPU n'est ajoute.
Les anciens styles des commandes laterales sont retires ; actions.css porte
le nouveau composant. Moteur, IA, statistiques et sauvegardes sont inchanges.

## Verification avant commit

- Astraball : 182 tests reussis, aussi dans une copie Git texte seule sans medias.
- Geometrie : 1 470 dispositions, centres et bords/hors-champ, petites/grandes
  surfaces ; boutons contenus et separes, lancement replie au-dessus de la visee.
- Interface Chrome : PC 1440x900, large 1920x1080, Razr 412x915, compact 360x800
  et paysage 915x412. Captures PC et telephone examinees.
- Passe/annulation sans mutation, pas de clic transmis au canvas, clavier,
  suivi du zoom, popup/onglet masque, deplacement souris/tactile, fin d'activation,
  actions indisponibles et reprise exacte apres recharge.
- Regression complete du vestiaire, des six ballons, des vues, des buts, des
  animations normales/reduites, du placement et de l'isolation des profils.
- Verification camera/gestes et toutes les arenes : reussie. Ce controle
  fonctionnel n'est pas une nouvelle approbation artistique des decors.
- Suite CI : 104 invocations, 2 053 tests reussis, 2 ignores, aucun echec.
- Suite locale : 14 invocations, 154 tests reussis, aucun echec.
- Organisation et diff stage : controles reussis.

Le registre de validation utilise est celui du commit precedent : les ajouts
Sprite V2 non termines d'un autre chat sont exclus de cette livraison, sans
modifier son fichier de travail. Les nouveaux tests sont importes par les
entrees Astraball deja enregistrees. Aucun fichier de cet autre chantier n'est
inclus. Les tests navigateur utilisent uniquement des profils jetables.

```sh
node --test V4/astraball/tests/astraball.test.cjs
node maintenance/validate.cjs --suite ci
node maintenance/validate.cjs --suite local
node V4/astraball/tests/interface.browser.test.cjs
node V4/astraball/tests/camera-goals.browser.test.cjs
node maintenance/check-organisation.cjs
```

Journaux et captures : work/astraball/action-wheel/. La publication suit le
contrat V4/deploy/README.md : commit/tag, construction figee du commit exact,
verification navigateur de cette sortie puis envoi au projet personnel
Cloudflare existant. Le rapport ignore de publication conserve ces preuves.
La verification Razr est une emulation Chrome, pas une mesure sur appareil reel.
