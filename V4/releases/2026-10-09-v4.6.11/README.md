# Kalistar V4.6.11 - Bataille

## Perimetre

Nouvel onglet Bataille dans le Palmares : deux courbes cumulatives de 0 a 10,
une station par kill, et le duel selectionne avec les deux cartes, le score
intermediaire, le tour et le round. Les tours sans kill restent visibles dans
la longueur du trace. Les fleches tactiles et le clavier parcourent tous les
points ; l'inspection des cartes et les archives restent accessibles.

Les couleurs des deux camps sont conservees. Pas de confettis, de Canvas,
d'animation permanente ou de nouvelle bibliotheque. Les axes gardent une
typographie lisible sur Razr 50 et 320px, sans mise a l'echelle du texte SVG.

Aucune modification du moteur, RNG, profils, cartes natives, matrice, stockage
ou schemas. Les historiques incomplets ne reconstituent aucune elimination.
Les six fichiers de version/assertions avancent ensemble et le tag est v4.6.11.
Les nouvelles cartes Street Fighter et changements independants restent locaux.

## Verification

- Snapshot isole de l'index : 57 commandes du workflow, 629 tests au total.
- Quatre tests performance supplementaires : 633 tests uniques controles.
- `qa/baseline-publication.json` garde la premiere verification de 628 tests.
  Le seul delta fonctionnel ulterieur concerne les eliminations sans formule
  numerique : deux fichiers Bataille revalides, build/test de build reexecutes.
  `qa/publication.json` documente les arbres et les commandes de ce delta.
- 60 matchs reels compares aux scores moteur, 200 tours sans kill, ancien
  ordre alterne, ouverture adverse, UID, Reraise, sauvegarde et absence de mutation.
- Chrome : PC, grand PC, Razr 50, compact et paysage ; parcours des 18 kills
  d'un vrai match, clics/clavier, cartes, archives, resize, reload, scroll,
  Reduced Motion, match en cours et journal partiel/manquant.
- Regression construite : ceremonie, Collection, Decks, Arène et sauvegarde.
- Build Pages : 315 cartes, 1138 fichiers, environ 765.5 MiB.

Captures : `../../revisions/2026-10-09-battle-report/qa/built/`.
Reproduction : `node V4/releases/2026-10-09-v4.6.11/verify-index.cjs` puis les
tests navigateur Bataille, ceremonie et Pages sur son dossier snapshot.
Apres push, `public-smoke.cjs <SHA>` compare 14 actifs au build verifie ; la
QA navigateur publique et ses captures sont conservees hors Git pour eviter
une deuxieme publication au meme numero.
