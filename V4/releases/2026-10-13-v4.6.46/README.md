# Kalistar 4.6.46 - Cinq adversaires

## Livraison

- Kael, La Lance : assaut et eliminations fiables.
- Maelis, Le Rempart : menaces prioritaires et protection.
- Nox, Le Briseur : capitaines, soutiens et synergies.
- Lyra, La Tisseuse : dons utiles et ultimes.
- Soren, Le Stratege : adaptation et economie des ressources.

Selection dans la preparation, distincte de la cohesion du deck et de l'arene.
Preference pour le prochain match et profil fige dans la rencontre sauvegardee.
Nom utilise en initiative, arene, bilan et ceremonie. Duel local sans selection
IA ; les parties historiques conservent Le Veilleur.

Evaluation des faces via les vraies actions du moteur, sans lecture des des
futurs, sans modification de carte, de bonus ou de regle. Reflexion cooperative
et annulable pour conserver une interface reactive. Documentation et Library
actualisees. Version desktop/mobile et assertions passees a 4.6.46.

## Verification

- 353 tests moteur, IA, equipements, ultimes, initiative, composition, matchmaking,
  preparation et Library : passes.
- 200 matchs natifs compares a l'IA historique, 122 victoires, aucun blocage,
  33 591 validations d'etat et reprise apres chaque resultat.
- 7 assertions du build Pages : passees.
- Build : 362 cartes, 1 318 fichiers, environ 864 MiB, sans nouvel asset lourd.
- Preparation complete et 5 profils testes sur desktop 1440x1000, Razr 412x1007
  et compact 320x568 Reduced Motion. Lancement du vrai tour IA, reprise du
  profil et frames rendues pendant la reflexion verifies.
- Regression navigateur Pages : Collection, lecteur, telechargement PNG,
  Decks, Arene, sauvegarde et publication additive valides, aucune erreur HTTP
  ou JavaScript, aucun Atelier public.

Resultats et captures :
[`../../revisions/2026-10-13-ai-opponents/`](../../revisions/2026-10-13-ai-opponents/README.md).
Contrat : [`../../docs/ADVERSAIRES_IA.md`](../../docs/ADVERSAIRES_IA.md).

Les taux du panel vont de 57,5 a 65 % contre l'ancien adversaire. Ce petit
echantillon riche en reliques ne prouve ni une hierarchie definitive des cinq
profils ni une invincibilite. La recherche reste limitee au duel courant,
avec une valeur estimee des ressources futures, pas un solveur de partie.

Publication cible : `Yoshi-san87/Kalistar`, branche `main`, tag annote `v4.6.46`.
Les changements natifs/PSD/LFS preexistants, la Map, les sources Froz et l'audit
1000 matchs precedent restent hors de ce commit.
