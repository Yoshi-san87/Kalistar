# Kalistar x FF7 - Set 01

Set prive non officiel : Cloud conserve et neuf nouveaux personnages.
Le cadre V4, les typographies natives et les composants calibres sont reutilises,
sans regeneration du cadre. Chaque carte conserve un PSD editable.

| Carte | Positions | Cristal | Arme |
| --- | --- | --- | --- |
| Cloud | 2 | Electro | Epee longue |
| Barret | 1 | Terre | Gun |
| Tifa | 2 | Eau | Poing |
| Aeris | 3, 4, 5 | Lumiere | Baton |
| Red XIII | 2, 3, 5 | Feu | Poing |
| Cait Sith | 1, 4 | Glace | Instrument |
| Cid | 2, 3 | Air | Lance |
| Vincent | 3, 4 | Sang | Gun |
| Yuffie | 2, 4 | Plantes | Projectile |
| Sephiroth | 1, 5 | Tenebres | Epee longue |

Les races sont les categories visuelles existantes de Kalistar : HUMAIN pour
les personnages humains, FELINEUS pour Red XIII et ROBOT pour Cait Sith.
Cela ne redefinit pas le lore FF7 : Aeris conserve son identite Cetra.
Red XIII et Cait Sith gardent leur anatomie reconnaissable, exception explicite
aux hybrides humanoides habituels de Kalistar.

## Illustration et sources

`set.json` conserve les scenes, descriptions, profils et prompts exacts :
`stylePrompt` + `\n\nCHARACTER SCENE: ` + `scene` pour les personnages,
`arenas[].prompt` pour les lieux. `provenance.json` trace les onze generations
avec l'outil image_gen integre, les references et les destinations locales.
L'illustration d'Aeris est conservee telle que validee pendant cette production.
L'illustration active de Barret reprend la pose et l'expression du tout premier
Barret, avec le decor du reacteur Mako. Profil et cadre inchanges. Les prompts,
originaux et preuves sont dans
`../../revisions/2026-09-20-barret-original-mako/README.md` ; cette revision prime
sur la scene initiale de `set.json`. Les propositions avec Marlene puis en tir
restent conservees dans les revisions precedentes.

`illustrations/` contient les neuf peintures. `cards/<personnage>/` contient
les profils, PNG et PSD de production. `set-preview.png` montre le set complet.
Le nouvel embleme Projectile reprend l'icone blanche V3 et l'email natif V4,
sans toucher aux banques protegees ni au cadre. Son contour est controle.

## Jeu et publication

Faction FF7 commune : bonus ATK normal de 0/10/20/30/40 pour 1/2/3/4/5 allies
FF7 vivants sur le plateau. Aucun bonus special cumulatif ajoute au moteur.
Couverture du deck : P1=3, P2=5, P3=4, P4=4, P5=3.
Les soutiens utilisent les effets et restrictions existants : Aeris attribue
le Reraise ; Barret, Cait Sith et Sephiroth peuvent attribuer la garde.
Les chiffres constituent une premiere calibration, pas une garantie d'equilibre
competitif sans playtests humains.

Deux arenes : Midgar (Electro), Cosmo Canyon (Terre), avec les bonus habituels
et des affinites limitees aux personnages declares. Les images sont dans
`../../site/assets/arenes/`, les definitions dans
`../../donnees/arenes-collaborations.json`. Aucun fichier V3 n'est modifie.

`build.cjs prepare`, `render`, puis `verify` composent et controlent les sources.
`verification.json` exige des textes natifs centres, objets incorpores, cadre
identique, PSD reouvert identique et codes-barres lisibles. Les sources approuvees
et leur verrou restent inchanges. La preparation refuse d'ecraser un ID publie.

`publish.cjs` effectue seulement un preflight par defaut. `--publish` ajoute les
creations verifiees de facon transactionnelle ; Cloud deja publie est reutilise
sans modifier son image, son profil ou ses proprietes. `publication/` conserve
la sauvegarde de l'index. Les copies jouables sont dans `../../creations/<id>/`.
Le jeu propose le preset **FF7 - Les voix de la planete** quand les dix cartes
sont presentes. Actualiser la page permet la mise a jour additive des possessions.

## Verification finale du 20 septembre 2026

- Publication effective : neuf ajouts, Cloud reutilise, catalogue total de 37.
- Dix PSD controles et reouverts sans difference avec leur PNG ; codes-barres
  controles en couleur et niveaux de gris. Impression physique non testee.
- Cadre, banques verrouillees et 27 references approuvees inchanges.
- 29 tests catalogue, arenes et transaction de publication passes.
- `browser.test.cjs` : chargement du preset, collection Aeris, lancement des
  deux arenes, vues 1600 x 1000 et 390 x 844, aucune ressource en erreur.
- Douze parties moteur completes, dont FF7 contre FF7 et FF7 contre le deck
  Kalistar standard ; invariants controles apres chaque action.
- Relancer la publication ne cree pas de doublons : dix cartes reutilisees.

Les captures et le rapport sont dans `verification/`. Les tests navigateur
utilisent un contexte isole : aucune sauvegarde utilisateur n'est remplacee.
Cette validation technique ne remplace pas des essais humains d'equilibrage.
