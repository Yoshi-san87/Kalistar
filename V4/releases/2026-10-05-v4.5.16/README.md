# Kalistar 4.5.16

## Armes Arborium

Deux cartes collectionnables et jouables : L'Accord Sylvestre (arc a deux
cordes, bois precieux et fluorescence verte) et Le Cran de Ronce (dague
empoisonnee, bouton et petit cran). Scenes peintes, objets detoures et anneaux
personnalises dans le master Kalistar existant. Cadres et personnages intacts.

Les deux exigent SOLDAT ET Arborium. +20 ATK numerique en inferiorite pour
l'arc, sans reserve pour la dague. Aucun statut poison, aucune nouvelle
mecanique de degats ni changement de matchup. Les snapshots de parties et
anciennes sauvegardes restent compatibles. Schema documente dans
`V4/docs/ARMES_EQUIPEES.md` et production dans `V4/weapon-cards/README.md`.

## Validation

- 74 tests cibles passes : restrictions, profil, composition, sauvegarde,
  bonus, non-cumul, matchs complets, medias et presentation.
- 39 controles du master de cartes, du PC large au compact 320 px.
- 6 parcours arme/ecran (PC, Razr 50, compact Reduced Motion) : equiper,
  remplacer, desequiper, recharger, inspecter deck/arene, adversaire,
  resize, alignement natif, vraies formules +20 et journal.
- Build GitHub Pages et parcours PC/mobile de la distribution valides.
- Les 154 tests du workflow complet passent depuis l'index de publication
  isole, avec hydratation des seuls fichiers LFS necessaires et hashes verifies.
  Le recapitulatif exact est conserve dans `workflow-results.json`.

Captures : `V4/revisions/2026-10-05-arborium-weapons/`. Sources HD et prompts :
`V4/weapon-cards/sources/arborium-*.png` et `arborium-prompts-2026-10-05.json`.
Les tests navigateur utilisent des profils jetables, pas le registre personnel.
Les preuves moteur reposent sur des situations synthetiques puis les vrais
calculs ; elles ne pretendent pas mesurer l'equilibrage en tournoi.

## Publication

Destination autorisee : `https://github.com/Yoshi-san87/Kalistar.git`, branche
`main`, tag annote `v4.5.16`. Badges PC/mobile et assertions de version mis a
jour ensemble. Aucun travail parallele sur les mises a jour de catalogue ou
les comptes n'est inclus. `public-check.cjs` verifie ensuite le commit servi,
les deux versions affichees et les hashes des modules/medias de cette feature.
