# Indice 3 : puissance valorisee et assists DEF

Evolution autorisee le 10 octobre 2026, livree en V4.6.16. Regles et schema :
[INDICE_PERFORMANCE.md](../../docs/INDICE_PERFORMANCE.md).

## Ce qui change

- Par duel numerique definitif : ATK valorisee = min(ATK, DEF + 1) ;
  DEF valorisee = min(DEF, ATK). Floor par 100 sur leurs sommes du match.
- Les statistiques ATK/DEF brutes, faces, matchups et scores restent intacts.
- Une garde native donnee a un autre combattant rapporte une assist (+3)
  seulement si son retrait de la formule aurait transforme le Block en kill.
- Assists DEF comprises dans les assists totales, sans seconde prime.
- Pas d'auto-garde, assist magique, bonus passif/equipement, bouclier special,
  Reraise, Mort ou esquive. Une garde sur les relances ne compte qu'a la fin.
- Les autres coefficients restent geles. L'indice 3 departage aussi le MVP
  avec les puissances valorisees, pas avec le surplus brut.
- Archives et parties en cours indice 1/2 inchanges : pas de reset, reattribution
  de trophees ou reconstruction artificielle d'assists DEF historiques.

## Campagne reproductible

```powershell
node V4/revisions/2026-10-10-performance-useful/simulate.cjs --pairs=500 --baseline=fc368f2d
```

4 000 matchs : 500 paires de decks, deux politiques (IA existante et choix
aleatoires), avec/sans equipements, les deux orientations, 28 arenes, trois
familles de decks (presets, orientation faction, catalogue uniforme).
Les 343 cartes du catalogue publie 4.6.15 ont ete utilisees. Graine 46160010.
La comparaison indice 2/3 applique les deux formules aux MEMES evenements.

Pour 200 de ces matchs, le moteur publie fc368f2d est aussi rejoue : meme
RNG, gagnant, tours, morts, buff/equipement, jets et evenements numeriques.
Les resumes indice 2 produits par le nouveau moteur sont exactement ceux
du moteur publie, apres neutralisation de l'UUID aleatoire de la rencontre.
Les reprises sont controlees tous les 47 appels moteur sur les premieres
paires. Les sources moteur et coefficients sont haches dans le rapport.

Donnees brutes : [simulation.json](qa/simulation.json).
Exemple de Garde decisive en vrai match : [example.json](qa/example.json).
Les anciens rapports de l'indice 2 restent conserves sans modification.

## Resultats

| Role natif du MVP | Indice 2 | Indice 3 |
| --- | ---: | ---: |
| P1 | 29,625 % | 29,300 % |
| P2 | 19,425 % | 18,500 % |
| P3 | 16,750 % | 16,750 % |
| P4 | 17,175 % | 16,500 % |
| P5 | 17,025 % | 18,950 % |

Role NATIF de la carte, pas poste actuel du plateau. Les nombres de participants
par role different et figurent dans le JSON : ne pas supposer une repartition
egale, ni lire ces parts comme une preuve qu'un role devrait atteindre 20 %.

- 289 MVP changes (7,225 %), sur des combats strictement identiques.
- 308 assists ATK conservees et 506 nouvelles assists DEF.
- 443 matchs avec assist DEF (11,075 %). 506 sur 2 531 gardes alliees appliquees
  avec provenance connue : la prime ne recompense donc pas toute consommation.
- Part des points ATK/DEF : 30,124 % avant, 21,568 % apres.
- Part des points de soutien/assists/consommations au donneur : 6,734 % avant,
  7,709 % apres. Ce n'est pas un ajout automatique de points a tous les supports.
- Ecart moyen premier/deuxieme indice : 13,969 -> 12,2015 ; echelle differente,
  donc pas une preuve de meilleure concurrence a elle seule.
- MVP du camp perdant : 1 029 -> 1 047. Un bon joueur peut toujours etre reconnu
  dans une equipe perdante ; ce systeme ne force pas le MVP dans le camp gagnant.
- 19 MVP sans kill, dont 13 de role P5, dans la nouvelle formule.

P5 gagne dans les deux politiques : IA 17,85 -> 19,30 %, aleatoire
16,20 -> 18,60 %. P1 reste le plus souvent MVP et monte legerement avec l'IA
(28,55 -> 29,35 %), meme si sa part globale baisse. La conclusion est donc
plus precise que "tous les roles sont desormais equilibres" : le score
recompense moins le surplus et reconnait des soutiens DEF auparavant ignores.

## Limites

Ce sont des politiques automatiques, pas des joueurs humains en classe.
Les orientations partageant une graine sont dependantes. Aucune mesure du fun
humain ni preuve d'equilibrage competitif n'est revendiquee. Le plafonnement
est un proxy explicite d'impact, pas une estimation mathematique de toutes les
causes de victoire. Les retraits ATK, Blocks speciaux et primes de victoire
conservent volontairement leurs poids precedents.

Validation de publication et captures PC/Razr :
[release 4.6.16](../../releases/2026-10-10-v4.6.16/README.md).
