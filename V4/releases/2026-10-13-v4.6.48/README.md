# Kalistar 4.6.48
General BaroK, nouvelle carte originale approuvee : 49902501.
Froz / Okami / Cryo / Katana / P1 ; une Mort sur ATK D5.
Ceinture lumineuse ajoutee a l'illustration approuvee, sans bonus cache.

## Publication coordonnee
Apres v4.6.47, accord A Generator et M Generator. Scope additif :
une creation, son illustration et ses preuves natives, catalogue, test
de roster Okami, test d'integration branche au workflow Pages, version.
Aucun changement moteur, IA, equipements, anciennes cartes ou sauvegardes.

Les deux drivers browser.test et weapons.browser.test portaient encore
les assertions 4.6.45 dans HEAD 4.6.47 ; elles passent aussi a 4.6.48.
Leurs versions de depart sont explicites dans release.json.

## Verification
Cadre fixe sans difference, PSD reouvert identique, code-barres valide.
Douze faces, barrieres Cryo, matrice Katana, Mort/Esquive/Reraise,
relance Kalistel, sauvegardes et douze matchs complets verifies.
QA complete du snapshot stage et controles navigateur dans qa/.
La suite est extraite du workflow courant ; aucun ancien rapport modifie.

Resultat final : 78 commandes Pages reussies, 1148 tests ; build de 363 cartes,
1318 fichiers, 865.3 MiB. Aucun echec de test dans ce snapshot.
Le driver navigateur normalise le chemin Windows du dist avant le serveur QA ;
la premiere tentative avait retourne 404 pour un separateur de chemin non
normalise, sans erreur du site. Le meme build a ensuite passe les controles
1440x1000, 412x915 et 320x740, Collection, Mort en arene et reprise de match.
La migration de sauvegarde passe de 362 a 363 cartes sans retrait d'exemplaire.
Les captures, hash du driver et hash du build sont dans qa/browser/.
