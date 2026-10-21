# Kalistar 4.6.106 - Kalistels Des Collaborations

[Revision native](../../revisions/2026-10-21-collab-kalistels/README.md) |
[Documentation](../../../docs/INDEX.md)

## Perimetre

Onze cartes recoivent un Kalistel : Ward et Gladiolus Roche ; Kiros, Locke et
Gogo Air ; Cina Terre ; Edgar et Cindy Electricite ; Shadow Tenebres ; Cyan
et Prompto Lumiere. Koby reste NONE, fichiers et profil inchanges.
Catalogue conserve a 462 cartes, dont 318 collaborations et une seule sans
cristal. Aucun nouvel exemplaire, aucune distribution aux joueurs.

Les seules modifications de profil sont element, color et hue. Les nombres,
effets, positions, modes physiques, identites et illustrations restent exacts.
Le nouveau cristal agit par les regles elementaires et affinites d'arene
existantes. Aucun changement moteur, matrice, sauvegarde ou schema serveur.

Onze PSD dupliques avec textes natifs preserves et composants elementaires
remplaces. Comparaison pixel a pixel hors regions autorisees, reouverture et
codes-barres valides. Originaux, anciennes preuves et verrous conserves.
Les tests historiques utilisent une projection stricte de cette revision,
testee aussi avec des mutations interdites ; leurs attentes d'origine ne sont
pas effacees ni leurs hashes modifies.

## Validation

- Huit tests dedies : 132 faces ATK/DEF, cycles +30/-30 et neutres, affinites
  d'arene, onze matchs ABBA complets et snapshots historiques NONE.
- Onze natifs : zero difference hors perimetre et apres reouverture ; cadre
  fixe et geometrie des textes conserves ; codes-barres valides.
- 33 lecteurs verifies par SHA-256 : desktop 1440, Razr 412 et ecran 320 px.
  Arene PC/telephone, reprise apres reload et import de sauvegarde anterieure
  sans ajout ni perte d'exemplaire. Captures sous work/qa/collab-kalistels/.
- Suite complete `npm test` : 99 groupes valides. Suite locale : 13 groupes
  valides, avec les sources natives. Controle repository et organisation OK
  apres ajout explicite a l'index.
- Controle visuel des natifs, du lecteur desktop, du lecteur 320 px et de
  l'arene Razr : cristaux et couleurs elementaires conformes, sans deplacement
  du cadre ni des icones d'arme.

Premiers passages : acces Photoshop/Edge necessitant le contexte bureau ;
nom de base ephemere corrige dans le nouveau test ; dependance marked fournie
par le runtime local ; CF_PAGES reserve au build Cloudflare (pas aux tests
generiques du plan GitHub). Les anciens audits ont ete raccordes a la revision
exacte ; aucun ancien rapport ni verrou n'a ete reecrit.

## Livraison

Publication coordonnee apres 4.6.105. Les autres propositions et anciens
resultats QA modifies localement restent hors commit. Onze entrees PNG du
registre runtime seulement sont mises a jour, sans ajout de binaire dans Git.
Sources natives et originaux sauvegardes hors checkout avant commit :
492 fichiers, 639609581 octets, copies verifiees par SHA-256 dans
`sauvegardes-personnelles/revision/2026-10-21-collab-kalistels/` a la racine
du workspace historique. Le manifest prive reste hors Git.
Publication du commit fige vers le projet Cloudflare personnel kalistar,
sans toucher aux donnees ni aux droits des joueurs.
