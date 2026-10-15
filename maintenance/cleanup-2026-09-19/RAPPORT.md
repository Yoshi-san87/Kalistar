# Nettoyage et rangement Kalistar

Nettoyage termine. Aucun depot Git initialise, aucune commande Git executee,
aucun remote ajoute et aucun push effectue.

## Resultat

- **72 copies temporaires identiques retirees** : 472 272 258 octets,
  soit 472,3 Mo (450,4 Mio).
- Fichiers audites : 9,439 Go avant, 8,967 Go conserves hors nouveaux documents.
  Les quatre liens de dependances sous `V2/site/node_modules/` ne sont pas suivis.
- **6 495 fichiers conserves ou deplaces verifies identiques par SHA-256**.
- Quatre scripts Photoshop historiques ranges dans `maintenance/scripts-historiques/`.
- Ancien README V4 conserve integralement dans
  `V4/docs/HISTORIQUE_AVANT_2026-09-19.md`, remplace par un guide de la version active.
- Dossiers vides `Delivery/V1/FR`, `Delivery/V1`, `Delivery` et `Test` retires.
- README racine, guide Drive/Git, `.gitignore`, `.gitattributes` et instructions
  de prudence Git ajoutes. Aucun changement de moteur, regle ou illustration.

Les copies supprimees se trouvaient exclusivement dans les zones `staged/`
et `transaction/` de trois revisions terminees. Chaque copie possede encore
un equivalent strictement identique dont le chemin et l'empreinte sont consignes
dans le journal. Aucun original de revision n'a ete supprime.

## Conserves

Les 27 PSD/PNG V4 approuves, les maitres, profils, scripts actifs, illustrations,
banques graphiques, originaux de retour arriere, documents de l'univers et toutes
les anciennes versions utiles restent a leurs chemins attendus. Les brouillons,
imports, travaux Atelier et leurs exports consultables restent aussi en place.

V3 demeure une dependance du jeu V4. Le lecteur de codes-barres utilise encore
`V1/scripts/vendor/`. Ces dossiers n'ont pas ete deplaces ou retires.

## Verifications

- 190 fichiers du verrou approuve et 420 composants graphiques identiques.
- Verrou inchange : `aaee4023166e9997f865e9972caddb34022764b8d3ed5e1d53c30e68adcc1ace`.
- Moteur inchange : `14d63922b3cd61e0a0b8c8eeda130a822620ef90ea6b224ad304de2ddca3cb90`.
- 54 tests Atelier / publication / catalogue / gameplay passes, aucun echec.
- 27 exports HTTP PNG compares aux sources et routes Collection / Atelier
  controlees avec le serveur de production instancie sur un port de test isole.
- Le dernier controle natif reste valide : sources et moteur inchanges.
  Aucun nouveau rendu Photoshop n'etait necessaire et aucun n'a ete execute.
- Aucun fichier `.git` trouve dans Kalistar ni ses parents lors de l'audit.
- Aucun acces a l'IndexedDB personnelle du navigateur, aucune collection effacee
  ou reinitialisee.

Le service de bureau etait arrete lors du controle HTTP et a ete relance pour
un premier controle. Les fichiers `runtime.json` et `server.lock` ont donc change
normalement. La verification HTTP finale utilise un serveur de test isole qui
a ete referme ; elle ne depend pas de la persistance du service de bureau.
Le lanceur normal reste `V4/atelier/Lancer-Atelier.cmd`.

## Retour sur les copies temporaires

`restaurer-copies.ps1` verifie par defaut que les 72 copies peuvent etre
reconstituees sans ecraser un fichier existant. Son mode de controle a ete teste.
L'option `-Apply` les recree seulement si l'equivalent conserve a encore la bonne
empreinte. Aucune restauration n'a ete appliquee.

Si un fichier actif evolue lors d'une revision future, ne pas substituer sa
nouvelle version a une copie historique : retrouver la bonne version dans les
originaux de revision. Le script refuse une empreinte differente.

## Tracabilite

- `inventory-before.json` : inventaire initial et empreintes.
- `plan.json` : selection precise et equivalents conserves.
- `cleanup-journal.json` : suppressions et deplacements effectivement realises.
- `verification.json` : controle complet apres nettoyage.
- `audit.cjs`, `cleanup.ps1`, `verify.cjs` : controles et execution documentes.

Pour le transfert et les precautions Git :
[TRANSFERT_ET_GIT.md](../../docs/TRANSFERT_ET_GIT.md).
