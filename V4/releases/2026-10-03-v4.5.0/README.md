# Kalistar 4.5.0 - Introduction des equipes

## Publication

Depot personnel : Yoshi-san87/Kalistar. Branche main, tag annote v4.5.0.
Version synchronisee dans le titre, le badge desktop, le badge telephone et
les assertions de release. Aucun changement de schema de sauvegarde.

## Contenu

- Presentation des titulaires des deux equipes, de P1 a P5, avant une nouvelle
  rencontre : arme native, cristal, faction, retournement, puis placement reel.
- Cartes, capitaines et equipements issus de la Composition effectivement
  engagee. Les indices conservent l'identite native du personnage.
- Intro skippable ; IA et interactions de combat suspendues pendant sa lecture.
- Pas de rejeu au retour dans l'arene ou a la reprise d'une sauvegarde.
- Adaptation desktop, telephone, paysage, resize et Reduced Motion.
- Moteur, statistiques, RNG, cartes natives et regles inchanges.

Details techniques : ../../docs/LINEUP_INTRO.md.

## Isolation

Le roman Story en chantier, les cartes d'armes collectionnables, les nouvelles
armes et la revision native Kaylis restent locaux. Les modifications partagees
dans index.html, boot.js et weapons.browser.test.cjs sont indexees partiellement.

Pour verifier le contenu indexe sans toucher aux brouillons :

```powershell
node V4/releases/2026-10-03-v4.5.0/prepare-snapshot.cjs
```

Le script exporte l'arbre Git dans un dossier temporaire distinct. Seuls les
medias du build et les quatre sources de verification du medaillon sont
hydrates ; chaque objet LFS est compare a son SHA-256 avant copie.
Passer un commit en argument permet de reproduire une release deja commitee.

## Validation

- 117 tests du workflow Pages reussis, ainsi que les controles scripts
  Kalistel et ambiances. Resultats detailles dans qa/workflow/.
- Build isole : 193 cartes, 513 fichiers, 474.5 Mo.
- Intro complete en navigateur : P1 a P5, indices natifs, capitaines, ancrages
  des cartes, quatre moments de skip, sortie/reprise, reload pendant l'intro,
  formats 320/360/390/412/430 et 844x390, resize, Reduced Motion.
  Etat du moteur compare avant/apres, aucune erreur navigateur.
- Parcours Pages complet : Collection, lecteur Story, export PNG, Decks,
  prematch, Arene, plein ecran explicite, sauvegarde/reprise, PC et telephone.
- Captures inspectees : desktop-p3.png et mobile-412-reveal.png dans qa/lineup/.
  Autres captures et mesures dans le meme dossier ; quelques captures du
  parcours general dans qa/pages/.
- La suite pure lineup-intro.test.cjs est ajoutee au workflow Pages.

Pour rejouer les tests et le build dans la copie isolee :

```powershell
node V4/releases/2026-10-03-v4.5.0/check-snapshot.cjs <dossier-isole>
```

Apres publication, reconstruire cette copie avec GITHUB_SHA egal au commit
publie et lancer public-check.cjs avec KALISTAR_RELEASE_DIST pointant sur
son V4/deploy/dist. Le controle compare le manifeste public complet, les
versions PC/telephone, les modules de l'intro et le catalogue.
