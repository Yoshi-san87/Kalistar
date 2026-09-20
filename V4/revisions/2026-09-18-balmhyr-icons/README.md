# Revision Balmhyr et icones Hache / NAIN

Revision publiee et verifiee le 18 septembre 2026. Les deux PSD actifs et leurs
PNG sont corriges; les anciennes versions sont conservees sous `originals/`.
Le verrou actif est `776dc4d80df6962de648b1553c1ae6868ffa95a10eefe8982fe1e0e38c82ce1a`.

Preuves: `verification.json` pour les deux cartes, `complete.json` pour les
fichiers actifs et le serveur. Regression native des 26 references reussie:
`../../atelier/data/jobs/da823271-ddd0-4c19-8533-54258688e0d8/verification.json`.
Les 53 tests du site sont passes. Aucun modele ni exemplaire n'a ete cree.

Le cadre fixe, les textes et les statistiques restent identiques. L'icone NAIN
et la Hache ont un contour maximal de 42,852 px pour un rayon utile de 44 px;
leur ecart au centre optique est inferieur a 0,481 px par axe. Leur recomposition
depuis les donneurs V3, y compris par le vrai `E.bind` revise, reproduit les
sprites a zero pixel different. Les 24 autres cartes et les 416 autres
composants du pack sont inchanges. L'illustration Canyonero et son prompt sont
documentes dans `artwork-provenance.md`.

## Perimetre

- Balmhyr reste le modele `30000007`, Lok le modele `30000018`.
- Les chemins PSD/PNG/profil actifs restent ceux du verrou. Aucun nouveau modele,
  aucune modification des statistiques, du texte, des autres 24 cartes ou de V3.
- Seul le profil Balmhyr change `artworkSource` vers
  `V4/assets/illustrations/elements-01/terre-plantes/BALMHYR_V4_02_CANYONERO.png`.
- Les deux banques Hache / NAIN rendent la calibration disponible dans l'Atelier
  pour toutes les nouvelles V4. La calibration du helper `E.bind`, si necessaire,
  doit etre fournie sous forme de fichier stage et audite, jamais editee ici.

## Entrees du publisher

Tous les chemins du plan et des empreintes sont relatifs a la racine Kalistar,
avec `/`. Toutes les sources a installer sont sous
`V4/revisions/2026-09-18-balmhyr-icons/staged/`. Les cibles sont explicites.
Les JSON stages sont des documents complets, pas des patches.

`references-before.json` est une copie exacte du verrou actif a 166 sources :
`af17ee6bd1c0aba0771193bbe87d2498e1ffee55df90c5506507740b667af4ea`.
Une divergence du verrou ou d'une source protegeable bloque la migration.

`plan.json` :

```json
{
  "revision": "balmhyr-icons-2026-09-18",
  "referenceId": "af17ee6bd1c0aba0771193bbe87d2498e1ffee55df90c5506507740b667af4ea",
  "items": [
    {
      "key": "balmhyr",
      "psd": "V4/templates/BALMHYR_V4_01_MINERO.psd",
      "png": "V4/cartes/BALMHYR_V4_01_MINERO.png",
      "profile": "V4/template-stable/elements-01/balmhyr/card.json",
      "report": "V4/template-stable/elements-01/balmhyr/render.json",
      "destination": "V4/revisions/2026-09-18-balmhyr-icons/staged/balmhyr"
    },
    {
      "key": "lok",
      "psd": "V4/templates/LOK_V4_01_MINERO.psd",
      "png": "V4/cartes/LOK_V4_01_MINERO.png",
      "profile": "V4/template-stable/elements-01/lok/card.json",
      "report": "V4/template-stable/elements-01/lok/render.json",
      "destination": "V4/revisions/2026-09-18-balmhyr-icons/staged/lok"
    }
  ],
  "install": [],
  "jsonUpdates": [],
  "protect": []
}
```

`prepare-publication.cjs --prepare` remplit ces listes APRES une premiere
verification native reussie. Il ne modifie que le plan et les fichiers sous cette
revision; il ne touche pas aux cibles actives et ne lance pas Photoshop.

Le preparateur attend les sorties plein canevas `staged/balmhyr/weapon-bank.png`
et `staged/lok/race-bank.png`. Il extrait sans redimensionnement les pixels
d'alpha non nul : marge de 4 px pour le brut, enveloppe exacte pour le packed.
Il verifie en memoire que tous les pixels des zones extraites sont inchanges.
Il copie `calibration.json` vers `staged/icon-layouts.json`, dont la cible est
`V4/template-stable/icon-layouts.json`. Le helper utilise le fichier deja fourni
par le parent, `staged/elements-common.jsx`.

