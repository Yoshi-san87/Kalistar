# Momo V4 : ombre de contact de l'attache

Livrables : `V4/templates/MOMO_V4_04_OMBRE_ATTACHE.psd` et `V4/cartes/MOMO_V4_04_OMBRE_ATTACHE.png`.

Seul ajout : le calque `OMBRE CONTACT - barre DEF sur le tissu`, au-dessus du tissu dans le groupe `15 FACTION`. La barre projette ainsi une ombre visible sur le drapeau, au lieu d'une ombre cachee derriere son tissu opaque.

Parametres : forme initiale x=675..777, y=825..833, flou gaussien 3.4 pixels, mode Produit, opacite 72 %. Le masque existant du groupe protege le montant droit et la barre de DEF.

Le controle `verification.json` confirme que les changements se limitent a la zone d'attache x=660..776, y=829..846. Les autres pixels sont identiques, y compris le code-barres, les positions et le bas de la carte. Le PSD rouvert produit le meme rendu. La revision precedente est conservee.

`comparison.png` montre la revision precedente a gauche et l'ombre ajoutee a droite.
