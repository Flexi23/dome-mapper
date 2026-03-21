# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.13.0] - 2026-03-21

### Added

#### Viewer (`index.html`)
- **Layout exchange with Net Layouter** — Layout dropdown to select predefined layouts, "🎉 Open Editor" button to launch the layouter, and "📋 Paste Layout" button to import JSON layouts from the clipboard
- **`computeBucky32Layout(parentTree, importAngle, tabsMap, paperAspect)`** — new function that unfolds a buckyball net from a parent tree, applies the supplied rotation angle, and uploads face positions/rotations to the GPU; replaces the old seed-search loop
- **`computeBuckyPreRot(seed, rootRot)`** — new function computing the `buckyPreRot` matrix from seed face and root rotation angle, with try/catch guard for `levelQuat` temporal dead zone at init time
- **`window.importBucky32Layout()`** — global API enabling cross-window layout import from the layouter via `window.opener`
- **Predefined layout presets** — `bucky32Presets` array with optimized layouts (parent trees, tab ownership, rotation angles, aspect ratios) for DIN A, US Letter, Legal, Tabloid, and B5 JIS paper formats
- **Paper-format-aware bounding box** — tight vertex + glue-tab-corner bounding box for accurate paper outline fitting, replacing the approximate circumradius-circle approach
- **Shader-drawn paper outline** — the dashed green paper rectangle in foldable mode is now rendered in the fragment shader via a `buckyPaperRect` uniform instead of baked into the overlay texture; automatically hidden during PNG export

#### Net Layouter (`buckyball-net-layouter.html`)
- **Custom layout management** — "＋ New" button to create custom paper formats, "🗑" icon button to delete them; custom layouts persist in `localStorage`
- **Paper format outline** — dashed green rectangle showing the paper boundary overlaid on the canvas, sized to the selected aspect ratio
- **Rotation angle + aspect ratio in export** — clipboard JSON now includes `angle` and `aspect` fields: `{ label, parents, tabs, mirrored, angle, aspect }`
- **Layout labels** — layout name is tracked in layout state and included in export JSON

### Changed

#### Viewer (`index.html`)
- **`buckyPreRot` is now a uniform** — changed from `const mat3` to `uniform mat3`, dynamically computed from the imported layout's seed face and root rotation
- **Thorough code commenting** — comprehensive inline documentation added to all functions, shader blocks, and data flow

#### Net Layouter (`buckyball-net-layouter.html`)
- **Presets as array** — predefined layouts changed from object to indexed array format
- **Delete button compacted** — moved from a full-width button to a small "🗑" icon in the label row next to "＋ New", with a tooltip for clarity
- **Thorough code commenting** — comprehensive inline documentation added to all functions, geometry constants, and event handlers

### Fixed

#### Viewer (`index.html`)
- **`levelQuat` temporal dead zone** — `computeBuckyPreRot` is called at init before `levelQuat` is declared; fixed with a try/catch that falls back to identity matrix
- **Paper outline precision** — bounding box computation for paper fitting now uses exact vertex + glue-tab-corner positions instead of crude circumradius circles

#### Net Layouter (`buckyball-net-layouter.html`)
- **Rotation angle transfer to dome-mapper** — `optimizeAndApplyRotation()` now un-rotates positions to the BFS base state before re-optimizing, ensuring `layout.angle` always stores the absolute total rotation (not an incremental delta); fixes wrong rotation when transferring layouts after reparent, tab toggle, or custom save operations
- **180° flip angle tracking** — re-root click handler and `autoReroot()` now update `layout.angle` when resolving 180° ambiguity (adding π to positions)
- **Flip angle reset** — `flipLayout()` now resets `layout.angle` to 0 before re-optimization, since mirroring invalidates the previous rotation

### Removed
- **Gamepad / joystick navigation** — removed the entire Three.js-based 3D joystick overlay, gamepad polling, button HUD, hat-switch projection cycling, rocker-to-globe-size mapping, and throttle-to-playback-speed control; keyboard and mouse navigation are unaffected
- **Three.js dependency** — the ES module importmap and joystick overlay script (~540 lines) have been removed; the viewer is now fully dependency-free

## [0.12.0] - 2026-03-21

