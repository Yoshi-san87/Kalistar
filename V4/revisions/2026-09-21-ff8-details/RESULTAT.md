# FF8 - Corrections publiees le 21 septembre 2026

Illustrations retouchees avec l'outil integre `image_gen`. Le cadre n'a pas
ete regenere. Les objets dynamiques d'illustration ont ete remplaces dans
des copies des PSD existants, controles puis publies.

| Carte | Correction | Fichiers actifs |
| --- | --- | --- |
| Linoa | Angelo noir et blanc, scene conservee | `../../collaborations/ff8-set-01/cards/linoa/` |
| Irvine | Visee relevee, canon droit et visible | `../../collaborations/ff8-set-01/cards/irvine/` |
| Laguna | Tenue militaire bleue, emotion et piano conserves | `../../collaborations/ff8-set-01/cards/laguna/` |
| Zell | Pantacourt couvrant les genoux, port de Balamb, pied degage du drapeau | `../../collaborations/ff8-set-01/cards/zell/` |
| Seifer | Bras croises, aucune epee visible | `../../collaborations/ff8-set-01/cards/seifer/` |
| Squall | Gunblade plus imposante sur l'epaule | `../../collaborations/ff8-set-01/cards/squall/` |

Chaque dossier contient `card.psd`, `card.png`, `illustration.png` et son profil.
Les copies publiees sous `V4/creations/<id>/` sont synchronisees. Les profils,
identifiants, textes, effets, valeurs et chemins du catalogue sont inchanges.
Les originaux restent sauvegardes dans les deux dossiers de revision.

## Prompts et preuves

- [Prompts des cinq cartes](prompts.json), [sorties generees](generation.json).
- [Dernier ajustement de Zell](zell-framing-prompt.json) et [source finale](zell-framing-generation.json).
- [Revision Squall](../2026-09-21-ff8-squall-sword/README.md), [prompt](../2026-09-21-ff8-squall-sword/prompt.json), [cadrage](../2026-09-21-ff8-squall-sword/framing-prompt.json).
- Les deux `transaction.json` ont l'etat `published`.
- Six cartes : zero pixel change hors illustration et avec illustration masquee;
  calques/textes/geometrie conserves; PSD rouvert identique au PNG; codes-barres valides.
- Preflight FF8 final : 12 reutilisees, zero ajout; catalogue et references proteges.
- 14 tests du helper et 37 tests catalogue/arenes/production reussis.
- Verification navigateur : ordinateur 1600 x 1000 et mobile 390 x 844,
  douze medias natifs, aucune erreur ni ressource absente.
- Verification serveur : 49 cartes, douze medias FF8 exacts, 24 matchs complets.
- Tests FF8 isoles du set reel deja publie : fixture corrigee sans modifier
  le moteur, le catalogue reel ou les fichiers de production.

[Vue du set](../../collaborations/ff8-set-01/set-preview.jpg).
La reception artistique reste a l'utilisateur; ces preuves ne la remplacent pas.
