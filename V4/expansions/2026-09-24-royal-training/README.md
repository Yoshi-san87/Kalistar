# Royal Training - production native

Lot additif de neuf nouvelles editions et sept revisions visuelles autorisees.
La publication et Git restent sous controle du parent. Voir CONTRACT.md et
PUBLICATION.md pour les perimetres, controles et reprises transactionnelles.

## Sources et selections

- `baseline/` et `capture.json` figent 80 cartes, 38 references, 42 creations et
  23 arenes avant ce lot. Aucun ancien verrou n'est regenere.
- `profiles-a.json` et `profiles-b.json` donnent les neuf profils; `set.json`
  porte leurs nouveaux identifiants deterministes. Les versions Aelis/Kaylis
  conservent leur characterId pour interdire le cumul de versions en deck.
- Aelis historique V2 est explicitement reequilibree selon V4, role Support 5,
  positions 3 et 5. Ce n'est pas une exception aux bornes V4.
- `art-a/selection.json` et `art-b/READY-B.json` figent les selections parent.
  Les demandes exactes restent dans les dossiers art; elles ne concernent que
  les illustrations, jamais une regeneration du cadre.
- `retouches/provenance.json` documente les trois images parent finales:
  Darnako, Xiaomi lame orientee vers l'interieur, Ruby aux cheveux noirs.
- Kainé et Capitaine Skully gardent leur illustration avec un zoom natif de
  1.12 autorise. Les sept revisions ne changent aucun texte ni gameplay.

## Tentatives conservees

1. `attempts/01-mixed-text-inspection`: inspection des legendes ATK/DEF a styles
   mixtes. Le controle compare leurs plages de styles natives exactes; aucune
   modification typographique de production.
2. `attempts/02-solaria-native-shadow`: le calque OMBRE d'origine est raster,
   pas objet dynamique. Le nouveau controle preserve ce type, son opacite et
   ses effets, sans conversion artificielle.
3. `attempts/03-solaria-mask-channel`: correction du descripteur Make-mask
   suivant `scripts/momo-bottom/refine-flag-barcode.jsx` (Nw/Chnl). L'ancienne
   preparation et les sorties partielles sont conservees, pas re-hashees.
4. `attempts/04-final-b-art-selection`: selection explicite des trois images B
   V2. Seuls les champs art de Brindor, Asteran et Ornelle changent, avant toute
   preparation des neuf cartes. Les autres champs sont compares exactement.
5. `attempts/05-ornelle-description`: le premier rendu a cinq lignes passait le
   cadre technique, mais touchait visuellement la pointe du cristal. Le parent
   a fourni un recit plus court. Seul ce texte est revise, sans toucher aux
   fontes, tailles, positions, image ou statistiques. L'ancienne carte et les
   profils/set avant et apres sont preserves; les huit autres cartes restent
   byte-identiques. `evidence/ornelle-description.json` prouve quatre lignes et
   zero pixel change hors recit. Les preuves artistiques B ne sont pas reecrites.

Les revisions Darnako/Ruby/Kaine/Skully/Xiaomi utilisent `revisions.cjs/jsx`.
Solaria utilise l'adaptateur isole `solaria.cjs/jsx`; sa correction n'a pas
invalide les preparations d'illustration deja verifiees.

## Etat technique au 25 septembre 2026

- Sept revisions exportees en PSD natifs et PNG, puis rouvertes et verifiees.
  Chaque `revisions/<key>/verification.json` prouve zero difference hors zone
  autorisee, zero difference de reouverture, textes/styles/calques invariants
  et decodage du code-barres. Originaux byte-identiques dans `originals/`.
- Solaria: suppression alpha seulement du parasite inferieur, RGB intact,
  ombre de suspension conservee. Les banques candidates sont dans `components/`
  et `audit/solaria/`; aucune modification V3. Le packed utile reste aux memes
  coordonnees (667,829), dimensions 109x168, sans redimensionnement.
- Neuf profils et ressources controles; neuf noms calibres sur les glyphes
  natifs. Neuf cartes exportees, reouvertes et verifiees, Ornelle finale incluse.
  Les rapports sont dans `cards/<key>/verification.json` et les trois planches
  de revue dans `visual-review/native/`.
- Tests pipeline: 18 passes. Tests transaction: 23 passes. Tests domaine
  regression/publication: 10 passes. Revision narrative ciblee: 10 passes.
- Regression native 38/38 reussie: `evidence/native-regression/report.json`.
  Zero difference avec les PNG candidats, zero difference a la reouverture,
  champs natifs conformes et 38 codes-barres decodes. Le registre actif n'a pas
  ete modifie pour cette verification.
- Preflight concluant: 89 cartes, 38 references, 51 creations, 23 arenes et
  80 destinations exactes. `evidence/preflight.json` conserve la liste
  `files[].to`, les hashes avant/apres et les rapports natifs lies.
- Publication non effectuee; accord parent explicite toujours requis. Aucun
  Git ni changement V3/site par la sequence native. Apres publication, utiliser
  les `files[].to` du journal reel pour la copie ciblee, jamais une synchro du
  site entier. `published.json` n'existe qu'apres installation transactionnelle.

## Execution

Une seule sequence Photoshop sous mutex. Preserver preferences et documents
utilisateur; fermer uniquement les documents ouverts par le pipeline.
Ne jamais nettoyer des fichiers externes en cas de saturation du disque.

1. `calibrate-typography.cjs --native-authorized`: mesure des noms reels et
   preflight des descriptions, avec les fontes/tailles natives verrouillees.
2. `build.cjs prepare`, puis `build.cjs render --native-authorized`, puis
   `build.cjs verify`: sorties sous `cards/<key>/`, PSD editables conserves.
3. `regression.cjs --native-authorized`: 38 references candidates, preuves
   portables sous `evidence/native-regression/`, sans remplacer le registre.
4. Parent seulement: revue puis preflight/publication suivant PUBLICATION.md.

Les tests et modules transactionnels ne font pas partie des sources de rendu
capturees. Ne modifier aucun code capture apres preparation sans archivage et
revision explicites. Les hashes sont des preuves, pas des valeurs a renouveler
pour faire passer un controle.
