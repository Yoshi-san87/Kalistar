# Thalassea - Coherence sous-marine

L'auteur demande de corriger les surfaces et cascades d'eau hors de la bulle,
puis de publier. Toute la ville exterieure est deja immergee : les arches des
ponts ouvrent sur le volume marin et les fonds rocheux. Les canaux et petites
chutes peuvent rester dans la cite protegee. Palais, jet central, membrane,
capteurs, habitations, cadrage et DA sont conserves.

- Source corrigee : ../../propositions/2026-10-20-city-portraits/originals/thalassea-13.png
- Prompt exact : ../../propositions/2026-10-20-city-portraits/prompts-13.json
- Preparation : prepare.cjs ; ancien manifeste preserve dans previous-city-portraits.json.
- Provenance : provenance.json ; sept autres vues et source 04 intactes.
- Les deux WebP 04 sont retires du registre de publication mais conserves sur
  disque. Seuls les deux exports 13 remplacent le portrait dans le runtime.
- Source corrigee, source 04, prompt et nouveaux WebP sauvegardes hors du checkout.

Les tests Map verifient les hashes et l'absence de l'ancien portrait dans le
build. Le test navigateur ouvre les huit villes, controle les requetes,
l'agrandissement et le focus, et capture Thalassea sur PC et telephone.
Les rapports repetables restent dans work/qa/thalassea-underwater/.