Le plan genere utilise une seule liste `install`, avec les PSD/PNG des items,
les JSON complets et tous les composants. Cela correspond au verificateur parent
qui calcule `installHashes` pour chaque `plan.install`. Relancer ce verificateur
apres preparation; le publisher refuse un audit incomplet ou obsolete.

Contrat detaille pour une preparation manuelle equivalente :

- Chaque `destination` contient `card.psd`, `card.png`, `native.json`. Ce dernier
  contient `{before,reopened,width:897,height:1497,resolution:300}`. Les deux
  tableaux de calques doivent etre non vides.
- `install: [{from,to}]` fournit les quatre PNG de banque ci-dessous, le helper
  calibre si requis, et l'illustration si elle n'existe pas encore a sa nouvelle
  adresse finale. Une illustration deja presente doit etre auditee et protegee.
- `jsonUpdates: [{from,to}]` reste accepte en alternative aux entrees JSON de
  `install`; ne pas declarer deux fois une meme cible. Fournir les deux profils,
  les deux `render.json`,
  les manifests `elements-01/manifest.json`, `elements-02/manifest.json`,
  `current-elements.json` et les deux manifests du pack ci-dessous.
- Les rapports stages ont `card` egal au nouveau profil et `before` / `reopened`
  identiques au `native.json` audite. Conserver les autres preuves historiques.
- Les deux profils sont copies du snapshot approuve, hormis `artworkSource`
  de Balmhyr. Garder les accents et tous les autres champs a l'identique.
- Dans `elements-01/manifest.json`, remplacer seulement les snapshots des deux
  cartes par les profils stages. Dans `current-elements.json`, changer seulement
  `cards[balmhyr].artwork`. Garder `frameRevision` et les autres cartes intacts.
  Les cles et anciennes valeurs des `protectedFiles` imbriques sont conservees
  dans le staging : le publisher actualise uniquement les dependances remplacees.
- `protect` declare explicitement toute nouvelle protection : nouvelle
  illustration, quatre PNG de banque, eventuel nouveau helper et les quatre
  preuves `plan.json`, `verification.json`, `references-before.json`, `publish.cjs`
  de cette revision. Un fichier deja protege n'a pas besoin d'y etre repete.

`verification.json` exige `revision`, `originalReferenceId`, `passed:true`,
exactement deux `results` pour `balmhyr` et `lok`, `installHashes` et
`calibrationHash`. Chaque resultat a `passed:true`, `psdHash`, `pngHash`,
`nativeHash`, `comparison.outside:0`, `roundtrip.changed:0` et
`barcode:{passed:true,expected:<ID inchange>,...}`. Le publisher consomme ces
preuves; il ne les fabrique pas et n'appelle pas Photoshop.

`installHashes` associe chaque chemin CIBLE a l'empreinte SHA-256 exacte de son
fichier stage, y compris les quatre PSD/PNG implicites des items et tous les
`install` / `jsonUpdates`. Aucune cle manquante ou supplementaire n'est admise.
`componentHashes` est optionnel; s'il est fourni, il utilise aussi des chemins
cibles relatifs a Kalistar et toutes ses valeurs sont controlees. Les quatre PNG
de banque et l'illustration doivent etre couverts par cette table ou par
`installHashes`. Le preparateur les inclut tous dans `install`. Les empreintes
du `native.json` sont dans `results`; celles des JSON generes par le publisher
sont dans le journal et le recu, pas dans `installHashes`.

## Migration exacte du pack

Le pack final courant est `V4/atelier/designer-assets/manifest.json` (`ready`).
Le pack brut est `V4/atelier/designer-assets/manifest.raw.json`
(`components-extracted`, sans table `hashes` actuellement).

| Manifest | Descripteur | Fichier relatif au pack | Geometrie AVANT revision |
| --- | --- | --- | --- |
| final | `weapons.Hache` | `packed/banks/weapon-Hache.png` | 89,1116 / 96x95 |
| final | `races.NAIN` | `packed/banks/race-NAIN.png` | 711,1116 / 96x95 |
| raw | `weapons.Hache` | `banks/weapon-Hache.png` | 85,1112 / 104x103 |
| raw | `races.NAIN` | `banks/race-NAIN.png` | 707,1112 / 104x103 |

