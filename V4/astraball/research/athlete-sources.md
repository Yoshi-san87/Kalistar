# Sources des mensurations de collaboration Astraball

Passage documentaire du 25 octobre 2026. Perimetre d'ecriture limite a `data/collaboration-measurements.mjs` et au present document. Aucun changement du moteur, des profils de gameplay, des originaux, de l'UI ou des versions ; aucun commit/push.

## Bilan

- Catalogue de travail : 368 personnages dans `sources/sprites-v3/production.json`.
- Module : 238 collaborations, 130 originaux exclus, aucun identifiant supplementaire.
- 61 entrees `sourced` : 61 tailles et 23 poids. 30 profils ont une source de provenance officielle ; 31 ont uniquement des sources secondaires. Lors de ma collecte initiale, 27 des 30 premiers reposaient sur du texte indexe (18 CFN, 9 ONE PIECE.com), et trois sur une lecture visuelle directe (Konami). Luffy a ensuite ete confirme directement par le parent ; voir la contre-verification ci-dessous.
- 177 entrees `unknown` : taille et poids null, sources vides, note exactement `Non documenté de façon fiable`.
- Priorite de lecture : 90 collaborations parmi les 150 entrees de `data/sprite-library.json` ; 37 de ces 90 collaborations sont documentees dans ce passage.
- Les 238 entrees inconnues ont ete creees et testees avant l'enrichissement, afin de rendre immediatement possible l'import ESM.

## Contrat et methode

- Export autonome `COLLABORATION_MEASUREMENTS = Object.freeze({...})`, sans import, acces reseau, calcul de gameplay ou effet de bord.
- `sourced` signifie au moins une mesure explicitement lue dans la restitution consultee de la source (directe ou indexee), pas une certification officielle ni une garantie d'acces direct. Chaque source declare `official` ou `secondary` pour sa provenance et les champs exacts qu'elle justifie.
- Un champ null est inconnu, jamais zero. `unknown` signifie non verifie dans ce passage, pas absence prouvee dans tout le canon. Les sources candidates rejetees restent hors de `sources`.
- Pas de poids deduit d'une taille, d'une silhouette, d'un acteur, d'un modele 3D ou d'une figurine. Pas de moyenne entre editions ou formes.
- Une traduction communautaire ou un wiki citant un livre officiel non consulte reste secondaire. Le nombre de reprises d'un chiffre ne remplace pas une preuve primaire.
- Les continuities indiquent la version documentaire retenue. Elles ne certifient pas que chaque variante `modelIds` du catalogue correspond a cette version. L'integration doit verifier l'apparence cible ; ne pas appliquer automatiquement ces valeurs a toutes les variantes.
- Les valeurs metriques sont conservees telles qu'elles apparaissent. Seule conversion necessaire dans ce lot : les metres de Dimitrescu en centimetres.
- Recherche par series et fiches communes, puis controle des champs individuels retenus. Aucun import massif de tableaux non verifies.
- Acces : plusieurs pages Fandom, ONE PIECE.com et CFN ont ete lues via leur texte indexe par la recherche web. Cela ne constitue pas une archive de leur etat courant. La page Auronlu a ete exploitee via son extrait indexe apres des delais d'acces direct ; les trois fiches Konami officielles ont ete lues dans le navigateur. Les livres imprimes cites par les wikis n'ont pas ete ouverts.
- Les contraintes propres aux mesures (chaussures, chapeau, chignon, corps androide, forme hybride) figurent aussi dans les notes du module. Elles peuvent rendre les chiffres impropres a une comparaison anatomique directe.

## Audit d'acces CFN

Precision ajoutee apres la relecture parent du 25 octobre 2026 : l'ouverture de la page Ken en IAB affiche MAINTENANCE ; le parent signale aussi une reponse 403 de l'outil web. Je n'ai pas obtenu de lecture directe du corps actif des pages CFN et ne la revendique pas.

La preuve utilisee pour les 18 profils CFN est uniquement la restitution indexee du moteur de recherche web. Pour chaque resultat retenu, cette restitution contenait le titre du Character Guide, l'URL Capcom et un bloc de profil comprenant explicitement Name, Height et Weight. Il ne s'agissait pas d'une valeur rappelee de memoire puis associee a une URL officielle. Cela reste un extrait indexe, meme lorsqu'il est assez long pour reproduire le bloc de profil et du texte de presentation : ce n'est ni une page active verifiee, ni un document d'archive authentifie.

