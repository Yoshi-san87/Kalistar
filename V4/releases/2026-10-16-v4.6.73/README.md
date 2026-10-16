# Kalistar 4.6.73 - Registre personnel

## Perimetre

Projet Supabase personnel Kalistar `fkskjhlaaagqlfcsojjp`, gratuit, Mumbai.
Schema installe apres verification d'une base vide et autorisation explicite.
Aucun acces professionnel, Drive, abonnement ou mot de passe de base utilise.
Les images restent sur Cloudflare, le SDK officiel est charge a la demande.

- Connexion par lien email PKCE, profil et consentement du pseudo public.
- Exemplaires uniques, modele distinct, numero de serie et code-barres individuel.
- Activation atomique avec secret aleatoire consomme, cinq essais/minute/compte.
- Transfert propose par le proprietaire, accepte/refuse par le destinataire.
- Emission reservee aux administrateurs verifies cote serveur, serie pilote.
- Certificat public sans email, UUID joueur, secret ou empreinte d'activation.
- Registre accessible depuis Plus et les archives locales, sans migration des saves.
- PC, Razr, ecran compact, paysage, Reduced Motion et retour arriere.
- Correction d'un conflit de formulaire de l'ancien registre local (champ id).

Les migrations appliquees restent immuables. Voir le
[guide actif](../../docs/REGISTRE_EN_LIGNE.md) et le
[mode operatoire](../../deploy/supabase/README.md).

## Verification

Le moteur PostgreSQL PGlite jetable couvre permissions et RLS, profils verifies,
absence d'escalade, emission, activation, consommation, vol refuse, confidentialite,
transferts et audit. Il serialise les requetes : pas de preuve de charge distante.
Le client pur couvre aussi expiration de session et invalidation des reponses.
Le parcours navigateur utilise le SDK officiel avec Auth/RPC simules, jamais de
comptes ou de cartes reels. Il couvre confirmation, refus, bon prive telecharge,
reload, deconnexion entre onglets et absence de debordement sur cinq formats.

Lectures du service reel : modeles accessibles, profils et possessions anonymes
refuses, certificat inexistant null ; droit EXECUTE d'emission anonyme absent.
L'essai d'emission anonyme a ete bloque avant execution par le controle de
securite. Aucune emission distante, aucun compte et aucun administrateur cree.
Site URL personnel et retour exact enregistres sans joker, verification email
conservee. Aucun secret d'administration dans le code ou les captures.
Audit final distant : 0 joueurs, 0 exemplaires, 0 administrateurs, 9 tables RLS,
aucun EXECUTE anonyme sur l'emission, aucun USAGE anonyme du schema prive.
L'empreinte installee correspond exactement a la migration 001 conservee.

Les suites repository (34 tests) et locale (11 invocations) passent. Les parcours
PC/phone du build, sauvegarde/reload et shell Razr passent avec 434 cartes.
Le contrat de boot a ete adapte de 57 a 60 modules avec verification explicite
des trois ajouts et du maintien du SDK en chargement paresseux ; aucun verrou
graphique ou ancien rapport n'est retouche. La suite locale a necessite ses
serveurs localhost hors restriction reseau. Le build cible CF_PAGES=1 : 1 449
fichiers runtime, 973,1 Mio ; le budget historique GitHub 900 Mio reste inchange.

Preuves locales sous `work/qa/cloud-registry/`, commandes et sorties sous work.
Le SDK et sa licence ont une sauvegarde SHA-256 hors checkout dans
`sauvegardes-personnelles/supabase-2026-10-16/` du workspace historique ; seuls
leurs chemins, tailles et empreintes entrent dans Git.

## Limites Et Suite

La premiere connexion email de l'auteur et l'attribution administrateur restent
des actions humaines/separement autorisees. Le pilote propose Momo et Balmhyr,
pas une attribution automatique des 434 modeles ou possessions de demonstration.
Le service email Supabase par defaut est limite ; un SMTP adapte est necessaire
avant ouverture publique. Ne pas desactiver la confirmation d'email.
L'activation avec de vrais comptes et de vrais exemplaires necessite une campagne
pilote explicitement autorisee, non remplacee par les tests simules.

Les PNG/PSD et codes-barres de modele ne changent pas. L'export imprime individuel,
les resultats de combat certifies serveur et la sauvegarde reguliere de la base
hebergee restent des evolutions distinctes. Ce registre n'est pas une blockchain.
