# Barret - race CYBORG

Revision strictement limitee a Barret `43698921` : `HUMAIN` devient `CYBORG`
dans le profil, le texte natif RACE et son embleme. Conserver ID, UUID de creation,
illustration, textes hors race, statistiques, positions, arme, cristal et faction
FF7. Aucune nouvelle carte, aucun changement de moteur.

## Sources et priorite

La demande utilisateur de changement de race prime sur la race historique FF7.
Respecter les [consignes V4](../../AGENTS.md), le
[guide de reprise](../../../docs/GUIDE_REPRISE.md) et les
[regles](../../docs/REGLES_JEU.md). Avant revision, les sources actives sont
`V4/collaborations/ff7-set-01/cards/barret/` et `V4/creations/43698921/` ;
elles doivent concorder. Conserver notamment l'illustration Mako de la
[revision precedente](../2026-09-20-barret-original-mako/README.md).

L'embleme original est `V3/assets/races/CYBORG.png`. Son composant calibre est
prepare par le [pilote NieR](../../collaborations/nier-pilot-01/README.md), sans
modifier V3 ni la banque verrouillee. Ne pas regenerer le personnage ou le cadre.

## Commandes

Depuis la racine Kalistar, apres la fin de tout rendu NieR :

```powershell
node V4/revisions/2026-09-23-barret-cyborg/revise.cjs check
node V4/revisions/2026-09-23-barret-cyborg/revise.cjs prepare
node V4/revisions/2026-09-23-barret-cyborg/revise.cjs render
node V4/revisions/2026-09-23-barret-cyborg/revise.cjs verify
```

`prepare` conserve les originaux et fige les sources ; il n'est pas reentrant.
Ne pas effacer `originals/` pour le relancer. `render` utilise Photoshop sous le
verrou commun. `verify` prepare les remplacements dans `staging/` et execute le
preflight FF7 sur ces fichiers, sans les publier. Attendre la revue du parent.

```powershell
node V4/revisions/2026-09-23-barret-cyborg/revise.cjs publish
```

Publier Barret avant NieR lorsque `before.json` existe deja : une publication
intermediaire modifie le catalogue observe et doit faire echouer le controle.
Ne modifier aucun fichier observe pendant la transaction, ni rebaser ses hashes.
En cas de transaction interrompue, inspecter `transaction.json` avant toute
action ; `revise.cjs rollback` n'est autorisable que si chaque cible correspond
encore a son etat avant ou a son remplacement attendu. Une modification externe
doit bloquer la restauration, pas etre ecrasee.

## Verification et etat

Les controles exigent profils differant uniquement par `race`, autres calques
semantiquement identiques, pixels identiques sans les deux calques de race,
aucun changement hors de leurs zones, puis `B.verifyNative` : champs et
description natifs, composants, PSD rouvert et code-barres `43698921`.
Le profil, les preuves FF7, le plan de composition, `creation.json` et le catalogue
sont mis a jour ensemble ; aucun rafraichissement global des verrous.

Ce README n'affirme pas que la revision est publiee. Consulter `before.json`,
`verified.json` et surtout `transaction.json.state`, puis verifier les fichiers
actifs. `check` indique seulement la presence de l'icone et de la preparation.
`state: publishing` exige une investigation ; seul `published`, accompagne de
preuves concordantes et du preflight FF7, etablit une publication terminee.
Une seconde commande `publish` n'est pas actuellement un no-op idempotent.
