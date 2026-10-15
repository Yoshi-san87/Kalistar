# Metal Gear et les mines - 27 septembre 2026

Lot de 13 nouvelles cartes. Travail limite a ce dossier ; `art-flags/` appartient
au parent. Aucune publication, aucun rendu Photoshop ni gel des dependances
avant son GO explicite. Les revisions Auron/Kaylis/Lanio et des icones sont
effectuees dans d'autres dossiers par leurs responsables.

## Profils proposes

| Cle | ID | Role principal | Positions | Cristal | Arme | Race | Faction |
| --- | --- | --- | --- | --- | --- | --- | --- |
| solid-snake-mgs1 | 45297565 | 3 | 1,2,3 | CRYO | Gun | HUMAIN | MGS1 |
| solid-snake-mgs2 | 48683979 | 2 | 1,2,3 | HYDRO | Gun | HUMAIN | MGS2 |
| solid-snake-mgs4 | 46676157 | 1 | 1,2,3 | GEO | Gun | HUMAIN | MGS4 |
| revolver-ocelot | 48312725 | 2 | 2 | ELECTRO | Gun | HUMAIN | MGS1 |
| sniper-wolf | 47200643 | 4 | 4,5 | CRYO | Gun | HUMAIN | MGS1 |
| vulcan-raven | 40651224 | 1 | 1 | CRYO | Gun | HUMAIN | MGS1 |
| ninja | 47702575 | 2 | 2,3,4 | ELECTRO | Katana | CYBORG | MGS1 |
| meryl | 45960834 | 2 | 2 | PYRO | Gun | HUMAIN | MGS1 |
| liquid-snake | 41396996 | 3 | 1,3 | MINERO | Poing | HUMAIN | MGS1 |
| psycho-mantis | 44001617 | 4 | 4 | NECRO | Orbe | HUMAIN | MGS1 |
| malaba-mine | 47884687 | 1 | 1 | NONE | Hache | HUMAIN | Z13 |
| voloden-mine | 43905149 | 4 | 3,4 | NECRO | Faucille | CARDEMORTIS | Z13 |
| momo-silence | 40243854 | 5 | 5 | ELECTRO | Instrument | ROBOT | Chroma |

Valeurs et effets dans `set.json`. Toutes les limites sont celles du role
principal, sans cumul. Les trois Snake partagent `solid-snake-mgs`. Les variantes
Kalistar partagent respectivement `malaba`, `voloden`, `momo` avec leurs cartes
existantes. Ninja a exactement une esquive DEF, au D3. Momo P5 donne un coeur,
une potion et un trefle. Malaba NONE n'a aucune magie ni barriere.

Le catalogue actif observe contient 100 cartes. Le lot en ajoute 13 sans arene.
Dix cartes MGS ne font que huit personnages : aucun preset tout-MGS n'est ajoute.
Un deck QA mixte (Snake MGS1, sept autres MGS1, Voloden et Momo) est valide par
le vrai moteur avec couverture 2 de chaque position. Les bonus de faction
MGS1/MGS2/MGS4 restent separes, seulement sur les allies vivants deployes.

## Sources et recit

- Illustrations exactes fournies par l'utilisateur sous `V4/Illustrations/`.
  Aucun fichier source modifie. `cards/*/illustration.png` doit rester identique
  octet pour octet ; seul le cadrage de la fenetre native est derive.
- Pas de Naked Snake, ni nouvelle arene.
- Momo : references actives 30000001 et 30000014 ; robot sensible de Chroma,
  Instrument/ELECTRO. Troisieme version triste devant les robots abandonnes.
- Malaba : reference 30000022 ; `V3/sources/DECISIONS_NARRATIVES.md`, section
  Malaba/Baba, confirme l'identite humaine bienveillante, alias Baba, sans cristal.
  La scene de travail est celle demandee par l'utilisateur ; le texte est une
  nouvelle vignette, pas une citation litterale d'une action du manuscrit.
- Voloden : reference 30000028 ; `V3/sources/histoire.txt`, chapitre 5,
  lignes 1-16 : vitre sur la mine, fragment Electro introuvable, souvenir evoque
  par les tatouages de Kaylis, puis coupure de courant. Texte reformule, aucune
  nouvelle consequence historique inventee. Race/faction/cristal conserves.
- Identites MGS verifiees dans les manuels officiels Konami :
  https://metalgear.konami.net/manual/mc1/mgs1/pc/en/page18.html et
  https://metalgear.konami.net/manual/mc1/mgs2/pc/en/page24.html.
  Les descriptions sont des vignettes originales inspirees des scenes fournies,
  pas des citations. Cristaux, arme Orbe de Mantis et statistiques sont des
  adaptations de jeu Kalistar, pas des attributs canoniques Metal Gear.

## Pipeline isole

La structure reutilise le protocole FF10 mais remplace ses constantes de faction,
ses presets, ses chemins d'illustration et ses attentes d'arenes. Les helpers de
typographie et de verification native sont importes en lecture seule. Les copies
locales de publication gardent staging, verification, commit atomique et reprise
idempotente. Les tests utilisent une arborescence en memoire, jamais le catalogue
actif pour leur publication.

Avant GO, commandes sans Photoshop ni publication :

```text
node build.cjs check
node --test --test-isolation=none pipeline.test.cjs
node build.cjs draft
node preview-contact.cjs
```

`draft` n'est PAS un rendu approuve : les apercus restent re-generables apres les
icones definitives. `draft-review.json` et chaque `art-preparation.json` indiquent
les dimensions, l'empreinte originale, le rectangle extrait et la presence
eventuelle d'un drapeau provisoire. Les proportions ne sont jamais deformees.

Apres GO parent ET fin des revisions des anciennes cartes :

```text
node freeze.cjs --after-parent-go
node build.cjs prepare
node build.cjs render
node build.cjs verify
node preview-contact.cjs --native
node publish.cjs
node publish.cjs --publish
```

Le gel est cree une fois, jamais rafraichi pour masquer une derive. Il conserve
chaque fichier et chaque entree des creations precedentes. Toute modification
des icones ou des revisions anciennes APRES ce gel doit provoquer un blocage.
Le rendu exige Photoshop 2025 26.11.7 et le mutex Kalistar ; il n'ouvre pas une
nouvelle instance et conserve les documents utilisateur. Les PSD ont textes
editables et composants dynamiques incorpores. Verification : dimensions,
typo native, cadre fixe, roundtrip PSD/PNG, lectures du code-barres, NONE eteint.

Les seules commandes qui ecrivent dans `V4/creations/` et le catalogue actif
sont `publish.cjs --publish`, reservee au GO parent apres controle final.
Le site, ses assets de faction, l'installation publique, Git et le deploiement
restent a la charge du parent.
