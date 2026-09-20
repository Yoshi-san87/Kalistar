# Essais numeriques V1

Ces resultats sont un diagnostic, pas une validation definitive du jeu. Les faces a effet sont exclues, jamais assimilees a zero. Les pourcentages sont conditionnels aux confrontations purement numeriques, contre les douze profils de la serie, sans arme, element ni synergie. La derniere colonne est un test extreme ou toutes les defenses rencontrent une barriere.

| Carte | ATK moyenne numerique | DEF moyenne numerique | Cout ATK moyen face a 2 barrieres/6 | Eliminations sans bonus | Eliminations avec barrieres partout |
|---|---:|---:|---:|---:|---:|
| MOMO | 120.5 | 107.4 | 10.0 | 46.3% | 34.9% |
| CANA | 146.7 | 117.8 | 1.7 | 58.6% | 55.6% |
| JULIENNE | 112 | 120.7 | 10.0 | 46.8% | 33.8% |
| DARNAKO | 166.8 | 100.2 | 3.3 | 63.0% | 61.0% |
| MALINIA | 171 | 101.8 | 10.0 | 63.7% | 55.1% |
| AELIS | 116.8 | 119.8 | 10.0 | 47.6% | 33.2% |
| BALMHYR | 142.7 | 185.2 | 5.0 | 58.6% | 52.2% |
| VICTORVINE | 134.3 | 136.5 | 5.0 | 54.4% | 48.5% |
| VERMINIA | 138.3 | 128.8 | 5.0 | 56.6% | 50.2% |
| ZVIRI | 161.6 | 83.4 | 0.0 | 58.8% | 58.8% |
| NAZAR | 116.8 | 171.7 | 3.3 | 45.3% | 40.9% |
| KAYLIS | 115.6 | 139.2 | 10.0 | 48.2% | 34.7% |

## Lecture

- Une barriere de -30 coute en moyenne 10 points a un profil entierement magique face a deux faces protegees sur six. C'est sensible, mais tres inferieur aux +50/-50 d'arme.
- La regle est asymetrique : la magie n'a aucun avantage intrinseque contre une defense physique. Il faut donc la payer par de meilleures valeurs, des effets utiles ou des interactions elementaires. Ce n'est pas automatiquement equilibre.
- Malinia dispose d'une ATK brute legerement superieure au profil physique Darnako, mais cette marge ne couvre pas a elle seule toutes les configurations de barrieres. C'est un point de vigilance des premiers essais, pas une raison de changer silencieusement les valeurs des sources.
- Les profils de soutien misent aussi sur leurs effets non numeriques. Leur puissance globale ne peut pas etre estimee sans definir exactement la relance, le mana, l'esquive, la mort et la resurrection.
- Rainbow est volontairement privilegie par les interactions elementaires ; la limite d'une carte par deck est necessaire mais ne prouve pas l'equilibre.

## Premiere campagne de tests

Conserver ces chiffres comme point de depart. Jouer des compositions mixtes puis homogenes, journaliser les jets et les effets, et comparer les profils de meme position. Si les DPS magiques perdent regulierement a budget comparable, tester d'abord une hausse de 5 a 10 points de leurs faces numeriques, ou une barriere de -20 au lieu de -30. Ne modifier qu'un parametre a la fois. Les valeurs imprimees originales restent conservees.
