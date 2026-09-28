# Vamp MGS2 - Au-dessus de l'abime

Modele `49173082`, identite `vamp-mgs`, faction `MGS2`.
Ajout demande le 28 septembre 2026 : levitation au-dessus du bassin de Big Shell,
bras ouverts, visage agressif legerement elargi, impact au front, joue coupee
et canines apparentes. Illustration via imagegen integre ; prompts exacts et
provenance des iterations dans `prompt.json`.

Source durable : `V4/Illustrations/Vamp_MGS2_Bassin.png`.
La scene, les mains et l'arme sont conserves pendant les retouches du visage.
Matieres peintes et plans colores selon les references Kalistar Momo / Valazar.
Le long manteau conserve de l'illustration selectionnee est une interpretation,
pas une reproduction exacte de la tenue portee pendant le combat du jeu.

## References

- Conception : https://www.konami.com/mg/archive/mgs2/english/chara/chara_vamp.html
- Impact au front : https://www.konami.com/mg/archive/mgs2/english/mr/secret_en.html
- Cinematique observee vers 00:58 : https://www.youtube.com/watch?v=CT1DKC_OjME&t=58s

La cinematique confirme la marque ronde centrale et la coupure sur sa joue
gauche. Les deux canines visibles correspondent a la demande de l'utilisateur.

## Gameplay

Race VAMP, Dague, HEMATO (Sang). Positions `[3,2,4]`, profil principal P3.
Faces de D6 a D1 :
- ATK : 228 / 188 magique / 150 / 110 / 70 magique / 32.
- DEF : 210 / 172 / esquive / 98 / 60 / 26.

Valeurs sous les plafonds P3, une esquive, aucune barriere ni effet de soutien.
Affinite locale Big Shell +10 ATK/DEF comme les autres personnages de l'arene.
Pas de nouvelle mecanique, race, arene ni preset. La validation de legalite
ne remplace pas des tests de taux de victoire.

## Production et verification

PSD editable : `V4/creations/49173082/card.psd`, PNG de meme nom.
Template 897 x 1497 inchange, textes natifs, objets dynamiques integres.
Banniere MGS2 blanche/bleu ciel validee du 27 septembre.

Commandes depuis la racine : `node V4/expansions/2026-09-28-vamp/build.cjs`
suivi de `prepare`, `render`, `verify` ou `publish`.
Le gel `freeze` a deja ete fait avant production : ne pas le refaire pour
masquer une difference. Les 38 references et 76 creations precedentes sont
protegees par le verrou et `existing-created.snapshot.json`.

Preuves natives : `cards/vamp/verification.json`. Typographie, code-barres,
pixels fixes et reouverture PSD controles avant publication.
Tests du profil : `model.test.cjs`. QA navigateur ordinateur/mobile : `qa/`.
Les snapshots des anciens lots restent des preuves historiques ; leurs hashes
ne doivent pas etre reecrits apres l'ajout d'une carte.
Publication limitee au depot personnel Kalistar ; aucun remplacement des
travaux UI et captures du site effectues par ailleurs.

Validation du lot : 37 tests cibles passent. Photoshop 26.11.7 : aucune
difference sur les pixels fixes ni lors de la reouverture ; code-barres decode
dans les quatre cas couleur/gris et deux echelles (impression non testee).
Chrome 1440 x 1000 et 390 x 844 : pas d'erreur, PNG natif identique et ecart
moyen de la vignette de 2.062 niveaux RGB. Catalogue porte a 115 cartes,
les 114 precedentes preservees, et toujours 28 arenes.