### Added
- **Interactive re-rooting** — click any face label to set it as the new tree root; tooltip shows "Set as root" with fill preview and colored delta; ghost root marker (dashed orange circle) appears on hover
- **Auto re-root after reparent** — after every reparent operation, the face closest to the bounding box center is automatically chosen as the new root for a balanced layout
- **`rerootTree()` / `autoReroot()`** — new functions for reversing the parent path and auto-selecting the optimal root
- **Mirrored flag in export/import** — copy now exports `{ parents, tabs, mirrored }` JSON; paste restores the mirrored state; predefined layouts can include `mirrored` flag

### Changed
- **180° flip protection** — re-rooting and auto-rerooting compare dot product of old vs. new face positions to pick the orientation closest to the previous view
- **Renamed** `buckyball-net-optimizer.html` → `buckyball-net-layouter.html`; updated title, README, and CHANGELOG references

## [0.11.0] - 2026-03-21

### Added
- **Glue tab placement mode** — toggle button switches to a mode where clicking a cut-edge flap swaps tab ownership between the two adjacent faces; button highlights orange when active
- **Tab-aware bounding box** — new `bboxCriticalPoints()` function computes actual polygon vertices plus owned tab trapezoid outer vertices for accurate bounding-box and page-fill calculations
- **Undo/redo for glue tab toggles** — tab ownership changes push to the undo stack and browser history, just like reparent operations
- **Tooltip fill preview** — hovering a face or flap shows a tooltip with the projected page fill percentage and a colored delta (green for improvement, red for regression) relative to the current layout; works in both reparent and glue tab modes
- **Tab ownership in export/import** — copy exports `{ parents, tabs }` JSON; paste accepts the new format, plain 32-element arrays, and the legacy `{ faces }` format (backwards compatible)
- **Tab ownership in predefined layouts** — `predefinedParents` entries store optimized `{ parents, tabs }` objects; tab assignments are restored when selecting a paper format

### Changed
- **Rotation optimization reflects tab ownership** — `optimizeAndApplyRotation()` now uses `bboxCriticalPoints()` so tab toggles immediately affect the optimal rotation angle and page fill score
- **Flap visuals (placement mode)** — owned tabs render with solid pink fill and black stroke (same as glue tab placement mode); non-owned tabs render as faint pink ghosts
- **Flap labels removed** — face numbers no longer rendered inside flap trapezoids for a cleaner appearance

### Fixed
- **NaN% page fill display** — `paperScore` was called with the old `(res, placed, angle)` signature after the bbox refactor; fixed to use the new `(pts, angle)` signature

## [0.10.0] - 2026-03-20

### Added
- **Truncated octahedron projection modes** — two new projection modes for a 14-face polyhedron (8 hexagons + 6 squares):
  - **Truncoct-14 preview** — SDF-raymarched truncated octahedron floating over the panorama; 14 half-spaces with two face distances (`RFACE_TO_HEX = √3/√5`, `RFACE_TO_SQ = 2/√5`); same shading pipeline as the other preview modes (bevel, Blinn-Phong, rim light, edge wireframe); shares `foldable14facesQuat` with the foldable mode
  - **Truncoct-14 foldable** — flat 2D net of a truncated octahedron; BFS unfolding with overlap detection (tries all 14 seed faces, picks most compact layout); regular polygon point-in-polygon test for both hexagons (n=6) and squares (n=4); gnomonic back-projection via `truncOctPreRot` (Rx(45°)·Rz(−110°)); 2D canvas overlay with polygon edges and trapezoidal glue tabs
- **Fullscreen button** — toggle button at the top of the controls panel using the Fullscreen API; label switches between "⛶ Fullscreen" and "⛶ Exit Fullscreen"
- **Buckyball Net Layouter** (`buckyball-net-layouter.html`) — standalone Canvas 2D tool for interactively optimizing the buckyball-32 flat net layout; features: click-to-reparent, paper format presets (DIN A, Letter, Legal, Tabloid, B5 JIS), flip H/V, auto-rotation optimization, tree visualization with ghost subtree preview, undo/redo via browser history, copy/paste of 32-element parent tree arrays
- **README: Buckyball Net Layouter section** — feature list and description of the standalone tool; updated project structure listing

