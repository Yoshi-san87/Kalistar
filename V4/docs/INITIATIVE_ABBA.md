# Initiative des capitaines et ordre ABBA

Decision utilisateur du 5 octobre 2026, publication V4.5.14.

## Regles

Apres la presentation des cinq paires de titulaires, les deux capitaines
rejoignent le centre du plateau. Chaque camp lance un D6. Le plus grand ouvre
la rencontre ; une egalite relance les deux des, sans bonus de carte.
Les capitaines retournent ensuite a leurs positions initiales.
Les compositions enregistrees gardent leur capitaine choisi. Les decks
predefinis de l'interface designent explicitement leur titulaire P1 ; celui-ci
beneficie du commandement ordinaire, sans nouvelle regle de bonus. Les appels
techniques historiques a partir de deux listes ne nomment aucun capitaine.

A designe le gagnant, B son adversaire. Les actions suivent
**A, B, B, A, A, B, B, A...**. Une action consomme un echange, duel ou soutien.
Un jet DEF, une decision de Kalistel ou un remplacement ne consomme pas
une nouvelle action. `next()` avance l'ordre apres la consultation du resultat.
La frise affiche l'action actuelle et les quatre suivantes.

L'introduction ajoute 300 ms de suspense avant chaque retournement :
380 ms en animation normale, 300 ms en reduced motion. Les animations
d'identite conservent leurs indices persistants et leurs sources natives.

## Moteur et sauvegarde

`engine.newGame(team1, team2, {turnOrder: 'ABBA', ...})` cree le marqueur
optionnel ci-dessous. L'interface l'utilise pour toutes les nouvelles parties.
Les appels techniques sans cette option et les archives sans marqueur
conservent leur ordre ABAB historique. Le schema principal reste `6`, edition V4.

```json
{
  "initiative": {
    "version": 1,
    "order": "ABBA",
    "first": 1,
    "rolls": [[3, 3], [2, 5]],
    "rng": 123456789
  }
}
```

`first` vaut `null` tant que le tirage est en attente, puis `0` ou `1`.
`rolls` conserve les paires de resultats successifs ; seules les precedentes
peuvent etre des egalites. `rng` appartient a un flux dedie initialise par
la graine du match et le suffixe `\0captains`. Le flux `state.rng` du combat
ne change pas pendant le tirage.

`start()` ouvre la phase `initiative`. `rollInitiative()` effectue et journalise
une paire de jets ; une victoire fixe `turn` et passe en `choose`.
`turn-order.js` expose `create`, `roll`, `sideAt`, `preview` et `validate`.
Le calcul de camp pour l'echange `r` est
`first XOR [0, 1, 1, 0][(r - 1) % 4]`.

`assertState()` verifie les faces D6, les egalites, le gagnant, la phase,
l'ordre du tour courant et les camps attaquants dans les evenements du match.
Le tirage n'ajoute aucun evenement de combat, aucune statistique et aucune
charge consommee. Son journal reste consultable dans le recapitulatif.

## Reprise et cycle de vie

Chaque paire de jets est persistee avant l'animation du resultat. Recharger
avant la decision reprend uniquement les capitaines. Une egalite deja stockee
reste stockee ; le prochain jet continue le flux. Apres la decision, aucun
tirage ne se repete, meme si la presentation etait encore visible au reload.

Passer ou Escape termine le tirage dans le moteur avant d'ouvrir le jeu.
Quitter la presentation conserve la phase en attente ; revenir la reprend.
L'IA attend la fin de la ceremonie avant de choisir une attaque.
Destruction et navigation liberent animations, attentes, observers et listeners.
Les deux vrais capitaines suivent le rectangle reel de leur carte sur resize.

La frise reserve 34 px sur telephone ; score et menu sont decales ensemble.
Reduced motion remplace les voyages et rotations par les etats fixes lisibles.
Les libelles accessibles distinguent le camp courant et chaque prochain camp.

## Limites preservees

Aucune modification de statistiques natives, regles de commandement, synergies, armes,
soutiens, restrictions de deck ou politique de choix de l'IA. Une meme carte
peut etre choisie pour les deux actions consecutives : aucune fatigue ajoutee.
L'analyse d'equilibrage precedente n'est pas une certification de cette release.

## Validation

```powershell
node --test --test-isolation=none V4/site/turn-order.test.cjs V4/site/lineup-intro.test.cjs
node V4/site/turn-order.browser.test.cjs
node V4/deploy/build.cjs
$env:KALISTAR_BUILT_SITE='1'
$env:KALISTAR_VERIFICATION_DIR='V4/site/verification/captains-abba/pages'
node V4/site/turn-order.browser.test.cjs
```

Le test navigateur utilise un profil et un IndexedDB QA isoles, jamais
la collection personnelle. Il couvre presentation complete, egalite, passage,
reprise, sortie, quatre transitions reelles, IA, resize, reduced motion,
320 x 568, 412 x 1007, 844 x 390 et preview Razr 50.
Les tests moteur jouent aussi 250 matchs complets avec restaurations periodiques.
