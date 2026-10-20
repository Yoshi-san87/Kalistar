# Kalistar 4.6.97 - Transfert de carte

## Interface

Le formulaire de transfert utilise deux colonnes sur PC : commandes a gauche,
grande carte a droite avec son numero d'exemplaire, son titre et son identifiant.
Un trajet au cristal Rainbow relie les pseudos expediteur et destinataire.
Sur telephone, l'apercu compact suit le selecteur avant la saisie du destinataire.
Il ne remplace pas la Collection et n'ajoute aucune galerie de possessions.

La selection revele la carte. La demande confirmee par le serveur declenche un
effet bref de passage ; son etat reste explicitement en attente. L'acceptation
confirmee joue une arrivee de carte chez le destinataire. Actualiser permet de
reconnaitre une acceptation, une annulation ou un refus sans rejouer les effets
deja termines. Aucune nouvelle interrogation automatique du serveur.

Les effets utilisent uniquement transform/opacity, durent au maximum 1,15 s,
ne bouclent pas et sont desactives avec prefers-reduced-motion. Pas de canvas,
nouvelle dependance, nouveau media ou changement de schema.

## Contrats preserves

- La confirmation reste obligatoire et est retiree des la modification du
  destinataire, sans attendre la sortie du champ.
- Une erreur ne joue pas de reussite. Le formulaire conserve carte et pseudo,
  mais demande une nouvelle confirmation.
- La proposition ne transfere jamais la propriete a elle seule.
- Un changement de rubrique, de compte ou une deconnexion efface la scene.
  Une reponse tardive ne peut ni la rouvrir ni rejouer une ceremonie.
- Les RPC existants restent responsables des droits, du doublon de version,
  des cartes engagees en combat et de l'acceptation.

## Verification

Tests navigateur de la page sur cinq formats : apercu a droite, image agrandie,
disposition tactile, confirmation, refus reel PostgreSQL, reponse retardee,
envoi en attente, annulation, acceptation/reception et absence de rejeu.
Le SDK reel est aussi verifie dans le jeu sur cinq formats jetables.
Connexion et navigation sont verifies sur six formats, dont grand ecran et
mouvement reduit. CI et suite locale completes, puis jeu PC/mobile et
synchronisation avec comptes fictifs avant publication.

Preuves locales : `work/qa/account-transfer/`. La copie figee du commit doit
passer les tests avant envoi Cloudflare ; la revision publique et le statut
GitHub sont consignes dans le rapport QA, pas dans les donnees joueur.
