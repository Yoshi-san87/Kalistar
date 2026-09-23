# NieR - six nouvelles cartes, 23 septembre 2026

## Publication locale terminee

| Carte | ID | Race | Arme | Cristal | Positions |
| --- | --- | --- | --- | --- | --- |
| Emil | 43525184 | CYBORG | Sceptre | Sang | P4/P3 |
| A2 | 47952087 | ANDROID | Epee longue | Glace | P2/P1 |
| Pascal | 42650442 | ROBOT | Tome | Plante | P5 |
| Adam | 47023549 | ROBOT | Poing | Lumiere | P3/P4 |
| Eve | 48867563 | ROBOT | Poing | Feu | P1/P2 |
| Anemone | 45243854 | HUMAIN | Gun | Terre | P4 |

Les huit cartes NieR partagent la faction et la synergie standard. Le catalogue
contient maintenant 57 versions. Pas de nouvelle arene ni de deck incomplet.
Anemone conserve HUMAIN selon la demande explicite ; il s'agit d'une adaptation
Kalistar, pas d'une affirmation sur sa nature canonique dans NieR.

Pascal : Reraise sur D6 ATK, garde D5, trefle D4, mana D3, puissance physique
D2, puis 18 sur D1. Une barriere DEF. Les cinq soutiens remplacent l'attaque
et visent un allie vivant ; aucun cumul d'une meme categorie ni retour du
cimetiere. Valeurs et restrictions verifiees, sans pretendre a une validation
statistique de l'equilibrage en parties humaines.

## Art et fabrication

- Six illustrations originales dans la famille picturale Momo/Valazar.
- Pascal corrige a la demande utilisateur d'apres le design officiel : tete
  cylindrique, yeux bleus, jauge et articulations, tout en gardant livre et eleve.
- Fusil d'Anemone redresse dans l'illustration pour garder le canon visible
  a l'interieur de la fenetre utile de carte. Aucun cache ajoute sur le PNG.
- Huit appels au generateur integre : six illustrations, correction Pascal,
  correction de cadrage Anemone. Aucun appel CLI/API externe.
- [Prompts exacts, references et provenance](art/provenance.json).
- [Apercu du lot definitif](set-preview.jpg).
- PSD/PNG sources : `cards/<cle>/card.psd` et `card.png`. Copies jouables dans
  `V4/creations/<id>/`. Les six PSD gardent textes natifs editables et objets
  dynamiques incorpores, 897 x 1497 px a 300 dpi.
- Police des noms et versions issue de la correction 2B/9S. Metiers en
  capitales ; dimensions et centrages du cadre conserves.

## Controles executes

- 17 tests passent : production du lot et typographie partagee. Tests reels
  du moteur avec restauration des matchs et attributions de Pascal inclus.
- Six controles natifs passes : aucun pixel fixe divergent, aucun pixel de
  composant severement divergent, reouverture PSD identique au PNG, six
  codes-barres effectivement lus. Impression physique non testee.
- Publication transactionnelle : six ajouts, puis preflight idempotent avec
  zero ajout et six cartes reutilisees.
- [QA navigateur](verification/browser/report.json) : contextes ephemeres,
  requetes GET locales uniquement, 1600/390/360 px. Huit cartes NieR consultables,
  six fiches et illustrations, medias controles par hash, filtre statistiques.
  Zero erreur JS/HTTP, zero debordement du viewport.
- Base de test neuve : 57 originaux Paris, zero Tokyo. Aucun acces aux donnees
  IndexedDB du navigateur personnel. Les transferts existants ne sont pas annules.
- Anciennes creations, dont 2B/9S et Barret CYBORG, protegees par comparaison
  integrale des inventaires et des empreintes. References approuvees et banque
  inchangees. Aucune commande Git ni publication distante.

Serveur local verifie : http://127.0.0.1:4304/jeu/#collection .
La validation technique ne remplace pas le retour artistique de l'utilisateur.
