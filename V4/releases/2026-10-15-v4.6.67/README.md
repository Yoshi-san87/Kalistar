# Kalistar 4.6.67 - Scenes cultes

45 nouvelles versions jouables issues des illustrations approuvees. Le catalogue
passe de 379 a 424 cartes. Shadow, Claire Redfield, Jill Valentine, Aranea et
Auron sont exclus de ce lot ; leurs propositions ne sont pas publiees comme cartes.

[Galerie locale](../../expansions/2026-10-15-collab-scenes-45/index.html) |
[Production et profils](../../expansions/2026-10-15-collab-scenes-45/README.md) |
[Procedure de livraison](../../deploy/README.md)

## Perimetre

- Modeles 49902801 a 49902845, avec characterId, race et faction existants.
- Toutes les illustrations approuvees sont preservees, notamment les corrections
  finales de Linoa, Ocelot et Dracula. Aucune ancienne carte n'est remplacee.
- Roles et effets choisis pour chaque scene : Tidus au blitzball en Projectile,
  Celes a l'opera en Instrument, Zoro en resistance, Dracula en soutien.
- Pas de mecanique nouvelle, ni modification du moteur ou du schema des saves.
- Les restrictions d'equipement restent applicables a la famille imprimee.
- PC et telephone affichent la version 4.6.67.

## Sources et preuves natives

45 PSD editables et PNG 897 x 1497, 300 dpi. Sur les 45 cartes : zero pixel
modifie dans le cadre fixe, zero difference a la reouverture PSD, 45 codes-barres
decodes. Les titres, nombres et recits restent des textes editables ; les
composants sont incorpores en objets dynamiques. Glyphes d'armes blancs actuels.

La reduction du recit de Dagga apres son premier depassement est documentee dans
`revisions/01-dagga-text/` du lot. Les entrees initiales et leurs empreintes sont
conservees. La descendante du Q de SQUALL est couverte par le nouveau controle
typographique, sans changement de police, taille, cadre ou ancien rapport.

Sauvegarde privee verifiee hors checkout :
`C:/Users/guill/Documents/Sauvegardes-Kalistar/2026-10-15_collab-scenes-45_212259/`.
Son manifest SHA-256 indique complete=true et 45 cartes. Git ne contient que
code, profils et preuves texte ; les images et PSD restent sur le PC.

## Validation

- 540 faces ATK/DEF et 45 matches ABBA complets : soutiens, barrieres, magie,
  journaux, equipements, exclusions de doublons et sauvegarde/restauration.
- Verification native complete et validation de la publication locale.
- Galerie sur 1920/1440/412/320 px ; lecture des 45 cartes sur PC et echantillon
  sur 412/320 px ; duel Cloud/Dracula, reprise et import d'une sauvegarde 379 cartes.
- Build Cloudflare : 424 cartes, 1424 fichiers, environ 952.3 Mio. CF_PAGES=1
  applique les limites Cloudflare existantes ; aucun garde-fou n'est assoupli.
- Navigation, lecteur, telechargement PNG, decks, arene et sauvegarde : profils
  navigateur jetables, PC et telephone, sans erreur JavaScript ou HTTP.

Les tests historiques 2B/Balmhyr, Street Fighter, Castlevania et Chrono Trigger
ciblent desormais les identifiants de leur lot au lieu de figer le nombre total
de versions d'un personnage ou d'une faction. Les controles de profil, image,
identite et absence de doublons restent actifs ; les anciens verrous ne changent pas.
Les tests d'equipements FFIX et Chrono comparent les porteurs par identite stable
et famille, pour couvrir aussi les nouvelles versions de Vivi, Grenat, Crono,
Frog et Magus. Les essais initialement bloques par ces comptes fixes sont
conserves dans les logs, pas effaces ni presentes comme reussis.

Commandes : `npm test`, `npm run test:local`, `npm run check`, `npm run build`,
les tests navigateur du lot et `V4/deploy/browser.test.cjs`. Dependances locales
via KALISTAR_NODE_MODULES. Les sorties detaillees et captures sont sous
`work/collab-scenes-45/` et `work/qa/collab-scenes-45/`.

Le commit et son seul tag annote v4.6.67 sont publies sur le depot personnel.
Le site est prepare depuis ce commit exact avec `npm run prepare:release`, puis
teste et envoye au projet Cloudflare existant kalistar. Les travaux Home et Map
en cours dans les autres chats ne font pas partie de cette livraison.
