# Indice de performance 3

Decision utilisateur du 10 octobre 2026. Aucun changement aux faces natives,
aux scores des combats, au RNG, aux buffs, a l'IA, aux equipements ou a ABBA.

## Calcul

Source commune : `site/performance-index.js`, coefficients geles et fonction
pure `calculate(row, ratingVersion)`. `engine.matchStats()` conserve son role
d'agregateur unique des evenements definitifs du match.

```text
5 x kills + 3 x Blocks
+ floor(ATK valorisee cumulee / 100) + floor(DEF valorisee cumulee / 100)
+ 3 si victoire definitive et participation
+ 2 x nouveaux soutiens + 3 x assists
+ 2 x trefles utilises au donneur + 2 x Reraise utilises au donneur
+ floor(ATK retiree / 30)
```

Le +1 historique de Reraise consomme par le beneficiaire n'existe plus dans
les indices 2 et 3. Sa statistique `reraises` reste consultable. Les nouveaux soutiens
physique, mana, ward, luck et reraise donnent chacun +2, a soi aussi. Un refresh
ne donne aucun point de pose et conserve le premier donneur.

Les statistiques brutes `attack`/`defense` restent les sommes officielles des
scores finaux. L'indice 3 utilise deux sommes distinctes, derivees de chaque
duel numerique definitif avant d'appliquer le floor au total du match :

```text
ATK valorisee du duel = min(ATK finale, DEF finale + 1)
DEF valorisee du duel = min(DEF finale, ATK finale)
```

Exemple : ATK 400 contre DEF 120 conserve les statistiques 400 / 120, mais
valorise 121 / 120. ATK 120 contre DEF 400 valorise 120 / 120. Une egalite
120 / 120 reste 120 / 120 puisque le kill exige ATK strictement superieure.
Le surplus n'augmente pas non plus le departage du MVP.

Aucun jet intermediaire Kalistel, retry DEF ou premier essai de trefle ne
s'ajoute. Mort, soutien, esquive et bouclier special ont zero puissance
valorisee, sans inventer une DEF a leur attribuer. Un Reraise apres un duel
numerique conserve les vrais scores finaux, plafonnes comme les autres.
Les equipements restent compris dans les formules numeriques, mais ne
creent aucun soutien ni assist individuel supplementaire.

Le +3 victoire est derive seulement en phase `over`, pour les `entered` du
camp gagnant, morts compris. Pas aux reserves inutilisees, perdants, matchs
nuls ou historiques partiels. Il n'est jamais ecrit comme un compteur mutable.

## Provenance et consommation

Une nouvelle partie conserve `match.ratingVersion: 3`. Le schema global reste
6, `match.version` reste 1 : le format des evenements existants est additif.
Une nouvelle charge native ajoute a son beneficiaire :

```json
{
  "traitSources": {
    "physical": {
      "donor": "0-4", "recipient": "0-0", "kind": "physical", "round": 12
    }
  }
}
```

`round` est l'echange moteur (tour de la timeline), pas le round de boxe.
L'identite est le UID d'instance dans CE match, pas le poste, le personnage
ou le modele imprime. Le premier evenement de pose prouve cette provenance.

A la consommation, la source quitte la charge du beneficiaire et passe dans
`duel.nativeSources`, puis `match.events[].sources`. Les cles sont `buff`,
`ward`, `luck`, `reraise`. Chaque source conserve donneur, destinataire, type
et tour de pose. `(round, kind, recipient)` identifie la charge sans nouveau
UUID. Une pose par echange et une charge par type restent les regles actuelles.

`wardConsumed` distingue une garde reellement depensee sur un premier essai
numerique d'un score DEF final nul si le trefle finit en esquive. Ce marqueur
seul ne suffit jamais a produire une assist : le Block final doit etre
numerique, physique et causal. Les sources restent suivies pour les indices
2 et 3, sans changer retroactivement la formule d'une partie en cours.

La sauvegarde intermediaire conserve les sources du duel deja consommees.
Le resume et le journal ajoutent les credits une fois que l'echange est
definitif. Une reprise en cours de relance ne les perd pas et ne les double pas.
Les sources sont validees contre le premier evenement non-refresh, le bon camp,
le bon UID et le bon type. Une source deja consommee ne peut pas rester active
ni etre utilisee sur un second echange. Un donneur mort reste dans les unites.

## Passes decisives ATK et DEF

Les charges ATK natives physique/mana donnees a un AUTRE combattant
peuvent faire une assist ATK. Le moteur prend le kill definitif et la formule
finale, avec tous ses matchups, barriere, synergies et equipements :

```text
kill reel ET ATK > DEF
ET max(0, ATK - buff natif effectivement applique) <= DEF
```

L'egalite sans buff signifie bien absence de kill. Le donneur gagne une assist
et +3. La charge ne peut servir qu'une fois. Une consommation sans kill,
un buff superflu, un auto-buff, Mort, esquive, Reraise ou bonus passif
ne donnent aucune assist. Trefle et coeur donnent +2 supplementaires a leur
donneur lors de consommation/sauvetage reel, a soi aussi si auto-attribues.

