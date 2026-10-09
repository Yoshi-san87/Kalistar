# Verification independante du gameplay 4.6.0

## Perimetre

Les preuves de ce dossier ne modifient aucun profil natif, aucune matrice,
aucune regle de capitaine, aucun calendrier ABBA et aucune sauvegarde utilisateur.
Les cas controles changent uniquement des clones de donnees en memoire pour
isoler une condition ou une egalite de faces. Les simulations de matchs utilisent
les 296 profils reels verifies du catalogue, sans modifier leurs faces.

Sources et resultats :

- `../../site/equipment-v2.test.cjs` : nouveaux scenarios independants du moteur.
- `balance.cjs` : generateur deterministe de la campagne et enumeration des seuils.
- `balance-report.json` : parametres, empreintes, decks, orientations, resultats,
  contributions par equipement et comparaison des cinq variantes.
- `balance-report.md` : synthese lisible et limites statistiques.

Les modifications du moteur et du catalogue appartiennent au travail
d'integration principal, pas a cet audit. Aucune publication autonome.

## Scenarios cibles

Les 25 groupes de tests couvrent notamment :

- Tous les equipements et leurs definitions historiques ; identifiants stables,
  restrictions personnage/job/famille et refus du mauvais emplacement.
- Chaque arme et protection ayant un porteur compatible, des deux camps,
  sur D5 et D6, avec verification du vrai total et de la matrice imprimee.
- Trois emplacements simultanes, remplacement atomique d'une arme sans toucher
  aux deux autres emplacements et protection contre une confirmation perimee.
- D6 ATK non encore accepte, D6 abandonne, D6 retenu et second jet obligatoire.
- D6 magique avec barriere D6, protection comptabilisee meme si la cible meurt,
  et Block ordinaire sans activation de protection.
- Trefle 6 vers 5 et 5 vers 6, sauvegarde entre les jets, nouvelle formule DEF,
  conservation de la formule d'echec precedente et metriques non doublees.
- Retry DEF, toutes les faces speciales D6 natives, Mort contre DEF6 numerique,
  et branche legacy de bouclier inapproprie demandant un nouveau jet.
- Toutes les reliques `ONCE_DEFENSE`, dans les deux camps : vraie condition,
  vrai beneficiaire, reprise, attaque qui ne depense pas la charge, prochaine
  defense qui la consomme et absence de recharge.
- Cadeau de la flute, protection directe et plusieurs charges de relique :
  seul le plus fort bonus de relique s'ajoute a la protection ; toutes les
  charges capturees sont consommees selon leur duree propre.
- Snapshot de match independant du profil et preservation du comportement
  historique de la Hache du Roi Dechu dans les matchs legacy deja commences.
- Calendrier ABBA et tirage identiques avant usage ; IA ne valorisant pas une
  arme D6 comme un bonus permanent de +30.
- Douze rencontres trois-emplacements completes avec validation a chaque
  transition et reprises repetees.
- Sauvegardes incoherentes : source, bonus, somme, numero de face, contribution
  de l'essai precedent et incoherence avec l'historique des jets.

## Anomalie detectee et correction verifiee

Le premier controle adversarial a montre qu'avec deux faces DEF de meme valeur,
une sauvegarde pouvait annoncer D6 alors que le jet conserve etait D5. Une
formule d'echec pouvait aussi emprunter le D6 d'une relance de trefle ulterieure.
Les nouveaux tests ont ete laisses stricts. L'integration principale a lie le
de courant au dernier jet enregistre, et la formule d'echec au premier essai
numerique ayant precede le trefle. Les deux regressions passent apres correction.

Il s'agit de validation de coherence locale, pas d'un systeme anti-triche signe :
une application locale ne peut authentifier cryptographiquement un historique
entierement reecrit sans autorite externe.

## Campagne statistique

Commande de reference :

```powershell
node --test --test-isolation=none V4/site/equipment-v2.test.cjs
node V4/revisions/2026-10-09-equipment-slots/balance.cjs --pairs=1000
```

1000 groupes deck/graine, deux orientations et cinq variantes donnent
10 000 rencontres : aucun equipement, armes seules, protections seules,
reliques seules et les trois emplacements. Seule l'equipe A est equipee ;
elle reste A lors de l'inversion physique des camps. Les resultats apparies
sont moyennes sur les deux orientations AVANT le calcul de l'intervalle.