### Changed
- **Projection modes: 9 → 11** — added truncoct-14 preview (index 9) and truncoct-14 foldable (index 10) to `projectionModes` array with corresponding `M_TRUNCOCT_PREVIEW` and `M_TRUNCOCT_FOLDABLE` constants
- **`activeQuat` / `setActiveQuat` routing** — truncoct preview/foldable → `foldable14facesQuat`
- **`previewMatrix()` routing** — returns the correct faces quaternion for truncoct vs rhombic vs bucky based on mode
- **`isPreviewMode()` helper** — updated to include `M_TRUNCOCT_PREVIEW`
- **`screenToLocalDir` / `screenToWorldDir`** — handle `M_TRUNCOCT_PREVIEW` and `M_TRUNCOCT_FOLDABLE`
- **`uploadActiveNetData()`** — routes to `_truncOct14Data/Scale/BBox/OverlayTex` for truncoct modes
- **Face slider functions** — Y/P/R and copy/paste now route through `activeFacesQuat()` / `setActiveFacesQuat()` for truncoct quaternion selection
- **Export handling** — truncoct-14 preview treated as square export; truncoct-14 foldable uses tight net bounding box
- **Fly-to** — disabled in truncoct foldable mode (same as other foldable modes)

## [0.9.0] - 2026-03-15

### Added
- **Rhombic-30 foldable projection mode** — flat 2D net of a rhombic triacontahedron (30 identical golden rhombus faces); deterministic half-flower chain layout visiting 10 icosahedron vertices in a fixed order (v1→v3→v7→v11→v5→v10→v6→v4→v2→v8), each placing 3 faces as a fan; L1 norm `abs(x)/ha + abs(y)/hb < 1` for point-in-rhombus test; gnomonic back-projection via `rhombicPreRot` (Ry(−144°)·Rx(−57°)); angle-aware flap corners (acute vertices get wider insets, obtuse get narrower); `flapHitsAnyFace()` auto-flip with L1 norm probing; manual flap ownership via `flipSet` for 10 edges
- **Rhombic-30 preview mode** — SDF-raymarched rhombic triacontahedron floating over the panorama; 30 equidistant half-spaces at `RFACE_RHOMBIC = 0.8507`; same shading pipeline as buckyball-32 preview (bevel, Blinn-Phong, rim light, edge wireframe); shares `foldable30facesQuat` with rhombic-30 foldable mode
- **Preview ball vs background drag** — pointer-down circle test (`rPx = canvasHeight / 2 / (√(d²−1) · tan(fov/2))`) determines drag target in both preview modes; clicks inside the circle manipulate the faces quaternion, clicks outside manipulate `camQuat` for perspective-style orbiting; shift+drag applies roll in the same target-dependent manner
- **Intuitive ball drag via quaternion conjugation** — view-space drag rotation is conjugated into faces-quat space via `viewToFacesRot(q) = camQuat · q · camQuat⁻¹` so the ball surface follows the cursor naturally
- **`isPreviewMode()` helper** — replaces repeated `M_PREVIEW || M_RHOMBIC_PREVIEW` checks
- **`viewToFacesRot(q)` helper** — centralises the `camQuat · q · camQuat⁻¹` conjugation used by ball drag and shift+roll
- **README: Rhombic-30 deep dives** — geometry table, half-flower chain layout, L1 norm shader test, gnomonic back-projection, flap generation with angle-aware corners
- **README: unified Polyhedron Preview section** — comparison table (buckyball-32 vs rhombic-30), mouse interaction documentation (circle test, conjugation), replaces the old buckyball-only section

### Changed
- **Projection modes: 7 → 9** — added rhombic-30 foldable (index 7) and rhombic-30 preview (index 8) to `projectionModes` array with corresponding `M_RHOMBIC_FOLDABLE` and `M_RHOMBIC_PREVIEW` constants
- **`activeQuat` / `setActiveQuat` routing** — preview → `foldable32facesQuat`, rhombic preview/foldable → `foldable30facesQuat`
- **`previewMatrix()` routing** — returns the correct faces quaternion for rhombic vs bucky based on mode
- **`screenToLocalDir` / `screenToWorldDir`** — handle `M_RHOMBIC_PREVIEW` via `screenToPerspDir` and `foldable30facesQuat`
- **Face slider functions** — Y/P/R and reset/copy/paste now route through `activeFacesQuat()` / `setActiveFacesQuat()` for mode-aware quaternion selection
- **Export handling** — rhombic-30 preview treated as square export (same as buckyball preview); rhombic-30 foldable uses tight net bounding box
- **Level horizon** — fixed pitch/roll swap for rhombic mode
- **Code cleanup** — `isPreviewBall` computed once per pointermove instead of twice; stale comments updated; circle radius calculation simplified

## [0.8.0] - 2026-03-10

