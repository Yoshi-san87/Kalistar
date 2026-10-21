# Bottes noires de Kaylis

Correction demandee par l'auteur : le cuir, les lacets et les semelles des
Bottes du Prochain Pas sont noirs, pas bruns. Deux editions imagegen integrees
conservent le dessin de la paire, les oeillets cuivres et les reflets rainbow :
objet transparent et scene peinte. Prompts exacts dans `prompts.json`.

Sources : `../../weapon-cards/sources/kaylis-next-step-boots-v2.png` et
`../../weapon-cards/sources/kaylis-next-step-boots-scene-v2.png`. Les v1 restent
preservees ; le cercle cuivre et son ancrage ne changent pas. Les deux WebP
sont derives par `build-assets.cjs`, avec empreintes dans `media-provenance.json`.

Seul le manifeste de presentation `site/weapon-art.js` selectionne la v2.
La cle `kaylis-next-step-boots-v1` et `weapons.js` restent strictement inchanges
pour conserver les snapshots et l'empreinte des combats Fragment en cours.
Le texte alternatif affiche par le renderer est genere depuis le nom courant,
sans la couleur brune historique du snapshot. La relique n'est pas modifiee.

Validation : tests weapon-art et equipement, controle du cercle optique,
captures desktop/Razr/320 px via le test navigateur du lot Fragment.
