# Kalistar 4.6.94 - Zoom Map avec Ctrl et molette

Sur PC, Ctrl + molette zoome et dezoome uniquement lorsque le pointeur est
dans la zone navigable de Map. Le point vise reste sous la souris lorsque
les bords de la carte permettent le deplacement. Les deltas en pixels,
lignes ou pages sont normalises et bornes ; le zoom reste entre 1 et 8.

Le geste n'active pas le zoom du navigateur dans Map, meme aux limites.
La molette simple et Ctrl + molette hors carte ne sont pas interceptees.
Boutons, clavier, double-clic, glisser-deplacer et selection des villes sont
preserves. Le listener non passif utilise le controleur AbortController
de la vue et disparait a son demontage, sans cumul lors d'un retour.

Aucun media, terrain, coordonnee de ville, fond Collection, catalogue,
compte, schema de sauvegarde ou contrat de jeu n'est modifie. Les sources
natives, le Worker prive et les secrets Pages sont preserves.

## Verification

`map-wheel.browser.test.cjs` teste le vrai geste Ctrl + molette, l'ancrage
au curseur (y compris une ville selectionnee), les trois modes de delta,
les bornes, les autres commandes et le demontage/remontage. Il fonctionne
sur le composant isole puis sur le jeu complet du build exact.

Resultats avant commit : `validation.json`. Journaux et captures :
`work/qa/map-wheel-4.6.94/`. La publication exige les suites CI/locales,
Map PC/deux telephones, jeu PC/telephone et login, puis la verification
de la copie figee envoyee a Cloudflare. Le login public et les refus de
fichiers prives sont controles sans automatiser de mot de passe reel.

Commit et seul tag annote `v4.6.94` pousses atomiquement au depot personnel ;
deploiement direct du build fige au projet existant `kalistar`, sans modifier
Cloudflare Access, les comptes ou les donnees des joueurs.
