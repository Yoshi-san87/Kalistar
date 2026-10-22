# Fragment : parcours de personnages

[Index](../../docs/INDEX.md) | [Registre](REGISTRE_EN_LIGNE.md)

## Regles joueur

Fragment est accessible dans le menu Plus. Chaque livre suit un personnage :
**quatre combats pour sa carte, puis un combat pour une arme, un pour une
protection et un pour une relique**. Ce parcours **4+1+1+1** utilise sept equipes
fixes. Le joueur conserve sa composition et ses propres exemplaires ; les regles
de duel, les des, les equipements et les synergies restent ceux de l'Arene.

Une victoire debloque l'etape suivante. Une defaite ou un nul laisse les victoires
deja acquises intactes. Une seule rencontre de parcours peut etre active par
compte ; elle se reprend sur l'appareil qui controle la sauvegarde. Abandonner
ne retire pas les etapes gagnees. La connexion est necessaire pour jouer et
recevoir les recompenses ; une commande interrompue ne relance pas les des.

Apres quatre victoires, Recevoir la carte attribue un exemplaire du modele
indique en couverture. Si cette version est deja possedee, aucun doublon n'est
cree. La suite reste cachee jusqu'a l'attribution ET a l'acquittement de cette
ceremonie par le serveur. La premiere nouvelle page se revele alors, sans
annoncer d'avance les chapitres suivants ni leurs recompenses.

Chaque victoire bonus ouvre une attribution distincte. Recevoir l'arme et
acquitter sa ceremonie debloque la protection ; recevoir la protection et
l'acquitter debloque la relique. Gagner un combat ne suffit pas a sauter cette
etape. Une interruption permet de reprendre la ceremonie ou son acquittement,
sans rejouer le combat ni attribuer une seconde fois l'objet.

Apres les sept victoires et les quatre attributions, le livre est acheve et ses
passages restent lisibles. Il n'y a ni pack, ni achat aleatoire, ni changement
de balance du moteur. Les objets gagnes ne sont pas equipes automatiquement.

### Recompenses

Les types techniques sont `weapon`, `shield` (protection) et `relic`. Les
indices des rencontres sont absolus : `0..3` pour la carte, `4`, `5`, `6` pour
les trois bonus, respectivement apres la cinquieme, sixieme et septieme victoire.

| Livre | Carte apres 4 victoires | Arme, indice 4 | Protection, indice 5 | Relique, indice 6 |
| --- | --- | --- | --- | --- |
| Momo, Pour ceux que l'on oublie | `30000014`, Le Bal des objets perdus | La Flute des Petits Bonheurs, `little-joys-flute` | Harnais des Passerelles, `kalistar-chroma-harness` | Boite des Petits Bonheurs, `little-joys-box` |
| Balmhyr, Le poids du retour | `30000007`, Le royaume a l'horizon | Hache du Roi Dechu, `fallen-king-axe` | Le Rempart de Durane, `durane-rampart` | Gant de Fer, `mythic-iron-gauntlet` |
| Kaylis, Choisir son prochain pas | `49055457` | Promesse, `white-oath-rapier` | Bottes du Prochain Pas, `kaylis-next-step-boots` | Ruban des Couleurs, `kaylis-colours-ribbon` |

La compatibilite porte sur la version recompensee, pas seulement le personnage.
La migration 013 dirige les futures attributions Momo vers la version debout a
la flute. Une ancienne attribution `30000001` reste definitive et affiche sa
vraie version : ni remplacement, ni seconde carte, ni remise a zero.
La migration 014 dirige les futures attributions Balmhyr vers `30000007`,
compatible avec la Hache et les deux autres objets. Les anciens claims `49900802`
restent definitifs : cette version Poing porte le Gant en relique, pas la Hache.
Les anciens objets sont conserves. Un chapitre bonus deja reclame recoit aussi
sa recompense revisee sans nouvelle victoire ; son ancien recu reste dans un
journal prive et son acquittement n'est pas efface. Le Sceau reste un objet
existant, mais n'est plus la recompense finale de ce Fragment.
Promesse convient a Kaylis `49055457`, armee d'une epee courte.

