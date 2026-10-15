# Kalistar 4.6.43 - Reliques ultimes et combos

## Portee

Les 32 reliques restantes passent a des ultimes declaratifs a usage unique.
La Boite des Petits Bonheurs, le Pod 042 et la Materia blanche conservent leurs
trois regles validees. La Flute reste une arme ATK6. Aucun profil, artwork,
matchup d'arme imprimee ou verrou de production n'est modifie.

Les nouvelles regles s'appliquent aux nouvelles parties. Une partie deja
commencee conserve ses definitions d'equipement et son aleatoire sauvegardes.
Les definitions exactes de 4.6.42 sont archivees dans la fixture de migration,
pas reinjectees dans les nouveaux combats.

## Garde-fous

- Une charge par porteur ; consommation avant les dons susceptibles de lancer
  un autre effet. Les combos natifs restent possibles, pas les boucles gratuites.
- Cibles par UID, jamais par nom. Mort definitive et Reraise sont distincts.
- Soutien nouveau uniquement ; aucun doublement d'un trait deja present.
- Pour une meme statistique, le plus fort bonus direct de relique s'applique,
  avec au plus le plus fort malus. Les bonus natifs et les deux autres slots
  gardent leurs regles. Pas de multiplication automatique.
- Choix de destinataire, cible ennemie, pair/impair ou type de soutien avant
  de poursuivre. L'IA ne lit pas un jet futur pour choisir sa prediction.
- Registres de progression, dons, consommations et departs de reserve verifies
  au rechargement ; statistiques creditees au donneur reel.
- Deux Gardes successives de donneurs differents dans le meme duel restent
  deux charges distinctes (combo Auron puis Eiko apres Reraise).

## Interface

Cartes d'equipement, etats pret/consomme, dons animes entre cartes, choix en
combat et lignes de calcul utilisent les composants Kalistar existants.
Les montants sont visibles avant le jet DEF et dans le recapitulatif final.
Animations nettoyees a la navigation et adaptees a Reduced Motion.

## Verification

Le lanceur `V4/revisions/2026-10-12-ultimate-expansion/validate.cjs` reprend
les commandes de validation du workflow Pages et construit le site statique.
Les sorties detaillees sont conservees dans le dossier `verification/workflow`
de cette revision, notamment `results.json`.

77 commandes terminees avec succes (1 117 tests comptes par le lanceur).
Apres les derniers ajustements d'attribution Ivy et de documentation, 227 tests
moteur, sauvegardes, statistiques et Library ont ete relances avec succes :
`verification/post-review.log`. Ces nombres se recouvrent, ils ne s'additionnent
pas. Le build final contient 357 cartes et le controle navigateur du site
construit passe sans erreur HTTP ou JavaScript (`verification/pages-browser.log`).

- Scenarios des 32 ultimes dans les deux camps, bonus reels, choix, expiration,
  combos, anciennes definitions et sauvegardes corrompues.
- 64 matchs complets avec les profils natifs, sauvegarde/restauration entre
  actions : `V4/site/verification/native-simulations.json`.
- Captures navigateur desktop, Razr 50 et 320 px, Reduced Motion, changements
  de taille et reprise des choix dans le dossier de verification de la revision.
- Non-regression navigateur des trois premiers ultimes dans `first-three/`.

Ces tests etablissent les scenarios controles, pas un equilibrage definitif.
Les 64 simulations utilisent un echantillon limite de compositions et de seeds ;
11 consommations de relique y ont ete observees. Le retour des parties reelles
reste necessaire pour ajuster la frequence des activations.

## References

- [Schema et catalogue technique](../../docs/RELIQUES_ULTIMES.md)
- [Explication joueur](../../docs/joueurs/RELIQUES_ULTIMES.md)
- [Regles](../../docs/REGLES_JEU.md)
- [Revision et preuves](../../revisions/2026-10-12-ultimate-expansion/README.md)

Publication reservee au depot personnel `Yoshi-san87/Kalistar`, branche `main`,
tag annote `v4.6.43`. Les travaux et illustrations locaux hors de cette portee
restent hors du commit. Les badges desktop/telephone et assertions de version
sont avances ensemble.
