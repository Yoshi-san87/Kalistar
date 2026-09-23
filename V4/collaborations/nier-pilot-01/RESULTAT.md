# Pilote NieR - 23 septembre 2026

## Livre et integre localement

- 2B `45911726` : ANDROID, Katana, P2, LUXO. Six attaques physiques sous les plafonds P2, esquive, trefle et une barriere DEF.
- 9S `42138845` : ANDROID, Lance, ELECTRO, P3/P5 confirme par l'utilisateur. Profil Support P5, Reraise, buffs physique et magique, deux barrieres DEF.
- Faction commune `NieR`, synergie ATK standard ; race ANDROID, synergie DEF standard. Aucun bonus special ni modification du moteur.
- Barret `43698921` devient CYBORG. Profil identique hors race ; illustration, identite, UUID et statistiques preserves.
- Catalogue local : 51 cartes. Le navigateur de test neuf attribue 51 originaux a Paris et zero a Tokyo. Les sauvegardes du navigateur personnel ne sont pas touchees.
- Pas de nouvelle arene, pas de preset incomplet de deux cartes. Aucune commande Git ni publication distante.

## Sources

- [2B PSD](cards/2b/card.psd), [PNG](cards/2b/card.png), [profil](cards/2b/profile.json).
- [9S PSD](cards/9s/card.psd), [PNG](cards/9s/card.png), [profil](cards/9s/profile.json).
- Copies jouables verifiees : `V4/creations/45911726/` et `V4/creations/42138845/`.
- [Apercu des cartes](pilot-preview.jpg).
- [Prompts et references des illustrations / Android](art/provenance.json), [prompt de banniere](art/faction-provenance.json).
- Quatre generations via l'outil image_gen integre, sans CLI/API externe. References picturales Momo et Valazar ; [references officielles de personnages](https://www.jp.square-enix.com/WOTV/nier/) consultees, compositions originales.
- Barret : [revision native et originaux](../../revisions/2026-09-23-barret-cyborg/README.md), transaction `published`.

## Verification

- Deux PSD : 897 x 1497, 300 dpi, textes editables et composants incorpores.
- Cadre : zero pixel fixe divergent ; composants : zero pixel severement divergent ; PSD rouverts : zero pixel different du PNG ; deux codes-barres lus.
- Emblemes centres par ancre optique mesuree ; contour alpha entier contenu dans le medaillon. Bannieres sur l'empreinte validee 98 x 223.
- Barret : aucun changement de calque hors race, aucun pixel change hors des deux zones de race.
- References protegees et banque d'origine intactes ; races ajoutees via extension calibree distincte.
- Derniere suite combinee : 45 tests passes (NieR, calibrage, publications FF7/FF8 et Atelier). Tests Kalistel et catalogue passes egalement ; trois matchs mixtes NieR termines/restaures.
- [QA navigateur](verification/browser/report.json) : 1600, 390 et 360 px, zero erreur JS/HTTP, vrais medias, filtres NieR et statistiques corrects.
- QA navigateur FF7/FF8 repassee avec vrais medias, deux presets et deux arenes, 1600/390 px. Le test de chemin de banniere compare desormais l'URL resolue, pas son ecriture relative.
- Le serveur local a ete redemarre : http://127.0.0.1:4304/jeu/#collection .

## Quota et incident local

Le quota hebdomadaire affiche est passe de 2 % a 8 % utilises : difference observee de 6 points, 92 % restants au dernier releve. Il s'agit du compte entier, avec arrondi, pas d'une mesure exacte des tokens de cette tache. Ce pilote inclut les nouveaux composants, la revision Barret, l'integration et les tests ; multiplier directement par cinq ne donne pas une estimation fiable d'un set de dix cartes. Voir [releve](usage-after.json).

Photoshop a sature son disque de travail durant les premiers exports. Aucun document n'etait ouvert ; fermeture normale puis redemarrage, recuperation d'environ 12,8 Go de cache, sans suppression de sources. Tous les rendus finaux ont ensuite passe les controles natifs. La composition ferme maintenant le document de travail avant sa vraie reouverture.

Validation technique terminee ; l'appreciation artistique finale reste a l'utilisateur.

## Correction typographique native du 23 septembre

Suite au retour utilisateur, les noms 2B / 9S utilisent une police serif
lisible sans glyphes numeriques ambigus. Les versions retrouvent les
capitales et leur echelle approuvee ; les deux calques sont recentres.
Correction dans les PSD editables et la fabrication, sans retouche peinte
ni regeneration des images. [Revision et preuves](../../revisions/2026-09-23-nier-typography/README.md).

Zero pixel change hors NOM/TITLE ; illustrations, profils, autres calques,
Barret et catalogue preserves. Controles natifs et codes-barres repasses,
11 tests passes, preflights NieR/FF7 valides. QA navigateur renouvelee a
1600/390/360 px sans erreur JS/HTTP ni debordement. L'apercu ci-dessus montre
les cartes corrigees. Aucune generation d'image supplementaire.
