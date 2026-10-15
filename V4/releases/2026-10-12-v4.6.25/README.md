# Kalistar 4.6.25 - Elyrane

Carte originale 49902101 : Elyrane, princesse Okami de Grivka, CRYO, P3/P5.
Illustration approuvee conservee, cape noire aux motifs vert foret.
PSD natif editable, cadre pixel-identique, reouverture et code-barres verifies.

Publication additive ; aucun ancien personnage ni regle moteur modifie.
Le test de factions inclut explicitement le nouvel identifiant Okami.
Les pilotes isolent cette carte et testent un snapshot exact de l'index,
sans publier les travaux des autres chats.

Controles : suite GitHub Pages, build statique, lecteurs PC/Razr/320 px,
duel Cryo, migration d'ancienne sauvegarde et reprise du match.
Preuves finales dans qa/. Le controle public utilise le hash du commit.

La version 4.6.24 etant prise par la publication des reliques, les pilotes
d'Elyrane ont ete deplaces ici avant tout staging, sans changer son contenu.
Le preflight sur le dossier partage est distinct de la validation finale
isolee : il rencontrait une definition de relique encore en cours d'edition.

## Resultats avant publication

- 859 tests reussis dans 70 commandes sur le snapshot de l'index.
- Build GitHub Pages : 351 cartes, 1272 fichiers, 837,3 Mio.
- Lecteur et arene valides a 1440 x 1000 et 412 x 915 ; lecteur a 320 x 740.
- Import d'une sauvegarde a 350 cartes puis reouverture : 351 cartes.
- Reprise du duel apres reload ; aucune erreur JS ni ressource HTTP manquante.
- Captures conservees dans `qa/browser/` ; rapports dans `qa/publication.json`
  et `qa/browser/results.json`.
