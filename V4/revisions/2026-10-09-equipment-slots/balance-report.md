# Audit statistique equipements 4.6.0

Campagne : 10000 rencontres, 1000 groupes apparies avec inversion des camps, 28 arenes, 296/296 cartes et 40 factions.
Duree : 146.80 s. 38591 controles d'etat, 173 reprises verifiees. Sources changees pendant le calcul : non.

## Impact mesure

Equipe A equipee contre equipe B sans equipement. Le resultat suit A apres inversion physique des camps. Un nul vaut 0,5.

| Variante | Victoires A (nuls=0,5) | Delta vs sans | IC95 delta | Echanges moyens | Duels numeriques |
| --- | ---: | ---: | --- | ---: | ---: |
| none | 51.90 % | - | - | 35.27 | 53069 |
| weapon | 52.65 % | 0.75 % | [-0.04 %; 1.54 %] | 35.06 | 52830 |
| shield | 51.90 % | 0.00 % | [-0.93 %; 0.93 %] | 35.32 | 53207 |
| relic | 52.25 % | 0.35 % | [-0.50 %; 1.20 %] | 35.47 | 53396 |
| all | 53.65 % | 1.75 % | [0.46 %; 3.04 %] | 35.24 | 53197 |

## Activations reelles

| Variante | Arme : utilisations / duels eligibles | Protection : utilisations / duels eligibles | Points armes | Points protections | Relique : utilisations | Protections utilisees puis defense perdue |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| none | 0/0 | 0/0 | 0 | 0 | 0 | 0 |
| weapon | 1661/7599 | 0/0 | 33155 | 0 | 0 | 0 |
| shield | 0/0 | 1436/8307 | 0 | 36080 | 0 | 350 |
| relic | 0/0 | 0/0 | 0 | 0 | 917 | 0 |
| all | 1685/7796 | 1432/8255 | 33600 | 36075 | 891 | 347 |

## Controle exhaustif des seuils D6

Toutes les editions compatibles de chaque arme/protection sont comparees aux cartes du catalogue, avec enumeration des faces. Ce controle isole les seuils de kill/Block sans Kalistel, jetons, synergies, capitaine, arene ou reliques. Les retries DEF sont normalises sur les faces terminales ; Esquive reste une annulation, Mort et soutiens ne deviennent jamais des chiffres.

| Equipement | Editions compatibles | Contextes numeriques actifs | Seuils modifies | Gain moyen kill/Block par attaque choisie |
| --- | ---: | ---: | ---: | ---: |
| fallen-king-axe | 1 | 1619 | 145 | 1.41 % |
| white-oath-rapier | 1 | 1619 | 35 | 0.35 % |
| brotherhood | 1 | 1619 | 54 | 0.53 % |
| virtuous-contract | 1 | 1619 | 16 | 0.15 % |
| virtuous-treaty | 1 | 1619 | 51 | 0.50 % |
| socom | 3 | 4857 | 206 | 0.67 % |
| lulu-mog | 1 | 1619 | 16 | 0.15 % |
| leopard-lightning | 2 | 3238 | 20 | 0.10 % |
| mythic-iron-gauntlet | 1 | 1619 | 68 | 0.66 % |
| post-bow | 1 | 1619 | 16 | 0.16 % |
| grimoire-weiss | 1 | 1619 | 18 | 0.17 % |
| gen-mechanical-arm | 2 | 3238 | 33 | 0.16 % |
| violet-reaping | 2 | 1619 | 31 | 0.15 % |
| mantis-mask | 1 | 1619 | 21 | 0.20 % |
| revolver-gunblade | 1 | 1619 | 40 | 0.39 % |
| wolf-steel | 1 | 1619 | 28 | 0.27 % |
| wolf-silver | 1 | 1619 | 28 | 0.27 % |
| kaine-saw | 1 | 1619 | 17 | 0.16 % |
| buster-sword | 1 | 1619 | 30 | 0.29 % |
| psg1 | 1 | 1619 | 25 | 0.24 % |
| single-action-army | 3 | 4857 | 88 | 0.29 % |
| wardens-spear | 5 | 8095 | 384 | 0.76 % |
| soldiers-blade | 2 | 3238 | 71 | 0.34 % |
| commanders-sabre | 0 | 0 | 0 | 0.00 % |
| arborium-twinstring-bow | 2 | 3238 | 90 | 0.44 % |
| arborium-thorn-dagger | 1 | 1619 | 137 | 1.33 % |
| draevenheim-wing-spear | 1 | 1619 | 96 | 0.96 % |
| draevenheim-crimson-crossbow | 0 | 0 | 0 | 0.00 % |
| cryptown-oath-sword | 1 | 1619 | 59 | 0.57 % |
| cryptown-vigil-rifle | 1 | 1619 | 40 | 0.39 % |
| cryptown-watch-flail | 1 | 1619 | 74 | 0.72 % |
| rhinoz-ancestral-horn | 0 | 0 | 0 | 0.00 % |
| durane-rampart | 9 | 12942 | 987 | 1.03 % |
| tide-pavise | 5 | 7190 | 599 | 1.12 % |
| sentinel-carapace | 1 | 1438 | 24 | 0.23 % |
| sap-cuirass | 14 | 20132 | 1375 | 0.93 % |
| gate-gauntlets | 1 | 1438 | 26 | 0.24 % |
| rhinoz-hauberk | 5 | 7190 | 256 | 0.48 % |
| first-thaw-cloak | 5 | 7190 | 509 | 0.99 % |
| abyss-plastron | 4 | 5752 | 316 | 0.74 % |
| cold-blood-mantle | 10 | 14380 | 1220 | 1.14 % |
| last-vigil-cuirass | 9 | 10066 | 736 | 0.77 % |
| dawn-gorget | 6 | 8628 | 626 | 1.03 % |
| last-forge-apron | 1 | 1438 | 195 | 1.83 % |
| ninth-life-boots | 2 | 0 | 0 | 0.00 % |
| octocamo | 1 | 1438 | 51 | 0.48 % |
| cyborg-ninja-armor | 1 | 1438 | 180 | 1.69 % |
| zanarkand-pauldron | 2 | 2876 | 158 | 0.74 % |
| leon-body-armor | 1 | 1438 | 170 | 1.60 % |
| stars-vest | 1 | 1438 | 81 | 0.76 % |
| guardian-red-coat | 1 | 1438 | 12 | 0.11 % |
| scarlet-cape | 1 | 1438 | 159 | 1.49 % |
| wolf-school-armor | 1 | 1438 | 179 | 1.68 % |
| ff9-orichalque | 1 | 1619 | 39 | 0.38 % |
| ff9-magekane | 3 | 4857 | 60 | 0.19 % |
| ff9-excalibur | 1 | 1619 | 51 | 0.50 % |
| ff9-save-the-queen | 1 | 1619 | 84 | 0.82 % |
| ff9-dragonade | 1 | 1619 | 26 | 0.25 % |
| ff9-runigriffe | 1 | 1619 | 7 | 0.07 % |
| ff9-gastrette | 1 | 1619 | 133 | 1.31 % |
| ff9-backstage-hammer | 1 | 1619 | 144 | 1.40 % |
| ff9-oath-helm | 1 | 1438 | 15 | 0.14 % |
| ff9-vivi-hat | 3 | 4314 | 431 | 1.43 % |
| ff9-burmecia-coat | 1 | 1438 | 139 | 1.30 % |
| ff9-solitary-wraps | 1 | 1438 | 161 | 1.81 % |
| ff9-reunion-bandana | 1 | 1438 | 141 | 1.32 % |

