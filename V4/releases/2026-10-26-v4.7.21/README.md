# Kalistar 4.7.21 - Portabilite des controles Sprite V2

## Perimetre

Correctif de la [4.7.20](../2026-10-26-v4.7.20/README.md). Son premier
controle GitHub a echoue : les validateurs chargeaient Sharp des leur import,
et les tests de quantification d'images etaient inscrits par erreur dans la
suite repository sans dependances natives. La validation complete du PC,
avec Sharp disponible, ne reproduisait pas ce defaut.

Le chargement des outils d'image est maintenant differe jusqu'au traitement
effectif des pixels. Le controle de geometrie et la palette deja conforme
fonctionnent sans Sharp. Les tests de quantification sont conserves sans
assouplissement dans la suite native du PC ; un test de portabilite isole
verifie les contrats sans bibliotheque native, y compris les reperes source.

Pas de modification de gameplay, de sauvegarde, d'atlas, de source graphique
ou de verrou. Malaba reste a 205 cm. Les 170 identites Sprite V2 restent en
review locale et la production reste arretee. Les autres travaux locaux
ne sont pas inclus. Version PC/mobile/Astraball et assertions : 4.7.21.

## Verification

- Suite repository sans dependances natives : 489 tests reussis.
- Suite complete : 105 invocations, 2 280 tests reussis, deux optionnels
  ignores, aucun echec. Les tests de quantification natifs sont tous conserves.
- Suite locale : 154 tests reussis, aucun echec ou test ignore.
- Build Cloudflare : 462 cartes, 1 968 fichiers, 1 142,6 Mio.
- Navigateur PC/phone : Collection, lecteur, PNG, decks, arene et reprise
  de partie reussis ; captures inspectees, sans erreur HTTP ou JavaScript.
- Organisation et diff stage controles ; aucun binaire ajoute.

Les journaux du correctif sont conserves dans
work/publication/sprite-v2-4.7.21/. Le build du commit exact reste a verifier
avant son envoi. Aucun ancien rapport n'est reecrit pour effacer l'echec
GitHub de la 4.7.20.

## Publication

L'utilisateur a explicitement autorise le push puis la mise en ligne sur
kalistar.pages.dev. Cette version corrigee remplace la preparation 4.7.20,
sans changement d'origine, de compte Cloudflare ou de donnees personnelles.
Le commit exact doit etre construit par prepare:release, puis teste avant
son envoi au projet personnel existant kalistar.
