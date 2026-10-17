# Kalistar 4.6.82

## Perimetre

- Le login rejoint la destination avant de jouer le film. Le catalogue, les
  scripts, le profil et la vue chargent sous son lecteur plein ecran.
- Passage ponctuel par sessionStorage, sans identite ni secret, valable deux
  minutes et consomme une fois. Aucun changement de droits ou de sauvegardes.
- Une seule application et un seul appareil de synchronisation. La presentation
  des capitaines et l'IA attendent la fermeture du lecteur ; skip, erreurs,
  reprise et Reduced Motion gardent leur comportement.
- Bibliotheque de parcours renommee Fragment dans le menu, les etats de vue
  et les regles joueur. Route #journeys et identifiants serveur preserves.
- Sur telephone : filtres repliables en deux colonnes, couvertures ajustees,
  lecture plus contrastee et commandes degagees du cadre et du menu fixe.
- Aucun changement au film approuve, aux quatre combats, aux recompenses,
  aux cartes natives ou aux donnees personnelles.

## Validation

Sorties et captures locales : `work/qa/fragment-preload/` (hors Git).
Les tests emploient uniquement des profils jetables et des comptes fictifs.

- Les 91 groupes CI et les 13 groupes locaux sont valides avec medias originaux.
  La CI a ete reprise a `navigation.test.cjs` apres adaptation de l'assertion
  de libelle a Fragment ; le prefixe et la fin sont conserves dans `ci.log`
  et `ci-tail.log`. Aucun test ni verrou n'a ete retire.
- `login-intro.test.cjs` : lecteur, handoff unique/expire/stockage refuse,
  chargement concurrent apres controle d'acces, aucun chargement avant accord.
- `login.browser.test.cjs` : vrai SDK Auth et Worker, PostgreSQL ephemere,
  lecture complete PC/Razr, jeu pret pendant le film, un seul appareil,
  destination, reload sans intro, logout, refus d'acces, Paris/Tokyo,
  Fragment dans le shell reel ; 320 px, paysage et Reduced Motion.
- `login-intro.browser.test.cjs` : decodage des deux coupes, son, skip,
  autoplay refuse, erreurs, resize et nettoyage.
- `journey-view.browser.test.cjs` : feuilles de style et navigation reelles,
  sept tailles, filtres, clavier/tactile, texte, recompense et nettoyage.
- `journeys.browser.test.cjs` : quatre combats serveur signes, recompense
  Tokyo sans doublon, reprise, apercu Paris, PC/Razr.
- `deploy/browser.test.cjs` : Collection/Decks/Arene, sauvegarde et reprise ;
  retour a l'initiative sous le film sans lancer le tirage, puis une seule
  presentation des capitaines apres Passer.

Le premier lancement de la suite locale a ete bloque par EACCES sur son
serveur 127.0.0.1 ; relance avec acces local autorise. Le test isole de
l'ordonnanceur IA a ete complete avec le nouvel etat du film et verifie
explicitement qu'aucune decision IA n'est lancee pendant celui-ci.

## Publication

Code et documentation uniquement, aucun binaire ajoute au Git. Build fige
du commit exact via `prepare-release.cjs`, controle puis envoi au projet
Cloudflare personnel `kalistar`. Le rapport du snapshot et les preuves de
publication restent dans `work/publication/` et `work/qa/fragment-preload/`.
