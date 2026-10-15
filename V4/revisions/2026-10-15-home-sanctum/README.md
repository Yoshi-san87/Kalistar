# Accueil - Le sanctuaire d'Astralia

Refonte de la vue Home, sans modification des cartes, regles, possessions,
equipements ou schemas de sauvegarde. Les destinations du shell restent celles
du jeu ; le logo ouvre toujours Home sur PC et le K reste le premier acces mobile.

## Mise en scene

Peinture originale panoramique, table de cartographe en pierre vert sombre et
cuivre, ocean et archipels a l'aube. Les originaux Momo et Valazar servent de
references de peinture, pas de personnages a copier. Les cartes et emblemes
reels sont superposes par le site : aucun faux texte, score ou bouton peint.

Source originale conservee localement sous `source/sanctum-original-v1.png`.
Le prompt effectivement envoye est dans [sanctum.prompt.txt](sanctum.prompt.txt).
Les empreintes et tailles sont dans [media-provenance.json](media-provenance.json).
Seuls les deux WebP optimises sont deployes, jamais le PNG original ou un PSD.
Les binaires sont sauvegardes hors Git selon la procedure Cloudflare actuelle.

## Contrats de la vue

- Huit cartes choisies au maximum, trois visuels presentes simultanement.
- Neuf secondes entre les revelations ; commandes precedente, suivante, pause.
- Defilement suspendu au survol, au focus clavier, hors ecran, onglet masque,
  pendant une popup ou avec Reduced Motion. Le temps restant est conserve.
- Carte, selection et pause manuelle conservees lors d'un repaint de l'app.
- Le bouton carte garde une geometrie fixe ; seule son image flotte.
- Balayage horizontal sur mobile, sans capturer le defilement vertical.
- Les details et liens utilisent les dialogues et vues existants du shell.
- Le resume de composition et le bouton Reprendre utilisent l'etat local reel.
- Aucun Canvas, WebGL, polling ou timer permanent en dehors de Home.
- AbortController, observateurs, timeout et frame nettoyes au demontage.

## Validation

Tests purs : `node --test V4/site/home-screen.test.cjs`.
Test interactif : `node V4/site/home-screen.browser.test.cjs` avec le build
valide ou `KALISTAR_URL`. Formats PC, Razr, compact, paysage et Reduced Motion,
plus le nom le plus long du catalogue sur telephone ; navigation, retour arriere,
popup, autoplay, balayages horizontal/vertical, resize et reload.
Sorties de travail dans `work/qa/home-sanctum/`, jamais dans les sources natives.

References consultees : [GWENT](https://www.playgwent.com/en/play-mobile) et
[Legends of Runeterra](https://playruneterra.com/). Inspiration pour le traitement
des illustrations et des cartes ; aucun visuel tiers repris dans le jeu.
