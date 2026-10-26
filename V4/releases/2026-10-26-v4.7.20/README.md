# Kalistar 4.7.20 - Outillage Sprite V2 et taille de Malaba

## Perimetre

Publication du contrat, du lecteur local, des convertisseurs et des tests
Sprite V2. Le jeu conserve les atlas historiques. Aucune nouvelle planche
V2, sauvegarde joueur ou statistique sportive n'est integree au runtime.
Malaba mesure maintenant 205 cm au lieu de 191 cm, avec sa masse de 112 kg
inchangee. La bibliotheque V2 locale utilise sa nouvelle revision native
de 131 pixels anatomiques, obtenue depuis les sources originales.

## Production Locale

Arret explicite a 170 identites uniques, dix pilotes inclus : 680 pages,
10 880 frames et quatorze clips par personnage. Les 198 autres identites
de l'inventaire ne constituent pas une file de production active.
Toutes les sources et anciennes revisions sont conservees hors Git.

Le lot est en statut review, pas ready. Des erreurs de mouvements, prises
d'armes, anatomie et pince/main restent documentees. Les reperes et masques
de mains manquants bloquent l'integration. Aucun resultat technique ne vaut
approbation artistique. Le chantier et ses assistants sont arretes.

## Contrat Et Conservation

Cellules 320 px, origine fixe, quatre pages et 64 frames par personnage.
Conversion native hors jeu a densite commune, palette partagee et alpha
binaire. La palette est independante des positions proposees. Les reperes
mesures et leurs choix de contact/vol restent distincts et lies aux sources.
Une modification explicite de taille ou de famille d'animation invalide
le cache d'import sans remplacer les anciennes revisions natives.

Les outils, tests et guides sont suivis par Git. Les PNG, prompts sources,
registres de production et captures restent dans work/ et sa sauvegarde
privee externe au checkout. Aucun binaire ou rapport historique n'est force
dans l'index. Aucun verrou de reference n'a ete modifie.

## Verification

- Audit local du lot : 170 identites, 10 880 frames, 680 pages ; controles
  techniques valides, mouvement et reperes non approuves.
- Malaba : 11 tests cibles reussis ; import idempotent, 64 frames valides,
  27 anciens fichiers sources/natifs verifies byte-identiques.
- Suite CI complete : 105 invocations, 2 278 tests reussis, deux optionnels
  ignores, aucun echec avec KALISTAR_NODE_MODULES configure.
- Suite locale complete : 14 invocations, 154 tests reussis, aucun ignore.
- Trois parcours navigateur Sprite V2 reussis : studio, dix pilotes et
  catalogue complet, PC/mobile, lecture, filtres, exports et absence de
  debordement. Captures du catalogue PC/mobile inspectees.
- Build CF_PAGES=1 : 462 cartes, 1 968 fichiers, 1 142,6 Mio. Parcours du
  site construit reussi : Collection, lecteur, PNG, decks, arene et reprise
  de sauvegarde, PC/mobile, sans erreur HTTP ou JavaScript. Captures inspectees.
- Sauvegarde externe au checkout : 11 611 fichiers, 4 709 592 606 octets,
  copies verifiees par SHA-256 ; manifeste conserve avec cette sauvegarde.
- Premiers essais conserves dans work/publication/sprite-v2-4.7.20 : manque
  de chemin marked, budget GitHub Pages sans CF_PAGES et acces localhost
  refuse au navigateur sandboxe. Aucun test, limite ou verrou assoupli ;
  relances avec dependances, hebergeur et permissions locales adequats.

## Publication

Version PC, mobile, footer Astraball et assertions harmonises a 4.7.20.
Commit et tag annote sur le depot personnel ; construction du commit exact
puis verification avant deploiement dans le projet Cloudflare existant.
Les modifications locales sans rapport avec ce lot restent hors index.
