# Kalistar x Castlevania

Lot additif du 10 octobre 2026 : huit personnages, neuf versions de cartes.
Les huit illustrations du 9 octobre sont approuvees par l'utilisateur.
Dracula conserve sa scene initiale en Feu ; la nouvelle scene d'assaut est Sang.

## Profils

| Personnage | Kalistel | Poste principal / compatibilites | Intention |
| --- | --- | --- | --- |
| Trevor Belmont | Lumiere | P2 / P2-P3 | Fouet, frappe sacree ponctuelle, soutien physique et esquive. |
| Alucard | Lumiere | P3 / P1-P2-P3 | Escrime polyvalente, parade, deux faces magiques. |
| Simon Belmont | Terre | P1 / P1-P2 | Endurance et garde physique ; attaque plus moderee. |
| Carmilla | Sang | P2 / P2-P3 | Assaut cruel, Mort D3 au prix d'une face numerique, defense fragile. |
| Isaac | Tenebres | P4 / P3-P4-P5 | Forge magique et potion ; pas d'invocation autonome. |
| Hector | Roche | P5 / P1-P3-P5 | Garde et coeur preventif, faibles valeurs offensives. |
| Dracula Feu | Feu | P4 / P3-P4 | Quatre faces magiques et potion D1, puissance sans Mort. |
| Sypha Belnades | Glace | P5 / P4-P5 | Potion et trefle, protection magique, esquive D1. |
| Dracula Sang | Sang | P2 / P2-P4 | Assaut expose, Mort D4, moins de magie et de defense. |

Les choix de Kalistel et de poste sont des adaptations Kalistar, pas des
affirmations de regles propres a Castlevania. Sypha n'a qu'un cristal :
l'illustration montre sa polyvalence, sans donner une seconde affinite moteur.
Alucard utilise la famille VAMP existante ; aucune race n'est ajoutee.

Les deux Dracula partagent `dracula-castlevania`, donc ne peuvent pas cohabiter
dans un deck. Ils ont chacun leur modele, leur illustration et leurs faces.
Les ID 49901801-49901809 sont additifs ; aucun personnage existant n'est remplace.
Cette collection de fan est non officielle.

## Respect du jeu

- Valeurs D6-D1 distinctes, toutes dans les bornes de leur poste principal.
- Garde uniquement P1/P5 ; Reraise uniquement P5. Le coeur est preventif :
  Hector ne releve jamais une carte du cimetiere.
- Mort, potion, trefle, esquive et puissance physique utilisent les effets existants.
- La famille d'arme imprimee gouverne toujours la matrice d'avantages.
- Aucun nouvel equipement, aucune arene, aucun preset, aucune mecanique ajoutee.
- Les tests utilisent huit identites Castlevania et deux cartes existantes.
  Il n'existe pas artificiellement dix personnages dans cette collection.
- Ces controles prouvent la conformite des regles, pas un taux de victoire equilibre.

## Production native

`set.json` porte les profils et justifications.
`model.cjs` valide les limites, les identites et les modes.
`assets.cjs` calibre le nouveau fanion dans l'alpha et l'ancrage natifs.
`build.cjs` utilise les composants et la composition Photoshop existants,
avec textes editables, objets dynamiques et fond de carte protege.

Les illustrations sources restent byte-identiques dans les sorties publiees.
Leur adaptation a la fenetre 737 x 921 est un redimensionnement proportionnel.
La production est figee dans `before.json` avant rendu ; ce manifeste ne doit
pas etre reinitialise pour faire passer une verification.

Commandes :
```text
node build.cjs prepare
KALISTAR_CASTLEVANIA_PS=2026-10-10 node build.cjs render <une a trois cles>
node build.cjs verify
node --test integration.test.cjs
KALISTAR_CASTLEVANIA_PUBLISH=2026-10-10 node build.cjs publish
node --test publication.test.cjs
node gallery.cjs
node browser.test.cjs
```

Les variables sont a definir avec la syntaxe du shell utilise. Un seul rendu
Photoshop a la fois. Les scripts refusent de remplacer un rendu deja produit.

## Preuves

- `native-checks.json` : cadre fixe, reouverture PSD et code-barres.
- `cards/*/verification.json` : identite, fichiers et controle natif complet.
- `visual-proof/` : planches de lecture ; `index.html` : cartes individuelles.
- `integration.test.cjs` : 54 faces ATK, 54 faces DEF, soutiens, Mort,
  barrieres, serialization, 36 matchs ABBA et variantes non cumulables.
- `publication.test.cjs` : catalogue additif et illustrations preservees.
- `browser.test.cjs` : PC, Razr 50 et petit ecran 320 px, 27 fiches,
  duel entre les deux versions, reprise et ancien backup.

Statut Git/Pages : consulter le rapport de release associe, pas la seule
presence des fichiers locaux. Les captures publiques arrivent apres deploiement.

## Images et provenance

Generation via l'outil integre `image_gen`, sans API externe ni generation du
cadre complet. Prompt exact, sources generees et roles des references dans
[asset-provenance.json](asset-provenance.json). Les huit prompts initiaux sont
conserves dans la galerie de propositions du 9 octobre.
