# Nettoyage Kalistar : proposition approuvee et executee

**Statut : lot confirme puis supprime le 17 septembre 2026.** Voir [RAPPORT.md](RAPPORT.md) pour les resultats verifies. La selection et les consequences ci-dessous documentent la proposition soumise avant execution.

- Dossier analyse : 10,35 Go.
- Selection : 742 fichiers, 5,23 Go.
- Taille visee apres suppression : environ 5,12 Go.
- 4107 fichiers conserves avec empreintes SHA-256.

## Selection

| Categorie | Fichiers | Go |
|---|---:|---:|
| V1/V2: export impression ancien, images de cartes conservees | 34 | 0,25 |
| V1: ancien PSD de carte exporte, reconstructible depuis le master et les donnees conserves | 12 | 0,35 |
| V1/V2/V3: rendu de verification ou capture regenerable, rapports et fixtures conserves | 427 | 0,61 |
| V2: ancien PDF/TIFF archive, sources et apercus conserves | 2 | 0,10 |
| V2: ancien PSD de carte exporte, reconstructible depuis le master et les donnees conserves | 19 | 0,60 |
| V4: rendu ou montage de controle du prototype abandonne | 105 | 0,12 |
| V4: PSD intermediaire remplace par les cartes finales et le maitre 03F | 33 | 2,97 |
| V4: export de controle historique, original et donnees conserves | 110 | 0,22 |

Liste exacte : [selection.csv](selection.csv). Manifeste avec tailles, motifs et empreintes : [plan.json](plan.json).

## Exclus de la suppression

- Les 41 cartes V3 : PSD, PNG, TIFF, illustrations et ressources du jeu.
- Les cinq cartes V4 actuelles (Momo, Taulio, Jelly-Joe, Momo Bal et Rikka) : PSD et PNG.
- Le maitre V4 03F, son registre et les profils actuels.
- L'histoire, les fichiers Word et Excel, la BDD, les scripts et les sites.
- Les illustrations, propositions artistiques, cartes PNG historiques et sources graphiques.
- Les masters V1/V2, les deux references PSD V1, le PSD Momo V2 encore reference et les templates originaux.
- La sauvegarde Momo recuperee de 135,7 Mio, conservee par prudence.

## Consequences

La suppression proposee est **definitive**, sans nouvelle copie de plusieurs Go dans le projet. Les anciens PSD exportes V1/V2 peuvent etre reconstruits depuis les sources conservees ; les anciens essais V4 ne seraient plus disponibles en PSD. Les scripts et rapports historiques peuvent referencer ces etapes retirees : utiliser le maitre 03F et les profils recenses dans [current.json](../../V4/template-stable/current.json) pour la production courante. Les verifications des anciens exports demanderaient leur regeneration.

## Confirmation

L'utilisateur a confirme ce lot exact par **"ok vazy"**, apres presentation des 742 fichiers et des 5,23 Go a liberer. La suppression a ete executee, puis les fichiers conserves ont ete verifies.
