# Kalistar 4.6.109 - Fragments narratifs

## Livraison

- 21 decks distincts pour Momo, Balmhyr et Kaylis, issus du catalogue natif :
  50 versions de 43 personnages, aucune collaboration. Dix identites et deux
  cartes compatibles par position dans chaque equipe, capitaine actif.
- Momo original ouvre son parcours, Taulio porte la deuxieme rencontre.
  La recompense future est Momo 30000014, Le Bal des objets perdus.
- 42 passages avant/apres combat suivent les personnages et les objets de
  leur histoire. Le mystere du createur de Momo reste progressif ; aucune
  reunion n'est inventee et le roman Story n'est pas modifie.
- Sept nouvelles peintures de Momo remplacent le livre ouvert dans le lecteur.
  Balmhyr et Kaylis utilisent leurs illustrations natives. Les livres fermes
  restent sur l'etagere ; les stations changent la scene et le recit.
- Quatre combats pour la carte, puis arme, protection et relique, avec les
  memes verrous serveur et confirmations de recompense. Les images des bonus
  ne sont pas chargees avant leur revelation.
- Transitions finies, pas de boucle d'animation au repos, mode mouvement
  reduit et variantes d'image mobile. Les 15 medias ajoutent 3 796 880 octets.

## Donnees Et Compatibilite

Migration 013 appliquee uniquement au Supabase personnel apres sauvegarde
chiffree et restauration de verification : schema 12, recompense 30000014.
Les 444 exemplaires, 9 tentatives et 3 progressions existants sont conserves.
Aucun reset de compte, de carte, de secret ou d'historique.

Les attributions historiques gardent leur version et certificat d'origine.
Une carte deja possedee n'est pas dupliquee ; la ceremonie reprise apres
rechargement indique correctement cet etat. Les matchs deja ouverts gardent
leur snapshot. Empreinte moteur inchangee, 12 snapshots historiques verifies.
Sources des sept illustrations et provenance sauvegardees hors checkout.

## Verification

- Suite CI : 101/101 groupes ; suite locale avec medias : 14/14.
- 3 024 simulations appariees sur les 21 rencontres : aucun blocage ni nul,
  maximum 80 tours. Cela ne prouve pas une difficulte universellement
  croissante : les compositions adverses et les contres restent determinants.
- Parcours complet navigateur + Worker + PostgreSQL ephemere : sept victoires
  obtenues en 14 tentatives avec commandes legales et signees. Defaites,
  reprises, sept recompenses, rechargements avant confirmation, absence de
  doublon, debloquages sequentiels et sept apercus administrateur verifies.
- Lecteur navigateur : sept formats, 14 captures de scenes PC/Razr, filtre,
  tactile, clavier, images decodees, fins de texte accessibles, ceremonie
  320 px, absence d'ancien fond livre, mouvement reduit et nettoyage verifies.
- Les tests n'utilisent ni mot de passe ni progression Paris/Tokyo.

Preuves reproductibles sous work/qa/fragment-adventure-integration,
work/qa/journeys-view-4.6.109-final et work/qa/fragment-adventure-decks.json,
hors Git. Les logs CI/local sont sous work/fragment-adventure.

La publication doit utiliser le build fige de ce commit, puis les tests
navigateur de cette sortie et le controle anonyme du login Cloudflare.
Ne pas envoyer les brouillons du checkout ni les sources PNG.

Voir [le lot et les sources](../../revisions/2026-10-22-fragment-adventure/README.md),
[les decks et limites statistiques](../../revisions/2026-10-22-fragment-adventure/DECKS.md),
[le contrat serveur](../../revisions/2026-10-22-fragment-adventure/BACKEND.md).
