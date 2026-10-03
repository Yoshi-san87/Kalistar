# Kalistar V4.4.2 - Inspection des cartes equipees

Publication personnelle : `Yoshi-san87/Kalistar`, branche `main`, tag annote
`v4.4.2`. Suite de V4.4.1 ; edition et sauvegardes toujours V4.

## Portee

- Composition : medaillon equipe visible dans la popup, base sur le brouillon
  du deck et non sur les preferences globales. Rotation continue sur les cartes
  de l'equipe et dans leur inspection, sans languette de bonus hors combat.
- Arene : seule l'arme active de l'instance du plateau apparait dans la popup,
  avec sa languette et la rotation. Etat moteur et snapshot du match respectes.
- Ancrage sur le contenu reel de l'image, meme lorsque la popup utilise
  `object-fit: contain`. Recalcul apres crop asynchrone et redimensionnement.
- Pas d'overlay sur les illustrations seules ou dans les autres vues. Nettoyage
  a la fermeture, au remplacement et a la navigation ; Reduced Motion respecte.

Aucun changement des cartes natives, des regles, du RNG, de la matrice d'armes,
des sauvegardes ou du catalogue (193 cartes). Les travaux Story longs locaux
restent hors de cette publication.

## Verification

- 36 tests cibles : equipement, geometrie de popup, chargement du crop,
  redimensionnement, nettoyage, compositions, medailles et assets des anneaux.
- 75 tests de regression du runtime publie et du build.
- Parcours navigateur isoles : desktop 1440 x 900, Razr 50 412 x 1007,
  Reduced Motion 390 x 844 et compact 320 x 568. Inspection du deck avec/sans
  arme, changement de version, bascule Illustration, active/inactive en Arene,
  camp adverse, flute consommee, snapshot apres modification du profil,
  zoom challenger et alignement pendant resize.

Captures et mesures : `../../revisions/2026-10-03-equipped-card-inspection/qa/`.
Le test pur de presentation fait aussi partie du workflow GitHub Pages.

Le build local de validation utilise la Story deja commitee par
`../2026-10-02-pages-portability/build-committed-runtime.cjs` sans ecrire dans
les sources du roman local. Apres le commit, reconstruire puis executer
`node V4/releases/2026-10-03-v4.4.2/public-check.cjs` pour comparer le manifeste
public, les ressources, le catalogue et les versions PC/telephone au commit.
