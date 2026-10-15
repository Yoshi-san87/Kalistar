# Cinq adversaires IA - etude et verification

## Perimetre

Kael (assaut), Maelis (protection), Nox (rupture), Lyra (combinaisons),
Soren (adaptation). Selection independante du deck, de sa cohesion et du terrain.
La version 4.6.46 conserve les regles, valeurs natives, save schema 6 et les
definitions d'equipements gelees. Les anciennes parties gardent Le Veilleur.

Architecture et limites : [ADVERSAIRES_IA.md](../../docs/ADVERSAIRES_IA.md).

## Etude des strategies

Le diagnostic precedent montrait une IA qui classait surtout des moyennes ATK
contre DEF. Or une carte ne possede pas de points de vie persistants : gagner
largement un duel ne vaut pas plusieurs eliminations. Le nouveau socle compare
les issues reelles des faces et les ressources consommees ou gagnees.

- Kael valorise plus directement la probabilite de kill et evite de consacrer
  trop d'actions a la preparation.
- Maelis valorise la suppression des attaquants dangereux pour son plateau et
  les protections sur les pieces qui contribuent a son equipe.
- Nox valorise les pertes de synergies et de commandement que provoquerait une
  elimination, ainsi que la suppression des fournisseurs de soutiens.
- Lyra valorise davantage les dons non redondants et la progression vers une
  activation. Les dons a des allies distincts sont pris en compte.
- Soren equilibre ces axes et augmente la valeur des soutiens en inferiorite.

Ce sont des preferences, pas des interdictions : tous peuvent attaquer, soutenir
ou profiter d'un ultime. Ils ne voient pas le prochain de. Les 20 plateaux
initiaux du panel produisent cinq suites de decisions distinctes. Aucun profil
ne renonce a une elimination garantie pour une attaque numerique sans issue
dans le scenario de non-regression dedie.

## Campagne comparative

Resultats reproductibles dans [benchmark.json](benchmark.json).
20 compositions natives par profil, chaque paire jouee dans les deux sens,
soit 40 matchs par profil et **200 matchs** contre la politique historique.
Les cartes, equipements, terrains et graines sont identiques entre profils.
Le panel couvre des equipes avec 4, 6, 8 ou 10 reliques et des associations
de reliques ; une partie porte aussi armes et protections.

| Profil | Victoires | Taux | Echanges moyens |
| --- | ---: | ---: | ---: |
| Kael | 25 / 40 | 62,5 % | 34,50 |
| Maelis | 24 / 40 | 60 % | 36,00 |
| Nox | 23 / 40 | 57,5 % | 34,80 |
| Lyra | 26 / 40 | 65 % | 36,03 |
| Soren | 24 / 40 | 60 % | 34,00 |

**122 victoires / 200**, aucun blocage, aucun match nul au plafond de tours.
Plus longue rencontre : 88 echanges. **33 591 validations d'etat** ; sauvegarde
et restauration apres chaque resultat. 3 509 decisions des nouveaux profils.

Les ecarts de 1 a 3 victoires ne prouvent pas une hierarchie entre profils.
Le faible effectif par profil et le panel riche en reliques limitent la portee
de cette mesure. Ce test ne garantit pas une victoire contre un humain ni une
egalite parfaite entre styles. Il montre ici cinq politiques competitives face
a la precedente, avec des choix differents sans avantage artificiel.

La campagne a ete rejouee apres optimisation des copies : memes 200 resultats,
moins de temps de calcul. Les temps p95 de `benchmark.json` sont mesures avec
quatre workers concurrents ; ce ne sont pas des latences garanties sur mobile.

## Interface et limites visuelles

Captures et mesures dans `browser/`, viewport desktop 1440x1000, Razr 412x1007,
compact 320x568 Reduced Motion. Choix du profil, conservation des autres
reglages, duel local sans profil, lancement du vrai tour IA, nom en arene,
reprise apres reload et preference du prochain match testes.

Le calcul cooperatif laisse le navigateur peindre entre les couples examines.
Il ne cree aucun timer permanent et s'annule quand son etat ou sa vue change.
Les captures ont ete inspectees, sans debordement horizontal du dialogue.

## Rejouer

Depuis la racine, avec `KALISTAR_NODE_MODULES` si necessaire :

```text
node --test V4/site/ai-strategies.test.cjs
node V4/revisions/2026-10-13-ai-opponents/benchmark.cjs
node V4/deploy/build.cjs
node V4/site/ai-strategies.browser.test.cjs
```

`V4/site/fixtures/ai-native.json` contient les compositions explicites, pas des cartes
aux statistiques modifiees. Les tests unitaires synthetiques sont distincts de
la campagne native. Les sorties de test ne modifient aucun compte personnel.
