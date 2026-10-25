# Kalistar 4.7.10

## Changements

- Placement IA : six plans et leurs variantes haut/bas, soit douze formations.
  Selection reproductible depuis le match, ponderee par score et engagement.
  La formation precedente est exclue apres un but. Toutes les commandes passent
  par les regles publiques, y compris les permutations de joueurs.
- Reprise d'un placement partiel sans nouveau tirage, mutation du RNG, tour
  rendu ou perte des penalites. Aucun changement des actions tactiques en jeu.
- 177 tailles manquantes completees par des adaptations Kalistar explicites,
  affichees comme approximatives et non canoniques. Le registre documentaire,
  ses sources et les masses inconnues restent intacts. Les 368 identites ont
  une taille ou longueur disponible.
- Lanio : 182 cm ; Gen : 159 cm. Echange demande par l'auteur, sans modifier
  leurs masses, notes ou postes. Le resolveur de mensurations est commun au
  vestiaire et a la calibration des sprites ; plafond visuel de 3 m conserve.
- Aucun PNG, cadre, schema de sauvegarde, droit de collection ou statistique
  n'est modifie. Les travaux de la 4.7.9 sont conserves.

## Verification

- Suite `ci` : 2046 tests reussis, deux ignores, aucun echec.
- Suite `local` : 154 tests reussis. Le premier essai a ete bloque par le
  sandbox sur une connexion localhost (EACCES) ; la relance autorisee passe.
- Simulation deterministe : 120 matchs, 479 buts, replay exact et aucun
  placement illegal. Ce controle ne certifie pas l'equilibre competitif.
- Navigateurs : PC 1440 x 900, Razr 412 x 915 et compact 360 x 800 ; placement
  initial, apres but, reprise partielle et mensurations Lanio/Gen/Vivi verifies.
  Le controle de calibration des sprites passe sur ces trois formats.
- Build Cloudflare local : 462 cartes, 1955 fichiers, 1142 MiB.

Le resume versionne est [qa.json](qa.json). Les logs et captures sont conserves
sous `work/astraball/placement-ai/`. Apres commit, les tests navigateur ciblent
encore le build exact prepare depuis Git : placements, tailles, interface
Astraball complete et Collection/Decks/Arene. Le workflow GitHub et l'acces
public sont des controles de livraison, conserves sous work avant de declarer
la publication en ligne. Aucun compte ou stockage personnel n'est utilise.

Le guide courant est [Astraball](../../astraball/README.md), avec les contrats
de [mensurations](../../astraball/ATHLETES.md) et [sprites](../../astraball/SPRITES.md).
