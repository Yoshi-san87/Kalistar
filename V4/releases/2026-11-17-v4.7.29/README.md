# Kalistar 4.7.29 - Six-Note Motif

Integration du theme officiel fourni par l'auteur et nouvelle introduction
anime Runway de 32,5 secondes, montee sur cette musique. Quatre nouvelles
prises, Momo en ouverture et en retour, logo rainbow officiel. Recadrages PC
et portrait distincts ; aucune carte native changee.

La musique des menus commence uniquement apres Entrer, a faible volume.
Commande dans Plus et volume dans Mon compte > Parametres. Pause en arene,
Gaming Book, onglet masque et navigation. Reglage local a l'appareil ; aucun
changement Supabase, possession, progression, sauvegarde ou regle.

Le module audio n'utilise ni analyse temps reel ni boucle permanente. Un seul
lecteur, une montee de volume bornee, nettoyage et protection des promesses
retardees. L'echec audio reste silencieux et ne bloque jamais le jeu.

Sources et provenance : [lot musique](../../revisions/2026-11-17-official-score/README.md).
Originaux et exports sauvegardes hors checkout. Aucun binaire ajoute au Git.

## Verification

Preuves sous `work/qa/official-score/`, profils jetables uniquement. Tests
unitaires du lecteur, activation, refus autoplay, visibilite, historique et
nettoyage. Tests de structure/hashes des deux films, lecture native PC/Razr,
320 px, son, rotation, Reduced Motion et erreurs reseau. Tests du theme reel
et de l'absence de lecture sous le film/accueil. Suites CI et locale, puis
verification du commit fige avant livraison Cloudflare personnelle.

Resultats obtenus avant preparation : 34 tests startup/lecture/audio et 11 tests
de films passes, suite locale complete (14 invocations), lecture complete PC
et Razr et parcours connexion sur six formats passes. Theme reel sur 1440,
412 et 320 px, compte sur cinq formats, activation sous film : passes. La
suite CI a signale le compteur historique 71 modules, actualise a 72 avec une
assertion explicite sur la frontiere d'activation audio, puis revalide.
