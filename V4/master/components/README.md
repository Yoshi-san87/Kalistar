# Assemblage hybride V4 / V3

Epreuve de Taulio, non validee graphiquement a ce stade.

- Le cadre de base, le bandeau, les medaillons et la zone de recit restent V4.
- `rails.svg` definit deux supports lateraux complets, leurs reperes ATK/DEF et leurs attaches. Il ne contient ni chiffre ni symbole de capacite.
- `v3/atk-small.png` et `v3/def-small.png` sont des exports de calques isoles du PSD Taulio V3, pas des decoupes d'une carte aplatie. Les petits composants sont utilises aux deux tailles de capsules.
- Les effets et identites sont lus dans les bibliotheques `V3/assets/effets`, `armes`, `races`, `cristaux`, `factions`. La V3 n'est jamais modifiee.
- Le cristal reprend la calibration d'affichage V3 de 118 x 133 dans un logement V4 de 153 x 173. Les armes, races, drapeaux et symboles conservent leurs proportions.
- Les textes sont de vrais calques Photoshop; police et emplacements restent V4. La teinte de chiffres ATK est parametree pour leur contraste sur les capsules dorees V3.
- Le code-barres utilise l'ID V3, avec des modules entiers de 2 px et un seul degrade. Son logement complet est nettoye, bordures comprises. Aucun code secret n'est imprime.

`export-v3-components.jsx` isole les calques dans des copies temporaires de leur document, avec leurs parents, avant conversion RGB. Copier directement certains enfants vers un document vide ne restitue pas leur rendu.

Les variantes `atk-large`, `def-large`, `role-atk`, `role-def` et `position` sont des exports d'etude et ne sont pas utilisees dans l'epreuve hybride. `barrier-light.png` appartient a l'essai V4 precedent; le montage hybride utilise directement `V3/assets/effets/barrier.png`.

Controle : `verification/hybrid-report.json`. Les controles techniques ne remplacent pas la validation artistique de l'utilisateur. Format d'impression et fond perdu restent a confirmer.
