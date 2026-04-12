# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.25.1] - 2026-04-12

### Changed
- **Hand-tuned presets with `lonOffset`** — updated DIN A presets across all 10 geometries with null meridian offsets; replaced auto-generated US Letter/Legal presets for dodecahedron-12 and US Tabloid for pentagonal-24 with hand-crafted layouts; refined parent trees, tab assignments, pole positions, and rotation angles

## [0.25.0] - 2026-04-12

### Added
- **Pentagonal-24 geometry** — pentagonal icositetrahedron (24 congruent irregular pentagons, dual of snub cube via polar reciprocal); tribonacci constant vertex construction, chiral face with 4×114.8° + 1×80.8° angles, two edge lengths (ratio ≈ 1:1.42), sector-based edge pairing; hand-crafted DIN A preset
- **Null meridian editing** — `lonOffset` layout property stores meridian rotation around the pole axis; new "0°" button next to the S pole button enters meridian edit mode; clicking a snap point (face center or vertex) on the equator sets the 0° reference direction
- **Interactive 0° marker on net** — gold circle markers with "0" label rendered at positions where the meridian reference direction projects onto placed faces (gnomonic projection per face with affine interpolation to 2D); clicking a marker enters meridian edit mode; hover shows "Edit null meridian" tooltip
- **Ghost 0° marker** — semi-transparent 0° markers shown during both pole edit and meridian edit mode previews, reflecting the candidate pole/meridian position
- **Marker mode switching** — clicking any pole or 0° marker during an active edit mode switches directly to that marker's edit mode (e.g. clicking "N" while editing the meridian switches to north pole editing, and vice versa); hover tooltips shown for switchable markers during all edit modes
- **Irregular face flip support** — `irregularFace` geometry flag; `polyVerts` accepts a 5th `mirrored` parameter that negates local x for irregular polygons; `flipLayout` uses swapped rotation formulas (V-flip: `r = π − r`, H-flip: `r = −r`) for irregular geometries

### Changed
- **Ghost preview clipping** — ghost polygon preview is no longer shown when the cursor is outside the paper rectangle (printable area); `hitTestEdge` checks mouse world position against stored paper bounds
- **Flip H/V negates `lonOffset`** — flipping the net toggles chirality, so the meridian angle is negated to keep the 0° marker visually consistent
- **Rhombic-12 DIN A preset** — updated with `lonOffset: π/2`

### Fixed
- **Great circle vertex-on-plane crossing** — robust handling when a great circle plane passes exactly through a polygon vertex; on-plane vertices are now classified as crossings only when neighbours are on opposite sides or also on the plane; edge interpolation is skipped when the next vertex is on the plane, preventing duplicate crossings that caused missing meridian segments (visible in icosahedron-20 face 2)

## [0.24.0] - 2026-04-11

### Added
- **Dodecahedron-12 geometry** — regular dodecahedron (12 congruent regular pentagons, dual of icosahedron); 5 hand-crafted presets for all paper formats
- **Icosahedron-20 geometry** — regular icosahedron (20 congruent equilateral triangles); face normals from vertex triplet centroids, adjacency via dot product threshold (√5/3 ≈ 0.7454); 5 hand-crafted presets for all paper formats
- **Default poles on all presets** — new `defaultPoles(c3)` helper picks the two most-antipodal face centers; all auto-generated presets now ship with north/south pole markers
- **Paper format drives preset selection** — changing the paper format dropdown automatically selects the matching preset (DIN A sizes → DIN A preset, US Letter/Legal/Tabloid/B5 JIS → matching preset)
- **Pole edit-mode highlight ring** — dashed ring drawn around pole markers when pole editing mode is active
- **Click-on-pole exits edit mode** — clicking an existing pole marker during edit mode now deselects it (exits edit mode)

### Changed
- **Meridian line solid** — the meridian great-circle segment is now drawn as a solid line instead of dashed
- **Preset dropdown hidden** — the preset selector is no longer visible in the UI; presets are selected automatically via the paper format dropdown
- **Hand-crafted presets** — replaced auto-generated presets with hand-tuned layouts (optimised parent trees, tab assignments, pole positions) across all 9 geometries for all 5 paper formats

