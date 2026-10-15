# Vamp : silhouette athletique et visage plus fort

Revision demandee pendant la publication initiale du 28 septembre 2026.
Pectoraux, epaules et bras plus pleins, cou plus solide, joues moins creuses,
machoire et menton plus affirmes. Impact au front, coupure sur la joue gauche,
canines, attitude agressive et levitation conserves.

Retouche generative integree, prompt et provenance dans `art/provenance.json`.
Source finale : `art/vamp-athletic.png`. L'ancienne illustration reste intacte.
Le PSD de production conserve ses textes, effets et objets dynamiques ; seul
le contenu de l'objet illustration est remplace avec le pipeline natif existant.

La preuve initiale dans `V4/expansions/2026-09-28-vamp/` est historique et
reste intacte. Les sauvegardes exactes se trouvent ici dans `originals/`.
Controle : zero changement hors illustration, textes et geometrie identiques,
reouverture native, code-barres, catalogue jouable strictement identique.
Seules les metadonnees de revision changent dans le catalogue, pas les stats.
Les 114 autres cartes et les composants approuves restent inchanges.

Pipeline : `revise.cjs prepare --go-native`, `render --go-native --key=vamp`,
`verify`, `publish --go-publish`. Ne jamais reecrire les preuves historiques.
