# Octopath Traveler I et II

Seize illustrations individuelles, commencées le 20 octobre 2026 et assemblées
le 21 octobre, sélectionnées par l’auteur. Ce dossier conserve les illustrations ;
la production native est séparée dans le
[lot Octopath](../../expansions/2026-10-21-octopath-traveler/README.md).

## Sélection

- I : Ophilia, Cyrus, Tressa, Olberic, Primrose, Alfyn, Therion, H’aanit.
- II : Hikari, Agnea, Partitio, Osvald, Throné, Temenos, Ochette, Castti.

Les scènes sont des propositions visuelles inspirées de leurs métiers et
personnalités, pas des reproductions annoncées de cinématiques exactes.
Leurs costumes d’origine sont adaptés au rendu peint de Kalistar, avec des
actions et des ambiances distinctes. La validation artistique reste à l’auteur.

## Direction artistique et provenance

Référence : [règle d’or Kalistar](../../DIRECTION_ARTISTIQUE.md).
Momo et Valazar sont fournis au générateur comme références de peinture seulement.
Chaque image est générée séparément avec l’outil intégré `image_gen`, sans CLI
de secours. Aucun cadre de carte n’a été régénéré.

`prompts.json` conserve les seize prompts initiaux exacts et les références.
`provenance/<personnage>.json` associe chaque prompt à sa sortie originale,
aux dimensions et au SHA-256. `revisions.json` conserve la chaîne des retouches :
Tressa (visage, fond et lance courte droite), Hikari (katana ajusté en version 05),
H’aanit (arc refait) et la passe picturale des visages d’Ophilia, Agnea, Temenos
et Ochette. Les versions précédentes restent présentes ;
la galerie affiche la dernière version de chaque chaîne. Les sorties du générateur
restent également conservées sous `.codex/generated_images/`.

## Références des personnages

- [Nintendo : les huit voyageurs du premier jeu](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-games/OCTOPATH-TRAVELER-1275922.html?nsuid=70010000001617).
- [Square Enix : les huit protagonistes du deuxième jeu](https://www.square-enix.com/asia/newsportal/en/sg/octopathii/).
- [Square Enix : Hikari](https://www.jp.square-enix.com/octopathtraveler2/traveler/hikari.html).
- [Square Enix : Ophilia](https://www.jp.square-enix.com/octopathtraveler/sp/traveler/ophilia.html).

## Consultation et contrôles

Ouvrir `index.html`, sans serveur. Filtre par jeu, recherche et agrandissement.
La galerie réutilise la feuille de style locale déjà employée pour les propositions
Vulkar ; cette dépendance reste à son emplacement, sans modification.

Depuis la racine du dépôt :

```sh
node V4/propositions/2026-10-20-octopath-traveler/build.cjs
```

Ce contrôle vérifie la liste exacte, huit héros par jeu, les seize images
distinctes, les dimensions, les copies identiques aux originaux et la conservation
des premiers essais. `verification.json` contient les preuves techniques.
Les tests navigateur et captures sont dans `work/qa/octopath-traveler/`.
Les sources sont sauvegardées hors checkout. Le lot natif publie les nouvelles
cartes de manière additive, sans modifier les anciens modèles ni leurs verrous.
