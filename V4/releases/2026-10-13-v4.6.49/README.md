# Kalistar 4.6.49 - Clonage Cloudflare

## Probleme constate

Le deploiement Cloudflare de `b237a163` telechargeait les sources PSD pendant
le clonage, avant la commande de build. Le log du 13 octobre 2026 termine par
`no space left on device` a la recuperation d'un ancien BALMHYR de 67 Mo.
La variable utilisateur `GIT_LFS_SKIP_SMUDGE=1` n'avait pas protege cette etape.
Ce n'est ni une corruption des cartes ni un manque de place sur le PC.

## Correctif

- `.lfsconfig` differe les telechargements initiaux ; aucun objet LFS supprime,
  aucun fichier natif, verrou ou `.gitattributes` modifie.
- Les fetchs explicites `--include=... --exclude=""` du jeu et des preuves
  restent inchanges. Les nouveaux clones demandent aussi les sources natives
  explicitement ; la procedure est documentee dans `V4/deploy/README.md`.
- Les budgets sont propres a l'hebergeur : GitHub/local garde 900 Mio ;
  Cloudflare controle 20000 fichiers et 25 Mio par fichier, sorties generees
  comprises. Le changement ne touche pas les profils, le moteur ou les saves.
- Le workflow GitHub execute les nouveaux tests avant publication.

## Verification

Les tests de publication couvrent les deux budgets, leurs bornes, une sortie
Cloudflare superieure a 900 Mio et le filtre LFS sans variable de smudge.
La verification du filtre utilise un pointeur synthetique de 67 Mo et un
endpoint local volontairement inaccessible : aucun telechargement n'est permis.
Les preuves locales complementaires sont en `verification.json`.

Le deploiement Cloudflare reel reste a confirmer dans son journal ; ne pas
annoncer la migration achevee a la seule reussite du build local ou de GitHub.
Une relance du commit 4.6.48 ne contient pas le correctif : utiliser 4.6.49.
Le site GitHub reste disponible. Aucun DNS, compte ou stockage joueur modifie.
