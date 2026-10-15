# FF8 : retouches d'illustration uniquement

Cibles fixes : Linoa, Irvine, Laguna, Zell, Seifer. Aucun nouveau profil,
identifiant, texte, chiffre, effet, cadre ou chemin du catalogue.
Les illustrations et les consignes artistiques restent sous la responsabilite
du parent. `prompts.json` et les sources approuvees ne sont jamais reecrits.

## Execution manuelle

Depuis la racine Kalistar, deposer les cinq PNG dans ce dossier :
`art/linoa.png`, `art/irvine.png`, `art/laguna.png`, `art/zell.png`, `art/seifer.png`.

```powershell
node V4/revisions/2026-09-21-ff8-details/revise.cjs
node V4/revisions/2026-09-21-ff8-details/revise.cjs prepare
node V4/revisions/2026-09-21-ff8-details/revise.cjs render
node V4/revisions/2026-09-21-ff8-details/revise.cjs verify
# Examiner les cinq work/<key>/card.png avant cette commande explicite :
node V4/revisions/2026-09-21-ff8-details/revise.cjs publish
node V4/collaborations/ff8-set-01/publish.cjs
```

Sans argument : inventaire en lecture seule. `prepare`, `render` et `verify`
ne changent pas la production. Seul `render` lance Photoshop, via le pont
existant ; il duplique les PSD sauvegardes et remplace leur objet dynamique
`ILLUSTRATION - cadrage`, sans recomposer les textes ni le cadre.
Le cadrage reste celui de Barret : PNG 737 x 921, cover, position (80, 156).

`prepare` exige un preflight FF8 deja publie (`added: 0`, `reused: 12`), toutes
les preparations intactes et les cinq nouvelles images. Il sauvegarde les
octets originaux, dedupliques par SHA-256 avec extension, sous `originals/`.
Il refuse de remplacer une sauvegarde existante. Ne plus modifier les arts,
le helper ou les sources apres preparation. Une preparation interrompue
necessite de conserver/deplacer ses sauvegardes avant de recommencer.

`verify` exige : ancien PNG identique au PSD original ouvert, zero pixel
different sans illustration, zero pixel different hors rectangle d'art,
calques/textes/geometrie identiques, reouverture du PSD identique, code-barres
correct et controle des composants FF8 existant. Les IDs internes de calques
peuvent changer a la reouverture, pas leurs proprietes. Les empreintes des
preuves et des fichiers de staging sont figees avant publication.

`publish` tient `render.lock` avec ouverture exclusive `wx`, comme toutes les
etapes actives. Il valide le preflight sur les fichiers stages, puis installe
chaque fichier par temporaire voisin et renommage. Il synchronise les deux
copies PNG/PSD/illustration/preuve, les previews individuelles existantes,
les composants et preuves natives de production, les quatre empreintes
d'illustration de `preparation.json`, les hashes de `creation.json` et la preuve
agregee des douze cartes. Les UUID de creation et les autres proprietes restent
intacts. Le contact sheet global n'est pas regenere par cette retouche.
`catalogue.json`, tous les profils, les sept autres FF8, FF7, V3, les banques
et les references restent inchanges. Le preflight final doit reutiliser les 12.

## Retour arriere et tests

```powershell
node V4/revisions/2026-09-21-ff8-details/revise.cjs rollback
node --test --test-isolation=none V4/revisions/2026-09-21-ff8-details/revise.test.cjs
```

La transaction multi-fichiers n'est pas atomique pour les lecteurs ne respectant
pas le verrou. En cas d'erreur, le helper restaure automatiquement les fichiers
depuis les sauvegardes. Apres interruption du processus, le journal
`transaction.json` permet `rollback`. Un verrou abandonne doit etre examine
manuellement : le helper ne supprime jamais le verrou d'un autre processus.
Un rollback refuse d'ecraser une modification independante ulterieure ; aucun
dossier de carte existant n'est supprime. Un second `publish` revalide et ne
reecrit rien. Les tests utilisent un disque et des commandes natifs simules
en memoire : aucun Photoshop, rendu reel ni publication de production.
