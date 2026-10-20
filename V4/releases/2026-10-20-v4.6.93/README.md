# Kalistar 4.6.93 - Menus communs et accueil responsive

## Changements

- Fragment utilise le cristal rainbow approuve dans le menu general et dans
  le retour de parcours en arene. Aucun nouveau media, aucun changement natif.
- Les deux menus utilisent les memes lignes illustrees, titres de groupes,
  surfaces, bordures, survols et focus clavier. Les commandes Combat viennent
  avant Partie et Explorer ; leurs actions et restrictions restent inchangees.
- Sur telephone et PC, l'entete et la fermeture restent fixes dans la popup.
  Seul son contenu defile ; Retour, Echap, focus et zones de securite restent
  compatibles. Les details de duel quittent proprement l'habillage de menu.
- L'accueil couvre la hauteur disponible sur PC, sans bande vide en bas.
  Les cartes grandissent avec la hauteur disponible, jusqu'a 720 px, et les
  raccourcis sont repartis sur une largeur plus confortable. Les textes ne
  sont pas agrandis en fonction de la largeur de l'ecran.
- Le cadrage mobile, le carrousel borne a huit cartes, sa suspension derriere
  une popup et Reduced Motion sont conserves. Aucune boucle d'animation ajoutee.

## Perimetre

Pas de changement des regles, collections, moteurs, schemas de sauvegarde,
comptes Supabase, droits ou progression Fragment. Aucune donnee personnelle
utilisee pour les tests. Le chantier Map Ctrl+molette est un lot distinct et
n'est pas inclus dans cette version.

## Verification

- `navigation.test.cjs` et `home-screen.test.cjs` : 16 tests passes.
- `home-screen.browser.test.cjs` : 12 profils, de 320 px a 3440 px ; captures,
  hauteur occupee, carte entiere, noms longs, tactile, clavier, retour, pause,
  reprise, navigation et rechargement.
- `menu-navigation.browser.test.cjs` : PC, Razr avec safe areas, compact,
  paysage et Reduced Motion ; comparaison du style des deux menus, cristal,
  commandes, defilement interne, Retour/Echap, focus, details de duel et
  sauvegarde inchangee. Le contexte Fragment utilise un apercu jetable.
- `V4/deploy/browser.test.cjs` : 444 cartes, PC/telephone, lecture,
  telechargement PNG, Decks, Arene et reprise de partie.
- `arena-viewport.browser.test.cjs` : 8 profils, 66 captures, plateau contenu,
  sortie accessible, parcours Fragment, fin de partie et aucune erreur.
- Suite locale : 13 groupes, 129 tests passes. Suite repository : 111 tests
  passes. Le controle d'organisation et le diff stage ne signalent rien.
- Suite CI complete : 96 groupes, 1 498 tests passes, aucun echec et un test
  historique ignore (inchangé).

Un premier passage a signale deux assertions de version restees en 4.6.92 :
elles ont ete avancees avec le titre en 4.6.93, sans toucher aux references.
Chrome ne pouvait pas joindre le serveur de test dans le bac a sable ; le
test a ensuite passe avec l'autorisation d'acces au serveur local jetable.

Preuves locales dans `work/qa/menu-home-20261020/` (non publiees dans Git).
La publication utilise le build fige du commit, le registre de medias existant
et le projet Cloudflare personnel `kalistar`. Aucun media ajoute ni forfait
modifie. Le test public verifie uniquement le login anonyme, sans compte reel.