### Removed
- **Tree visualization** — removed "Set as root" tooltip, `rerootTree()`, `autoReroot()`, parent tree lines, ghost root marker, and reroot click/preview logic

## [0.23.0] - 2026-04-10

### Added
- **Unified net layouter** — new `net-layouter.html` replaces the per-polyhedron layouter files; a single geometry selector dynamically loads any polyhedron from `geometry-presets.js`
- **Shared geometry presets** (`geometry-presets.js`) — extracted all polyhedron definitions (vertices, adjacency, frames, edge pairing, ghost placement, collision checks, presets) into a standalone JS module loaded by the unified layouter
- **Rhombic-12 geometry** — rhombic dodecahedron (12 congruent rhombi, dual of cuboctahedron); acute angle ≈ 70.53°, obtuse angle ≈ 109.47°, diagonal ratio 1:√2
- **Pentahex-60 geometry** — pentagonal hexecontahedron (60 congruent irregular pentagons, dual of snub dodecahedron via polar reciprocal); bilateral mirror symmetry, two edge lengths (ratio 1.75:1), three edge-pairing types (0↔4, 1↔1, 2↔3)
- **Deltoidal-60 geometry** — deltoidal hexecontahedron (60 congruent kite faces, dual of rhombicosidodecahedron); correct polar-reciprocal kite vertex distances and edge direction angles
- **Rhombicosi-62 geometry** — rhombicosidodecahedron (62 faces: 20 triangles + 30 squares + 12 pentagons); mixed regular polygon faces with per-face side count
- **Truncoct-14 geometry** — truncated octahedron (14 faces: 8 hexagons + 6 squares); mixed regular polygon faces
- **Auto-generated presets** — rhombic-12, pentahex-60, and deltoidal-60 auto-generate optimised presets for DIN A, US Letter, US Legal, US Tabloid, and B5 JIS paper formats at load time
- **Rhombicosi-62 DIN A preset** — hand-tuned layout (custom parent tree, 18 tab overrides, angle −0.489 rad) for better page fill

## [0.22.0] - 2026-04-04

### Added
- **Styled scrollbars** — thin, semi-transparent scrollbars (5 px, rounded thumb, hover highlight) for the file list and controls panel, matching the dark UI theme; uses both `scrollbar-width`/`scrollbar-color` (Firefox) and `::-webkit-scrollbar` pseudo-elements (Chromium/Safari)
- **Scroll-to-active on panel open** — opening the file list panel automatically scrolls to the currently active file entry
- **Scroll-to-active on arrow key switch** — switching files with Left/Right arrow keys scrolls the file list to keep the active entry visible

### Changed
- **File list height capped at 50 vh** — the file list panel is now limited to half the viewport height; the header row and "clear cache" link remain fixed while only the file entries scroll, via a dedicated `#cached-files-scroll` wrapper div
- **Fast-path file list update** — switching between cached files no longer tears down and rebuilds the entire file list DOM; when the set of files hasn't changed, only the `active` class is toggled on existing rows, eliminating the visible flicker during rapid switching
- **Scroll position preserved on list rebuild** — when the file list is fully rebuilt (file added/removed, favorite toggled), the scroll position is saved and restored instead of jumping to the top

## [0.21.0] - 2026-04-01

### Added
- **Magnifier in foldable projections** — the magnifier lens (half-sphere refraction) is now available in all three foldable net views (buckyball-32, rhombic-30, truncoct-14); the magnifier UI group is always visible regardless of projection mode, and the foldable shaders sample from `lensUV` instead of `screenUV` so the lens distortion affects the net texture
- **Leveling mode edits foldable quaternion** — entering leveling mode in a foldable projection now directly edits the foldable faces quaternion (`foldable32facesQuat` / `foldable30facesQuat` / `foldable14facesQuat`) instead of `levelQuat`; the level sliders, reset, copy/paste, and discard all operate on the active foldable quaternion; `isFoldableMode()` helper added

### Changed
- **Leveling mode always enables Grid: Tex** — entering leveling mode now switches to Grid: Tex (showGrid = 1) in all projections, instead of Grid: View (showGrid = 2)
- **Export cutline suffix scoped to foldable** — the `-cutline` filename suffix is now only appended when exporting from a foldable projection mode with cut line overlay enabled; non-foldable exports no longer include the suffix

