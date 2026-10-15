# Kalistar 4.6.55 - Medaillons d'armes natifs

Les 14 dernieres cartes utilisent maintenant les pictogrammes blancs actuels
du site dans leurs PNG et PSD natifs. Kessaro et Ithrek affichent bien l'etoile
Projectile verticale et ajouree, avec ses deux trainees, et non les anciens
anneaux de la banque historique.

Aucun changement de profil, illustration, texte, famille d'arme ou gameplay.
La verification pixel interdit toute difference hors du medaillon 96 x 97 ;
les 14 reouvertures Photoshop et les 14 codes-barres sont verifies.
Les anciennes sources, preuves et verrous restent intacts.

La galerie du lot pointe maintenant vers les exports actifs. L'adaptateur
natif reutilisable et la consigne V4 evitent de reprendre les anciens
pictogrammes lors des prochaines productions.

## Verification

27 tests cibles passent : revision native, les 20 familles blanches et les
regles du lot. La revision ajoute trois tests au workflow.
Les 82 commandes du workflow reussissent : 1184 tests puis un build statique
de 377 cartes, 1374 fichiers et 896.9 Mio, sous le budget de 900 Mio.
Cette validation utilise un instantane de l'index Git, hors des modifications
Collection preparees simultanement.
Les 14 lecteurs sont verifies en 1440, 412 et 320 px, ainsi que le combat,
la reprise et l'import d'une ancienne sauvegarde. Le controle navigateur
general valide aussi le telechargement PNG, les decks et les versions mobile
et desktop, sans erreur HTTP ni JavaScript. Captures inspectees visuellement.
Le premier diagnostic conserve dans failed-test.txt correspond a deux
assertions de version encore en 4.6.54 ; leur mise a jour a ete verifiee
par un second passage complet, sans modifier de regle ou de verrou.
Resultats finaux et captures dans qa ; preuves natives dans
../../revisions/2026-10-13-voices-weapon-glyphs/.

Les budgets GitHub Pages et Cloudflare ne changent pas.
Depot personnel Yoshi-san87/Kalistar uniquement : main et tag annote v4.6.55.
