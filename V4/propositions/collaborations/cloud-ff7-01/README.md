# Cloud - Essai de collaboration Kalistar V4

## Publication locale du 20 septembre 2026

À la demande explicite de l'utilisateur, la carte est maintenant ajoutée au
site V4 comme publication locale additive. Elle reste une collaboration privée
non canonique et ne rejoint pas le verrou des références approuvées.

- Sorties publiées : `V4/creations/47208326/`.
- Entrée persistante : `V4/donnees/catalogue.json`, `kind: created`.
- Fanion d'interface : `V4/site/assets/factions/FF7.png`.
- Le PNG et le PSD publiés sont ceux corrigés par la révision commune
  `2026-09-20-weapon-rim`.
- Les sources et preuves de cet essai restent conservées dans ce dossier.

Le petit trait blanc du medaillon d'arme a ete retire avec la revision commune
`2026-09-20-weapon-rim`. Son controle courant est
`weapon-rim-verification.json`; `verification.json` conserve la preuve initiale
de creation. Le statut prive, le profil FF7 et l'illustration restent inchanges.

Demande utilisateur du 20 septembre 2026 : carte de Cloud (Final Fantasy VII),
cristal au choix, epee, position 2. La DA Kalistar reste obligatoire.

- Interpretation proposee : ELECTRO, HUMAIN, Epee longue, P2.
- Faction distincte FF7, demandee par l'utilisateur, avec son propre fanion.
- Essai prive non canonique ; aucune collaboration officielle n'est revendiquee.
- Cadre V4 existant, jamais regenere avec l'illustration.
- Illustration generee avec l'outil image_gen integre, references Momo/Valazar.
- Prompts exacts : [illustration](illustration.prompt.txt) et [fanion](flag.prompt.txt).
- Aucune publication dans le catalogue ni modification d'une carte approuvee.

Le cristal est une adaptation ludique Kalistar, pas une affirmation sur les
pouvoirs canoniques de Cloud dans Final Fantasy VII. Les valeurs sont une
proposition P2, pas un equilibrage prouve par des parties.

## Livraison

- [Carte PNG](CLOUD_FF7_V4_01.png), 897 x 1497 pixels, 300 ppp.
- [PSD editable](CLOUD_FF7_V4_01.psd), textes natifs et 17 objets dynamiques.
- [Illustration originale](illustration.png), DA Momo/Valazar, generation integree.
- [Drapeau FF7 source](flag-source.png), generation integree depuis le fanion Chroma.
- [Profil](profile.json), identifiant d'essai `47208326`, hors catalogue.
- [Faction et tests](faction.json), [controle natif](verification.json),
  [repetition](repeat-verification.json), [lecture en petit](small-preview.png).

## Faction et synergies

`faction: FF7` utilise le calcul existant, sans changer le moteur : pour 1, 2,
3, 4 ou 5 membres FF7 vivants sur le plateau, bonus de faction ATK respectif
0, +10, +20, +30, +40. Reserve et autres factions exclues. Race HUMAIN et cristal
ELECTRO restent independants. Aucun nouveau bonus de collaboration ne se cumule
par-dessus la faction.

Le constructeur du catalogue accepte le profil dans une simulation en memoire.
Le calcul de groupe est teste avec des fixtures, pas cinq exemplaires jouables
de Cloud : la carte est P2 uniquement et le plafond reste deux copies par version.
Ce test ne publie rien et n'ajoute pas FF7 au selecteur de l'Atelier courant.
Une integration jouable demandera une publication explicite, le raccordement
des assets de faction et une verification d'interface.

## Controle et methode

Le cadre, les ronds, les chiffres, l'arme et la race proviennent des composants
V4 approuves ; aucune regeneration de la carte complete. Le nouveau fanion est
ajuste au masque natif, avec decoupe alpha et import 1:1 avant conversion en objet
dynamique. Sa transparence ne provoque plus de redimensionnement implicite.

- Zero pixel different dans le cadre fixe.
- Composants natifs : ecart maximal d'un niveau par canal, aucun pixel au-dela
  de la tolerance de deux niveaux de l'Atelier existant.
- PSD reouvert identique au PNG : zero pixel different.
- Deux compositions successives : zero pixel different ; les dates XMP changent,
  donc les empreintes binaires PNG ne doivent pas servir de test de repetabilite.
- Quatre lectures du code-barres reussies ; impression physique non testee.
- 190 sources protegees et 420 composants existants verifies, catalogue et
  verrou inchanges. Aucune propriete de collection attribuee.
- Revue visuelle du rendu complet et a 320 pixels de largeur effectuee.

`build.cjs` prepare uniquement les fichiers de cet essai. `--native` compose
avec `compose.jsx` via le pont local Photoshop. `--native --repeat` compare
les pixels a la composition precedente. Aucun de ces modes ne publie la carte.
Les scripts du jeu et les scripts natifs proteges ne sont pas modifies.

Un ancien verrou de rendu, dont le PID etait termine et le travail absent, a ete
archive dans `previous-stale-render.lock.json` avant la composition. Les nouveaux
rendus utilisent le verrou partage et le mutex Photoshop, sans travaux paralleles.
