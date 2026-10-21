# Arenes du 21 octobre 2026 : tests et simulation

## Perimetre

Travail limite a `arena-balance.test.cjs`, `simulation.cjs` et ce rapport.
Aucun changement du moteur, des supports, consommables, illustrations,
catalogues communs, registres de tests, versions ou build. Aucun staging,
commit, push ou deploiement. La validation concurrente P Generator 4.6.106
est hors perimetre.

Source des huit arenes : `arenas.json`, lu directement. Les regles attendues
dans le test sont independantes du manifeste, pour detecter une erreur de
valeur, de cristal, d'identite ou de collaboration. Les deux arenes natives
n'ont pas de champ `collaboration`.

Le catalogue de test utilise `buildCatalog` et toutes les publications
`kind=created`. Une arene deja integree doit correspondre exactement au
manifeste ; une arene absente est ajoutee uniquement en memoire. Aucun fichier
de catalogue local concurrent n'est cree. Le controle strict
`KALISTAR_REQUIRE_INTEGRATED=1` / `--require-integrated` interdit ce complement.

La campagne a commence avant le branchement de `V4/atelier/arena-catalog.cjs`,
pour preserver la validation du build fige 4.6.106. Elle conserve ce snapshot
en memoire ; les huit assets sont finalises et les regles n'ont pas change.

Pendant la campagne, le responsable a confirme l'integration active :
validateur partage branche, six collaborations et deux arenes natives.
Il rapporte **69/69 PASS en 12,3 s** pour la suite stricte alors a 46 tests,
game-catalog, collaboration-arenas et ambience. Son audit de release confirme
**462 cartes identiques, 28 anciennes arenes identiques, 36 arenes actuelles
et journeyHash inchange**. Il confirme que le snapshot en memoire de cette
simulation correspond au catalogue actif hors arene QA ; aucune seconde
campagne longue n'est requise. Ces resultats sont rapportes par le responsable,
distincts des executions directes listees plus bas.

Les fichiers `integration.test.cjs` et le test navigateur PC/Razr sont pris en
charge par l'autre intervention ; leur execution ne fait pas partie de ce
rapport.

## Controles deterministes

Catalogue observe : 462 modeles, 28 anciennes arenes, 27 identites a domicile
representees par 40 versions. Les 7 392 comparaisons modele/arene/camp couvrent
le catalogue entier, en plus des sondes synthetiques. Deux versions locales de
Grivka sont `NONE` et gardent seulement +10 ATK / +10 DEF de domicile.

- Bonus exacts pour chaque modele publie, des deux camps, avec plafonds
  +25 ATK / +10 DEF et domicile par `characterId` toutes versions confondues.
- Identite independante du nom, de la faction, du role et de l'ID du modele ;
  tous les cristaux sont testes sur des profils de test distincts.
- `NONE` ne recoit aucun bonus elementaire, meme face a une arene adversariale
  `NONE` / +15. Des duels numeriques reels, des deux camps dans les huit
  arenes, confirment uniquement +10/+10 domicile pour `NONE`. RPD conserve
  `element=null`, +0 element et +10/+10 domicile.
- Rejet des depassements, nombres negatifs, fractions, chaines, null, NaN et
  Infinity pour les trois valeurs de bonus, sans correction silencieuse.
- Cinq soutiens, refresh sans cumul, coexistence des charges, beneficiaires
  valides, sauvegardes dans les phases intermediaires. Etats de soutien
  integralement identiques au neutre hors ID de match/arene.
- Consommation physique/magique, ward conserve sur la relance du meme duel,
  trefle, Reraise, Mort et esquive ; les scores seuls recoivent le bonus.
- Kalistel : soutien abandonne sans attribution, deux charges par camp,
  restauration sans consommation supplementaire.
- Sauvegardes synthetiques de toutes les anciennes arenes, construites sans
  les huit ajouts, nouvelles sauvegardes et reprise d'un snapshot historique
  malgre une definition future volontairement changee.
- Reproductibilite et inversion des camps ; agregation testee avec resultats
  synthetiques connus, nuls a 0,5 et quatre matchs regroupes par paire.

## Simulation

Moteur courant `V4/site/engine.js`, compositions legales de `matchmaking.js`
et `team-composition.js`, runner etabli
`V4/revisions/2026-10-13-ultimate-audit-1000/simulate.cjs`.
Ce runner utilise l'API publique, verifie les formules et restaure le JSON
apres chaque action ; aucun de n'est force pendant la campagne.

