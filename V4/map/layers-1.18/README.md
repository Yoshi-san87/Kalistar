# Villes et publication - 1.18

Terrain 1.17 reutilise sans modification ni copie supplementaire. Les trois
monuments sont plus grands (58, 48 et 42 px), avec ombre portee brune douce
sur un calque independant. Le voile parchemin d'Arborium est retire.
Noms, positions et calques de terrain precedents conserves. PSD relu pour
verifier pixels du composite, calques et trois noms editables.

`kalistar-map-1.18-preview.png` est l'assemblage final ; le site charge sa
copie WebP sans perte `../../site/assets/ui/kalistar-atlas-1.18.webp`.
Les sources et le PSD ne sont pas envoyes au navigateur. Les villes du
runtime sont actuellement fusionnees dans cette image de consultation ;
le PSD reste editable en local. Le fond des autres ecrans ne change pas.

Reconstruction : `node V4/map/layers-1.18/build-city-shadows.cjs` depuis le
checkout, avec les dependances isolees de la 1.15. Ne pas regenerer le terrain
pour modifier ces villes. Ouverture native Photoshop non testee ici.
