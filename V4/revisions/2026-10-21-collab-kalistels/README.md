# Kalistels Des Collaborations

Revision demandee par l'auteur le 21 octobre 2026. Onze cartes sans cristal
recoivent une affinite. Koby (49800306, koby-op) est l'exception explicite et
reste sans cristal. [Regles](../../docs/REGLES_JEU.md).

| Personnage | Kalistel | Intention |
| --- | --- | --- |
| Ward | Roche | Solidite du gardien |
| Kiros | Air | Mobilite des deux lames |
| Cina | Terre | Appui solide du machiniste |
| Locke | Air | Agilite du voleur |
| Edgar | Electricite | Ingenierie et mecanismes |
| Shadow | Tenebres | Discretion de l'assassin |
| Cyan | Lumiere | Honneur et serment |
| Gogo | Air | Souplesse du mime |
| Gladiolus | Roche | Rempart du groupe |
| Prompto | Lumiere | Photographies et souvenirs |
| Cindy | Electricite | Energie des moteurs |

Ces associations sont des choix Kalistar, pas des affirmations sur les regles
elementaires des jeux d'origine. Aucun Rainbow ajoute.

## Perimetre

Seuls element, color et hue changent dans le profil. Aucun nouvel identifiant,
exemplaire, sort, barriere, effet, valeur ATK/DEF, position, arme ou illustration.
Les coefficients +30/-30 et les cycles existants restent applicables. L'ajout
du cristal modifie donc reellement les matchups et l'affinite d'arene selon le
moteur actuel, pas seulement le visuel. Les faces restent toutes physiques.

Les PSD existants sont dupliques, pas reconstitues : remplacement des huit
composants elementaires (six fonds ATK, branches, cristal), recoloration des
textes JOB/RACE, sans changement de leur contenu ou geometrie. Les illustrations,
armes blanches et bannieres courantes restent identiques. Les originaux sont
conserves sous originals/. Aucun verrou ou rapport historique n'est reecrit.

## Production Et Verification

revise.cjs prepare fige les sources et leurs empreintes. render utilise le pont
Photoshop sequentiel, verify controle cadre, differences hors perimetre,
textes editables, reouverture et codes-barres. publish installe les fichiers
verifies avant le catalogue avec un journal de transaction sous work/.

Les tests verifies par compatibility.cjs projettent seulement cette revision
exacte pour comparer les anciennes publications : toute autre modification du
profil, de l'identite, de la preuve ou des champs autorises est rejetee.
Les tests courants verifient les onze nouvelles affinites, les 132 faces,
les matchups, onze matchs complets et la conservation des anciens snapshots.
Les tests navigateur s'executent dans un profil jetable, jamais dans la
collection personnelle. Sources graphiques sauvegardees hors checkout avant
publication ; seuls les registres et fichiers texte rejoignent Git.
