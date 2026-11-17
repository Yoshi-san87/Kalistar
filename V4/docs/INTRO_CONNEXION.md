# Introduction apres connexion

L'introduction est un film anime contemplatif de 32,5 secondes, pas un diaporama CSS.
Elle adapte les apparences approuvees de Momo, Kaylis, Voloden et Balmhyr ; elle ne
remplace aucune illustration de carte et ne revele aucun evenement du roman.
La demande anime concerne ce film uniquement : la peinture narrative reste
la reference des cartes natives.

## Parcours joueur

- Uniquement apres un login email/mot de passe reussi et l'echange du cookie
  serveur. Un mauvais mot de passe ou un compte refuse ne lance rien.
- Une reprise de session, un reload du jeu, une navigation et la recuperation
  du mot de passe n'imposent pas une nouvelle introduction.
- `Passer` et Echap terminent le film et montrent l'accueil de lecture.
  Entrer rejoint ensuite la destination demandee des que les donnees sont pretes.
- Le son est active au lancement a 65 % ; le bouton audio permet de le couper.
  Si le navigateur refuse l'autoplay sonore, une seule tentative silencieuse
  est faite automatiquement, et le bouton affiche le veritable etat du son.
- Reduced Motion passe directement a l'accueil de lecture, sans requete video. Un changement
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
Le catalogue, les modules et le profil synchronise se preparent pendant la
lecture, dans le meme document : ni iframe ni seconde session de jeu. Au plus
huit images de la destination sont prechargees a priorite basse ; aucun parcours
de toutes les cartes et aucun rendu cache du plateau ne tournent sous le film.

`startup.js` porte une seule frontiere : preparation, donnees pretes, activation,
puis interface active. `app.js` attend cette frontiere avant de construire les
vues, brancher les reactions de l'interface, lancer une partie ou monter les
notifications. Ce n'est pas un filtre sur un type de popup. La synchronisation
initiale des donnees reste autorisee, mais aucun resultat de combat n'est produit
par ce prechargement. Les preferences synchronisees sont relues a l'activation.

La fin, Passer, Echap, Reduced Motion ou une erreur du film ouvrent le meme
accueil : une carte aleatoire et le recit publie sur cette carte. Les donnees
continuent a se preparer ; Entrer apparait quand elles sont pretes. Le jeu reste
inactif pendant toute la lecture, sans minuterie ni passage automatique.
Le clic Entrer ouvre la frontiere. Si le document est en arriere-plan,
l'activation attend son retour.
Une navigation definitive annule cette attente ; le retour bfcache ne cree pas
un second demarrage. Les erreurs de chargement attendent elles aussi la fin du
film avant d'afficher Reessayer. Les menus restent inertes tant que l'application
n'est pas active. Les animations CSS de la page sont en pause dans un onglet
cache et derriere une popup globale ; celles de la popup restent independantes.
Si le jeu n'est pas encore pret apres Passer, la lecture reste visible avec
son etat de preparation ; une erreur de chargement quitte cet accueil et
conserve le bouton Reessayer, sans attendre un clic sur Entrer.
Le marqueur consomme ne relance pas le film au rechargement et aucun schema
de sauvegarde n'est modifie.

Les fichiers `assets/cinematics/kalistar-anime-v4*` sont servis par Cloudflare,
pas par Runway au runtime. Les scripts/CSS du lecteur sont publics comme le
formulaire ; les films et leurs posters restent proteges par le cookie du jeu.
Ne pas ajouter ces medias a l'allowlist publique du Worker.

| Export | Format | Duree | Taille |
| --- | --- | --- | --- |
| PC/paysage | 1280 x 720, H264/AAC, 24 fps | 32,5 s | moins de 25 Mio |
| Telephone portrait | 720 x 1280, H264/AAC, 24 fps | 32,5 s | moins de 25 Mio |

