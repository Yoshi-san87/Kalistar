# Kalistar 4.6.76 - Collections et synchronisation

## Distribution autorisee

- Paris : un exemplaire de chacune des 434 versions publiees du catalogue.
- Tokyo : Balmhyr 30000007, Cana 30000002, Lanio 30000021, Momo 30000014,
  Kaylis 30000012, Taulio 30000013, Lok 30000018, Victorvine 30000008,
  Gen 30000023 et Aelis 30000006. Deux candidats au moins par poste ; une seule
  Rainbow ; Kaylis capitaine du deck initial lorsque la formation le permet.

Lots numeriques deja attribues, sans privilege administrateur joueur et sans
code d'activation recuperable. Distribution idempotente, meme apres transfert.
Les PNG, PSD et codes-barres natifs de modeles ne sont pas modifies.

## Progression par compte

Les collections serveur remplacent les possessions de demonstration sur le site
heberge. Decks, equipements, favoris, lecture, historique et snapshots de parties
sont synchronises. Les images restent sur Cloudflare. Les anciens originaux
IndexedDB/preferences sont preserves ; une copie compatible est proposee au cloud,
avec sauvegardes de securite avant application ou choix de conflit.

Revisions comparees avant chaque ecriture et bail d'appareil de 120 secondes,
renouvele toutes les 45 secondes visibles. Reprise sur un autre appareil explicite.
Aucun ecrasement aveugle des changements hors ligne. Un nouveau match exige
verification serveur du deck ; les dix exemplaires actifs restent non transferables.
L'interface signale et suspend un appareil qui perd le droit d'ecriture.

## Validation et limites

Tests purs du controleur, vraies permissions PostgreSQL ephemeres et scenarios
Chrome jetables multi-appareils. Controle du login/deconnexion, Paris/Tokyo,
reload, conflits, bail, coupures, reprise de match et Reduced Motion.
Les preuves repetees sont sous `work/qa/cloud-sync/`.

- Suite CI : 89 groupes termines ; suite locale native : 12 groupes termines.
- Controleur, projection et SQL de synchronisation : 44 tests reussis.
- Connexion officielle/Worker : cinq formats, login, reload et deconnexion.
- Registre : cinq formats, profil, consentement, activation et transfert
  fictifs, bon de preparation, retour arriere et deconnexion inter-onglets.
- Synchronisation PC vers Razr et Razr vers PC : collections, composition,
  favoris, Story, equipement, reprise explicite et ancien appareil suspendu.
- Duel Tokyo : dix vrais exemplaires du registre de test, arme sur D6,
  equipement fige, reprise sur un autre appareil et formule du resultat verifiee.
- Regression du jeu : 434 cartes, Collection, lecture, PNG, Decks et Arene
  PC/telephone, sauvegarde/reload et publication additive.

Les comptes et parties de navigateur sont fictifs et jetables ; ces parcours
n'ecrasent jamais la progression des deux vrais comptes. Le lot de production
a ete controle separement dans Supabase. Un premier essai de regression locale
a ete refuse par l'isolation reseau du poste, puis relance avec acces localhost.

Les scores solo sont synchronises, pas certifies anti-triche par un moteur
serveur. Payload maximum 8 Mio et 500 rencontres, sans purge automatique.
Les equipements restent accessibles selon compatibilite, sans inventaire payant.
La recuperation des mots de passe conserve les limites SMTP deja documentees.

Les migrations 004, 005 et 006 ont ete appliquees sans modifier les precedentes.
Les lectures inchangees et les acquittements n'envoient pas a nouveau l'historique.
La distribution de production, distincte des tests, a ete constatee : 434/10.
Le script de lots reste reproductible et exclut toute identite Auth de Git.

[Contrat actif](../../docs/REGISTRE_EN_LIGNE.md) |
[Publication](../../deploy/README.md)
