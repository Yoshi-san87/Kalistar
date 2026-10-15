# Kalistar 4.5.18 - Timeline d'arene

La frise des tours adopte les matieres du framework Kalistar : support
grimoire sombre, cuivre, plaques biseautees et typographie Cinzel. Le tour
actif porte le cristal rainbow deja utilise par la navigation, avec une
respiration legere. Le resultat fige le cristal et conserve la coche.
Reduced Motion supprime l'animation. Les accents des deux camps restent
distincts ; l'etat courant reste aussi indique par la forme, l'icone et ARIA.

Les cinq etapes et les libelles du moteur sont inchanges. Telephone : meme
rail de 34 px, toute la largeur, aucune phrase visible. PC : meme hauteur
de 36 px. Aucun changement du moteur, du RNG, du tirage, des cartes,
de la sauvegarde ou du rythme de presentation.

## Validation

- 31 tests Node cibles : styles, contrats mobiles, initiative, 250 matchs ABBA
  complets, presentation, framework UI, navigation, PWA et build.
- 20 groupes de controles navigateur passes, depuis les sources locales et
  depuis le build Pages, sans erreur JS ni ressource manquante :
  PC, 412x1007, 320x568, 844x390 et vrai preview Razr 50 ; mouvement reduit,
  labels/icones sans debordement, couleurs des deux camps, resolution,
  changements de tour, reload, remplacements, introduction et IA.
- Verification visuelle des captures PC et telephone.

Captures et resultats : `V4/site/verification/turn-timeline-kalistar/`.
Tests avec profils jetables uniquement. Les preuves anterieures sont intactes.

Publication : `Yoshi-san87/Kalistar`, branche main, tag annote `v4.5.18`.
Badges PC/telephone et assertions de version incrementes ensemble.
`public-check.cjs` verifie ensuite la version et les hashes publics.
