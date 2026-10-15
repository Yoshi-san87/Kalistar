# Kalistar 4.5.1 - Socle visuel d'interface

Depot personnel : Yoshi-san87/Kalistar. Branche main, tag annote v4.5.1.
Version synchronisee dans le titre, les badges desktop/telephone et les tests.

## Contenu

- Composants partages : commandes, champs, listes natives, onglets, dialogues,
  infobulles, notifications et palmares. Cuivre grave, metal sombre et energie
  cyan contenue, emblemes et trophees existants, titres Cinzel.
- Variante encre et laiton dans le carnet, sans assombrir le manuscrit.
- Etats survol, pression, selection, focus, invalide et desactive coherents.
  Ouverture de fenetre courte, Reduced Motion et couleurs forcees respectes.
- Les listes gardent leur semantique native ; picker personnalise progressif
  avec souris, selecteur systeme sur telephone.
- Les filtres statistiques restent replies par defaut en paysage telephone.
- Aucun changement du moteur, des sauvegardes, des cartes natives ou du combat.

Schema et extension : ../../docs/UI_SYSTEM.md.

## Isolation et validation

Le roman Story, les cartes d'armes collectionnables, les nouvelles armes et
la revision native Kaylis restent locaux. Aucun bulk stage, aucun remplacement
de medias natifs. index.html, boot.js et weapons.browser.test.cjs sont indexes
partiellement pour preserver ces travaux.

L'arbre indexe est exporte et les seuls medias utiles sont hydrates avec
verification SHA-256 par le prepare-snapshot.cjs de la release 4.5.0.
Le check-snapshot.cjs du meme dossier execute le workflow et le build.

Les preuves de validation de cette release sont dans qa/ : tests du workflow,
parcours UI desktop/Razr/compact/paysage/Reduced Motion, navigation, build Pages
et introduction de combat. Les profils de navigateur sont isoles des donnees
personnelles. Les captures publiques proviennent du build isole et non des
prototypes locaux. Voir les fichiers results.json pour les mesures detaillees.

Resultats avant publication :
- 120 tests du workflow reussis, controles Kalistel/ambiances et build reussis.
- Build : 193 cartes, 515 fichiers, 474.5 Mo environ.
- 35 controles UI sur cinq formats : desktop 1440x1000, Razr 412x1007,
  compact 320x568, Reduced Motion 390x844, paysage 844x390.
- Navigation : 38 controles sur huit viewports, aucune erreur navigateur.
- Parcours Pages : lecteur, export PNG, decks, prematch, arene desktop/phone,
  sauvegarde/reprise, publication additive, aucune erreur HTTP ou navigateur.
- Intro desktop : P1 a P5, assets et geometrie de transition verifies.

Apres publication, reconstruire la copie isolee avec GITHUB_SHA egal au commit
publie, puis lancer public-check.cjs avec KALISTAR_RELEASE_DIST pointant sur
son V4/deploy/dist. Ce controle compare le manifeste public complet, les deux
versions affichees, les nouveaux modules et le catalogue.
