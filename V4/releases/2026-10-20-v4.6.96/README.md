# Kalistar 4.6.96 - Mon compte plein ecran

## Perimetre

Mon compte utilise toute la largeur et la hauteur disponibles sous la
navigation. Le plafond de 1200 px et le centrage de la page sont retires.
La colonne de navigation reste a gauche sur PC, avec un filet jusqu'au bas
de la page. Les formulaires gardent une largeur raisonnable pour la lecture.

La hauteur est distribuee par flex, sans soustraction d'une hauteur de menu
codee en dur. Sur telephone, le contenu defile dans `#app`, sans passer sous
la navigation fixe. Les autres pages ne recoivent pas ces styles.
Aucun nouvel asset, script runtime, appel serveur ni animation permanente.
Aucun changement SQL, authentification, sauvegarde, permission ou gameplay.

## Verification

- Suite CI complete : 96 groupes, reussie.
- Suite locale complete : 13 groupes, reussie avec acces au serveur jetable.
- Page compte : cinq formats (1440, 2532, Razr 412, compact 320, paysage 1007).
  Assertions de largeur et hauteur, contenu jusqu'au bord droit, separation
  jusqu'au bas, controles accessibles et absence de debordement horizontal.
- Jeu authentifie : six formats, dont le grand ecran ajoute au test.
  Hauteur reelle entre bandeau et navigation mobile, absence de defilement
  du document, changement de rubrique, formulaire, retour et rechargement.
  Les mesures attendent la fin effective de la transition d'entree.
- Jeu PC/mobile : catalogue de 444 cartes, Collection, Decks, Arene,
  sauvegarde/reprise et telechargement verifies.
- Synchronisation PC/Razr : comptes separes, collections, equipements,
  reprise de session et combat D6 verifies sur PostgreSQL ephemere.

Captures et journaux locaux : `work/qa/account-fullscreen/`.
Les tests utilisent uniquement des profils jetables et des comptes fictifs.
La sortie exacte du commit doit encore passer les controles avant deploiement ;
le rapport de publication et la verification publique restent dans ce lot QA.