### Added
- **Globe transparency & reflectivity sliders** — Opacity (5–100%, default 80%) and Reflect (0–100%, default 75%) sliders for the globe overlay; environment reflection samples the panorama texture (or test pattern) via `reflect()` on both the sphere surface and the equator/meridian rings; persisted in IndexedDB per file
- **Buckyball preview: background wireframe** — the 32-face edge wireframe is now projected onto the panorama background behind the 3D buckyball body, giving a continuous visual of the face partitioning across the full viewport
- **Buckyball preview: texture mapping parity with foldable** — the preview body now applies the same `camQuatOffset · previewMatrix · buckyPreRot` rotation chain as the foldable mode, ensuring identical face-to-panorama mapping between both views
- **Default projection: stereographic** — the initial projection mode is now stereographic (was equirectangular); the `<select>` dropdown is synced on startup

### Changed
- **Globe: axis stick removed** — the globe overlay now renders a sphere-only SDF via analytic ray-sphere intersection (faster than the previous sphere-traced combined sphere+cylinder SDF); all sphere features retained (grid, equator ring, meridian ring, environment reflection, Blinn-Phong lighting)
- **Globe: analytic ray-sphere intersection** — replaced 64-step sphere-trace with a direct quadratic solve for the sphere hit; reduces GPU cost per fragment
- **Glue tabs: fully opaque** — flap fill changed from 15% alpha to 100%; flaps now always render at full opacity regardless of the Net overlay slider (edges still scale with the slider)
- **Default magnifier radius** — increased from 5% to 6%
- **Level Horizon button state** — fixed: no longer shows blue (leveled) after loading the default image on a fresh cache; `isLeveled` is reset to `false` after the default image fetch completes
- **Code cleanup** — updated stale comments throughout shader and JS: removed "sphere+axis" references from globe uniforms, clarified `buckyOverlayAlpha` semantics (edges only, flaps always opaque), fixed misleading `pointerX/Y` comment, rewrote preview texture mapping documentation to reflect the actual `camQuatOffset`-based chain

### Fixed
- **Level Horizon button false positive** — on fresh-cache startup, setting `isLeveled = true` for the test pattern was not reset after successfully fetching and loading the default image, causing the button to appear blue (leveled) when no leveling had been applied

## [0.7.0] - 2026-03-08

### Added
- **Buckyball preview projection mode** — SDF-raymarched truncated icosahedron floating over the panorama background; Blinn-Phong lighting with bevelled edges, rim light, and specular highlights; shares `foldable32facesQuat` with the foldable mode for seamless face-orientation preview
- **Y / P / R face sliders** — Yaw / Pitch / Roll sliders for `foldable32facesQuat` visible in both preview and foldable modes; control face assignment rotation on the buckyball
- **Net slider in preview mode** — the Net overlay alpha slider is now visible in preview mode; modulates edge wireframe visibility on the 3D buckyball via `buckyOverlayAlpha`
- **Foldable viewport fitting** — the foldable net now scales uniformly to fit the entire bounding box (including glue tabs) inside the viewport, preventing horizontal overflow on narrow windows
- **Foldable equirectangular mouse mapping** — foldable mode now uses equirectangular-style trackball rotation instead of pixel-delta drag fallback
- **Stereographic projection documentation** — thorough inline GLSL comments documenting all three stages: Scaramuzza polynomial radial distortion, generalised stereographic inverse mapping (with derivation), and ray construction with pre-rotation
- **README: Buckyball Preview deep dive** — rendering technique (SDF half-space intersection), view-space architecture, shading pipeline table, face orientation section
- **README: Stereographic Projection deep dive** — relationship to perspective/gnomonic (D=1 special case), Scaramuzza model with KaTeX formulas, inverse stereographic derivation, coefficient table, parameter presets

### Changed
- **Projection mode order** — swapped preview (index 2) and foldable (index 6); preview is now the third option in the dropdown, foldable the last
- **M_* constants** — all JS projection mode checks now use named constants (`M_EQUIRECT`, `M_PERSP`, `M_PREVIEW`, `M_AZIMUTHAL`, `M_COLLAGE`, `M_STEREO`, `M_FOLDABLE`) derived from `projectionModes.indexOf(…)` instead of magic numbers
- **PNG export: no magnifier** — magnifier lens is disabled during export render (`refractivity = 1.0`)
- **PNG export: viewport aspect** — perspective, stereographic, and preview exports now use the actual viewport aspect ratio with a minimum of half the original texture size per dimension
- **Default Net overlay** — changed from 100% to 33%
- **Net line widths** — reduced polygon cut lines from 3→1.5 px and glue tab dashes from 2→1 px for a cleaner print result
- **UI reorganisation** — net-row and faces-row moved inline into the projection params grid; FOV row moved to bottom of projection params; faces-row buttons (Reset/Copy/Paste) removed
- **Magnifier disabled in preview** — magnifier is hidden when the buckyball preview mode is active
- **README overhaul** — centered header with 5 badges, numbered projection modes table, horizontal rule separators, PNG Export as standalone section, updated export dimensions table, renamed Disclaimer→Acknowledgements and Future Direction→Roadmap

