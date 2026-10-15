# Kalistar V4.5.38

## Publication des equipements

La version 4.5.37 a ete poussee mais son workflow Pages a echoue avant
deploiement. Le controle alpha des nouveaux medias importait `atelier/lib.cjs`,
dont la dependance Sharp pointait vers le runtime Windows du poste local.

Cette correction rend le test portable via `KALISTAR_NODE_MODULES` et installe
Sharp 0.35.4 dans le repertoire temporaire du runner Linux. Tous les controles
de hash, transparence, dimensions et contour natif sont conserves. Aucun
changement de regle, visuel, sauvegarde ou verrou par rapport a 4.5.37.

Les badges PC/telephone et assertions de version passent a 4.5.38.
La modification locale non liee `performance.test.cjs` reste hors publication.

La feature, ses sources et ses preuves PC/telephone sont documentees dans
[`V4.5.37`](../2026-10-06-v4.5.37/README.md).

## Validation du correctif

- Installation neuve de Sharp 0.35.4 avec les memes options que le workflow.
- 55 tests cibles reussis avec le repertoire temporaire comme dependance.
- Nouveau snapshot isole : les 298 tests de publication et le build passent.
  Details dans `workflow-results.json`.
- L'import du module Atelier n'est plus necessaire pour verifier les medias.
  Aucun test ni verrou n'est ignore pour contourner l'echec.
