# Introduction anime Kalistar

Demande utilisateur du 16 octobre 2026 : trailer serieux de douze secondes
apres le login, avec la DA Kalistar adaptee en anime et les vrais personnages
des cartes. La demande anime est propre a ce film, pas aux cartes natives.

## Resultat

Momo joue dans Chroma (0-3,5 s), Kaylis decouvre ses tatouages Rainbow
(3,5-7 s), Balmhyr et son ours veillent sur Canyonero (7-10 s), puis apparait
le logo Kalistar approuve (10-12 s). Il s'agit d'un montage de trois veritables
plans animes generes, avec musique originale, pas d'images fixes deplacees.

`generation.json` conserve references, prompts video, tasks, coupes, hashes et
cout. Les keyframes ont ete produites avec l'outil image_gen integre en
conservant les identites approuvees, puis animees dans Runway. Trois plans de
4 secondes : 144 credits ; musique : 4 credits. Aucun achat ou abonnement
effectue par l'assistant. Ni tests ni rebuild ne consomment de credits.

Les originaux binaires de `source/` restent locaux et sont sauvegardes dans
`sauvegardes-personnelles/intro-anime-20261016/`, hors du checkout. Les exports
optimises vivent dans `site/assets/cinematics/` ; seuls leurs hashes vont dans
Git. Aucun PNG/PSD natif, regle, catalogue, compte ou schema n'est change.

## Reproduire le montage local

```powershell
$env:KALISTAR_FILM_SOURCE='V4/revisions/2026-10-16-login-cinematic/source'
$env:KALISTAR_FFMPEG='chemin-vers-ffmpeg.exe'
node V4/revisions/2026-10-16-login-cinematic/build-film.cjs
```

Node, Sharp et FFmpeg sont necessaires uniquement a la fabrication. Le lecteur
n'a aucune dependance Runway ou FFmpeg. La provenance complete des requetes
keyframes est dans `keyframes.prompts.json`.

Le [contrat du lecteur](../../docs/INTRO_CONNEXION.md) decrit reprise de session,
Reduced Motion, erreurs et acces prive. Les preuves intermediaires vont dans
`work/qa/login-intro/`, pas dans les anciens rapports de validation.
