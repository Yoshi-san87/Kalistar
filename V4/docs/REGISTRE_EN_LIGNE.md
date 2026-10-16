# Registre des exemplaires

[Index](../../docs/INDEX.md) | [Architecture du site](../site/README.md) |
[Migrations et tests](../deploy/supabase/README.md)

## Identites

- Le modele/version reste le `card.id` du catalogue V4 approuve.
- L'identite du personnage reste `characterId`, partagee par ses versions.
- Un exemplaire en ligne possede un UUID global, un identifiant public
  `KC-<32 chiffres hexadecimaux>` et un numero de serie individuel.
- Son futur code-barres physique comporte huit chiffres commencant par 0,
  par exemple `00000001`. Ce domaine est distinct des modeles 3/4xxxxxxx.
  La V1 refuse de depasser 9 999 999 exemplaires plutot que tronquer un code.
  Les trous de sequence sont normaux : un numero ne mesure pas un tirage garanti.
- Le secret d'activation est independant, aleatoire, a usage unique et fourni
  separement de l'image publique. Un code-barres visible n'est pas un secret.

Le code-barres natif des PNG actuels identifie toujours le modele. Ni ces PNG,
ni les PSD, ni leurs verrous n'ont ete modifies par l'ajout du registre.
L'export physique d'un exemplaire avec son code individuel reste une etape
distincte de production et de verification de lecture.

Il s'agit d'un registre central Kalistar, pas d'un NFT sur blockchain ni d'une
preuve infalsifiable d'authenticite du carton. Une vente physique ne transfere
pas automatiquement le compte numerique : les deux joueurs doivent confirmer.

## Separation du jeu local

La base IndexedDB, les profils Paris/Tokyo, leurs possessions et les matchs
restent sur l'appareil, sans effacement ni synchronisation automatique. Le
serveur associe chaque compte autorise a son profil local ; le jeu heberge ne
propose plus le selecteur de profils invites. Aucun exemplaire n'est importe ou emis
automatiquement depuis cette demonstration. Un profil local administrateur
ne donne aucun privilege dans Supabase.

Le registre en ligne reste independant des autorisations de deck locales.
Les statistiques et trophees de combats calcules dans le navigateur ne sont
pas televerses comme resultats certifies. Leur validation serveur fera l'objet
d'une evolution separee avant tout classement ou recompense de valeur.

## Donnees et droits

`kalistar_models` contient seulement les versions approuvees rendues disponibles
a l'emission. Le pilote contient Momo et Balmhyr. Un futur import doit venir
du catalogue du producteur, jamais d'un formulaire joueur.

`kalistar_profiles` ne contient aucun email : pseudo, nom affiche et consentement
a l'affichage du proprietaire. Les emails restent dans Supabase Auth.
`kalistar_collectibles` et `kalistar_transfers` conservent identite et possession.
Les tables publiques appliquent RLS ; les joueurs ne lisent que leurs donnees
privees et ne peuvent pas ecrire directement un proprietaire ou un evenement.

`kalistar_private` isole roles administrateurs, joueurs autorises, empreintes
SHA-256 des secrets, tentatives, journal et version du schema. Aucun droit de schema/table/fonction
n'est donne aux roles navigateur. Les fonctions API ont un search_path vide
et sont explicitement autorisees une par une.

La fiche d'exemplaire, accessible aux joueurs autorises, projette uniquement modele, numero, statut, serie pilote,
dates et pseudo si le proprietaire l'a choisi. Il ne retourne ni UUID du joueur,
ni email, ni empreinte, ni secret. Les identifiants publics sont consultables :
la confidentialite ne repose jamais sur leur difficulte a deviner.

Toutes les lectures et fonctions du registre exigent un utilisateur Auth confirme
inscrit dans la liste privee des joueurs autorises. Son UUID et l'empreinte de
son email Auth actuel doivent correspondre ; un alias fourni par le navigateur
ne peut pas ouvrir un profil. Les politiques RLS appliquent le meme controle.
L'emission verifie la table privee des administrateurs, pas user_metadata ni
un role fourni par le client. Le site emet seulement des exemplaires pilotes.
Aucun administrateur joueur n'est attribue automatiquement au premier inscrit.
L'attribution initiale a l'auteur demande la verification du compte puis son
autorisation explicite ; ne jamais deduire ce privilege du pseudo choisi.

## Activation et transfert

