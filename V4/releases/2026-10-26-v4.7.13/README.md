# Kalistar 4.7.13 - Tirs Astraball assures

## Changement demande

Un tir legal a portee, sans adversaire sur la trajectoire, marque toujours.
Suppression du jet aleatoire et de sa branche de rebond. TIR conserve son role
de portee : `2 + floor(TIR / 2)`. Distance Manhattan, trois cibles, interceptions
supercover (coins inclus), points, Piliers et capacite defensive inchanges.
Une interception donne toujours le ballon au premier adversaire traverse.
La charge conserve sa formule FOR/DEF et son tirage aleatoire.

Le moteur, la previsualisation et l'IA partagent la meme decision. L'interface
annonce "Tir assure" ; les regles et le descriptif de TIR sont actualises.
Aucun bonus cache pour le joueur ou l'IA. Aucun nouveau media ou effet GPU.

La demande s'applique aux prochaines actions des rencontres nouvelles et reprises.
Scores, positions, activations, penalites, stats individuelles, RNG sauvegarde
et historique ne sont pas recalcules. Les anciens rates restent lisibles.
Le prochain tir libre ne consomme plus de RNG ; les charges suivantes utilisent
desormais ce flux sans tirage intermediaire pour les tirs. Pas de reset, changement
de cle/schema de sauvegarde, migration Supabase ou modification du jeu de cartes.

## Verification

- Suite Astraball : 179 tests reussis, dont 1 728 tirs libres garantis aux deux
  extremites de portee, deux camps, trois cibles et neuf valeurs TIR representatives.
- Interceptions par chacun des cinq postes, coequipier sur la ligne, cible hors
  portee, victoire, replacement, reprise et conservation des anciens evenements.
- L'ancien test de reprise IA est corrige pour accepter aussi les plans de
  placement apres but (jusqu'a 11 commandes), pas seulement mouvement/action.
- Copie texte seule sans images : 179 tests reussis. Medias exclus de Git.
- 120 matchs IA completes, 28 793 commandes, 628 tirs libres et 628 buts.
  69 fins au score, 51 a la limite de manches ; moyenne 10,14 manches.
  66 victoires Chroma, 40 Obsidienne, 14 nuls. Ce controle technique ne prouve
  pas un equilibrage competitif. L'IA evite les tirs bloques ; les interceptions
  sont donc verifiees par les scenarios diriges, pas par ces 120 matchs.
- Interface Chrome : PC 1440x900, large 1920x1080, Razr 412x915, compact 360x800,
  paysage 915x412 ; tir assure en limite de portee, hors-portee desactive,
  score, RNG stable et recharge identique. Captures inspectees PC/Razr.
- Animation normale, Reduced Motion, pause popup/onglet masque, replacement,
  isolation par profil et ballon/camera conserves par la regression navigateur.
- Suite CI complete : 104 invocations, 2 050 tests reussis, 2 ignores, aucun echec.
- Suite locale complete : 154 tests reussis. Les tests de serveurs localhost ont
  necessite une relance hors sandbox (EACCES initial), sans autre modification.

Commandes reproductibles depuis la racine :

```sh
node --test V4/astraball/tests/astraball.test.cjs
node V4/astraball/tests/simulation.mjs --games 120 --out work/astraball/clear-shots/simulation.json
node maintenance/validate.cjs --suite ci
node maintenance/validate.cjs --suite local
node V4/astraball/tests/interface.browser.test.cjs
node maintenance/check-organisation.cjs
```

Les journaux, captures, simulation et preuves de publication restent dans
`work/astraball/clear-shots/`. Tester aussi le commit fige via `KALISTAR_DIST`
avant envoi Cloudflare. Publication reservee/coordonnee avec le chantier sprites
suivant ; aucun de ses fichiers ou brouillons n'est inclus.
