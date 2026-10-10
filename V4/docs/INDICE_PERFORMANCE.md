# Indice de performance 2

Decision utilisateur du 10 octobre 2026. Aucun changement aux faces natives,
aux scores des combats, au RNG, aux buffs, a l'IA, aux equipements ou a ABBA.

## Calcul

Source commune : `site/performance-index.js`, coefficients geles et fonction
pure `calculate(row, ratingVersion)`. `engine.matchStats()` conserve son role
d'agregateur unique des evenements definitifs du match.

```text
5 x kills + 3 x Blocks
+ floor(ATK cumulee / 100) + floor(DEF cumulee / 100)
+ 3 si victoire definitive et participation
+ 2 x nouveaux soutiens + 3 x assists
+ 2 x trefles utilises au donneur + 2 x Reraise utilises au donneur
+ floor(ATK retiree / 30)
```

Le +1 historique de Reraise consomme par le beneficiaire n'existe plus dans
l'indice 2. Sa statistique `reraises` reste consultable. Les nouveaux soutiens
physique, mana, ward, luck et reraise donnent chacun +2, a soi aussi. Un refresh
ne donne aucun point de pose et conserve le premier donneur.

ATK/DEF sont les sommes officielles des scores finaux des evenements. Aucun
score intermediaire Kalistel, DEF retry ou premier essai de trefle ne s'ajoute.
Mort, soutien et esquive ne deviennent pas des scores numeriques fictifs.
Les equipements appliques restent compris dans les vrais totaux numeriques,
mais ne creent aucun soutien ni assist individuel supplementaire.

Le +3 victoire est derive seulement en phase `over`, pour les `entered` du
camp gagnant, morts compris. Pas aux reserves inutilisees, perdants, matchs
nuls ou historiques partiels. Il n'est jamais ecrit comme un compteur mutable.

## Provenance et consommation

Une nouvelle partie conserve `match.ratingVersion: 2`. Le schema global reste
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
de trace n'ajoute aucun score ni assist pour la garde.

La sauvegarde intermediaire conserve les sources du duel deja consommees.
Le resume et le journal ajoutent les credits une fois que l'echange est
definitif. Une reprise en cours de relance ne les perd pas et ne les double pas.
Les sources sont validees contre le premier evenement non-refresh, le bon camp,
le bon UID et le bon type. Une source deja consommee ne peut pas rester active
ni etre utilisee sur un second echange. Un donneur mort reste dans les unites.

## Passe decisive

Seules les charges ATK natives physique/mana donnees a un AUTRE combattant
peuvent faire une assist. Le moteur prend le kill definitif et la formule
finale, avec tous ses matchups, barriere, synergies et equipements :

```text
kill reel ET ATK > DEF
ET max(0, ATK - buff natif effectivement applique) <= DEF
```

L'egalite sans buff signifie bien absence de kill. Le donneur gagne une assist
et +3. La charge ne peut servir qu'une fois. Une consommation sans kill,
un buff superflu, un auto-buff, Mort, esquive, Reraise, garde ou bonus passif
ne donnent aucune assist. Trefle et coeur donnent +2 supplementaires a leur
donneur lors de consommation/sauvetage reel, a soi aussi si auto-attribues.

## MVP et interface

Un Golden Crystal unique, sur les deux equipes, indice strictement positif.
A egalite : assists, soutiens, trefles utilises au donneur, Reraise utilises
au donneur, kills, Blocks, ATK, DEF, debuff, puis UID lexical. Aucun RNG.
Les quatre autres Golden gardent leurs regles et leurs ex aequo.

Le MVP et la feuille de match ouvrent un detail des dix contributions et
du total. Assists et consommations au donneur sont consultables dans les
complements, les statistiques, la carriere et l'export. Les huit petites
metriques des cartes de duel ne sont pas surchargees.

## Archives et migration

- Marqueur absent ou `ratingVersion: 1` : ancienne formule et ancien departage
  strictement conserves, y compris lors d'un import ou d'une reprise en cours.
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
  les participations avec indice 2, pas par les anciens matchs non suivis.
- Les champs non suivis s'affichent indisponibles, pas comme un pretendu zero
  historique. Les exports CSV identifient les deux nombres de participations.
- Les totaux/moyennes d'indice mixtes sont historiques : ils ne constituent
  pas une reclassification des anciennes parties selon la formule actuelle.

Aucun reset, nouvelle base IndexedDB, changement d'edition de carte ou
reinitialisation de possession. Les sources/compteurs d'equipement restent
independants. Les copies originales, histoires partielles et import atomique
conservent leurs protections existantes.

## Verification

`site/performance-index.test.cjs` couvre les coefficients, les trois types de
credit, toutes les poses/refreshed, les donneurs morts/remplaces, les auto-buffs,
les effets speciaux, Kalistel, les relances et sources falsifiees.
`site/performance-index.browser.test.cjs` teste la vraie base locale isolee,
les imports modernes/historiques, l'idempotence, les details desktop/Razr,
les petites largeurs, le paysage, Reduced Motion et la reprise.

Campagne et limites : [revision et simulations](../revisions/2026-10-10-performance-index/README.md).
