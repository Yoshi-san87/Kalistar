# Kalistar 4.7.26 - La voix ecrite de Momo

Le Gaming Book de Momo reprend l'ecriture lettre par lettre validee dans le
prototype local r8 : courtes respirations aux virgules, points et retours a la
ligne. La phrase complete reserve sa place des le debut, sans saut de mots.
Un clic, toucher, Entree ou Espace revele le reste ; le suivant avance lorsque
le geste scenaristique est termine. Un double clic ne saute pas une page.

Le lecteur commence apres son chargement, suspend son unique minuteur en pause
ou en arriere-plan et le supprime a la fermeture. Reduced Motion affiche la
phrase entiere. Le texte accessible est annonce en une fois. Les reglages de
rythme sont dans gaming-book/momo/scene.json ; aucun son de clavier ajoute.

Portage cible : integration host, marque-pages par compte, validation des
messages, carte finale et attribution serveur conserves. Aucun schema SQL,
regle de combat, nouveau media, changement de recompense ou reset. Le prototype
work/rpg-momo-casse reste independant. Les autres retouches locales d'animation
ne sont pas incluses dans ce portage de narration.

La retouche narrative demandee avant publication conserve les etapes et leurs
revelations : incomprehension au reveil, attente puis abandon, curiosite douce
devant la flute. L'abandon assombrit le decor jusqu'a 72 %, en gardant Momo
visible. Les phrases s'effacent quand le gameplay reprend. Les melodies libres
reviennent a la marche sans rejouer de dialogue, y compris apres une reprise
de marque-page pendant une melodie de jour ou de nuit.

## Verification

Tests dedies : gaming-book.test.cjs, gaming-book-narration.browser.test.cjs
et gaming-book.browser.test.cjs. Ils couvrent texte progressif, ponctuation,
accents, securite du texte, pause, onglet masque, Reduced Motion, clavier,
tactile, absence de reflow, petits ecrans, fermeture et reprise du marque-page.
Le parcours navigateur complet relit la scene jusqu'au film et au retour hote.
Les preuves repetees restent sous work/qa/ ; la sortie figee de publication
est recontrolee avant Cloudflare.

## Resultats avant publication

- Cinq tests unitaires Gaming Book, trente controles navigateur de narration : passes.
- Cinq formats production, de 320 px au PC/paysage : textes, pixels, abandon
  assombri, messages hote, marque-pages et fermeture pendant les melodies libres.
- Parcours production complet jusqu'au film et retour hote, avec rejeu musical
  de jour et de nuit sans dialogue : passe, aucune erreur navigateur.
- Prototype local : 9 605 assertions logiques et 108 controles du parcours
  PC/Razr emule ; textes ajustes dans les cinq formats et captures inspectees.
- Suite CI complete couverte : 21 premieres invocations puis 86 restantes.
  Deux assertions de version ont ete actualisees ; une relance avec CF_PAGES
  dans la suite generique a ete corrigee en retirant ce flag reserve au build.
- Suite locale complete : 14 invocations passees, PostgreSQL ephemere uniquement.
- Suite repository : sept invocations passees ; controle d'organisation passe.
- Build Cloudflare : 462 cartes, 2 049 fichiers, 1 162,4 Mio, aucun nouveau
  media. Le build generique refuse normalement ce volume au-dela de 900 Mio ;
  le build Cloudflare garde ses propres limites, sans les relever.
- Smoke general : PC/telephone, lecture, PNG, decks, arene, sauvegarde/reprise,
  catalogue additif et absence d'erreur HTTP inattendue.

Preuves locales : work/qa/momo-narration-*.log, gaming-book-narration/,
momo-narration-final/ et momo-narration-deploy/. Aucune sauvegarde personnelle
ni aucun fichier de travail d'une autre tache n'est inclus dans le commit.
