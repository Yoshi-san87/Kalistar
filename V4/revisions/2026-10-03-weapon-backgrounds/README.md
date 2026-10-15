# Decors des cartes d'armes

Demande : enrichir les cartes d'armes avec des decors narratifs discrets,
en conservant leurs objets, silhouettes et medaillons animes. Lot local,
sans commit, tag ni push. La version du jeu n'est pas modifiee dans ce lot.

## Traitement

23 cartes detourees recoivent un fond independant. Les scenes originales de
la Hache du Roi Dechu et de la Flute des Petits Bonheurs restent intactes.
Les sept fonds nouveaux sont generes avec **l'outil image_gen integre**,
Momo et Valazar etant fournis comme references picturales, jamais comme sujets.
Sept autres sont derives des lieux existants du jeu, preserves a l'identique.

| Decor | Cartes |
| --- | --- |
| Cour d'entrainement, pierre claire et linge blanc | Rapiere de Kaylis, sabre de Commandant |
| Rivage inspire de Besaid, eau turquoise et tissu indigo | Fraternite, Poupee Mog |
| Relais postal de Nestown, lettres et sacoche | Arc de Cana |
| Cour de forteresse montagneuse | Les deux epees de Geralt, lance de Gardien |
| Salle du trone abandonnee, faible energie violette | Faux de Voloden |
| Cabinet militaire silencieux | Masque de Psycho Mantis |
| Atelier mecanique de Z13 | Bras de Gen |
| Ruines de la cite (existant) | Les deux lames de 2B |
| Shadow Moses (existant) | SOCOM, PSG1, Single Action Army |
| Chroma (existant) | Fouet de Rikka |
| Durane (existant) | Gant de Balmhyr, lame de Soldat |
| Village de Nier (existant) | Grimoire Weiss, lame de Kaine |
| Balamb Garden (existant) | Revolver de Squall |
| Midgar (existant) | Buster Sword |

Ces lieux adaptes sont des interpretations picturales, pas des assets officiels.
Les affectations de Jobs sont des ambiances, pas de nouvelles restrictions.

## Integration

- Aucun changement des definitions, effets, conditions, du moteur ou des saves.
- Arme conservee entiere, non deformee, a la meme taille et au meme emplacement.
- Fond separe sous le detourage, coupe par la meme fenetre d'illustration.
- Contraste du fond reduit a 0,65 ; luminosite 0,7 par defaut, 0,95 pour les
  trois silhouettes noires. La couleur de l'arme n'est pas filtree.
- Pas de decor dans les medaillons, le deck ou les overlays de combat.
- Aucune animation, ni timer, ni listener supplementaire.
- Images decoratives masquees aux lecteurs d'ecran ; alt de l'arme conserve.

## Fichiers et provenance

- Sources nouvelles : `V4/weapon-cards/sources/backgrounds/*-v1.png`.
- [Prompts exacts et generations](../../weapon-cards/background-prompts-2026-10-03.json).
- [Correspondances des sources](../../weapon-cards/background-sources.json).
- Derives : `V4/site/assets/weapon-cards/backgrounds/*-v1.webp`.
- Hashes : `V4/weapon-cards/media-provenance.json`.
- Exports actualises : `V4/weapon-cards/exports/`, 25 PNG, 1400 x 1000 / 400 ppp.
- Renderer : `V4/site/weapon-cards.js` et `weapon-cards.css`.

L'arme et le decor ne sont jamais fusionnes dans leurs sources. Seul l'export
de la carte finale rassemble visuellement les couches. Les objets transparents
et le template fourni restent reutilisables independamment.

## Verification

- 36 tests passent : nouveaux fonds, geometrie des medaillons, regles des
  23 armes, snapshots et parties completes.
- 37 controles de cartes : six tailles d'ecran de 320 a 1920 px et les
  25 exports pleine taille, textes cadres et absence de debordement horizontal.
- 15 inspections supplementaires de Kaylis, Tidus, Cana, SOCOM et Voloden
  sur desktop, Razr 50 et petit telephone avec Reduced Motion.
- 37 hashes avant/apres confirment l'identite du moteur, des definitions,
  du template et des medaillons (`invariants-before.json`).
- Build statique local : 193 personnages, 578 fichiers, environ 484,4 Mio.
  Construction uniquement, aucune mise en ligne.

Captures generales : `qa/`. Fiches lisibles et cartes seules : `details/`.
Tous les tests navigateur emploient des contextes jetables et IndexedDB isole.
Les fonds, la lisibilite des armes fines et sombres et les fiches mobile ont
ete inspectes visuellement, pas seulement verifies par geometrie.