### Removed
- **Dead code cleanup** — removed unused `buckyPreRotQuat` (JS quaternion mirroring a GLSL const), `previewQuat` (defined/saved/loaded but never used for rendering), and `_facesSliderDragging` (write-only flag never read)

## [0.6.0] - 2026-03-07

### Added
- **Azimuthal equidistant projection** — full sphere mapped into a disc with optional circular mask and adjustable zoom
- **Azimuthal collage projection** — two overlapping azimuthal discs side by side (front/back hemispheres) with rotation, flip, and zoom controls
- **Stereographic projection** — Scaramuzza polynomial lens model with D parameter (0.1–3.0) and a¹–a⁴ polynomial coefficients; includes reset, copy, and paste for parameter sets
- **Pixelate slider** — blends between linear (smooth) and nearest-neighbor (pixelated) texture filtering via dual-sampler setup; default 100%; works for both images and video
- **Magnifier** — cursor-following lens with adjustable radius and refractivity (half-sphere refraction in shader); toggle via `M` key
- **Horizon leveling** — dedicated leveling mode with accept/discard workflow; yaw/pitch/roll sliders; double-click horizon to auto-level; yellow border on leveling box; per-file persistence
- **Fly-to animation** — double-click to smoothly animate camera toward any point; works in both camera and leveling mode
- **Click to play/pause** — single click on canvas (no drag) toggles video playback
- **Multi-file cache** — multiple panoramas cached in IndexedDB with file list UI; click to switch between cached files; last-viewed file restored on reload
- **Per-file config persistence** — all projection parameters (stereographic D/a¹–a⁴, collage rotation/flip, azimuthal mask/zoom, pixelate) saved and restored per file
- **Camera copy/paste** — copy and paste camera quaternion between files
- **Level copy/paste** — copy and paste leveling quaternion between files
- **VideoFrame-based video upload** — captures frame once to ensure both LINEAR and NEAREST textures get identical data (no temporal offset)
- `G` keyboard shortcut to toggle globe overlay
- `M` keyboard shortcut to toggle magnifier

### Changed
- **UI reordering** — Perspective box → Leveling box → Projection box (top to bottom)
- **Projection mode order** — equirectangular, perspective, azimuthal, azimuthal collage, stereographic, foldable buckyball
- **PNG export dimensions** — azimuthal exports square (texWidth²), collage exports 3:2, stereographic exports at original texture resolution (texWidth×texHeight)
- **Leveling box** styled with yellow border for visual distinction
- Hotkey visualizations (`[X]`, `[G]`, `[M]`) removed from UI labels
- `var` declarations changed to `let` for consistency
- Code comments updated to match current feature names (Pixelate)

## [0.5.0] - 2026-03-06

### Added
- **PNG export** — renders the current view at the source texture's native resolution and downloads as PNG; for the buckyball projection the export is clipped tightly to the net bounding box (no excess white border), with the longer side at `max(texWidth, texHeight)` pixels; for other projections the viewport aspect ratio is preserved at texture height
- **Export clipping via `exportClip` uniform** — a `vec4` shader uniform remaps `screenUV` from the default `(−1,−1)→(1,1)` range to arbitrary clip bounds, enabling tight bounding-box crops
- **Export button in controls panel** — "📷 export PNG" appears at the bottom of the right-side control panel (only when a texture is loaded)
- **Source-aware export filenames** — exported PNGs are named `{source}-{projection}-{W}x{H}.png` (e.g. `Hohe Düne-foldable-buckyball-4096x3241.png`)
- **Net overlay opacity slider** — adjustable transparency (0–100%) for the buckyball net overlay (edges + glue tabs); persisted in IndexedDB
- **Projection config persistence** — camera orientation (quaternion), FOV, projection mode, grid toggle, and globe settings are saved to IndexedDB alongside the cached texture and restored on reload
- Detailed code comments for all GLSL shader functions and JavaScript layout/overlay methods
- Comprehensive documentation of the buckyball projection algorithm in README

