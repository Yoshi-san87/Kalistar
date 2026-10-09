# Skaern et Djidane Lumiere

Demande utilisateur du 9 octobre 2026. Skaern est valide pour production avec un vieillissement leger ; Djidane devient Lumiere.

## Skaern

- Modele 49901401 ; characterId `skaern-kalistar` ; OKAMI / Grivka.
- Passeur, sans cristal, Baton, role principal P1 et positions P1/P5.
- ATK D6-D1 : 198, 161, 126, 88, guard, retry.
- DEF D6-D1 : 283, 240, 198, 143, 89, 43.
- Garder une defense reguliere et offrir une garde ou un trefle traduit son geste protecteur. Aucun Reraise, magie, barriere ou effet nouveau.
- Le museau et les sourcils sont legerement plus argentes ; la scene, le geste et la palette noir/vert foret restent preserves. La premiere proposition reste archivee.
- Source actuelle : `V4/propositions/2026-10-09-skaern-okami/Skaern-02.png`. Generation et retouche : outil ImageGen integre ; prompts exacts dans ce dossier de propositions.

## Djidane

- Modele 49901001 et characterId `djidane-ff9` inchanges.
- NONE devient LUXO ; couleur et teinte natives correspondantes ; sentry vrai comme les autres profils elementaires FFIX.
- Aucun changement des nombres, effets, positions, identites, illustration ou banniere FFIX. Les attaques restent physiques : aucun ajout implicite de face magique/barriere.
- Le cycle existant applique +30 contre Sang, -30 contre Tenebres, +20 contre NONE et -40 contre Rainbow. Le moteur reste intact.
- Les originaux actifs et leurs preuves sont archives dans `originals/49901001/`. La revision precedente reste chainee, pas remplacee.

## Production et preuves

`build.cjs prepare/render/verify/publish` utilise les composants calibres, le compositeur Photoshop 26.11.8 et les controles V4 existants. Le cadre n'est pas genere. Les textes restent natifs et les composants en objets dynamiques.

- Deux PSD/PNG 897 x 1497 px, 300 ppp.
- Cadre fixe : zero difference ; reouverture PSD : zero difference ; deux codes-barres verifies.
- Djidane : zero pixel change hors des seules zones elementaires et libelles colores.
- `before.json` gele les entrees ; `verified.json` scelle les sorties ; la transaction protege les autres entrees du catalogue.
- `current.cjs` de FFIX integre la revision explicite sans reecrire le lot initial ni ses anciens rapports. Le test de banniere continue de verifier la preuve pre-Luxo archivee.
- Catalogue : 295 cartes apres integration locale.

51 tests cibles passes : catalogue, sauvegardes, build/PWA, FFIX, bannieres, equipements FFIX et cette revision. Chaque face des deux personnages a ete executee, ainsi que les matchups Luxo et la restauration.

Controle navigateur isole : lecteurs a 1440, 412 (Razr 50) et 320 px ; duel desktop/mobile et reprise apres reload. Aucun debordement horizontal, erreur JS ou ressource manquante. Captures sous `browser-proof/`.

Les controles n'etablissent pas un taux de victoire competitif. Le gameplay existant et les sauvegardes personnelles ne sont pas modifies.

