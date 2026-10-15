# Terre-plantes V4_01 - Livraison au parent

## Fichiers finaux

Tous les chemins sont relatifs a la racine Kalistar.

- V4/assets/illustrations/elements-01/terre-plantes/LOK_V4_01.png
- V4/assets/illustrations/elements-01/terre-plantes/BALMHYR_V4_01.png
- V4/assets/illustrations/elements-01/terre-plantes/MAGNAR_V4_01.png
- V4/assets/illustrations/elements-01/terre-plantes/VICTORVINE_V4_01.png

PNG natifs de 1122 x 1402 pixels, sans recompression ni retouche deterministe.
Une seule generation builtin image_gen par illustration, quatre appels au total.
Aucun CLI, aucun Photoshop. Aucun fichier preexistant ecrase; V3 et PSD intacts.

## Controle visuel

Sources et sorties inspectees via view_image, puis contact sheet a 221 x 276 par image.
Ordre gauche-droite: Lok, Balmhyr, Magnar, Victorvine.
Les quatre illustrations gardent la facture peinte Momo/Valazar, sans cadre ni texte.

- Lok: roi nain sur le trone, mains crispees et regard inquiet; fonderie supprimee.
- Balmhyr: carrure naine, regard grave, mains stables sur la hache; autorite calme d'ancien roi. Durane et ours conserves; aucune apparence Star Wars.
- Magnar: anatomie humaine continue sous une peau de granit, visage humain, deux bras et deux jambes. Aucun assemblage de blocs ou joint mecanique.
- Victorvine: geste protecteur et emotion conserves, corps accroupi entier et echelle humaine. Foret moderement abimee, contamination suggeree par un drain; aucun decor apocalyptique.

## Points pour l'integration

- Utiliser l'image complete dans la fenetre 737 x 921. Ecart de ratio relatif: 0.00852 %, soit environ 0.063 pixel de largeur a hauteur 921.
- Magnar: visage assez haut dans la composition; ne pas zoomer ni rogner le haut. Le parent doit verifier les recouvrements du template.
- Victorvine: ne pas resserrer le cadrage, afin de conserver l'echelle humaine corrigee.
- Lok: la vieille fiche V3 parle encore de fonderie. Elle n'a pas ete modifiee; adapter les textes V4 si necessaire dans le scope du parent.
- Balmhyr: sagesse exprimee par la posture et le regard; aucune magie ou iconographie supplementaire inventee.
- Les cartes completes, PSD reouverts et controles de cadre/statistiques/barcode ne sont pas dans ce lot; ils restent au parent.
- Aucun defaut bloquant constate sur l'illustration seule. Ces propositions restent soumises a la validation artistique utilisateur.

## Tracabilite

Prompts exacts: prompts_V4_01.json.
Sources, extraits, SHA256, sorties builtin, observations: provenance_V4_01.json.
Export sans ecrasement: export_verify_V4_01.ps1.
Controle technique repetable sans ecriture: export_verify_V4_01.ps1 -VerifyOnly.
QA miniature: qa/CONTACT_V4_01_221x276.png.

