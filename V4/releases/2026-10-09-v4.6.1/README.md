# Kalistar V4.6.1 - controle public

Correctif du verificateur de publication ajoute en 4.6.0. Les chemins
`/media/...` du catalogue sont relatifs a la racine Pages, comme le fait
deja `site-config.js` dans le jeu. Ils ne doivent pas etre resolves comme
des chemins absolus du domaine puis tronques de la longueur de `/Kalistar/`.
La regression est couverte par deux tests ajoutes au workflow Pages.

Les mecanismes, sauvegardes, animations et cartes de la 4.6.0 ne changent pas.
Aucun rapport ancien, verrou ou image native n'est modifie. Le badge, le titre
et leurs assertions passent en 4.6.1 selon la regle un push = une version.

Les 573 tests du workflow et le build passent sur l'index isole. Resultats,
empreintes et manifeste sont conserves dans `qa/`. Les sources de gameplay
restent identiques a la campagne statistique de la 4.6.0.
Pour verifier le site public :

```powershell
$env:KALISTAR_BUILD_PROOF = 'C:/chemin/Kalistar/V4/releases/2026-10-09-v4.6.1/qa/build.json'
$env:KALISTAR_RELEASE_VERSION = '4.6.1'
node V4/releases/2026-10-09-v4.6.0/verify-public.cjs <commit>
```

Les regles et le bilan de gameplay restent ceux de
[la 4.6.0](../2026-10-09-v4.6.0/README.md).
