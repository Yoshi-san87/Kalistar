# Kalistar 4.7.17 - Roulette de cibles et deplacement confirme

## Interface

- Passe et charge : les actions deviennent les tetes des cibles accessibles,
  issues des sprites existants. Selection, confirmation et retour restent dans
  la roulette, sans bandeau de commandes supplementaire.
- Tir : trois buts en U, dont le point gauche, central ou droit est allume.
  Les reperes se lisent face au but adverse, pour les deux equipes.
  Les tirs hors de portee sont desactives ; une interception reste signalee.
- Deplacement : le survol trace le chemin exact du moteur, avec ses detours.
  Le clic fixe une destination sans mutation ; la coche execute le mouvement.
  Autre case pour changer de destination, retour/Echap pour annuler.
- La roulette conserve des cibles de 44 px et se retourne pres des bords.
  Navigation clavier et tactile, Reduced Motion, zoom et deux vues conserves.
  Aucun nouveau media, rendu permanent ou effet GPU lourd.

`action-options.mjs` adapte les lectures du moteur, sans modifier ses regles.
Les sauvegardes, l'IA, les profils, les recompenses et Supabase sont inchanges.
L'aide et le README Astraball decrivent le nouveau parcours.

## Verification

Tests portables : 187 reussis, dont chemins moteur/previsualisation identiques,
absence de mutation, cibles legales et disposition de 0 a 5 boutons.
Interface : PC 1440/1920, Razr 412, compact 360 et paysage 915 ; cibles,
confirmation/annulation, clavier, sauvegarde/reload, ballons et vues, tirs,
interceptions, charges, animations et isolation des profils.
Sur cette machine : 4 rendus d'idle sur 800 ms, 84 pour le deplacement anime
teste, aucun rendu d'idle en Reduced Motion. Ce ne sont pas des garanties
de performance pour tous les appareils.

Les anciens selecteurs de test bases sur les libelles U1/U2/U3 et "Kaylis x"
sont remplaces par les nouvelles cibles semantiques. Le test camera choisit
des points degages avec marge de 5 px pour la souris et pour les deux doigts
du pincement : il ne doit pas commencer son geste sur un bouton de la roulette.
Les gestes restent natifs et les assertions de camera ne sont pas reduites.
Un premier essai de placement a utilise l'ancien dist local ; le controle de
livraison doit utiliser le commit fige de cette version.

Les suites CI et locale utilisent le registre publie, sans les brouillons
Sprite V2 du chat voisin. Les nouveaux tests sont importes par l'entree
Astraball existante, sans modifier ce registre partage.
Resultats complets : CI, 104 invocations, 2 058 tests reussis et 2 ignores ;
local, 14 invocations, 154 tests reussis. Aucun echec. Le clone texte seul
reussit aussi les 187 tests Astraball ; camera et 22 captures d'arenes valides.
Journaux et captures : work/astraball/wheel-targets/ (ignores par Git).
Avant mise en ligne, verifier la sortie du commit exact, puis le workflow
GitHub, le login anonyme et le token de version Cloudflare. Le rapport
publication-proof.json de ce dossier de travail conserve les preuves finales.
Navigateurs jetables uniquement ; Razr emule, aucun compte reel modifie.
