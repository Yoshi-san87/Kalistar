# Kalistar 4.6.89

## Perimetre

Cinq cartes approuvees de la Garde noire de Vulkar : Zhaerik, Syrkha,
Dhorven, Nessyra et Orzhan. Race DRAX, Kalistel PYRO et faction Vulkar
existants. IDs 49903001-49903005 ; le catalogue passe de 434 a 439 cartes.
[Galerie et production](../../expansions/2026-10-18-vulkar-black-guard/README.md).

Profils distincts couvrant les cinq roles, bornes de valeurs et positions
respectees. Garde, Mort, soutien ATK, potion, trefle, esquive et barrieres
utilisent les mecanismes existants. Le vol de Nessyra est illustratif seulement.
Aucun changement moteur, parcours, equipement, preset ou migration SQL.
Les anciennes cartes et leurs images ne sont pas modifiees. Le dos Obsidienne
4.6.88 est conserve. Version PC et smartphone mise a jour ensemble.

Cinq propositions Lara Croft explorent les premiers episodes I-V. Elles restent
hors catalogue et hors runtime jusqu'a validation :
[galerie locale](../../propositions/2026-10-18-lara-croft-five-eras/index.html).

## Sources

Illustrations approuvees copiees a l'identique dans les cartes, pas regenerees.
Exports 897 x 1497, textes editables et objets dynamiques Photoshop. Les glyphes
blancs actuels et les composants proteges sont conserves. Les verrous natifs
precedents ne sont pas reecrits. Cinq nouvelles images seulement au registre
runtime-media.json ; aucun media binaire ajoute a Git.

Sauvegarde personnelle hors checkout :
sauvegardes-personnelles/creation/2026-10-18-vulkar-lara/ avec manifest SHA-256.
Elle comprend les originaux, les profils, les PSD/PNG et les propositions Lara.

## Verification

- Neuf tests moteur : 60 faces, effets, barrieres, journaux, reprises et cinq
  parties ABBA completes avec tous les nouveaux personnages.
- Zhaerik est ajoute a l'attendu des porteurs de la Veille des Remparts :
  il respecte les restrictions preexistantes GARDIEN + Lance. Son bonus ATK
  de 15 est controle sur D6 retenu, absent sur D5, avec journal et restauration.
  Aucune definition d'equipement ni archive historique n'est modifiee.
- Preuves natives : cinq codes-barres, cadre fixe sans difference, PSD reouverts
  sans changement, empreintes et typographie controlees.
- Galeries : 1920, 1440, 800, 412 et 320 pixels ; clavier, filtres, agrandissement,
  focus, mouvement reduit et controle visuel PC/mobile.
- Navigateur jeu : les cinq lecteurs aux largeurs 1440/412/320, duel, sauvegarde,
  reload et import d'une sauvegarde anterieure reussis.
- Navigateur general : 439 cartes, Collection, export PNG, Decks, Arene et reprise
  de partie, sans erreur JS/HTTP.
- Suite locale : 13 invocations reussies. Suite complete finale : 94 invocations
  reussies dans ci-release.log. Suite repository : 105 tests reussis.
  Les premieres executions ont signale deux assertions de version
  oubliees, puis un environnement CF_PAGES active pour une suite standard.
  Une execution a aussi signale la liste de porteurs qui ne comprenait pas
  encore Zhaerik. Ces journaux restent conserves ; aucun seuil de test n'a
  ete assoupli.
- Build Cloudflare : 439 cartes, 1498 fichiers, environ 1060,2 Mio.

Preuves et captures : work/qa/vulkar-black-guard/ et work/qa/lara-croft-five-eras/.
Les tests utilisent uniquement des profils locaux jetables.

## Publication

Depot personnel Yoshi-san87/Kalistar, main et tag annote v4.6.89 ensemble.
Le deploiement cible le projet Cloudflare existant kalistar, depuis le build
du commit fige. Ce build doit repasser les deux tests navigateur, puis le login
public PC/Razr est controle apres envoi. Aucun secret ni acces cloud modifie.
