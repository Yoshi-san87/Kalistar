# Kalistar 4.7.32

## Duel et son

- Musique inchangee ; bruitages calibres et attenues, preferences preservees.
- Fin des superpositions de preparatifs a l'impact ; bouclier secondaire plus bas.
- Kalistel dans l'action centrale, annonces par personnage et Poursuivre le combat.
- Soutiens et equipements temporairement eclaires dans la penombre du duel.
- Dissipation de la vraie carte par element/famille d'arme, son original dedie.
- Horloge partagee, canvas local borne et nettoyage sur abort/resize/navigation.
- Reduced Motion : fondu bref, sans fragmentation.

[Provenance et preparation du son](../../revisions/2026-11-20-arena-direction/README.md).
Deux credits Runway existants utilises, aucun achat.
Nouveau media web : 25 956 octets ; aucune nouvelle illustration lourde.

## Verification

Avant preparation : 107 invocations CI et 14 invocations locales passees.
Les 19 controles unitaires cibles passent, dont 25 matchs du moteur compares
avant/apres et une Mort garantie. Reglages du compte : cinq formats.
Musique native : trois formats. Invitations, menu et IA : quatre formats.
Arene : cinq formats, canvas non vide, soutien eclaire, nettoyage, Reduced
Motion et elimination du vrai bouton confirmee avant sauvegarde du resultat.

Preuves de travail sous `work/qa/arena-living/`, `work/qa/official-score/`
et `work/qa/arena-prompts/`. Le build fige issu du commit doit repasser
les tests de deploiement et d'arene avant son envoi a Cloudflare.

Aucun changement de moteur, regles, cartes natives, droits, base de donnees
ou schema de sauvegarde. Aucun reset de donnees personnelles.
