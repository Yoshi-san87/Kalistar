# Introduction apres connexion

L'introduction est un film anime contemplatif de trente secondes, pas un diaporama CSS.
Elle adapte les apparences approuvees de Momo, Kaylis, Voloden et Balmhyr ; elle ne
remplace aucune illustration de carte et ne revele aucun evenement du roman.
La demande anime concerne ce film uniquement : la peinture narrative reste
la reference des cartes natives.

## Parcours joueur

- Uniquement apres un login email/mot de passe reussi et l'echange du cookie
  serveur. Un mauvais mot de passe ou un compte refuse ne lance rien.
- Une reprise de session, un reload du jeu, une navigation et la recuperation
  du mot de passe n'imposent pas une nouvelle introduction.
- `Passer` et Echap donnent immediatement acces a la destination demandee.
- Le son est active au lancement a 65 % ; le bouton audio permet de le couper.
  Si le navigateur refuse l'autoplay sonore, une seule tentative silencieuse
  est faite automatiquement, et le bouton affiche le veritable etat du son.
- Reduced Motion passe directement au jeu, sans requete video. Un changement
  de cette preference en cours de lecture ferme aussi le film.
- Erreur de media : acces au jeu. Premier decodage trop lent : abandon a
  4,5 secondes. Un watchdog borne egalement les blocages pendant la lecture.
- Autoplay refuse : bouton de lecture manuelle, `Passer` toujours disponible.
- Fermeture, arriere-plan et navigation nettoient video, requete, listeners
  et timers. Aucun etat de partie ou de collection n'est modifie.

## Code et medias

`site/login-intro.js/css` possedent le lecteur. Apres le login explicite,
`login.js` efface le mot de passe et prepare un marqueur a usage unique dans
sessionStorage, puis rejoint immediatement la destination demandee.
Ce marqueur ne contient qu'une date, expire apres deux minutes et ne donne
aucun droit d'acces. Si ce stockage est refuse, le lecteur reste sur le login.

`boot.js` consomme le marqueur et revalide l'acces avant d'ouvrir le film.
Le catalogue, les modules, le profil synchronise et la vue se chargent pendant
la lecture, dans le meme document : ni iframe ni seconde session de jeu.
La presentation des equipes et l'IA attendent la fermeture du film. Les popups
demandant une action et les notifications de reprise sont presentees ensuite.
Si le jeu n'est pas encore pret apres Passer, son ecran de chargement habituel
reste visible ; une erreur de chargement conserve son bouton Reessayer.
Le marqueur consomme ne relance pas le film au rechargement et aucun schema
de sauvegarde n'est modifie.

Les fichiers `assets/cinematics/kalistar-anime-v3*` sont servis par Cloudflare,
pas par Runway au runtime. Les scripts/CSS du lecteur sont publics comme le
formulaire ; les films et leurs posters restent proteges par le cookie du jeu.
Ne pas ajouter ces medias a l'allowlist publique du Worker.

| Export | Format | Duree | Taille |
| --- | --- | --- | --- |
| PC/paysage | 1920 x 1080, H264/AAC, 24 fps | 30 s | moins de 25 Mio |
| Telephone portrait | 1080 x 1920, H264/AAC, 24 fps | 30 s | moins de 25 Mio |

Les deux coupes viennent des sources ameliorees en 4K. Le film maitre UHD
3840 x 2160 est conserve localement dans le lot de production et sa sauvegarde,
hors build web. Le lecteur charge uniquement la coupe 1080p adaptee.

Le portrait est recadre au montage pour chaque personnage. Le lecteur affiche
l'image entiere, meme sur un Razr plus allonge qu'un ecran 16:9. Il ne charge
qu'une version ; une rotation ne relance pas le film. Le MP4 fast-start place
les metadonnees avant les images. Pas de canvas, de boucle ou de service tiers
permanent dans le site.

## Production et remplacement

Sources, prompts, identifiants de generation et montage sont dans
`revisions/2026-10-16-login-cinematic/v3/`. Le rebuild utilise son `build-film.cjs`
avec `KALISTAR_FILM_SOURCE` et `KALISTAR_FFMPEG` ; il ne relance aucun service
de generation. Les originaux et les exports sont sauvegardes hors checkout.
Les versions precedentes et leurs provenances restent preservees.
La musique originale est reutilisee, sans regeneration. L'ouverture et le
retour de Momo sont les deux moities consecutives d'un meme plan de dix secondes.
Kaylis utilise les quatre secondes calmes de son nouveau plan, etirees sur six
secondes. Son visage metis est affine et Momo est plus petit ; ces adaptations
anime ne modifient aucune carte native.
Les medias binaires restent hors Git, leurs SHA-256 dans le registre runtime.

Pour une nouvelle intro, produire un nouveau nom versionne, verifier la duree,
le poids, les mouvements, les deux cadrages et le mixage, puis enregistrer
explicitement les exports dans `deploy/runtime-media.json`. Ne pas ecraser une
version deja publiee sans mettre a jour son nom et sa provenance.

## Verification

- `login-intro.test.cjs` : cycle de vie, nettoyage et activation conditionnelle.
- `login-intro.browser.test.cjs` : vraie lecture complete PC/Razr, pixels
  decodes, 320 px, paysage, son, skip, resize et erreurs.
- `login.browser.test.cjs` : SDK Auth et Worker reels avec comptes factices,
  autorisation, cookie, effacement du mot de passe, reload et deconnexion.
- `film.test.cjs` du lot : structure MP4, duree, pistes, fast-start et hashes.

Tests avec profils jetables uniquement. Aucun login personnel automatise.
