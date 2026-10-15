# Kalistar 4.6.26 - Map

Nouvelle section Map dans le menu Plus, disponible sur ordinateur et mobile.
Consultation de la carte 1.18 avec zoom, vue entiere et deplacement : aucun
changement de moteur, de personnages, de collection ou de sauvegardes.
L'image WebP est sans perte ; PSD, prompts et sources restent hors du site.

Monuments plus lisibles et ombres portees remplaçant l'aura d'Arborium.
La geographie 1.17, les villes et les versions anterieures sont conservees
dans V4/map. Verification des PSD, pixels, positions, masques et empreintes.

Version desktop/mobile et assertions de publication avancees a 4.6.26.
Publication autorisee exclusivement sur Yoshi-san87/Kalistar, main, tag v4.6.26.
Tests Map/Pages/navigation/PWA, build statique et rendu PC/Razr/320/paysage.
Captures et rapports dans qa/. Les ressources de carte decodent bien avant
les captures ; elles ne sont pas jugees sur leur seul naturalWidth.

Nettoyage : 17 doubles de generation strictement identiques a leurs archives
dans V4/map supprimes, 44 778 391 octets liberes. Aucune source unique supprimee.
Le rapport detaille est dans V4/map/maintenance/cleanup-2026-10-12/.

## Resultats

- 18 tests unitaires Map, navigation, build et PWA reussis.
- Map : PC, Razr, 320 px et paysage, zoom/reset/reload/sortie sans erreur.
- Navigation : 46 controles, dix viewports, sans debordement de menu.
- Build : 351 cartes, 1276 fichiers ; ecran Map ajoute sans publier les PSD.
- Test de publication : lecteur, PNG, decks, arene, reprise de match et
  publication additive reussis ; aucun HTTP manquant ni erreur JS.
- Empreintes des maps 1.0 a 1.18 et sources conformes apres nettoyage.
