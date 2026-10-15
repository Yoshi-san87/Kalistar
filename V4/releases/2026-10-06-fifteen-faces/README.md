# Kalistar 4.5.32 - Quinze nouveaux visages

Succede a 4.5.31. Publication personnelle sur Yoshi-san87/Kalistar.

## Contenu

15 nouvelles cartes natives et jouables : Oskara, Nell, Sareth, Daska, Orel,
Dame Ysane, Sivel, Maudre, Nacre, Bex, Hadruk, Sovan, Ombrine, Pelag, Vaume.
Catalogue : 230 cartes. Aucun ancien modele retire ou remplace.

Retouches demandees : fond de Bex simplifie, bottes Hydro de Pelag,
miroir gauche/droite de Vaume et nom Dame Ysane. Sareth conserve sa peinture,
verifiee face aux references de direction artistique. Les cinq propositions
refusees ne sont pas integrees. Les illustrations et PSD restent disponibles.

## Verification

- 15 cadres natifs inchanges, 15 PSD reouverts identiques, 15 codes-barres lus.
- Toutes les faces : 90 ATK et 90 DEF, effets, magie, barrieres et sauvegardes.
- 24 matchs ABBA complets avec les deux equipes, remplacements et reprises.
- Tests de mutation des regles et de la typographie des noms accentues.
- Chrome isole : les 15 cartes recherchables ; cinq lecteurs verifies a
  1440, 412 et 320 px ; deux compositions en arene PC/mobile et reload.
- Aucune erreur JavaScript ou requete HTTP echouee dans ces controles.

Le test des sauvegardes Rhinoz historiques cible maintenant explicitement
Belrog, Nazar et Gilmarr au lieu de supposer que tout futur Rhinoz partage
leurs faces (magie et garde D2). Daska et Hadruk conservent leurs propres
familles et effets ; un test specifique verifie leur incompatibilite avec
la hache collective. Aucun comportement du moteur n'est modifie.

La note de production et la justification des profils sont dans
`V4/expansions/2026-10-06-fifteen-faces/README.md`.
Les anciennes sources, manifestes de reference et sauvegardes navigateur
ne sont pas modifiees. Les changements locaux exterieurs au lot sont exclus.

Les 237 tests du workflow et la construction GitHub Pages passent sur l'arbre
isole `2323cead3c12a6015cf96b21a894f49f7e15e51a`, issu de la base 4.5.31.
Le build contient 727 fichiers runtime. Le navigateur de cette sortie exacte
passe les trois largeurs, les lecteurs et les deux compositions d'arene.
La regression navigateur generale passe egalement : 230 cartes, Collection,
Carnet, telechargement PNG, Decks, Arene, reprise de partie et publication
additive, sans erreur JavaScript/HTTP et sans interface Atelier exposee.
Resultats : `workflow-results.json` et les preuves du lot.
Apres cet instantane, seuls les rapports et captures sont actualises.
La verification publique est effectuee par `public-check.cjs` apres Pages.

Deux blancs de fin de fichier sont conserves dans les sources preparees
(`model.cjs` et `select-art.cjs`) ; le premier fait partie du manifest fige.
Ils n'affectent ni l'execution ni les rendus et ne justifient pas de refreeze.
