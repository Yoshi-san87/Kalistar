# Cryptown - double fleau

Proposition d'illustration, 6 octobre 2026. Troisieme soldat de la serie,
un fleau dans chaque main. Aucun profil de jeu ni carte native ne sont crees
avant validation artistique.

- cryptown-dual-flails-v1.png : sortie originale, sans retouche ni recadrage.
- prompt-v1.txt : prompt exact envoye a l'outil image_gen integre.
- provenance.json : references de DA et source de generation.

Armure noire et violette, Kalistel au col, plastron a cotes lumineuses ;
deux fleaux a tetes de crane metalliques ajourees et coeur violet.
References approuvees : Varkhen, Nereth, Momo et Valazar.
Ce dossier n'est pas consomme par le site et ne modifie aucun personnage.

## Miroir horizontal demande

L'utilisateur apprecie la proposition mais demande un miroir horizontal pour
la distinguer de Varkhen. cryptown-dual-flails-v2-mirror.png retourne exactement
la version 1, sans regeneration ni modification des details. mirror.cjs produit
le PNG sans toucher a l'original et controle l'identite de chaque pixel RGBA
apres un second miroir. Resultat : mirror-verification.json.

## Validation et carte

L'utilisateur valide la version miroir et demande sa carte P1 le 6 octobre
2026. Production additive : ../../expansions/2026-10-06-cryptown-dual-flails/,
Draust, modele 49900602. La source miroir demeure intacte ; le catalogue
consomme la carte native de creations/49900602, pas cette proposition.
