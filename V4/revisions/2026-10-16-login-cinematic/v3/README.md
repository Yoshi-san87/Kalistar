# Film 4K et personnages affines

Demande de l'auteur : conserver l'intro contemplative qu'il a approuvee, la
passer en 4K, affiner Kaylis en belle femme metisse et rendre Momo plus petit
et attendrissant. La demande anime reste propre au film, pas aux cartes natives.

## Fabrication

- Images de depart retouchees avec image_gen, referencees dans generation.json.
- Deux nouveaux plans : Momo assis, 10 s ; Kaylis, 6 s.
- Selection des 4 premieres secondes de Kaylis pour eviter l'acceleration
  finale de camera ; ralentissement a 6 s dans le montage.
- Voloden et Balmhyr : sources v2 conservees, seulement ameliorees en 4K.
- Quatre sources ameliorees a 4096 x 2304, montage UHD a 3840 x 2160.
- Musique originale identique ; meme ordre, fondus et duree de 30 s.
- Cout constate : 192 credits animation + 52 amelioration = 244.
  Aucun achat ; 197 credits restants apres les operations.

## Fichiers

source/ conserve les deux nouveaux plans, la selection Kaylis, les images,
la musique et les quatre plans 4K. master/ conserve le film UHD complet.
Ces binaires restent locaux et sont sauvegardes hors du checkout.
generation.json contient prompts, taches, empreintes et chronologie.

build-film.cjs produit le maitre UHD et les deux coupes web 1080p. Il accepte
master, desktop ou phone comme argument, ainsi que KALISTAR_FILM_SOURCE et
KALISTAR_FFMPEG. Le dossier source attendu contient upscaled/ et music.mp3.
La coupe portrait conserve les ancres par personnage, sans recadrage CSS.
Le maitre UHD n'est pas inscrit au registre web ; les fichiers du site restent
sous 25 Mio et proteges par le cookie du jeu.

## Validation

Le test local film.test.cjs conserve les controles v1/v2 et ajoute les sources
v3, le maitre UHD, les deux coupes et leur enregistrement. Les tests du lecteur
et du login verifient lecture complete PC/Razr, son, erreurs et acces prive.
Les preuves de cette livraison sont sous work/qa/login-intro-v3/.
