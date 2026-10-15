# Kalistar 4.6.14 - Castlevania

Publication personnelle additive vers Yoshi-san87/Kalistar, apres la release
4.6.13 de l'indice/MVP. Coordination terminee : son commit
`b1302a7dc82058edd5a0ca2381e0bfb0d4e75ef3` est publie et verifie sur Pages.

## Contenu

- 9 cartes pour 8 personnages : Trevor Belmont, Alucard, Simon Belmont,
  Carmilla, Isaac, Hector, Sypha et deux Dracula.
- Dracula Feu garde l'illustration approuvee ; Dracula Sang recoit une nouvelle
  scene d'assaut, plus agressive. Identite partagee, profils distincts.
- Nouvelle faction CASTLEVANIA, fanion natif bordeaux/argent et filtre de collection.
- Catalogue : 342 cartes, sans nouvelle arene, preset ou schema de sauvegarde.
- Toutes les anciennes entrees du catalogue sont preservees.
- Aucun code de combat ni de calcul d'indice ne fait partie de cette release.
- Les travaux concurrents non publies restent hors du commit.

Production, regles et source des images :
[Castlevania](../../expansions/2026-10-10-castlevania/README.md).

## Verification

La copie isolee de preparation, basee sur la version 4.6.12, a passe
649 tests repartis en 59 commandes de validation Pages, puis :
- 27 fiches sur 1440, 412 et 320 px ;
- duel reel Dracula Feu contre Sang, puis reprise apres rechargement ;
- migration d'un ancien backup : les neuf cartes sont ajoutees ;
- parcours general collection, lecteur, telechargement PNG, decks et arene ;
- aucune erreur de page ou de ressource dans les navigateurs de controle.

Les neuf PSD natifs ont un cadre fixe sans difference, une reouverture
pixel-identique et un code-barres valide. Les huit illustrations approuvees
sont conservees byte pour byte. Les images sont controlees visuellement en
grand, en planches de 300 px et dans le site sur ordinateur et smartphone.

La validation definitive sur l'index isole apres 4.6.13 a passe **674 tests
en 60 commandes**. `qa/publication.json` identifie le parent exact, l'arbre
teste `e77e98bbb82f73dc1bb9513c3eac8c7ebfbacb2e` et chaque commande.
Le build contient 342 cartes et 1 168 fichiers (807,9 Mio).

`qa/castlevania-browser/` conserve les captures definitives et les controles :
27 fiches, six changements Feu/Sang depuis une seule entree Dracula, duel,
rechargement et migration de 333 vers 342 cartes. Les largeurs 1440, 412
et 320 px passent sans erreur de page ni ressource manquante.
Les parcours generaux du build sont conserves sous `qa/pages-browser/`.
Les ajouts ulterieurs a l'arbre teste sont seulement ces preuves et ce rapport.

Le test de publication Street Fighter accepte des collections ulterieures :
il conserve sa verification stricte de toutes les anciennes entrees et des
18 cartes Street Fighter. Aucun ancien rapport, verrou de reference ou
manifeste gele n'est modifie.

## Publication

`stage.cjs` impose le remote personnel, main, la version precedente et un index
vide. Le workflow part de HEAD et ajoute seulement les preuves et tests
Castlevania. Les six fichiers de version partent aussi de HEAD, afin de ne pas
embarquer une modification locale concurrente.

`verify-index.cjs` extrait exactement l'index dans un dossier temporaire,
hydrate les seuls objets LFS requis, lance la suite Pages et construit le site.
Le tag annote `v4.6.14` doit viser le commit de release ; branche et tag sont
pousses ensemble, sans force. La reussite du workflow et le contenu public
sont verifies avant toute annonce de mise en ligne.

`public-smoke.cjs` compare la version publique, le catalogue complet et
les 14 assets principaux au build verifie, y compris les neuf cartes.
Les preuves publiques sont conservees hors du depot apres le push pour ne
pas creer un second commit avec la meme version.