Equipements compatibles mais sans D6 numerique activateur actuel : ninth-life-boots. C'est un point de conception du catalogue, pas une autorisation de remplacer une face speciale.

## Initiative

Le tirage et le calendrier ABBA ne changent pas. Le taux de victoire du gagnant du tirage est descriptif ; son intervalle est calcule par groupe apparie, pas en traitant les deux orientations comme independantes.

- none : 48.90 %, IC95 par groupe [46.47 %; 51.33 %].
- weapon : 49.55 %, IC95 par groupe [47.15 %; 51.95 %].
- shield : 48.30 %, IC95 par groupe [45.91 %; 50.69 %].
- relic : 48.25 %, IC95 par groupe [45.87 %; 50.63 %].
- all : 48.15 %, IC95 par groupe [45.83 %; 50.47 %].

## Interpretation et limites

- Un +30 sur D6 vaut +5 par jet brut independant si les six faces sont numeriques. Ce n'est pas un +30 permanent. Kalistel et relances DEF changent la distribution des resultats conserves.
- Les taux d'activation ci-dessus portent sur le duel numerique final, pas les essais abandonnes. La campagne compte separement les tentatives DEF.
- La meme graine ne garantit pas une suite identique de jets apres divergence : changement de cible, elimination ou relance peut changer le nombre de tirages. Les comparaisons sont appariees par deck/graine, pas par duel.
- Les deux orientations d'un groupe ne sont pas traitees comme deux observations independantes pour les intervalles des deltas.
- Les fonctions de choix utilisent seulement les informations publiques. Une politique aleatoire complementaire limite la dependance a une seule heuristique, sans remplacer des joueurs humains.
- Une difference non significative n'est pas une preuve d'equivalence. Ces resultats ne prouvent ni l'equilibrage competitif universel ni le fun ressenti.
- Les indicateurs de duree, rencontres serrees et changements de meneur sont des indices structurels, pas une mesure objective du plaisir.
- Les armes/protections et la plus forte contribution de relique s'additionnent. Plusieurs charges de reliques de meme statistique ne s'additionnent pas.
- La fin anticipee sur plateau vide avec reserves incompatibles reste une regle historique ; la simulation ne suppose pas dix kills pour toute victoire.
- Armes sans porteur compatible actuel : commanders-sabre, draevenheim-crimson-crossbow, rhinoz-ancestral-horn. Aucune restriction n'a ete relachee pour cet audit.

## Reproduction

```powershell
node V4/revisions/2026-10-09-equipment-slots/balance.cjs --pairs=1000
node --test --test-isolation=none V4/site/equipment-v2.test.cjs
```

Le JSON conserve les empreintes de sources, la graine, les decks, toutes les comparaisons apparies et les utilisations par equipement.
