# Inspection equipee - 3 octobre 2026

Lot d'interface livre avec V4.4.2. Aucune nouvelle illustration ni modification
des cartes natives, des equipements, des profils ou des mecaniques.

Les screenshots de `qa/` sont produits par `site/weapons.browser.test.cjs`
sur le build Pages, avec navigateur jetable et base IndexedDB QA isolee.
`results.json` conserve les controles d'ancrage, de rotation, de sauvegarde,
du deck, de l'arene, du camp adverse et du mode Reduced Motion.

Pour la popup, les mesures comparent le rectangle du medaillon au contenu
effectivement dessine de la carte : crop `(50,50,797,1388)` puis ancre native
`(76,1103,122,122)`. Le decalage mesure reste inferieur a 0.5 px, y compris
apres resize. Les images du mecanisme gardent le meme rectangle que l'overlay.

Reproduction PowerShell depuis la racine active :

```powershell
node V4/releases/2026-10-02-pages-portability/build-committed-runtime.cjs
$env:KALISTAR_BUILT_SITE='1'
$env:KALISTAR_VERIFICATION_DIR='V4/revisions/2026-10-03-equipped-card-inspection/qa'
node V4/site/weapons.browser.test.cjs
node --test V4/site/equipment-presentation.test.cjs
```

Ne pas reconstruire `dist` pendant que ce test navigateur est en cours :
le routage QA lit directement les fichiers de ce build.
