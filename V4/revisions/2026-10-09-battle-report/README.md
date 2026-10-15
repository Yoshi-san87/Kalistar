# Bataille - courbes du match

Demande du 9 octobre 2026 : completer la ceremonie par un recapitulatif de la
bataille dans les onglets du bilan, jusqu'a dix eliminations pour chaque camp.

## Implementation

- `site/battle-report.js` : modele pur issu de `match.events`, courbes SVG en
  paliers, points HTML et detail du duel. Aucune lecture des messages humains.
- Le X represente le vrai tour : les longues phases sans elimination gardent
  leur longueur. Le round reutilise `combat-timeline.js`, y compris ABBA.
- Le Y vaut 0-10. Les scores sont ceux du journal conserve, jamais les morts
  reconstruites ni les stats de carriere. Reraise, soutien et Block sont exclus.
- Les UID distinguent deux exemplaires du meme modele ou les deux equipes.
- Les images natives et le composant d'identite du bilan restent reutilises.
- `app.js` ne garde que l'index selectionne et la position du scroll du rapport.
  Aucune mutation moteur, RNG, IndexedDB ou schema. Aucune animation permanente.
- Chaque kill reste accessible par les fleches 44px et au clavier, meme quand
  des zones tactiles de points proches se recouvrent sur un petit ecran.

## Verification

Tests unitaires : 60 rencontres reelles, accord avec `matchStats`, sauvegarde
et reprise, chronologie exacte, morts definitives, instances identiques,
anciens tours alternes, archives partielles ou manquantes, echappement HTML.
Navigateur : PC, grand PC, Razr 50, 320px et paysage, parcours de tous les
kills, score intermediaire, inspection des cartes, changement d'onglet,
reload, resize, Reduced Motion et position de scroll conservee.

Les captures de publication sont dans `qa/built/`. Les anciens rapports,
profils natifs, verrous et sauvegardes personnelles restent inchanges.
