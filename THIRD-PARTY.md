# Third-party assets

All gameplay, animation solvers, user interface, procedural equipment and hall
geometry are supplied as local source. No third-party service is needed to play.

## Three.js 0.180.0

- Source: https://github.com/mrdoob/three.js
- License: MIT. Full license is bundled at `vendor/three/LICENSE` in the portable build.

## MakeHuman anatomical asset

- Source: https://github.com/makehumancommunity/makehuman
- Data: `makehuman/data/3dobjs/base.obj`, `default.mhskel`,
  `default_weights.mhw`, and the young Asian male / muscle morph targets.
- License: CC0 for the asset data, included at `assets/MAKEHUMAN-CC0.md`.
- The game uses a morphed, scaled, reweighted and packed version of the data,
  not MakeHuman application code. Clothing boundaries, shoes, facial details,
  vertex pigment, hand posing and runtime animation were added for this game.
- Reproducible conversion script: `tools/compile-athlete.mjs` in the source project.

## Poly Haven PBR surfaces

- Wood: https://polyhaven.com/a/wooden_floor_02
- Rubber: https://polyhaven.com/a/rubber_tiles
- License: CC0, https://polyhaven.com/license
- Local 1K JPEG color, normal and roughness maps live in `assets/textures/`.
  Rubber color is procedural; its normal and roughness maps come from Poly Haven.

## ASTROX 100ZZ reference

- Product specifications: https://www.yonex.com/ax100zz
- Dark Navy photo reference: https://badmintonworldbalcatta.com/products/astrox-100zz-dark-navy-4ug5
- The racket is a game-specific procedural approximation; product photographs are not bundled. Yonex names and marks belong to their respective owner. This is not an official Yonex game.
- First-person grip geometry in version 6.8 is a dedicated procedural sculpt and no longer a cropped MakeHuman hand.
