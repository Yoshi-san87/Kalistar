# Pret pour le GO natif

Etat du 27 septembre 2026 : preparation exploratoire terminee, PAS de rendu
Photoshop, PAS de publication, PAS de gel des dependances.

## Controle realise

- 13 tests passes, zero echec (`pipeline.test.cjs`). Plafonds, restrictions,
  identites partagees, factions distinctes, couverture 2, preservation du
  catalogue/arenes et transactions en memoire avec pannes injectees.
- `build.cjs check` : 13 cartes, aucun fichier manquant, gel encore absent.
- Catalogue observe : 100 cartes ; ajout simule : 113. Aucune arene ajoutee.
- Les 13 illustrations copiees restent strictement identiques aux sources
  fournies. Le cadrage est un rectangle explicite puis redimensionnement
  proportionnel, sans peinture ni patch sur les cartes.
- Fanions MGS1/MGS2/MGS4 : empreintes fournisseur, dimensions natives et canal
  alpha identique au fanion FF8 approuve verifies.
- Descriptions : quatre lignes maximum dans les apercus. Les textes natifs,
  Times New Roman, le roundtrip PSD et les lectures du barcode restent a verifier.
- Contact-sheet examinee : `preview-contact-13.jpg`. Voloden a ete recadre
  verticalement pour que son front et ses cheveux ne touchent plus le bandeau.
  Son visage, la main pensive et la mine restent clairement visibles.
- Les canons d'Ocelot et de Wolf sont partiellement masques par les colonnes
  dans leurs images utilisateur, comme le bout du canon de Raven. Ne pas
  confondre avec une arme deformee : aucun element n'a ete reconstruit. Les
  visages, mains et corps des armes restent lisibles ; jugement final au parent.

## Ordre restant, impose par le parent

1. Fin et publication des icones Faucille/Tome, puis regression des 38 references.
2. Fin des trois revisions Auron/Kaylis/Lanio.
3. GO explicite pour ce lot seulement : gel des dependances et de l'inventaire
   des anciennes creations, preparation finale, 13 rendus serialises, verification.
4. Controle visuel parent des vrais PNG natifs et des PSD, preflight publication.
5. Publication active et Git par le parent ou sur son GO explicite.

Ne pas creer `dependencies.json` ou `existing-created.snapshot.json` tant que
les deux premiers points ne sont pas termines. Les apercus montrent encore les
icones disponibles au moment de leur composition ; la preparation finale
utilisera les nouvelles banques approuvees.

## Fichiers de ce lot

- `set.json`, `model.cjs` : les 13 profils, identites, choix gameplay et validation.
- `assets.cjs` : integration des trois fanions du parent, geometrie controlee.
- `build.cjs`, `freeze.cjs`, `preservation.cjs` : preparation, gel unique et garde.
- `compose.jsx`, `compose-one.jsx`, `render.ps1` : composition native serialisee.
- `publication-core.cjs`, `publish.cjs` : publication additive atomique, idempotente.
- `pipeline.test.cjs`, `test-fixture.cjs` : tests sans publication reelle.
- `preview-contact.cjs` : planche d'aperus ou de rendus natifs verifies.
- `README.md`, `READY.md` : choix, provenance, limites et marche a suivre.
- `cards/<13 cles>/profile.json`, `illustration.png`, `preview.png`,
  `art-preparation.json` : profils et copies sources avec empreintes/cadrages.
- `draft-review.json`, `preview-contact-13.jpg`, `preview-contact-13.json` : QA.

`art-flags/` a uniquement ete lu : les fichiers appartiennent au parent.
Aucun fichier actif de site, banque d'icones, creation ou catalogue n'a ete ecrit.
