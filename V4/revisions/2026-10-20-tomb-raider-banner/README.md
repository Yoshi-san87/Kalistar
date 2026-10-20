# Tomb Raider : proportions de la banniere

Revision demandee le 20 octobre 2026. La premiere insertion redimensionnait
la source en `fit: fill` : la rose des vents devenait ovale. La nouvelle
source reprend le tissu turquoise, le cuir et le monogramme TR dore avec
une composition raccourcie. Sa mise a l'echelle est uniforme (`cover`, ancrage
haut), puis le contour natif existant decoupe le tissu, jamais le medaillon.

- Geometrie inchangee : calque 98 x 223 a (672, 829), carte 897 x 1497.
- Cinq editions 49903101 a 49903105 : seul le calque FACTION est remplace.
- Illustrations, profils, textes editables, positions, Kalistels et codes-barres
  restent inchanges. Verification pixel par pixel hors du rectangle autorise.
- `originals/` et le lot du 18 octobre conservent leurs sources et empreintes.
- Le web utilise `TOMBRAIDER-native-v2.png`; l'asset initial reste intact.
- Source generee avec l'outil image_gen integre ; prompt et references dans
  `asset-provenance.json`. Le compositing natif est deterministe.

Production : `node revise.cjs prepare`, `node render-native.cjs`,
`node revise.cjs verify`, puis `node revise.cjs publish`.
Le rendu exige Photoshop 26.11.8 et le verrou de production existant.
Le premier placement generique a ete refuse par le controle pixel (interpolation
du PNG 72 dpi). `replace-native.jsx` utilise le transplant pixel exact du
composeur de bannieres existant. Le premier essai est conserve sous work/qa ;
les entrees initiales ne sont pas reecrites. `render-inputs.json` fige le correctif.
Le wrapper cree aussi le dossier de logs avant de lancer Photoshop.
Tests : `node --test V4/revisions/2026-10-20-tomb-raider-banner/integration.test.cjs`.
Les galeries et tests navigateur Lara verifient les cinq sorties courantes.
Captures et logs repetables : `work/qa/tomb-raider-banner/`.
