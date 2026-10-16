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
continuent a fonctionner comme avant. Aucun exemplaire n'est importe ou emis
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

`kalistar_private` isole roles administrateurs, empreintes SHA-256 des secrets,
tentatives, journal et version du schema. Aucun droit de schema/table/fonction
n'est donne aux roles navigateur. Les fonctions API ont un search_path vide
et sont explicitement autorisees une par une.

Le certificat public projette uniquement modele, numero, statut, serie pilote,
dates et pseudo si le proprietaire l'a choisi. Il ne retourne ni UUID du joueur,
ni email, ni empreinte, ni secret. Les identifiants publics sont consultables :
la confidentialite ne repose jamais sur leur difficulte a deviner.

Les fonctions mutantes exigent un utilisateur Auth dont l'email est confirme.
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

Le client officiel utilise un lien de connexion par email, le flux PKCE et
une cle de session distincte `kalistar.cloud.auth.v1`. Les tokens Auth ne sont
pas inclus dans les exports locaux. Le site n'a aucune cle d'administration.
Les autorisations de redirection doivent rester limitees a l'origine personnelle
du jeu, sans joker. Le registre se charge a la demande et ne bloque pas le jeu.
Le Site URL configure est `https://kalistar.pages.dev/jeu/` et l'unique retour
autorise est `https://kalistar.pages.dev/jeu/?registry=1`, avec accord explicite.
Le menu Plus et le bouton Compte Kalistar en ligne des archives locales ouvrent
le registre. La premiere connexion doit etre faite personnellement par l'auteur :
son acces au tableau de bord Supabase ne cree pas un compte joueur Auth.
Depuis localhost ou une preview, le formulaire renvoie vers le site officiel :
PKCE exige le meme navigateur et la meme origine que la demande du lien email.

Le service d'email fourni par defaut par Supabase est limite aux adresses
autorisees et ne suffit pas pour une ouverture au public. Ne jamais desactiver
la verification d'email pour contourner cette limite. Configurer un fournisseur
SMTP avant d'ouvrir les inscriptions ; aucune souscription n'est activee ici.

Le projet personnel actuel est sur l'offre gratuite, region Mumbai. Aucun
deplacement de region ou nouveau projet n'est effectue sans demande. Les
images restent sur Cloudflare ; le schema et les migrations restent dans Git.
Prevoir des sauvegardes exportees du registre : le plan gratuit ne fournit pas
de sauvegardes automatiques. La sauvegarde des PSD du PC ne couvre pas cette base.

Les tests utilisent uniquement des profils jetables et un PostgreSQL en memoire.
Les lectures du service heberge verifient les droits sans emettre d'exemplaire.
Une validation d'achat/activation avec de vrais comptes exige une campagne
pilote explicitement autorisee ; elle n'est pas remplacee par une capture UI.
