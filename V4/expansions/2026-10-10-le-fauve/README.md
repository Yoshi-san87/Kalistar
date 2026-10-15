# Le Fauve - X-Men

Carte additive 49901901, identite stable `le-fauve-xmen`, race FELINEUS et
faction XMEN demandees le 10 octobre 2026. Illustration fournie :
`C:/Users/guill/Downloads/Le Fauve.png`, conservee byte pour byte sous
`art/le-fauve.png`. Aucune generation ni retouche de l'illustration.

## Profil
- Titre : LA FORCE DE COMPRENDRE ; metier : CHERCHEUR.
- Kalistel Lumiere (LUXO), arme Poing ; Middle P3, compatible P1/P3/P5.
- ATK D6-D1 : 229, trefle, 157, 113 magique, 71, 31.
- DEF D6-D1 : 238, 194, 151 avec barriere, 109, esquive, 37.
- La face ATK D5 abandonne une valeur forte pour aider un allie.
- Defense reguliere et esquive ponctuelle, sans Mort ni Reraise.
- Lumiere est une adaptation Kalistar de sa curiosite et de sa protection,
  pas l'affirmation d'un nouveau pouvoir canonique du personnage.
- Aucun changement du moteur, des arenes, equipements ou presets.
- Creation de fan non officielle.

## Production et controles
Le cadre 897 x 1497, les textes natifs, les objets dynamiques et les
composants restent ceux de Kalistar. Le fanion XMEN valide est reutilise,
sans regeneration ni modification. Le medaillon FELINEUS est celui du jeu.
Le cadrage est proportionnel vers la fenetre 737 x 921, ancre en haut pour
preserver le cristal, les lunettes et le visage.

`before.json` fige les entrees avant Photoshop. Ne jamais le renouveler
pour masquer une modification. `cards/le-fauve/verification.json` conserve
les comparaisons de cadre, la reouverture PSD et la lecture du code-barres.

`integration.test.cjs` controle identite, bornes, publication additive,
six faces ATK et DEF, trefle allie et attribution de son donneur, esquive,
barriere et douze matchs complets ABBA avec sauvegardes/reprises.
`browser.test.cjs` controle PC, Razr 50, 320 px, classeur, duel et migration
d'un backup sans cette nouvelle carte. Ces tests valident les regles et
l'integration, pas un taux de victoire garanti.

Commandes depuis la racine :
```text
node V4/expansions/2026-10-10-le-fauve/build.cjs prepare
KALISTAR_FAUVE_PS=2026-10-10 node V4/expansions/2026-10-10-le-fauve/build.cjs render
node V4/expansions/2026-10-10-le-fauve/build.cjs verify
KALISTAR_FAUVE_PUBLISH=2026-10-10 node V4/expansions/2026-10-10-le-fauve/build.cjs publish
node --test V4/expansions/2026-10-10-le-fauve/integration.test.cjs
```
Adapter les variables a PowerShell. Un rendu Photoshop a la fois.
Publication Git/Pages : voir le rapport de release, pas les fichiers locaux seuls.
