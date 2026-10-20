# Octopath Traveler I & II

Seize voyageurs adaptes a Kalistar, illustrations approuvees puis corrigees
sur demande de l'auteur. Collaboration de fan non officielle. Aucun nouvel
effet moteur, equipement, peuple, arene ou deck impose.

[Galerie native](index.html) | [Profils](set.json) |
[Documentation du projet](../../../docs/INDEX.md)

## Identites Et Jeu

Les identifiants modeles vont de `49903301` a `49903316`. Chaque personnage
possede une identite stable `<cle>-octopath-traveler`. Faction et collaboration :
`OCTOPATH`. Les huit premiers viennent du premier jeu, les huit autres du second.
Ochette utilise FELINEUS ; les quinze autres utilisent HUMAIN. Tous ont un Kalistel.

| Personnage | Kalistel | Arme | Role | Positions |
| --- | --- | --- | --- | --- |
| Ophilia | Luxo | Sceptre | P5 | P4, P5 |
| Cyrus | Cryo | Tome | P4 | P3, P4 |
| Tressa | Aero | Lance | P3 | P3, P5 |
| Olberic | Minero | Epee longue | P1 | P1, P2 |
| Primrose | Necro | Dague | P5 | P3, P5 |
| Alfyn | Cryo | Hache | P5 | P3, P5 |
| Therion | Pyro | Dague | P2 | P2, P3 |
| H'aanit | Electro | Arc | P4 | P2, P4 |
| Hikari | Luxo | Katana | P2 | P1, P2 |
| Agnea | Aero | Dague | P5 | P3, P5 |
| Partitio | Pyro | Lance | P3 | P1, P3, P5 |
| Osvald | Pyro | Tome | P4 | P4 |
| Throne | Necro | Dague | P2 | P2, P3 |
| Temenos | Luxo | Sceptre | P5 | P4, P5 |
| Ochette | Electro | Arc | P2 | P2, P4 |
| Castti | Herbo | Hache | P5 | P1, P5 |

`set.json` conserve les accents, valeurs D6 vers D1 et justifications individuelles.
Les coeurs restent preventifs, sans resurrection du cimetiere. Garde uniquement
pour les roles P1/P5 ; magie et barrieres uniquement sur des faces numeriques.
Chaque profil a au moins trois valeurs numeriques de chaque cote. Les competences
des jeux d'origine ne sont pas ajoutees comme pouvoirs caches. Linde reste un
element narratif de l'illustration, pas une unite de combat supplementaire.

Les profils respectent les bornes actuelles et sont testes fonctionnellement.
Cela ne constitue pas une preuve d'equilibrage competitif a long terme.

## Illustrations Et Visages

Les sources et chaque revision sont conservees dans
`V4/propositions/2026-10-20-octopath-traveler/`. `revisions.json` garde prompts,
references, fichiers precedents et empreintes. Aucun original n'est ecrase.

- Hikari : katana raccourci puis rallonge moderement selon la derniere demande.
  Selection finale `09-hikari-05.png`, lame coherente et poignee alignee.
- H'aanit : arc refait, poignee centrale, branches et corde continues.
  Selection `08-haanit-03.png`.
- Tressa : lance courte et droite, arrimee au sac. `03-tressa-03.png`.
- Controle des seize visages, avec Olberic inspecte aussi en image entiere.
  Ophilia, Agnea, Temenos et Ochette ont recu une passe picturale supplementaire,
  pour des volumes et des yeux moins anime. Les autres visages sont conserves.
- Momo et Valazar servent de references de matiere et de peinture, sans reprise
  de leur visage ni de leur pose. La planche des visages reste en QA locale.

## Banniere Et Production Native

La banniere Octopath reprend les huit routes : compas dore, tissu bleu-vert,
typographie ivoire et silhouettes de voyageurs. La source est documentee dans
`asset-provenance.json`. Redimensionnement uniforme, sans etirement du compas ;
alpha natif 109 x 230 puis support 98 x 223. `components.json` conserve les preuves.

Le cadre 897 x 1497 et les composants approuves ne sont pas regeneres. Textes
natifs editables, illustration en objet dynamique, effets separes et icones
d'armes blanches actuelles sont prepares avant le gel `before.json`.
Ce gel et les anciens verrous ne doivent pas etre recalcules pour cacher un ecart.

Le premier appel Photoshop confine a echoue a joindre COM. Le meme pilote,
avec l'acces requis, a ensuite compose les cartes sans modification du rendu.
Le premier test navigateur attendait a tort les seize vignettes simultanement :
le classeur est pagine. Le controle parcourt maintenant les pages et verifie
les seize identifiants, sans modifier la pagination du jeu.

## Verification

```powershell
node --test V4/expansions/2026-10-21-octopath-traveler/integration.test.cjs V4/expansions/2026-10-21-octopath-traveler/native.test.cjs V4/expansions/2026-10-21-octopath-traveler/publication.test.cjs
node V4/expansions/2026-10-21-octopath-traveler/gallery.browser.test.cjs
node V4/expansions/2026-10-21-octopath-traveler/game.browser.test.cjs
```

Integration : 192 faces ATK/DEF, soutiens reels, journal, barrieres et seize
matchs ABBA complets avec sauvegarde/reprise. Natif : pixels fixes, rouverture
PSD, codes-barres, accents, descriptions et sources figees. Publication :
catalogue precedent intact et uniquement les medias approuves.

Les preuves navigateur vont dans `work/qa/octopath-traveler/`, avec profils
jetables : galerie, Collection, lecteurs, arene et reprise, PC/Razr/320 px.
Le rapport de livraison documente les controles effectivement termines et
la publication. Les sources binaires restent locales et sont sauvegardees
hors checkout avant mise en ligne ; Git ne contient pas les images ni PSD.
