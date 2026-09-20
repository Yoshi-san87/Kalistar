# Contrat moteur : decks V3

## API pour le parent

```js
E.deckCoverage(ids); // {1: n, 2: n, 3: n, 4: n, 5: n}
E.validateDeck(ids); // Historique, coverage: 1 par defaut
E.validateDeck(ids, {coverage: 2}); // Tableau de messages, [] si valide
E.validatePlayableDeck(ids); // Raccourci strict equivalent
E.newGame(deckA, deckB, {...options, deckCoverage: 2});
```

- `deckCoverage` compte chaque exemplaire dans chacun de ses postes compatibles. Un poste repete dans le profil compte une seule fois pour cet exemplaire. Les IDs inconnus sont ignores par le compteur, mais rejetes par les validateurs. Aucune mutation.
- Le mode strict conserve exactement 10 cartes, les IDs V3, les limites exemplaires/Rainbow et la recherche d'une formation complete P1...P5. Il exige en plus au moins deux cartes compatibles par poste.
- Il ne demande PAS deux formations disjointes : une carte polyvalente contribue a plusieurs compteurs. Un test accepte explicitement un deck strict impossible a partitionner en deux formations.
- Seules les valeurs numeriques `1` et `2` sont admises pour la couverture. Les tableaux creux ne peuvent pas simuler dix cartes.
- `newGame` controle les deux decks, en IA comme en local, avant creation. Le parent doit forcer `{...options, deckCoverage: 2}` sur TOUS les chemins de creation UI, y compris soumission forcee, deck importe et demarrage rapide. Ne pas laisser une option importee ecraser ce dernier champ.

## Archives et import

- Le schema reste 6. Les nouveaux matchs stricts portent `state.deckCoverage = 2` ; la creation historique par defaut n'ajoute aucun champ.
- `assertState` et `restoreGame` appliquent le mode marque aux dix cartes de chaque equipe, en additionnant plateau, reserve et morts. La perte de cartes vivantes ne rend pas une partie stricte invalide.
- `start` revalide un etat marque avant toute mutation : remplir cinq postes a la main ne contourne pas la couverture stricte d'un nouveau match.
- Les archives schema 6 sans marqueur restent soumises aux regles historiques, y compris en setup. Elles sont restaurees sans normalisation, ajout de marqueur ou modification des statistiques.
- Le marqueur n'est pas une signature : effacer le champ produit un document indiscernable d'une ancienne sauvegarde. `restoreGame` est le chemin de reprise historique, PAS un substitut a `newGame(..., {deckCoverage: 2})` pour creer un nouveau match a partir de decks importes. Ne pas marquer retroactivement les anciennes archives.
- Aucun changement dans `local-db.js`. Test avec Chrome headless, profil temporaire, bases IndexedDB aleatoires `kalistar-v3-cards-deck-*`, sans ouverture de la base utilisateur : sauvegarde, export/import repete, conservation exacte des matchs/profils/arenes/resultats, refus atomique d'un import strict invalide.

## Victoire et score

La logique de victoire n'a pas change. Apres resolution puis `next` et remplacements, un plateau vide avec une reserve non vide declenche un remplacement : chaque carte possede au moins un poste. La defaite par elimination arrive donc avec dix cartes mortes. Le nul de demo a 200 echanges reste en place.

Le score fiable est `state.players[1 - side].dead.length`. Reraise garde la carte sur le plateau, n'ajoute aucun mort et ne compte pas comme kill, y compris contre Mort. Les statistiques existantes correspondent deja a ce comportement. Aucun helper de score supplementaire ajoute.

## Presets observes

Snapshot de `site/data.js` lors de cette verification, sans modification des donnees :

| Preset | P1 | P2 | P3 | P4 | P5 | Strict |
| --- | --- | --- | --- | --- | --- | --- |
| player | 2 | 1 | 3 | 4 | 2 | Non : P2 |
| enemy | 2 | 3 | 2 | 1 | 2 | Non : P4 |
| z13 | 2 | 3 | 2 | 1 | 2 | Non : P4 |
| cites | 2 | 1 | 1 | 3 | 3 | Non : P2, P3 |
| frontieres | 2 | 2 | 2 | 2 | 2 | Oui |

Les cinq restent valides historiquement. Le parent doit choisir le comportement des presets invalides pour les nouvelles parties ; aucun remplacement de cartes n'est fait ici.

## Verification

Runtime : Node v24.19.0. Executer depuis la racine du projet :

```powershell
& 'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' 'V3/site/deck-rules.test.cjs'
& 'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' -e "for(const file of ['engine.test.cjs','engine-v3.test.cjs','engine-roster.test.cjs','match-stats.test.cjs','buff-stacking.test.cjs'])require('./V3/site/'+file);"
```

- Nouveau test : 13 groupes passes, dont une verification IndexedDB reelle et quatre matchs stricts deterministes (deux camps, attaque numerique/Mort, Reraise, restauration JSON apres chaque action).
- Suites existantes : 61 moteur + 26 V3 + 18 statistiques + 11 buffs = 116 tests nommes passes.
- Roster : 41 cartes, 16 arenes, 246 faces ATK et 80 campagnes passes. Total des campagnes des suites existantes : 200.
- Le lancement Chrome et le runner Node multiprocessus sont bloques par `spawn EPERM` dans le sandbox. Chrome a ete relance avec autorisation ; les suites synchrones ont ete executees directement, sans sous-processus.
- Les soumissions UI reelles restent du ressort du parent : ici les tests appellent directement les entrees moteur pour simuler le contournement de la validation formulaire.

## Perimetre

Seuls `V3/site/engine.js`, le nouveau `V3/site/deck-rules.test.cjs` et les rapports `V3/verification-flow/engine-deck-rules.*` ont ete ecrits. Aucun subagent, aucune modification app/combat/builder, profils, arenes, presets ou BDD utilisateur.
