# Kalistar x Tortues Ninja

Fan crossover non officiel. Dix illustrations originales de cette production,
composees dans le template natif 897 x 1497, sans modifier le moteur ni les
references historiques. [Galerie](index.html) | [Organisation](../../../docs/INDEX.md).

## Selection artistique

La demande valide les dix personnages apres retouches : April dans une nouvelle
situation, Michelangelo regenere et Shredder entierement recompose dans un dojo.
Les griffes sont solidaires des gantelets, les poignets restent droits. Les
anciennes propositions sont conservees, mais jamais publiees comme cartes.
Prompts et sources : [revision artistique](../../propositions/2026-10-15-tortues-ninja/revision-02.json).
Les images proviennent de l'outil integre image_gen, sans retouche generative du cadre.

## Profils

Les valeurs exactes D6 vers D1 et les raisons de chaque choix sont dans
[set.json](set.json). Tous les personnages ont un Kalistel, comme les autres
collaborations. Aucun pouvoir specifique de race n'est ajoute.

| Personnage | Position principale | Kalistel | Race | Intention |
| --- | --- | --- | --- | --- |
| Leonardo | P3 | Eau | Tortuga | Meneur equilibre, puissance et relance |
| Raphael | P2 | Feu | Tortuga | Pression physique, DEF fragile |
| Donatello | P4 | Electro | Tortuga | Technique, potion, attaques magiques |
| Michelangelo | P3 | Vent | Tortuga | Mobilite, esquive et chance |
| Shredder | P2 | Tenebres | Humain | Mort D3, relance DEF, sans esquive |
| Krang | P4 | Electro | Cyborg | Puissance mecanique magique, potion |
| Bebop | P2 | Terre | Facoche | Force brute, aucune esquive |
| Rocksteady | P1 | Roche | Rhinoz | Garde et six DEF numeriques |
| April O'Neil | P5 | Lumiere | Humain | Information, chance et protection |
| Maitre Splinter | P5 | Plante | Ratz | Reraise preventif et puissance |

Sai = Dague ; nunchaku = Fleau ; gantelets de Shredder = Poing ; materiel de
communication d'April = Instrument. Krang est classe Cyborg pour l'ensemble
pilote organique/corps mecanique. Ce sont des adaptations de gameplay Kalistar,
pas des affirmations sur le canon TMNT.

Facoche est la nouvelle race demandee pour Bebop. Aucune race tortue n'etait
presente dans le catalogue : Tortuga est le nom de travail retenu pour les quatre
freres en l'absence de choix different. Rhinoz et Ratz sont reutilises.
Les medaillons sont calibres optiquement dans le rond natif, sans deplacement.
La banniere TMNT porte une carapace, deux katanas et quatre rubans colores.

## Production et verification

`assets.cjs prepare/install` cree les composants une seule fois. `build.cjs
prepare` fige les profils, illustrations, composants et sources. Le rendu passe
par Photoshop 26.11.8 sous mutex ; les fichiers PSD restent editables, les
imports sont des objets dynamiques. `verify` controle cadre fixe, reouverture,
code-barres, typographie et texte sur quatre lignes maximum.

`integration.test.cjs` teste les 120 faces, effets de soutien, journaux,
barrieres uniquement magiques, positions et dix parties ABBA completes avec
reprise de sauvegarde. `native.test.cjs` controle les fichiers et le centrage.
`publication.test.cjs` controle le catalogue et le build. Le test navigateur
`game.browser.test.cjs` utilise un profil jetable pour desktop, Razr 50,
320 px, lecteur de cartes, duel et migration d'ancienne sauvegarde.

Les nouveaux identifiants vont de 49902901 a 49902910. La publication est
additive via publication-core ; aucun preset, equipement ni arene n'est ajoute.
Les sources graphiques restent sur le PC et dans la sauvegarde privee ; Git
conserve le texte, les profils et leurs empreintes, selon le guide deploiement.
