# Kalistar 4.6.80 - Introduction contemplative

Revision du film de connexion a la demande de l'auteur : trente secondes,
plans plus calmes et emotions, musique originale conservee. Momo reste assis,
Kaylis decouvre ses pouvoirs avec peur, Voloden observe la mine depuis son
bureau, Balmhyr et son ours veillent sans geste d'attaque, puis retour au meme
plan de Momo et ascension vers le ciel avant le logo.

L'ouverture et le retour sont les deux moities consecutives d'un seul plan.
Quatre nouvelles generations, 336 credits existants, aucune nouvelle musique
ni achat. Keyframe Voloden produit avec image_gen integre depuis sa vraie
illustration de bureau ; autres keyframes anime reutilises.

Son actif par defaut a 65 %. Si le navigateur refuse l'autoplay sonore,
nouvelle tentative silencieuse unique ; lecture manuelle si elle est aussi
refusee. Bouton son, skip, Reduced Motion, reprise sans rejouer et nettoyage
conserves. Les delais de securite couvrent la nouvelle duree.

Exports H264/AAC fast-start : 13 847 337 octets PC et 12 358 912 octets portrait,
30 secondes et 24 fps. Cadrage portrait dedie avec suivi leger de Balmhyr.
Les 13 medias source/runtime correspondent a la sauvegarde hors checkout.
Les fichiers v1 et leurs preuves restent conserves. Aucune carte native,
regle, sauvegarde joueur ou permission de compte n'est modifiee.

## Verification

`maintenance/validate.cjs --suite ci` : 91 groupes, 1 438 tests, aucun echec,
un skip historique. `--suite local` : 13 groupes, 122 tests, aucun echec.
Le premier essai local etait bloque par le bac a sable sur une connexion
127.0.0.1 ; la suite complete a ete relancee avec les serveurs de test autorises.
Aucun verrou ni ancien rapport n'a ete modifie pour faire passer ces controles.

`login-intro.browser.test.cjs` : lecture reelle complete PC/Razr, six captures
par coupe, pixels non vides, boutons accessibles, compact 320 px, paysage,
son par defaut, repli silencieux puis manuel, skip, rotation et Reduced Motion.
`login.browser.test.cjs` : SDK Auth et Worker reels avec comptes factices,
cinq formats, cookie avant film, mot de passe efface, lecture complete,
acces au jeu, refus de compte, logout et reload sans rejouer l'intro.

`film.test.cjs` garde les assertions v1 et ajoute les deux MP4 v2, fast-start,
pistes H264/AAC, dimensions, poids, SHA-256, musique identique et continuite
des deux moities de Momo. FFmpeg decode les 720 images de chaque export sans
erreur ; pic audio PC a -3,5 dBFS. Les medias restent prives dans le Worker.

Le controle d'organisation passe apres staging explicite. Le build exact fige
doit encore passer les controles navigateur avant l'envoi Cloudflare : film,
connexion, Collection, Decks, Arene et reprise. Preuves et rapports locaux
sous `work/qa/login-intro-v2/` ; aucun compte personnel automatise.

## References

- [Contrat du lecteur](../../docs/INTRO_CONNEXION.md)
- [Plans, provenance et reproduction](../../revisions/2026-10-16-login-cinematic/v2/README.md)
- [Prompts exacts et cout](../../revisions/2026-10-16-login-cinematic/v2/generation.json)
