# Kalistar V4.5.45 - Ysilis et les Okami de Grivka

Niveria designe la region des glaces, toundras et montagnes. La faction de
Malinia, Oskara et Sivel devient Ysilis, royaume humain des neiges reconnu
pour ses chasseurs et sa maitrise du gel. Le drapeau et toutes leurs cartes
natives restent identiques.

Les races Okami, Lycanos et Garou ainsi que la faction Grivka sont documentees
dans [Peuples et regions](../../docs/PEUPLES_ET_REGIONS.md). Deux illustrations
et une proposition de drapeau Grivka sont conservees avec leurs prompts.
Elles ne sont pas des cartes jouables : le catalogue reste a 232 cartes.

## Verification

- Tests cibles initiaux : 43 passes.
- Regles, statistiques, IDs, PNG/PSD natifs et lieux geographiques inchanges.
- Ancien nom de faction reconnu dans les definitions d'equipement en snapshot.
- Bonus reel du Manteau du Premier Degel verifie dans les deux camps ; les
  anciennes definitions ne sont ni remplacees ni modifiees a la restauration.
- Validation complete de l'index : 431 tests passes et build de 232 cartes,
  voir `workflow-results.json`.
- Controle Chrome PC/Razr 50/320 px passe : `qa-pages/` et le test navigateur de
  `revisions/2026-10-06-ysilis/`.
- Test navigateur Pages general passe : collection, telechargement PNG,
  decks, arene et sauvegardes, sans erreurs JavaScript ou HTTP.
- Verification publique de la version, des trois cartes et du drapeau :
  `public-check.cjs`.

Le lot preserve les changements Story de 4.5.44 et les 75 equipements de
4.5.43. Aucun verrou ni rapport historique reecrit, aucune carte Okami publiee
avant validation artistique. Les sources natives gardent la cle historique
Niveria ; l'alias runtime centralise applique le nom actuel sans les modifier.

Depot personnel : `Yoshi-san87/Kalistar`, branche `main`, tag `v4.5.45`.
