# Kalistar 4.6.54 - Quatorze nouvelles voix

14 cartes originales ajoutees a la collection, IDs 49902601 a 49902614.
La selection et les repartitions de jeu sont detaillees dans le
[lot de production](../../expansions/2026-10-13-fourteen-new-voices/README.md).

Raskel rejoint Durane. Nereis recoit une epee-harpon, Soeur Ossiane un masque
couvrant le bas du visage, Auldran un bouclier recentre et Ithrek une manche
lance-flechettes. Les autres illustrations approuvees restent identiques.
Les 6 personnages non selectionnes ne sont pas publies comme cartes.

Le test des faces speciales D6 d'equipement gere maintenant toutes les phases
de soutien (pas seulement Reraise), et choisit explicitement une attaque
numerique quand il verifie une defense speciale. Borelune expose ce cas
preexistant par sa Garde en D6. Aucun changement de moteur n'est necessaire.
Les listes de porteurs attendus incluent Orseon pour la lance des gardiens
et Dame Velkris pour la lance de Draevenheim. Les restrictions existantes
par Job, faction et famille d'arme restent strictement identiques.

897 x 1497, PSD natifs editables, rendu Photoshop 26.11.8. Les 14 controles de cadre
et de reouverture sont identiques au pixel pres ; les codes-barres sont lus.
Les profils respectent les bandes du role principal et les effets existants.
NONE reste sans magie ni barriere. Aucun moteur, equipement ou schema de
sauvegarde n'est modifie. Aucun ancien verrou ni rapport n'est reecrit.

## Verification

18 tests propres au lot : 168 faces imprimees, supports, barrieres, deux
compositions et 40 matchs complets avec reprise. Galerie verifiee en 1440,
412 et 320 px ; captures dans le dossier qa du lot.

Le site statique de l'index contient 377 cartes, 1374 fichiers et 896.9 Mio. Il reste sous
le budget GitHub/local de 900 Mio, qui n'est pas modifie dans cette publication.

Les 81 commandes du workflow sont rejouees depuis un instantane de l'index
Git : 1181 tests reussis, puis construction statique reussie. Les objets LFS
sont verifies par empreinte avant publication. Les tests
navigateur utilisent un stockage jetable et couvrent les 14 lecteurs de
cartes, le combat, la reprise et un import d'ancienne sauvegarde.
Resultats de publication dans qa ; preuves natives et captures du lot
dans ../../expansions/2026-10-13-fourteen-new-voices/.
Le fichier failed-test.txt conserve le diagnostic d'un premier passage ;
publication.json contient le resultat final de la suite complete.
Le test navigateur du paquet exact de l'index a egalement reussi : ordinateur,
telephone, lecteur et telechargement PNG, decks, arene et reprise du match,
publication additive, sans erreur HTTP ni apparition de l'Atelier.

Depot personnel Yoshi-san87/Kalistar uniquement, main et tag annote v4.6.54.
La version desktop, la version mobile et leurs assertions evoluent ensemble.
Les travaux locaux non lies a ce lot restent hors de la publication.