### Fixed
- **Animation playback in foldable projections** — keyframe capture, application, and SQUAD interpolation now use `activeQuat()` / `setActiveQuat()` instead of direct `camQuat` access, so animations correctly drive the foldable faces quaternion in all three foldable net views

## [0.20.0] - 2026-03-31

### Added
- **Favorite flag** — each cached file can be marked as favorite via a star icon (★/☆) in the file list; the flag is persisted per file in the IndexedDB config; click the star to toggle
- **Level mode camera preset** — entering level mode on an un-leveled file now initializes the level quaternion from the current camera orientation (conjugated by `camQuatOffset` to convert from view space to texture space), so the user starts leveling from their current viewpoint instead of identity

### Changed
- **File list sorting** — cached files are now sorted lexicographically by name
- **File deletion selects next** — deleting the active file now selects the next file in the sorted list (or the last file if the deleted file was at the end), instead of always jumping to the first file
- **Level mode discard restores camera** — `setLevelMode(on, discard)` now accepts a `discard` parameter; accept resets `camQuat` to identity, discard restores the previous camera orientation

### Fixed
- **Stale favorite on file switch** — switching to a file without existing config no longer inherits the `favorite` flag from the previously active file; `favorite` is explicitly reset to `false` in the no-config branch of `switchCachedFile`

## [0.19.0] - 2026-03-29

### Added
- **PDF export (CMYK + Cutline)** — new `PDF (CMYK + Cutline)` option in the export format dropdown; produces a PDF/X-compatible file with a FlateDecode-compressed CMYK raster image and an optional vector cutline overlay; supports all three foldable net types (buckyball-32, rhombic-30, truncoct-14); landscape nets are rotated 90° CW to portrait orientation; uses the native `CompressionStream('deflate')` API for zlib compression — zero external dependencies
- **Paper size selection** — dropdown for PDF export with ISO paper sizes A0–A4 (in mm) and a "Fit to content" option that sizes the page to the image plus margins; default is A2
- **Non-printable margin** — numeric input (0–50 mm, default 3 mm) defining the non-printable border around the PDF page; the raster image is scaled to fit within the printable area preserving aspect ratio and centered on the page
- **PDF cutline vector overlay** — face boundary edges and glue tab outlines are rendered as PDF path operators (0.5 pt CMYK black stroke, round join); tab paths are clipped at face polygon edges using the PDF evenodd clip operator (`W* n`) with an outer page rectangle and face polygon interiors, preventing tabs from bleeding into face areas
- **PDF ICC profile embedding** — when an ICC profile is loaded, the PDF embeds it as an ICCBased colorspace with an OutputIntent dictionary; otherwise falls back to DeviceCMYK
- **Azimuthal collage auto-fit scaling** — `fitScale` factor in both GLSL shader and JS SVG export automatically scales the two-disc layout so the full collage remains visible at any rotation angle; uses circular extent formula `0.5·|cos θ| + 1.0` for tight fitting without excess black borders

### Changed
- **Collage flip → blend slider** — replaced the boolean collage flip checkbox with a 0–1 range slider; the shader now linearly crossfades between upper and lower disc (`collageMixAlpha = (uv.y ≥ 0) ? 1−flip : flip`); `collageFlip` changed from `KF_BOOL` to `KF_NUMERIC` for smooth animation interpolation; config persistence is backwards-compatible (booleans are migrated to 0/1 on load)
- **Azimuthal zoom display inverted** — zoom slider now shows 1×–10× (reciprocal of internal 0.1–1.0 value); `syncAzimuthalZoomUI()` helper keeps slider position and display label in sync across all code paths (input, double-click reset, stereo reset/paste, pinch/wheel zoom, config load)
- **Stereographic menu reordered** — D and Scaramuzza parameters row moved above the zoom row in the stereographic controls
- **DPI input visibility** — the DPI input is now shown for PDF exports alongside TIFF and SVG; ICC controls (profile dropdown, load button, registry link) are shown for both TIFF and PDF formats

### Removed
- **Azimuthal mask toggle** — the circular mask checkbox and all related code (HTML, CSS, JS, config persistence, animation keyframe attribute) have been removed; the mask is now always on (shader uniform hardcoded to 1.0)

