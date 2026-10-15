# Kalistar 4.4.4 - Navigation raccordee au bandeau

## Demande

Supprimer l'espace entre le bas des onglets et la bordure du menu. Donner au
menu un leger premier plan pour laisser depasser le Kalistel actif.

## Implementation

- Sur desktop, les onglets s'etirent jusqu'a la bordure basse du masthead.
  La marge basse de -1 px raccorde le soulignement actif a cette bordure, sans
  une seconde ligne ni une augmentation de hauteur du bandeau.
- Le masthead est positionne au niveau 30 ; le menu, l'onglet actif et le
  Kalistel ont des couches explicites. Le debordement reste visible et une
  ombre courte donne un relief discret au raccord.
- Les presentations sur deux lignes conservent leurs hauteurs cible de
  110 px (tablette / local compact) et 122 px (tablette locale sept entrees).
  Les anciennes contraintes Decks ne doivent pas rogner le logo.
- La hauteur CSS cible utilise `--navigation-header-height`. La mesure
  `--masthead-height` conserve son role pour les vues sous le bandeau, sans
  boucler sur la hauteur cible lors d'un resize telephone / tablette.
- Le menu de bas de page telephone, ses cinq destinations, ses zones tactiles,
  le menu Plus et le mode immersif Arene restent inchanges.
- Aucun changement des cartes natives, regles, equipements ou sauvegardes.

## Verification

- 4 tests unitaires du menu.
- 75 regressions de production via `test-committed-story.cjs`.
- Navigateur du site construit : 38 controles sur huit formats, avec parcours
  Armes / Decks / Story / Collection, Plus / Statistiques sur telephone,
  clavier, ESC, Reduced Motion et resize telephone / tablette / telephone.
- Navigateur local : 16 controles sur les memes huit formats, avec l'entree
  Atelier locale preservee.
- Les assertions comparent les rectangles reels : chaque onglet et le menu
  finissent a moins de 0.5 px de la bordure basse du bandeau. Elles verifient
  aussi le logo et les commandes contenus, l'absence de chevauchement et de
  debordement horizontal, la police, les images et les couches de rendu.
- Captures et mesures dans `qa/navigation/` et `qa/local-navigation/`.
  Inspection visuelle desktop, tablette et Motorola Razr 50.

## Publication

Depot personnel uniquement : `Yoshi-san87/Kalistar`, branche `main`, tag
annote `v4.4.4`. Version mise a jour dans le titre, les badges PC / telephone
et les assertions de release.

Le brouillon local Story inacheve et ses fichiers associes sont exclus de
cette release. Les scripts de production existants utilisent la Story deja
commitee sans modifier ce brouillon. Aucun verrou ou ancien rapport change.

Construire avec `node V4/releases/2026-10-02-pages-portability/build-committed-runtime.cjs`.
Apres le deploiement Pages, `node V4/releases/2026-10-03-v4.4.4/public-check.cjs`
compare le manifeste public complet au build du commit et controle les
versions, le CSS corrige, le catalogue et 14 echantillons de medias.
