# Kalistar 4.5.30 - Porteurs des armes collectives

Succede a la publication 4.5.29, conservee integralement.

## Perimetre

Les onze armes non nominatives exigent la famille imprimee correspondante,
en plus de leur origine (race, faction ou job). Les 22 armes personnelles
restent identiques. Les quatre objets sans porteur actuel restent visibles.
Le moteur de matchup et les bonus ne changent pas.

Les anciens equipements collectifs incompatibles sont retires des profils
et compositions, pas des snapshots de matchs. Migration transactionnelle
des profils et imports, preservation des possessions, cartes et formations.

Audit : [rapport](../../revisions/2026-10-06-weapon-bearers/README.md),
[donnees detaillees](../../revisions/2026-10-06-weapon-bearers/audit.json).

## Controles

- 95 tests cibles passent : restrictions, moteur, formules, anciennes parties,
  normalisation des profils, decks et donnees personnelles inchangees.
- Navigateur : 34 controles sur PC, Razr 50 et 320 px ; migration IndexedDB,
  recharge, equipement/desequipement, import, anciennes parties et possessions.
- Tests d'arene Cryptown et de reprise Rhinoz valides, deux camps et inspection.
- 12 controles Arborium/Draevenheim, 68 controles d'arsenal et 45 de mise en page.
- Snapshot exact prepare depuis la base `75b62f78` (4.5.29), arbre Git
  `258a69ec89ffc411d660ff5df5fe678fae1b36f4` : les 35 commandes du workflow
  passent, soit 226 tests et la construction statique (712 fichiers runtime).
- Site statique : les 34 controles porteurs passent aux trois largeurs.
  Captures desktop et mobile examinees, listes et restrictions lisibles.
- Regression statique generale : 215 cartes, Collection, Carnet, telechargement
  PNG, Decks, Arene, reprise, publication additive et mobile valides ; aucune
  erreur JavaScript ou HTTP. Details du workflow dans `workflow-results.json`.

Apres ce snapshot, seuls les preuves generees et ce compte rendu ont ete
actualises. Les fichiers executables publies correspondent aux fichiers testes.

Les preuves de cette revision sont sous
`V4/revisions/2026-10-06-weapon-bearers/`. Aucun ancien rapport ou verrou modifie.
Les modifications simultanees hors de ce perimetre ne sont pas embarquees.