### Fixed
- **Globe reflection ignores horizon leveling** — the globe overlay's environment reflection now applies `levelMatrix` to the reflected ray direction before sampling the panorama texture, so the reflection matches the leveled view instead of showing the un-leveled panorama
- **Startup crash on missing default image** — each default image fetch is now wrapped in an individual try/catch so a 404 for one file no longer aborts the entire startup sequence; `updateCachedFilesList()` is also called in the outer catch block to ensure the file list and "clear cache" link are always displayed
- **Collage blend formula** — fixed the initial two-phase alpha implementation (both endpoints fully opaque at 0 and 0.5) with a correct linear crossfade
- **fitScale formula tightened** — replaced conservative rectangular bounding-box formula (`1.5·|cos θ| + |sin θ|`) with circular extent (`0.5·|cos θ| + 1.0`) matching actual disc geometry, reducing excess black at 45° rotation

## [0.18.0] - 2026-03-28

### Added
- **SVG cutline export** — new `SVG Cutline` option in the export format dropdown (available only in foldable projection modes); generates a vector SVG with face boundary edges, glue tab outlines (3 open trapezoid edges per tab), and an evenodd clip path that prevents tab strokes from bleeding into face interiors; supports all three net types (buckyball-32, rhombic-30, truncoct-14); physical dimensions in inches at the configured DPI match the raster export's print size; landscape nets are rotated 90° CW to portrait, matching the TIFF export convention
- **Configurable DPI** — numeric input field (default 300) in the export section; used by both CMYK TIFF and SVG cutline exports for resolution metadata (TIFF XResolution/YResolution tags) and physical dimension calculation (SVG width/height in inches)
- **Clear cache** — "clear cache" link below the cached files table; deletes all cached panoramas, ICC profiles, and config entries from IndexedDB; resets the viewer to its initial state (no texture, default camera, empty animations); automatically hidden when no files are cached
- **Grid:View magnifier warping** — the grid overlay in View mode (screen coordinates) now follows the magnifier lens distortion; `applyViewGrid()` accepts lens-distorted UV coordinates, and a `lensNorm` computation maps distorted coords into the export clip rectangle for correct grid alignment under magnification

### Changed
- **DPI input visibility** — the DPI input is shown for both CMYK TIFF and SVG Cutline formats; ICC-specific controls (profile dropdown, load button, registry link) are hidden when SVG is selected
- **SVG option auto-reset** — switching away from a foldable projection mode automatically resets the export format from SVG to PNG and fires a change event to update the ICC section visibility

### Fixed
- **Per-type tight bounding box** — each foldable net IIFE (bucky-32, rhombic-30) now stores its own tight bbox (`_bucky32TightBBox`, `_rhombic30TightBBox`); `uploadActiveNetData()` syncs the correct per-type bbox to the shared `buckyTightBBox` global when switching modes; fixes bottom clipping in TIFF export that occurred when the rhombic-30 IIFE's bbox (which runs after bucky-32 at init) overwrote the shared global with different dimensions
- **SVG viewBox stroke clipping** — the SVG viewBox is padded by `2×strokeWidth` on each side, and the clip rect includes the same padding, preventing hairline strokes at net boundaries from being clipped

## [0.17.0] - 2026-03-27

