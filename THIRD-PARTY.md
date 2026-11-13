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

## MakeHuman CC0 skin (7.2)

- Young Asian male skin texture from the MakeHuman system CC0 asset pack: https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip
- The local 2048px JPEG was obtained from the downscaled CC0 asset mirror at https://github.com/NastyFFM/HumanGenWeb/blob/main/data/skins/young_asian_male.jpg . Its README documents the original system asset pack and conversion.
- Source file SHA256: `b695f6ac860f05477288f94e9810ec8f83e2f5d8ddf4a0126ea9aeea4ca6acaf`.
- Opponent and first-person hands share one local texture and their anatomical UVs. Hand colour is also baked into vertices as a fallback if the optional texture fails, with an independent UV set for small skin creases.
- jpeg-js 0.4.4 (BSD-3-Clause) is a build-only dependency used for hand pigment baking. No jpeg-js code is shipped to game clients.

## Poly Haven PBR surfaces

- Wood: https://polyhaven.com/a/wooden_floor_02
- Rubber: https://polyhaven.com/a/rubber_tiles
- License: CC0, https://polyhaven.com/license
- Local 1K JPEG color, normal and roughness maps live in `assets/textures/`.
  From 7.10 the court uses procedural PVC micro-relief instead of rubber tile
  normal/roughness maps. Older rubber maps remain bundled for compatibility.

## ASTROX 100ZZ reference

- Product specifications: https://www.yonex.com/ax100zz
- Dark Navy photo reference: https://badmintonworldbalcatta.com/products/astrox-100zz-dark-navy-4ug5
- The racket is a game-specific procedural approximation; product photographs are not bundled. Yonex names and marks belong to their respective owner. This is not an official Yonex game.
- From version 7.1, the default first-person hands use a separately posed, refined and elbow-capped portion of the same CC0 anatomical topology. Reproducible conversion: `tools/compile-hand-anatomy.mjs`. The wrist and palm remain continuous. The low-load startup fallback is an independent procedural closed sculpt.
