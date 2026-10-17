# Fragment : parcours de personnages

[Index](../../docs/INDEX.md) | [Registre](REGISTRE_EN_LIGNE.md)

## Regles joueur

Fragment est accessible dans le menu Plus. Chaque livre suit un
personnage et comporte **exactement quatre combats** contre des equipes fixes.
Le joueur utilise sa composition et ses propres exemplaires. Les regles de
duel, les des, les equipements et les synergies restent ceux de l'Arene.

Une victoire debloque l'etape suivante. Une defaite ou un nul laisse les victoires
deja acquises intactes. Une seule rencontre de parcours peut etre active par
compte ; elle se reprend sur l'appareil qui controle la sauvegarde. Abandonner
ne retire pas les etapes gagnees. La connexion est necessaire pour jouer et
recevoir la carte ; une commande interrompue ne relance pas les des.

Apres quatre victoires, Recevoir la carte attribue un exemplaire du modele
indique en couverture. Le livre est ensuite acheve : ses passages restent
lisibles, mais il ne redonne jamais de recompense, meme apres un transfert.
Si cette version est deja possedee, aucun doublon n'est cree. Il n'y a ni pack,
ni achat aleatoire, ni augmentation de puissance des cartes existantes.

Les trois premiers livres concernent Momo, Balmhyr et Kaylis. Ils utilisent les
illustrations et textes des cartes approuvees, sans modifier le roman ni reveler
ses secrets. Les passages apres victoire restent des evocations, pas de nouveaux
evenements canoniques. Paris dispose d'un apercu administrateur des quatre
combats, clairement marque, sans sauvegarde de rencontre ni recompense. Tokyo
reste un joueur normal.

## Responsabilites

Le nom joueur est Fragment. La route `#journeys`, les identifiants des livres
et les noms de tables restent stables ; `#library` reste les regles du jeu.
Sur telephone, le bouton de filtres pres du titre deplie les champs en deux
colonnes. Le rayonnage defile horizontalement et la page verticalement si
necessaire. Le livre ouvert devient une page de lecture, avec ses commandes
au-dessus du menu fixe. Les quatre combats et les recompenses ne changent pas.

### Couvertures Illustrees

Le livre ferme montre en grand la peinture de la **version recompense**, pas
une miniature de carte sur une couverture Story. La reliure originale cuivre,
argent et cuir sombre est partagee ; sa fenetre transparente laisse voir la
peinture sans la regenerer. Le nom et le titre restent du texte HTML lisible.
Story et ses douze couvertures Kalistel sont independants et preserves.

Les trois peintures optimisees et la reliure vivent dans `site/assets/journeys/`.
La table `coverArt` de `journey-view.js` est indexee par `rewardModelId`, jamais
par nom ou `characterId`. Un modele sans export dedie utilise le recadrage de
sa propre carte via `card-media.js`, pas l'illustration d'une autre version.
Les images sont chargees paresseusement, sans animation ou canvas permanent.
La progression reste visible hors de la couverture ; une coche marque un livre
acheve. Les titres et controles restent utilisables en Reduced Motion.

Provenance, prompt de generation, preparation des WebP et empreintes sources :
`V4/revisions/2026-10-17-fragment-covers/`. Pour ajouter une couverture, selectionner
l'illustration approuvee du modele recompense, produire son WebP avec le meme
pipeline, ajouter son entree `coverArt`, sauvegarder et inscrire le media dans
`runtime-media.json`, puis verifier PC/Razr. Une couverture seule ne modifie pas
la revision des rencontres, les recompenses ni le schema de progression.

- `journey-definitions.js` : livres, quatre etapes, textes, images, equipes et
  modele/version recompense. Aucun nom affiche n'est une cle de personnage.
- `journey-combat.js` : initialise et applique des commandes avec le moteur
  commun. Les decisions automatiques de l'IA sont controlees, les faces de de
  forcees et les commandes de resultat sont refusees.
- `journey-worker.mjs` : recoit un JWT joueur, charge l'etat prive, execute le
  moteur serveur puis signe son nouvel etat. Aucun etat ou gagnant envoye par
  le navigateur n'est accepte comme preuve.
- `journey-client.js` : connexion, bail d'appareil, commandes, reprise apres
  acquittement perdu. `app.js` raccorde les animations de combat existantes.
- `journey-view.js/css` : rayonnage horizontal, filtres, ouverture, parcours,
  lecture et ceremonie de carte. Aucun calcul de victoire.

Sur telephone (y compris paysage tactile), le contexte Fragment n'ajoute aucune
ligne au plateau : le bouton des options du match indique l'etape `1/4` a `4/4`.
Sa premiere action affiche le livre, l'etape et le retour au parcours. Le bandeau
complet reste visible sur PC. Les commandes, la sauvegarde et la reprise sont
identiques aux autres rencontres ; ne pas masquer un debordement du plateau
avec un overflow global pour compenser un nouvel element dans son flux.