Le scope comprend les presets, des equipes orientees faction, des porteurs
d'equipement et des compositions aleatoires legales. Une partie des equipes
sont miroir. Les 28 arenes sont toutes parcourues. 80 % des groupes utilisent
l'IA publique de production et 20 % des choix de duel uniformement aleatoires
avec les memes fonctions publiques de soutien.

Le rapport conserve l'empreinte des six modules moteur/equipement/factions et du
catalogue de gameplay, matrices et arenes incluses. Apres une modification de ces sources, relancer cette
commande avant de presenter le rapport comme preuve de la version finale.
`sourceChangedDuringRun: true` invalide le gel de preuve pour une publication.

## Lecture des resultats

Dans la campagne de reference sur 296 cartes, 40 factions et 1260 decks distincts,
265 699 duels numeriques ont ete resolus. Les deltas apparies de victoire de A
contre le groupe sans equipement sont :

| Equipement de A | Delta de victoire | IC95 du delta |
| --- | ---: | --- |
| Arme seule | +0,75 point | [-0,04 ; +1,54] points |
| Protection seule | 0,00 point | [-0,93 ; +0,93] points |
| Relique seule | +0,35 point | [-0,50 ; +1,20] points |
| Trois emplacements | +1,75 point | [+0,46 ; +3,04] points |

La duree moyenne est de 35,27 echanges sans equipement contre 35,24 avec les
trois emplacements. Leur difference appariee est -0,027 echange, IC95
[-0,322 ; +0,269]. Le gagnant du tirage gagne 48,90 % des rencontres sans
equipement, IC95 par groupe [46,47 % ; 51,33 %]. Cela ne demontre pas un biais
positif de l'initiative dans cette campagne.

Un +30 D6 represente +5 points par jet brut equiprobable lorsqu'il est numerique,
pas un +30 permanent. Les jets conserves ATK sont cependant biaises par Kalistel,
et DEF par retry/trefle ; les taux observes ne doivent pas etre forces a 1/6.
Le controle exhaustif des seuils complete les matchs sans pretendre representer
une meta humaine : 203 361 contextes numeriques actifs, 11 227 seuils modifies.

La campagne observe aussi 347 defenses numeriques perdues malgre une protection
utilisee dans la variante trois-emplacements : 340 eliminations et 7 vies
sauvees par Reraise. Une defense numerique perdue mais sauvee
par Reraise reste egalement un usage de protection, sans devenir un Block.
Son animation ne doit donc jamais etre
conditionnee a un Block. Le moteur conserve correctement ces contributions.

## Points du catalogue a ne pas masquer

- `commanders-sabre`, `draevenheim-crimson-crossbow` et
  `rhinoz-ancestral-horn` n'ont pas de porteur compatible actuel. Les conditions
  sont appliquees strictement, pas relaxees pour augmenter la couverture.
- `ninth-life-boots` est compatible avec Rikka, mais toutes ses DEF6 actuelles
  sont Esquive. La protection ne peut donc jamais ajouter un bonus numerique.
  Ce choix de catalogue doit etre revise explicitement ou clairement indique
  dans l'interface ; ne jamais transformer Esquive en chiffre pour l'activer.
- Toutes les autres armes compatibles et toutes les reliques ont produit des
  usages dans la campagne ; la protection ci-dessus explique l'absence d'usage
  de la vingt-sixieme protection dans les rencontres natives.

## Limites

Les intervalles sont individuels par comparaison, pas des garanties simultanees
avec correction des comparaisons multiples. Ils quantifient cette campagne synthetique et ses graines. Ils ne
prouvent ni l'equivalence de toutes les cartes ni un equilibrage competitif
universel. Meme graine ne signifie pas memes duels ulterieurs : une elimination
ou une relance change le nombre de tirages. L'appariement est par match,
jamais par sequence de jets pretendument identique.

L'IA n'est pas un joueur humain ni une politique optimale. Les effets de meta,
le confort visuel et le fun ressenti exigent des parties humaines. Duree,
rencontres serrees et changements de meneur sont des indices structurels,
pas une mesure objective du plaisir. Aucune affirmation d'equilibrage prouve
ou de fun prouve n'est tiree de ces simulations.
