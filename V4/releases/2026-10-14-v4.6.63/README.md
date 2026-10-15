# Kalistar 4.6.63 - Chargement des equipements historiques

## Erreur reproduite

La page Equipements pouvait afficher `Jeu V4 indisponible` puis
`Cannot convert undefined or null to object`.
Un profil d'equipement version 1 pouvait rester non converti des lors qu'une
carte archivee manquait dans le catalogue courant. La vue tentait ensuite
de lire les emplacements Protection et Relique absents de cet ancien profil.

Le cas exact a ete reproduit sur la version publique 4.6.62 avec un navigateur
jetable et une base synthetique, jamais sur les sauvegardes du joueur.

## Correctif

- Conversion independante de chaque profil connu, meme avec des cartes
  historiques hors catalogue ou un autre profil indisponible dans la base.
- Meme politique dans le cache et dans les transactions IndexedDB.
- Profils dont un porteur ou equipement est indisponible conserves sans
  alteration ; fiche consultable, attribution temporairement en lecture seule.
- Lecture des anciennes attributions via le parseur d'equipement existant,
  sans supposer que les trois maps existent deja.
- Aucun reset, changement de schema, carte native, regle, bonus ou snapshot
  de match. Aucun media de travail non suivi inclus dans la livraison.

## Verification

- Suite complete de publication V4 : 85 invocations terminees, aucun echec.
- 287 tests cibles : migration, persistance, trois emplacements, effets,
  formules, provenance, compatibilite, sauvegarde et reprise : PASS.
- Test IndexedDB dans une base isolee : conversion version 1, ancienne flute
  version 4.6.24, import/export, confirmations concurrentes, remplacement,
  retrait, incompatibilite et immutabilite d'un match : PASS.
- Nouveau test navigateur automatiquement classe dans la suite V4 : cinq
  profils, catalogue complet/incomplet, profils historiques indisponibles,
  lecture des donnees brutes, equipement PC/phone, reload, filtres et scroll.
- Build fige des seuls fichiers publiables : 379 cartes, 1379 assets,
  878.8 Mio ; budget inchange de 900 Mio.
- Controle navigateur de ce build : Collection, lecteur, telechargement PNG,
  Decks, capitaine, avant-match, Arene et match sauvegarde : PASS, aucune
  erreur HTTP/JavaScript ni Atelier public.

Le test de persistance a recu les deux dependances presentes dans le boot
actuel (`ultimate-definitions.js`, `ultimate-runtime.js`). Les assertions et
anciens rapports ne sont pas modifies pour contourner un echec.

## Preuves

- [Reproduction avant correctif](qa/legacy-before.json).
- [Cas historiques et parcours controles](qa/results.json).
- [Equipements PC](qa/equipment-desktop.png).
- [Equipements telephone](qa/equipment-phone.png).

Les essais intermediaires et copie figee restent dans `work/`, hors Git.
Le workflow et les deux sites publics sont controles apres le push.
