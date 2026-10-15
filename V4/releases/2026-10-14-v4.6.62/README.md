# Kalistar 4.6.62 - Organisation durable du depot

## Perimetre

- Une entree courte a la racine, [index des guides](../../../docs/INDEX.md)
  et [plan d'organisation](../../../docs/ORGANISATION.md).
- Les six anciens guides d'entree sont preserves octet par octet dans
  `docs/historique/2026-10-14/`. Les guides actifs ne sont plus des journaux
  de versions ou des instructions pour creer un futur depot deja existant.
- Les dossiers de production, lots, recherches et livraisons ont des entrees
  explicites. Aucun deplacement ni retrait de sources ou de dependances.
- `work/` est la destination locale ignoree des essais/captures/staging.
- Commandes communes via `package.json`, sans dependance runtime ajoutee.
- 84 invocations CI conservees dans le meme ordre, plus les 20 tests des
  controles d'organisation. Registre unique et controle avant le fetch LFS.
- Controle egalement en pull request, sans publication ni medias natifs.

Le controle refuse dossiers racine/V4 non classes, fichiers temporaires/prives
stages, liens des guides actifs casses et nouveaux tests sans affectation.
Les anciens journaux/tests de lots sont preserves par chemins exacts :
pas de reclassification automatique de nouveaux fichiers.

## Absence de changement du jeu

- Comparaison SHA-256 de 1385 fichiers sources du plan local et des registres.
- Seuls `V4/site/index.html` et `V4/site/v4.css` different, exactement par
  remplacement de `4.6.61` par `4.6.62`.
- Moteur, cartes, profils, medias, Story, equipements, matrice et verrous
  inchanges. Aucune migration, reinitialisation ou import personnel.
- V1-V4/main/Templates, scripts natifs, launcher et jonctions preserves.
- Brouillons des autres taches non stages.

Un media de travail deja non suivi dans `site/assets/weapon-cards/` a ete
laisse intact et exclu de la copie de validation de publication. Aucune
suppression ni inclusion implicite dans Git.

## Controles executes

- `npm run check` et `npm run test:organisation` : PASS.
- `node maintenance/validate.cjs --suite ci` : 85 invocations terminees ;
  1219 tests Node, 1218 PASS, 1 SKIP preexistant, 0 echec. Les deux scripts
  historiques hors node:test sont egalement executes.
- Selection exacte de test durcie apres cette suite, puis les 20 tests
  d'organisation relances : PASS. Aucun argument de la suite CI n'a change.
- `npm run build` : PASS. Copie figee des seuls fichiers suivis :
  379 cartes, 1379 assets, 878.8 Mio, budget inchange de 900 Mio.
- Test de publication navigateur : PC/phone, lecteur, telechargement PNG,
  composition/capitaine, avant-match, arene, sauvegarde/reload, ajout sans
  effacement ; aucun Atelier public ni erreur HTTP/JS : PASS.
- Collection : sept formats, tactile Razr, editions, filtres, noms longs,
  cinq positions, Story et reload : PASS.
- `start.test.cjs` sur serveur temporaire factice : 2 PASS, lancement depuis
  un autre dossier, reprise d'etat perime, reutilisation et diagnostic d'erreur.
- `git diff --check` : PASS.

Les premieres tentatives de tests systeme/navigateur dans le bac a sable ont
rencontre des restrictions Git LFS/localhost. Les memes assertions ont ete
executees hors bac a sable avec profils jetables ; aucun test n'a ete saute
ou modifie pour contourner ces restrictions.

## Preuves retenues

- [Resume de validation](qa/validation-summary.json).
- [Preservation des sources et des anciens guides](qa/preservation.json).
- [Collection PC](qa/collection-desktop.png).
- [Collection telephone](qa/collection-phone.png).
- [Constats de rangement](../../../maintenance/organisation-2026-10-14/README.md).

Les captures intermediaires, copie figee et logs complets restent hors Git.
Le workflow et les controles publics du commit sont verifies apres le push ;
ce README ne declare pas un deploiement termine avant sa verification.
