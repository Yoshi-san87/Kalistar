# Kalistar 4.6.112 - Preparation avant-match

## Perimetre

- Nouvelle presentation de la preparation dans le shell Kalistar existant.
- PC : capitaines face a face, choix des equipes sous leurs portraits,
  adversaire et champ de bataille dans la colonne droite.
- Telephone : blocs successifs, une seule zone de defilement, fermeture et
  lancement toujours accessibles, y compris en paysage.
- Les selections, profils IA, cohesion, bonus du terrain et snapshots de
  rencontre restent inchanges. Aucun media ni schema de sauvegarde modifie.

## Validation

- Verification syntaxique de app.js et diff sans erreur.
- 8 tests directs pre-match / matchmaking, dont 300 equipes sur 100 graines.
- Parcours navigateur desktop, Razr, 320 px et paysage avec Reduced Motion.
  Controles de disposition complementaires a 1366x768, 820x700 et 360x740.
- Cinq profils IA, duel local, trois cohesions, choix manuel/aleatoire,
  blocage du lancement pendant tirage, retour navigateur, correspondance
  exacte entre preparation et rencontre, reprise apres rechargement.
- Captures et mesures locales : work/qa/prematch-gaming/final-local/.
  Le rapport results.json confirme les quatre parcours et zero erreur.
- Suite CI complete partagee : 102/102 groupes, exit 0, preuve dans
  work/qa/duel-focus/full/suite-final.log. Les fichiers avant-match testes
  sont ceux de cette livraison ; le correctif focus non stage reste exclu.
- 8 assertions de build valides, dont versions PC/telephone 4.6.112.
- Suite locale complete : 14/14 groupes, exit 0, medias originaux et
  bases de test isolees ; work/qa/prematch-gaming/local-suite.log.
- Build Cloudflare : 462 cartes, 1578 fichiers, 1113 Mio, sans media nouveau.
- Verification du paquet fige prevue dans work/qa/prematch-gaming/frozen/,
  puis controle anonyme du login PC/Razr apres deploiement.

## Publication

Livraison reservee apres 4.6.111, avant la correction focus Arene 4.6.113.
Seuls les quatre fichiers avant-match, les quatre references de version et
ce rapport appartiennent a cette livraison. Les autres travaux locaux ne
doivent pas entrer dans le commit ni dans le paquet fige.
