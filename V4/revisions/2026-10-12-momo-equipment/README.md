# Momo : arme et relique distinctes

Correction explicite de l'utilisateur apres la 4.6.24, le 12 octobre 2026.

- La Flute des Petits Bonheurs (`little-joys-flute`) retrouve l'emplacement
  arme : +30 ATK sur un 6 numerique conserve, selon la regle commune.
- La Boite des Petits Bonheurs (`little-joys-box`), relique deja existante,
  recoit l'ultime de Momo : attaque hostile acceptee en inferiorite numerique
  au verrouillage, un trefle par autre allie actif sans trefle, une fois.
- Aucune nouvelle image ni identite, aucune modification native, aucun
  changement a Aeris, 2B, aux familles imprimees ou aux autres objets.
- Les deux objets peuvent etre equipes ensemble et ont leurs propres
  ancrages, effets, charges et origines dans les statistiques.

## Migration

Seule la lecture editable des profils/compositions reconnait la Flute dans
l'ancien emplacement `relic` et la deplace vers `weapon`. La source n'est
jamais mutee. La migration est repetable et conserve protections, membres,
formation et capitaine. La Boite n'est pas equipee automatiquement.

Inconnus, doublons, mauvais porteurs, autres mauvaises categories et conflit
de destination restent refuses. Une migration echouee n'ecrase pas de slot.
Le store IndexedDB et les schemas de sauvegarde sont inchanges.

Les rencontres figees restent exactement historiques : ancienne Flute DEF,
Flute-ultime 4.6.24 et ancienne Boite +20 DEF. Ni identifiant de source, ni
don, ni charge ni statistique n'est transfere de la Flute vers la Boite dans
une partie deja commencee. Le changement s'applique aux nouvelles parties.

## Verification

```powershell
node --test V4/site/momo-equipment.test.cjs V4/site/relic-ultimates.test.cjs V4/site/relic-ultimates-integrity.test.cjs V4/site/relic-ultimates-ui.test.cjs
$env:KALISTAR_VERIFICATION_DIR='V4/revisions/2026-10-12-momo-equipment/qa'
node V4/revisions/2026-10-12-relic-ultimates/verify-publication.cjs
```

La seconde commande verifie le contenu deja selectionne dans l'index Git,
dans une copie temporaire isolee. Elle ne doit pas etre lancee sur l'index
d'une autre publication concurrente. Le dossier de sortie distinct preserve
les preuves originales de la 4.6.24.

Les parcours navigateur utilisent uniquement des bases de test isolees :
`equipment-slots-persistence.browser.test.cjs` pour IndexedDB et compositions,
`relic-ultimates.browser.test.cjs` pour les trois ultimes, dans les deux camps,
sur PC, Razr 50 et petit ecran Reduced Motion. Utiliser `KALISTAR_DIST` pour
le build fige et `KALISTAR_VERIFICATION_DIR` pour leurs captures et rapports.

## Resultats du 12 octobre

- Selection finale isolee `70438de8a8f5eb5f4e21ab072981b7cbac4c54e2` :
  71 commandes CI reussies, 876 tests recenses, build de 351 cartes.
- `qa/publication.json` et `qa/build.json` : preuves de cette selection.
- `qa/final/results.json` : 18 combats navigateur, les trois reliques dans
  les deux camps, PC / Razr 50 / petit ecran Reduced Motion, sans erreur.
  Cette passe utilise le build `3c4c6bdd98874934870ff02484df589a235c5af7`.
  Le seul changement applicatif suivant est la phrase corrigee dans l'aide ;
  moteurs, definitions, animations et styles sont identiques.
- `qa/final-momo/results.json` : dernier build, aide corrigee, equipement
  Flute + Boite, reload, ancrages distincts, PC et Razr 50, sans erreur.
- `qa/persistence/results.json` : migration IndexedDB reelle, profil inactif,
  sauvegarde brute/reouverture/import, compositions, conflits et isolation
  des matchs ; neuf controles reussis dans des bases uniquement de test.
- Captures selectionnees dans `qa/final/` et `qa/final-momo/`, regardees
  manuellement. Les anciens rapports 4.6.24 restent inchanges.

L'aide du jeu distingue desormais explicitement l'arme et la relique de Momo.
Le controle de boot attend les 49 modules apres l'ajout Map en 4.6.26,
avec assertion explicite de son chargement avant app.js.