Configuration : 40 paires par arene, huit arenes, quatre matchs par paire,
soit 1 280 matchs (plus un replay de controle). Une paire garde les memes
equipes, la meme graine et la meme politique en neutre et dans la nouvelle
arene, puis echange les camps. ABBA et deux Kalistels par camp.

Pour chaque arene : 20 paires generalistes, 20 avec au moins un titulaire
a domicile dans l'equipe focale et aucun personnage a domicile en face.
La seconde strate parcourt les identites locales ; les versions publiees sont
couvertes exhaustivement par les tests, pas par un echantillonnage exhaustif
des matchs. Les emplacements d'equipement sont vides pour isoler les arenes.
Politique : heuristique native existante, sans profil IA avance nomme.

Graine racine : `KALISTAR-ARENAS-20261021`. Unite statistique : la paire de
decks/graine, pas chacun de ses quatre matchs correles. Le score focal compte
une victoire pour 1, un nul pour 0,5 et une defaite pour 0.

### Resultats executes

**1 280 / 1 280 matchs termines, aucun echec**, plus un replay strictement
identique. Duree des matchs et du replay : 829,824 s (13 min 49,8 s), hors
preparation des compositions. Les empreintes des sources du moteur et des
helpers executes sont restees identiques pendant toute la campagne.

- 222 561 restaurations JSON verifiees, 47 748 verifications de formule.
- 9 279 evenements de soutien non rafraichis ; aucun double comptage detecte.
- Aucun nul ; maximum observe : 116 echanges, sous la limite de 200.
- 118 resultats differents sur les 640 comparaisons neutre/nouvelle arene.
  Un changement de resultat n'est pas un echec : les bonus et les choix IA
  peuvent modifier la suite du combat.

Chaque ligne represente 40 paires, 80 matchs neutres et 80 dans l'arene.
Les scores concernent toujours l'equipe A d'origine, meme apres inversion
des camps. SE = erreur standard descriptive calculee sur les 40 differences
appariees, en points de pourcentage, pas sur 160 matchs independants.

| Arene | Score neutre % | Score arene % | Delta pp | SE pp | Issues changees / 80 |
| --- | ---: | ---: | ---: | ---: | ---: |
| ff9-alexandria | 50,00 | 51,25 | +1,25 | 5,22 | 17 |
| witcher-kaer-morhen | 53,75 | 55,00 | +1,25 | 4,90 | 15 |
| batman-gotham-rooftops | 62,50 | 56,25 | -6,25 | 4,80 | 13 |
| re2-rpd | 48,75 | 48,75 | 0,00 | 2,53 | 6 |
| chrono-leene-square | 48,75 | 55,00 | +6,25 | 6,25 | 23 |
| one-piece-water-seven | 42,50 | 47,50 | +5,00 | 5,88 | 22 |
| grivka-refuge | 48,75 | 45,00 | -3,75 | 5,18 | 13 |
| froz-bastion | 52,50 | 48,75 | -3,75 | 4,16 | 9 |

Ventilation des variations, 20 paires dans chaque strate :

| Arene | Delta generaliste pp | Delta domicile/absence domicile pp |
| --- | ---: | ---: |
| ff9-alexandria | -2,50 | +5,00 |
| witcher-kaer-morhen | +2,50 | 0,00 |
| batman-gotham-rooftops | 0,00 | -12,50 |
| re2-rpd | -2,50 | +2,50 |
| chrono-leene-square | +5,00 | +7,50 |
| one-piece-water-seven | +12,50 | -2,50 |
| grivka-refuge | 0,00 | -7,50 |
| froz-bastion | -5,00 | -2,50 |

Ces petites strates montrent qu'un bonus local positif ne garantit pas une
hausse monotone des victoires de l'equipe : l'adversaire peut aussi profiter
du cristal et la politique adapte ses choix. Le -12,50 pp de Gotham dans la
strate domicile est un signal descriptif a conserver, pas une preuve de
penalite de domicile (SE de cette strate : 8,01 pp). Aucune modification de
regle n'est proposee a partir de ce seul echantillon.

### Empreintes de reproduction

SHA-256, pour le snapshot effectivement execute (arene QA comprise) :