### Added
- **Animation editor** — collapsible panel for creating, naming, and managing multiple animations per source file; each animation has its own projection mode, duration, and loop setting; animations are persisted per source file in IndexedDB alongside the projection config
- **Keyframe timeline** — visual timeline with draggable keyframe pins rendered on a `<canvas>` overlay; reuses the video player's range slider; pins show three states: default (gold), active (blue, when slider is on a keyframe ±0.5% tolerance), and hovered (blue, enlarged); a ghost pin at t=duration mirrors the first keyframe when loop is enabled
- **Full projection state per keyframe** — each keyframe stores a complete snapshot: camera quaternion, FOV, pixelate, collage rotation/flip, azimuthal zoom/mask, stereographic D and Scaramuzza coefficients (a¹–a⁴), globe size/opacity/reflect/visible, and net overlay alpha; all attributes are captured on creation and updated live when the slider sits on an active keyframe
- **Keyframe interpolation** — during playback and interactive slider scrubbing, all projection attributes interpolate between adjacent keyframes: **SQUAD** (Spherical and Quadrangle) C¹-smooth quaternion spline for camera orientation, linear lerp for numeric parameters, snap-to-A for booleans; in loop mode, the last keyframe seamlessly interpolates back to the first via Catmull-Rom–style tangent vectors
- **Keyframe management** — double-click on empty timeline adds a new keyframe; double-click on an existing pin (except the first) deletes it with a confirmation dialog; single-click jumps to a keyframe and instantly applies its stored projection state; drag a pin to reposition it in time (first pin is locked at t=0)
- **Duration scaling** — changing the animation duration proportionally rescales all keyframe times to preserve their relative positions
- **Hover tooltip** — hovering a keyframe pin shows the stored camera orientation as `<Y°, P°, R°>` below the pin
- **Pending keyframe ghost on drag** — the ghost pin indicating where a new keyframe will be created now appears immediately when starting a drag gesture between existing keyframes, providing visual feedback before pointer release
- **Three-state grid overlay (Off → Tex → View)** — replaces the boolean grid checkbox with a cycling button in the Projection section; **Tex** mode draws the 32×16 grid in texture (equirectangular) coordinates, **View** mode draws the grid in viewport (screen) coordinates using `gl_FragCoord`; keyboard shortcut `X` cycles through all three states; the grid button uses a dedicated color scheme: blue when off (`#1a2a3a` bg, `#48f` border), green when active (`#1a2a1a` bg, `#4a4` border)
- **View grid in leveling mode** — entering level/horizon mode now automatically activates the View grid (screen coordinates), providing a pixel-aligned reference for horizon alignment; the grid resets to its previous state on accept/discard

### Changed
- **Stereographic a¹ default** — `stereoA0` default value changed from 1.0 to 50.0 (slider range 0–100); reset button updated accordingly
- **Default animation** — the auto-generated "horizontal scroll" animation rotates in the positive yaw direction (was negative); animation is named "horizontal scroll"
- **Collapsed file panel sizing** — collapsed file menu (`#info`) now matches the collapsed animation menu size with `min-width: 0`, `padding: 4px`, and enlarged toggle icon (20px font-size)
- **Left panel width independence** — `#left-panels` flex container now uses `align-items: flex-start` so collapsed and expanded panels size independently instead of stretching to match each other's width

### Fixed
- **SQUAD hemisphere consistency** — `squadInner()` now applies per-segment hemisphere flipping (dot-product sign check + quaternion negation for `qPrev` and `qNext`) before computing tangent vectors; fixes temporal unevenness at loop boundaries where the inner product construction inadvertently computed a ~270° long-path rotation instead of the correct ~90° short-path, causing visible deceleration before keyframes and jerky acceleration at transitions
- **Animation loop continuity** — `stepAnimPlayback()` now preserves fractional time overshoot on loop wrap via `elapsed % duration` instead of resetting to zero; eliminates micro-stutter at loop restart that occurred when the frame crossing the loop boundary discarded its sub-frame time
- **Animation cleanup on last file delete** — deleting the last cached file now properly stops playback, hides the animation timeline, and clears all animation state (`animations`, `selectedAnimIndex`, `pendingKfTime`); previously the animation panel persisted with stale data after the source file was removed
- **CSS specificity cascade** — generic `#controls button` selector now excludes `#grid-toggle-proj`, `#level-accept`, and `#level-discard` via `:not()` pseudo-classes, preventing their dedicated color schemes from being overridden by the generic dark style

## [0.16.0] - 2026-03-25

