# Kalistar 4.6.17

Correction de la presentation d'ouverture sur smartphone : une animation
refusee ou annulee ne fait plus sauter l'introduction et ne la bloque plus.
Les mouvements impossibles utilisent un rendu statique, en gardant les pauses
de lecture, les cinq paires et le tirage des capitaines.

Le diagnostic et ses limites sont documentes dans
`V4/revisions/2026-10-10-mobile-lineup/README.md` : reproduction par injection
controlee, pas observation du telephone physique. Aucun changement de gameplay,
de statistiques, de cartes natives ou de stockage.

## Validation de publication

- `verify-release.cjs` exporte exclusivement l'index Git dans un dossier
  temporaire dedie, hydrate les sources LFS avec verification SHA256, execute
  les tests de la publication puis construit le site GitHub Pages.
- `qa/publication.json` contient les commandes et leurs resultats.
- Le nouveau test tactile couvre six scenarios et Passer ; le test desktop
  de presentation reste utilise pour verifier l'absence de regression.
- Le controle public compare les fichiers livres avec le build teste.

Resultats avant publication : 701 tests de la suite de publication passes,
13 controles supplementaires build/PWA/intro passes, six scenarios tactiles
passes, puis lancement tactile et presentation desktop verifies sur le build
exact. Captures et rapports : `qa/mobile-build/`, `qa/desktop/` et
`V4/revisions/2026-10-10-mobile-lineup/qa/after/`.

`verify-source.cjs` compare les sources stagees a l'export teste ; le lien CSS
de la refonte Statistiques en cours reste volontairement non stage et intact
dans le fichier local. Le build livre 343 cartes, 1169 fichiers, 809.5 Mo.

Commande du test tactile :

```powershell
node V4/site/lineup-mobile.browser.test.cjs --all
```

Variables : `KALISTAR_DIST` pour un build, `KALISTAR_URL` pour le site public,
`KALISTAR_VERIFICATION_DIR` pour les preuves. L'override
`KALISTAR_LINEUP_SOURCE` est reserve au diagnostic local avant build ; ne pas
l'utiliser pour la verification de publication.