Le Gant de Fer est une relique propre a Balmhyr, toutes ses versions. Apres
avoir survecu a une attaque en inferiorite numerique, il prepare +40 ATK pour
sa prochaine attaque numerique conservee, une fois par partie. Il ne remplace
ni la famille imprimee ni les bonus sur les 6 de la Hache et du Rempart. Les
rencontres deja commencees conservent leurs definitions d'equipement figees.

### Attribution Et Transfert

Chaque attribution est unique par compte et livre ; chaque bonus est aussi
identifie par son indice. Une nouvelle demande renvoie l'attribution deja
enregistree. Le transfert de la carte ne reinitialise ni la progression ni le
droit deja consomme : le compte d'origine ne peut pas recevoir une seconde
carte en relancant la demande. Le destinataire ne recoit pas la progression
Fragment de l'ancien proprietaire.

Les equipements sont des droits du compte dans `equipment_grants`, distincts
des exemplaires de cartes `KC-...`. Posseder ou recevoir un personnage n'accorde
pas tous ses objets ; transferer sa carte ne transfere pas ses equipements.
Un objet deja possede n'est pas duplique, mais sa recompense de chapitre est
enregistree et doit etre acquittee pour poursuivre. Ni un rechargement, ni un
transfert de carte, ni une sauvegarde locale ne reouvrent une attribution.

### Continuite Narrative

Les trois premiers livres concernent Momo, Balmhyr et Kaylis. Ils utilisent les
profils et illustrations approuves, le lore des equipements et les passages
locaux de `story-content.json`. Les identifiants des quatre etapes restent
stables ; leurs recits et adversaires suivent desormais la demande narrative
de l'auteur. Chaque scene avant/apres combat compte 80 a 140 mots.

Le canon donne les gestes et leurs limites : Momo domestique est rejete pour
ses emotions, rencontre Taulio a la casse, trouve une flute puis retrouve des
souvenirs par la musique. Gezinho n'est nomme qu'a la fin ; sa transformation
par le Kalistel Electro reste suggeree, sans reunion inventee. Kaylis l'aide
a envisager sa recherche. Kaylis apprend la prise de Promesse, les appuis dans ses bottes noires et le
nouage du tissu bleu nuit a motifs dores, eclaire par ses tatouages. Ces objets
ne deviennent pas des artefacts majeurs. Aucun secret du roman, destin futur,
origine non autorisee ou nouveau pouvoir n'est revele. Les equipes adverses sont
des epreuves du parcours, pas de nouvelles alliances canoniques. Le roman
n'est pas modifie et les evocations ne fixent pas de nouveaux evenements.

Pour Balmhyr, la trame explicitement validee par l'auteur couvre la trahison
de son frere cadet Lok, l'exil dans un territoire sous confinement magnetique,
la liberation avec Kaylis et les retrouvailles avec Madania. Le Gant de Fer,
cache chez elle avant le bannissement, est la grande relique de Durane. Apres
la carte, la Hache, le passage protege par le Rempart et le combat contre Lok
terminent le retour. Lok est le capitaine du septieme combat ; il est vaincu
et garde vivant, sans nouvelle guerre ou mort inventee. Les revelations de
ce Fragment sont celles de cet arc autorise, pas un changement du roman.

Les 21 adversaires sont des compositions distinctes de dix personnages natifs,
avec deux compatibilites par position et un capitaine titulaire. Momo original
est au premier combat, Taulio au deuxieme ; le quatrieme combat de chaque livre
a pour capitaine la version recompensee. Le catalogue publie complet fournit les candidats,
sans collaboration. Les equipes incarnent l'episode sans inventer des alliances.
La difficulte vient des compositions et synergies, jamais de des truques ou de
bonus caches. Les contres empechent de garantir une hausse contre toute equipe.
Les compositions precedentes et leurs 3024 matchs de comparaison restent dans
`V4/revisions/2026-10-22-fragment-adventure/DECKS.md` (preuve historique, pas
mesure des nouveaux decks Balmhyr). La revision actuelle et ses controles
figurent dans `V4/revisions/2026-10-22-balmhyr-fragment/README.md`.

Paris dispose d'un apercu administrateur des sept combats, clairement marque,
sans sauvegarde de rencontre, progression ou attribution. Cet apercu peut
montrer les bonus caches au joueur normal. Tokyo reste un joueur normal.

## Responsabilites

