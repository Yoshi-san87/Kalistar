# Integration canonique de Voloden

Publication terminee et verifiee par la tache parente le 2026-09-18.
Le catalogue jouable et la galerie contiennent 27 references approuvees.
Le nouveau verrou est
`aaee4023166e9997f865e9972caddb34022764b8d3ed5e1d53c30e68adcc1ace`.

## Verification finale

- Regression native `94710c8d-465c-4158-bcea-b9f4e6d0aba4` : les 27 cartes
  identiques apres composition et reouverture PSD, codes-barres controles.
- 54 tests Atelier, publication et jeu passes. Voir `complete.json` pour
  l'audit des fichiers, du catalogue HTTP et de l'image effectivement servie.
- Collection verifiee visuellement dans le navigateur : Voloden, un exemplaire
  au compte Paris, 27 / 27 versions. Aucun transfert de collection reelle effectue.
- 8 scenarios IndexedDB controles dans un navigateur isole. Les sauvegardes
  schema 3 precedant l'ajout canonique sont acceptees en preservant les nouveaux
  exemplaires et leurs preuves de propriete. Les controles de falsification,
  conflits et edition restent actifs. Voir `backup-verification.json`.
- Le PSD natif, le PNG final et les deux nouvelles banques sont installes.
  Les anciennes cartes et les 418 anciens composants restent inchanges.

Les sections suivantes documentent le protocole de publication deja execute.

## Perimetre

Voloden conserve son ID V3 `30000028`, ses mecaniques et son illustration
approuvee `V3/assets/illustrations/28_NECRO_VOLODEN.png`. Il devient une reference
V4 canonique supplementaire, pas une creation utilisateur `D.create`.

Le verrou de depart est
`776dc4d80df6962de648b1553c1ae6868ffa95a10eefe8982fe1e0e38c82ce1a`, avec 176
fichiers proteges. Toutes les protections et entrees existantes sont conservees.
Deux anciennes sources protegees sont explicitement remplacees :
`current-elements.json`, par ajout d'une entree finale, et `icon-layouts.json`,
par ajout de `weapon.Faucille` et `race.CARDEMORTIS`. Tous les anciens champs,
cartes et calibrages sont conserves integralement.
Les anciens PSD/PNG/profils/rapports, les helpers, les maitres, les registres,
et la base de creations utilisateur ne sont pas modifies.

Nouvelles sorties :

- `V4/templates/VOLODEN_V4_01_NECRO.psd`
- `V4/cartes/VOLODEN_V4_01_NECRO.png`
- `V4/template-stable/voloden/card.json`
- `V4/template-stable/voloden/render.json`

Le profil est deja utilise par les scripts natifs du parent a sa future adresse
active. C'est la seule exception au controle d'absence des nouveaux fichiers :
il peut exister si ses octets sont strictement ceux du profil stage et audite.
Il est conserve identiquement, sauvegarde et ajoute au verrou. Toutes les autres
nouvelles sorties doivent etre absentes avant publication.

## Contrat parent

Les chemins sont relatifs a Kalistar avec `/`. `plan.json` utilise les champs
deja prepares par le parent : `revision`, `referenceId`, `key:voloden`, `profile`,
`psd`, `png`, `report`, `destination`, `sourceHashes`, `install`, `protect`.
`destination` vaut `V4/revisions/2026-09-18-voloden/staged`.

`references-before.json` est le snapshot exact du verrou. `sourceHashes` associe
les trois sources V3 (PSD, illustration, `V3/donnees/cartes.json`) a leurs SHA-256.
Le publisher verifie leur contenu et les ajoute/conserve dans les protections.

`verification.json` doit contenir :

```text
revision, originalReferenceId, modelId: "30000028", passed: true
psdHash, pngHash, nativeHash, profileHash, layoutHash
fixed: {changed: 0, ...}, roundtrip: {changed: 0, ...}
repeat: {changed: 0, ...}, illustration: {changed: 0, ...}, icons
barcode: {passed: true, expected: "30000028", ...}
sourcesUnchanged: true
installHashes: {"chemin CIBLE": "sha256 du fichier stage", ...}
```

Le contrat correspond au `verify.cjs` plat du parent. Les trois empreintes de
`plan.sourceHashes` sont toutes controlees directement. Un `sourceSnapshot`
optionnel, s'il est fourni, doit etre egal a cette table. Les empreintes des sorties
sont controlees sur `staged/card.psd`, `staged/card.png`, `staged/native.json`.
Les preuves du verifier parent doivent couvrir egalement l'identite de l'art,
le texte natif, les contours optiques, la repetition et les codes-barres. Le
publisher ne remplace pas ces mesures et n'appelle pas Photoshop.

