# Kalistar 4.6.15 - Le Fauve

Ajout de la carte 49901901, Le Fauve : FELINEUS / XMEN, Kalistel Lumiere,
arme Poing, Middle P3 compatible P1/P3/P5. Illustration fournie par
l'utilisateur, preservee sans retouche ; fanion X-Men existant reutilise.
Catalogue : 343 cartes. Aucun autre profil, effet ou moteur modifie.

Le test du lot X-Men initial verifie toujours exactement ses sept identites,
sans interdire les ajouts ulterieurs a cette collection. Cette correction
remplace seulement le comptage global ferme ; aucun ancien rapport, profil
ou verrou n'est modifie.

Sources, choix et preuves natives :
[Le Fauve](../../expansions/2026-10-10-le-fauve/README.md).

## Validation
Le cadre fixe et la reouverture PSD sont pixel-identiques ; code-barres valide.
Les cinq tests dedies couvrent les douze faces, le soutien allie avec attribution
du donneur, l'esquive, la barriere et douze matchs ABBA avec reprises.

La publication est construite depuis l'index isole, pas le dossier local entier.
`qa/publication.json` donne le parent, l'arbre, les commandes et leurs resultats.
Suite complete : 679 tests reussis, 61 commandes, build de 343 cartes.
Parent : `c502bf72134921cea5a04ea7a55024708fcd981e`.
Arbre teste : `91843532951ad8023dc5d71ba556cb895409a52c`.
Les captures PC/Razr/320 px et les resultats de navigation sont conserves sous
`qa/`. Les deux controles navigateur sont reussis : carte, duel, reprise,
migration additive, Collection, Decks et export PNG, sans erreur HTTP.
Apres la suite complete, le prefixe de base de donnees isolee du test navigateur
dedie a ete corrige en `kalistar-v4-cards-fauve-qa-`, puis ce test a ete rejoue
avec succes sur le meme build. Aucun fichier de production n'a change depuis
l'arbre teste ; seuls ce correctif de fixture, cette note et les preuves QA
completent la livraison.

## Publication
Repository personnel Yoshi-san87/Kalistar, main et tag annote v4.6.15 pousses
ensemble, sans force. Les autres travaux locaux restent exclus.
Version PC, badge mobile et assertions sont mis a jour ensemble.
`stage.cjs` part du HEAD 4.6.14 et refuse un index occupe ou un remote different.
`verify-index.cjs` hydrate les objets LFS du seul snapshot teste, lance la suite
Pages complete puis le build. Le controle public compare le catalogue entier
et quatre fichiers dont la carte et la banniere.

Les preuves publiques sont conservees apres deploiement hors du depot, afin de
ne pas creer un second commit avec la meme version.
