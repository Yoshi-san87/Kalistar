# Kalistar 4.6.79 - Introduction anime

Film original de douze secondes apres un login email/mot de passe reussi :
Momo, Kaylis, Balmhyr, puis le logo approuve. Trois plans reellement animes,
musique originale, exports PC et telephone recadres separement. La DA anime
est reservee au trailer, aucune carte native n'est modifiee.

`Passer`, Echap et son optionnel ; Reduced Motion donne directement acces au
jeu. Reprise de session, reload et recuperation de mot de passe ne relancent
pas le film. Le lecteur a des sorties en cas d'erreur reseau/decodage, de
blocage ou de passage en arriere-plan. Le mot de passe est efface avant le film.

Les MP4 et posters restent prives dans le Worker. Les originaux sont sauvegardes
hors checkout ; Git ne recoit que code, prompts, documentation et SHA-256.
Pas de modification de collection, sauvegarde, moteur, acces ou abonnement.
Runway : 144 credits video + 4 credits musique, aucun achat par l'assistant.

## Validation

Preflight : 21 tests purs/media/Worker passes, lecture reelle de douze secondes
PC et Razr, captures aux trois personnages et au titre. Compact 320 px,
paysage, son, skip, resize, Reduced Motion, erreurs et autoplay refuse passes.
Login/SDK/Worker passes sur cinq formats avec comptes factices : refus,
autorisation, cookie avant film, mot de passe efface, reload, reprise automatique,
deconnexion, distinction Paris/Tokyo et conservation du stockage local.

Validation generale : 91 groupes CI termines, 1 437 tests, zero echec et un
skip historique ; 13 groupes locaux termines, 119 tests sans echec. Le controle
d'organisation passe apres staging explicite. Le premier essai CI utilisait
le Node systeme sans marked ; il a ete relance avec le runtime configure,
sans modification des tests ou des verrous.

Les MP4 sont entierement decodables : 288 images par coupe, AAC present,
pas de saturation audio, metadonnees fast-start avant les images. Les 13 medias
source/runtime correspondent aux sauvegardes hors checkout par SHA-256.
Le build exact fige est teste avant l'envoi Cloudflare. Preuves locales :
`work/qa/login-intro/`. Aucun compte personnel automatise.

## References

- [Contrat du lecteur](../../docs/INTRO_CONNEXION.md)
- [Sources et montage](../../revisions/2026-10-16-login-cinematic/README.md)
- [Generation et cout](../../revisions/2026-10-16-login-cinematic/generation.json)