Exemple precis : la requete `site:game.capcom.com/cfn/sfv/ "Character Guide" "Ken" "Weight"` a retourne [Character Guide 102: Ken Masters](https://game.capcom.com/cfn/sfv/column/130433?lang=en), avec `Name: Ken Masters`, `Height: 175cm` et `Weight: 83kg`. La recherche retournait aussi Brain-washed Ken (guide 103), qui n'a pas ete utilise.

Champs lus dans les restitutions indexees, sans recalcul ni remplacement :

| Guide CFN | Name | Height | Weight |
| --- | --- | --- | --- |
| `100` | `Ryu` | `175cm` | `85kg` |
| `102` | `Ken Masters` | `175cm` | `83kg` |
| `104` | `Chun-Li` | `169cm` | `Secret` |
| `159` | `Guile` | `182cm` | `99kg` |
| `125` | `Cammy` | `164cm` | `61kg` |
| `105` | `Zangief` | `214cm` | `181kg` |
| `106` | `Dhalsim` | `176cm (extend)` | `48kg (extend)` |
| `058` | `Blanka (Jimmy)` | `192cm` | `98kg` |
| `112` | `Vega` | `186cm` | `84kg` |
| `113` | `M.Bison` | `182cm` | `112kg` |
| `026` | `Akuma` | `178cm` | `90kg` |
| `162` | `Juri` | `165cm` | `57kg` |
| `161` | `Balrog` | `193cm` | `135kg` |
| `019` | `Sagat` | `226cm` | `78kg` |
| `069` | `Edmond Honda` | `185cm (including hair bun)` | `137kg` |
| `071` | `Dee Jay` | `184cm` | `92kg` |
| `068` | `Fei-long` | `172cm` | `60kg` |
| `060` | `Thunder Hawk` | `230cm` | `162kg` |

Limites : la date exacte de la version indexee n'est pas etablie ; aucune capture de la page active, aucun hash et aucune archive primaire perenne ne sont fournis. Les contenus actuels derriere la maintenance ne sont pas verifies. Ces 18 profils doivent etre recontroles sur une page accessible ou une archive primaire avant une validation editoriale forte.

Dans ce module, `type: official` qualifie la provenance de la page indexee (Capcom), pas une reussite d'acces HTTP ni une consultation directe. Le statut `sourced` n'ajoute pas cette garantie. Les 18 notes CFN mentionnent desormais l'acces indirect ; aucun nombre ni statut n'a ete change lors de cette precision.

Pour les autres sources de provenance officielle du lot : les neuf profils ONE PIECE.com ont egalement ete exploites via leur texte indexe ; les trois tailles Konami (Solid Snake, Psycho Mantis, Vulcan Raven) ont, elles, ete lues visuellement dans les encadres de profils ouverts dans le navigateur. La traduction FFX Auronlu reste une source secondaire consultee via son texte indexe, et non une lecture des Ultimania.

## Contre-verification parent et cloture

Lot documentaire arrete a 61 profils avec au moins une mesure, sans objectif de completer les 238 mensurations. Aucun nombre n'a ete ajoute lors de cette cloture.

Retours du parent le 25 octobre 2026, distingues de mes propres acces :

- Luffy : 174 cm confirmes par lecture directe de la fiche officielle dans IAB. Cette contre-verification renforce la mesure initialement lue dans un resultat indexe. La note du module identifie le parent comme auteur de cette lecture directe.
- Solid Snake : 182 cm confirmes sur la capture Konami par le parent, en plus de ma lecture visuelle initiale.
- Auronlu / FFX : le parent rencontre ERR_CERT_COMMON_NAME_INVALID dans IAB. Aucun contournement du certificat. Les huit valeurs FFX restent des lectures de texte indexe de la traduction secondaire, pas des lectures directes de la page active ni des Ultimania.
- Fandom : ouverture via outil web non lisible (402 signale par le parent). Les valeurs conservees ont effectivement ete lues dans les restitutions indexees, et ne sont pas des valeurs de memoire. Les notes des 16 profils concernes precisent ce mode d'acces.
- CFN : maintenance en IAB et 403 signales par le parent ; les 18 profils restent sous la reserve d'acces indirect detaillee ci-dessus.

| Ensemble retenu | Preuve effectivement exploitee | Limite restante |
| --- | --- | --- |
| ONE PIECE.com, 9 profils | Texte indexe de chaque fiche ; Luffy confirme directement par le parent | Les huit autres n'ont pas de contre-verification directe dans ce lot |
| Konami, 3 profils | Lecture visuelle des encadres height dans le navigateur | Taille uniquement ; pas de preuve pour les poids |
| MGS, 4 profils secondaires | Restitution textuelle de l'outil web (Neoseeker et Metal Gear Convention) | Acces direct a la page courante non certifie ; aucune image du document officiel d'origine controlee |
| FFX, 8 profils | Texte indexe de la traduction pmog / Auronlu | Certificat bloque ; ouvrages primaires non consultes |
| NieR, 4 profils | Infoboxes NIER Wiki restituees dans les resultats indexes | World Guides non consultes directement |
| FF8, 10 profils | Fiches wiki indexees et tableau VGKAMI ouvert dans l'outil web | Pas de lecture des Ultimania ; VGKAMI reste secondaire |
| FF7, 2 profils | Fiches wiki indexees avec renvois bibliographiques | Pas de lecture de Remake Ultimania |
| CFN, 18 profils | Blocs Name / Height / Weight indexes, reproduits dans l'audit | Pages actives non lues ; maintenance constatee par le parent |
| RE1, 2 profils | Page de traduction du Navigation Book ouverte et lue dans l'outil web | Traduction secondaire ; livre original non consulte |
| RE8, 1 profil | Article de presse Lowyat.NET restitue par la recherche, attribuant la mesure a Takano | Tweet primaire inaccessible ; pas de lecture directe du message officiel |

Pour les profils a acces indirect, `sourced` veut seulement dire que le nombre figure dans le texte effectivement restitue. Cela ne garantit ni son actualite ni sa conformite au document primaire. Les 177 autres profils gardent deux null et la note imposee. Les 215 poids non renseignes restent null, y compris pour des personnages dont la taille est renseignee.

## Registre des valeurs retenues

Dans les tableaux, `null` est une absence de mesure, pas une valeur. Les liens sont les pages justifiant les nombres ; le module donne en plus leurs champs `fields`. Les notes individuelles du module completent les reservations ci-dessous.

### Final Fantasy X

Source secondaire commune : [traduction pmog conservee par Auronlu](https://auronlu.istad.org/ffx-script/pmogs-ffx-ultimania-translations/character-ages-and-heights-pmog/), section ALL AVAILABLE HEIGHTS. Les guides Ultimania auxquels elle est attribuee n'ont pas ete consultes directement. Valeurs FFX, pas FFX-2. Lulu : taille sans talons ni coiffure. Tous les poids restent inconnus. Auron reste inconnu devant une divergence entre sources secondaires ; Yunalesca n'a pas de preuve retenue.

| characterId | Taille (cm) | Poids (kg) | Preuve consultee |
| --- | ---: | ---: | --- |
| `rikku-ff10` | 158 | null | [secondary: Auronlu / pmog - FFX Character Ages and Heights](https://auronlu.istad.org/ffx-script/pmogs-ffx-ultimania-translations/character-ages-and-heights-pmog/) |
| `tidus-ff10` | 175 | null | [secondary: Auronlu / pmog - FFX Character Ages and Heights](https://auronlu.istad.org/ffx-script/pmogs-ffx-ultimania-translations/character-ages-and-heights-pmog/) |
| `kimahri-ff10` | 204 | null | [secondary: Auronlu / pmog - FFX Character Ages and Heights](https://auronlu.istad.org/ffx-script/pmogs-ffx-ultimania-translations/character-ages-and-heights-pmog/) |
| `seymour-ff10` | 187 | null | [secondary: Auronlu / pmog - FFX Character Ages and Heights](https://auronlu.istad.org/ffx-script/pmogs-ffx-ultimania-translations/character-ages-and-heights-pmog/) |
| `yuna-ff10` | 161 | null | [secondary: Auronlu / pmog - FFX Character Ages and Heights](https://auronlu.istad.org/ffx-script/pmogs-ffx-ultimania-translations/character-ages-and-heights-pmog/) |
| `lulu-ff10` | 167 | null | [secondary: Auronlu / pmog - FFX Character Ages and Heights](https://auronlu.istad.org/ffx-script/pmogs-ffx-ultimania-translations/character-ages-and-heights-pmog/) |
| `jecht-ff10` | 190 | null | [secondary: Auronlu / pmog - FFX Character Ages and Heights](https://auronlu.istad.org/ffx-script/pmogs-ffx-ultimania-translations/character-ages-and-heights-pmog/) |
| `wakka-ff10` | 188 | null | [secondary: Auronlu / pmog - FFX Character Ages and Heights](https://auronlu.istad.org/ffx-script/pmogs-ffx-ultimania-translations/character-ages-and-heights-pmog/) |

### Metal Gear Solid

Trois tailles ont ete lues visuellement dans les encadres height des anciennes fiches officielles Konami : Solid Snake, Psycho Mantis, Vulcan Raven. Pour les autres profils retenus, la source reste secondaire : transcription du briefing par Tim Huynh ou fiche Metal Gear Convention renvoyant au profil MGS1. Periode Shadow Moses (2005), et non les autres episodes. Aucun poids retenu. En particulier, le poids de Gray Fox avant sa transformation en cyborg n'est pas reutilise.

| characterId | Taille (cm) | Poids (kg) | Preuve consultee |
| --- | ---: | ---: | --- |
| `vulcan-raven-mgs` | 210 | null | [official: Konami - Metal Gear Solid - VULCAN RAVEN](https://www.konami.com/mg/archive/mgs/character/ch09.html) |
| `liquid-snake-mgs` | 183 | null | [secondary: Tim Huynh - Metal Gear Solid Briefing Mode Guide v1.12](https://www.neoseeker.com/metal-gear-solid/faqs/67149-briefing.html) |
| `psycho-mantis-mgs` | 190 | null | [official: Konami - Metal Gear Solid - PSYCHO MANTIS](https://www.konami.com/mg/archive/mgs/character/ch11.html) |
| `solid-snake-mgs` | 182 | null | [official: Konami - Metal Gear Solid - SOLID SNAKE](https://www.konami.com/mg/archive/mgs/character/ch01.html) |
| `meryl-mgs` | 175 | null | [secondary: Tim Huynh - Metal Gear Solid Briefing Mode Guide v1.12](https://www.neoseeker.com/metal-gear-solid/faqs/67149-briefing.html) |
| `gray-fox-mgs` | 181 | null | [secondary: Metal Gear Convention - Gray Fox](https://mgcvt.com/character/c22) |
| `revolver-ocelot-mgs` | 182 | null | [secondary: Metal Gear Convention - Revolver Ocelot](https://mgcvt.com/character/c12) |

### NieR Automata

Sources secondaires : infoboxes NIER Wiki, mesures explicitement rattachees a NieR:Automata et renvoyant aux World Guides. Livres non consultes directement. 2B et A2 : talons inclus ; 9S et Popola : bottes incluses. Ce sont des masses d'androides. Pour 2B, les renvois indiquent World Guide vol. 1 p. 26 et vol. 2 p. 11 ; pour 9S, vol. 1 p. 27 et vol. 2 p. 13. Ne pas appliquer le profil Automata de Popola a Devola, classee Replicant dans le catalogue. Le [profil officiel de l'anime 2B](https://nierautomata-anime-en.com/character/detail/?chara=2b) n'est pas utilise comme preuve primaire pour le jeu.

| characterId | Taille (cm) | Poids (kg) | Preuve consultee |
| --- | ---: | ---: | --- |
| `popola-nier` | 173 | 163.2 | [secondary: NIER Wiki - POPOLA](https://nier.fandom.com/wiki/Popola) |
| `9s-nier` | 160 | 129.9 | [secondary: NIER Wiki - 9S](https://nier.fandom.com/wiki/YoRHa_No.9_Type_S) |
| `2b-nier` | 168 | 148.8 | [secondary: NIER Wiki - 2B](https://nier.fandom.com/wiki/YoRHa_No.2_Type_B) |
| `a2-nier` | 168 | 139.2 | [secondary: NIER Wiki - A2](https://nier.fandom.com/wiki/YoRHa_Type_A_No.2) |

### One Piece

Fiches officielles ONE PIECE.com, rubrique japonaise de taille. Profils apres l'ellipse de deux ans ; pas les tailles avant ellipse. Chopper : forme hybride ordinaire (人獣型), pas une transformation de combat. Aucun poids lu dans ces fiches. Les pages officielles consultees pour Jinbe et Shanks ne donnaient pas de taille dans le texte exploitable ; ils restent inconnus ici.

| characterId | Taille (cm) | Poids (kg) | Preuve consultee |
| --- | ---: | ---: | --- |
| `monkey-d-luffy-op` | 174 | null | [official: ONE PIECE.com - MONKEY D. LUFFY - profil officiel](https://one-piece.com/character/luffy/index.html) |
| `roronoa-zoro-op` | 181 | null | [official: ONE PIECE.com - RORONOA ZORO - profil officiel](https://one-piece.com/character/zoro/index.html) |
| `sanji-op` | 180 | null | [official: ONE PIECE.com - SANJI - profil officiel](https://one-piece.com/character/sanji/index.html) |
| `nami-op` | 170 | null | [official: ONE PIECE.com - NAMI - profil officiel](https://one-piece.com/character/nami/index.html) |
| `usopp-op` | 176 | null | [official: ONE PIECE.com - USOPP - profil officiel](https://one-piece.com/character/usopp/) |
| `tony-tony-chopper-op` | 90 | null | [official: ONE PIECE.com - CHOPPER - profil officiel](https://one-piece.com/character/chopper/) |
| `nico-robin-op` | 188 | null | [official: ONE PIECE.com - NICO ROBIN - profil officiel](https://one-piece.com/character/robin/index.html) |
| `franky-op` | 240 | null | [official: ONE PIECE.com - FRANKY - profil officiel](https://one-piece.com/character/franky/index.html) |
| `brook-op` | 277 | null | [official: ONE PIECE.com - BROOK - profil officiel](https://one-piece.com/character/brook/index.html) |

### Street Fighter

Sources officielles Capcom, collection Character Guides de CFN / Shadaloo C.R.I. Chaque valeur appartient a la fiche numerotee liee ci-dessous. Cette collection publiee a l'epoque SFV contient aussi des profils retrospectifs : ne pas presenter toutes les valeurs comme les statistiques actuelles de SFV ou SF6. Chun-Li : poids Secret, donc null. E. Honda : chignon inclus. Dhalsim : les deux champs portent extend, donc dimensions variables. Sagat : la fiche 019 annonce bien 78 kg et utilise une illustration SFII ; valeur historique conservee comme telle, pas un poids moderne. Akuma : fiche retrospective 026. Noms occidentaux verifies : Vega = combattant espagnol, Balrog = boxeur, M. Bison = dictateur.

| characterId | Taille (cm) | Poids (kg) | Preuve consultee |
| --- | ---: | ---: | --- |
| `ryu-street-fighter` | 175 | 85 | [official: Capcom - Character Guide 100: Ryu](https://game.capcom.com/cfn/sfv/column-130431) |
| `ken-street-fighter` | 175 | 83 | [official: Capcom - Character Guide 102: Ken Masters](https://game.capcom.com/cfn/sfv/column/130433?lang=en) |
| `chun-li-street-fighter` | 169 | null | [official: Capcom - Character Guide 104: Chun-Li](https://game.capcom.com/cfn/sfv/column-130435?lang=en) |
| `guile-street-fighter` | 182 | 99 | [official: Capcom - Character Guide 159: Guile](https://game.capcom.com/cfn/sfv/column-131108?lang=en) |
| `cammy-street-fighter` | 164 | 61 | [official: Capcom - Character Guide 125: Cammy](https://game.capcom.com/cfn/sfv/column/130984?lang=en) |
| `zangief-street-fighter` | 214 | 181 | [official: Capcom - Character Guide 105: Zangief](https://game.capcom.com/cfn/sfv/column/130436?lang=en) |
| `dhalsim-street-fighter` | 176 | 48 | [official: Capcom - Character Guide 106: Dhalsim](https://game.capcom.com/cfn/sfv/column/130438?lang=en) |
| `blanka-street-fighter` | 192 | 98 | [official: Capcom - Character Guide 058: Blanka](https://game.capcom.com/cfn/sfv/column/130301?lang=en) |
| `vega-street-fighter` | 186 | 84 | [official: Capcom - Character Guide 112: Vega](https://game.capcom.com/cfn/sfv/column/130515?lang=en) |
| `m-bison-street-fighter` | 182 | 112 | [official: Capcom - Character Guide 113: M. Bison](https://game.capcom.com/cfn/sfv/column-130516?lang=en) |
| `akuma-street-fighter` | 178 | 90 | [official: Capcom - Character Guide 026: Akuma](https://game.capcom.com/cfn/sfv/column-122147?lang=en) |
| `juri-street-fighter` | 165 | 57 | [official: Capcom - Character Guide 162: Juri](https://game.capcom.com/cfn/sfv/column/131111) |
| `balrog-street-fighter` | 193 | 135 | [official: Capcom - Character Guide 161: Balrog](https://game.capcom.com/cfn/sfv/column/131110?lang=en) |
| `sagat-street-fighter` | 226 | 78 | [official: Capcom - Character Guide 019: Sagat](https://game.capcom.com/cfn/sfv/column/112579) |
| `e-honda-street-fighter` | 185 | 137 | [official: Capcom - Character Guide 069: E. Honda](https://game.capcom.com/cfn/sfv/column-130313?lang=en) |
| `dee-jay-street-fighter` | 184 | 92 | [official: Capcom - Character Guide 071: Dee Jay](https://game.capcom.com/cfn/sfv/column-130316?lang=en) |
| `fei-long-street-fighter` | 172 | 60 | [official: Capcom - Character Guide 068: Fei-long](https://game.capcom.com/cfn/sfv/column/130312?lang=en) |
| `t-hawk-street-fighter` | 230 | 162 | [official: Capcom - Character Guide 060: Thunder Hawk](https://game.capcom.com/cfn/sfv/column/130304) |

### Resident Evil 1

Source secondaire commune : [traduction du Biohazard Official Navigation Book](https://residentevilpodcast.com/biohazard-official-navigation-book/) par theBatman pour The Resident Evil Podcast. La page identifie Famitsu/Capcom, 2002, S.T.A.R.S. PROFILE pp. 12-18 ; les fiches 1 et 2 donnent explicitement les quatre valeurs retenues. Continuite du remake GameCube, incident du manoir en 1998. Ni les mensurations des acteurs ni les profils RE5/RE6 ne sont utilises.

| characterId | Taille (cm) | Poids (kg) | Preuve consultee |
| --- | ---: | ---: | --- |
| `jill-valentine-re` | 166 | 50.4 | [secondary: The Resident Evil Podcast - Biohazard Official Navigation Book Translation](https://residentevilpodcast.com/biohazard-official-navigation-book/) |
| `chris-redfield-re` | 181 | 80.5 | [secondary: The Resident Evil Podcast - Biohazard Official Navigation Book Translation](https://residentevilpodcast.com/biohazard-official-navigation-book/) |

### Resident Evil Village

Source secondaire de presse rapportant la declaration du directeur artistique Tomonori Takano. Conversion d'unites uniquement : 2,9 m = 290 cm. Chapeau et talons inclus ; forme humanoide du jeu principal. Le [tweet officiel cite par la presse](https://twitter.com/RE_Games/status/1356391885816823808) renvoyait une erreur d'acces : il n'est pas transforme en source primaire consultee. Pas de poids, de hauteur de forme mutante ou de version Mercenaries deduits.

| characterId | Taille (cm) | Poids (kg) | Preuve consultee |
| --- | ---: | ---: | --- |
| `alcina-dimitrescu-re` | 290 | null | [secondary: Lowyat.NET - Capcom: Lady Dimitrescu Is Just Under 3m Tall](https://www.lowyat.net/2021/231647/capcom-lady-dimitrescu-just-under-3m-tall/) |

### Final Fantasy VIII

Sources secondaires : fiches individuelles Final Fantasy Wiki, recoupees avec le [tableau VGKAMI signe Andrew Verrall](https://vgkami.com/final-fantasy-viii-every-characters-age-birthday-and-height/). Les valeurs metriques attribuees aux profils japonais sont retenues ; pas de moyenne avec les conversions occidentales divergentes. Renvois de wiki effectivement lus : Ultimania p. 014 pour Linoa, p. 018 pour Zell, p. 020 pour Selphie, p. 022 pour Irvine et p. 27 pour Ward. Le livre lui-meme n'a pas ete consulte. Pour Ward, la fiche russe est la page dont la taille et le renvoi etaient lisibles. Pour Seifer, le renvoi primaire est l'ancien site PC, aujourd'hui redirige sans profils. Les poids attribues par le wiki au script de l'ascenseur d'Ultimecia ne sont pas retenus : ni validation du script ni preuve que ces constantes de gameplay sont des mensurations canoniques. Edea et Ultimecia restent inconnues.

| characterId | Taille (cm) | Poids (kg) | Preuve consultee |
| --- | ---: | ---: | --- |
| `selphie-ff8` | 157 | null | [secondary: Final Fantasy Wiki - Selphie Tilmitt](https://finalfantasy.fandom.com/wiki/Selphie_Tilmitt) |
| `kiros-ff8` | 191 | null | [secondary: Final Fantasy Wiki - Kiros Seagill](https://finalfantasy.fandom.com/wiki/Kiros_Seagill) |
| `laguna-ff8` | 181 | null | [secondary: Final Fantasy Wiki - Laguna Loire](https://finalfantasy.fandom.com/wiki/Laguna_Loire) |
| `squall-ff8` | 177 | null | [secondary: Final Fantasy Wiki - Squall Leonhart](https://finalfantasy.fandom.com/wiki/Squall_Leonhart) |
| `linoa-ff8` | 163 | null | [secondary: Final Fantasy Wiki - Rinoa Heartilly](https://finalfantasy.fandom.com/wiki/Rinoa_Heartilly) |
| `seifer-ff8` | 188 | null | [secondary: Final Fantasy Wiki - Seifer Almasy](https://finalfantasy.fandom.com/wiki/Seifer_Almasy) |
| `ward-ff8` | 217 | null | [secondary: Final Fantasy Wiki (ru) - Ward Zabac](https://finalfantasy.fandom.com/ru/wiki/%D0%92%D0%B0%D1%80%D0%B4_%D0%97%D0%B0%D0%B1%D0%B0%D0%BA) |
| `irvine-ff8` | 185 | null | [secondary: Final Fantasy Wiki - Irvine Kinneas](https://finalfantasy.fandom.com/wiki/Irvine_Kinneas) |
| `zell-ff8` | 168 | null | [secondary: Final Fantasy Wiki - Zell Dincht](https://finalfantasy.fandom.com/wiki/Zell_Dincht) |
| `quistis-ff8` | 172 | null | [secondary: Final Fantasy Wiki - Quistis Trepe](https://finalfantasy.fandom.com/wiki/Quistis_Trepe) |

### Final Fantasy VII

Deux tailles seulement sont retenues pour Remake : Aerith et Barret. Leurs fiches secondaires rattachent explicitement la taille a Remake Ultimania (p. 22 pour Aerith ; Barret renvoie aussi a Ultimania Omega p. 020). Livres non consultes directement. Le [manuel francais officiel distribue par PlayStation](https://secure.cdn.us.playstation.com/manuals/classic/games/final-fantasy-vii-manual-fr.pdf) a ete lu, mais ses valeurs de l'edition ancienne ne sont pas transposees aux apparences Remake. Le reste demeure inconnu dans ce passage : notamment Sephiroth (editions divergentes), Cait Sith (chat seul ou ensemble avec monture), Red XIII (axe de mesure a clarifier), et les profils non suffisamment verrouilles.

| characterId | Taille (cm) | Poids (kg) | Preuve consultee |
| --- | ---: | ---: | --- |
| `barret-ff7` | 197 | null | [secondary: Final Fantasy Wiki - Barret Wallace](https://finalfantasy.fandom.com/wiki/Barret_Wallace) |
| `aeris-ff7` | 163 | null | [secondary: Final Fantasy Wiki - Aerith Gainsborough](https://finalfantasy.fandom.com/wiki/Aerith_Gainsborough) |

## Couverture et limites

Ce passage n'est pas une recherche exhaustive des 238 personnages. Les groupes non prioritaires sans resultat conserve restent volontairement inconnus ; ne pas lire le tableau comme une preuve d'absence de mensurations officielles.

| Faction du catalogue | Collaborations | Avec une mesure retenue | Inconnues |
| --- | ---: | ---: | ---: |
| FF10 | 10 | 8 | 2 |
| MGS1 | 9 | 7 | 2 |
| FF8 | 12 | 10 | 2 |
| FF7 | 10 | 2 | 8 |
| NieR | 11 | 4 | 7 |
| Replicant | 3 | 0 | 3 |
| MGS4 | 2 | 0 | 2 |
| MGS2 | 4 | 0 | 4 |
| MGS3 | 8 | 0 | 8 |
| MGS5 | 4 | 0 | 4 |
| RE1 | 2 | 2 | 0 |
| RE2 | 4 | 0 | 4 |
| RE3 | 1 | 0 | 1 |
| RE8 | 4 | 1 | 3 |
| RE4 | 2 | 0 | 2 |
| RE7 | 1 | 0 | 1 |
| ONEPIECE | 19 | 9 | 10 |
| WITCHER | 6 | 0 | 6 |
| FF9 | 19 | 0 | 19 |
| FF6 | 13 | 0 | 13 |
| FF15 | 7 | 0 | 7 |
| FF13 | 8 | 0 | 8 |
| Batman | 11 | 0 | 11 |
| XMEN | 8 | 0 | 8 |
| STREETFIGHTER | 18 | 18 | 0 |
| CASTLEVANIA | 8 | 0 | 8 |
| CHRONOTRIGGER | 7 | 0 | 7 |
| TMNT | 10 | 0 | 10 |
| TOMBRAIDER | 1 | 0 | 1 |
| OCTOPATH | 16 | 0 | 16 |

### Cas non retenus

- Metal Gear : pas de transfert des poids MG2/MGS4 vers Solid Snake MGS1 ; pas de transfert des tailles de Big Boss selon les annees vers Naked Snake ou Venom Snake. Les listes de forums ne sont pas des preuves suffisantes. Les autres fiches image dont les chiffres n'ont pas pu etre lus restent inconnues.
- Resident Evil 2 : les apparences du catalogue de Leon, Ada et Claire evoquent le remake. Les anciens profils et les valeurs provenant d'autres jeux ne sont pas reutilises. Mr X n'est pas assimile a un autre Tyrant. Nemesis et les mutants ne recoivent aucune mesure d'une autre phase.
- Resident Evil : le [PDF officiel Prima / The Umbrella Chronicles heberge par Capcom](https://static.capcom.com/residentevil/files/REUC_PPP.pdf) a ete examine, mais l'extrait disponible ne fournit pas les mensurations recherchees. Le [manuel Director's Cut distribue par PlayStation](https://secure.cdn.us.playstation.com/manuals/classic/games/resident-evil-directors-cut-manual-en.pdf) ne justifie pas une transposition au remake.
- NieR : pas de fusion du jeune frere et du pere de Gestalt, ni de transfert de Popola Automata vers Devola Replicant. Les diverses formes d'Emil restent a distinguer. Aucun poids humain plausible n'est substitue aux masses d'androides publiees.
- Final Fantasy : les listes generalistes et conversions contradictoires ne sont pas adoptees en bloc. Les tailles de figurines et les estimations de poids de fans sont exclues.
- Batman, X-Men, TMNT, Castlevania, The Witcher et Lara Croft : la continuite exacte reste a verrouiller avant d'utiliser des chiffres de comics, films, animation ou jeux. Ne jamais substituer la taille d'un interprete.
- FF6, FF9, FF13, FF15, Chrono Trigger et Octopath : aucune valeur n'a ete retenue dans ce passage. Cela ne signifie pas qu'aucune reference primaire n'existe.

## Validation

Controle Node ESM execute apres enrichissement : PASS.

- Egalite exacte entre les 238 cles exportees et les collaborations du catalogue, sans doublon ni original.
- Objet exporte gele par `Object.freeze`.
- Schema de chaque entree et de chaque source controle ; nombres finis strictement positifs ou null, types et statuts autorises.
- Toute valeur non nulle possede une source declarant le champ concerne ; aucune source ne revendique un champ null.
- Toute entree inconnue possede deux null, la note imposee et une liste de sources vide.
- Bilan recalcule sur disque : 61 sourced, 177 unknown, 30 official, 31 secondary-only, 61 heightCm, 23 weightKg ; priorite 37/90.
- Ce controle valide la structure et la coherence des declarations, pas la veracite automatique des sites. Les liens et les editions doivent rester sujets a relecture humaine.
- Aucun test moteur/UI ni integration dans `athlete-definitions.mjs` ou `athletes.mjs` : ces fichiers sont hors perimetre.

## Relecture conseillee

Verifier d'abord les fiches officielles partagees (ONE PIECE.com et CFN), puis les trois encadres Konami, et enfin les sources secondaires prioritaires. Pour renforcer le dossier, remplacer les reprises par les pages des Ultimania / World Guides effectivement consultees, en conservant les distinctions d'edition. Si une source ne justifie plus le chiffre, remettre uniquement le champ concerne a null ; remettre le statut a unknown et la note imposee si les deux champs deviennent inconnus.
