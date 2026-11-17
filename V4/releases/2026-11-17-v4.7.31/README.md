# Kalistar 4.7.31 - Impacts JRPG

Remplacement des bips synthetiques par 17 effets Runway originaux : attaques
physiques, choc de bouclier, jet, engagement, elimination et douze signatures
elementaires. Impacts synchronises au contact, souffle avant l'attaque,
esquive sans faux choc. Les preferences sonores existantes restent intactes.

Le bouton central porte deux trainees lumineuses qui parcourent son contour,
un halo pulse et un sceau vivant, y compris sur Tour suivant. Pas de deplacement
de la cible cliquable, ni d'effet sur les boutons bloques ou sous une popup.
Le mode Reduced Motion conserve un cadre fixe et lisible.

La penombre et les cartes mises en avant restent actives pendant le resultat.
Seul Tour suivant libere cette mise en scene et ouvre la selection suivante.

[Provenance et conversion](../../revisions/2026-11-17-arena-jrpg/README.md).
34 credits utilises sur les 35 autorises ; aucun achat. 375,4 Kio de nouveaux
medias, sauvegardes hors checkout, seulement leurs empreintes dans Git.

## Verification

Preuves sous `work/qa/arena-jrpg/`, profils jetables. Tests du cache, de la
limite de voix, des refus audio, des erreurs media, des douze selections de
son, des annulations et du nettoyage. Decodage des 17 MP3 dans Chrome,
controle des pics, de l'attaque et des durees, puis arene PC/Razr/320 px/paysage,
resultat conserve, mouvement reel du contour et geometrie stable du bouton.
Suites CI et locale completes et controle du paquet fige avant publication.

Avant preparation : 107 invocations CI, 14 invocations locales et 25 tests
cibles passes. Menu, invitations, soutien, IA, popups et Reduced Motion
valides sur quatre formats ; reglages du compte sur cinq formats et musique
reelle sur trois formats. Les sauvegardes privees des 17 sources et exports
correspondent exactement aux empreintes du lot.

Aucun changement de moteur, de regles, d'equilibrage, de carte native,
de possession, de base de donnees ou de schema de sauvegarde.
