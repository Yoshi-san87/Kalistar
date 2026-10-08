# Onze nouvelles vies de Kalistar

Selection explicite du 8 octobre 2026 parmi les vingt illustrations du 7 octobre. Les deux Okami sont **Vaelrik et Neriska**, pas les propositions anterieures Rhovan et Eyska.

Les onze illustrations validees sont conservees octet pour octet. Le cadrage natif est calcule dans la fenetre de 737 x 921 pixels sans regenerer l'image ni le cadre. Noms, metiers et courts recits prolongent les propositions validees ; aucun evenement du roman n'est reecrit.

## Profils

| Personnage | Race / faction | Cristal | Arme | Role principal | Positions |
|---|---|---|---|---|---|
| VAELRIK | OKAMI / Grivka | NONE | Instrument | P5 | P3, P5 |
| NERISKA | OKAMI / Grivka | CRYO | Arc | P2 | P2, P4 |
| SSAHEL | SERPES / Arborium | HERBO | Bâton | P3 | P1, P3 |
| ODRAN | FELINEUS / Ysilis | CRYO | Sceptre | P5 | P4, P5 |
| TIVREK | CRUSTOS / Arborium | GEO | Poing | P1 | P1, P3 |
| CALVEN | HUMAIN / Durane | MINERO | Marteau | P2 | P1, P2, P3 |
| ROVEL | HUMAIN / Ysilis | CRYO | Gun | P4 | P2, P4 |
| MAELOR | HUMAIN / Arborium | HERBO | Dague | P5 | P3, P5 |
| DJARELL | HUMAIN / Solaria | LUXO | Lance | P1 | P1, P3 |
| VEYRAC | HUMAIN / Vulkar | PYRO | Epée courte | P3 | P2, P3, P4 |
| HELIOR | HUMAIN / Zarok | NONE | Bâton | P5 | P3, P5 |

- Vaelrik : soutien physique et protection, sans cristal personnel.
- Neriska : archere mobile, une seule face magique et une esquive.
- Ssahel : polyvalent, impulsion physique pour remettre la vanne en mouvement.
- Odran : mana et relance ; il accorde et entretient les balises Cryo.
- Tivrek : defense solide, garde et magie de Terre liee a l'argile.
- Calven : frappe de marteau et soutien physique, defense plus fragile.
- Rovel : tir a distance Cryo, esquive mais faibles petites faces DEF.
- Maelor : soutien Herbo, garde et Reraise preventif, pas de resurrection du cimetiere.
- Djarell : protection Luxo et trois barrieres, attaque moderee de P1.
- Veyrac : polyvalence Pyro et soutien physique, sans Mort ni effet nouveau.
- Helior : garde, relance et soutien physique ; aucune magie sans cristal.

Les valeurs sont individualisees dans les bornes de role V3. Aucun equipement automatique, bonus racial special, arene ou preset n'est ajoute. Les deux decks du test sont uniquement des fixtures. Ces tests verifient la conformite, pas un taux de victoire competitif garanti.

## Composants additionnels

- OKAMI : nouveau motif peint argent/cuivre, calibre optiquement dans l'email natif, contour alpha dans le rayon 39 px. Les composants de races precedents sont preserves.
- Grivka : adaptation du fanion noir/vert foret valide. L'embleme de loup et la montagne sont conserves ; la silhouette native du fanion est appliquee avec alpha identique au donneur.
- Ysilis : conserve le fanion historique Niveria. Niveria demeure une region, pas une nouvelle faction de jeu.
- Les deux nouvelles images de composants ont ete generees avec l'outil integre ; prompts exacts et sources dans component-prompts.json.

## Production

Cartes 897 x 1497 px, 300 ppp. Textes natifs editables, composants en objets dynamiques incorpores, PSD reouvert et PNG compares, cadre fixe controle et quatre lectures du code-barres. Les references approuvees et toutes les creations anterieures sont figees avant preparation ; aucun verrou historique n'est regenere.

```powershell
node V4/expansions/2026-10-08-eleven-lives/build.cjs verify
node --test --test-isolation=none V4/expansions/2026-10-08-eleven-lives/integration.test.cjs V4/expansions/2026-10-08-eleven-lives/assets.test.cjs
node V4/deploy/build.cjs
node V4/expansions/2026-10-08-eleven-lives/browser.test.cjs
```

[Galerie PNG et PSD](galerie.html). [Planche des onze cartes](vue-ensemble.jpg).
Les resultats effectifs de production sont dans native-checks.json et browser-proof/results.json ; ne pas confondre ces commandes avec des controles deja passes.

