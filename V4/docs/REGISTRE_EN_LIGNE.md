# Registre des exemplaires

[Index](../../docs/INDEX.md) | [Architecture du site](../site/README.md) |
[Migrations et tests](../deploy/supabase/README.md)

## Espace personnel

Mon compte est une page du jeu (`#account/profile`), pas une modale.
Compte regroupe le nom public, le pseudo et la deconnexion. Parametres regroupe
le consentement de visibilite, l'etat de sauvegarde et le changement de mot de
passe via la session Auth existante. Le formulaire ne memorise pas ce secret.
Transferer une carte propose un selecteur d'exemplaire et les demandes en cours,
sans reproduire la galerie Collection. Activation et certificats restent dans
cette rubrique, ainsi que l'emission pour le seul role administrateur serveur.
La carte selectionnee occupe la colonne de droite sur PC ; sur telephone,
un apercu compact suit le selecteur. Le trajet visuel relie les pseudos sans
rechercher ou certifier un destinataire pendant la saisie. Les effets courts
d'envoi et de reception attendent la confirmation serveur. Une proposition
reste en attente : seul le consentement du destinataire transfere la propriete.
Les effets sont finis, desactives en mouvement reduit, et ne sont pas rejoues
apres navigation. Modifier le destinataire invalide immediatement la confirmation.
Changer de rubrique ou quitter la page efface les secrets affiches ; les
reponses tardives ne peuvent pas les restaurer.

Facturation / paiements n'est pas encore un service ouvert. Contact affiche
`contact@Kalistar.com` comme future adresse, sans lien d'envoi tant que la boite
n'est pas active. Aucun email personnel n'est utilise comme support public.

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

## Collections du jeu heberge

Le serveur fournit les exemplaires attribues au compte. Le jeu heberge ne
reprend plus les possessions de demonstration pour autoriser un deck. Le serveur
verifie au lancement les dix exemplaires disponibles, les personnages distincts,
la limite Rainbow, deux candidats par position et une formation P1-P5 possible.
Les identites KC sont figees dans la partie. L'adversaire IA reste virtuel.

Distribution autorisee le 16 octobre : Paris recoit une copie de chacune des
434 versions publiees ; Tokyo dix cartes dont Kaylis 30000012. Le script
`starter-grants.cjs` derive le catalogue approuve et produit une transaction
controlee sous work/, sans adresse ou AuthUUID dans Git. La table privee des lots
empeche toute reemission au second passage, meme apres transfert. Les nouvelles
publications ne sont pas automatiquement offertes. Ces lots numeriques sont
deja attribues, sans secret recuperable a imprimer ; les futurs exemplaires
physiques suivent le parcours d'activation distinct.

Un administrateur local ne devient pas administrateur Supabase. Les equipements
actuels restent disponibles selon leur compatibilite ; leur possession en
exemplaires n'est pas ajoutee par cette evolution.

Le compte Paris recoit explicitement le role administrateur du registre pour
les apercus de parcours. Tokyo reste joueur. Ce droit vient de la table privee
`admins`, jamais du pseudo, du profil local ou de metadata Auth modifiable.
La [Bibliotheque](PARCOURS_BIBLIOTHEQUE.md) contient des livres de quatre combats
dont la carte finale est attribuee par le serveur apres les quatre victoires.

Un compte ne peut posseder qu'un seul exemplaire de chaque modele/version,
administrateur compris. Les autres versions du personnage restent autorisees.
L'index serveur couvre activation, transfert, recompense et futurs ajouts.
Un doublon n'est pas detruit : une activation deja possedee laisse son secret
disponible et un transfert incompatible est refuse avant attribution.

## Synchronisation

`cloud-player.js` filtre la progression, `cloud-archives.js` separe les archives,
`cloud-ownership.js` projette les droits
serveur, `cloud-sync.js` gere revisions et conflits. Decks, equipements, favoris,
lecture Story et rencontres sont lies au compte Auth, pas a un nom ou email
utilise comme cle. Paris et Tokyo ne partagent pas leurs sauvegardes. Les images
restent sur Cloudflare, jamais dans les payloads de progression.

La table privee `player_saves` conserve revision, payload et bail d'appareil.
Les RPC `kalistar_sync_v2_read/claim/write/release` exigent l'acteur autorise. Une
ecriture exige la revision lue et un bail valide : aucun dernier-ecrivain-gagne
silencieux. Le bail dure 120 secondes, renouvele toutes les 45 secondes visibles.
Une lecture avec revision connue et un acquittement reussi n'envoient pas tout
l'historique a nouveau ; une divergence renvoie l'etat complet a resoudre.
Un autre appareil demande explicitement de reprendre ; l'ancien perd le droit
d'ecriture a sa prochaine operation. Le jeu y suspend les actions de combat.
Un conflit conserve le brouillon et propose compte/appareil. Un choix local ne
contourne ni revision ni bail. Le serveur interdit le transfert d'une carte
engagee dans la partie synchronisee et valide ses liaisons a chaque ecriture.