Le nom joueur est Fragment. La route `#journeys`, les identifiants des livres
et les noms de tables restent stables ; `#library` reste les regles du jeu.
Sur telephone, le bouton de filtres pres du titre deplie les champs en deux
colonnes. Le rayonnage defile horizontalement et la page verticalement si
necessaire. Le livre ouvert devient une scene illustree, avec ses commandes
au-dessus du menu fixe. Les quatre combats de la carte restent distincts de la
suite, revelee chapitre par chapitre.

### Couvertures Illustrees

Le livre ferme montre en grand la peinture de la **version recompense**, pas
une miniature de carte sur une couverture Story. La reliure originale cuivre,
argent et cuir sombre est partagee ; sa fenetre transparente laisse voir la
peinture sans la regenerer. Le nom et le titre restent du texte HTML lisible.
Story et ses douze couvertures Kalistel sont independants et preserves.

Les peintures optimisees et la reliure vivent dans `site/assets/journeys/`.
La table `coverArt` de `journey-view.js` est indexee par `rewardModelId`, jamais
par nom ou `characterId`. Un modele sans export dedie utilise le recadrage de
sa propre carte via `card-media.js`, pas l'illustration d'une autre version.
Les images sont chargees paresseusement, sans animation ou canvas permanent.
La progression de la carte reste visible hors de la couverture, sur quatre
combats ; une coche marque le livre entier acheve, pas seulement la carte
obtenue. Les titres et controles restent utilisables en Reduced Motion.

Provenance, prompt de generation, preparation des WebP et empreintes sources :
`V4/revisions/2026-10-17-fragment-covers/`. Pour ajouter une couverture, selectionner
l'illustration approuvee du modele recompense, produire son WebP avec le meme
pipeline, ajouter son entree `coverArt`, sauvegarder et inscrire le media dans
`runtime-media.json`, puis verifier PC/Razr. Une couverture seule ne modifie pas
la revision des rencontres, les recompenses ni le schema de progression.

### Scenes Du Parcours

Le lecteur ouvert n'utilise plus le fond livre. Les sept etapes Momo possedent
chacune une peinture panoramique originale, adaptee aux references des cartes.
Cliquer une station change la scene et le recit ; seules les etapes autorisees
du joueur sont rendues et chargees. Les autres parcours utilisent les peintures
approuvees de leur personnage de scene. Les chapitres bonus restent caches
jusqu'a leurs ACK. Une image existe en 1672px et 840px, choisie par le navigateur.
L'arrivee de scene est une animation finie, desactivee en reduced-motion ; aucun
canvas, minuteur ou mouvement permanent. Sources, prompts et empreintes :
`V4/revisions/2026-10-22-fragment-adventure/`.

- `journey-definitions.js` : `catalogue()` conserve `stages` avec les quatre
  etapes historiques et expose separement `bonusStages` avec trois etapes,
  `rewardEquipmentId` et `rewardKind`. `bonusReveal` fournit le premier passage
  de revelation. `combatStages(book)` concatene les deux listes d'un livre du
  catalogue ; `validate()` retourne les livres avec sept `stages` pour le moteur.
  Ne pas concatener une seconde fois cette vue runtime. La validation controle
  les equipes, arenes, capitaines, objets existants, types et porteurs exacts.
  La revision reste `journeys-1` ; les indices `0..3` ne sont ni modifies ni
  renumerotes. Aucun nom affiche n'est une cle de personnage.
- `journey-combat.js` : initialise et applique des commandes avec le moteur
  commun. Les decisions automatiques de l'IA sont controlees, les faces de de
  forcees et les commandes de resultat sont refusees.
- `journey-worker.mjs` : recoit un JWT joueur, charge l'etat prive, execute le
  moteur serveur puis signe son nouvel etat. Aucun etat ou gagnant envoye par
  le navigateur n'est accepte comme preuve.
- `journey-client.js` : connexion, bail d'appareil, commandes, attribution et
  ACK des recompenses, reprise apres acquittement perdu. `app.js` raccorde les
  animations de combat et les ceremonies aux reponses serveur.
- `journey-view.js/css` : rayonnage horizontal, filtres, ouverture, parcours,
  lecture, ceremonies de carte/equipement et revelation de la suite. Aucun
  calcul de victoire ni ecriture locale de progression.

