# dome-mapper

**Equirectangular panorama viewer using a GPU raycaster projecting onto the inside of a unit sphere.**

A single-file browser app that loads equirectangular images and videos and renders them as an immersive spherical projection. The fragment shader casts rays from the origin against a unit sphere and maps the equirectangular texture using spherical coordinates — no mesh geometry needed.

![WebGL](https://img.shields.io/badge/WebGL-2.0-blue)
![No Build](https://img.shields.io/badge/Build-None-green)

---

## How It Works

For each screen pixel the fragment shader:

1. Computes a **ray direction** based on the active projection mode (equirectangular, perspective, azimuthal, collage, stereographic, or buckyball)
2. Applies a **quaternion-derived rotation matrix** (controlled by mouse, keyboard, or gamepad) to orient the ray
3. Optionally applies **horizon leveling** via a second quaternion
4. Converts the ray direction to **spherical coordinates** (θ, φ)
5. Maps those to **equirectangular UV** coordinates: `u = atan2(z, x) / 2π + 0.5`, `v = asin(y) / π + 0.5`
6. Samples the loaded texture (blending LINEAR and NEAREST filtered versions via the Pixelate slider) or shows a checkerboard test pattern
7. Composites **magnifier lens**, **globe overlay**, and **grid** on top

No sphere geometry is created — the projection is purely analytical in the shader.

## Usage

```bash
# No dependencies, no build step.
open index.html
```

1. Open in a browser
2. Drop an equirectangular panorama image or video (or click "browse")
3. Look around with mouse, keyboard, or joystick

When served over HTTP the viewer auto-loads a default video (or image as fallback). A checkerboard test pattern with meridian/equator highlights is shown when no media is loaded.

## Controls

### Mouse / Touch

| Input | Action |
|---|---|
| Drag | Look around (quaternion trackball) |
| Shift + Drag | Roll rotation |
| Scroll wheel | Adjust FOV / zoom (projection-dependent) |
| Click (no drag) | Play / pause video |
| Double-click | Fly-to: animate camera so clicked point becomes center |

### Keyboard

| Key | Action |
|---|---|
| `A` / `D` (or Numpad `4` / `6`) | Yaw (rotate left/right) |
| `W` / `S` (or Numpad `8` / `2` / `5`) | Pitch (rotate up/down) |
| `Q` / `E` (or Numpad `7` / `9`) | Roll |
| `X` | Toggle grid overlay |
| `G` | Toggle globe overlay |
| `M` | Toggle magnifier |
| `Space` | Play / pause video (when video is loaded) |

Held keys debounce briefly, then accelerate exponentially.

### Y / P / R Sliders

| Input | Action |
|---|---|
| Drag slider | Set yaw, pitch, or roll directly (Euler degrees) |
| Double-click slider | Reset that axis to 0° |

### Gamepad / Joystick (T.Flight HOTAS One)

| Input | Action |
|---|---|
| Stick pitch/roll/yaw | Look around |
| Throttle | — |
| Rocker | Adjust globe overlay size |
| Hat (top) N/S | Cycle projection mode (N = previous, S = next) |
| Buttons | Shown in HUD overlay when pressed |

The 3D joystick model in the bottom-left corner animates in real-time and shows button states.

## Projection Modes

| Mode | Description |
|---|---|
| **Equirectangular** | Direct 2:1 equirectangular mapping; black bars when viewport aspect differs from 2:1 |
| **Perspective** | Perspective projection with adjustable FOV (20°–170°) |
| **Azimuthal equidistant** | Full sphere mapped into a disc (center = forward pole, edge = backward pole); optional circular mask |
| **Azimuthal collage** | Two overlapping azimuthal equidistant discs side by side (front/back hemispheres) with rotation, flip, and zoom controls |
| **Stereographic** | Scaramuzza polynomial lens model with adjustable D parameter and a¹–a⁴ coefficients; copy/paste/reset for parameter sets |
| **Foldable Buckyball** | Flat 2D net of a truncated icosahedron (buckyball); each face is mapped from the sphere via spherical Voronoi |

Cycle through modes with the **Hat switch** (N/S) on a connected joystick or via the dropdown.

### Foldable Buckyball Projection — Technical Deep Dive

The buckyball projection unfolds the full 360° equirectangular panorama onto the **flat net of a truncated icosahedron** (soccer ball / C₆₀ fullerene). The result is a printable, foldable template that can be cut out and assembled into a physical 3D panorama ball.

#### Geometry

A truncated icosahedron has **32 faces**: 12 regular pentagons and 20 regular hexagons. Each face corresponds to a region on the unit sphere, and the panorama texture is sampled from that region via gnomonic (central) projection.

| Property | Pentagon | Hexagon |
|---|---|---|
| Count | 12 | 20 |
| Sides | 5 | 6 |
| Face center distance from origin | 0.9393 | 0.9149 |
| Vertex coordinates | Icosahedron vertices (golden ratio) | Dodecahedron vertices (1/√3 family) |

The 32 face center normals are hard-coded as GLSL constants derived from the golden ratio φ = (1+√5)/2:

- **Pentagon centers** (indices 0–11): All permutations of `(0, ±a, ±b)` where `a = 1/√(1+φ²)`, `b = φ/√(1+φ²)` — these are the normalized vertices of a regular icosahedron.
- **Hexagon centers** (indices 12–31): All even permutations of `(±c, ±c, ±c)`, `(0, ±d, ±e)`, `(±d, ±e, 0)`, `(±e, 0, ±d)` where `c = 1/√3`, `d = φ/√3`, `e = 1/(φ√3)` — these are the normalized vertices of a regular dodecahedron.

#### Spherical Voronoi Partitioning

Each face "owns" the region of the sphere closest to its center normal. The shader implements this as a brute-force **spherical Voronoi** lookup: for every fragment, it loops over all 32 face centers, measures the angular distance `acos(dot(dir, faceCenter))`, and identifies the nearest center. The second-nearest distance is also tracked to compute edge proximity for potential wireframe rendering.

```glsl
vec4 buckyVoronoi(vec3 dir) {
    // Returns (edgeDist, angularDist, nearestIndex, isPentagon)
}
```

#### Flat Net Layout (JavaScript, runs once at init)

The 32 polygons must be arranged on a 2D plane such that adjacent faces on the sphere share edges in the net — a classic **graph unfolding** problem. The algorithm:

1. **Adjacency graph**: Face pairs with angular distance < 0.8 rad are neighbors. Each face has exactly 5 (pentagon) or 6 (hexagon) neighbors.

2. **Tangent frames**: For each face, an orthonormal {T₁, T₂} frame is constructed in the tangent plane (perpendicular to the face normal N). This defines a local 2D coordinate system for edge numbering.

3. **Edge indexing** (`edgeIdx(i, j)`): Determines which edge of face `i` faces toward neighbor `j`. The center of face `j` is projected onto face `i`'s tangent plane, its polar angle is measured relative to {T₁, T₂}, and quantized into one of `n` sectors (5 or 6). A small epsilon (1e-10) resolves IEEE 754 half-integer rounding ambiguity.

4. **BFS unfolding** (`tryPlace` + `unfold`): Starting from a seed face at the origin, faces are placed one by one via BFS. For each candidate face `j` adjacent to an already-placed face `i`:
   - The shared edge direction determines the placement angle: `φ = rotation_i + 2π · edge_k / n_i`
   - The offset distance is `apothem_i + apothem_j` (edge-to-center distance for both polygons)
   - An overlap check against all previously placed faces rejects placements where centers are closer than `0.85 × (apothem_j + apothem_k)`.

5. **Optimization**: All 32 possible seed faces are tried. For each complete layout (all 32 faces placed), the bounding box area is minimized over rotation angles (2° steps, 0°–180°). The most compact layout wins.

6. **Orientation**: The final layout is rotated to landscape orientation (width > height) if needed.

#### Tangent Frame Alignment (Face Offsets)

The 2D net polygons must be rotationally aligned with the 3D geometry so that the texture mapping is seamless across edges. This is achieved by computing a **face offset angle** per face:

1. The actual vertices of the truncated icosahedron are generated from the three families of even permutations: `(0, ±1, ±3φ)`, `(±2, ±(1+2φ), ±φ)`, `(±1, ±(2+φ), ±2φ)`, all normalized to the unit sphere.
2. For each face, a vertex belonging to that face is found (angular distance < 0.42 rad from face center).
3. The vertex's polar angle in the tangent frame is compared to the canonical angle `π/n`, yielding an offset that aligns the shader's polygon with the true geometry.

#### Gnomonic Projection (Shader, per-fragment)

For each pixel inside a polygon in the 2D net, the shader reconstructs the corresponding 3D direction on the sphere:

1. **Local 2D position** `bestRP`: the pixel's position relative to the polygon center, rotated into the polygon's local frame.
2. **Face offset rotation**: `bestRP` is further rotated by the precomputed `faceOffset` to align with the 3D tangent frame.
3. **Gnomonic mapping**: The 2D position is scaled from flat-polygon space to gnomonic (tangent-plane) space using the ratio `gnoCircumR / flatCircumR`, where `gnoCircumR = √(1 − rFace²)` is the gnomonic circumradius and `flatCircumR = 1/(2·sin(π/n))` is the flat polygon's circumradius.
4. **Direction reconstruction**: `dir = normalize(rFace · N + gno.x · T₁ + gno.y · T₂)` — the face normal scaled by its distance plus the tangent-plane offset.
5. **Camera rotation**: The direction is transformed by `viewMatrix · buckyPreRot` (a fixed Ry(180°)·Rx(45°)·Rz(−90°) pre-rotation for aesthetic default orientation).
6. **Texture lookup**: The rotated direction is converted to equirectangular UV via `dirToEquirect()` and the panorama is sampled.

#### 2D Canvas Overlay

After the WebGL shader renders the textured polygons, a 2D canvas overlay is composited on top, providing:

- **Polygon edges**: Solid lines along all face boundaries.
- **Glue tabs**: Semi-transparent trapezoidal flaps on boundary edges (edges not shared with a neighbor in the net). These are clipped against all polygon interiors using an even-odd winding rule, so tabs never overlap face content.
- **Face labels**: (optional) Numeric identifiers per face for assembly guidance.

The overlay is rendered to an offscreen 2048px-tall canvas, uploaded as a WebGL texture, and alpha-composited in the fragment shader using the bounding box `buckyBBox` for UV mapping.

#### PNG Export

The export button renders the current view at high resolution and downloads the result as PNG.

| Projection | Dimensions | Clipping |
|---|---|---|
| **Equirectangular / Perspective** | `texHeight × (texHeight · viewportAspect)` | Full viewport |
| **Azimuthal** | `texWidth × texWidth` (square) | Full viewport |
| **Azimuthal collage** | `texWidth × (texWidth · ⅔)` (3:2) | Full viewport |
| **Stereographic** | `texWidth × texHeight` (original resolution) | Full viewport |
| **Foldable Buckyball** | Longer bbox side → `max(texW, texH)` px, shorter proportional | Tight bounding box of the net (minimal white border) |

The implementation resizes the WebGL canvas to export resolution, sets the `exportClip` uniform to remap `screenUV` from the default `(−1,−1)→(1,1)` range to the net's bounding box coordinates (with aspect-ratio compensation), renders a single frame, and reads pixels via `gl.readPixels()` within the same JS task. After export, the canvas and uniform are restored to viewport defaults.

Exported filenames encode the source image name and projection method: `{source}-{projection}-{W}x{H}.png`.

#### Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript (runs once at init)                             │
│                                                             │
│  1. Build adjacency graph (32 faces, angular threshold)     │
│  2. BFS unfolding → flat net positions + rotations          │
│  3. Optimize layout rotation for minimal bounding box       │
│  4. Compute tangent frame offsets from true TI vertices      │
│  5. Upload uniform vec4 buckyNet[32] to GPU                 │
│  6. Render 2D overlay (edges, tabs, labels) → texture       │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Fragment Shader (runs per pixel, every frame)              │
│                                                             │
│  1. For each of 32 polygons: point-in-polygon test          │
│  2. Winner: reconstruct 3D direction via gnomonic proj.     │
│  3. Apply camera rotation (viewMatrix · buckyPreRot)        │
│  4. Convert to equirectangular UV → sample panorama         │
│  5. Composite 2D overlay (edges + tabs) on top              │
└─────────────────────────────────────────────────────────────┘
```

## Features

| | |
|---|---|
| 🖼️ **Image & Video support** | Drop equirectangular JPEG/PNG or MP4/WebM video files |
| 📽️ **Video playback** | Timeline with seek bar, time display; click to play/pause; gamepad throttle controls speed (0×–4×) |
| 🔎 **Magnifier** | Cursor-following lens with adjustable radius and refractivity (half-sphere refraction shader); toggle via `M` key |
| 📐 **Pixelate** | Slider blending between linear (smooth) and nearest-neighbor (pixelated) texture filtering |
| 🌐 **Globe overlay** | 3D globe with grid, equator, prime meridian, and axis; adjustable size; toggle via `G` key |
| 📏 **Grid overlay** | 32×16 grid with crosshairs for orientation (toggle via `X` key) |
| 🎯 **Fly-to** | Double-click to smoothly animate camera toward any point; works in both camera and leveling mode |
| ⚖️ **Horizon leveling** | Dedicated leveling mode with accept/discard; yaw/pitch/roll sliders; double-click horizon to auto-level; per-file persistence |
| 🎮 **Gamepad integration** | Real-time 3D joystick model (Three.js) with per-button highlighting and button HUD |
| 🕹️ **Gamepad camera** | Stick pitch/roll/yaw drive rotation; hat N/S cycles projection; rocker adjusts globe size |
| 📸 **PNG export** | Export current view at source texture resolution; projection-specific dimensions and clipping |
| 🔢 **Y / P / R sliders** | Live Euler-angle readout; drag to set orientation, double-click to reset; copy/paste quaternion |
| 💾 **Multi-file cache** | Multiple panoramas cached in IndexedDB; switch between cached files via file list; last-viewed file restored on reload |
| ⚙️ **Per-file config** | Camera orientation, FOV, projection mode, grid, globe, leveling, and all projection parameters persisted per file |
| 🎨 **Test pattern** | Built-in checkerboard fallback with meridian/equator markers |

## Project Structure

```
dome-mapper/
├── index.html      # Self-contained viewer (HTML + GLSL + JS + Three.js joystick overlay)
├── CHANGELOG.md    # Version history
└── README.md       # You are here
```

## Technical Notes

- **WebGL 2** with GLSL 300 es fragment shader raycaster
- **Quaternion camera** — gimbal-lock-free rotation via unit quaternion with incremental trackball updates; a fixed −90° yaw offset is composed in `viewMatrix()` so sliders start at 0/0/0
- **Euler ↔ quaternion sync** — `quatToEulerDeg()` / `quatFromEulerDeg()` (Tait-Bryan YXZ) keep sliders and quaternion in lockstep
- NPOT textures fully supported (no power-of-2 restriction)
- Texture wrap: `REPEAT` on S (horizontal seamless), `CLAMP_TO_EDGE` on T (poles)
- Mipmaps generated automatically for power-of-2 textures
- HiDPI support (capped at 2× device pixel ratio)
- **Three.js** (ES module import) for the 3D joystick overlay only; the main viewer remains dependency-free WebGL 2

### Texture Caching (IndexedDB)

Panorama images are cached client-side in **IndexedDB** to avoid unnecessary network requests on repeat visits. Design rationale:

| Option | Capacity | API | Limitation |
|---|---|---|---|
| `localStorage` | 5–10 MB | Synchronous, string-only | Too small for panoramas (typical 5–20 MB) |
| `Cache API` | Large | Designed for Request/Response pairs | Requires service worker for full control; overkill for single-blob storage |
| **`IndexedDB`** | **Effectively unlimited** | **Async, stores Blobs natively** | **Slightly verbose API — mitigated by thin wrapper** |

IndexedDB was chosen because:

1. **No size limit** in practice — stores multi-megabyte JPEG blobs without serialization overhead
2. **Native Blob storage** — no base64 encoding, no string conversion, binary stays binary
3. **Works on `file://`** — unlike the Cache API, IndexedDB is available without a service worker or HTTP server
4. **Zero dependencies** — the wrapper is ~40 lines of inline JS (open, get, put, delete)
5. **Survives page reloads** — texture loads once, then restores instantly from cache on every subsequent visit

The cache stores multiple entries with prefixed keys:

| Key pattern | Content |
|---|---|
| `tex:<filename>` | Image/video Blob, dimensions, timestamp |
| `cfg:<filename>` | Projection config (camera, level, FOV, mode, projection parameters) |
| `lastFile` | Name of the last-viewed file (restored on reload) |

A file list in the UI shows all cached panoramas with dimensions and size; clicking switches between them. Deleting a cached file removes both its `tex:` and `cfg:` entries.

### Future Direction

The rendering backend may migrate to **WebGPU** for compute shader support and more flexible pipeline control. The current WebGL 2 implementation serves as a baseline.

### Technical Roadmap Notes

#### Framebuffer for Temporal Effects

To enable multi-frame effects (motion blur, trails, persistence, reverse playback), a WebGL framebuffer ring buffer could be implemented:

| Approach | Description | Trade-offs |
|---|---|---|
| **Ring buffer (last N frames)** | Store 30–60 frames in VRAM (~1–2 sec) | Limited duration, but efficient for instant-replay effects |
| **MIP-based temporal storage** | Recent frames full-res, older frames downscaled | Good for persistence/blur, saves VRAM |
| **Hybrid: Video element + framebuffer** | Video plays via `<video>`, WebGL captures for effects | Reverse playback still limited |

**VRAM budget estimate** (1920×1080, RGBA, 60 frames):
- Uncompressed: 1920 × 1080 × 4 bytes × 60 ≈ **500 MB** (feasible on modern GPUs)
- With texture compression (S3TC/ETC): ~125 MB (4× compression)

#### Reverse Video Playback

HTML5 `<video>` does not support negative `playbackRate`. Options:

| Method | Feasibility | Notes |
|---|---|---|
| **`playbackRate < 0`** | ❌ Not supported | API requires `playbackRate >= 0` |
| **`currentTime` stepping** | ⚠️ Poor | Frame-accurate seeking is unreliable; keyframe-dependent |
| **WebCodecs API** | ✅ Viable | Decode frames manually, render to canvas/WebGL; requires significant rework |
| **Framebuffer ring buffer** | ✅ Viable | Store recent frames in VRAM, read backwards; limited to buffer duration |

**Recommended path:** Implement framebuffer ring buffer for temporal effects first. Add WebCodecs-based reverse playback as a separate feature if full-video reverse is needed.

#### Video Export with Effects

Once a framebuffer is implemented, **video encoding** enables exporting rendered sequences:

| Feature | Description |
|---|---|
| **Real-time capture** | Record framebuffer output to `VideoEncoder` |
| **Effect baking** | Export with shader effects (blur, trails, color grading) applied |
| **Time manipulation** | Slow-motion, reverse, timelapse from ring buffer |
| **Format options** | WebM (VP9), MP4 (H.264 via platform codecs) |

**Encoding pipeline:**
```
WebGL Framebuffer → VideoFrame → VideoEncoder → WebM/MP4 Blob → Download
```

**Use cases:**
- Shareable video clips of generative art
- High-quality renders (offline encoding at slower bitrate)
- GIF-like loops (short seamless cycles)

**Recommended path:** Start with WebM/VP9 encoding (widely supported, no licensing). Add H.264/MP4 if needed for compatibility.

## Disclaimer

This software was built with the assistance of **Claude Opus 4.6** (Anthropic). It builds upon and references two other projects by the same author:

- **[joystick-nav](https://github.com/Flexi23/joystick-nav)** — Gamepad-driven 3D navigation and joystick overlay
- **[spherical-reprojection](https://github.com/Flexi23/spherical-reprojection)** — GPU-based spherical image reprojection

## License

This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE](LICENSE) file for details.

**© 2026 Felix Woitzel / [cake23.de](https://cake23.de)**