Le build assemble les memes modules purs de moteur et le catalogue approuve
dans le Worker, par une entree CommonJS standard, sans eval ni nouvelle
dependance runtime. Son SHA-256 identifie
les regles exactes de chaque tentative. Une mise a jour incompatible demande de
recommencer le combat courant ; les etapes gagnees restent conservees.

## Donnees Serveur

La migration 007 impose un index unique partiel `(owner_id,model_id)` pour
`status='owned'`. Activation, transfert et attribution respectent ce contrat,
y compris pour Paris. Une autre version du meme personnage reste collectionnable.
La limite d'un personnage par deck demeure une regle distincte.

La migration 008 ajoute dans le schema prive ; la 009 borne les entrees RPC et
normalise le code-barres avant le controle de transfert :

| Table | Donnees |
| --- | --- |
| `journeys` | Identifiant, revision, modele recompense, quatre etapes, ouverture |
| `journey_progress` | Compte, livre, nombre de victoires de 0 a 4 |
| `journey_attempts` | Deck et dix KC figes, graine serveur, etape, moteur, sequence, dernier etat, statut |
| `journey_claims` | Attribution unique, exemplaire recu/deja possede, ceremonie acquittee |
| `journey_config` | Cle de signature technique, jamais lisible par le navigateur |

Les RPC exigent l'identite Auth confirmee et autorisee. Debut, reprise et
commandes exigent en plus le bail courant de synchronisation. Une sequence CAS
interdit deux avancements concurrents. La progression et la recompense sont
transactionnelles et idempotentes. Un transfert d'exemplaire engage est bloque.
Les sauvegardes joueur ordinaires ne peuvent pas ecrire ces tables.

La cle `KALISTAR_JOURNEY_KEY` est distincte du cookie de connexion ; elle ne va
ni dans Git, ni dans le build, ni dans une capture ou un export. Une copie privee
est conservee hors checkout. Elle est installee uniquement dans le projet Pages
personnel et dans `journey_config`. Aucune cle service_role n'est utilisee.

Le serveur renouvelle l'entropie avec Web Crypto avant chaque lot de commandes.
Le RNG d'un snapshot public et la graine affichee ne permettent pas de predire
le jet suivant. Un lot refuse ne peut pas servir a sonder le meme prochain de :
la tentative suivante recoit une nouvelle entropie. Un acquittement perdu se
recupere par lecture de la sequence deja validee, sans rejouer la commande.

Le serveur conserve le dernier etat de chaque tentative, pas une copie par
commande. Seules les definitions d'equipement engagees traversent le reseau ;
le catalogue d'objets non equipes n'est pas renvoye a chaque clic. Les objets
engages restent des snapshots autonomes, pas des references modifiables.
Il n'efface automatiquement ni progression ni archives. Surveiller
la croissance du stockage avant une ouverture publique. Les tests PostgreSQL
ephemeres ne constituent pas un test de charge multiconnexion Cloudflare/Supabase.
Ce mode solo certifie ses transitions serveur ; il n'est pas un classement
competitif ou un dispositif anti-bot.

## Ajouter Un Livre

1. Choisir un modele/version approuve et son `characterId`. Reutiliser les
   medias existants ou inscrire et sauvegarder tout nouveau media avant build.
2. Ajouter une definition avec un id stable et **quatre** etapes uniques :
   titre, illustration, intro/outro, arene, dix cartes et capitaine titulaire.
   Les equipes doivent couvrir deux fois P1-P5 avec des personnages distincts
   et au maximum un Rainbow. Le validateur refuse toute autre longueur.
3. Ajouter une migration additive pour `journeys`, avec le meme id/revision,
   modele recompense et `stage_count=4`. Ne jamais modifier une migration appliquee.
   Ne pas changer silencieusement la recompense d'un livre deja joue.
4. Tester les quatre rencontres, victoire/defaite/reprise, droits, attribution
   unique et version deja possedee. Verifier PC, Razr et reduced-motion.
5. Publier ensemble definitions, schema et Worker versionnes. Les resultats de
   test restent dans work/, jamais dans une progression personnelle.

## Verification

`unique-models.test.cjs` couvre les doublons et les droits du registre.
`journeys.test.cjs` utilise PostgreSQL et de vrais resultats du moteur pour les
trois livres. `journey-combat.test.cjs` execute les commandes de bout en bout.
`journeys.browser.test.cjs` traverse quatre combats complets par le Worker et
PostgreSQL, puis la vraie ceremonie UI. `journey-view.browser.test.cjs` verifie
le rendu, les controles, les petits ecrans et le nettoyage dans un contexte
jetable. Aucun test ne distribue de carte sur un compte reel.
`journey-covers.test.cjs` verifie les sources exactes, leurs empreintes, les
medias inscrits et la transparence de la reliure. Le test navigateur controle
aussi le cadrage, la separation du titre et le fallback d'une autre version.
