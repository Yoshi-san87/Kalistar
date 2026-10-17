# Kalistar 4.6.84

## Perimetre

Correction du debordement de l'arene ouverte depuis Fragment sur Razr.
Le bandeau de parcours etait ajoute dans le flux d'un plateau qui occupait
deja toute la hauteur disponible. Sur 412 x 1007, il ajoutait 54 pixels :
le plateau finissait a 1001px alors que la navigation commencait a 947px.

Sur telephone, cette ligne n'occupe plus le plateau. Le bouton des options
conserve sa cible de 44 x 44px et indique l'etape 1/4 a 4/4. La premiere action
du menu donne le titre du livre, l'etape, le statut et le retour au parcours.
Le bandeau PC reste inchange. Le contexte commun est derive de la rencontre,
sans nouvel etat sauvegarde, timer ou ecouteur.

Aucune reduction des cartes ni verrouillage artificiel du defilement.
L'arene ordinaire ne recoit pas de badge Fragment. Moteur, quatre combats,
recompenses, base de donnees, images et sauvegardes ne sont pas modifies.
Les travaux natifs Nestown et les propositions des autres chats sont exclus.

## Verification

Preuves dans `work/qa/fragment-arena/`, hors Git, avec profils et PostgreSQL
jetables. Aucun compte personnel n'est utilise.

- Le nouveau test sur le build fige 4.6.83 echoue comme attendu sur le bandeau
  visible ; la mesure de 54px est conservee dans `before/results.json`.
- Apres correction, viewport et contenu font tous deux 946px de haut sur
  Razr. Le bas du plateau rejoint exactement le haut de la navigation.
- `journeys.browser.test.cjs` verifie 412x1007, 360x800 et 320x740, pendant
  le duel et apres reprise, avec et sans Reduced Motion. Rotation tactile
  1007x412 et retour portrait : le bandeau reste hors du flux.
- Le paysage tres court conserve le minimum de 640px de l'arene existante.
  Son defilement preexistant n'est pas supprime par ce correctif cible ;
  un premier controle trop general le detectait et reste dans `after/`.
- Quatre combats signes complets, attribution unique, retour par le vrai
  bouton, reload/reprise et apercu administrateur PC passent.
- `V4/deploy/browser.test.cjs` passe sur 434 cartes : Collection, Decks,
  arene ordinaire sans debordement Razr ni badge de parcours, plein ecran,
  sauvegarde/reload et intro. Aucune erreur JavaScript ou HTTP.
- Suite locale complete : 13 groupes, 127 tests passes.
- Suite CI complete sur les sources locales : 91 groupes passes, aucun echec.

Captures relues dans `validated/` et `game-validated/`, notamment
`razr-real-arena.png`, `razr-fragment-menu.png` et `desktop-fragment-arena.png`.

## Publication

Version PC/mobile et assertions alignees sur 4.6.84. Coordination : correctif
Razr avant la revision native Nestown 4.6.85. Preparation du commit exact,
reverification de sa sortie figee, push atomique main/tag puis publication
sur le seul projet Cloudflare personnel `kalistar`.

Les rapports de build et de deploiement restent dans `work/publication/`
et `work/qa/fragment-arena/`. Aucun media nouveau ni telechargement LFS.
