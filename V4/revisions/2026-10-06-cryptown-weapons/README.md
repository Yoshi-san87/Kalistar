# Armes Cryptown

Trois objets inspires directement des images approuvees de Varkhen, Nereth
et Draust, disponibles pour toute la faction Cryptown, sans restriction de job.

| Carte | Objet | Activation | Bonus |
| --- | --- | --- | --- |
| ARM-030, Le Serment sans Visage | Epee de Varkhen | Moins de combattants actifs que l'adversaire | +20 ATK |
| ARM-031, La Releve Muette | Fusil de Nereth | Aucune carte en reserve | +20 ATK |
| ARM-032, Le Glas des Veilleurs | Fleau de Draust | Deux combattants actifs ou moins | +20 DEF |

Ces trois effets utilisent les conditions declaratives existantes. Aucun
changement du moteur, de la matrice d'armes ou du schema des sauvegardes.
Les snapshots de parties anciennes restent autonomes. Un seul emplacement
d'arme, pas de bonus numerique sur Mort ou Garde, pas de double attaque.
Les +20 conditionnels sont prudents ; ils ne garantissent pas un equilibrage
competitif sans retours de parties.

## Images

Generation avec l'outil image_gen integre : detourages transparents,
illustrations en situation et anneaux personnalisables independants.
Prompts complets et sources : ../../weapon-cards/cryptown-prompts-2026-10-06.json.
Les personnages natifs et le cadre valide sont preserves.

L'epee emploie la scene v2, generee avec plus de recul apres controle
visuel du cadre reel. La scene v1 tronquait la pointe et n'est pas publiee.
Les trois exports de carte entiere sont dans layout/.

## Verification

- Six tests specifiques, dont 42 duels numeriques (7 editions x 3 armes x 2 camps).
- Restriction de faction exacte, tous jobs, remplacement et anciennes saves.
- Mort de Nereth, Esquive et Reraise preservees ; Garde Varkhen/Draust inchangee.
- Arsenal complet, regles d'equipement, composition et presentation.
- 44 controles de layout : 32 cartes et six tailles pour galerie/fiche.
- Neuf parcours navigateur : trois armes x desktop, Razr 50, compact Reduced Motion.
- Equiper, remplacer, retirer, reload, deck, vrai bonus, journal et inspection.
- Carte adverse, challenger, resize, rotation et alignement natif sous 1,3 px.

Les tests navigateur utilisent des comptes et bases QA jetables et ne
touchent pas le profil personnel. Captures dans browser/ et layout/.
