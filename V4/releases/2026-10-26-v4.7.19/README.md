# Kalistar 4.7.19 - Competences Sentry

## Perimetre

Astraball uniquement, exhibition locale. Aucun changement des cartes Kalistar,
des collections, des droits Supabase, des recompenses Fragment ou des profils
sportifs confirmes. Aucun reset de partie, nouvelle image ou abonnement.
Les travaux Sprite V2 en cours ne font pas partie de cette publication.

## Regles

- Le Sentry conserve la charge normale. Une competence remplace son action et
  termine son activation, apres son deplacement facultatif.
- Relais : un autre allie gagne une case de portee de passe.
- Couverture : un autre allie gagne 2 DEF contre les charges, pas contre les tirs.
- Brouillage : un adversaire perd une case de MOB, minimum 1, sans toucher VIT.
- Ces trois auras portent a deux cases orthogonales et traversent les joueurs.
  Elles expirent apres la prochaine activation de la cible, pas au deplacement.
  Elles passent les changements de manche et replacements, sans cumul identique.
- Passe chargee : ballon requis, passe de portee reduite d'une case ; si elle
  arrive, +1 case au prochain tir, pas de point supplementaire. Les passes
  alliees conservent la charge. Tir, interception ou ballon lache la consomment.
  Une charge physique reussie l'annule meme si le porteur ramasse aussitot.
- L'IA utilise les memes apercus, valeurs effectives et restrictions. Les anciens
  snapshots sans ces champs restent lisibles ; les statistiques de base ne changent pas.

Voir les [regles actuelles](../../astraball/README.md#competences-du-sentry).

## Interface et animation

Roulette Sentry : competences, tetes des cibles puis confirmation. Retour ou
Echap annule sans depense. Portee et effets temporaires sont separes des stats
de base dans l'analyse, la fiche joueur et l'initiative. Le ballon charge porte
une marque doree statique et une trainee lors de la passe ou du tir.

Incantation finie de 720 ms, sans filtre GPU ou boucle de particules. L'onglet
masque suspend l'animation ; Reduced Motion l'abrege ; tous les objets d'effet
sont detruits apres usage. Les sprites publies utilisent la garde en attendant
le clip `magic` du futur atlas valide. Aucun prototype V2 n'est charge.

## Verification

- Suite CI complete : 104 invocations, 2 200 tests reussis, deux optionnels
  ignores (comparaison Fragment et navigateur reliques), aucun echec.
- Suite locale complete : 14 invocations, 154 tests reussis, aucun ignore.
  Registre de HEAD utilise pour laisser les tests Sprite V2 non publies a leur
  chantier ; les nouveaux cas Sentry passent par le wrapper deja enregistre.
- 331 tests du wrapper Astraball, dont 135 cas Sentry, sans echec ni test ignore.
- Exclusivite de poste, cout, refus atomiques, RNG inchange, range, durees,
  interceptions, pertes de balle, but et reprise de sauvegarde verifies.
- 3 150 dispositions de roulette a six entrees : cibles tactiles de 44 px,
  sans chevauchement ni debordement.
- Sept parcours navigateur Sentry : PC, grand ecran, Razr, compact, paysage et
  animations normales PC/Razr. Commandes reelles, captures, pixels du canvas,
  effets visibles, reprise, pause en arriere-plan et absence de fuite verifies.
- Preuves locales sous `work/astraball/sentry/`, sans donnees de compte personnel.

## Diagnostic de gameplay

`node V4/astraball/tools/audit-athletes.mjs` : 1 036 matchs, 259 393 commandes,
368 profils sportifs y compris les profils provisoires en equipes synthetiques,
4 947 buts et 15 081 utilisations de competence avec controle JSON/reprise.
Relais : 24 ; Couverture : 7 021 ; Brouillage : 7 129 ; Passe chargee : 907.
Les 50 parties rejouees reproduisent les resultats et traces deterministes.

Avant, le meme programme de diagnostic 4.7.18 produisait 5 426 buts. Les outils
defensifs reduisent donc ici les buts d'environ 8,8 %. Sur les 200 matchs des
equipes initiales avec inversion des cotes, Chroma passe de 66 victoires a 65,
Obsidienne de 107 a 92, et les nuls de 27 a 43. Aucun reequilibrage de stats
n'est applique a partir de ce seul constat. Relais est peu choisi par cette IA
gloutonne : son utilite humaine reste a observer.

Ces simulations sont des tests de stabilite et des indices, pas une preuve
d'equilibre competitif ou de plaisir de jeu. Les decisions IA restent bornees
et deterministes ; moyenne observee 0,069 ms sur ce PC, pas une mesure mobile.

## Publication

Version PC/mobile, footer Astraball et assertions harmonises a 4.7.19. Publication
personnelle uniquement : commit et tag annote, build fige du commit, verification
navigateur de cette sortie puis deploiement sur le projet Cloudflare `kalistar`.
Les fichiers non lies aux competences et aux versions restent hors index.
