# Kalistar 4.6.92 - Demarrage et performance

## Perimetre

- Preparation du catalogue, des modules, du profil synchronise et d'un petit
  budget d'images pendant le film. Activation unique des vues et commandes apres
  la fermeture du lecteur et seulement dans un document visible.
- Notifications, conflits de sauvegarde, presentation des equipes et IA derriere
  la meme frontiere. Aucun filtre special sur la popup d'actualisation.
- Boucles d'ambiance et cristaux en attente mises en sommeil entre leurs dessins,
  arretees hors ecran, sous une popup et en arriere-plan. Effets actifs conserves.
- Accueil suspendu quand il n'est pas visible. Animations CSS de l'application
  pausees derriere un dialogue global et dans un onglet cache.
- Arene contenue dans la fenetre PC et telephone, sans navigation generale.
  Sortie et menu de combat restent accessibles ; les menus reviennent en quittant.

Pas de changement de moteur, de statistiques, de cartes natives, de schema de
sauvegarde ou de droits Supabase. Pas de migration ni de reset utilisateur.

## Audit

Mesures Chrome/Playwright sur ce PC, profils jetables desktop 1440 x 1000 et
Razr emule 412 x 1007. `TaskDuration` mesure le temps du thread principal de la
page ; ce n'est ni le pourcentage CPU global du PC ni une mesure du telephone
physique. Le decodage video et le GPU ne sont pas inclus dans ce compteur.

Les captures intermediaires, profils CPU, mesures et journaux restent dans
`work/qa/performance-20261020/`. Les commandes reproductibles sont les tests
navigateur `startup`, `animations`, `animations-lifecycle` et `arena-viewport`.
Le test d'animations accepte une reference Git pour la comparaison avant/apres.

Constats : Collection et Equipements n'entretiennent pas de boucle JS au repos.
Le cout d'arrivee dans Decks inclut chargement et recadrage des images : ne pas
le confondre avec une consommation continue. Les effets d'arene limitaient deja
leurs dessins, mais continuaient a demander une RAF a chaque rafraichissement
de l'ecran. Ils tournaient aussi derriere certains dialogues. La correction
conserve la cadence visuelle voulue sans ce polling permanent.

Comparaison controlee des quatre modules d'animation : ancien code de
`5aaa4416914805d9e831948613ae30f3699e80b8` contre build courant, sur la meme
mise en page finale. Passes sequentielles sans autre suite de tests en cours.
Fenetre d'attente d'environ quatre secondes, profils CPU instrumentes :

| Profil | RAF avant / apres | Dessins ambiance avant / apres | Thread principal avant / apres |
| --- | ---: | ---: | ---: |
| PC | 964 / 235 | 121 / 121 | 489 ms / 197 ms |
| Razr emule | 966 / 231 | 121 / 122 | 437 ms / 222 ms |

Soit environ 75 % de rappels RAF en moins, sans diminution de la cadence
visible ; le temps du thread principal baisse de 49 a 60 % dans ce scenario.
Sur une fenetre de 1,6 s avec dialogue, les anciennes boucles produisaient
780/778 rappels PC/phone ; elles en produisent desormais zero, et zero dessin
des trois effets observes (des, ambiance, focus). Reprise visuelle et pixels
non vides verifies. Ce sont des observations de ces passes, pas une garantie
de gain sur chaque duel ou chaque appareil.

Commande avant : `KALISTAR_ANIMATIONS_REF=<commit ci-dessus>` et
`KALISTAR_ANIMATIONS_BASELINE=1`, puis `node V4/site/animations.browser.test.cjs`.
Commande apres : le meme test sans ces deux variables, sur le build final.
Les deux sorties completes sont dans `work/qa/performance-20261020/comparison/`.

Limites : les effets visibles continuent volontairement a dessiner. Certaines
lueurs CSS de duel utilisent encore filter/box-shadow ; elles ne sont pas
supprimees pour obtenir artificiellement un repos total. Le decodage initial
des cartes et de la video reste dependant de la machine. Les tests Razr sont
des emulations de viewport/tactile, pas une mesure thermique ou batterie sur
le telephone physique. Aucun plafond universel de CPU n'est promis.

## Validation

- Suite CI : 96 invocations, 1 498 tests passes, aucun echec. Un ancien test
  navigateur d'ulti est explicitement ignore par sa suite unitaire ; il n'est
  pas compte comme une preuve navigateur de cette livraison.
- Suite locale/native : 13 invocations, 129 tests passes, aucun echec.
- Suite repository : 111 tests passes, aucun echec.
- Build Cloudflare : 444 cartes, 1 507 fichiers, 1 068,3 Mio. Aucun nouveau
  media lourd ; ce chantier ne modifie pas les illustrations ni les films.
- `startup.browser.test.cjs` : PC/Razr, reprise sans mouvement du match sous
  le film, conflit differe, onglet cache, film/module indisponible, chargement
  lent, Passer et Reduced Motion. Le verrou inert est libere avant le premier
  rendu, pour que la presentation des equipes restaure un menu actif ensuite.
- `login.browser.test.cjs` : cinq formats, PostgreSQL temporaire, SDK Auth et
  Worker reels, Paris/Tokyo fictifs, vrai film pendant preparation, rechargement,
  deconnexion et donnees conservees. Le suivi des baux inclut l'API sync v2.
- `login-intro.browser.test.cjs` : lecture complete PC/Razr, six images decodees,
  son, paysage, 320 px, rotation, acces media refuse et autoplay bloque.
- `arena-viewport.browser.test.cjs` : huit profils, 66 captures, selection,
  duel, resultat, reprise, rotation, bilan, Fragment en apercu et safe areas.
  Aucun debordement de page ; dock sans chevauchement ; plein ecran et sortie
  testes par les vrais boutons, menus restaures a la sortie.
- `V4/deploy/browser.test.cjs` : Collection, lecteur, PNG, Decks, preparation,
  film puis presentation, Arene, codex, sauvegarde/reload et publication additive.
- `animations.browser.test.cjs` : visibilite PC/phone, arret puis reprise des
  effets, pause sous dialogue, pixels en mouvement et etat/RNG inchange.
- `animations-lifecycle.browser.test.cjs` : masquage partiel, detachement,
  remontage sans doublon, resultat de de conserve et annulation propre.

Les journaux, captures et controles de la sortie figee sont conserves sous
`work/qa/performance-20261020/`. Aucune sauvegarde personnelle n'a ete utilisee.

## Contrat de maintenance

Les nouveaux controleurs de vue se construisent apres `startup.ready()` dans
`app.js`, jamais pendant la preparation. Une nouvelle notification ne doit pas
recreer un contournement local de cette frontiere. `KALISTAR_PREPARED` ne veut
pas dire que le jeu a demarre ; les tests interactifs attendent `KALISTAR_READY`.
Voir [le contrat du film](../../docs/INTRO_CONNEXION.md) et
[l'architecture](../../site/README.md).
