# Kalistar 4.6.101 - Thalassea sous la mer

## Perimetre

Correction du seul portrait de Thalassea : pas de surface d'eau a l'air libre
ni de cascades hors de la bulle. Les ponts exterieurs restent immerges et
ouvrent sur les fonds marins ; les canaux interieurs peuvent rester.
Palais, membrane, jet central, capteurs et habitations sont preserves.

Deux nouveaux WebP 13 remplacent les deux exports 04 dans le registre runtime.
Les anciens fichiers et PNG restent physiquement conserves. Les sept autres
portraits, terrain 1.39, icones, noms, catalogue, comptes et sauvegardes restent
inchanges. Sources et exports sont sauvegardes hors du checkout.

## Verification

Provenance : V4/revisions/2026-10-21-thalassea-underwater/.
Tests source/hashes passes ; anciens exports exclus du build. Suite locale
complete : 97 invocations passees avec KALISTAR_NODE_MODULES. Build CF_PAGES=1
valide ; portraits verifies sur PC, Razr, 320 px, paysage et tablette. Les
1 389 autres medias du registre restent identiques. Verification du commit
exact avant envoi a Cloudflare ; GitHub controle le texte sans images natives.
Captures et rapports : work/qa/thalassea-underwater/.
