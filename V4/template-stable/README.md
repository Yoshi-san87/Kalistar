# Kalistar V4 - Template stable Electro

## Extension complementaire 05

Kaylis / RAINBOW, Elenion / GEO, Seraphina / HEMATO, Valazar / NECRO et Malaba / NONE utilisent le meme maitre 04. Profils : `elements-02/nom/card.json`. Registre : `registry-elements-05.json`. Le moteur commun est `element-batch.jsx`, avec un point d'entree par serie. `current-elements.json` conserve les 16 cartes precedentes et ajoute les cinq nouvelles. [Methode et controles](elements-02/README.md). Les nouvelles cartes attendent la validation artistique ; la V3 et les cinq Electro restent intactes.

## Extension multi-elements 04

Pour la serie Eau / Air / Feu / Glace / Lumiere / Roche / Plantes, utiliser `current-elements.json`, `KALISTAR_V4_TEMPLATE_04_ELEMENTS.psd` et `registry-elements-04.json`. Les profils editables sont dans `elements-01/nom/card.json`. Le moteur relit ces profils a chaque rendu, avec les illustrations et composants separes ; aucune regeneration du cadre. Voir [livrables et methode](elements-01/README.md) et [galerie](../galerie-elements.html). Validation artistique utilisateur encore requise.

Cette extension ne remplace pas les cinq cartes Electro ni leur registre `current.json`. Les sections historiques suivantes restent specifiques a Electro.

## Production courante

`current.json` est l'inventaire des cinq cartes courantes et du maitre **03F**. Pour une nouvelle declinaison, dupliquer ce maitre autonome, lire `registry-electro-03f.json` et le profil, puis appeler `renderRegistered` avec les helpers de `common.jsx`. Ne pas reconstruire toute la chaine des revisions 01 a 03E : ces etapes sont historiques. Leurs PSD intermediaires ont ete retires dans le lot confirme par l'utilisateur le 17 septembre 2026. Les scripts de migration et leurs rapports restent des archives, pas les points d'entree de production. Voir `../../maintenance/cleanup-2026-09-17/RAPPORT.md`.

## Revision active : Electro 03F Rikka

Maitre : `KALISTAR_V4_TEMPLATE_03F_ELECTRO_RIKKA.psd`. Registre : `registry-electro-03f.json`. Rikka V4-03 deplace uniquement son illustration de 55 px vers la droite, a taille constante. Le fouet se degage de la colonne ATK, tandis que le reliquaire Luxo reste entier dans la fenetre. Les icones calibrees et le cadre ne changent pas. Carte reconstruite depuis le maitre sauvegarde, PSD reouverts et code-barres verifie. [Livrables et controles](rikka-revision-03/README.md). Rendu artistique a valider.

## Revision precedente : Electro 03E Rikka

Maitre : `KALISTAR_V4_TEMPLATE_03E_ELECTRO_RIKKA.psd`. Registre : `registry-electro-03e.json`. Rikka V4-02 utilise une vitrine ouverte de face avec vitre relevee. Le dodge conserve toute sa silhouette dans son cercle et le trefle est calibre sur la geometrie reelle du bord peint. Les ancres optiques deviennent des donnees `effectLayouts`, appliquees sans deplacement cumulatif. Seuls l'illustration Rikka et ces deux motifs changent ; profil de jeu et autres cartes preserves. [Livrables, diagnostic et controles](rikka-revision-02/README.md). Validation artistique utilisateur encore requise.

## Revision precedente : Electro 03D Rikka

Maitre : `KALISTAR_V4_TEMPLATE_03D_ELECTRO_RIKKA.psd`. Registre : `registry-electro-03d.json`. **RIKKA - POUR UNE VIE DE PLUS**, P2 Electro, ajoute Fouet, Felineus, dodge DEF D6 et trefle DEF D1 comme variantes separees. Une attaque magique sur D5, cinq physiques. Cadre fixe et quatre cartes precedentes verifies sans difference ; textes natifs, illustrations incorporees, barcode couleur decode. [Profil et controles](rikka/README.md). Rendu a valider et balance a confirmer en parties ; V3 inchangee.

## Revision precedente : Electro 03C Momo Bal

Maitre : `KALISTAR_V4_TEMPLATE_03C_ELECTRO_MOMO_BAL.psd`. Registre : `registry-electro-03c.json`. Cette extension ajoute **MOMO - LE BAL DES OBJETS PERDUS** avec son illustration V3 intacte, positions **3 et 4**. Geometrie inchangee, textes natifs, illustration et code-barres incorpores, effets separes. Carte : `../cartes/MOMO_BAL_V4_01_TEMPLATE_ELECTRO.png`. Profil : `momo-bal/card.json`. Documentation et controles : `momo-bal/README.md`. Momo original, Taulio et Jelly-Joe Encre sont reproduits pixel pour pixel par le nouveau maitre ; leurs fichiers approuves restent intacts.

## Revision precedente : Electro 03B Encre

Maitre : `KALISTAR_V4_TEMPLATE_03B_ELECTRO_ENCRE.psd`. Registre : `registry-electro-03b.json`. Geometrie identique a Electro 03, avec l'illustration Jelly-Joe Encre 08B incorporee. Profil actif de Jelly-Joe : `jelly-joe-encre/card.json`, positions **3 et 5** sur demande utilisateur. Carte : `../cartes/JELLY_JOE_V4_03_ENCRE.png`. Documentation et controles : `jelly-joe-encre/README.md`. Les precedentes revisions restent conservees.

