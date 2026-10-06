# Kalistar 4.5.39 - Grimoire droit et cristal Minero

Publication du 6 octobre 2026, apres la livraison Equipements 4.5.38.
Version PC/telephone et assertions synchronisees ; tag `v4.5.39`.

## Couverture Story

Le Tome I ferme devient un livre de face, droit, en cuir gris neutre.
Son cristal est le Minero gris/argente avec le sertissage dore existant,
a la place du Rainbow. Les ferrures et la peinture restent dans la DA Kalistar.
Le titre est toujours du HTML accessible. Au survol, le livre se souleve
legerement sans s'incliner. Clavier et Reduced Motion sont preserves.

Le nouvel asset est `V4/site/assets/ui/story-closed-grimoire-v2.webp`,
1024 x 1536 avec transparence, 671 166 octets. Original et prompt exact
de l'edition par l'outil image integre sont conserves dans la
[revision](../../revisions/2026-10-06-story-minero/README.md).
Le v1 et le grimoire ouvert approuve restent preserves.

Le roman, ses illustrations et le repere de lecture ne changent pas.
Le manuscrit conserve 113 472 mots et son SHA256
`e6f3468b33b786156cb98ddaf48cc152fea2e8980e6cedf2a44a39fb797d2cef`.

## Telephone Et Publication

Le controle Story a detecte un libelle Equipements trop large dans la
navigation a 320 px. Sous 360 px, deux colonnes recoivent une largeur minimale
adaptee sans reduire la police ni les cibles tactiles.

Le workflow 4.5.38 a aussi revele un deuxieme import de Sharp dependant
du poste Windows dans `weapons-arsenal.test.cjs`. Le correctif coordonne
remplace cet import par le chargement portable de `KALISTAR_NODE_MODULES`,
deja fourni par le workflow, avec le runtime local comme repli.
Tous les controles d'alpha et de media restent executes, sans toucher
aux donnees, regles, sources natives ou verrous des equipements.

## Verification

- 16 tests Story/contenu/build/PWA/performance passes.
- Navigateur Story sur sept viewports PC/telephone, dont 320x568 et 844x390.
- Nouveau fichier v2 charge, survol sans rotation, titre au-dessus du cristal.
- Ouverture, fermeture, reprise, preferences, clavier, Reduced Motion,
  illustrations et navigation pendant le chargement preserves.
- Captures relues : `V4/revisions/2026-10-06-story-minero/verification/`.
- Workflow complet de l'index teste en copie isolee : 298 tests passes,
  build de 232 cartes et 739 fichiers ; rapport `workflow-results.json`.
- Navigateur du build Pages : couverture, lecture et reprise PC/telephone
  verifiees. Controle general Collection, Decks, Arene, telechargements et
  sauvegardes passe, sans erreur HTTP ni navigateur.

Les changements non lies ou inacheves du checkout ne font pas partie du lot.
