# Resident Evil : personnalite des faces de combat

Revision des 25 cartes 49700101 a 49700125 demandee le 8 octobre 2026.
Les ATK D1 / DEF D3 ne reproduisent plus un couple trefle/esquive systematique.

Le [plan avant composition](plan.json) contient les 25 intentions et les
tableaux D6 vers D1. Les originaux complets sont preserves dans originals/.
Identites, illustrations, roles, positions, factions, races et armes inchanges.

## Choix de jeu

Jill et Ada privilegient les esquives ou relances, a des faces differentes.
Leon et Claire alternent survie et soutien physique. Les Chris gardent
leurs fonctions protectrices. Nemesis et Ada RE4 conservent une face Mort
ponctuelle, avec des compromis numeriques. Mr X et Moreau sont plus directs.
Heisenberg gagne une puissance physique ; Beneviento, Eveline et Saddler
utilisent la potion pour refleter leur influence plutot qu'une competence neuve.

Chris RE7 deplace sa face magique de D4 a D5 parce que D4 devient une garde :
une icone de soutien ne doit jamais recevoir simultanement un mode magique.
Le nombre de faces magiques est conserve. Aucun cristal, role, poste,
matchup, moteur, bonus d'equipement ou regle existante n'est modifie.

## Verification native

Les PSD originaux sont dupliques ; seuls les objets dynamiques ATK/DEF et
leurs chiffres natifs changent. Les autres calques, textes et pixels sont
verifies, ainsi que la reouverture, les codes-barres et les petits apercus.

Le premier export d'isolation masquait les chiffres mais gardait les objets
dynamiques dans son PNG de controle. Il est preserve, avec le script initial.
proof-repair.cjs produit des copies de verification aplaties apres masquage
explicite ; aucun PSD ni PNG final n'est modifie par cette operation.
Les nouvelles captures attestent une structure restante identique.

Le masque circulaire initial de 73 px ne couvrait pas les extremites du halo
LUXO carre approuve de Chris RE7. La verification finale utilise l'alpha exact
des composants avant/apres et les cercles natifs des chiffres, exclusivement
pour les faces autorisees. Aucun seuil de difference n'est assoupli :
zero pixel modifie hors de ce masque est exige.

Les entrees initiales restent figees dans before.json ; le controle additionnel
est fige dans proof-repair-inputs.json. Aucun ancien verrou ni rapport n'est
reecrit pour faire disparaitre un echec.

## Tests

300 faces forcees dans le moteur : 150 ATK et 150 DEF, valeurs, effets,
barrieres, relances et sauvegarde/reprise. 50 rencontres ABBA completes
exercent chaque profil dans les deux camps avec une couverture de deck 2.
Les regles et bornes de roles sont testees, sans revendiquer une mesure
definitive d'equilibre competitif.

~~~powershell
node --test V4/revisions/2026-10-08-resident-evil-faces/integration.test.cjs
~~~

Publication locale tracee dans published.json ; publication GitHub dans
le rapport de release associe.