## Revision precedente : Electro 03

Maitre : `KALISTAR_V4_TEMPLATE_03_ELECTRO.psd`. Registre : `registry-electro-03.json`. Les trois cartes sont produites avec la meme geometrie de positions (+12%, cinq emplacements horizontaux) et des ombres natives. L'illustration Jelly-Joe 02 est incorporee separement. Fichiers, profils et controles dans `revision-03/README.md` ; les versions 01/02 et les cartes precedentes restent conservees. Les specifications suivantes documentent la base anterieure.

## Extension Electro 02

Le template `KALISTAR_V4_TEMPLATE_02_ELECTRO.psd` ajoute Jelly-Joe : illustration, Tantalak, Crabazar, Lance et nouveaux emplacements d'effets. Le cadre reste celui du template 01, qui est conserve. Voir `jelly-joe/README.md` et `registry-electro-02.json`. Le moteur commun `../scripts/stable/registered.jsx` pilote les variantes par leurs donnees.

## Reference et livrables

Reference visuelle validee : `../templates/MOMO_V4_10_FONDS_RECENTRES.psd`. Elle reste intacte.

- Maitre reutilisable : `KALISTAR_V4_TEMPLATE_01.psd`.
- Premiere declinaison : `../templates/TAULIO_V4_01_TEMPLATE_STABLE.psd`.
- Export : `../cartes/TAULIO_V4_01_TEMPLATE_STABLE.png`.
- Donnees de Taulio : `taulio.json`.

Le canevas est fixe : **897 x 1497 pixels, 300 ppp, sRGB**. Le maitre reproduit Momo V4-10 sans difference de pixels. Le rendu Taulio attend la validation artistique de l'utilisateur ; les anciens essais du dossier `../master/` ne sont plus la base de travail.

## Elements editables

- Nom, titre, metier, race, description et valeurs ATK/DEF : textes Photoshop natifs. Les valeurs utilisent la typographie de Momo et sont recentrees sur leurs glyphes.
- Six fonds or : objets dynamiques et masques vectoriels de Momo V4-10, avec assombrissement natif conserve.
- Effets et barrieres : calques separes de leurs supports. Taulio utilise des attaques physiques, le bouclier et le buff ATK ; seule sa DEF D2 possede une barriere.
- Illustration et code-barres : objets dynamiques incorpores. L'illustration Taulio et son cadrage viennent de son PSD V3, sans regeneration.
- Arme : pictogramme Poing V3 en objet dynamique, oriente vers l'exterieur. L'email interieur est distinct du cerclage V4 fixe.
- Positions : cinq emplacements horizontaux de largeur constante, sans redimensionnement du support. Momo utilise deux emplacements (3, 4), Taulio un seul (1).
- Cristal, branches colorees, race et drapeau : elements separes herites de la base validee. Leur geometrie ne change pas pour Taulio.

Les masques d'ecretage du groupe `06 CADRE FIXE ET ILLUSTRATION` font partie de la structure. Ne pas rompre leur chaine ni redimensionner le groupe. Le code-barres et sa teinte sont independants ; un identifiant visuel n'est pas une preuve d'authenticite ou de propriete.

Pour les icones, le rectangle du calque et les reperes numeriques ne definissent pas necessairement le centre du disque peint. Mesurer le motif visible ET le cerclage interieur, enregistrer leur calibration dans `effectLayouts`, puis verifier visuellement le rendu. Un ajustement au carre peut depasser un cercle : controler le contour alpha complet avec une marge, et verifier qu'une seconde application ne change aucun pixel. Ne pas reporter les anciens decalages relatifs sur un nouveau support.

## Portee du template

Cette revision est calibree pour la famille **ELECTRO / Chroma / Robot** et demontree avec Momo et Taulio. Les autres races, factions et effets non encore prepares doivent enregistrer leur asset et leur cadrage une seule fois. Le rendu refuse une combinaison non calibree au lieu de substituer silencieusement un mauvais element.

Les variantes Momo et Taulio sont presentes en calques distincts, sans modification des objets dynamiques partages. Les anciennes valeurs, descriptions et composants V3 situes sous le masque du bas restent comme provenance, pas comme champs actifs du bas V4.

## Production et verification

Scripts dans `../scripts/stable/` :

1. `build.jsx` : cree le maitre depuis Momo V4-10, ajoute les champs absents et les variantes masquees. A executer dans Photoshop.
2. `render.jsx` : lit `taulio.json`, applique uniquement les contenus dynamiques, exporte le PSD et le reouvre.
3. `prove.jsx` : exporte le cadre sans contenus variables, une variante a cinq positions et une valeur de test.
4. `verify.cjs` : compare les pixels, verifie les textes natifs, les mecanismes V3 et les empreintes des sources ; produit le PNG sRGB final.
5. `verify-barcode.py` : decode le code-barres du rendu final en couleur et en niveaux de gris.

Rapports : `build.json`, `render.json`, `verification.json`, `barcode-verification.json`.

Les preuves visuelles sont `MOMO-preview.png`, `TAULIO-preview.png`, `small-size-comparison.png`, `TAULIO-lower.png`, `TAULIO-right.png`, `TAULIO-barcode.png` et `five-positions-preview.png`.

La V3, le site, la BDD et les sources ne sont pas modifies. Ces fichiers sont des epreuves RGB : ils ne constituent pas un BAT CMJN ; la lecture du code-barres apres impression doit etre testee physiquement.
