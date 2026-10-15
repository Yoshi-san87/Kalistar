# Indice de performance et MVP - 10 octobre 2026

Livraison 4.6.13. Formule imposee par l'utilisateur, sans changement de combat,
de cartes natives, d'IA, d'equipement, de RNG ou d'ABBA. Aucun reset de donnees.

## Regles et fichiers

[Specification et schema](../../docs/INDICE_PERFORMANCE.md).
`site/performance-index.js` centralise les coefficients, le detail et les credits.
`engine.js` trace les charges par UID de match, conserve le premier donneur lors
d'un refresh et agrege une seule fois les evenements definitifs.
`trophies.js` conserve le MVP unique et le departage historique des anciens matchs.
`match-metrics.js`, `match-report.js/css`, `catalogue.js/css` et `statistics.js`
exposent assists, utilisations au donneur et detail de l'indice sans surcharger
les petites cartes de l'arene. `boot.js` charge le nouveau module avant le moteur.
La carriere conserve douze metriques lisibles en deux colonnes sur PC, une sur
telephone ; le nouveau test navigateur verifie leur acces sans masquer de ligne.
`local-db.js` migre les trophees depuis les resumes originaux et valide les imports
avec les profils historiques. `app.js` transmet aussi les regles archivees au bilan.

Les matchs sans `match.ratingVersion` restent en indice 1. Les nouveaux sont en
indice 2. Pas de reconstruction conjecturale d'assists historiques. La sauvegarde
et l'import existants utilisent le moteur valide, sans deuxieme base de donnees.
Moyennes d'assists : uniquement les participations avec indice 2. CSV et tooltips
indiquent les deux generations. Les anciens Golden Crystal restent inchanges.

## Campagne reproductible

```powershell
node --test V4/site/performance-index.test.cjs V4/site/statistics.test.cjs
node V4/revisions/2026-10-10-performance-index/simulate.cjs
node V4/site/performance-index.browser.test.cjs
```

Le simulateur reutilise les outils d'equilibrage existants. Catalogue de reference
fige au commit `c55b6139` : 333 cartes publiees, toutes rencontrees, 28 arenes.
500 paires d'equipes, deux orientations, IA de production et politique aleatoire,
sans equipement puis avec tous les emplacements compatibles : **4 000 matchs**.
Equipes issues des presets, orientees faction et tirees uniformement. Seed 46130010.
Le role mesure est le role principal natif, pas la position momentanement occupee.

**200 comparaisons anciennes/nouvelles a seed identique ont le meme combat** :
unites, jets, evenements de combat, tours, gagnant et etat des equipements.
Seules les metadonnees de provenance, l'indice et ses lignes de journal different.
Les fichiers de verrou et les anciens rapports n'ont pas ete modifies.

Les donnees brutes sont [qa/simulation.json](qa/simulation.json), avec hashes
des sources, protocole, agregats et resultats par match. Temps local : 38,381 s.

## Resultats

| Role | MVP ancien | MVP nouveau | Participations |
|---|---:|---:|---:|
| P1 Tank | 30,075 % | 30,800 % | 16 332 |
| P2 DPS physique | 20,125 % | 20,325 % | 15 826 |
| P3 Middle | 16,550 % | 16,725 % | 13 117 |
| P4 Magie / distance | 17,275 % | 17,300 % | 15 549 |
| P5 Support | 15,975 % | 14,850 % | 16 477 |

- MVP different : 431 / 4 000, soit 10,775 %.
- MVP du camp perdant : 1 042 / 4 000, soit 26,050 % (ancien : 29,375 %).
- Le seul bonus de victoire change le MVP dans 256 matchs, soit 6,400 %.
- Ecart moyen premier/deuxieme : 9,626 -> 14,243 points. Les deux echelles
  different ; cet ecart plus grand ne prouve ni plus de justice ni un meilleur jeu.
- 325 assists, soit 0,08125 par match ; 313 matchs avec assist, soit 7,825 %.
- 2 196 consommations de buff ATK allie, dont 325 causalement decisives (14,800 %).
- 4 462 trefles consommes et 2 794 Reraise declenches, tous credites au donneur.
- 18 MVP sans kill, dont 15 de role Support : possible, mais peu frequent.

### Origine des points

Total : 1 018 587 points d'indice sur les participations.

| Contribution | Points | Part |
|---|---:|---:|
| Kills | 341 090 | 33,487 % |
| Blocks | 150 258 | 14,752 % |
| ATK | 180 216 | 17,693 % |
| DEF | 126 820 | 12,451 % |
| Victoire | 111 903 | 10,986 % |
| Nouveaux soutiens | 53 952 | 5,297 % |
| Assists | 975 | 0,096 % |
| Trefles utilises au donneur | 8 924 | 0,876 % |
| Reraise utilises au donneur | 5 588 | 0,549 % |
| Debuff | 38 861 | 3,815 % |

ATK + DEF : 30,144 %. Soutiens + assists + consommations au donneur : 6,818 %.
Production : 0,0515 assist/match ; aleatoire : 0,111. Le choix d'actions de l'IA
influe donc fortement sur la frequence des assists, sans bug d'attribution.

### Conclusion et limites

Le nouvel indice mesure plus de dimensions et reste reproductible. Il **ne donne
pas automatiquement plus de MVP aux Supports** dans cette campagne. Les assists
restent rares : il faut un buff allie indispensable a un kill definitif, pas
seulement une charge consommee. La DEF et les Blocks soutiennent fortement les Tanks.
Recommandation : observer les rencontres humaines et les choix de soutien de l'IA
avant d'envisager un futur ajustement de coefficients, qui necessiterait une
nouvelle decision de l'utilisateur. Aucun coefficient n'a ete change.

Ces politiques automatisees ne prouvent pas l'equilibre competitif ni le plaisir
humain. Les orientations d'une paire sont dependantes, les roles n'ont pas le
meme nombre de participations. Les intervalles Wilson fournis sont descriptifs,
pas une inference causale avec clusters independants.

## Exemple d'un vrai bilan

[qa/example.json](qa/example.json), seed `INDEX-4-random-0` : victoire du camp 1.
MVP **THE SORROW**, `49600112`, UID `1-0`, indice **36**.

| Contribution | Resultat | Points |
|---|---:|---:|
| Kills | 1 | 5 |
| Blocks | 4 | 12 |
| ATK | 265 | 2 |
| DEF | 670 | 6 |
| Victoire | oui | 3 |
| Nouveaux soutiens | 2 | 4 |
| Assists | 1 | 3 |
| Trefles / Reraise utilises au donneur | 0 / 0 | 0 |
| Debuff | 50 | 1 |
| **Total** | | **36** |

Le test navigateur utilise ce match reel, pas des valeurs de bilan fabriquees.
Il verifie egalement ouverture, migration de trophees, import et lecture d'un
ancien match avec une face ATK de Jill remplacee depuis, sans changer son MVP.
Une sauvegarde qui tente de reutiliser une charge deja consommee en plein duel
est refusee avant toute continuation ou ecriture.
Captures PC, 1920 px, Razr 412 px, compact 320 px, paysage et Reduced Motion
dans `qa/browser/`. Preuves du snapshot publiable :
[release 4.6.13](../../releases/2026-10-10-v4.6.13/README.md).
