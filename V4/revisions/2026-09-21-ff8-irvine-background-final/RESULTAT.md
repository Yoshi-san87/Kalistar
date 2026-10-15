# FF8 - Corrections finales publiees

Publication locale terminee le 2026-09-21. Cette continuation remplace le lot
prepare, mais jamais publie, `../2026-09-21-ff8-refinements/`.

## Changements

- Seifer : assis derriere son propre pupitre a Balamb, pieds sur le bureau,
  bras croises, eleves tournes dans le meme sens. Premiere phrase du recit
  ajustee pour correspondre a la scene sans arme.
- Squall : lame redressee, silhouette et raccord au mecanisme corriges.
  La version courbe rejetee n'a pas ete publiee. Pose en pied conservee.
- Ward : cadrage elargi et harpon visible dans le cadre final. NONE conserve.
- Irvine : cadrage rapproche, fusil droit visible, decor de plateforme du
  carrousel avec Deling en contrebas. Le decor medieval rejete n'a pas ete publie.
- Zell : PYRO devient ELECTRO dans le PSD, le profil et le catalogue.
  Illustration, chiffres, positions, effets et barrieres inchanges.

Les quatre rendus natifs autres qu'Irvine sont reutilises a l'identique depuis
le lot precedent. Seul Irvine a ete rerendu dans cette continuation.

## Fichiers actifs

Les PSD editables et PNG actifs sont dans
`V4/collaborations/ff8-set-01/cards/<personnage>/card.psd` et `card.png`.
Les copies publiees sont synchronisees dans `V4/creations/<id>/` :

| Personnage | ID |
| --- | --- |
| Squall | 45410910 |
| Zell | 48933308 |
| Irvine | 48704873 |
| Seifer | 46860270 |
| Ward | 47264450 |

IDs, UUID, possessions et sauvegardes du joueur ne sont pas remplaces.
Collection : http://127.0.0.1:4304/jeu/#collection

## Verification

- Cinq PSD sauvegardes et rouverts : zero pixel different apres reouverture.
- Zero pixel modifie hors zones autorisees ; cadres et calques verifies.
- Cinq codes-barres rendus et relus avec leur ID attendu.
- References et banques protegees intactes, aucune remise a zero des empreintes.
- Preflight final : 12 cartes reutilisees, 0 nouvelle identite, 2 decks valides.
- 48 tests automatises finaux reussis, en plus des 21 tests du lot initial.
- Serveur reel : 49 cartes, 12 medias FF8 verifies, 24 matchs termines sans erreur.
- Navigateur isole : medias complets, aucune erreur JS/HTTP, vues 1600 et 390 px.
- Apercu global `V4/collaborations/ff8-set-01/set-preview.jpg` mis a jour.

Les preuves detaillees sont `verified.json`, `transaction.json` et
`lineage.json`. Les controles navigateur sont dans
`V4/collaborations/ff8-set-01/verification/`.

## Generation et references

Mode utilise : outil integre `image_gen`, illustrations uniquement.
Le cadre est assemble depuis les composants natifs existants, jamais regenere.
Prompt final Irvine et provenance : `generation.json`.
Prompts et references des autres retouches : `../2026-09-21-ff8-refinements/`.
Les images retenues sont conservees localement dans `art/` et les copies actives.

- Gunblade : rendu promotionnel officiel,
  https://x.com/FinalFantasyJP/status/1297337763843448832
  (proportions visuelles, pas de mesure canonique en centimetres).
- Irvine : capture du decor du jeu utilisee comme reference,
  https://kurosakana.hatenablog.com/entry/2019/09/09/155703
- Contexte officiel du personnage : https://na.finalfantasy.com/topics/487

Ce sont des reinterpretations picturales de fans dans la DA Kalistar,
pas des captures exactes du jeu ni une collaboration officielle.
