# Kalistar 4.7.18 - Astraball, postes uniques confirmes

## Decision auteur

Les 269 fiches de l'export Astraball-mes-choix-2026-10-26.json sont confirmees
explicitement dans la conversation, malgre les indicateurs draft/reviewed de
l'atelier. Source SHA-256 :
`54da83330e456a51bd7f1fba7fca5d19ad849d40d0d4995d626abc047783a3d3`.

Le registre athlete-choices.mjs reprend exactement chaque poste et vecteur de
statistiques : 49 changements de poste et 8 de statistiques par rapport a la
proposition initiale. Repartition : 57 Meneurs, 53 Scoreurs, 55 Middles,
53 Sentries et 51 Piliers. Le budget pondere reste 38 pour chacun ; cela ne
constitue pas une certification d'equilibre.

## Integration

- Un seul poste par personnage, identique pour toutes ses apparences.
- Vestiaire filtre, regles, fiches et validation moteur adaptes ensemble.
- Les 99 profils techniques sans choix auteur restent hors du vestiaire.
- Equipes initiales completes avec les nouveaux postes. Les preferences de
  prochains matchs conservent d'abord leurs choix compatibles, puis replacent
  les personnages deplaces quand leur poste est disponible.
- Snapshots de profils v2 pour les nouvelles rencontres ; les anciennes parties
  v1 gardent postes, statistiques, tours et score. Aucun reset de sauvegarde,
  changement de cle de stockage ou migration Supabase.
- Catalogue indisponible : message et reessai avant toute ecriture de partie.
- Aucun changement de regle de tir, de taille, de sprite ou du jeu de cartes.

## Verification

- Empreinte canonique des 269 choix et tests de poste unique, apparences,
  preferences, snapshots v1/v2 et poursuite d'une ancienne rencontre.
- Suite Astraball : 195 tests reussis.
- Suite CI complete : 104 invocations, 2 066 tests passes et 2 tests ignores
  explicitement. Suite locale : 14 invocations, 154 tests passes. Registre
  de la livraison precedente utilise sans inclure les brouillons Sprite V2.
- Navigateur PC, large, Razr, compact et paysage : aucun debordement ; les
  269 personnages sont selectionnes, demarres et recharges individuellement.
  Reprise v1 et erreur/reessai du catalogue sans alteration des sauvegardes.
- Build Cloudflare : 462 cartes, 1 967 fichiers, 1 142,5 Mio. Verification
  Collection, Decks, Story, arene et sauvegarde/reload sur PC et telephone.
- Audit moteur : 1 036 matchs, 259 623 commandes valides, 50 relectures
  deterministes. Il inclut les 99 profils techniques hors vestiaire.
- Sur 200 matchs des deux equipes initiales, camps inverses : Chroma gagne 66,
  Obsidienne 107, avec 27 nuls. C'est une mesure exploratoire de ces compositions
  et de cette IA, pas une preuve d'equilibre ; aucune valeur auteur corrigee.
- Preuves de livraison et captures locales : work/astraball/single-position/.

Le build fige est recontrole avant l'envoi a Cloudflare.
Le travail Sprite V2 des autres chats n'appartient pas a cette livraison.
