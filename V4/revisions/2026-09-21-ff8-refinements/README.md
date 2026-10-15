# FF8 : quatre illustrations et Zell ELECTRO

Statut final : lot verifie mais NON publie, remplace par
`../2026-09-21-ff8-irvine-background-final/` apres la correction du decor Irvine.
Ne plus lancer les commandes de publication de ce dossier.

Une transaction pour cinq cartes, basee sur le helper de retouche teste.
Les images et prompts restent la responsabilite du parent :

- `art/seifer.png` : assis en classe a Balamb, pieds sur le bureau.
- `art/squall.png` : Revolver authentique plus long, pas plus large.
- `art/ward.png` : cadrage elargi montrant le harpon.
- `art/irvine.png` : cadrage legerement rapproche.
- Zell : aucune nouvelle illustration. L'art actuellement publie est conserve.

Seifer recoit aussi la correction narrative exacte : premiere phrase
« À Balamb, Seifer pose les pieds sur son pupitre, sourire insolent. ».
La suite est conservee octet pour octet. Le resultat fait 210 caracteres
(exception explicite a la cible indicative 190-205), toujours quatre lignes
maximum. Titre, metier et statistiques ne changent pas.

Aucun fichier de production n'est modifie avant `publish`. Aucun script des
revisions precedentes, moteur partage, banque, reference, V3 ou FF7 n'est edite.

## Commandes

Attendre la fin des autres transactions. Finaliser les quatre PNG avant prepare.
Depuis la racine Kalistar :

```powershell
node V4/revisions/2026-09-21-ff8-refinements/revise.cjs
node V4/revisions/2026-09-21-ff8-refinements/revise.cjs prepare
node V4/revisions/2026-09-21-ff8-refinements/revise.cjs render
node V4/revisions/2026-09-21-ff8-refinements/revise.cjs verify
# Inspecter les cinq work/<key>/card.png avant publication explicite.
node V4/revisions/2026-09-21-ff8-refinements/revise.cjs publish
node V4/collaborations/ff8-set-01/publish.cjs
```

Sans argument : inventaire en lecture seule. Seul `render` lance Photoshop.
Ne plus changer les entrees ou scripts apres prepare. Les sauvegardes originales
ne sont jamais ecrasees ; un prepare interrompu doit etre examine avant reprise.
La conversion attend Zell PYRO et derive sa palette ELECTRO des references
validees via le modele FF8 existant, sans aucune modification de ce modele.

## Preuves

Pour les illustrations : meme remplacement d'objet dynamique que les
revisions precedentes. Zero pixel different sans art et hors zone d'illustration,
calques/texte/geometrie identiques, ancien PNG conforme au PSD original,
sauf la seule exception narrative Seifer decrite ci-dessous.
Ward conserve ses preuves NONE eteint et ses composants sans magie.

Pour Seifer : les seuls champs narratifs modifies sont description dans le set
et description/text dans les deux profils et le profil du catalogue. Le calque
DESCRIPTION reste editable ; E.setDescription du pipeline existant l'equilibre
sans modifier la police ni la taille. Le natif doit rester sur quatre lignes.
Le masque autorise uniquement l'art et les anciennes/nouvelles bornes du texte,
elles-memes limitees a la zone narrative. Sans art ET DESCRIPTION, le rendu doit
etre strictement identique. Les autres calques et toutes les couleurs sont figes.

Pour Zell : seuls element/color/hue changent dans le profil ; seul element
change dans sa fiche du set. Les stats, positions, magie, barrieres, effets,
armes, textes, faction, IDs et UUID restent identiques. Le PSD existant est
duplique, sans recomposer le texte ou l'illustration. Les composants remplaces
proviennent exclusivement des assets ELECTRO valides : cadre ELECTRO,
six fonds ATK correspondant aux modes deja presents, branches et cristal.
Les geometries natives proviennent du manifeste. Les libelles JOB et RACE
gardent leurs contenus, police, taille et position et prennent la couleur ELECTRO.

Le masque autorise est calcule pixel par pixel depuis les differences RGBA
des anciens et nouveaux composants a leur position native. Un cadre de taille
pleine n'autorise donc pas une modification sur toute la carte. Seules les
bornes des deux libelles colores sont ajoutees. Zero pixel peut changer ailleurs.
L'illustration isolee doit etre strictement identique ; de meme pour le rendu
sans les composants/libelles autorises. Tous les autres calques sont compares,
avec controle des textes editables et des couleurs apres reouverture.

Les cinq cartes doivent passer la reouverture PSD, le code-barres et le controle
de composants du builder FF8 existant. Le preflight du publisher existant est
execute en lecture seule sur les fichiers stages, puis sur la production :
`added: 0`, `reused: 12`, deux presets de dix cartes et arene/faction compatibles.

## Empreintes Et Publication

Toutes les entrees de toutes les preparations sont validees avant toute migration.
Le nouveau set ne differe que par Zell.element et Seifer.description. Son hash est mis a jour dans
les douze `preparation.json` : ce changement intentionnel est detaille par
chemin dans `verified.json.setChange`, avec ancien et nouveau hash du set.

- Sept cartes sans retouche : uniquement l'empreinte de `set.json`.
- Trois retouches art : set et les quatre empreintes d'illustration habituelles.
- Seifer : memes empreintes, plus celle du profil corrige.
- Zell : set, profil, plan de composition, composite attendu et neuf composants.

Aucune autre empreinte, notamment les snapshots de references ou sources,
n'est recalculee pour dissimuler une divergence. Les medias et preuves des deux
emplacements, les preparations, les previews individuelles existantes,
`creation.json` et la preuve agregee sont synchronises. Le contact sheet global
n'est pas regenere. Le catalogue est installe EN DERNIER, avec seulement le
profil et l'element de l'entree Zell et le recit du profil Seifer modifies,
sans nouvelle entree ni nouvel UUID.

Chaque etape active tient `render.lock` en `wx`. Les installations sont faites
par fichier temporaire voisin et renommage ; les lecteurs ignorant le verrou
peuvent voir un etat intermediaire multi-fichiers. En cas d'erreur, rollback
automatique depuis les sauvegardes. Apres interruption, le journal permet :

```powershell
node V4/revisions/2026-09-21-ff8-refinements/revise.cjs rollback
node --test --test-isolation=none V4/revisions/2026-09-21-ff8-refinements/revise.test.cjs
```

Un verrou abandonne doit etre examine manuellement. Aucun dossier de carte n'est
supprime. Le rollback refuse d'ecraser un changement independant ulterieur.
Une seconde publication verifie l'etat et ne reecrit rien. Les tests de transaction
restent entierement en memoire, y compris le faux rendu natif ; les fonctions de
masque sont aussi testees sur des pixels RGBA. La suite FF8 accepte les deux etats
autorises de Zell, avant/apres transaction, sans changer le set canonique en avance.
