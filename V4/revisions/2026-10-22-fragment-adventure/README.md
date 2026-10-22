# Fragment : aventures illustrees

Demande de l'auteur : des adversaires racontant chaque episode, sans
collaboration, et un lecteur illustre par des scenes plutot qu'un livre ouvert.
Le roman Story, les profils des cartes et les regles de duel restent inchanges.

## Contenu

- 21 compositions natives distinctes pour Momo, Balmhyr et Kaylis ; 42 passages
  avant/apres combat. Momo original puis Taulio ouvrent le parcours de Momo.
- Recompense Momo : 30000014, Le Bal des objets perdus. Les anciennes attributions
  restent definitives, visibles avec leur vraie version, sans remise a zero.
- Sept peintures Momo : rejet, Taulio, premiere melodie, bal, flute, harnais,
  boite musicale avec Kaylis. Le mystere de Gezinho se construit progressivement.
- Lecture panoramique, stations cliquables et transitions finies. Sur telephone,
  scene au-dessus du recit, commandes accessibles ; reduced-motion respecte.
- Les bonus gardent les validations serveur, les ceremonies et le masquage
  avant acquittement. Le lecteur ne charge pas leurs scenes avant revelation.

## Fichiers

- [DECKS.md](DECKS.md) : sources narratives, compositions, mesures et limites.
- [BACKEND.md](BACKEND.md) : contrat serveur et compatibilite des sauvegardes.
- [prompts.json](prompts.json) : prompts et references approuvees des peintures.
- [art-provenance.json](art-provenance.json) : empreintes originales et WebP.
- [prepare-art.cjs](prepare-art.cjs) : encodage reproductible, sans retoucher l'art.
- [decks.test.cjs](decks.test.cjs) et [progression.test.cjs](progression.test.cjs) :
  adversaires, reprises, recompenses, verrous et idempotence.

Les sources PNG sont preservees sous sources/ et sauvegardees hors checkout.
Seuls les WebP inscrits au registre media sont deployes, jamais les originaux.
Les deux tailles de scene permettent de ne charger que la resolution utile.
Les 15 medias actifs pesent 3 754 892 octets au total ; une scene desktop
reste sous 500 ko et une scene mobile sous 180 ko.

## Verification Et Integration

Les tests de rendu sont dans V4/site/journey-view.browser.test.cjs ; ceux des
sources et tailles dans V4/site/journey-covers.test.cjs. Les captures repetables
restent sous work/qa/, hors Git. Les essais SQL utilisent PostgreSQL ephemere,
jamais une progression personnelle pour produire une victoire.

Migration personnelle 013 appliquee apres export et restauration isolee :
schema 12, recompense 30000014, 444 exemplaires, 9 tentatives et 3 progressions
conserves. La sauvegarde finale est chiffree Windows DPAPI hors checkout et
verifiee par reouverture/restauration ; les exports temporaires sont supprimes.

Integration terminee pour [la version 4.6.109](../../releases/2026-10-22-v4.6.109/README.md) :
101 groupes CI, 14 groupes locaux, lecteur PC/Razr et parcours signe de sept
combats valides. Les notes DECKS/BACKEND conservent le bilan des sous-perimetres
avant integration ; les demandes de raccordement y sont maintenant traitees.

## Kaylis, Revision 2

Retouche demandee apres la premiere publication : Kaylis porte maintenant sa
cape noire brodee de rouge, sa tresse et une allure plus affirmee, en reference
a la version approuvee 49902701, Le Prochain Pas. Momo, la boite musicale et
la composition de la rencontre sont conserves. Aucun texte, duel ou compte
ne change. L'illustration native de carte n'est pas modifiee.

Le prompt, les references et leurs empreintes sont dans
[kaylis-cape-v2.json](kaylis-cape-v2.json). Source et deux exports WebP v2
distincts ; les v1 restent preserves. Le lecteur utilise uniquement les v2
pour cette scene. La nouvelle source est sauvegardee hors checkout.
