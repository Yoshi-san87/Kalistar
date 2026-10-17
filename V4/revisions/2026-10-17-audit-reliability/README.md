# Kalistar 4.6.86 - fiabilite des sauvegardes et des Fragments

Correctifs des six constats de l'audit du 17 octobre 2026. Aucun changement
d'equilibrage, aucune nouvelle carte, aucun reset de collection ou de partie.
Les illustrations, PSD, composants et verrous natifs restent inchanges.

## Correctifs

1. Les parties archivees quittent le document de synchronisation courant.
   Le protocole v2 conserve les preferences, decks, equipements et une partie
   active, avec des references SHA-256 vers des archives privees immuables.
   Upload par lots, lecture paginee, isolation par compte, revision optimiste
   et verrou d'appareil restent obligatoires. Une archive manquante ou invalide
   bloque la validation du document, sans ecraser la sauvegarde precedente.
   Les anciens documents v1 sont convertis progressivement et sans perte.
2. Une procedure reproductible de sauvegarde chiffree et de restauration de
   verification accompagne le registre. L'export SQL lit un snapshot coherent ;
   l'outil controle ses fragments et son hash, embarque les migrations puis
   restaure les tables dans une base PostgreSQL jetable avant le chiffrement
   DPAPI Windows. Il n'accepte pas d'adresse de base distante pour restaurer.
3. Le cache de cartes utilise une eviction LRU : 48 entrees et 24 Mio, sauf
   les ressources encore affichees ou en conversion. Il libere les ObjectURL,
   traite les reutilisations/clones DOM et ignore les conversions anciennes
   apres destruction. Aucun canvas permanent supplementaire.
4. Le stockage de synchronisation conserve au maximum quatre sessions deja
   acquittees. Les envois en attente et les lignes illisibles sont preserves,
   jamais supprimes pour respecter artificiellement une limite.
5. Une sauvegarde de match cloud relit uniquement les cles necessaires et
   ecrit ses magasins concernes. Les profils historiques se limitent aux
   participants et a l'arene du match, pas a tout le catalogue. Le verrou des
   exemplaires est relu dans la transaction, y compris apres changement depuis
   un autre onglet. Les imports complets restent atomiques.
6. Un Fragment fige ses cartes, matrices, regles et arene au demarrage. Le
   serveur, l'arene, les fiches, les bonus et le bilan utilisent ce snapshot.
   Le hash de compatibilite porte sur les modules executables de combat,
   pas sur chaque changement cosmetique du catalogue. Les combats 4.6.85 ont
   une compatibilite explicite, verifiee contre leur catalogue fige ; une autre
   empreinte est toujours refusee. Le catalogue courant reste celui des Decks
   et de la Collection.

## Registre personnel

Migration additive : `202610170010_progress_archives.sql`, schema 8 vers 9.
Appliquee le 17 octobre sur le seul projet personnel Kalistar. Avant et apres :
2 comptes, 444 exemplaires, 2 sauvegardes et 1 tentative Fragment active.
L'empreinte agregee des revisions et contenus des sauvegardes est identique.
Aucun secret, email, hash de mot de passe ou export prive dans ce dossier.

La sauvegarde avant migration est hors checkout, dans
`sauvegardes-personnelles/supabase/kalistar-2026-10-17-before-v9.dpapi`
du dossier de travail parent. Son manifeste est egalement hors Git.
Le controle de restauration des 19 tables a reussi, avec comparaison des
lignes typees et verification RLS des tables applicatives.

## Verification

- Suites completes : `ci` (93 invocations), `local` (13 invocations) et
  `repository` (2 invocations), terminees sans echec. Organisation et diff
  stages controles. Les tests navigateur specifiques ci-dessous sont aussi
  executes hors des tests optionnels des suites unitaires.
- Synchronisation navigateur PC/Razr : 120 archives, 24 056 065 octets de
  progression complete pour 16 362 octets de document courant. Recuperation
  sur un second navigateur, rechargement, conflit de verrou et isolation des
  comptes verifies. Ce volume reutilise cinq simulations moteur reelles pour
  construire un historique volumineux ; ce n'est pas une preuve d'equilibrage.
- IndexedDB reel : 41 rencontres, zero `getAll` pour la sauvegarde cloud d'un
  match ; conservation de quatre sessions acquittees et de deux lignes a
  preserver. Les preferences d'equipement restent synchronisees entre onglets.
- Cache : 144 images, 58 275 936 octets crees ; apres retrait du DOM, 48 images
  et 19 425 312 octets conserves. Les images visibles ne sont pas revoquees.
  Destruction : zero ObjectURL restante ; courses asynchrones testees.
- Fragment : comparaison des traces ancien/nouveau moteur, reprise apres
  modification du catalogue, quatre combats signes, recompense Tokyo,
  rechargement et apercu administrateur Paris dans le navigateur PC/Razr.
- Equipements : persistance des trois emplacements, migration historique,
  remplacement, import, annuler/retablir, ancrage PC/phone et Reduced Motion.
  Le test isole charge maintenant `ultimate-ui.js`, deja utilise en production.
- La suite generale verifie aussi le nombre et l'ordre des dependances de boot,
  dont le nouveau module `cloud-archives.js`. Aucun verrou de reference ni
  ancien rapport n'a ete modifie pour faire passer ces controles.

Les commandes de validation sont centralisees dans
`maintenance/validation-suites.json`. Les logs, captures et preuves jetables
sont dans `work/qa/audit-fixes-2026-10-17/` et les sous-dossiers nommes par les
tests navigateur, hors Git. Les schemas et procedures maintenus sont dans
`V4/docs/REGISTRE_EN_LIGNE.md`, `V4/docs/PARCOURS_BIBLIOTHEQUE.md` et
`V4/deploy/supabase/README.md`.

## Limites explicites

- La copie DPAPI est liee au compte Windows. Elle n'est ni une sauvegarde
  independante hors de ce PC ni une sauvegarde automatique planifiee. Une
  seconde copie avec une procedure de recuperation sur un autre poste reste
  necessaire pour couvrir la perte du PC ou de ses cles Windows.
- Le test restaure les donnees applicatives et les lignes Auth exportees, pas
  un service Supabase Auth complet : sessions, configuration des fournisseurs,
  secrets Cloudflare et Storage ne sont pas inclus dans cette sauvegarde.
- Les archives utilisent toujours de l'espace Supabase. Limites : 2 Mio par
  archive, 10 000 references et une partie active, document courant 8 Mio.
  Aucun historique distant n'est purge automatiquement. Surveiller le quota.
- Les statistiques des parties ordinaires restent des donnees du client ;
  seules les recompenses Fragment reposent sur la validation serveur signee.
- Apres conversion d'une sauvegarde v2, un ancien client ne peut plus l'ecraser.
  Il doit recharger le jeu. Un rollback logiciel vers v1 exige une conversion
  explicite ; preferer un correctif en avant, jamais un effacement de progression.
