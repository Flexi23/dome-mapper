# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
