# Les cinq soldats de Froz
Production demandee le 13 octobre 2026 : varier les backgrounds puis creer les cartes.
IDs 49902401 a 49902405. Tous OKAMI, CRYO, faction Froz rouge/noire existante.
Aucun changement de regle, de famille d'arme, d'equipement ou de schema de sauvegarde.

## Direction artistique
Uniformes, visages, poses et armes approuves conserves. Quatre retouches
image_gen limitees aux decors, sources et prompts dans
../../propositions/2026-10-13-froz-backgrounds/.
Kaervan : porte de forteresse et brasier. Nyrska : foret gelee nocturne.
Vrold : plaine ouverte, illustration vrold-04 intacte avec bandouliere corrigee.
Saevra : escalier interieur de commandement. Drogan : pont militaire metallique.
Les anciens essais restent disponibles, sans les confondre avec les choix finaux.

## Profils
- Kaervan, P2/P3, hache : forte attaque, defense modeste, soutien physique D1.
- Nyrska, P2/P3, dagues : moins de pointe brute, trefle ATK D3 et esquive DEF D4.
- Vrold, P4, fusil : Mort ATK D5 remplace un gros chiffre ; esquive et reraise
  adverses restent applicables. Aucun tir garanti nouveau.
- Saevra, P3/P5, epee longue : plafonds P5, boost ATK D5 et trefle D3 ;
  donner un soutien remplace l'attaque du tour, ce n'est pas un cumul gratuit.
- Drogan, P1/P5, marteau et bouclier : plafonds P1, Garde ATK D4, deux barrieres.

Les faces sont rangees D6 vers D1 dans set.json. Chaque nombre respecte sa
fourchette de role. Magic/barriers designent les numeros de des, non les indices.
Boost physique et Garde : charges natives de 60 ; Retry ATK : un trefle ;
Retry DEF : relance. Barrieres Cryo : reduction native de 30 contre magie.
Leur lumiere d'armure n'introduit aucun bonus cache.
Ils peuvent former une ligne complete : Drogan P1, Kaervan P2, Nyrska P3,
Vrold P4, Saevra P5. Le deck de test ajoute les cinq gardes de Grivka pour
respecter la couverture de deux cartes par position et tester les deux factions.

Saevra est la premiere porteuse compatible du Sabre de Commandement existant
(restriction Job COMMANDANTE). Aucun objet ne lui est automatiquement attribue.
Le bonus natif est teste sur son vrai D6, sur les deux cotes, avec journal et
restauration ; son D4 magique ne declenche pas ce bonus. Le test courant des
armes sans porteur est actualise pour cette addition legitime au catalogue.

## Pipeline
build.cjs prepare, puis render avec KALISTAR_FROZ_FIVE_PS=2026-10-13,
verify, puis publish avec KALISTAR_FROZ_FIVE_PUBLISH=2026-10-13.
Le manifeste before.json fige les composants AVANT Photoshop. Aucun verrou
historique modifie. Native 897 x 1497, textes editables et objets dynamiques.
La composition ajuste proportionnellement l'illustration dans sa fenetre.
Le fanion Froz deja valide est reutilise sans modification.

## Verification
integration.test.cjs : 60 faces, journal, restauration, barrieres, consommation,
esquive contre Mort, synergies et 24 matchs complets ABBA sur les deux cotes.
Verification native : cadre fixe, texte, code-barres, reouverture PSD sans ecart.
browser.test.cjs : lecteurs desktop/412/320, duel, reload et migration d'une
sauvegarde precedant ces cinq cartes. Les preuves sont dans cards/ et la release.
