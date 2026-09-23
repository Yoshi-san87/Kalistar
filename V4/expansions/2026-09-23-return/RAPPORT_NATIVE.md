# Production native terminee - 24 septembre 2026

## Resultat

- 22 cartes avec PNG 897 x 1497, PSD natif 300 ppp et verification individuelle.
- 11 conversions canoniques conservent leur identifiant et leurs statistiques V3.
- Quatre variantes Kalistar et sept cartes NieR/Replicant ont un identifiant 4xxxxxxx.
- 31 creations anterieures et les 193 fichiers proteges existants sont preserves.
- Regression native complete : 27 references historiques et 11 nouveaux canoniques.
- Les 38 comparaisons de rendu et les 38 reouvertures PSD ont zero pixel different.
- Les 38 codes-barres de regression sont verifies sur les rendus effectifs.
- Le preflight de `publish.cjs` reussit : 22 cartes, 11 canoniques, 11 creations.
- Aucune publication, aucun commit et aucun push effectues par ce pipeline.

## Preuves

- `native-batch.json` : bilan et empreintes des 22 cartes natives, sans pretendre
  remplacer la regression du registre.
- `cards/<key>/verification.json` : controles natifs individuels, lies a leur
  preparation, PSD, PNG, profil et code-barres.
- `canonical-regression.json` : les 38 resultats, le plan candidat et ses sources.
- `canonical-regression/<key>/` : PNG, PNG de reouverture et etat natif des
  11 nouveaux canoniques, tous lies au rapport par SHA-256.
- Rapport historique portable :
  `evidence/old-regression/bc524e11-3f53-45b6-943b-1d8dc4108cec/verification.json`.
  SHA-256 : `8147bead52a9920920580743e46301f97d70f054ab6619e1aa57d07dd2f61f13`.
  La publication lit cette copie suivie, pas le job temporaire ignore par Git.

Reference actuelle preservee :
`6fbc1ace44f922a84ebb3f4608534c5d7ab88d23de47f404aa478b70e10f6ecc`.

Reference candidate, non publiee :
`4e489e527f047e2e6def3264718abb509cddb105cbc705bcd678ba0b20dc4bec`.

## Revisions explicites

Les tentatives precedentes et leurs preuves restent dans `attempts/`.
Lire `ATTEMPT-01.md` a `ATTEMPT-04.md` pour leur chronologie.

Trois recits ont ete raccourcis apres un debordement natif d'un pixel sur cinq
lignes : Commander, Kaine et Popola Replicant. Les autres champs des profils
sont identiques. Ni police, ni taille, ni interligne, ni cadre n'ont ete modifies.

Le controle herite de 2B/9S supposait une hauteur de nom <=35 px, incompatible
avec le nom accentue de Kaine, qui mesure 39 px a 10 pt. Le verificateur local
utilise maintenant les dimensions de 16 noms distincts mesurees independamment
dans Photoshop depuis le calque approuve. Les controles de police, style,
centrage et limites du bandeau restent stricts. Le code de composition et les
verificateurs partages n'ont pas ete modifies. La calibration est liee aux
preparations et ses sources sont verifiees par empreinte.

Julienne et Commander gardent leurs PSD/PNG visuellement revus, byte-identiques,
apres comparaison de leurs profils et composants puis nouvelle verification.
Voir `evidence/pilots-carried-forward-attempt-04.json`.

Kaine utilise le cadrage final fourni et revu par le parent, sans changement
de profil, de statistiques ou de crop. Lames et pommeaux sont degages.
Voir `evidence/kaine-art-revision-20260924-framing.json`. Image active SHA-256 :
`61615a12c884053fb27ae580350f812ba3e1697f545e4ede300d782ea3f4b2b2`.
Chaque source precedente et sa provenance sont archivees dans les revisions
art-c. Les prompts et chemins de requete generative restent conserves.

## Controles et relais

Les 21 tests du pipeline ont passe, dont la publication isolee de 22 cartes,
les archives portables, les refus de preuves alterees et le controle natif des
accents. Le parent a confirme sa revue des trois planches natives contenant
les 22 cartes et annonce ses 107 tests combines reussis. Cette revue technique
ne constitue pas une nouvelle approbation artistique implicite de l'utilisateur.

Photoshop en fin de controle : zero document ouvert, historique 50 et memoire
70 %, preferences non modifiees. Aucun render.lock residuel. Espace libre
observe : 129 306 710 016 octets. Aucun nettoyage externe effectue par ce worker.

Le parent conserve publication des cartes et de l'arene, QA finale du site et
Git. Refaire le preflight si une entree change avant la publication. Ne pas
modifier les anciens hashes ni regenerer un verrou pour masquer un ecart.
