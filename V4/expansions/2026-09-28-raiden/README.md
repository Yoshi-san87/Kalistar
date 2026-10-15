# Raiden MGS2 - Au-dela des simulations

Ajout demande le 28 septembre 2026 : Raiden humain, Gun, P4, dans Big Shell.
Modele `49382016`, identite `raiden-mgs`, faction `MGS2`.

## Illustration

Generation unique via l'outil imagegen integre. Prompt exact et sources dans
`prompt.json`. Source durable : `V4/Illustrations/Raiden_MGS2_Big_Shell.png`.
References picturales Momo et Valazar consultees : matieres peintes, emotion
retenue et lumiere motivee. La combinaison Skull Suit et le visage humain
correspondent a MGS2, pas au Raiden cyborg des episodes suivants.

References officielles de conception :
- https://www.konami.com/mg/archive/mgs2/english/chara/chara_raiden.html
- https://www.konami.com/mg/archive/mgs2/art/third.html

## Gameplay

Cristal ELECTRO choisi comme reinterpretation Kalistar. Aucune electricite
ajoutee artificiellement a la scene. P4 distance, Gun, HUMAIN.
Faces indiquees de D6 a D1 :
- ATK : 270 / 226 magique / 180 / 134 / 86 magique / 40.
- DEF : 156 / 128 / esquive / 72 / trefle / 20.

Les valeurs restent sous chaque plafond P4. Le double outil defensif est
compense par des valeurs numeriques moderees, sans barriere ni soutien.
Ces controles de legalite ne constituent pas une mesure de taux de victoire.
Affinite locale ajoutee a Big Shell : +10 ATK/DEF, comme les autres natifs.
Pas de nouvelle regle, de preset ni de race.

## Production

PSD natif : `V4/creations/49382016/card.psd`.
Textes editables, composants en objets dynamiques integres ; template non regenere.
Banniere MGS2 blanche/bleu ciel de la revision validee du 27 septembre.
Assemblage et controle partages existants, lus sans modification.

Commandes depuis la racine avec Node :
1. `node V4/expansions/2026-09-28-raiden/build.cjs freeze`
2. `node V4/expansions/2026-09-28-raiden/build.cjs prepare`
3. `node V4/expansions/2026-09-28-raiden/build.cjs render`
4. `node V4/expansions/2026-09-28-raiden/build.cjs verify`
5. `node V4/expansions/2026-09-28-raiden/build.cjs publish`

Le gel est anterieur a la publication ; ne jamais le remplacer a posteriori.
Preuves natives dans `cards/raiden/verification.json`, controle visuel final
et navigateur dans `qa/`. Les 38 references et 75 creations precedentes sont
preservees. Publication Git limitee au depot personnel Kalistar, sans ecraser
les travaux UI d'un autre chat.

## Verification du lot

- 38 tests cibles passent : profil, plafonds, catalogue, arenas, identites et export statique.
- PSD Photoshop 26.11.7 : reouverture sans difference, aucun pixel fixe altere,
  aucun ecart de composant superieur a 2 niveaux ; typographie native validee.
- Code-barres decode en couleur et gris, aux deux echelles. Impression physique non testee.
- Chrome isole : ordinateur 1440 x 1000 et mobile 390 x 844, sans erreur JavaScript,
  PNG natif servi avec SHA identique et ecart moyen de la vignette de 2.083 niveaux RGB.
- L'ancien test de gel du lot `metal-gear-arenas-01` contient le hash du catalogue
  avant Raiden : il echoue logiquement apres cet ajout. Ce rapport historique reste
  intact. La conservation des 113 anciennes cartes est controlee ici par le snapshot
  du lot courant ; les definitions d'arenes ne changent que pour l'affinite de Raiden.