### Added
- **Collapsible controls panel** — ✕/☰ toggle button in the top row next to the Fullscreen button; collapses the entire settings panel to a single hamburger icon to maximize viewport space
- **Collapsible file list** — same ✕/☰ toggle pattern on the cached files panel (top-left); hides the file table and open-file button when collapsed
- **Arrow key navigation** — Left/Right arrows cycle through cached files; Up/Down arrows cycle through projection methods; keys are ignored when an input or select element is focused
- **CMYK TIFF export** — new format dropdown next to the Save button offers `CMYK TIFF` alongside the existing `PNG` export; produces an uncompressed TIFF with `PhotometricInterpretation = CMYK`, `SamplesPerPixel = 4`, and `300 DPI` resolution metadata (XResolution / YResolution tags), suitable for professional print workflows (ISO 12647-2:2013)
- **ICC profile management** — when `CMYK TIFF` is selected, an ICC profile section appears with a dropdown of cached profiles and a `Load .icc` button; loaded profiles are persisted in IndexedDB (key prefix `icc:`) and survive page reloads; the selected profile is embedded via TIFF tag 34675 (ICCProfile), enabling tagged output for Fogra51 (PSOcoated_v3) or other print profiles
- **Cut line overlay** — 3-state toggle (Off → Overlay → Only) available in all three foldable modes (buckyball-32, rhombic-30, truncoct-14); renders the physical cutting outline on a separate canvas (TEXTURE3), computed once per net build; tab trapezoid outlines are drawn as open paths (diagonals + outer edge, no base) and clipped to polygon interiors via even-odd winding; polygon boundary edges use tab-ownership logic (`tabsMap` or index-based dedup) so each shared edge is drawn exactly once; mode 1 composites cut lines on top of the normal view, mode 2 shows white background with cut lines only (for print)
- **Cut line in export filenames** — mode 1 (Overlay) appends `-cutline` to the filename; mode 2 (Only) replaces the texture name with `cutline` since no panorama content is visible

### Removed
- **Gamepad / joystick navigation** — removed the entire Three.js-based 3D joystick overlay, gamepad polling, button HUD, hat-switch projection cycling, rocker-to-globe-size mapping, and throttle-to-playback-speed control; keyboard and mouse navigation are unaffected
- **Three.js dependency** — the ES module importmap and joystick overlay script (~540 lines) have been removed; the viewer is now fully dependency-free

### Fixed
- **Config/texture sync on file switch** — projection config is now loaded from IndexedDB *before* the texture is uploaded to GPU, so both apply in the same render frame; previously the `await loadProjectionConfig()` yielded to the event loop after `uploadTexture()` set `needsRedraw`, causing one frame with the new texture but old (default) configuration
- **Config/texture sync on initial load** — same fix applied to the startup restore path; the saved camera, projection, and level settings are now visible from the very first frame instead of requiring a mouse move to trigger a redraw

### Added
- **Touch support** — full multi-touch interaction via Pointer Events; all mouse-based interactions now work on touchscreens
- **Two-finger pixel-lock gesture** — in perspective, stereographic, azimuthal, collage, and preview modes, two fingers hold their respective texture points fixed while implicitly adjusting FOV or zoom; rotation is solved via `quatFromTwoVectorPairs` (simultaneous two-vector rotation), FOV via analytic quadratic solver (`solvePerspFov`), zoom via Newton-Raphson (`solveZoom`)
- **Pinch-to-zoom fallback** — equirectangular and foldable modes (where pixel-lock zoom is not possible) continue single-finger drag with the primary finger while the second finger is ignored
- **Double-tap on sliders** — range inputs respond to double-tap (300 ms threshold) by dispatching a synthetic `dblclick` event, enabling touch-based reset to default values
- **Viewport meta tag** — `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">` prevents browser-level pinch zoom on mobile
- **`touch-action` CSS** — `none` on canvas, `pan-y` on controls panel, `none` on timeline; prevents browser scroll/zoom gestures from interfering with pointer events
- **Scrollable controls panel** — `max-height: calc(100vh - 24px)` with `overflow-y: auto` makes the controls panel scrollable on small screens
- **`pointercancel` handler** — cleans up gesture state when the browser cancels a touch (e.g. system gesture)
- **Stale pointer cleanup** — `_activePointers` map is cleared on fresh gesture start (no active drag or pinch) to prevent orphaned entries from missed `pointerup` events
- **Auto-disable magnifier on touch** — magnifier is automatically turned off on the first non-mouse `pointerdown`, since the lens effect requires hover and is disruptive on touchscreens

### Changed
- **`screenToLocalDir` signature** — accepts optional `unclamped` parameter; when `true`, azimuthal and collage projections return directions beyond the disc boundary (`r > 1`) for smooth gesture continuity
- **Pointer event flow** — `setPointerCapture` called immediately on `pointerdown`; two-finger detection and state initialization happen before single-finger drag setup
- **`resetPinchState()` helper** — centralizes cleanup of all pinch-related variables (`_pinchActive`, `_pinchTwoFingerLock`, `_pinchPrimaryId`, `_pinchLocalDir1/2`, `_pinchDragStartQuat`) on finger lift

