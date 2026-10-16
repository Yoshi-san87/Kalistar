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

`site/login-intro.js/css` possedent le lecteur. `login.js` l'attend uniquement
dans la branche du login explicite. Il efface le champ de mot de passe avant
la lecture. Aucun flag personnel ou nouveau schema de sauvegarde n'est ajoute.

Les fichiers `assets/cinematics/kalistar-anime-v2*` sont servis par Cloudflare,
pas par Runway au runtime. Les scripts/CSS du lecteur sont publics comme le
formulaire ; les films et leurs posters restent proteges par le cookie du jeu.
Ne pas ajouter ces medias a l'allowlist publique du Worker.

| Export | Format | Duree | Taille |
| --- | --- | --- | --- |
| PC/paysage | 1280 x 720, H264/AAC, 24 fps | 30 s | environ 13,2 Mio |
| Telephone portrait | 720 x 1280, H264/AAC, 24 fps | 30 s | environ 11,8 Mio |

Le portrait est recadre au montage pour chaque personnage. Le lecteur affiche
l'image entiere, meme sur un Razr plus allonge qu'un ecran 16:9. Il ne charge
qu'une version ; une rotation ne relance pas le film. Le MP4 fast-start place
les metadonnees avant les images. Pas de canvas, de boucle ou de service tiers
permanent dans le site.

## Production et remplacement

Sources, prompts, identifiants de generation et montage sont dans
`revisions/2026-10-16-login-cinematic/v2/`. Le rebuild utilise son `build-film.cjs`
avec `KALISTAR_FILM_SOURCE` et `KALISTAR_FFMPEG` ; il ne relance aucun service
de generation. Les originaux et les exports sont sauvegardes hors checkout.
La premiere version de douze secondes et sa provenance restent preservees.
La musique originale est reutilisee, sans regeneration. L'ouverture et le
retour de Momo sont les deux moities consecutives d'un meme plan de dix secondes.
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
