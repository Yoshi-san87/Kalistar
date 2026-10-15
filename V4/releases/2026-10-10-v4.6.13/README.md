# Release 4.6.13 - Indice de performance et MVP

Publication personnelle `Yoshi-san87/Kalistar`, branche main, tag annote v4.6.13.
Le scope exclut les cartes et les changements de catalogue Castlevania en cours.
Catalogue publie : 333 cartes. Versions desktop et mobile incrementent ensemble.

## Fonctionnalite

Nouvel indice 2, coefficients officiels centralises, traces de soutiens par UID,
assists causales, consommations Clover/Reraise au donneur original, victoire aux
participants. Detail des contributions dans le MVP et la feuille de match,
carriere, statistiques et CSV coherents. Les anciens matchs conservent indice,
MVP, trophees et reprise : pas de reset et pas d'assists historiques inventees.
Migration depuis les resumes originaux et validation avec profils historiques,
y compris une ancienne face Kalistel de Jill ; source deja consommee refusee
des l'import d'un duel en cours. Les protections de propriete restent intactes.

[Documentation et schema](../../docs/INDICE_PERFORMANCE.md).
[Simulation, conclusions et bilan reel](../../revisions/2026-10-10-performance-index/README.md).

## Validation et publication

`verify-index.cjs` construit un snapshot de l'index Git, hydrate uniquement les
objets LFS necessaires apres verification SHA-256 et execute la suite Pages
exacte avant le build. Le fichier `qa/publication.json` enregistre l'arbre,
le parent, les commandes, le nombre de tests et le resultat du build.

Le test navigateur du nouvel indice est execute contre le build, sur base
locale isolee : archive/import idempotents, donneur falsifie rejete, moyennes
mixtes, MVP et detail reel, PC/Razr/compact/paysage, Reduced Motion et reprise.
La carriere regroupe combat et contribution en deux colonnes sur PC et une
colonne defilante sur telephone, sans reduction des textes ni des icones.
Captures et `results.json` dans `qa/browser/`. Le parcours general du build
est egalement verifie avant publication. Suite Pages : 59 commandes, 664 tests
passes ; onze parcours navigateur du nouvel indice, ainsi que les regressions
carriere et contraste/lisibilite sur sept viewports. Build : 333 cartes.

La campagne de 4 000 matchs et 200 combats avant/apres identiques est conservee
dans la revision. Les coefficients n'ont pas ete ajustes automatiquement.

`public-smoke.cjs` controle le SHA de release et les quatorze assets publics modifies,
en normalisant les URL avec version comme la validation de cache existante.
La publication n'est annoncee en ligne qu'apres succes du workflow Pages et ce
controle. Ses preuves publiques finales restent locales pour ne pas creer un
second push sans nouvel increment de version.
