# Kalistar 4.6.81

Film de connexion ameliore en 4K : Kaylis conserve sa peau brune metisse et
sa peur face a ses pouvoirs, avec des traits affines ; Momo est plus petit,
aux proportions plus attendrissantes. Voloden et Balmhyr gardent leurs plans.
Le rythme contemplatif, la musique originale et les trente secondes restent.

## Livraison

- Maitre local UHD 3840 x 2160 : 106 983 128 octets.
- Site PC 1920 x 1080 : 18 450 602 octets.
- Site portrait 1080 x 1920 : 18 713 124 octets.
- Sources 4K, provenance et montage reproductible :
  revisions/2026-10-16-login-cinematic/v3/.
- Le film 4K est conserve dans master/ et la sauvegarde personnelle.
  Le site utilise uniquement les coupes 1080p, sous la limite de 25 Mio.
- Quinze medias sauvegardes hors checkout et verifies par SHA-256.
- 244 credits utilises, 197 restants ; aucun achat supplementaire.

Les anciennes versions restent preservees. Les cartes natives, regles,
collections, parties et droits d'acces ne sont pas modifies. Le seul changement
du lecteur est le nom versionne des medias. Le son reste actif par defaut
lorsque le navigateur l'autorise.

## Controles

- Suite CI complete : 91 groupes, 1 438 tests, aucun echec, un skip historique.
- Lecteur et Worker : 20 tests passes.
- Films : 8 tests passes, dont sources v3, musique originale, UHD, fast-start,
  dimensions des deux coupes web, empreintes et poids.
- Suite locale complete : 13 groupes, 125 tests, aucun echec.
- Lecture complete PC/Razr : six instants verifies par coupe, pixels decodes,
  320 px, paysage, resize, son, autoplay refuse, skip et Reduced Motion.
- Login avec SDK officiel, Worker et PostgreSQL ephemere : cinq profils
  visuels, refus, autorisation, cookies, reload, logout, profils Paris/Tokyo.
- Decodage integral des trois films : 720 images chacun, aucune erreur,
  maximum audio -3,5 dBFS.
- Build : 434 cartes, 1 484 fichiers ; les quatre nouveaux medias uniquement
  sont ajoutes au registre. Aucun binaire dans Git.

Preuves sous work/qa/login-intro-v3/. Publication personnelle Kalistar,
version/tag 4.6.81, build fige verifie avant envoi au projet Cloudflare existant.
