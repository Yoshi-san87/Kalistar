# Kalistar 4.6.65 - Publication directe et depot leger

## Perimetre

- Le projet Cloudflare `kalistar` et son origine /jeu/ restent identiques.
- Publication depuis un commit fige sur le PC, sans build distant ni LFS.
- Code, profils, verrous et registre SHA-256 dans Git ; medias et sources natives
  aux memes chemins physiques sur le poste et dans la sauvegarde privee.
- Nouveau controle anti-retour des binaires et suite repository sans medias.
- Toutes les invocations de validation completes restent presentes en local.
- Aucune modification de moteur, equipement, catalogue, carte native ou save.
- Version PC/telephone et assertions 4.6.65 mises a jour ensemble.

## Migration verifiee

La premiere publication directe a ete faite depuis le commit 4.6.64 exact :
379 cartes, 1379 assets, 878.8 Mio. La construction a exclu les brouillons
non suivis. Verification navigateur PC/phone en local puis sur Cloudflare :
Collection, lecteur, export PNG, Decks, Arene, partie sauvegardee/reload et
publication additive sans erreur HTTP ni JavaScript.

Preview f9a8f1b1 et premiere production directe 2e42dba1. Les previews gardent
leur protection Cloudflare Access. Les builds Git Cloudflare sont desactives
pour production et preview, sans modifier la securite d'acces.

La sauvegarde privee contient un bundle Git complet, les sources courantes et
14 465 objets LFS historiques identifies, sans objet manquant. Les 238 derniers
objets, 316 060 421 octets, ont ete recuperes individuellement et verifies par
SHA-256. Aucun fetch LFS global. Les originaux locaux ne sont pas supprimes.

Une purge GitHub ou recreation reste une operation distincte exigeant l'accord
explicite du proprietaire. Ce rapport ne pretend pas que retirer les fichiers
de l'index libere le stockage des anciennes versions.

## Verification 4.6.65

- 86 invocations de validation complete : 1 227 tests annonces, 1 226 reussis,
  aucun echec et un skip deja present.
- 27 tests de la suite repository reussis dans une exportation sans images.
- Construction depuis un commit candidat sans medias suivis : 379 cartes,
  1379 assets, 921 451 368 octets, aucun telechargement LFS.
- Test navigateur du build fige : PC et phone, Collection, lecteur, export PNG,
  Decks, Arene, sauvegarde/reload et ajout de publication, tous reussis.
- 30 485 fichiers retires uniquement de l'index ; aucune suppression physique,
  tailles locales controlees apres l'operation.
- Les verrous, manifests natifs, catalogue, moteur, local-db et .gitattributes
  sont inchanges dans le diff. Tous les anciens rapports texte restent intacts.
- Le push de cette livraison reste non destructif : il n'efface aucun ancien
  commit/tag distant et ne pretend pas reduire le quota LFS historique.

Les captures PC/phone ont ete ouvertes et controlees. La verification du site
public et de la suite GitHub est effectuee apres la livraison, avant annonce.

Les captures, journaux et sauvegardes restent hors Git sous work/qa et dans le
dossier prive de Documents. Les preuves natives et anciens rapports ne sont
pas reecrits pour contourner une validation.

## Reproduire

```sh
npm run check
npm test
npm run media:refresh
npm run prepare:release
```

Tester le dist fige avec KALISTAR_DIST, puis suivre le guide de deploiement.
Le runner GitHub execute la suite repository sans telecharger d'image.