Cache IndexedDB : `kalistar-v4-cards-cloud-<AuthUUID>`, meme couche locale et
preferences `kalistar.v4.cloud.<AuthUUID>.`. Baseline et outbox sont dans IndexedDB,
pas dans le petit quota localStorage. Aucun token, mot de passe, secret
d'activation ou registre de propriete local ne fait partie du payload. Une
coupure laisse les changements en attente ; un nouveau match exige le controle
en ligne. Il n'y a pas de convergence aveugle entre appareils hors ligne.

L'ancienne base `kalistar-v4-cards` et ses preferences restent intactes. Une copie
de reprise filtre les donnees du compte et relie les rencontres compatibles aux
exemplaires attribues, sans changer les originaux. Les archives incompatibles
restent locales avec avertissement. Avant application du cloud ou resolution
de conflit, cinq sauvegardes de securite au plus sont conservees dans le cache.
Un cloud existant et un appareil deja modifie demandent un choix explicite.

Payload schema 2, V4 : `localProfile`, `preferences` (liste fermee), `deckLibrary`,
`equipment`, `matches` (la seule partie active), `archives` (references `id/hash`),
`activeMatchId`, `releasedMatches`. Le document courant reste limite a 8 Mio et
10 000 references. Chaque archive immuable est privee au compte, identifiee par
SHA-256 et limitee a 2 Mio. Les RPC `kalistar_archive_put/read` transferent au
plus huit archives par appel ; chaque envoi exige le meme bail et la meme revision
que la progression. Le document courant n'est valide qu'apres leur acquittement.
Le serveur refuse les references absentes ou appartenant a un autre compte.

La migration 010 ne reecrit ni ne supprime les anciens payloads schema 1. Le
nouveau client les convertit a leur prochaine sauvegarde ; un ancien onglet ne
peut pas ecraser un document deja migre. Les archives et brouillons non acquittes
sont conserves en IndexedDB, meme apres fermeture de l'onglet. Une empreinte
incorrecte interrompt la restauration sans remplacer la progression locale.
Une archive contient les profils engages et la seule arene du combat. Les
resultats sont reconstruits depuis les snapshots valides, sans importer des
compteurs fournis par le joueur. Les anciennes versions d'une archive ne sont
pas automatiquement effacees : surveiller la taille serveur avant ouverture large.

La retention locale garde quatre sessions acquittees et preserve tous les
brouillons en attente ou illisibles. Les identifiants d'onglet restent distincts
pour les baux. Une petite ecriture de metadonnees ne relit plus les rencontres ;
les sauvegardes cloud utilisent les cles de la partie et des exemplaires touches.
Le chargement initial/statistiques conserve encore l'historique complet en local :
la pagination reseau n'est pas une virtualisation complete de l'historique.

Les statistiques et trophees des parties ordinaires restent calcules dans le
navigateur : leur synchronisation n'en fait pas des resultats certifies anti-triche.
Les parcours font exception : leur moteur s'execute dans le Worker et leurs
victoires/recompenses sont validees dans des tables privees distinctes. Cela
n'autorise pas a transformer les anciens historiques en recompenses certifiees.

## Donnees et droits

`kalistar_models` contient seulement les versions approuvees rendues disponibles
a l'emission. Les 434 versions du lot initial sont inscrites. Un futur import doit venir
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
joueurs : aucun joueur n'est automatiquement administrateur du registre ; Paris
l'est par attribution explicite de l'auteur, pas par sa connexion au tableau de bord.
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
Le plan gratuit ne fournit pas de sauvegardes automatiques. Le processus local
d'[export chiffre et restauration d'essai](../deploy/supabase/README.md#sauvegarde-du-registre)
couvre le registre ; les sauvegardes PSD ne le remplacent pas. Une copie locale
ne protege pas contre la perte du PC : un support independant reste necessaire.

Les tests utilisent uniquement des profils jetables et un PostgreSQL en memoire.
Les tests d'activation et de transfert utilisent des specimens fictifs. La
distribution administrative ci-dessus est la seule emission reelle autorisee
dans cette livraison ; aucun achat ni transfert reel n'est simule.