### Changed
- **Context-sensitive UI** — Y/P/R sliders moved to top; projection-specific controls (FOV, Net opacity) shown/hidden based on selected projection mode
- **Buckyball projection background** changed from dark grey to white for better contrast and printability
- `cacheClear()` now also deletes the stored projection config

### Removed
- `video-info.html` utility page
- `get-video-info.ps1` PowerShell script
- `get-video-info.py` Python script

## [0.4.0] - 2026-03-05

### Added
- **Foldable buckyball projection mode** — flat 2D net layout of a truncated icosahedron mapped from the equirectangular source via spherical Voronoi
- **Video support** — drop or browse equirectangular MP4 videos; timeline with play/pause, seek bar, and time display
- **Default video auto-load** — tries loading a default video first (via HTTP), falls back to a default image
- **Playback speed control** — throttle axis on gamepad maps to 0×–4× video playback rate
- **Y / P / R angle sliders** — display and control yaw, pitch, roll as Euler angles (Tait-Bryan YXZ); double-click any slider to reset to 0
- **Fixed -90° yaw offset** baked into `viewMatrix()` so sliders start at 0/0/0 while the view faces the equirect center
- **Euler ↔ quaternion conversion** — `quatToEulerDeg()` and `quatFromEulerDeg()` for slider synchronization
- **Keyboard acceleration curve** — held keys debounce then ramp up rotation speed exponentially
- **Numpad navigation** — numpad 2/4/5/6/7/8/9 mirror WASDQE for yaw/pitch/roll
- **Shift + drag for roll** rotation (mouse/touch)
- **Grid overlay** — 32×16 wireframe grid with crosshairs, toggled via checkbox or `X` key
- **3D joystick overlay** — real-time Three.js model of T.Flight HOTAS One with per-button highlight animation (OutlineEffect)
- **Gamepad camera control** — stick pitch/roll/yaw axes drive the quaternion camera
- **Rocker → globe size** — rocker axis on gamepad adjusts globe overlay size
- **Hat switch → projection cycling** — hat N/S cycles through projection modes
- **Button HUD** — overlay showing pressed button indices and hat direction
- **Spacebar** toggles video play/pause

### Fixed
- **Browse link not clickable** — added `pointer-events: auto` to `#drop-zone .hint` (parent had `pointer-events: none`)

### Changed
- Camera quaternion split into user-controlled `camQuat` (identity at start) and fixed `camQuatOffset` (-90° yaw), composed in `viewMatrix()`

## [0.3.0] - 2026-02-22

### Changed
- **Quaternion-based camera rotation** — replaced Euler yaw/pitch with a unit quaternion, eliminating gimbal lock and enabling free trackball-style navigation
- Mouse drag now applies incremental rotations: horizontal → world-Y (yaw), vertical → camera-local X (pitch)
- Pitch is no longer artificially clamped to ±90°
- Globe overlay normals and axis projection updated to match the new rotation convention

### Added
- Quaternion math utilities (`quat`, `quatFromAxisAngle`, `quatMul`, `quatNormalize`, `quatToMat3`) — ~30 lines, zero dependencies

## [0.2.0] - 2026-02-22

### Added
- **IndexedDB texture cache** — loaded images are stored locally and restored instantly on revisit (no re-fetch)
- **Progress bar** with streaming byte counter for initial image fetch via HTTP
- **Clear cache** button in the info bar
- **Default image auto-fetch** from relative path when served via HTTP (skipped on `file://`)

### Changed
- **Upgraded to WebGL 2** (GLSL 300 es) — fixes NPOT texture support (`GL_REPEAT` + mipmaps now work with any image size)
- Fixed inverted V coordinate in equirectangular projection (image was upside-down)
- Progress overlay starts hidden and is removed from DOM flow after fade-out

## [0.1.0] - 2026-02-22

### Added
- Equirectangular sphere raycaster (WebGL 1.0 fragment shader)
- Perspective projection from origin onto inside of unit sphere
- Mouse drag to look around (yaw/pitch), scroll wheel to zoom (FOV)
- Drag-and-drop and file browse for equirectangular image loading
- Checkerboard test pattern with meridian/equator highlights (shown before image load)
- FOV slider (20°–170°)
- HiDPI support (capped at 2× DPR)
- Seamless horizontal texture wrapping (`GL_REPEAT` on S axis)
- Automatic mipmap generation for power-of-2 textures
