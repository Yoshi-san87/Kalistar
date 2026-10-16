# Revision contemplative - 30 secondes

Revision explicitement demandee par l'auteur apres la premiere version :
ralentir, privilegier les emotions et conserver la musique. Duree de trente
secondes confirmee. La version initiale, ses sources et ses preuves restent
intactes dans le dossier parent ; aucune carte native n'est modifiee.

## Plans

- Momo reste assis et joue, magie douce et leger mouvement de camera.
- Kaylis regarde ses tatouages avec peur et incomprehension, sans attaque.
- Voloden reste debout devant la vitre de son bureau donnant sur la mine.
  Reference : `V4/Illustrations/Voloden_Thinking.png`, modele 43905149.
- Balmhyr veille dans le vent ; l'ours se rapproche. Pas de geste d'attaque.
- Retour au meme plan de Momo, dans sa continuite, puis camera vers le ciel,
  assombrissement et logo approuve. Fondus de 0,5 seconde entre les plans.

Quatre plans generes : 10 + 6 + 6 + 6 secondes, 336 credits existants.
Momo est ralenti a 90,9 % et divise en deux moities, pas repete. La musique
originale de la v1 est conservee avec son empreinte ; aucune nouvelle musique
ni aucun achat. Le mixage vise -18 LUFS, avec sortie progressive sur 1,4 seconde.

`generation.json` conserve prompts exacts, references, cout et identifiants.
Le keyframe Voloden a ete cree avec image_gen integre ; les trois autres
keyframes anime sont reutilises. Les sources binaires sont locales dans
`source/`, sauvegardees hors checkout avec les exports versionnes v2.

## Reproduire

```powershell
$env:KALISTAR_FILM_SOURCE='V4/revisions/2026-10-16-login-cinematic/v2/source'
$env:KALISTAR_FFMPEG='chemin-vers-ffmpeg.exe'
node V4/revisions/2026-10-16-login-cinematic/v2/build-film.cjs
```

Le script utilise Node, Sharp et FFmpeg, sans appeler Runway. Le portrait
recadre chaque personnage et suit legerement Balmhyr pour garder les deux
visages. Le lecteur conserve sa mise en page ; son active par defaut avec
repli autoplay silencieux, skip et Reduced Motion. Aucun nouvel acces public.

Les controles MP4 v1 restent executes dans `../film.test.cjs`, en plus des
nouveaux exports de trente secondes. Les captures et rapports repetes vont
dans `work/qa/login-intro-v2/`. Voir le
[contrat du lecteur](../../../docs/INTRO_CONNEXION.md).
