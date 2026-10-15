# Kalistar 4.6.64 - Composition des cartes Protection

## Perimetre

- Illustration, medaillon, puissance et vignette du porteur a droite.
- Description, activation et noms des porteurs a gauche, lecture non retournee.
- Cadre existant reflechi autour du crop natif ; decoupe de l'illustration
  et ancres projetees dans le meme repere. Aucun nouveau bitmap.
- Zone cliquable du porteur alignee dans la collection et dans la fiche.
- Armes, Reliques, ancres de l'arene, moteur, definitions d'equipement,
  sauvegardes et cartes natives inchanges.

## Verification

- 28 tests cibles presentation, trois emplacements, categories et medias : PASS.
- 36 Protections controlees dans chaque viewport : PC 1440x1000,
  Razr 50 412x1007, telephone etroit 320x740 avec Reduced Motion.
- Aucun debordement de texte dans les fiches ; orientation des illustrations,
  noms et medaillons preservee. Cadre, bonus et porteur separes et alignes.
- Attribution, clic sur la vignette, retrait, reload et redimensionnement : PASS.
- Verification des dispositions Arme et Relique inchangees : PASS.
- Suite complete de publication : 85 invocations terminees, aucun echec.
- Build fige depuis l'index Git : 379 cartes, 1379 assets, 878.8 Mio.
  Les fichiers locaux non suivis sont exclus de cette copie.
- Test des 36 Protections relance sur ce build exact : PASS sur les trois formats.
- Test navigateur general du build : Collection, lecteur, export PNG, Decks,
  Arene, match sauvegarde et ajout de publication, aucun echec HTTP/JavaScript.
- Controle d'organisation apres staging et diff sans erreurs : PASS.

Commandes reproductibles :

```sh
npm test
npm run build
node V4/site/protection-layout.browser.test.cjs
node V4/deploy/browser.test.cjs
```

Les captures et journaux repetes restent dans
`work/qa/protection-layout/`, hors Git. Seul le rapport texte utile sera
publie ; aucun fichier graphique ajoute au stockage LFS.
Le premier lancement de la suite complete sans KALISTAR_NODE_MODULES a
signale marked manquant. Relance avec le runtime local configure.

[Resultats et empreintes du code](qa/verification.json).
Le workflow et la version des deux hebergeurs sont verifies apres le push.
