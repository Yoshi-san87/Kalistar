# Kalistar 4.5.9

Correctif du defilement tactile de l'arsenal sur smartphone.

La zone centrale `#app` devient le conteneur de defilement de la vue Armes
aux formats mobiles existants, en portrait comme en paysage. Le menu inferieur
reste fixe, la derniere arme reste accessible et aucune barre de defilement
visible n'est ajoutee. Le defilement desktop, les cartes et les regles du jeu
ne changent pas.

Le test `V4/site/weapons-scroll.browser.test.cjs` reproduit le blocage avant le
correctif avec de vrais gestes tactiles Chrome, puis controle l'acces au bas
de la liste, les details, les filtres, la navigation et l'apercu Razr 50.
Les captures et mesures sont conservees dans
`V4/revisions/2026-10-04-mobile-weapons-scroll/`.

Version desktop et smartphone : 4.5.9. Schema des sauvegardes inchange.
Publication : `Yoshi-san87/Kalistar`, `main` et tag annote `v4.5.9`.

## Verification

- Blocage reproduit avant le correctif : le geste tactile laisse `scrollTop` a zero.
- Six configurations validees : Razr 50 412 x 1007, 360 x 740, 320 x 568,
  paysage 844 x 390, desktop 1440 x 1000 et apercu Razr 50 dans une iframe.
- Acces aux 25 armes, filtres, ouverture/fermeture des fiches et retour depuis
  Collection controles sans erreur JavaScript ni debordement horizontal.
- 134 tests du workflow et build Pages reussis sur un instantane Git isole.
  Resultats : `workflow-results.json`. Aucun verrou de reference modifie.
- Suite navigateur du build Pages validee : 212 cartes, desktop/phone,
  lecteur, decks, arene et reprise de sauvegarde, sans erreur HTTP ou JavaScript.
