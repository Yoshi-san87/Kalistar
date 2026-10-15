# Kalistar 4.6.69 - Le sanctuaire d'Astralia

## Perimetre

Refonte de Home PC/telephone : peinture originale, cartes en eventail,
apparition et flottement, details du personnage, acces aux quatre collections,
a la composition, a l'arene et aux destinations Map, Story et Guide existantes.
Le logo et le K gardent leur destination Home ; la navigation desktop conserve
sa geometrie. Aucun changement des regles, equipements ou donnees personnelles.
Les ajouts 4.6.67 et Map 4.6.68 du parent sont conserves.

Home respecte le tactile, le clavier, Reduced Motion, les popups et la
visibilite. La carte choisie et la pause sont conservees lors d'un repaint.
La zone de clic reste fixe pendant le flottement et l'icone Pause n'est pas
recree pendant la prise de focus. Le retour d'une page mise en cache reste
interactif. Le defilement vertical n'est pas capture par le carrousel.

## Medias et sauvegarde

Un original PNG preserve et deux exports WebP : 382 292 octets PC et 121 552
octets telephone. Sources, prompt et provenance dans
`V4/revisions/2026-10-15-home-sanctum/`. Les nouveaux binaires sont sauvegardes
hors checkout avec comparaison SHA-256. Git ne recoit que le code, les documents
et leurs empreintes dans `V4/deploy/runtime-media.json`, jamais les images.

## Verification et publication

- Tests purs Home et transitions ; regression complete du registre CI.
- `home-screen.browser.test.cjs` : PC, large, laptop, Razr, phone, compact,
  nom le plus long du catalogue, paysage tactile, PC court et Reduced Motion.
- Clics, pause/reprise, autoplay, popup et Back, navigation, recharge,
  balayages tactile horizontal/vertical, resize et retour de page en cache.
- Parcours historiques `razr-shell.browser.test.cjs` et navigation.
- Build depuis le commit exact avec medias verifies, puis controles du site
  fige et public sur PC/phone, collection, decks, combat et sauvegarde/reload.
- Version PC/phone et assertions 4.6.69 ; tag annote et publication Cloudflare
  sur le projet personnel existant, sans LFS et sans build Git.

Captures et journaux de travail dans `work/qa/home-sanctum/` et
`work/qa-home-*.log`, exclus du depot. Ne pas reecrire les verrous natifs ni
les rapports historiques pour contourner un echec.