`native.json` est le rapport E.bind complet : `card`, `registry`, `before`,
`after`, `reopened`, `width:897`, `height:1497`, `resolution:300`, etc.
Le preparateur conserve ce rapport integralement dans le nouveau `render.json`.
Il derive seulement la nouvelle entree de references selon `freeze.cjs` :
filtrage des variantes par les vrais noms de calques, options d'effets par face,
polices natives, couche d'art et registre de la carte. Il ne relance jamais
`freeze.cjs` et ne recalcule pas les anciennes entrees.

`staged/reference-entry.json` est fourni pour inspection. Le publisher recalcule
cette entree a partir du profil/rapport audites et exige l'egalite avant ajout.
Le `staged/icon-layouts.json` fourni par le parent doit correspondre au champ
`iconLayouts` du rapport natif audite (precision numerique 1e-8 comme le verifier,
pour la serialisation ExtendScript). Ses octets sont figes par `layoutHash`.
Il est installe explicitement. Retirer les
deux nouvelles cles de ce document doit restituer exactement le document actif,
y compris ses champs de provenance existants. Aucun ancien calibrage n'est
recalcule. Le helper E.bind existant dispose ainsi des deux nouvelles entrees.

## Preparation sans publication

Apres un premier audit natif valide, `prepare-publication.cjs --prepare` :

- copie les octets du profil existant dans le staging et conserve le rapport ;
- prepare le catalogue append-only et l'entree canonique ;
- extrait les nouvelles banques de `staged/weapon-bank.png` et
  `staged/race-bank.png`, toutes deux plein canevas 897 x 1497 ;
- conserve une marge alpha de 4 px pour le brut et une enveloppe alpha exacte
  pour le packed, sans changement de taille, couleur ou transparence ;
- cree la liste complete `plan.install` et ses protections explicites.

Fichiers de banques, sous `V4/atelier/designer-assets/` :

```text
banks/weapon-Faucille.png
banks/race-CARDEMORTIS.png
packed/banks/weapon-Faucille.png
packed/banks/race-CARDEMORTIS.png
```

Seules les nouvelles cles `weapons.Faucille`, `races.CARDEMORTIS`, leurs hashes
et une source Voloden sont ajoutees aux deux manifests. Toutes les anciennes
entrees, les 418 hashes du pack final et les fichiers correspondants doivent
rester identiques. Le pack final comporte ainsi 420 composants, sans renouveler
les anciennes preuves globales. `publication-inputs.json` est un rapport limite
a cette carte et aux deux banques : `fullPackComparisonPerformed:false`.

Le preparateur ne modifie aucun fichier actif. Les JSON stages gardent l'ancien
`referenceId`; le publisher injecte le nouvel ID apres calcul du verrou. Les
manifests de pack restent hors `protectedFiles` pour eviter un hash circulaire.
Leurs empreintes finales figurent dans le journal et le recu de publication.

`install` contient exactement les quatre sorties de carte, les quatre banques,
`current-elements.json`, `icon-layouts.json`, `manifest.json` et `manifest.raw.json`. Chaque entree
est `{from,to}`, avec `from` sous `staged/`. Le verifier parent doit renseigner
`installHashes` pour ces douze cibles apres preparation. Aucune installation de
helper, registre, maitre ou ancien composant n'est acceptee.

## Publication et reprise

Sequence reservee au parent :

```text
node V4/revisions/2026-09-18-voloden/verify.cjs
node V4/revisions/2026-09-18-voloden/prepare-publication.cjs --prepare
node V4/revisions/2026-09-18-voloden/verify.cjs
node V4/revisions/2026-09-18-voloden/publish.cjs --publish
```

Arreter le service Atelier et toute production concurrente avant publication.
Le verrou partage `atelier/data/render.lock` est acquis exclusivement; un verrou
existant n'est jamais vole. Importer les modules ne les execute pas.

Le publisher verifie tout avant installation, copie les anciens fichiers dans
`originals/<chemin relatif>`, prepare les nouvelles versions puis remplace les
fichiers individuellement par rename. Les references sont clonees puis enrichies
de Voloden et des nouvelles protections, avec `parentReferenceId` et l'audit.
Le fichier `publish.cjs` fait partie des preuves protegees : ne pas le modifier
apres migration pour changer retroactivement le publisher approuve.

Une exception declenche un rollback verifie. Une interruption machine n'est pas
une transaction atomique multi-fichiers : garder le service arrete, inspecter
`transaction.json` puis lancer `publish.cjs --rollback`. Si le verrou subsiste,
le parent doit confirmer la mort de son PID/proprietaire avant de le retirer.
Le rollback refuse toute modification tierce, sauvegarde alteree ou transaction
deja `committed`; un echec laisse le verrou pour investigation. Les nouvelles
cibles sont retirees et les anciennes restaurees. Le profil deja present est
preserve. Un journal existant interdit une nouvelle tentative automatique.

La migration invalide explicitement l'ancienne regression : `passed:false`,
`results:[]`, nouvel ID et `regressionRequired:true`. Le recu conserve cette
obligation. Seul le vrai passage des 27 references par le parent peut declarer
la regression reussie. Aucun test ailleurs n'est modifie par ces scripts.
