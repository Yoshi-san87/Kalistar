# Revision V3 - Buffs Et Scenes

Revision : `buffs-scenes-20260914`, validee le 14 septembre 2026.

## Gameplay

- Cinq categories cumulables : garde physique, trefle, Reraise, potion magique et puissance physique.
- Une seule charge par categorie. Reattribuer le meme bonus ne le double pas et ne rapporte pas de soutien supplementaire.
- Puissance physique : choix de tout allie vivant du plateau, auteur compris ; +60 sur sa prochaine attaque numerique physique. Animation sur le beneficiaire et pastille 60.
- Resolution automatique : garde dans DEF, trefle si la defense ne suffit pas, Reraise si la carte reste battue.
- Magie et Mort contournent la garde. Mort contourne aussi le trefle ; le Reraise reste applicable.
- Une pastille par bonus actif, sans nombre pour les coeurs/trefles. Inspection placee sur le bord oppose pour eviter les chevauchements.
- Schema 6 et identifiants K3 conserves ; aucune reinitialisation de base locale.

## Graphisme

Onze scenes revisees : Balmhyr, Kaylis, Neris, Gen, Kognus, Reevus, Xiaomi, Jelly-Joe, Capitaine Skully, Elenion et Ruby.

Trente autres illustrations identiques par SHA-256, notamment les deux Momo, Taulio, Zviri, Aelis, Cana, Voloden et Valazar violet. Les textes des onze scenes sont traces dans `donnees/revision_buffs_scenes_profils.json`.

- Vingt armes en silhouettes blanches transparentes, orientation historique vers l'exterieur. Instrument 11 reste une guitare.
- Dix-neuf emblemes de race riches et sculptes, avec des profils et trois-quarts varies.
- MINERO : une pierre pleine remplace la capsule ronde des faces magiques, sans recouvrir les chiffres.
- Skully : reference originale retrouvee dans le calque 873 du PSD source, extraite sans modifier le modele.
- Elenion porte maintenant l'arc, index 5. Matrice des armes, chiffres, postes et identifiants inchanges.

## Fichiers Valides

41 PSD editables, 41 TIFF CMJN 300 ppp et 41 PNG, tous en 897 x 1497 pixels. Le site utilise les recadrages 797 x 1388 sans changer les fichiers d'impression. Verification pixel par pixel entre recadrage attendu et PNG jeu.

Les 51 assets de cette passe ont leurs empreintes, transparences, dimensions et placements controles. Les six cadrages verrouilles issus de V2 restent identiques. Aucun pixel clair ne deborde du recadrage du jeu.

## Tests

- Moteur : 61 groupes dont 100 campagnes, 26 groupes V3, 18 groupes de statistiques, 11 contrats de cumul, 12 controles de repertoire.
- Repertoire : 41 profils, 246 faces ATK et 80 campagnes completes.
- Equilibrage : 640 campagnes deterministes terminees ; resultats detailles dans `balance-simulation.json`. Pas de reajustement silencieux des chiffres.
- Codes-barres : 123 lectures reussies, dont les 41 cartes assemblees.
- Site final : 13 groupes reussis, aucun asset manquant, aucune erreur de geometrie ou de navigateur.
- Buffs et IndexedDB : 23 scenarios reussis sur 1440, 2560, 390 et 360 pixels ; clics, animation, des 3D non vides et mobiles, sauvegarde/reprise et statistiques identiques.
- Contrat BDD : 9 groupes reussis. Presets : 10 groupes reussis.
- Tous les tests navigateur utilisent des profils et bases ephemeres distincts de la base personnelle du joueur.

## Archives Et Tracabilite

Les bilans et fiches historiques lisent le profil enregistre dans le match, sans le remplacer par le catalogue actuel. Le test Elenion conserve le fleau et le texte historiques apres le passage du catalogue a l'arc, y compris apres tri et bascule d'illustration. Les visuels affiches restent ceux de la revision actuelle et sont identifies comme tels.

Sources precedentes : `sources/avant-buffs-scenes-20260914`. Manifestes : `donnees/revision_buffs_scenes_*.json`. Preuve des 41 exports : `buffs-scenes-final.json` et fichiers `*_render_inputs.txt`. Rapports navigateur : `../verification-site/report.json` et `../verification-buffs/report.json`.

Apercus : `buffs-scenes-apercu.jpg` et `buffs-scenes-cartes.jpg`. Le site s'ouvre directement depuis `site/index.html`, sans serveur. Recharger l'onglet V3 pour actualiser le code et les visuels ; ne pas effacer les donnees du navigateur.
