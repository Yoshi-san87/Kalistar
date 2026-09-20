# Registre Kalistar V3

## Deux Profils Locaux

- Paris : `guillaumeprevost.paris@gmail.com`, administrateur local, 41 exemplaires initiaux.
- Tokyo : `guillaumeprevost.tokyo@gmail.com`, collection initialement vide.

Le bouton de profil en haut ouvre le registre. Le selecteur Paris/Tokyo change de profil dans le meme navigateur. Deck, favoris et partie sauvegardee sont propres au profil. Mes cartes ne montre que les versions possedees ; Catalogue montre toutes les versions. Un deck ne peut pas employer plus d'exemplaires que le profil n'en possede, ni employer ceux en transfert.

Ce selecteur n'est pas une connexion securisee : aucune adresse n'est verifiee, aucun email n'est envoye et aucun mot de passe n'est demande. Ces profils servent a tester le produit seul sur cet ordinateur.

## Transferer

1. Sur Paris, ouvrir Transferts puis Transferer une carte.
2. Choisir l'exemplaire et le profil destinataire. La carte, son identifiant public et les deux adresses sont visibles.
3. Verifier, cocher la confirmation puis envoyer la demande. La propriete ne change pas encore.
4. Basculer sur Tokyo, ouvrir la demande, verifier puis accepter. Le meme exemplaire passe a Tokyo avec sa carriere.

Paris peut annuler une demande encore en attente ; Tokyo peut la refuser. Une demande deja traitee ne peut pas l'etre une seconde fois. Les operations verifient a nouveau la propriete dans une transaction IndexedDB, sans se fier uniquement a l'ecran affiche.

Une carte engagee dans une partie liee est bloquee. Le registre propose l'abandon explicite des parties concernees, sans effacer les archives ni inventer une victoire ou une defaite. Une partie abandonnee ne peut plus reprendre. Remplacer la partie courante demande aussi confirmation et libere ses cartes.

Les anciennes parties sans liaison au registre restent archivees. Leur poursuite exige que Paris possede encore les exemplaires originaux concernes, sans transfert en attente. Acheter un nouvel exemplaire de la meme version ne remplace pas l'original dans cette ancienne partie. Une ancienne copie de simulation sans exemplaire original attribue ne devient pas un objet possede. Les archives deja reconnues restent consultables ; importer de nouveaux resultats legacy concernant un original transfere est refuse hors restauration administrateur complete.

Le transfert numerique ne prouve pas la remise ni l'authenticite de la carte physique.

## Emettre Et Activer

Dans l'Atelier de Paris, choisir une version et confirmer la creation d'un exemplaire supplementaire. Il reste non attribue jusqu'a activation.

- Identifiant public : `KC-` + 128 bits aleatoires, permanent.
- Secret distinct : 256 bits aleatoires, genere avec `crypto.getRandomValues`.
- Stockage : empreinte SHA-256 seulement, jamais le code en clair.
- Usage : une seule activation ; cinq essais incorrects bloquent les essais pendant une minute, par profil et par exemplaire.

Le bon d'activation telecharge est confidentiel. Il contient le secret et doit etre fourni separement de l'image publique de la carte. Fermer cet ecran fait disparaitre le code affiche ; la sauvegarde complete ne permet pas de retrouver le secret. Les 41 exemplaires de depart appartiennent deja a Paris et n'ont aucun code actif.

Sur Tokyo, Activation demande l'identifiant public et le secret. Apres activation, un futur changement de proprietaire passe par le transfert, jamais par la reutilisation du code initial.

## Identifiants Et Impression

Trois niveaux sont distingues :

- Version de carte : par exemple Momo, version donnee, identifiant `30000001`.
- Unite de moteur : `K3-30000001-001`, conserve pour les parties existantes.
- Exemplaire possede : identifiant aleatoire `KC-...`, proprietaire et historique distincts.

La table `collectibles` fait foi pour le prototype. La table historique `instances` contient aussi des copies de simulation adverses, qui ne representent pas des objets possedes.

Les visuels, PSD, formats d'impression et codes-barres existants restent inchanges dans cette revision. Le code-barres actuel des images identifie la version. Avant la production physique, il faudra produire un QR/code public par exemplaire, et remettre le secret sur un support separe. Reimprimer le meme QR copie son identifiant : cela ne prouve jamais qu'un carton est original. Aucun RFID n'est necessaire pour ce prototype.

## Sauvegarde Et Capacite

La base `kalistar-v3-cards` reside dans les donnees du navigateur, pas dans un fichier du dossier. Paris peut exporter la collection depuis les archives. Le JSON schema 3 contient les deux profils, les proprietaires, les empreintes d'activation, les transferts et les parties. Ne pas publier cette sauvegarde.

Une restauration complete est une operation administrateur explicite : elle remplace les donnees locales et peut revenir a une ancienne propriete ou rendre de nouveau inutilise un code present comme inutilise dans la sauvegarde. Ce n'est pas un registre inviolable. Les imports invalides sont annules sans ecriture partielle.

Fermer les autres onglets Kalistar avant une restauration complete. Les pointeurs de reprise des deux profils sont effaces pour ne pas remettre une partie perimee dans la base restauree. Les parties presentes dans le fichier restent archivees. Importer une sauvegarde de partie individuelle conserve les autres archives ; leurs cartes restent engagees tant que ces parties ne sont pas abandonnees depuis le registre.

IndexedDB convient au prototype. Le quota depend du navigateur, de l'origine et du disque ; ce n'est pas un nombre fixe de cartes. L'onglet Stockage affiche l'utilisation et le quota reellement estimes, et permet de demander la conservation persistante. Cette demande peut etre refusee. Meme accordee, elle ne protege pas contre un effacement volontaire des donnees.

Mesure illustrative dans le navigateur de test isole : 42 exemplaires, deux parties et quelques transferts representent environ 0,4 Mio en JSON, images exclues. Ce n'est pas un benchmark de capacite maximale. L'application actuelle recharge les tables en memoire et les transactions lisent leurs instantanes ; beaucoup de matchs ralentiront le systeme avant le quota disque. L'import UI est borne a 50 Mo, 10 000 matchs et 100 000 lignes par table de registre : ce sont des garde-fous d'import, pas des performances garanties.

Sources : [quotas et eviction, MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [securite du stockage navigateur, OWASP](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html).

## Passage A De Vrais Comptes

Le futur serveur devra verifier les connexions, attribuer les droits sur chaque operation, conserver l'autorite unique sur les proprietaires et limiter les essais cote serveur. Les identifiants opaques ne remplacent pas ces controles. Les statistiques de matchs envoyees par un navigateur ne sont pas une preuve inviolable non plus.

Le schema local separe deja utilisateurs, versions, exemplaires, activations, transferts et evenements pour faciliter cette migration. Aucun hebergement, abonnement ou service externe n'a ete cree.

## Verification

`verification-ownership/backend-tests.json` et `ui-report.json` decrivent les essais reproductibles. Les tests utilisent des navigateurs et bases isoles ; ils ne modifient pas les donnees reelles du joueur. Les controles moteur, arene, presets et archives sont egalement relances. Le contrat technique est dans `verification-ownership/backend-api.md`.
