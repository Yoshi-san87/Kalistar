# Release 4.5.58

Ajout de 29 cartes jouables : 14 FFVI, 7 FFXV et 8 FFXIII.
Le catalogue contient 294 cartes. Terra normale et Transe partagent une seule
identite. Aucun preset, equipement ou nouveau mecanisme de combat n'est ajoute.

Quatre fanions inspires des logos VI, IX, XIII et XV sont calibres sur le
template. Les 22 cartes FFIX changent uniquement de drapeau, avec conservation
des nouvelles scenes de Vivi et des portraits de races de la revision precedente.
Umaro possede un nouveau medaillon Yeti. Les sources natives restent editables.

## Validation

- 29 nouvelles compositions natives : cadre fixe identique, PSD reouvert identique,
  textes editables et code-barres lu correctement.
- 22 revisions FFIX : memes controles, aucun pixel modifie hors du drapeau,
  statistiques, identites, textes et illustrations inchanges.
- 174 faces ATK et 174 faces DEF executees dans le moteur.
- 58 matchs entre nouvelles compositions et 29 matchs contre les anciens decks,
  dans les arenes existantes, avec sauvegardes et reprises.
- Bornes par role, garde P1/P5, coeur P5, NONE sans magie, unicite du personnage
  et limite Rainbow conservees.
- Suite de verification, build Pages et tests PC/telephone :
  [journal des controles](verification/tests.json).
- 47 commandes de validation passent. Les parcours des nouvelles collections
  couvrent 1440, 412 et 320 px, trois matchs recharges et 33 captures conservees.
  Le premier rapport conserve dans verification/attempt-1/ montre un selecteur
  de test ambigu, corrige sans modifier l'interface ni les regles.
- [Captures des nouvelles cartes dans le jeu](../../expansions/2026-10-09-final-fantasy-trilogy/browser-proof/results.json).
- [Galerie native](../../expansions/2026-10-09-final-fantasy-trilogy/galerie.html).
- [Intention de chaque profil](../../expansions/2026-10-09-final-fantasy-trilogy/set.json).

Ces controles attestent la conformite et le fonctionnement des effets, pas un
equilibrage competitif mesure a grande echelle.

## Publication

Depot personnel exclusivement : Yoshi-san87/Kalistar, main, tag annote v4.5.58.
La version PC, la version telephone et leurs assertions sont incrementees ensemble.
Le script prepare.cjs stage seulement ce lot et ses integrations. Le test de
performance preexistant dans le workflow local reste hors de cette release.

La mise en ligne n'est confirmee qu'apres succes du workflow Pages et verification
de la version et du catalogue publics.
