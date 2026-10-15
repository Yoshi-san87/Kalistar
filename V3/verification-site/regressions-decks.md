# Regressions V3 : page decks et combat

Verification du 15 septembre 2026, Node v24.19.0 et Chrome headless. Tous les profils navigateur sont temporaires et isoles. Aucune BDD utilisateur ouverte.

## Resultats

| Suite | Resultat |
| --- | --- |
| verify_presets_v3.cjs | 10/10, dernier builder parent inclus |
| verify_site_v3.cjs --require-final --require-assets | 13/13, aucun asset manquant ou mal dimensionne |
| verify_stacked_buffs_ui.cjs | 23/23 apres correction CSS parent ; assertions inchangees |
| verify_ownership_db.cjs, inchange | 41/41 |
| verify_ownership_ui.cjs, inchange | 16/16 |
| verify_db_engine_contract.cjs, inchange | 9/9 |
| engine.test + engine-v3 + match-stats + buff-stacking, inchanges | 116/116 |
| engine-roster.test.cjs, inchange | 41 cartes, 16 arenes, 246 faces ATK ; 80 campagnes |
| deck-rules.test.cjs, inchange | 13/13, dont IndexedDB isole |

Les suites moteur existantes totalisent 200 campagnes ; deck-rules ajoute quatre matchs stricts deterministes. Aucune exception navigateur observee. Aucun echec fonctionnel ou de securite observe dans les suites executees.

## Regression corrigee et reverifiee

Le chevauchement P2 entre `physical` et `.inspect` est resolu. Suite buffs complete rejouee le 15 septembre 2026 a 06:07:57 UTC, sans modifier le script ni ses assertions : 23 reussites, zero echec, zero exception navigateur et aucun changement de source pendant le run.

- 1440 x 1000, 2560 x 1440, 390 x 844 et 360 x 800 : zero chevauchement detecte parmi les 50 badges.
- Dix clics de details verifies par largeur, soit 40 clics au total.
- La regle parent `site/battle-ui.css:3` reserve la place du cinquieme badge sans sortir le bouton inspect de la carte.
- Les controles existants de position des des restent passes. Le test 3D confirme une animation effective, une face finale 3, 324 couleurs et 1122 pixels opaques.
- Animations de buffs, annulation par navigation, reprises JSON/IndexedDB, metriques et archives Elenion passent egalement.
- Captures actualisees dans `verification-buffs/screenshots/`, dont `badges-1440-side-0.png`, inspectee visuellement.

Le run buffs sert un snapshot immuable du code : `battle-ui.css` SHA256 `5f619010eb3efe5134a14db458354819f65d4ed417be823973a8c58b87ac5a9c`, `duel-focus.js` SHA256 `a8cb398940db549fd9e923ea6ab0c9d52d50f16c8b0dc505e5c272e31210ebe4`. Le script conserve son SHA256 `2c186c52e22a21373fdefab15e9d63dbb6d83c267abb49fc6398d3ab3896f5be`.

Seule la suite buffs a ete rejouee lors de cette derniere verification ; les autres lignes du tableau conservent les resultats des runs precedents. Le nouveau parcours 15/15 a ete annonce par le parent, sans execution supplementaire dans cette sous-tache. Aucun point bloquant restant dans les regressions executees.

## Adaptations des tests

- Page `#decks`, suppression par slot, champ nom et bouton jouer du module deck-builder ; controles presets et import legacy conserves.
- Retour explicite en arene avant les boutons de nouvelle partie et les imports de partie : fermer un dialog ne change plus de page.
- Canonical `donnees/decks_demo.json` et bundle compares exactement. Les cinq presets passent `validatePlayableDeck`. Chaque nouvelle partie UI porte `deckCoverage:2`.
- Fixtures courantes strictes ; anciennes fixtures Elenion preservees en validation historique. Aucun profil ou score modifie.
- Preference `kalistar.v3.autoAdvance=false` dans les contextes isoles des trois scripts adaptes. Aucun changement des assertions ATK/DEF, de RNG, de cumul, d'archives ou d'atomicite.
- Reserve via `data-reserve-card`, veritable hover et popup full image. Aucun bouton de placement autorise pendant le choix de soutien ; cliquer la reserve ne modifie pas l'etat.
- Comparaison exacte des positions des des avant/apres action dans une meme arene. L'ancienne comparaison entre materiaux d'arenes aux bordures differentes donnait un faux positif de 2 px ; aucune tolerance ajoutee.
- Import V2 deck : assertion explicite ajoutee sur le deck sauvegarde et sur la partie active, tous deux inchanges.
- Rapport buffs : libelle ancien "ward" remplace par "buff" et references CSS actualisees, sans modifier les mesures ou les resultats.

Le bug de repaint recursif signale puis corrige par le parent n'a pas ete observe ici. La suite presets a ete rejouee apres sa correction, sans erreur.

## Perimetre et rapports

Seuls les trois scripts demandes et leurs rapports/captures associes ont ete ecrits. Les trois scripts supplementaires et tous les tests moteur ont ete executes sans modification. Aucun changement app, CSS, engine, profils, arenes ou donnees.

- Presets : `verification-presets/report.json`
- Site : `verification-site/report.json`
- Buffs : `verification-buffs/report.json` et `report.md`
- Ownership : `verification-ownership/backend-tests.json` et `ui-report.json`
- Synthese machine : `verification-site/regressions-decks.json`

Les tests navigateur ont utilise l'autorisation de lancer Chrome headless hors sandbox. Aucun profil persistant, compte ou stockage utilisateur n'a ete utilise.