### Revelation Et ACK

Pour un joueur normal, la route affiche quatre combats et la carte avant son
ACK : aucun titre bonus, recompense future ou compteur sur sept n'annonce la
suite. Apres chaque ACK, seul le prochain bonus encore inconnu devient visible.
Les chapitres deja reveles et leurs passages gagnes restent accessibles.
Le catalogue statique contient les definitions ; ce masquage est narratif,
pas une garantie de confidentialite des fichiers sources.

L'ordre est : attribution serveur, rafraichissement des possessions et de la
progression, ceremonie, confirmation du joueur, ACK serveur, puis revelation
du chapitre suivant. `revealReward()` et `revealEquipment()` ne font que la
presentation ; leur resolution `true` permet de demander l'ACK. Une destruction
de vue renvoie `false` et ne doit pas l'envoyer. `revealSequel()` ne debloque
rien sur le serveur et ne doit pas partir automatiquement au montage ou au
rechargement. Si une ceremonie est interrompue, le bouton de reprise reutilise
l'attribution enregistree. Un ACK perdu se recupere ou se redemande de facon
idempotente ; fermer une animation ne remplace pas la confirmation serveur.

`start` refuse l'indice `4` sans claim carte acquitte ; les indices `5` et `6`
exigent aussi le claim acquitte de l'equipement precedent. `equipment-claim`
exige la victoire du chapitre, l'ACK carte et, apres le premier bonus, l'ACK de
l'equipement precedent. Les RPC d'ACK ne creent jamais d'attribution manquante.
Les controles UI accompagnent ces verrous serveur, ils ne les remplacent pas.

Sur telephone (y compris paysage tactile), le contexte Fragment n'ajoute aucune
ligne au plateau : le bouton des options conserve `1/4` a `4/4` pour la carte.
Les bonus doivent etre identifies comme chapitres 5, 6 et 7, sans afficher
`5/4` ni reveler une recompense encore cachee.
Sa premiere action affiche le livre, l'etape et le retour au parcours. Le bandeau
complet reste visible sur PC. Les commandes, la sauvegarde et la reprise sont
identiques aux autres rencontres ; ne pas masquer un debordement du plateau
avec un overflow global pour compenser un nouvel element dans son flux.

Le build assemble les memes modules purs de moteur dans le Worker, par une
entree CommonJS standard, sans eval ni nouvelle dependance runtime. Son SHA-256
porte sur les modules executables enumeres dans `journey-hash.cjs`, pas sur
tout le catalogue public. Chaque tentative fige ses participants, son arene,
ses matrices et ses regles dans `journey.snapshot`. Serveur, reprise, calculs
et rapports utilisent ces donnees. Une nouvelle carte ou une modification
descriptive du catalogue ne change donc pas un combat en cours.

La reprise des tentatives 4.6.85 sans snapshot est explicitement autorisee par
`journey-compatibility.json` et le catalogue historique verifie par SHA-256,
`journey-legacy-4.6.85.json`. Le serveur conserve leur ancienne signature et
sequence. Cette exception ne fonctionne que pour la paire exacte d'empreintes
relue et testee ; modifier le moteur la desactive automatiquement. Ne jamais
actualiser cette correspondance pour contourner une incompatibilite reelle.
Les modules executables `weapons.js` et `factions.js` restent hashes car ils
contiennent aussi des helpers. Une mise a jour incompatible demande encore de
recommencer le combat courant ; les etapes gagnees restent conservees.

## Donnees Serveur

La migration 007 impose un index unique partiel `(owner_id,model_id)` pour
`status='owned'`. Activation, transfert et attribution respectent ce contrat,
y compris pour Paris. Une autre version du meme personnage reste collectionnable.
La limite d'un personnage par deck demeure une regle distincte.

La migration 008 cree les parcours ; la 009 borne les entrees RPC et normalise
le code-barres avant le controle de transfert. La 011 separe la possession des
equipements, puis la 012 ajoute les bonus sans changer `journeys-1` ni les
attributions de cartes existantes. Le schema accepte `stage_count` 4 ou 7 ;
les trois livres actuels passent a 7, la progression a `0..7` et les tentatives
aux indices `0..6`.

