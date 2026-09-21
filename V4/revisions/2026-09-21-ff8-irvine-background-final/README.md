# Continuation finale : fond Irvine

Statut : publie et verifie. Voir `RESULTAT.md` et `transaction.json`.
Les commandes ci-dessous decrivent la procedure executee, pas un travail restant.

Reprise de `../2026-09-21-ff8-refinements/`, verifiee mais NON publiee.
Les quatre autres rendus natifs sont recopies a l'identique. Seul Irvine
est prepare et rendu a nouveau ; la verification porte ensuite sur les cinq.
Les corrections Zell ELECTRO et recit Seifer restent celles du batch precedent.

## Reprise

Ne plus lancer le helper precedent, notamment son `publish`. Ne remplacer
aucun de ses arts, scripts, snapshots, fichiers de travail ou preuves.
Depuis la racine Kalistar :

```powershell
$r = 'V4/revisions/2026-09-21-ff8-irvine-background-final/revise.cjs'
node $r prepare 'C:/Users/guill/.codex/generated_images/019e30c1-21b0-7e11-9f9d-2fe692f111d2/exec-805efbfc-dcd5-4681-8e2c-45da4443d0f4.png'
node $r render
node $r verify
# Inspecter work/irvine/card.png, puis publication explicite des cinq cartes :
node $r publish
node V4/collaborations/ff8-set-01/publish.cjs
```

Le chemin PNG est optionnel si le nouveau fichier est deja dans ce dossier
sous `art/irvine.png`. Le PNG fourni est importe localement sans modifier sa
source. Son chemin et son hash sont conserves dans `lineage.json`.
Sans argument, le helper affiche seulement son etat.

## Garanties

`prepare` exige la verification initiale reussie (`reused: 12`), aucune
transaction de publication initiale et un verrou disponible. Il recontrole
toutes les entrees, sauvegardes, sorties natives et fichiers stages precedents.
Il copie les anciens `before.json` et `verified.json` sous `previous/`, et les
sauvegardes originales sous `originals/`. Les manifests precedents ne changent pas.

Le nouveau `before.json` conserve TOUTES les anciennes observations et ajoute
les nouvelles, sans remplacer une empreinte. Les quatre rendus reutilises sont
eux aussi figes. L'ancien Irvine reste conserve, mais ses rendus/proofs ne sont
pas importes dans le nouveau travail Irvine. Seuls son illustration, son
composant et son composite attendu sont reconstruits avant le rendu unique.
Les prompts et references de generation initiaux restent dans le dossier parent.

`verify` refait les controles des cinq cartes et le preflight du publisher.
`publish` et `rollback` conservent le flux teste : memes cibles, IDs et UUID,
migration explicite des preparations, catalogue en dernier et restauration
sur echec. Aucun rendu, preparation ou publication reel n'a ete execute lors
de l'implementation. Une preparation interrompue doit etre inspectee avant
reprise ; les sauvegardes ne sont jamais ecrasees.

```powershell
node $r rollback
node --test --test-isolation=none V4/revisions/2026-09-21-ff8-irvine-background-final/continuation.test.cjs
```

Tests de transaction en memoire uniquement. Les trois modules natifs et de
validation sont des copies identiques du parent ; aucune abstraction partagee
ni aucun ancien helper n'a ete modifie.
