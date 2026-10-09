# Kalistar V4.6.2

Correction visuelle de l'arene : armes et protections equipees visibles au
repos, cercles agrandis sans languette, rotation uniquement quand actives.
Le meme rendu est utilise dans l'inspection. Regles, calculs et sauvegardes
conserves ; aucun reset et aucun export de personnage modifie.

Voir [la revision et ses captures](../../revisions/2026-10-09-arena-equipment-presence/README.md).
Le badge desktop, le titre et le badge smartphone sont increments ensemble.
Les validations de l'index et le manifeste du build sont conserves dans `qa/`.
Les 574 tests du workflow passent ; les sources du moteur, des definitions et
des sauvegardes sont identiques a la 4.6.1. La campagne de gameplay 4.6.0 n'a
pas ete reutilisee comme preuve d'une modification de regles : il n'y en a pas.

Verification publique apres deploiement :

```powershell
$env:KALISTAR_BUILD_PROOF = 'C:/chemin/Kalistar/V4/releases/2026-10-09-v4.6.2/qa/build.json'
$env:KALISTAR_RELEASE_VERSION = '4.6.2'
node V4/releases/2026-10-09-v4.6.0/verify-public.cjs <commit>
```
