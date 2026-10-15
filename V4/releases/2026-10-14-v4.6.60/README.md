# Kalistar 4.6.60 : les rapieres de Kaylis

## Contenu

- La Promesse Blanche devient Promesse ; identifiant, images, effets et sauvegardes conserves.
- Ajout d’Eclipse (ARM-063), rapiere noire et rouge avec magie legere autour de la poignee.
- Trois images generees separement : objet, scene peinte, cercle personnalise.
- Meme puissance que Promesse : +20 ATK uniquement sur un 6 numerique conserve.
- Restriction Kaylis + famille Epée courte ; aucune carte native ni matrice modifiee.

## Portee

Publication apres les versions Map58 puis Collection59, sans leurs changements
inacheves. Aucun changement de schema des sauvegardes, ni du moteur.
Sources et prompts : ../../revisions/2026-10-14-kaylis-rapiers/.

## Validation

158 tests cibles et de regression reussis avant publication, dont huit parties
natives completes consacrees aux deux rapieres.
Parcours navigateur PC, Razr50 et compact Reduced Motion : equiper, remplacer,
retirer, recharger, inspection Deck et Arene, activation et resize.

Le script verify-release.cjs exporte exclusivement l’index autorise dans un
snapshot isole, hydrate les objets LFS par hash, execute les tests cibles
equipements, sauvegardes, compositions et publication puis construit le site.
Le workflow GitHub Pages rejoue ensuite sa suite complete avant de deployer.
Le rapport qa/publication.json consigne les resultats effectifs.
Build exact : 377 cartes, 1 381 fichiers, 899.588 MiB (verrou 900 conserve).
Le test navigateur Kaylis est ensuite rejoue contre ce build exact.

Le script verify-public.cjs controle la version et les hashes des quatre
nouveaux exports et des deux manifestes JS sur les deux hebergeurs apres push.
