# FFIX : nouvelles scenes et races vivantes

Revision demandee le 8 octobre 2026 apres la premiere production locale.

## Scenes

- Vivi Glace : un passage enneige, baton plante a deux mains, barriere de glace.
- Vivi Foudre : sur un aeronef, un petit eclair rallume une lanterne.
- Vivi Feu : illustration initiale conservee.

Ce sont deux generations completes, pas des recolorations de la meme pose.
Les titres et descriptions suivent leur scene. Les references d'identite
et de peinture Kalistar sont documentees dans [les prompts](prompts.json).

## Races

Comparaison avec HUMAIN, NAIN, FELINEUS, KORBOW, CERELF, TOXINAR et SKULLZ.
Pas de tete argentee identique imposee a toutes les especes :

- MICE : fourrure ivoire, grandes oreilles roses, armure, trois-quarts.
- BATRA : peau verte, bouche large, yeux dores, portrait frontal.
- RATZ : museau effile, fourrure brune, capuche bordeaux, profil oppose.
- MACAKO : fourrure rousse, visage vivant, buste et foulard bleu.

Les six cartes concernees gardent leurs profils, illustrations et textes.
Les quatre motifs sont centres optiquement dans l'email natif de 96 x 95.
Rayon alpha integral <= 39 px ; erreur de centrage <= 0,75 px.
Les anciens composants restent dans originals/assets/ et le lot initial.
Le registre courant change pour cette revision explicite, pas le verrou
historique ni le manifeste des composants proteges.

## Preuves

[Planche de controle](race-check.png), [controles natifs](native-checks.json),
[provenance](provenance.json), [entrees figees](before.json).

Les huit cartes sont recomposees depuis leurs composants natifs, puis
comparees aux originaux : seuls le medaillon de race ou l'illustration et
les deux textes de Vivi changent. Zero pixel hors des zones autorisees.
Cadre fixe, code-barres, champs editables et reouverture PSD controles.
Aucune regle, valeur, position, identite ou synergie n'est modifiee.

Outil de generation : image_gen integre. Les six sorties originales sont
copiees dans le projet ; les PNG produits par le generateur restent intacts.
Les montages de controle sont des apercus derives uniquement.
