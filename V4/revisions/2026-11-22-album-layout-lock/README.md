# Album - Proportions et interactions verrouillees

Reprise du rendu 4.7.35 apres comparaison avec la proposition retenue
`../../propositions/2026-11-22-collection-six-concepts/02-album-vivant.png`.
Les cartes natives, les droits du Catalogue et les sauvegardes sont inchanges.

## Contrat Visuel

- Le rectangle disponible de `.cb-workbench` pilote le livre par container
  queries, independamment du nom du telephone et de la taille du menu.
- Les silhouettes natives conservent leur ratio : livre paysage 2:1,
  portrait 4:5, folio telephone 906:1698 et lecteur telephone 2:3.
  Un espace plus large ou plus haut ne les etire jamais.
- Toujours douze pochettes : six par feuille sur PC. Une zone etroite et
  verticale utilise un folio unique de trois colonnes et quatre rangees,
  sans sacrifier douze emplacements a une double page trop petite.
- La pagination appartient au livre, pas a une bande flottante du document.
  Sa hauteur tactile de 44 px et une reserve de 8 px sont prises en compte
  dans le calcul de la zone des pochettes et du lecteur.
- Les noms connus sont deja imprimes dans le PNG ; leur identite complete
  reste en DOM et dans le libelle du bouton. Le nom d'une version inconnue
  reste affiche sur le dos grise. Aucune illustration inconnue n'est chargee.
- En lecteur bas, les outils de carte se replient dans un dialogue natif.
  Les controles reels y sont deplaces puis rendus a leur emplacement initial,
  jamais clones. Images, versions, favori, PNG, Retour et Echap restent utiles.
- Le lecteur garde ses deux pages, carte a gauche et texte a droite. Sur un
  viewport bas, il masque temporairement la navigation generale ; Retour a
  l'album la restitue. La barre Retour reste toujours accessible.
- Le lecteur compact interroge `album-book`, la taille physique du livre,
  et non l'espace disponible avant mise a l'echelle. Une fenetre haute mais
  etroite ne peut donc plus garder des controles qui prennent tout le texte.
  Dans les livres les plus etroits, les deux fleches du texte sont empilees
  avec des cibles de 44 px ; leur hauteur fait partie du budget de lecture.

Le document, le corps Collection et le workbench sont `overflow:clip` : le
focus ou un retour de navigation ne peuvent plus faire defiler l'en-tete.
Les seuls defilements autorises restent dans les dialogues prevus pour cela.
Le rafraichissement d'un filtre conserve sa position de defilement et le
radio effectivement selectionne, pas le premier radio du groupe.

## Images

Quatre nouveaux siblings WebP sont prepares sous `V4/site/assets/album/` :
`album-open-v2.webp`, `album-open-phone-v2.webp`, `album-folio-phone-v1.webp`
et `album-reader-phone-v2.webp`, 1 236 356 octets ensemble. Une seule surface
de livre est utilisee a la fois.
ImageGen integre a genere les sources en prenant la proposition comme
reference. `prompts.json` conserve les quatre prompts finaux. `assets.json`
conserve sources, empreintes, dimensions et les quatre pixels alpha des coins.
Les originaux PNG restent dans `C:/Users/guill/.codex/generated_images/`, hors
checkout. Le script realise uniquement un export WebP ; il ne repeint aucun
pixel et refuse d'ecraser une autre version.

Les anciens composants restent preserves. La grande texture HUD a bords
cuivres et le cadre blanc de pochette ne sont plus appliques a Collection.
Le HUD courant est defini uniquement par `V4/site/navigation.css`.

Preuves navigateur et rendus reels : `work/qa/album-repair/`.