La migration 013 conserve les lignes personnelles et ajoute a `library` le
modele configure et le modele effectivement attribue. `rewardModelId` est
la recompense historique quand un claim existe, sinon la recompense configuree.
`journey-client` applique cette valeur aux livres de son snapshot et refuse
un modele d'un autre personnage. Le schema du registre passe a 12.

| Table | Donnees |
| --- | --- |
| `journeys` | Identifiant, revision, modele recompense, nombre total d'etapes, ouverture |
| `journey_progress` | Compte, livre, nombre de victoires de 0 a 7 |
| `journey_attempts` | Deck et dix KC figes, graine serveur, etape, moteur, sequence, dernier etat, statut |
| `journey_claims` | Attribution unique, exemplaire recu/deja possede, ceremonie acquittee |
| `journey_equipment_rewards` | Livre, indice 4/5/6, identifiant d'equipement, type impose weapon/shield/relic |
| `journey_equipment_claims` | Compte, livre, indice, objet recu/deja possede, ceremonie acquittee |
| `equipment_grants` | Droit unique par compte et equipement, source de l'attribution |
| `journey_config` | Cle de signature technique, jamais lisible par le navigateur |

Dans `library`, `completed` signifie au moins quatre victoires ; `claimed` et
`acknowledged` concernent uniquement la carte. `equipmentClaims` contient les
attributions bonus avec `stage`, `equipmentId`, `kind`, `alreadyOwned` et
`acknowledged`. `finished` signifie sept victoires et les quatre attributions
enregistrees. Il ne remplace pas le dernier ACK : la ceremonie de la relique
peut encore attendre son acquittement alors que `finished` est vrai.

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
2. Ajouter un id stable, **quatre** `stages` et **trois** `bonusStages` aux ids
   uniques : titre, illustration, intro/outro, arene, dix cartes et capitaine
   titulaire. Les equipes doivent couvrir deux fois P1-P5 avec des personnages
   distincts et au maximum un Rainbow. Chaque bonus indique un equipement reel
   compatible avec la version recompensee, dans l'ordre arme/protection/relique.
   Le validateur exige 4+3 ; une equipe bonus ne doit pas seulement recopier une
   equipe historique. Les scenes suivent les sources approuvees sans secrets.
3. Ajouter une migration additive pour `journeys` et les trois lignes de
   `journey_equipment_rewards`, avec le meme id/revision, modele recompense,
   `stage_count=7` et indices absolus `4..6`. Ne jamais modifier une migration
   appliquee, la recompense d'un livre deja joue ou ses quatre indices initiaux.
4. Tester les sept rencontres, victoire/defaite/reprise, droits, attribution
   unique, objets/cartes deja possedes, transfert et ACK interrompu. Verifier
   que les titres, objets et compteurs futurs restent caches avant chaque ACK,
   sur PC, Razr et en reduced-motion.
5. Publier ensemble definitions, schema et Worker versionnes. Les resultats de
   test restent dans work/, jamais dans une progression personnelle.

## Verification

`unique-models.test.cjs` couvre les doublons et les droits du registre.
`journeys.test.cjs` utilise PostgreSQL et de vrais resultats du moteur pour les
trois livres. `journey-combat.test.cjs` verifie les 21 etats initiaux et conserve
explicitement les douze combats historiques de bout en bout, avec commandes,
reprise et controles IA. `journey-sequels.test.cjs` verifie les neuf combats
bonus complets, les recompenses, les scenes et les catalogues actuel/4.6.85 ;
ses empreintes de reference protegent les douze etats initiaux historiques.
Les tests serveur doivent aussi couvrir l'ordre des claims/ACK, leurs appels
directs, la non-reattribution apres transfert et les reprises sans doublon.
`journeys.browser.test.cjs` traverse quatre combats complets par le Worker et
PostgreSQL, puis la vraie ceremonie UI. Le parcours bonus doit egalement etre
verifie avec ses trois attributions et ACK, pas seulement le moteur local.
`journey-view.browser.test.cjs` verifie le rendu, les controles, les petits ecrans et le nettoyage dans un contexte
jetable. Aucun test ne distribue de carte sur un compte reel.
`journey-covers.test.cjs` verifie les sources exactes, leurs empreintes, les
medias inscrits et la transparence de la reliure. Le test navigateur controle
aussi le cadrage, la separation du titre et le fallback d'une autre version.
