# Kalistar 4.6.85

## Perimetre

Remplacement approuve des illustrations natives de Vessa (49900312),
Karrok (49900313), Neryk (49900314) et Khariel (49902608) par les manteaux-remparts
de Nestown. Les memes modeles restent dans les collections et les sauvegardes.
Aucun changement de regle, description, arme imprimee, identifiant ou statistique.
La revision de glyphe Fleau de Khariel reste exactement preservee.

Les dix nouvelles pistes Drax sont des propositions locales, non publiees.
Les travaux des autres chats restent exclus.

## Sources et preuves

Lot natif : V4/revisions/2026-10-17-nestown-manteau-rempart/.
Les PSD actifs ont ete dupliques, puis seul le smart object d'illustration
a ete remplace. Photoshop 26.11.8 ; composants et textes natifs conserves.

- Quatre controles pixel : zero difference hors illustration.
- Quatre reouvertures PSD : zero difference, codes-barres lus correctement.
- Tous les calques texte sont identiques aux originaux.
- Registre runtime : seulement les quatre empreintes PNG ciblees changent.
- Sauvegarde hors checkout : maintenance/backups/2026-10-17-nestown-manteau-rempart/
  dans le workspace parent. 175 fichiers copies et compares par SHA-256,
  comprenant les natifs avant/apres. Les binaires restent hors Git.

Les audits historiques reconnaissent explicitement cette revision, via une
projection qui verifie les deux seuls champs de provenance autorises et la
chaine nativeRevision. Des tests negatifs refusent tout autre changement.
Aucun ancien rapport, hash de reference ou driver de production fige n'est modifie.

## Validation

- CI complete : 92 groupes, 1443 tests passes et un skip historique.
- Suite locale : 13 groupes, 127 tests passes, aucun echec.
- Galerie native : 1920, 1440, 800, 412 et 320px ; liens avant/apres controles.
- Build : 434 cartes, 1488 fichiers, 1051 Mio, sous les limites Cloudflare.
- Navigateur : Collection, lecteur, telechargement PNG, Decks, Arene,
  sauvegarde/reload et mobile ; aucune erreur HTTP ou JavaScript.
- Captures relues dans work/qa/nestown-native/ et work/qa/nestown-game/.

Les premieres tentatives navigateur et serveur local ont ete bloquees par le
sandbox Windows ; les memes tests passent avec l'autorisation d'execution locale.
La dependance marked utilise le runtime fourni, sans ajout de dependance au depot.

## Publication

Version PC/mobile et assertions alignees sur 4.6.85, apres la livraison Razr 4.6.84.
Commit et tag annote, envoi atomique sur le seul depot personnel Yoshi-san87/Kalistar.
Preparation et verification du commit fige avant envoi au projet Cloudflare kalistar.
Les preuves de livraison finales restent dans work/publication/ et work/qa/nestown-live/.
