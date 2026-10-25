# Kalistar 4.7.0 - Astraball

Premiere exhibition jouable de sport tactique, isolee du jeu de cartes.
Passage a la version 4.7.0 demande explicitement par l'utilisateur.

## Perimetre

- Entree Astraball dans le menu commun et route `/jeu/astraball/`.
- Terrain peint original, projection oblique, grille logique 13 x 7 et deux U
  de trois cibles ; dix portraits issus des cartes approuvees, non modifies.
- Solo contre IA et deux joueurs sur le meme ecran ; cinq postes par equipe.
- Initiative par VIT, deplacement par MOB, passes et interceptions sur la ligne,
  charges avec recul/retard, tirs avec probabilite lisible, Scoreur a deux points.
- Premier a six points ou douze manches, replacement apres but, fin de match.
- Animations finies, sons optionnels, Reduced Motion, camera tactile et clavier.
- Connexion Kalistar conservee ; sauvegarde locale Astraball par profil.
- Aucun changement SQL, collection, recompense, Fragment, stat ou sauvegarde
  du jeu de cartes. Pas d'appel au serveur de progression Astraball.

## Structure

Le [guide Astraball](../../astraball/README.md) decrit les fichiers et les regles.
Moteur pur, donnees, projection, scene PixiJS et commandes HTML sont separes.
PixiJS 8.22.0 avec bundle CSP est prefere a Godot pour cette tranche web.
La liste runtime explicite exclut outils, tests, prompt, sources et source maps.
Les modules sont versionnes dans le build et la preparation du commit fige.

## Verification Locale

- Suite `ci` complete : 103 invocations, reussie. Deux cas optionnels restent
  ignores par leur configuration existante (comparaison exhaustive Fragment
  et ancien navigateur Reliques) ; ils ne sont pas annonces comme executes.
- Suite `local` complete reussie, dont PostgreSQL jetable, droits serveur,
  unicite, transferts, archives et restauration de sauvegarde.
- Astraball : 84 tests passes (regles, IA, projection, manifest, routes,
  empreintes, isolation du build et sauvegardes).
- 120 simulations IA : 25 060 commandes valides, 13 651 activations,
  461 buts, tous les matchs termines ; trois relectures identiques par graine.
- Navigateur : 1440 x 900, 1920 x 1080, 412 x 915, 360 x 800, 915 x 412.
  Aucun debordement de page, canvas non vide, icones chargees, zero erreur.
- Mouvement/reload, interception annoncee puis resolue, charge animee,
  tir a deux points, victoire et profils factices separes verifies.
- Le rendu s'arrete au repos : zero dessin sur la fenetre de 800 ms mesuree
  avec Reduced Motion. Ce n'est pas une certification de FPS sur tous les GPU.
- Regression du site construit : 462 cartes, lecteur, telechargement PNG,
  Decks, Arene, sauvegarde/reload et film de connexion reussis sur PC/phone.

Les preuves locales sont dans `work/astraball/`. Un premier lancement de la
suite locale a rencontre un catalogue absent pendant la reconstruction du
build ; la suite entiere a ete relancee apres le build et a reussi.
Un blocage des textures par la CSP a ete corrige via le bundle officiel sans
eval et le chargement sans worker blob ; les tests incluent cette politique.

## Medias Et Publication

Treize medias runtime supplementaires, environ 1,38 Mo decimaux. Aucun binaire
ajoute a Git ni LFS. Peinture native, prompt, provenance et exports sauvegardes
hors checkout dans `Documents/Sauvegardes-Kalistar/2026-10-25-astraball/` :
16 fichiers, 4 782 133 octets, copie verifiee par SHA-256.

Publication prevue depuis le commit exact et son tag annote `v4.7.0`, dans le
projet personnel Cloudflare existant `kalistar`. Le build fige doit repasser
les tests navigateur Kalistar et Astraball avant envoi. Le controle public
verifie ensuite le login, les refus anonymes et la version servie.
Ces etapes sont attestees par `publication.json` et les preuves sous `work/`,
pas par une reconstruction contenant les autres brouillons du poste.

## Limites Assumees

Une arene et deux equipes fixes. Les personnages sont des pions illustres,
pas des sprites de corps complet. Pas de multijoueur en ligne, classement,
recompenses, synchronisation cloud ou replay du dernier tir.

L'IA a gagne 35 matchs avec Chroma et 61 avec Obsidienne, avec 24 nuls :
ces simulations ne prouvent pas l'equilibrage ni le plaisir humain. La prochaine
etape est une session de jeu, puis l'ajustement des placements/statistiques et
de l'IA avant toute ambition competitive.
