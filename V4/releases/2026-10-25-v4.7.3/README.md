# Kalistar 4.7.3 - Placement Astraball

## Perimetre

Astraball uniquement : formation avant engagement/apres un but non final,
capacite defensive permanente et idle pendant les choix. Aucune modification
du moteur Kalistar, de Supabase, de la collection, des recompenses ou des medias.
Les dix personnages, les six ballons et les deux vues sont conserves.
Le lot sprites-v2 de P Generator n'appartient pas a cette publication.

## Regles

- Chaque equipe place ses cinq joueurs puis valide. Le camp qui recoit le
  ballon commence ; l'IA confirme sa formation legale par defaut.
- Chroma : colonnes 1-5. Obsidienne : colonnes 7-11. La colonne centrale 6 reste
  libre jusqu'a l'engagement. Pas de placement sur un joueur ou dans un U.
- Le Pilier reste dans ses trois colonnes. Un seul coequipier maximum peut
  partager cette zone defensive. Les attaquants adverses ne consomment pas ce slot.
- Cette capacite s'applique aux destinations, a chaque case d'un trajet et aux
  reculs de charge. Un recul interdit conserve les effets habituels d'une charge
  bloquee : ralentissement, ballon lache puis repris par le porteur immobile.
- Un but non final rend le ballon au Meneur adverse et rouvre les formations.
  Score, initiative restante et penalites sont conserves. Aucun tour gratuit.
  Ni un tir manque, ni une interception, ni la fin du match n'ouvre un placement.

## Interface Et Performance

Selection sur le terrain ou dans la rangee des portraits ; cases autorisees
surlignees, camp interdit assombri, compteur de soutien et validation explicite.
Sur telephone, la camera cadre le camp pendant la formation. Le placement et
la validation d'un seul camp survivent au rechargement.

L'idle boucle sur les dix personnages pendant les choix humains, avec une seule
horloge de quatre mises a jour par seconde et aucun ticker Pixi permanent.
Arret en popup, en onglet masque, pendant l'IA, les actions et apres la fin.
Reduced Motion reste statique. Les actions gardent leur limite de rendu a 60 Hz.
La camera ne passe pas au joueur suivant au milieu de l'animation precedente.

## Sauvegardes

Schema Astraball 2, meme cle locale et meme separation Paris/Tokyo. Une rencontre
v1 inachevee est copiee et revalidee, conserve score/RNG/historique/tours/penalites,
puis demande une formation conforme. Le deplacement deja depense par le joueur
actif n'est pas restitue. Le ballon revient au Meneur du camp qui le detenait ;
s'il etait libre, priorite du camp de la manche. Le message de reprise l'annonce.
Une rencontre v1 terminee reste un resultat historique inchange.

## Verification

Commandes depuis la racine active, Node 24 et Chrome/Playwright locaux :

```sh
node --test V4/astraball/tests/astraball.test.cjs
node V4/astraball/tests/simulation.mjs --games 1000 --out work/astraball/placement/simulation.json
node maintenance/validate.cjs --suite ci
node maintenance/validate.cjs --suite local
node V4/deploy/build.cjs
node V4/astraball/tests/interface.browser.test.cjs
node V4/deploy/browser.test.cjs
```

- 108 tests Astraball : placements/validations atomiques, les deux camps, limites,
  trajets, reculs, buts, initiative, reprises et anciennes sauvegardes.
- Suite CI complete : 103 invocations, 1 971 tests passes, aucun echec et deux
  sauts de configuration optionnels preexistants. Suite locale : 14 invocations,
  154 tests passes, aucun echec ni saut.
- Dont 100 matchs supplementaires avec placements legaux aleatoires avant chaque
  engagement, en plus des simulations a formation IA fixe.
- 1 000 matchs IA : 115 134 activations, 217 029 commandes, 3 824 buts, aucun
  invariant viole. Rejouabilite complete des graines 1, 501 et 1000.
- Repartition observee : 455 victoires Chroma, 362 Obsidienne, 183 nuls ;
  811 matchs atteignent douze manches. Ce sont des controles d'integrite,
  pas une certification d'equilibrage ni une mesure du plaisir.
- Navigateur : 1440x900, 1920x1080, Razr 412x915, 360x800, 915x412 ; tactile,
  deux vues, profondeur, persistance, but puis replacement, double validation,
  victoire sans replacement, charge et options de mouvement reduit.
- Idle mesure apres l'ancien delai d'arret : 3 a 4 rendus sur 800 ms ; pause en
  popup et onglet masque, reprise ensuite ; course a quatre poses, 81 a 83 rendus
  sur quatre cases. Mesures locales, pas une promesse de FPS sur tout appareil.
- La suite locale utilise PostgreSQL jetable, jamais Supabase de production.

Le premier passage de la suite CI a detecte deux assertions de titre encore
en 4.7.2. Elles ont ete corrigees avec les autres badges et la suite relancee.
Preuves detaillees et captures : `work/astraball/placement/` (non versionne).
Le rapport initial `V4/astraball/tests/REPORT.md` reste historique et inchange.

## Publication

Depot personnel `Yoshi-san87/Kalistar`, main et tag annote `v4.7.3`.
Publication directe dans le projet Cloudflare personnel existant `kalistar`,
depuis la copie figee du commit preparee avec `prepare-release.cjs` et reverifiee.
Login anonyme PC/Razr et empreinte publique du commit a controler apres envoi.
Aucune bibliotheque graphique, compte professionnel ou forfait ajoute.