## [0.14.0] - 2026-03-21

### Added
- **Rhombic-30 Net Layouter** (`rhombic-30-net-layouter.html`) — standalone Canvas 2D tool for interactively optimizing the rhombic triacontahedron flat net layout; same feature set as the buckyball net layouter (reparenting, tab placement, rotation optimization, paper presets, undo/redo, copy/paste)
- **Rhombic layout integration** — layout select dropdown, "Open Layouter" button, and clipboard paste for the rhombic-30 foldable mode; predefined presets for DIN A, US Letter, US Legal, US Tabloid, and B5 JIS paper formats
- **Rhombic pre-rotation as uniform** — `rhombicPreRot` changed from `const mat3` to `uniform mat3`, enabling dynamic pre-rotation from imported layouts via `computeRhombicPreRot()`
- **In-shader paper format outline (rhombic)** — dashed green rectangle drawn in the fragment shader for rhombic-30 foldable mode, matching the buckyball's existing paper outline; automatically excluded from PNG exports
- **Tight bounding box for rhombic** — `window.buckyTightBBox` computed from actual rhombus vertices plus glue tab outer corners (with asymmetric acute/obtuse insets and auto-flip probe); used for precise paper rect fitting and export clipping

### Changed
- **Export clipping uses tight bbox** — foldable PNG export now clips to `buckyTightBBox` (actual vertex + tab bounds) instead of the overlay bbox, with proper `fitScale` coordinate mapping via the overlay bbox
- **`uploadActiveNetData()` handles paper rect** — switching between bucky/rhombic/truncoct modes now uploads the correct `buckyPaperRect` uniform from the active mode's stored paper rect
- **Paper rect export handling** — paper outline hidden (`uniform4f(0,0,0,0)`) before export render and restored from the active mode's stored rect after export

### Fixed
- **Rhombic root rotation mismatch** — root face initial rotation changed from `r: 0` to `r: Math.PI / 2` to match the layouter's coordinate system; presets were optimized with π/2 and appeared 90° off
- **Rhombic preset switching didn't update shader** — `computeRhombic30Layout` now uploads `buckyNet`, `buckyScale`, `buckyBBox`, and `buckyOverlay` uniforms directly, matching the pattern used by `computeBucky32Layout`

## [0.13.0] - 2026-03-21

### Added
- **Layout exchange** — bidirectional layout transfer between dome-mapper and buckyball-net-layouter via select dropdown, "Open Layouter" button, and clipboard paste
- **Predefined layout presets** — optimized net layouts for DIN A (1:√2), US Letter, US Legal, US Tabloid, and B5 JIS paper formats, each with parent tree, tab ownership, and rotation angle
- **`computeBucky32Layout()` / `computeBuckyPreRot()` / `importBucky32Layout()`** — parameterized layout computation replacing the old hardcoded IIFE; supports arbitrary parent trees, tab maps, and paper aspect ratios
- **In-shader paper format outline** — `buckyPaperRect` uniform draws a dashed green rectangle in the fragment shader (hidden during PNG export) for precise paper format visualization
- **Custom layout management (net layouter)** — create/delete named custom layouts persisted in localStorage
- **Export JSON includes rotation angle and aspect ratio** — layout exchange format extended with `angle` and `aspect` fields

### Changed
- **`buckyPreRot`** — changed from `const mat3` to `uniform mat3` for dynamic pre-rotation from imported layouts
- **Code commenting** — thorough documentation pass on both index.html and buckyball-net-layouter.html
- **Net layouter presets** — stored as array with compacted delete button UI

### Fixed
- **`levelQuat` temporal dead zone** — `computeBuckyPreRot` calls `levelMatrix()` during IIFE init before `let levelQuat` declaration; wrapped in try/catch with identity matrix fallback
- **Paper outline precision** — tight bounding box computed from actual polygon vertices + glue tab outer corners instead of approximate circumscribed-radius circles
- **Rotation angle transfer** — uses absolute total angle (not incremental delta) for correct layout exchange
- **180° flip angle tracking** — flip angle properly reset when switching layouts
- **PNG export white border** — fixed `fitScale` mismatch between shader and JS coordinate mapping

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
