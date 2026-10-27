# Gaming Book : Momo

Copie de production du prototype local r6 work/rpg-momo-casse, autorisee le
27 octobre pour l'apres-victoire du combat 4. Le prototype reste intact.
Les dessins restent propres a ce lecteur ; ce n'est pas une validation de
sprites Astraball. La liste runtime-files.json exclut outils, tests, sources,
revisions et ce guide du site publie.

Le parent verifie la progression recue du serveur avant ouverture. La scene
est un iframe same-origin dans un dialog suivi par dialog-history : Retour
ferme la scene, pas le jeu. Seuls messages du bon origin, contentWindow et
jeton ephemere sont acceptes. Aucun token Auth, identifiant utilisateur ou
secret n'entre dans l'iframe. Ses messages ne prouvent jamais une victoire.

La fin de scene propose Continuer. Le parent appelle alors l'attribution
existante, idempotente et autorisee par les quatre victoires serveur, puis
la ceremonie et l'ACK existants. Relecture et apercu admin ne donnent rien.
Une erreur ou fermeture laisse le gain disponible, sans reset.

Le parent conserve un marque-page local par compte : phase/page et position,
pas une copie de sauvegarde de combat. Les donnees sont validees et bornees.
Une musique interrompue reprend a son invitation, jamais par un autoplay.
Sur un autre appareil, le gain reste disponible mais la lecture repart du debut.

Les 62 medias selectionnes (~19,8 Mio) sont charges seulement dans la scene.
Le film (~4,8 Mio par format) attend la nuit ; une seule orientation charge.
La fermeture detruit l'iframe, ses boucles et son audio. Pause/visibilite et
reduction des animations sont conservees. Aucune dependance CDN.

Les sources et variantes ont ete copiees hors checkout, hashes verifies :
sauvegardes-privees/gaming-book-momo-20261027-v4.7.23 (118 fichiers).
Les empreintes des medias publies sont dans ../../deploy/runtime-media.json.
Matter.js 0.20.0 est distribue avec sa licence MIT dans les medias ;
Lucide reutilise la copie du site. Illustrations et musique Kalistar existantes.

Tests : gaming-book.test.cjs, gaming-book.browser.test.cjs et
journeys.browser.test.cjs (vrais Worker/PostgreSQL ephemeres, aucun compte reel).
