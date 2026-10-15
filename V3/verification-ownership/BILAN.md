# Registre Local V3 - 15 Septembre 2026

## Livraison

Deux profils locaux Paris/Tokyo, 41 exemplaires initiaux attribues a Paris,
identifiants permanents aleatoires, atelier d'emission, activation a usage unique,
transfert propose puis accepte, annulation/refus, historique et carriere conserves.
La collection et les decks utilisent les exemplaires possedes. Le registre bloque
les transferts des nouvelles parties liees non terminees, avec abandon explicite.
Les anciennes sauvegardes ne peuvent pas faire progresser un original transfere.

Migration additive de `kalistar-v3-cards`. Sauvegarde complete schema 3 avec
confirmation de restauration ; compatibilite des archives historiques preservee.
Pas de modification des visuels, fichiers d'impression, regles, moteur, roster
ou donnees V2. Les codes-barres imprimes existants restent des IDs de version.

## Controles Reussis

- Backend : 41 cas, dont migration peuplee, reouverture, concurrence entre connexions,
  code incorrect/consomme, limitation d'essais, usurpation de proprietaire,
  double acceptation, rejeu, abandons, anciennes parties et restauration atomique.
- Interface du registre : 16 controles, y compris Paris/Tokyo, transfert reel,
  carriere de Momo conservee, activation, refus des cartes engagees, restauration
  confirmee et affichages 360/390/1440/2560 pixels.
- Site V3 : 13 groupes, aucun asset absent ni erreur navigateur, des 3D non vides.
- Buffs et archives : 23 scenarios, aucune regression detectee.
- Presets : 10 controles, cinq decks, 41 versions couvertes.
- Contrat BDD/moteur : 9 controles.
- Cinq suites moteur/roster/statistiques reussies, dont 180 campagnes deterministes.

Tous les essais navigateur utilisent des contextes isoles, sans lire ou modifier
la base reelle du joueur. Les tests n'attribuent pas leurs exemplaires de test au
navigateur habituel. Rapports detailles : `backend-tests.json`, `ui-report.json`,
`../verification-site/report.json`, `../verification-buffs/report.json`.

## Limites Assumees

Profils non authentifies, adresses non verifiees, aucun serveur ni email envoye.
Le controle du navigateur permet de modifier la base : cette implementation
n'est ni un registre inviolable ni une preuve d'authenticite physique.
Une restauration administrateur peut explicitement revenir a un etat ancien.
Un serveur et une vraie authentification seront necessaires pour distribuer des
cartes a de vrais utilisateurs sur plusieurs appareils.

Mode d'emploi et capacite : `../REGISTRE_LOCAL.md`.