```text
arenas.json       0f91e3b04cc984e576bbcd1d5c01e9e025be3e11479ccdfdd9d9ecdf8622edd4
catalogue         82222aaa1082d2bc422a48be5dfc3defcd4f547eefef157de899e43c72aecadd
specifications    d98e82e68018fb9711308ca32475f179ee9110d4c7cf9bab1d1050ae3952363b
resultats         0cbc44b1997d950a34dc4a08398accb3f9045d4d12d806c880df0e0036b44579
simulation.cjs    ae0a5b09e9a635c383f071d65f40ab11ae1f51a41219c4d58010b610c4d8f48c
engine.js         cc0130d59184bdb045a7ec91500c62c0bfc1cad7c7297c56cddb482bff3db304
runner etabli     65e253b690a0604b6c9777493ea6fe0ee538e14998ded2179c5afaff0865780a
matchmaking.js    e61a0bbf3b8a84cc3e936f88f51a4579e65bddeb7e6c65447ddd5a7c1605ce2e
team-composition  ba80a057f9c36b75a76840e78313c2b14c60a0677e716747ce7754081fb04bf1
```

Le champ `pendingIntegration` imprime par la simulation decrit son chargement
initial, avant integration, pas le statut final. L'integration a ete verifiee
ensuite par la suite stricte ci-dessous ; le code de construction du catalogue
pouvait evoluer pendant le run, mais pas son snapshot deja charge ni le moteur.

Controle direct final : 462 cartes, 36 arenes actives, aucun ajout de production
manquant ; le catalogue actif avec le meme controle QA a exactement le SHA-256
`82222aaa1082d2bc422a48be5dfc3defcd4f547eefef157de899e43c72aecadd`.
Il est donc identique au snapshot simule, et pas seulement equivalent par ID.

## Reproduction

Executions realisees avec Node v24.14.0 :

- Suite du lot : **47/47 tests passes**, aucun echec ou test ignore ; derniere
  execution avant branchement : 10,68 secondes. Les executions precedentes etaient
  aussi vertes avant les ajouts de controles d'agregation et de duel `NONE`.
- Apres branchement, execution directe avec `KALISTAR_REQUIRE_INTEGRATED=1` :
  **47/47 PASS en 11,07 s** ; diagnostic : les huit arenes sont verifiees dans
  le catalogue actif. Aucun complement d'arene de production en memoire.
- Test existant `V4/site/kalistel.test.cjs` : **PASS**, y compris 8 matchs
  complets et 29 eclats consommes.
- Les fichiers moteur, matchmaking, composition, equipement et runner etablis
  ne presentaient aucun diff Git lors du controle read-only.

Depuis la racine du checkout actif, Node 24+ :

```sh
node --test V4/expansions/2026-10-21-arenes/arena-balance.test.cjs
node V4/site/kalistel.test.cjs
node V4/expansions/2026-10-21-arenes/simulation.cjs
```

Apres integration active :

```sh
node -e "process.env.KALISTAR_REQUIRE_INTEGRATED='1';require('./V4/expansions/2026-10-21-arenes/arena-balance.test.cjs')"
node V4/expansions/2026-10-21-arenes/simulation.cjs --require-integrated
```

`simulation.cjs` imprime le rapport JSON sur stdout et la progression sur
stderr, sans ecrire de fichier. `--pairs 2` permet un smoke test de 64 matchs ;
le defaut reste 40. Un echec de match ou de replay fait echouer le processus.

## Limites et suites

- Pas de preuve d'equilibre global a 50 %. Les taux de victoire dependent
  des equipes, de la politique et de l'echantillon ; 40 paires par arene sont
  un controle de sensibilite, pas une validation competitive exhaustive.
- Les compositions ne sont pas tirees uniformement par personnage. Pas de
  comparaison de tous les profils IA avances ni des synergies d'equipement.
- Restauration au niveau moteur et snapshot JSON uniquement : aucune save
  personnelle, IndexedDB, localStorage ou session de navigateur n'est ouverte.
- Pas de validation d'illustration, d'interface ou de publication dans cette
  intervention. Les tests d'integration et PC/Razr du meme lot sont distincts.
- L'enregistrement au registre commun et les suites de publication restent
  pris en charge par le proprietaire de l'integration ; le controle strict
  est maintenant passe. Le registre est laisse intact par cette intervention.
