# QA illustrations V4 - eau, feu, glace

Date : 2026-09-17. Controle illustration termine ; validation de la carte assemblee reservee au parent.

## Production et integrite

- Trois appels builtin image_gen, un par illustration. Aucun appel CLI.
- Sources des trois personnages et references Momo/Valazar inspectees avec view_image avant generation.
- Prompts et script crees via apply_patch dans le perimetre autorise.
- PNG generes copies par PowerShell, sans retouche deterministe, recadrage ou reecriture des fichiers finaux. Identite SHA256 entre chaque sortie generee et sa copie finale verifiee.
- Les trois PNG font 1122 x 1402 pixels. L'ecart de ratio par rapport a 737 x 921 est de 0.008517 %, negligeable pour l'integration.
- Aucun fichier existant, V3, PSD ou template modifie ; Photoshop non lance.
- provenance.json conserve chemins absolus, sources V3, lore d'origine, references, empreintes SHA256 et prompts exacts.

## Inspections effectuees

- Trois PNG finaux ouverts avec view_image.
- Trois apercus de fenetre 737 x 921 ouverts avec view_image.
- Planche reduite de 240 x 300 par personnage ouverte avec view_image : qa/contact-240.png, ordre Ruby, Darnako, Malinia.
- Detail Malinia avant/apres ouvert avec view_image : qa/malinia-stone-before-after.png, source a gauche, V4 a droite.
- Controle de la famille picturale par comparaison visuelle aux sources Momo et Valazar : touches visibles, volumes peints, matieres patinees, lumieres motivees ; aucune derive photographique ou anime constatee.
- Aucun texte, cadre, logo, interface ou filigrane visible dans les illustrations.

## Ruby

Statut : retenue pour integration.

- Sirene adulte a peau bleue et cheveux rouges ; habits et identite de la source reconnaissables.
- Joie nettement accentuee : grand sourire ouvert, joues relevees, regard dirige vers le dauphin, contact de la main sous son rostre. Pas de regard vers le spectateur.
- Deux dauphins distincts participent a la scene ; mouvement de nage et cheveux flottants coherents.
- Deux bras et une seule queue de sirene continue avec nageoire caudale. Aucun ajout de jambes humaines ; exception lore respectee.
- Deux mini-pistolets harpons visibles dans les etuis de hanche ; aucun tir.
- Visage et interaction principale lisibles au centre ; queue entiere lisible au petit format.
- La main d'equilibre a gauche est proche de la marge mais n'est pas le geste narratif principal. Le dauphin principal se prolonge hors champ a droite ; sa tete et le contact restent bien visibles. Garder l'image entiere, sans zoom additionnel.
- La composition garde une parente visuelle avec la source, mais le contact, la forte emotion et le second dauphin renouvellent l'instant raconte.

## Darnako

Statut : retenue pour integration.

- Un seul personnage, adulte, Drax humanoide a tete de dragon rouge et cornes sombres. Aucun enfant, apprenti ou autre silhouette humaine.
- Scene de sauvetage remplacee : position debout en appui large, torse engage, regard dur et determine vers une menace hors champ.
- Une seule epee longue, en cours de degainage, avec main sur la poignee et autre main sur le fourreau a la hanche opposee. Diagonale de lame lisible et raccord lame/fourreau coherent.
- La pointe est encore engagee dans le fourreau : il s'agit de l'instant precedant l'attaque, pas d'une attaque deja portee.
- Deux bras et deux jambes lisibles. Le bas de la jambe de gauche est partiellement masque par les outils du premier plan, sans anomalie anatomique evidente.
- Identite de forgeron de Vulkar presente : tunique et protections usees, fourneau, enclume, marteau et outils de forge.
- Contraste dirige sur tete, mains et lame ; tension agressive perceptible a 240 pixels de large.
- La main de la poignee est dans la partie gauche du champ. Garder l'image entiere et verifier sa visibilite sous le template reel ; ne pas centrer uniquement sur le visage.
- Le lore de sauvetage de V3 est archive tel quel dans la provenance, pas presente comme description de cette nouvelle scene. Aucune modification de la base V3.

## Malinia

Statut : retenue pour integration.

- Suppression confirmee des deux petits personnages et visages dans la pierre tenue. L'interieur montre maintenant des facettes et inclusions minerales abstraites, sans portrait ni scene.
- Forme externe, taille, position et lumiere doree de la pierre visuellement conservees.
- Physionomie, cheveux argentes, yeux fermes, expression, vetements, gants, pose penchee et mains restent visuellement tres proches de la source.
- Lac des souvenirs, glace fissuree, montagnes, lumiere du soir et sceptre preserves dans la composition.
- Le reflet de Malinia dans la glace reste present volontairement : la suppression demandee concerne l'interieur de la pierre seulement.
- Retouche generative : pas de garantie d'identite pixel a pixel hors pierre. De legeres differences de touches ou reflets existent ; aucune modification volontaire de la pose, du visage ou des habits.
- Aucun recadrage applique pour preserver l'illustration aimee. Visage et pierre gardent leurs positions centrales ; le sceptre reste secondaire pres du bord droit, comme dans la source.

## Decision et suite parent

Aucune regeneration corrective jugee necessaire apres ces inspections. Les trois fichiers _V4_01 sont les selections finales de ce lot.

Integrer les PNG originaux, pas les apercus QA. Recommandation : afficher l'image entiere dans la fenetre 737 x 921, puis controler les masquages effectifs du template. Aucun controle PSD, de cadre, de texte de carte ou de code-barres n'a ete realise dans ce scope.
