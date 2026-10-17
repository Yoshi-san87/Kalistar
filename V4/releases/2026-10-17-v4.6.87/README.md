# Kalistar 4.6.87

## Perimetre

- Cristal de marque rainbow plus eclatant et strictement vertical. Le logo
  conserve son lettrage, son cuivre et tous les pixels hors de l'insert du bijou.
  Les surfaces HTML de connexion, navigation, accueil, commandes et Arene
  utilisent des assets versionnes. Les cristaux elementaires des cartes natives
  et le logo deja incruste dans le film approuve restent inchanges.
- Cinq propositions locales de dos, sans selection ni remplacement du dos en jeu.
  Galerie : `V4/propositions/2026-10-17-card-backs/index.html`.
- Aucun changement de gameplay, de progression ou de base de donnees dans
  cette publication. Les parcours Fragment existants sont conserves.

Les details graphiques sont documentes dans
[la revision du cristal](../../revisions/2026-10-17-rainbow-brand/README.md).

## Sources Et Sauvegarde

Les nouvelles images restent a leurs chemins locaux ; Git ne contient que les
scripts, textes, plans et empreintes. Deux medias runtime sont ajoutes au
registre : `logo-rainbow-v2.webp` et `kalistel-rainbow-v2.webp`. Le logo original
V3, les sources natives et les cinq dos sont preserves.

La sauvegarde personnelle hors checkout contient les sources generees, les
originaux, les exports et leur manifeste SHA-256 :
`sauvegardes-personnelles/creation/2026-10-17-rainbow-brand-card-backs/`.
Le controle d'export trouve zero changement visible hors de chaque bijou.

## Verification

Node.js fourni par le runtime du poste, avec Sharp, Playwright et marked.
Les profils navigateur et PostgreSQL de validation sont jetables ; aucun
compte joueur personnel n'est utilise par les tests.

- Suite locale : 13 invocations reussies.
- Navigateur general : 434 cartes, PC/phone, Collection, lecture, export PNG,
  Decks, Arene, sauvegarde/reload et publication additive verifies.
- Marque : connexion, accueil, cinq dos, agrandissement et fermeture clavier,
  sans debordement ni erreur JavaScript, en PC et Razr 412 x 1007.
- Suite CI complete du perimetre visuel : 93 invocations reussies, journal
  `work/qa/rainbow-brand/ci-brand-only.log`. Aucun seuil ni ancien test modifie.
- Suite locale finale : 13 invocations reussies dans `local-brand-only.log`.
- Suite repository : 105 tests reussis ; controle d'organisation et diff stage
  sans erreur.
- Build Cloudflare : 434 cartes, 1492 fichiers, 1051,7 Mio. La sortie du commit
  fige doit repasser les tests navigateur general et marque avant l'envoi ;
  preuves sous `work/qa/rainbow-brand/frozen-*` et `live/`.

Les preuves repetees restent sous `work/qa/rainbow-brand/`, pas dans les anciens
rapports valides. Une premiere execution avec le Node systeme ne trouvait pas
marked ; la validation utilise le runtime configure. Le build standard depassait
le budget statique historique : le build Cloudflare utilise `CF_PAGES=1`, sans
assouplir aucun seuil. Une execution CI intermediaire a rencontre les plans
Fragment pendant leur regeneration ; elle est relancee apres stabilisation.

## Publication

Le jeu cible reste `https://kalistar.pages.dev/jeu/`, projet personnel `kalistar`.
Le commit et son tag `v4.6.87` sont destines au depot `Yoshi-san87/Kalistar`.
La publication utilise le build fige de ce commit, jamais le checkout mutable.

Le schema du registre reste 9. Aucune migration Supabase n'est necessaire pour
le nouveau logo. L'acces personnel au navigateur ne repondait pas pendant cette
session ; aucun compte ou etat distant n'a ete modifie.

## Chantier Fragment Non Publie

La recherche de decks progressifs a ete conservee hors de cette livraison :
`work/changes/2026-10-17-fragment-difficulty/`, avec le patch complet, les plans,
les tests et les mesures. La selection utilise 434 modeles approuves et le vrai
moteur, sans modifier les cartes. La version experimentale 6 progresse en
moyenne, mais echoue encore a deux criteres hors selection : un palier 3 de
Balmhyr moins fort que son palier 2 dans un panel, et une ouverture Balmhyr a
14 victoires sur 144 dans un autre, sous la borne de 10 %.

Les assertions n'ont pas ete abaissees pour publier. Le code experimental,
la nouvelle edition et sa migration 011 ne font pas partie de ce commit. Le
parcours existant, ses rencontres et ses victoires restent donc inchanges.
Les echecs sont conserves dans `work/qa/rainbow-brand/ci-final.log` et
`work/qa/rainbow-brand/ci-release.log`, distincts des tests du perimetre livre.
