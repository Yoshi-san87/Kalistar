# Gotham - huit cartes natives Kalistar

Date : 2026-10-09. Illustrations choisies par l'utilisateur dans
`V4/propositions/2026-10-09-batman-gallery/`.

Collection : Batman. Faction imprimee et technique : Gotham. Il s'agit d'une
adaptation personnelle, pas d'une collaboration officielle.

## Direction et choix utilisateur

- Les huit illustrations approuvees sont conservees byte pour byte.
- Poison Ivy utilise TOXINAR ; Catwoman utilise FELINEUS.
- Les six autres personnages utilisent HUMAIN.
- Le symbole Batman initialement demande pour la banniere a ete refuse par
  le generateur. L'utilisateur a choisi une banniere originale Gotham noire
  et or avec une tour gothique. La demande et le resultat sont conserves
  dans `asset-provenance.json` et `components/source-Gotham.png`.
- Le fanion reprend le contour natif valide et l'ancrage 672/829/98/223.
  Aucune modification du template protege, du verrou ou des anciennes cartes.

## Profils et intentions

Les tableaux du profil sont ordonnes D6 vers D1. Les valeurs restent dans
les intervalles du role principal. Les positions secondaires ne changent
pas silencieusement ces limites.

| ID | Personnage | Role / positions | Identite de jeu |
| --- | --- | --- | --- |
| 49901501 | Double-Face | P3 / 2,3 | NONE. Mort ATK2, Retry ATK1 et DEF3 : risque, piece et second choix. |
| 49901502 | Poison Ivy | P5 / 3,5 | HERBO, TOXINAR. Mana ATK4 et Reraise ATK2, deux faces magiques et deux barrieres. |
| 49901503 | Le Sphinx | P5 / 3,5 | NONE. Retry ATK3 / DEF2, soutien physique ATK2 : preparation et manipulation. |
| 49901504 | L'Epouvantail | P4 / 3,4 | NECRO. Magie ATK5/3, Mort ATK1, DEF fragile : peur et menace. |
| 49901505 | Mr Freeze | P1 / 1,4 | CRYO. DEF elevee, barrieres DEF6/4, trois attaques magiques, aucune face de soutien. |
| 49901506 | Catwoman | P2 / 2,3 | NONE, FELINEUS. Esquive DEF4, Retry ATK2 / DEF1 : mobilite et opportunisme. |
| 49901507 | Ra's al Ghul | P5 / 2,5 | HYDRO. Reraise ATK3, soutien physique ATK1, barriere DEF6 : mentor et renouveau. |
| 49901508 | Le Pingouin | P3 / 1,3 | NONE. Soutien physique ATK2 et Retry DEF2 : influence et prevision, pas de magie. |

Ces effets utilisent exclusivement les mecaniques existantes du moteur.
Mort n'est pas un nouvel effet garanti ; son comportement reste celui du jeu.
Reraise est limite aux roles principaux P5. NONE reste sans magie, barriere
ou sentinelle. Les matrices armes, races et cristaux ne changent pas.
Le deck de dix cartes utilise dans les tests est une fixture, pas un nouveau
deck de demonstration installe chez le joueur.

## Production et preuves

- PSD editables et PNG : 897 x 1497, 300 ppp, Photoshop 26.11.8.
- Textes natifs et composants en objets dynamiques incorpores.
- `before.json` conserve les empreintes d'entree et le catalogue precedent.
- `native-checks.json` : huit codes-barres lus, zero pixel fixe modifie,
  zero difference entre le PNG livre et le PSD rouvert.
- Chaque `cards/<cle>/verification.json` lie les preuves aux empreintes
  exactes du profil, du PSD et du PNG.
- `published.json` et `publication/` conservent la transaction locale.
- `integration.test.cjs` teste 48 faces ATK, 48 faces DEF, les restrictions,
  les races, les restaurations et 32 parties ABBA completes.
- `browser.test.cjs` controle les huit fiches a 1440, 412 et 320 px,
  un duel desktop/mobile, les images et une reprise apres reload.
- `persistence.test.cjs` reutilise les scenarios IndexedDB de V4 avec le
  catalogue reel de 296 cartes precedent le lot. Les 56 scenarios passes
  couvrent anciens backups, exemplaires, transferts, conflits, falsifications,
  matchs, compteurs et connexions obsoletes pour les huit ajouts.
- `.github/workflows/pages.yml` execute les six tests d'integration Gotham
  et hydrate les seuls PNG LFS necessaires a leur preuve d'identite.

Validation locale : 29 tests d'integration/collection/build passent ; les
24 fiches responsive et les deux vues arene passent sans erreur JS, image
manquante ou debordement horizontal. Les captures sont dans `browser-proof/`.
Une suite de regression elargie donne 46 succes sur 47 : seul le scenario
historique `catalogue-evolution.test.cjs:19` echoue, car il attend toujours que
Voloden soit l'unique ajout depuis son registre de septembre. `buildCatalog()`
sans cartes publiees retourne deja douze ajouts approuves ; aucun des huit IDs
Gotham n'est implique dans cette assertion. Le test et son ancien rapport
restent inchanges. Les memes scenarios de persistence sont executes avec
des fixtures actualisees, isolees et propres a ce lot dans le test ci-dessus.

La premiere verification a detecte les apostrophes automatiques de Photoshop
dans L'EPOUVANTAIL et RA'S AL GHUL. `repair-quotes.cjs` conserve les exports
anterieurs dans `repairs/straight-apostrophes/` et recompose seulement ces deux
cartes avec Smart Quotes temporairement desactive. La preference est restauree.
Les profils geles, les references et le controle strict des noms restent
inchanges. Voir la [reference Adobe des preferences de texte](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/classes/preferences/preferencestype).

## Verification reproductible

Depuis la racine du checkout actif :

```powershell
node V4/expansions/2026-10-09-gotham/build.cjs verify
node --test V4/expansions/2026-10-09-gotham/integration.test.cjs
node V4/expansions/2026-10-09-gotham/persistence.test.cjs
node V4/deploy/build.cjs
node V4/expansions/2026-10-09-gotham/browser.test.cjs
```

Ne pas relancer `prepare` sur ce lot gele. Les huit cartes de production
publiees sont dans `V4/creations/49901501` a `49901508`.

Les tests verifient la conformite aux regles et le fonctionnement des effets,
pas un taux de victoire cible ni un equilibrage statistique definitif.