L'emission cree un exemplaire non attribue et renvoie le secret une seule fois.
Seule son empreinte est stockee. Le bon telecharge est prive et ne va ni dans
Git, ni sur Cloudflare, ni avec les images publiques.

L'activation verrouille le compteur de tentatives et l'exemplaire dans une
transaction. Elle attribue le proprietaire et consomme le secret ensemble.
Un secret ancien ne peut pas reprendre une carte transferee. Les erreurs
d'activation sont generiques et les echecs alimentent une limite de cinq
tentatives par minute et par compte, sans exception qui annulerait ce compteur.

Une seule offre en attente est autorisee par exemplaire. Le proprietaire peut
la proposer et l'annuler ; seul le destinataire peut accepter ou refuser.
L'acceptation recontrole le proprietaire sous verrou, modifie le titulaire et
ajoute un evenement, sans changer identite ou ancien secret. Les fonctions de
transfert verrouillent toujours l'exemplaire avant l'offre. Le journal est
inaccessible en ecriture aux clients ; l'administration de la base reste fiable
par convention, sans pretendre a une immutabilite blockchain.

## Connexion et exploitation

Le site heberge exige email et mot de passe avant l'entree dans le jeu. Deux
comptes personnels ont ete crees par l'auteur dans Supabase Auth ; les inscriptions
publiques et anonymes sont fermees. Aucun mot de passe n'est fourni au code,
enregistre dans Git ou traite par le Worker Cloudflare. Le client officiel Auth
gere connexion, renouvellement et recuperation, avec PKCE et la cle de session
distincte `kalistar.cloud.auth.v1`. Les tokens ne sont pas inclus dans les exports.
Le site n'a aucune cle d'administration. Le bouton Compte permet de se deconnecter.

Le Worker Cloudflare verifie le token Auth et `kalistar_access()` avant de signer
un cookie HttpOnly, Secure, SameSite=Lax. Seuls le login et ses assets minimaux
sont publics : catalogue, cartes, scripts et documents exigent ce cookie.
Il expire en quinze minutes et est renouvelle toutes les quatre minutes lorsque
le jeu est visible. Un retrait de la liste bloque immediatement le registre ;
une copie du cookie deja emise peut encore lire les fichiers jusqu'a son expiration.
Les contenus deja telecharges sur un appareil ne peuvent pas etre rappeles.
Le serveur local reste utilisable sans connexion de production ; ce confort de
developpement ne constitue jamais le controle d'acces du site Cloudflare.

Les autorisations de redirection restent limitees a l'origine personnelle du jeu,
sans joker. Le retour de recuperation de mot de passe conserve l'adresse approuvee.
Le Site URL configure est `https://kalistar.pages.dev/jeu/` et l'unique retour
autorise est `https://kalistar.pages.dev/jeu/?registry=1`, avec accord explicite.
Le compte administrateur du tableau de bord Supabase reste distinct des comptes
joueurs : aucun des deux comptes n'est automatiquement administrateur du registre.
La recuperation PKCE doit etre ouverte dans le meme navigateur et sur la meme
origine que la demande. Les mots de passe sont saisis uniquement par leur titulaire.

Le service d'email fourni par defaut par Supabase est limite aux adresses
autorisees et ne suffit pas pour une ouverture au public. Ne jamais desactiver
la verification d'email pour contourner cette limite. Configurer un fournisseur
SMTP avant d'ouvrir les inscriptions ; aucune souscription n'est activee ici.
La connexion par mot de passe ne depend pas de cet envoi. La livraison d'un email
de recuperation aux deux adresses n'est pas garantie par le service par defaut
et n'a pas ete testee en envoyant un message reel.

Le projet personnel actuel est sur l'offre gratuite, region Mumbai. Aucun
deplacement de region ou nouveau projet n'est effectue sans demande. Les
images restent sur Cloudflare ; le schema et les migrations restent dans Git.
Prevoir des sauvegardes exportees du registre : le plan gratuit ne fournit pas
de sauvegardes automatiques. La sauvegarde des PSD du PC ne couvre pas cette base.

Les tests utilisent uniquement des profils jetables et un PostgreSQL en memoire.
Les lectures du service heberge verifient les droits sans emettre d'exemplaire.
Une validation d'achat/activation avec de vrais comptes exige une campagne
pilote explicitement autorisee ; elle n'est pas remplacee par une capture UI.
