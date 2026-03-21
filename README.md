<div align="center">

# dome-mapper

**Equirectangular panorama viewer using a GPU raycaster projecting onto the inside of a unit sphere.**

A single-file browser app that loads equirectangular images and videos and renders them as an immersive spherical projection. The fragment shader casts rays from the origin against a unit sphere and maps the equirectangular texture using spherical coordinates — no mesh geometry needed.

![WebGL 2.0](https://img.shields.io/badge/WebGL-2.0-blue?logo=webgl)
![GLSL 300 es](https://img.shields.io/badge/GLSL-300%20es-orange)
![No Build](https://img.shields.io/badge/Build-None-brightgreen)
![Single File](https://img.shields.io/badge/File-Single%20HTML-yellow)
![License](https://img.shields.io/badge/License-GPL%20v3-blue)

</div>

---

## How It Works

For each screen pixel the fragment shader:

1. Computes a **ray direction** based on the active projection mode — one of eleven: equirectangular, perspective, buckyball-32 preview, azimuthal equidistant, azimuthal collage, stereographic, buckyball-32 foldable, rhombic-30 foldable, rhombic-30 preview, truncoct-14 foldable, or truncoct-14 preview
2. Applies a **quaternion-derived rotation matrix** (controlled by mouse or keyboard) to orient the ray
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
3. Look around with mouse or keyboard

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

## Projection Modes

> **11 projection modes** — cycle with the dropdown.

| # | Mode | Description |
|:---:|---|---|
| 0 | **Equirectangular** | Direct 2:1 equirectangular mapping; black bars when viewport aspect ≠ 2:1 |
| 1 | **Perspective** | Gnomonic projection with adjustable FOV (20°–170°); mathematically a special case of the stereographic family at D=1 |
| 2 | **Buckyball-32 Preview** | SDF-raymarched truncated icosahedron floating over the panorama; Blinn-Phong lit, bevelled edges, real-time rotation via Y/P/R face sliders |
| 3 | **Azimuthal Equidistant** | Full sphere mapped into a disc (forward pole → center, backward pole → edge); optional circular mask |
| 4 | **Azimuthal Collage** | Two overlapping azimuthal equidistant discs side-by-side (front/back hemispheres) with rotation, flip, and zoom |
| 5 | **Stereographic** | Generalised stereographic with Scaramuzza polynomial lens distortion; D parameter (D=2 conformal, D=1 gnomonic) and a¹–a⁴ coefficients |
| 6 | **Buckyball-32 Foldable** | Flat 2D net of a truncated icosahedron unfolded onto the screen; gnomonic back-projection with 2D canvas overlay (edges, glue tabs); layout selectable from presets or imported from the Net Layouter |
| 7 | **Rhombic-30 Foldable** | Flat 2D net of a rhombic triacontahedron (30 golden rhombi); half-flower chain layout with L1 norm point-in-rhombus test and gnomonic back-projection |
| 8 | **Rhombic-30 Preview** | SDF-raymarched rhombic triacontahedron (30 equidistant faces) floating over the panorama; same lighting and interaction model as buckyball-32 preview |
| 9 | **Truncoct-14 Foldable** | Flat 2D net of a truncated octahedron (8 hexagons + 6 squares); BFS unfolding with overlap detection across all 14 seed faces; gnomonic back-projection |
| 10 | **Truncoct-14 Preview** | SDF-raymarched truncated octahedron (14 half-spaces) floating over the panorama; same shading pipeline as the other preview modes |

---

### Polyhedron Preview Modes — Technical Deep Dive

Both preview modes render a **3D polyhedron** floating in front of the panorama background via SDF sphere-tracing. They serve as tangible previews of the face partitioning used by the corresponding foldable modes — you can rotate the ball to inspect how the panorama maps onto each face before printing.

| Property | Buckyball-32 | Rhombic-30 |
|---|---|---|
| Polyhedron | Truncated icosahedron | Rhombic triacontahedron |
| Faces | 32 (12 pentagons + 20 hexagons) | 30 (identical golden rhombi) |
| Face distances | 0.9393 (pent), 0.9149 (hex) | 0.8507 (all equal) |
| Pre-rotation | Ry(180°)·Rx(45°)·Rz(−90°) | Ry(−144°)·Rx(−57°) |
| Quaternion | `foldable32facesQuat` | `foldable30facesQuat` |

#### Rendering Technique

The SDF for both polyhedra is the intersection of N half-spaces:

```
SDF(p) = max over all N faces of: dot(p, faceNormal) − faceDist
```

32 half-spaces for the buckyball (with two different face distances), 30 equidistant half-spaces for the rhombic triacontahedron. Both are convex polyhedra rendered without any mesh geometry.

#### View-Space Architecture

The ball is evaluated entirely in **view space** to ensure consistent rotation behavior:

1. The camera is fixed at `(0, 0, 2.5)` in view space — it never moves.
2. All 32 face normals are transformed from object space → world space → view space before raymarching: `vFaces[i] = transpose(viewMatrix) · camQuatOffsetMat · previewMatrix · buckyPreRot · buckyFaces[i]`
3. The `camQuatOffsetMat` (Ry−90°) ensures the preview's texture mapping produces the same panorama direction as foldable mode's `viewMatrix · buckyPreRot · d_obj` chain.
4. This means the ball rotates on screen in the same direction as mouse drag — matching the perspective projection, globe overlay, and all other modes.

#### Shading Pipeline

| Stage | Detail |
|---|---|
| **Bounding sphere** | Rays are intersected with a padded unit sphere first; misses skip raymarching entirely |
| **Sphere tracing** | Up to 80 steps, convergence threshold 0.0004 |
| **Face ID** | The face with the maximum half-space value is the active face; second-maximum gives edge proximity |
| **Bevel** | `smoothstep` blend of the two nearest face normals creates a subtle chamfer at edges |
| **Texture** | View-space hit point → world direction via `viewMatrix` → equirectangular UV; matches foldable mode exactly via `camQuatOffset` baked into `worldRot` |
| **Edge wireframe** | `smoothstep` on edge distance, modulated by `buckyOverlayAlpha` (Net slider) |
| **Lighting** | Key light at `(0.4, 0.9, 0.7)` in view space; diffuse + ambient, Blinn-Phong specular (exponent 60), rim light |
| **Background** | Perspective panorama behind the ball with projected edge wireframe (same Net slider) |

#### Mouse Interaction (Ball vs. Background)

In preview modes, mouse drag targets either the polyhedron or the background panorama, determined by a **circle test** at pointer-down:

- The projected ball radius in pixels is computed from the camera distance (2.5) and the current FOV: `rPx = canvasHeight / 2 / (√(d²−1) · tan(fov/2))`
- Clicks **inside** the circle manipulate the faces quaternion (`foldable32facesQuat` or `foldable30facesQuat`). The view-space drag rotation is conjugated into faces-quat space via `camQuat · q · camQuat⁻¹` so the ball surface follows the cursor naturally.
- Clicks **outside** the circle manipulate `camQuat` with perspective-style pixel-locked rotation, orbiting the ball.

Shift+drag applies roll in the same target-dependent manner.

#### Face Orientation (Y / P / R Sliders)

Each preview shares its faces quaternion with the corresponding foldable mode. Adjusting the **Yaw / Pitch / Roll** sliders under *Faces* rotates the face assignment on the ball — the same rotation is applied when switching to foldable mode, ensuring a seamless transition.

---

### Stereographic Projection — Technical Deep Dive

The stereographic projection maps the full sphere onto an infinite plane via a two-stage pipeline: **polynomial radial distortion** followed by an **inverse generalised stereographic mapping**. It subsumes the perspective (gnomonic) projection as a special case.

#### Relationship to Perspective Projection

The built-in **Perspective** mode constructs rays as:

```glsl
rd = normalize(vec3(-uv.x * tan(fov/2), uv.y * tan(fov/2), -1.0));
```

This is mathematically identical to a **gnomonic (central) projection** — a straight-line projection from the sphere center onto a tangent plane. The gnomonic projection is exactly the D=1 special case of the generalised stereographic family:

| D value | Projection | Properties |
|---|---|---|
| D = 1 | **Gnomonic / rectilinear** | Straight lines preserved; FOV < 180°; same as the Perspective mode |
| D = 2 | **True stereographic** | Conformal (angle-preserving); circles on the sphere map to circles on the plane; FOV can exceed 180° |
| D ∈ (0,1) | Hyper-wide | Extreme wide-angle; compresses the periphery more aggressively |
| D ∈ (1,2) | Intermediate | Blends gnomonic and stereographic characteristics |
| D ∈ (2,3] | Narrower-than-stereographic | Pulls the periphery inward more than classic stereographic |

In other words, the Perspective mode is a convenience shortcut for D=1 with a¹=1, a²=a³=a⁴=0 and an explicit FOV slider, while the Stereographic mode exposes the full parameter space.

#### Stage 1: Polynomial Radial Distortion (Scaramuzza Model)

Based on Davide Scaramuzza's omnidirectional camera model (*"A Toolbox for Easily Calibrating Omnidirectional Cameras"*, 2006), this stage warps the radial distance from the image center through a polynomial before the stereographic mapping is applied.

**Formula:**

$$l' = a_1 \cdot r + a_2 \cdot r^2 + a_3 \cdot r^3 + a_4 \cdot r^4 \quad\text{where}\quad r = l \cdot 8$$

The input radial distance $l$ (in normalised-device-coordinate space, typically 0–~1) is scaled by 8 so that the higher-order coefficients $a_2$–$a_4$ have meaningful effect even at small slider values. The result is normalised:

$$l'_{\text{norm}} = \frac{l'}{a_1 + a_2 + a_3 + a_4}$$

This ensures the mapping stays close to identity at unit radius when all coefficients are equal (pure scaling, no shape change).

**Default:** $a_1 = 1,\; a_2 = a_3 = a_4 = 0$ → $l' = l$ (linear, no distortion).

**Effect of the coefficients:**

| Coefficient | UI slider | Range | Effect |
|---|---|---|---|
| $a_1$ | a¹ | 0–100 | Linear term (controls base FOV / zoom) |
| $a_2$ | a² | 0–16 | Quadratic — mild barrel/pincushion |
| $a_3$ | a³ | 0–16 | Cubic — stronger radial warping |
| $a_4$ | a⁴ | 0–1 | Quartic — subtle high-order correction |

Increasing higher-order coefficients compresses or expands the panorama radially, creating fisheye-like or telephoto-like distortion patterns.

**Uniform:** `stereoScaramuzza = vec4(a₁, a₂, a₃, a₄)`

#### Stage 2: Inverse Generalised Stereographic Mapping

Classic stereographic projection maps a point on the unit sphere onto a tangent plane by casting a ray from the **antipodal pole** through the sphere point. The parameter D generalises this by moving the projection point along the axis:

**Forward mapping** (sphere → plane):

$$l' = D \cdot \frac{\sin\theta}{D - 1 + \cos\theta}$$

where $\theta$ is the polar angle (colatitude from the optical axis).

**Inverse mapping** (plane → sphere) — solved by rearranging into a quadratic in $\cos\theta$:

$$\text{Let } q = \frac{D}{l'}, \quad \cos\theta = \frac{1 - D + q\sqrt{q^2 + 2D - D^2}}{1 + q^2}$$

The discriminant $q^2 + 2D - D^2$ is non-negative for $D \in [0, 2]$ and remains usable slightly beyond; it is clamped to $\geq 0$ for safety.

**Uniform:** `stereoD` (UI slider range 0.1–3, default 2)

#### Stage 3: Ray Construction

The polar angle $\theta$ and azimuthal angle are converted to a Cartesian ray direction in the camera's local frame:

```glsl
rd = vec3(sinθ · sin(angle), cosθ, -sinθ · cos(angle));
```

A fixed **+90° pitch rotation** (Y↔Z swap with sign flip) reorients the optical axis from +Y (up) to +Z (forward):

```glsl
rd = vec3(rd.x, rd.z, -rd.y);   // pre-rotation P = +90°
```

Finally, the `viewMatrix` (derived from the camera quaternion) orients the ray into world space.

#### JavaScript Mirror

The `screenToLocalDir()` function in JavaScript contains an exact mirror of the GLSL stereographic pipeline for use by **double-click fly-to** (mapping a screen pixel back to a sphere direction). The JS variables `stereoA0`–`stereoA3` and `stereoD` correspond to the shader uniforms. The output `[rd0, rd2, -rd1]` applies the same +90° pre-rotation.

#### Parameter Presets (Copy / Paste / Reset)

The UI provides **Reset**, **Copy**, and **Paste** buttons for the stereographic parameters (D, a¹–a⁴). Copied parameters are stored as a compact array string in the system clipboard and can be shared between sessions or users. Per-file configs also persist all stereographic parameters in IndexedDB.

---

### Foldable Buckyball-32 Projection — Technical Deep Dive

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

#### Flat Net Layout (JavaScript, runs on layout change)

The 32 polygons must be arranged on a 2D plane such that adjacent faces on the sphere share edges in the net — a classic **graph unfolding** problem. The algorithm:

1. **Adjacency graph**: Face pairs with angular distance < 0.8 rad are neighbors. Each face has exactly 5 (pentagon) or 6 (hexagon) neighbors.

2. **Tangent frames**: For each face, an orthonormal {T₁, T₂} frame is constructed in the tangent plane (perpendicular to the face normal N). This defines a local 2D coordinate system for edge numbering.

3. **Edge indexing** (`edgeIdx(i, j)`): Determines which edge of face `i` faces toward neighbor `j`. The center of face `j` is projected onto face `i`'s tangent plane, its polar angle is measured relative to {T₁, T₂}, and quantized into one of `n` sectors (5 or 6). A small epsilon (1e-10) resolves IEEE 754 half-integer rounding ambiguity.

4. **BFS unfolding** (`place` + `guidedUnfold`): Starting from a seed face at the origin, faces are placed one by one via BFS following the parent tree. For each candidate face `j` adjacent to an already-placed face `i`:
   - The shared edge direction determines the placement angle: `φ = rotation_i + 2π · edge_k / n_i`
   - The offset distance is `apothem_i + apothem_j` (edge-to-center distance for both polygons)
   - An overlap check against all previously placed faces rejects placements where centers are closer than `0.85 × (apothem_j + apothem_k)`.

5. **Parent tree + import angle**: The layout is driven by a parent tree (32-element array mapping each face to its parent in the BFS tree) and an import angle. These can come from a predefined preset, a custom layout, or a JSON paste from the Net Layouter. The `computeBucky32Layout()` function unfolds the tree and applies the supplied rotation angle.

6. **Pre-rotation**: `buckyPreRot` (now a `uniform mat3` rather than a constant) is computed from the layout's seed face and root rotation via `computeBuckyPreRot()`. This aligns the 3D texture mapping with the 2D net.

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
5. **Camera rotation**: The direction is transformed by `viewMatrix · buckyPreRot` (a `uniform mat3` computed from the layout's seed face and root rotation angle via `computeBuckyPreRot()`).
6. **Texture lookup**: The rotated direction is converted to equirectangular UV via `dirToEquirect()` and the panorama is sampled.

#### 2D Canvas Overlay

After the WebGL shader renders the textured polygons, a 2D canvas overlay is composited on top, providing:

- **Polygon edges**: Solid lines along all face boundaries.
- **Glue tabs**: Opaque trapezoidal flaps on boundary edges (edges not shared with a neighbor in the net). These are clipped against all polygon interiors using an even-odd winding rule, so tabs never overlap face content. Flaps always render at full opacity regardless of the Net overlay slider.
- **Face labels**: (optional) Numeric identifiers per face for assembly guidance.

The overlay is rendered to an offscreen 2048px-tall canvas, uploaded as a WebGL texture, and alpha-composited in the fragment shader using the bounding box `buckyBBox` for UV mapping.

#### Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript (runs on layout change or init)                 │
│                                                             │
│  1. Receive parent tree + angle (preset, paste, or import)  │
│  2. BFS unfolding from parent tree → flat net positions     │
│  3. Apply import rotation angle                             │
│  4. Compute tangent frame offsets from true TI vertices      │
│  5. Compute buckyPreRot from seed face + root rotation      │
│  6. Upload uniform vec4 buckyNet[32] + mat3 buckyPreRot     │
│  7. Render 2D overlay (edges, tabs, labels) → texture       │
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

---

### Foldable Rhombic-30 Projection — Technical Deep Dive

The rhombic-30 projection unfolds the full 360° equirectangular panorama onto the **flat net of a rhombic triacontahedron** (RT) — a Catalan solid dual to the icosidodecahedron. All 30 faces are identical golden rhombi (diagonal ratio φ:1), making it an elegant alternative to the buckyball for physical panorama construction.

#### Geometry

A rhombic triacontahedron has **30 identical golden rhombus faces**, 32 vertices (12 icosahedron-type with valence 5, 20 dodecahedron-type with valence 3), and 60 edges.

| Property | Value |
|---|---|
| Faces | 30 golden rhombi |
| Face center distance | 0.8507 (all equal: φ/√(1+φ²)) |
| Long half-diagonal (iB) | 0.8507 (toward 5-valent vertices) |
| Short half-diagonal (iA) | 0.5257 (toward 3-valent vertices) |
| Diagonal ratio | φ:1 ≈ 1.618:1 |
| Inradius | 0.4472 |
| Dihedral angle ψ | atan2(1, φ) ≈ 31.72° |

Face normals are the 30 normalized midpoints of icosahedron edges. The three coordinate families are:
- c₁ = ½, c₂ = (1+√5)/4 ≈ 0.809, c₃ = (√5−1)/4 ≈ 0.309

#### Half-Flower Chain Layout

Unlike the buckyball's BFS unfolding, the RT net uses a **deterministic half-flower chain** pattern:

1. **10 icosahedron vertices** (valence 5) are visited in a fixed order: v1→v3→v7→v11→v5→v10→v6→v4→v2→v8.
2. At each vertex, the 3 faces with the next chain vertex as neighbor are placed as a "half-flower" fan.
3. Edge direction angles `[π−ψ, π+ψ, −ψ, ψ]` control the unfolding geometry.
4. A post-unfolding rotation of −21.41° (−0.373726 rad) aligns flower centers horizontally.

This produces a compact, reproducible layout without search or optimization.

#### Point-in-Rhombus Test (Shader)

Instead of the angular sector test used for regular polygons, the shader uses an **L1 norm** for the axis-aligned golden rhombus:

```glsl
float L1 = abs(rp.x) / ha + abs(rp.y) / hb;
if (L1 < 1.0) { /* inside */ }
```

where `ha` and `hb` are the long and short half-diagonals scaled by `1/buckyScale`.

#### Gnomonic Back-Projection

Same principle as the buckyball: the 2D rhombus position is rotated by a `faceOffset` angle, scaled to gnomonic tangent-plane space (`buckyScale / (iA + iB)`), and projected back onto the unit sphere via `normalize(N + gno.x·T1 + gno.y·T2)`. The direction is then rotated by `viewMatrix · rhombicPreRot`.

#### Flap Generation

The 2D canvas overlay generates trapezoidal glue tabs on boundary edges with:

- **Angle-aware corners**: Acute vertices get wider insets (`INRADIUS × 0.3 × φ ≈ 0.217`), obtuse vertices get narrower ones (`INRADIUS × 0.3 / φ ≈ 0.083`), based on vertex parity `k % 2`.
- **Auto-flip**: `flapHitsAnyFace()` uses L1 norm probing to detect overlaps, automatically negating the flap normal.
- **Manual ownership**: A `flipSet` of 10 edges swaps which face draws the flap for optimal layout.

---

## PNG Export

The export button renders the current view at high resolution and downloads the result as PNG. Each projection uses optimised dimensions:

| Projection | Dimensions | Clipping |
|---|---|---|
| **Equirectangular / Perspective** | `texHeight × (texHeight · aspect)` | Full viewport |
| **Buckyball-32 Preview** | `texHeight × texHeight` (square) | Full viewport |
| **Rhombic-30 Preview** | `texHeight × texHeight` (square) | Full viewport |
| **Azimuthal** | `texWidth × texWidth` (square) | Full viewport |
| **Azimuthal Collage** | `texWidth × (texWidth · ⅔)` (3:2) | Full viewport |
| **Stereographic** | `texWidth × texHeight` (original) | Full viewport |
| **Foldable Buckyball-32** | Longer bbox side → `max(texW, texH)` px | Tight net bounding box (paper outline hidden) |
| **Foldable Rhombic-30** | Longer bbox side → `max(texW, texH)` px | Tight net bounding box |

The implementation resizes the WebGL canvas to export resolution, sets the `exportClip` uniform to remap `screenUV` from the default `(−1,−1)→(1,1)` range to the net's bounding box coordinates (with aspect-ratio compensation), renders a single frame, and reads pixels via `gl.readPixels()` within the same JS task. After export, the canvas and uniform are restored to viewport defaults.

Exported filenames follow the pattern: `{source}-{projection}-{W}x{H}.png`.

---

## Features

| | |
|---|---|
| 🖼️ **Image & Video support** | Drop equirectangular JPEG/PNG or MP4/WebM video files |
| 📽️ **Video playback** | Timeline with seek bar, time display; click to play/pause |
| 🔎 **Magnifier** | Cursor-following lens with adjustable radius and refractivity (half-sphere refraction shader); toggle via `M` key |
| 📐 **Pixelate** | Slider blending between linear (smooth) and nearest-neighbor (pixelated) texture filtering |
| 🌐 **Globe overlay** | 3D sphere with lat/lon grid, equator (orange) and prime meridian (blue) rings; environment reflection from panorama; adjustable size, opacity, and reflectivity; toggle via `G` key |
| 📏 **Grid overlay** | 32×16 grid with crosshairs for orientation (toggle via `X` key) |
| 🎯 **Fly-to** | Double-click to smoothly animate camera toward any point; works in both camera and leveling mode |
| ⚖️ **Horizon leveling** | Dedicated leveling mode with accept/discard; yaw/pitch/roll sliders; double-click horizon to auto-level; per-file persistence |
| 📸 **PNG export** | Export current view at source texture resolution; projection-specific dimensions and clipping |
| 🔢 **Y / P / R sliders** | Live Euler-angle readout; drag to set orientation, double-click to reset; copy/paste quaternion |
| 💾 **Multi-file cache** | Multiple panoramas cached in IndexedDB; switch between cached files via file list; last-viewed file restored on reload |
| ⚙️ **Per-file config** | Camera orientation, FOV, projection mode, grid, globe, leveling, and all projection parameters persisted per file |
| 🎨 **Test pattern** | Built-in checkerboard fallback with meridian/equator markers |

---

## Project Structure

```
dome-mapper/
├── index.html                    # Self-contained viewer (HTML + GLSL + JS)
├── buckyball-net-layouter.html   # Interactive net layout editor for the truncated icosahedron
├── CHANGELOG.md                  # Version history
└── README.md                     # This file
```

### Buckyball Net Layouter

A standalone single-file HTML tool (`buckyball-net-layouter.html`) for interactively optimizing the flat net layout of the truncated icosahedron used by the Buckyball-32 Foldable projection mode.

**Features:**
- **Interactive reparenting** — click any face to reassign its parent in the unfolding tree; the net recomputes instantly
- **Interactive re-rooting** — click a face label to set it as the new tree root; auto re-root picks the most central face after each reparent
- **Glue tab placement mode** — toggle mode where clicking a cut-edge flap swaps tab ownership between adjacent faces; owned tabs appear as solid pink, non-owned as faint ghosts
- **Tab-aware rotation optimization** — auto-rotation accounts for actual tab geometry (owned flap trapezoids) when computing the bounding box and page fill score
- **Paper format presets** — predefined optimized layouts (including tab assignments) for DIN A, Letter, Legal, Tabloid, and B5 JIS paper aspect ratios
- **Custom layouts** — create, save, and delete custom paper formats; persisted in `localStorage`
- **Paper outline** — dashed green rectangle showing the paper boundary on the canvas
- **Flip H / V** — mirror the net layout horizontally or vertically
- **Tree visualization** — displays the parent tree as a miniature graph; hover to preview subtree reparenting
- **Ghost polygon preview** — shows where a face would land before committing a reparent
- **Tooltip fill preview** — hovering a face or flap shows projected page fill with a colored +/− delta
- **Undo / Redo** — browser history-based undo/redo for all layout and tab ownership changes
- **Copy / Paste** — exports `{ label, parents, tabs, mirrored, angle, aspect }` JSON to clipboard; paste accepts the new format, plain arrays, and legacy formats
- **Layout exchange with dome-mapper** — exports include rotation angle and paper aspect ratio; the dome-mapper can paste or select layouts directly from its UI

The tool uses Canvas 2D rendering (no WebGL) and operates entirely on the 2D net geometry — no panorama texture is involved. Optimized layouts from this tool can be transferred to the main viewer's foldable mode via clipboard paste, the "Open Editor" button, or the predefined layout dropdown.

---

## Technical Notes

- **WebGL 2** with GLSL 300 es fragment shader raycaster
- **Quaternion camera** — gimbal-lock-free rotation via unit quaternion with incremental trackball updates; a fixed −90° yaw offset is composed in `viewMatrix()` so sliders start at 0/0/0
- **Euler ↔ quaternion sync** — `quatToEulerDeg()` / `quatFromEulerDeg()` (Tait-Bryan YXZ) keep sliders and quaternion in lockstep
- NPOT textures fully supported (no power-of-2 restriction)
- Texture wrap: `REPEAT` on S (horizontal seamless), `CLAMP_TO_EDGE` on T (poles)
- Mipmaps generated automatically for power-of-2 textures
- HiDPI support (capped at 2× device pixel ratio)

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

---

## Roadmap

> The rendering backend may migrate to **WebGPU** for compute shader support and more flexible pipeline control. The current WebGL 2 implementation serves as a baseline.

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

---

## Acknowledgements

This software was built with the assistance of **Claude Opus 4.6** (Anthropic). It builds upon another project by the same author:

- **[spherical-reprojection](https://github.com/Flexi23/spherical-reprojection)** — GPU-based spherical image reprojection

---

## License

This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE](LICENSE) file for details.

<div align="center">

**© 2026 Felix Woitzel / [cake23.de](https://cake23.de)**

</div>