Les geometries ci-dessus sont informatives, pas les nouvelles cibles optiques.
Le parent doit exporter les quatre fichiers verifies et renseigner leurs vrais
`left,top,width,height` dans les manifests stages. Ne pas copier le PNG brut sur
le packed sans recalculer son recadrage et son descripteur. Conserver les noms,
les autres banques, `nativeExportFile`, `sources`, `textStyles` et le reste du
pack. Ne pas relancer l'extraction globale ou restaurer un pack historique.
Seuls les descripteurs Hache / NAIN recoivent un `iconRevision` indiquant
`scope: this-icon-bank-only`, les chemins d'audit/preparation et
`regressionRequired:true`. La liste `sources` reste strictement identique.
Les nouvelles empreintes des deux cartes sont dans `publication-inputs.json`.

Le publisher verifie les 418 hashes existants du pack final, conserve ceux des
416 autres composants, puis actualise seulement les deux hashes packed. Il
ajoute au raw les deux hashes des banques brutes. Le staging conserve l'ancien
`referenceId`; apres calcul du nouveau verrou, le publisher injecte le nouvel
ID dans les deux manifests. Ce sont les seules transformations supplementaires
des JSON du pack. `manifest.partial.json` reste un artefact historique inactif.

Les manifests du pack ne doivent PAS etre ajoutes a `protectedFiles` : leur
`referenceId` depend de ce verrou, ce qui creerait une boucle de hachage. Les
quatre PNG sont proteges directement et les empreintes finales des manifests
sont consignees dans `transaction.json` et `published.json`.

`publication-inputs.json` est un nouveau rapport de preparation limite aux deux
banques. Il expose les sources plein canevas, recadrages, hashes, et
`fullPackComparisonPerformed:false`. Il n'ecrase ni ne renouvelle
`designer-assets/verification.json` ou ses anciennes preuves globales. Son
`nativeVerificationHash` correspond au premier audit, avant ajout de la liste
complete des installations; le second audit est celui accepte par le publisher.

## Transaction et reprise

Le parent doit arreter le service Atelier et toute production concurrente avant
publication ou rollback, puis verifier qu'aucun processus ne possede Photoshop.
Le publisher acquiert `atelier/data/render.lock` exclusivement; il ne supprime
jamais automatiquement un verrou existant et ne lance aucun processus natif.

Sequence reservee au parent (les scripts n'ont pas ete executes par leur auteur) :

```text
node V4/revisions/2026-09-18-balmhyr-icons/verify.cjs
node V4/revisions/2026-09-18-balmhyr-icons/prepare-publication.cjs --prepare
node V4/revisions/2026-09-18-balmhyr-icons/verify.cjs
node V4/revisions/2026-09-18-balmhyr-icons/publish.cjs --publish
```

En cas d'interruption uniquement : `node publish.cjs --rollback` depuis ce dossier.

Sans argument explicite, aucune publication. Importer le module ne l'execute pas.
Un journal existant bloque toute nouvelle publication.

La transaction verifie toutes les preuves et les sources, sauvegarde les cibles
existantes sous `originals/<chemin relatif>`, prepare toutes les nouvelles
versions, puis remplace les fichiers par rename atomique individuel. Le verrou
de references est migre explicitement avec `parentReferenceId`, audit et
snapshots des profils. Aucune ancienne protection n'est retiree.

Ce n'est pas une atomicite multi-fichiers face a une panne machine. Le journal
durable distingue `preparing`, `applying`, `committed`, `rolled-back`. Les erreurs
ordinaires restaurent les sauvegardes et retirent uniquement les nouvelles
cibles de cette transaction. Une panne impose inspection et `--rollback` avant
reprise du service. Si `render.lock` subsiste, verifier d'abord que son PID est
mort et qu'il appartient a cette revision; seul le parent peut le retirer.

Le rollback verifie tous les hashes avant sa premiere restauration. Il refuse
d'ecraser une modification tierce, une sauvegarde alteree ou une publication
deja `committed`. Un echec de rollback conserve le verrou pour investigation.
Apres rollback, conserver et archiver le journal, `originals/` et `transaction/`
avant une nouvelle tentative; ne pas reutiliser aveuglement leurs sauvegardes.

La migration ecrit une regression `passed:false`, `results:[]`, associee au
nouvel ID, et un recu `regressionRequired:true`. L'ancien rapport est sauvegarde.
Seule l'execution reelle des 26 modeles par le parent peut rouvrir cette porte.
Le publisher ne pretend ni valider les nouveaux rendus, ni approuver le pack,
ni reussir la regression a la place de ces controles.