Les nouveaux plans Runway sont produits en 720p. Les exports web respectent
cette definition : aucun agrandissement artificiel n'est presente comme une
nouvelle source UHD. Le maitre 4K de la precedente version reste preserve dans
son lot historique ; le lecteur ne charge que la coupe actuelle adaptee.

Le portrait est recadre au montage pour chaque personnage. Le lecteur affiche
l'image entiere, meme sur un Razr plus allonge qu'un ecran 16:9. Il ne charge
qu'une version ; une rotation ne relance pas le film. Le MP4 fast-start place
les metadonnees avant les images. Pas de canvas, de boucle ou de service tiers
permanent dans le site.

## Production et remplacement

Sources, prompts, identifiants Runway, reperes musicaux et montage courant sont
dans `revisions/2026-11-17-official-score/`. Son `build-film.cjs` utilise
`KALISTAR_FFMPEG` ; il ne relance aucun service de generation. Les originaux et
les exports sont sauvegardes hors checkout. Les versions precedentes restent
preservees. Les quatre plans sont nouveaux, depuis les references anime
approuvees. L'ouverture et le retour de Momo restent les deux parties
consecutives d'une meme prise. Ces adaptations ne modifient aucune carte.

La bande-son est le morceau officiel fourni par l'auteur, `Six-Note Motif`,
sans nouvelle musique ni dialogue generes. Les transitions suivent les reperes
8,00 / 13,08 / 19,75 / 24,08 / 28,71 secondes, arrondis aux images a 24 fps.
Le son n'est pas accelere pour suivre les plans.
Les medias binaires restent hors Git, leurs SHA-256 dans le registre runtime.

## Musique des menus

`theme-music.js` possede un seul lecteur audio natif. `app.js` ne le cree
qu'apres le choix Entrer, puis l'active quand la premiere vue est prete. Aucune
requete audio ni son de menu pendant le film ou l'accueil de lecture.
Le morceau complet est compresse en MP3 128 kb/s, normalise a -22 LUFS puis lu
a 16 % par defaut. Le volume est borne a 40 %, avec une entree douce de 700 ms.
Il n'existe aucune boucle de rendu, analyse audio temps reel ou minuterie
permanente : seulement les vingt pas du fondu, annules en quittant le lecteur.

La musique s'interrompt en arene, pendant le Gaming Book et en arriere-plan,
puis reprend a sa position dans les menus. Elle ne remplace pas les sons des
autres jeux. Autoplay refuse : nouvelle tentative seulement lors d'une action
du joueur ; fichier indisponible : silence, jamais un blocage du demarrage.
Le menu Plus permet de couper/reprendre le theme. Mon compte > Parametres
contient l'interrupteur et le volume. La preference est propre a l'appareil
(`kalistar.audio.v1`), sans changement de schema des sauvegardes synchronisees.

Pour une nouvelle intro, produire un nouveau nom versionne, verifier la duree,
le poids, les mouvements, les deux cadrages et le mixage, puis enregistrer
explicitement les exports dans `deploy/runtime-media.json`. Ne pas ecraser une
version deja publiee sans mettre a jour son nom et sa provenance.

## Verification

- `login-intro.test.cjs` : cycle de vie, nettoyage et activation conditionnelle.
- `startup.test.cjs` et `startup.browser.test.cjs` : separation des phases,
  media anticipe, absence de vue/action derriere le film, conflits de sauvegarde
  presentes ensuite, reprise inchangee, arriere-plan et erreurs de chargement.
- `login-intro.browser.test.cjs` : vraie lecture complete PC/Razr, pixels
  decodes, 320 px, paysage, son, skip, resize et erreurs.
- `login.browser.test.cjs` : SDK Auth et Worker reels avec comptes factices,
  autorisation, cookie, effacement du mot de passe, reload et deconnexion.
- `film.test.cjs` du lot : structure MP4, duree, pistes, fast-start et hashes.

Tests avec profils jetables uniquement. Aucun login personnel automatise.
