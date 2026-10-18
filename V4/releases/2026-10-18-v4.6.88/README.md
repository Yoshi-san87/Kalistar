# Kalistar 4.6.88

## Perimetre

Le dos Obsidienne, proposition 02 des dix dos du 18 octobre, est choisi par
l'auteur. Son cristal rainbow vertical et son cadre cuivre sont conserves
exactement, sans nouvelle generation. Integration sur les presentations,
piles, reserves adverses et leur popup, transition Decks et images de
remplacement des comptes, du registre et du Guide.

Aucun changement des rectos natifs, du catalogue, du gameplay, de la progression,
des definitions Fragment ou de la base Supabase. L'ancien dos V3 est intact.

## Sources

[Revision et export reproductible](../../revisions/2026-10-18-obsidian-back/README.md).
Nouveau media : V4/site/assets/back-obsidian-v1.webp, 897 x 1497, 292054 octets.
Empreinte SHA-256 : 33d14b11c87a565d5505108e577868b3ca835b8792339035da1474ce93caa8e1.

Original PNG, ancien dos, export web et provenance copies avec verification
hors checkout dans sauvegardes-personnelles/creation/2026-10-18-obsidian-back.
Les binaires ne sont pas pousses sur Git. Le registre runtime ajoute seulement
ce nouvel asset versionne ; le cache de l'ancien fichier ne peut pas le masquer.

## Verification

- Tests cibles build / transition : 11 passes.
- Navigateur Obsidienne : desktop 1440 x 1000, Razr 412 x 1007 et mouvement
  reduit 390 x 844. Presentation et piles, cinq reserves cachees, transition,
  reprise du meme match et empreinte exacte du fichier, sans erreur JS/HTTP.
- Navigateur general : 434 cartes, Collection, lecteur et export PNG, Decks,
  Arene, sauvegarde/reload, publication additive, PC et smartphone.
- Suite locale : 13 invocations reussies, dont 57 tests PostgreSQL isoles.
- Suite CI complete : 93 invocations reussies, sans modification des seuils.
- Suite repository : 105 tests reussis.
- Build Cloudflare local : 434 cartes, 1493 fichiers, environ 1052 Mio.
- Organisation et diff stage : controles reussis sur les seuls fichiers livres.

Les captures et journaux restent dans work/qa/obsidian-back. Une premiere
execution locale etait bloquee par la restriction localhost du bac a sable ;
la suite reexecutee avec acces localhost a reussi, sans changer les tests.
Le navigateur Obsidienne sert uniquement le build a travers des routes
Playwright isolees. Aucun compte ou stockage personnel n'est utilise.

## Publication

Depot personnel Yoshi-san87/Kalistar, tag annote v4.6.88 et main ensemble.
Cible : https://kalistar.pages.dev/jeu/, projet existant kalistar.
Le build du commit fige doit repasser les deux tests navigateur avant envoi.
Les preuves de ce build et du controle public vont sous frozen-* et live/
dans le dossier QA. Aucun changement de forfait, de secret ou d'acces cloud.
