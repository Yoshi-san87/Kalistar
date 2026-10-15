# Adversaires IA - 4.6.46

## Cinq strategies

| Adversaire | Priorite | Arbitrage |
| --- | --- | --- |
| Kael, La Lance | Eliminer avec regularite | Poids maximal aux eliminations, peu de preparation speculative. |
| Maelis, Le Rempart | Reduire le danger | Cibles capables de menacer ses allies, protection des pieces structurantes. |
| Nox, Le Briseur | Desorganiser | Capitaines, fournisseurs de soutiens et pertes de liens faction/race. |
| Lyra, La Tisseuse | Preparer et convertir | Dons utiles, nouveaux beneficiaires pour les reliques, charges preparees. |
| Soren, Le Stratege | S'adapter | Compromis entre les precedents, soutiens davantage valorises en inferiorite. |

La cohesion (Detente / Equilibre / Tactique) continue a choisir les cartes du
deck aleatoire. Le profil IA n'influence jamais ces cartes. Le choix d'arene
reste independant. Le bouton "Deck au hasard" ne tire pas un autre profil.

## Evaluation et limites

Le planificateur compare tous les couples attaquant/cible legaux. Il enumere
les six faces ATK puis toutes les issues DEF non-Retry au moyen des vraies
actions du moteur, sur des copies. Les faces Retry conditionnent la meme
distribution ; un trefle consomme declenche une seconde enumeration. Les deux
issues de la piece d'Harvey sont ponderees a parts egales, sans lire le futur RNG.
Mort, esquive, Reraise, barrieres, armes D6, protections, reliques, dons et choix
intermediaires passent ainsi par les memes regles que la partie.

Le score mesure les eliminations, les ressources gagnees/perdues et la
preparation des ultimes. La menace et la valeur des synergies sont des
heuristiques de priorisation, pas des modificateurs du combat. Aucun avantage
n'est invente ni injecte dans les des. Le surplus ATK d'un kill n'est pas un
objectif : il n'existe pas de degats persistants a accumuler sur une carte.

La recherche porte sur un duel, pas sur toute la partie ni sur un arbre ABBA
multi-tours. La valeur future des soutiens et charges reste estimee. Les choix
de cibles de dons/parite sont heuristiques, non une recherche minimax complete.
Les relances Kalistel sont decidees apres le jet connu, en comparant conserver
et relancer avec un cout de conservation des deux charges. Le premier classement
des duels n'anticipe pas cette relance optionnelle.

Seuls les combattants visibles, les ressources publiques et sa propre reserve
servent a decider. Les identites des cartes dans la reserve adverse ne servent
pas au classement. Aucune consommation du RNG reel pendant la reflexion.
Les choix de reliques utilisent le camp du donneur, y compris Aeris morte, pas
forcement le joueur dont c'est le tour. Les remplacements conservent d'abord
le maximum de positions remplies, puis departagent selon le profil.

## Integration

- Module : `V4/site/ai-strategies.js`, profils a identifiants stables.
- Moteur : `newGame(..., {aiProfile: 'soren'})` ou `aiProfiles` a deux entrees
  pour la simulation. Les appels sans option gardent l'ancien comportement.
- Snapshot facultatif : `ai: {version: 1, profiles: [null, 'soren']}`. Schema 6
  et IndexedDB inchanges ; la preference de prochain match ne modifie pas celui
  deja commence. Les imports inconnus sont refuses, sans migration implicite.
- `aiChoiceAsync` calcule sur une copie et rend la main entre deux couples.
  Annulation a la navigation, ouverture d'une popup, changement d'etat ou onglet
  masque. Aucun worker, listener ou animation permanente n'est ajoute.
- Le plan est reutilise pour les deux temps visuels attaquant puis cible.
- Les definitions non equipees sont exclues des seules copies de calcul ; les
  definitions et sauvegardes reelles restent intactes.
- Noms partages dans preparation, initiative, arene, bilan et ceremonie. Les
  archives sans profil restent affichees "Le Veilleur".

## Verification

`node --test V4/site/ai-strategies.test.cjs` couvre identite/persistance,
immutabilite, absence de lecture des des futurs/reserve adverse, differences
de decisions, eliminations evidentes, soutiens distincts, parite du defenseur,
reliques, Kalistel et annulation cooperative.

`node V4/revisions/2026-10-13-ai-opponents/benchmark.cjs` rejoue 20 paires de
compositions reelles, inversees pour chaque profil : 40 parties par profil,
200 au total contre l'IA historique. Les fixtures gardent les memes cartes,
equipements, terrains et graines entre profils. Le nouveau moteur est verifie
a chaque action et recharge apres les resultats. Ce panel riche en reliques
n'est ni une mesure universelle de force ni un classement statistique definitif.

`node V4/site/ai-strategies.browser.test.cjs` teste le build Pages sur desktop,
Razr et 320 px Reduced Motion : selection, independance des reglages, duel local,
reprise, preference et rendu pendant le calcul. Les tests pre-match historiques
restent applicables.