Depuis l'indice 3, une garde native alliee peut aussi faire une assist DEF :

```text
Block physique numerique reel, sans kill, esquive, bouclier special ni Reraise
ET garde native effectivement consommee et appliquee
ET ATK finale <= DEF finale
ET ATK finale > max(0, DEF finale - garde native appliquee)
```

Exemple : ATK 210 contre DEF 230 dont +60 Garde. Sans cette Garde, DEF 170
aurait echoue : son donneur gagne une assist et +3. Si la DEF suffisait deja,
aucune assist. Auto-garde, attaque magique, protection/relique equipee,
passif ou consommation aboutissant a une esquive ne creent aucune assist DEF.
Une garde conservee sur les relances est jugee sur la seule formule finale.

`assists` contient le total ATK + DEF. `defensiveAssists` en est un sous-ensemble
informatif : ne JAMAIS lui ajouter +3 une seconde fois. Les seules nouvelles
metriques des resumes indice 3 sont `valuedAttack`, `valuedDefense` et
`defensiveAssists`. Elles sont derivees, pas des compteurs mutables de sauvegarde.

## MVP et interface

Un Golden Crystal unique, sur les deux equipes, indice strictement positif.
A egalite : assists, soutiens, trefles utilises au donneur, Reraise utilises
au donneur, kills, Blocks, ATK valorisee, DEF valorisee, debuff, puis UID lexical.
L'indice 2 conserve son departage ATK/DEF brutes ; l'indice 1 conserve le sien.
Aucun RNG.
Les quatre autres Golden gardent leurs regles et leurs ex aequo.

Le MVP et la feuille de match ouvrent un detail des dix contributions et
du total. Assists et consommations au donneur sont consultables dans les
complements, les statistiques, la carriere et l'export. Les huit petites
metriques des cartes de duel ne sont pas surchargees.

## Archives et migration

- Marqueur absent ou `ratingVersion: 1` : ancienne formule et ancien departage
  strictement conserves, y compris lors d'un import ou d'une reprise en cours.
- `ratingVersion: 2` : puissance brute, assists ATK uniquement et departage
  original conserves. Aucun champ valorise ni assist DEF n'est reconstruit
  pour ces archives, meme si leur trace contient des gardes natives.
- Aucune recherche approximative du donneur dans le journal historique.
  Aucune assist ou consommation au donneur n'est reconstruite pour ces matchs.
- Les anciens Golden Crystal ne sont pas reattribues. Le module de trophees
  version 3 actualise ses metadonnees sans changer les gagnants historiques.
- La migration de trophees utilise le resume original deja archive, sans
  revalider d'anciennes faces contre les cartes actuelles. Les imports et la
  consultation utilisent `createArchiveEngine` avec profils, regles et arenes
  historiques valides. Les identites stables doivent correspondre au catalogue.
- Les resume/rows nouveaux portent `ratingVersion` et `ratingBreakdown`.
  L'import les derive depuis l'etat valide, jamais depuis des scores proposes.
- Les carrieres gardent leurs anciens indices, leur total et leurs trophees.
  `ratingVersions` indique le nombre de participations dans chaque generation.
  Les moyennes d'assists et consommations au donneur divisent uniquement par
  les participations avec indice 2 OU 3, pas par les matchs indice 1 non suivis.
- Les moyennes ATK/DEF valorisees et assists DEF divisent seulement par les
  participations indice 3. La moyenne d'indice global conserve toutes les
  generations originales : ce n'est pas un reclassement selon la formule 3.
- Les champs non suivis s'affichent indisponibles, pas comme un pretendu zero
  historique. Les exports CSV identifient les trois nombres de participations.
- Les totaux/moyennes d'indice mixtes sont historiques : ils ne constituent
  pas une reclassification des anciennes parties selon la formule actuelle.

Aucun reset, nouvelle base IndexedDB, changement d'edition de carte ou
reinitialisation de possession. Les sources/compteurs d'equipement restent
independants. Les copies originales, histoires partielles et import atomique
conservent leurs protections existantes.

## Verification

`site/performance-index.test.cjs` couvre les trois generations, le plafonnement,
les assists DEF causales et les types de
credit, toutes les poses/refreshed, les donneurs morts/remplaces, les auto-buffs,
les effets speciaux, Kalistel, les relances et sources falsifiees.
`site/performance-index.browser.test.cjs` teste la vraie base locale isolee,
les imports modernes/historiques, l'idempotence, les details desktop/Razr,
les petites largeurs, le paysage, Reduced Motion et la reprise.

Campagne actuelle et limites : [indice 2 vers 3](../revisions/2026-10-10-performance-useful/README.md).
La [campagne precedente](../revisions/2026-10-10-performance-index/README.md)
est conservee sans reecriture.
