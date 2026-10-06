# Kalistar V4.5.37

## Equipements

- La section Armes devient Equipements : filtres Armes, Boucliers et Reliques.
- Un emplacement partage par personnage, conserve dans chaque composition
  et fige dans les rencontres commencees. Anciennes sauvegardes compatibles.
- Le Rempart de Durane : +30 DEF sur la premiere defense, une fois par match.
- Pod 042 : apres un Block de 2B, +20 DEF sur la prochaine defense, une fois
  par match. Pas de cumul, recharge infinie ou changement de famille imprimee.
- Deux cartes collectionnables, scenes et medaillons independants, cadres
  argent/jade et argent/amethyste, rendu desktop et telephone.
- Le recapitulatif du journal nomme egalement les bonus d'equipement.

Documentation, sources image_gen et preuves :
[`equipment-categories`](../../revisions/2026-10-06-equipment-categories/README.md).

Les tests armes existants restent limites aux 33 armes ; les nouvelles categories
possedent leurs propres scenarios. Les assertions de porteurs tiennent compte
des nouvelles editions de 2B et Balmhyr publiees en V4.5.35.
La modification locale non liee `performance.test.cjs` du workflow reste hors
de cette publication. Aucun verrou ni ancien rapport de validation n'est change.

## Verification

- Snapshot isole de l'index : 38 commandes de la chaine Pages, 298 tests,
  puis construction du site statique, tous reussis.
- Categories : navigation, sauvegarde, remplacement et retrait, Composition,
  inspections et vrais combats sur PC 1440, Razr 50 412 et compact 320.
  Meme parcours repasse contre le site statique construit sous `/Kalistar/`.
- Regression des armes : profils, backups, migration, Hache, Flute, geometrie
  native, animation continue, Reduced Motion et nettoyage verifies.
- Cartes collectionnables : 47 controles, six viewports, 35 equipements.
- Shell statique : 232 cartes, collection, carnet, telechargement PNG,
  decks, nouvelle partie, arene et sauvegarde ; aucun echec HTTP ou JavaScript.
- Sources et captures conservees dans la revision ; aucun profil personnel
  de navigateur n'a ete utilise par les tests.

Le resultat de la chaine est dans `workflow-results.json`. Les preuves navigateur
sont les `results.json` de `qa`, `qa-pages`, `qa-regression` et `qa-cards`.

Arbre source du build teste : `0c7e20c8ff4846d83d24ba9ca9760a8fcce0d76c`.
Apres ce build, seuls les tests navigateur, cette documentation et les preuves
ont ete ajoutes ; aucun fichier livre au navigateur n'a change.
