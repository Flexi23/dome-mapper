'use strict';
// ═══════════════════════════════════════════════════════════════════════
// Geometry Presets — Shared polyhedron definitions for net-layouter.html
// ═══════════════════════════════════════════════════════════════════════

// ── 3D vector helpers ──
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm3(v) { const l = Math.sqrt(dot3(v, v)); return [v[0] / l, v[1] / l, v[2] / l]; }
function scale3(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }

// ── Paper formats (width > height, landscape) ──
const PAPER_FORMATS = [
	{ label: 'DIN A4 (210×297 mm)', width: 297, height: 210 },
	{ label: 'DIN A3 (297×420 mm)', width: 420, height: 297 },
	{ label: 'DIN A2 (420×594 mm)', width: 594, height: 420 },
	{ label: 'DIN A1 (594×841 mm)', width: 841, height: 594 },
	{ label: 'DIN A0 (841×1189 mm)', width: 1189, height: 841 },
	{ label: 'US Letter (8.5×11 in)', width: 279.4, height: 215.9 },
	{ label: 'US Legal (8.5×14 in)', width: 355.6, height: 215.9 },
	{ label: 'US Tabloid (11×17 in)', width: 431.8, height: 279.4 },
	{ label: 'B5 JIS (182×257 mm)', width: 257, height: 182 },
];

// ── Regular polygon helpers ──
function regularApothem(n) { return 1 / (2 * Math.tan(Math.PI / n)); }
function regularCircumR(n) { return 1 / (2 * Math.sin(Math.PI / n)); }
function regularArea(n) { const R = regularCircumR(n); return (n / 2) * R * R * Math.sin(2 * Math.PI / n); }

// Point-in-regular-polygon test (angular fold, matches GLSL)
function pipRegular(rpx, rpy, n, invS) {
	const an = Math.PI / n;
	const ap = invS / (2 * Math.tan(an));
	const raw = Math.atan2(rpy, rpx) + an;
	const sector = 2 * an;
	const a = ((raw % sector) + sector) % sector - an;
	return Math.hypot(rpx, rpy) * Math.cos(a) < ap;
}

// Regular polygon vertices in world coords
function regularPolyVerts(fx, fy, rot, n, cr) {
	const verts = [];
	for (let k = 0; k < n; k++) {
		const a = rot + (2 * k + 1) * Math.PI / n;
		verts.push({ x: fx + cr * Math.cos(a), y: fy + cr * Math.sin(a) });
	}
	return verts;
}

// Build tangent frames for face normals
function buildFrames(c3, nFaces) {
	const frames = [];
	for (let i = 0; i < nFaces; i++) {
		const N = c3[i];
		let up = [0, 1, 0];
		if (Math.abs(dot3(N, up)) > 0.9) up = [1, 0, 0];
		const T1 = norm3(cross3(N, up));
		const T2 = cross3(N, T1);
		frames.push([T1, T2]);
	}
	return frames;
}

// Pick two most-antipodal face centers as default poles
function defaultPoles(c3) {
	let bestI = 0, bestJ = 1, bestDot = 2;
	for (let i = 0; i < c3.length; i++)
		for (let j = i + 1; j < c3.length; j++) {
			const d = dot3(c3[i], c3[j]);
			if (d < bestDot) { bestDot = d; bestI = i; bestJ = j; }
		}
	return {
		northPole: { type: 'center', face: bestI, dir: c3[bestI].slice() },
		southPole: { type: 'center', face: bestJ, dir: c3[bestJ].slice() }
	};
}

// ── Shared net layout functions ──

// BFS unfold net from parent tree
function unfoldNet(geo, parents, mirrored) {
	const N = geo.nFaces;
	const seed = parents.indexOf(-1);
	const placed = new Array(N).fill(false);
	const parent = parents.slice();
	const res = new Array(N);
	res[seed] = { x: 0, y: 0, r: geo.initialRotation || 0 };
	placed[seed] = true;
	const queue = [seed];
	let qi = 0;
	while (qi < queue.length) {
		const p = queue[qi++];
		for (let j = 0; j < N; j++) {
			if (placed[j] || parent[j] !== p) continue;
			res[j] = geo.ghostPlace(p, j, res, mirrored || false);
			placed[j] = true;
			queue.push(j);
		}
	}
	return { res, placed, parent, count: placed.filter(Boolean).length, seed, mirrored: mirrored || false };
}

// Collect vertex positions from unfolded layout (flat pairs array: [x0,y0, x1,y1, ...])
function netVertexPoints(geo, layout) {
	const N = geo.nFaces;
	const { res, placed } = layout;
	const pts = [];
	for (let i = 0; i < N; i++) {
		if (!placed[i]) continue;
		const verts = geo.polyVerts(res[i].x, res[i].y, res[i].r, i, layout.mirrored || false);
		for (const v of verts) { pts.push(v.x, v.y); }
	}
	return pts;
}

// Find optimal rotation angle for a given paper aspect ratio (landscape w/h)
function optimizeNetAngle(geo, layout, aspect) {
	const pts = netVertexPoints(geo, layout);
	let bestA = 0, bestScore = Infinity;
	for (let hdeg = 0; hdeg < 360; hdeg++) {
		const rad = hdeg * 0.5 * Math.PI / 180;
		const cs = Math.cos(rad), sn = Math.sin(rad);
		let mnX = 1e9, mxX = -1e9, mnY = 1e9, mxY = -1e9;
		for (let p = 0; p < pts.length; p += 2) {
			const rx = pts[p] * cs - pts[p + 1] * sn;
			const ry = pts[p] * sn + pts[p + 1] * cs;
			mnX = Math.min(mnX, rx); mxX = Math.max(mxX, rx);
			mnY = Math.min(mnY, ry); mxY = Math.max(mxY, ry);
		}
		const w = mxX - mnX, h = mxY - mnY;
		const s = Math.min(aspect / w, 1 / h);
		const score = aspect / (s * s);
		if (score < bestScore) { bestScore = score; bestA = rad; }
	}
	if (bestA > Math.PI / 2) bestA -= Math.PI;
	return bestA;
}

// Apply rotation angle to all face positions in layout
function applyNetAngle(layout, angle, nFaces) {
	const { res, placed } = layout;
	const cs = Math.cos(angle), sn = Math.sin(angle);
	for (let i = 0; i < nFaces; i++) {
		if (!placed[i]) continue;
		const x = res[i].x, y = res[i].y;
		res[i].x = x * cs - y * sn;
		res[i].y = x * sn + y * cs;
		res[i].r += angle;
	}
	layout.angle = angle;
}

// Compute pre-rotation matrix from north pole direction and longitude offset
function computePreRot(northPoleDir, lonOffset) {
	const V = norm3(northPoleDir);
	let ref = [0, 0, -1];
	if (Math.abs(dot3(ref, V)) > 0.9) ref = [1, 0, 0];
	let W = sub3(ref, scale3(V, dot3(ref, V)));
	W = norm3(W);
	const cs = Math.cos(lonOffset || 0), sn = Math.sin(lonOffset || 0);
	const VxW = cross3(V, W);
	W = [cs * W[0] + sn * VxW[0], cs * W[1] + sn * VxW[1], cs * W[2] + sn * VxW[2]];
	const U = cross3(V, W);
	return new Float32Array([
		-U[0], V[0], -W[0],
		-U[1], V[1], -W[1],
		-U[2], V[2], -W[2]
	]);
}

// Round-based edge index for regular polygon faces (buckyball, truncoct, rhombicosi)
function regularEdgeIdx(c3, frames, nSides, i, j) {
	const N = c3[i], [T1, T2] = frames[i], M = c3[j];
	const proj = sub3(M, scale3(N, dot3(M, N)));
	const pn = norm3(proj);
	let a = Math.atan2(dot3(pn, T2), dot3(pn, T1));
	if (a < 0) a += 2 * Math.PI;
	const n = nSides(i);
	return Math.round(a * n / (2 * Math.PI) + 1e-10) % n;
}

// Ghost placement for regular polygon faces
function regularGhostPlace(nSides, apothem, edgeIdx, i, j, res, mirrored) {
	const ni = nSides(i), nj = nSides(j);
	const ki = edgeIdx(i, j), kj = edgeIdx(j, i);
	const s = mirrored ? -1 : 1;
	const phi = res[i].r + s * 2 * Math.PI * ki / ni;
	const dist = apothem(i) + apothem(j);
	return {
		x: res[i].x + dist * Math.cos(phi),
		y: res[i].y + dist * Math.sin(phi),
		r: phi + Math.PI - s * 2 * Math.PI * kj / nj
	};
}

// Collision check for regular polygon faces (distance-based)
function regularCollisionCheck(nFaces, apothem, placed, res, j, px, py) {
	for (let k = 0; k < nFaces; k++) {
		if (!placed[k]) continue;
		const dx = px - res[k].x, dy = py - res[k].y;
		const d = Math.sqrt(dx * dx + dy * dy);
		if (d < (apothem(j) + apothem(k)) * 0.85) return true;
	}
	return false;
}

// tryPlace for regular polygon faces
function regularTryPlace(geo, i, j, res, placed, mirrored) {
	const pos = geo.ghostPlace(i, j, res, mirrored);
	if (regularCollisionCheck(geo.nFaces, geo.apothem, placed, res, j, pos.x, pos.y)) return null;
	return pos;
}

// Edge slot mapping for regular polygon faces (edgeIdx → drawing slot)
function regularEdgeSlot(n, k, mirrored) {
	return mirrored ? (n - k - 1 + n) % n : (k - 1 + n) % n;
}

// Ghost placement for irregular polygon faces (rhombi, kites, irregular pentagons).
// Aligns edge ki of parent i with edge kj of child j via shared vertex positions.
function irregularGhostPlace(vtx, n, edgeDirAngles, edgeIdx, i, j, res, mirrored) {
	const ki = edgeIdx(i, j), kj = edgeIdx(j, i);
	const s = mirrored ? -1 : 1;
	const r2 = res[i].r + s * edgeDirAngles[ki] - s * edgeDirAngles[kj] + Math.PI;
	const qi = mirrored ? ki : (ki + 1) % n;
	const cr1 = Math.cos(res[i].r * s), sr1 = Math.sin(res[i].r * s);
	const Qx = res[i].x + (vtx[qi][0] * cr1 - vtx[qi][1] * sr1) * s;
	const Qy = res[i].y + vtx[qi][0] * sr1 + vtx[qi][1] * cr1;
	const cr2 = Math.cos(r2 * s), sr2 = Math.sin(r2 * s);
	const qj = mirrored ? (kj + 1) % n : kj;
	const vjx = (vtx[qj][0] * cr2 - vtx[qj][1] * sr2) * s;
	const vjy = vtx[qj][0] * sr2 + vtx[qj][1] * cr2;
	return { x: Qx - vjx, y: Qy - vjy, r: r2 };
}

// Collision check for irregular polygon faces (L1 bound in local frame).
function irregularCollisionCheck(nFaces, inradius, halfW, halfH, placed, res, j, px, py) {
	const threshold = inradius * 1.7;
	for (let k = 0; k < nFaces; k++) {
		if (!placed[k]) continue;
		const dx = px - res[k].x, dy = py - res[k].y;
		const d = Math.sqrt(dx * dx + dy * dy);
		if (d < threshold) {
			const crk = Math.cos(-res[k].r), srk = Math.sin(-res[k].r);
			const lx = dx * crk - dy * srk, ly = dx * srk + dy * crk;
			if (Math.abs(lx) / halfW + Math.abs(ly) / halfH < 1.7) return true;
		}
	}
	return false;
}

// Cyclic ordering of edges around a shared vertex in 3D (for dual adjacency).
function cyclicOrderEdges(verts, edges, vIdx, edgeList) {
	const N = verts[vIdx];
	let up = [0, 1, 0];
	if (Math.abs(dot3(N, up)) > 0.9) up = [1, 0, 0];
	const T1 = norm3(cross3(N, up));
	const T2 = cross3(N, T1);
	const withAngle = edgeList.map(ei => {
		const [a, b] = edges[ei];
		const other = a === vIdx ? b : a;
		const d = sub3(verts[other], scale3(N, dot3(verts[other], N)));
		return { ei, angle: Math.atan2(dot3(d, T2), dot3(d, T1)) };
	});
	withAngle.sort((a, b) => a.angle - b.angle);
	return withAngle.map(x => x.ei);
}


// ═══════════════════════════════════════════════════════════════════════
// Geometry definitions
// ═══════════════════════════════════════════════════════════════════════
const GEOMETRIES = {};

// ─────────────────────────────────────────────────────────────────────
// Buckyball-32 (Truncated Icosahedron: 12 pentagons + 20 hexagons)
// ─────────────────────────────────────────────────────────────────────
GEOMETRIES.buckyball32 = (function() {
	const PHI = (1 + Math.sqrt(5)) / 2;
	const iA = 1 / Math.sqrt(1 + PHI * PHI);
	const iB = PHI * iA;
	const dC = 1 / Math.sqrt(3);
	const dD = PHI * dC;
	const dE = dC / PHI;

	const c3 = [
		[0, iA, iB], [0, iA, -iB], [0, -iA, iB], [0, -iA, -iB],
		[iA, iB, 0], [iA, -iB, 0], [-iA, iB, 0], [-iA, -iB, 0],
		[iB, 0, iA], [iB, 0, -iA], [-iB, 0, iA], [-iB, 0, -iA],
		[dC, dC, dC], [dC, dC, -dC], [dC, -dC, dC], [dC, -dC, -dC],
		[-dC, dC, dC], [-dC, dC, -dC], [-dC, -dC, dC], [-dC, -dC, -dC],
		[0, dD, dE], [0, dD, -dE], [0, -dD, dE], [0, -dD, -dE],
		[dE, 0, dD], [dE, 0, -dD], [-dE, 0, dD], [-dE, 0, -dD],
		[dD, dE, 0], [dD, -dE, 0], [-dD, dE, 0], [-dD, -dE, 0]
	];

	const nFaces = 32;
	const nSides = i => i < 12 ? 5 : 6;

	const adj = Array.from({ length: nFaces }, () => []);
	for (let i = 0; i < nFaces; i++)
		for (let j = i + 1; j < nFaces; j++) {
			const d = Math.acos(Math.min(1, Math.max(-1, dot3(c3[i], c3[j]))));
			if (d < 0.8) { adj[i].push(j); adj[j].push(i); }
		}

	const frames = buildFrames(c3, nFaces);

	const ap5 = regularApothem(5);
	const ap6 = regularApothem(6);
	const cr5 = regularCircumR(5);
	const cr6 = regularCircumR(6);
	const tabH = ap5 * 0.3;
	const tabInset = 0.15;
	const singleTabArea = (1 - tabInset) * tabH;

	function edgeIdx(i, j) { return regularEdgeIdx(c3, frames, nSides, i, j); }
	function apothem(i) { return nSides(i) === 5 ? ap5 : ap6; }
	function circumR(i) { return nSides(i) === 5 ? cr5 : cr6; }

	const presets = [
		{label:'DIN A (1:√2)',aspect:1.4142857142857144,parents:[12,13,14,15,13,15,21,23,28,-1,30,19,4,9,5,9,20,1,2,3,4,13,5,15,12,9,0,25,9,9,6,19],tabs:{"18-31":31,"10-31":31,"30-31":31,"18-26":26,"2-26":26,"10-26":26,"22-23":23,"5-23":23,"19-23":23,"3-23":23,"5-29":29,"14-29":29,"8-29":29,"28-29":29,"15-29":29,"2-22":22,"18-22":22,"2-24":24,"0-24":24,"4-28":28,"12-28":12,"13-28":28,"3-25":25,"1-25":25,"13-25":25,"15-25":25,"17-21":21,"20-21":21,"4-21":21,"0-20":20,"12-20":20,"14-22":22,"1-21":21,"14-24":24,"17-30":17,"17-27":27,"1-27":1,"11-31":31,"6-17":17,"6-20":20,"7-19":19,"7-22":22,"7-18":18,"8-12":8,"10-18":10,"19-27":27,"11-17":11},mirrored:false,angle:0.715584993317675,lonOffset:0.2216000019948305,northPole:{type:'vertex',dir:[0.6444904486331027,-0.20847820715386578,0.735641827768522]},southPole:{type:'vertex',dir:[-0.6444904486331027,0.20847820715386578,-0.735641827768522]}},
		{label:'US Letter (8.5×11 in)',aspect:1.2941176470588234,parents:[20,13,24,25,-1,29,20,31,24,28,16,17,0,4,29,5,20,6,26,3,4,4,18,15,0,13,0,1,4,28,6,30],tabs:{"7-22":7,"22-23":23,"11-30":30,"11-31":11,"11-19":19,"6-21":21,"17-21":21,"20-21":21,"1-21":21,"13-21":21,"9-13":13,"9-25":25,"9-15":9,"9-29":29,"14-22":22,"8-12":12,"4-12":12,"6-16":16,"0-16":16,"17-30":30,"17-27":17,"1-25":25,"19-27":27,"5-23":23,"2-26":26,"2-18":18,"2-22":22,"8-14":8,"8-29":8,"8-28":28,"5-14":14,"1-17":17,"7-23":23,"15-25":25,"7-18":18,"15-29":29},mirrored:false,angle:1.0995574287564276,northPole:{type:'center',face:14,dir:[0.5773502691896258,-0.5773502691896258,0.5773502691896258]},southPole:{type:'center',face:17,dir:[-0.5773502691896258,0.5773502691896258,-0.5773502691896258]}},
		{label:'US Legal (8.5×14 in)',aspect:1.647058823529412,parents:[12,21,14,27,12,14,20,22,12,28,18,30,-1,1,8,5,0,1,2,11,12,20,14,22,8,1,24,1,8,8,6,18],tabs:{"19-23":23,"10-30":30,"10-16":16,"9-25":25,"15-25":25,"3-23":23,"17-21":17,"13-25":25,"3-25":25,"4-28":28,"12-28":28,"13-21":13,"9-29":29,"5-29":29,"16-20":20,"0-20":20,"0-24":24,"2-24":24,"18-22":22,"7-23":23,"15-29":29,"9-15":15,"6-17":17,"11-17":17,"6-21":21,"28-29":29,"14-29":29,"10-31":31},mirrored:false,angle:1.4835298641951802,northPole:{type:'center',face:10,dir:[-0.85065080835204,0,0.5257311121191336]},southPole:{type:'center',face:9,dir:[0.85065080835204,0,-0.5257311121191336]}},
		{label:'US Tabloid (11×17 in)',aspect:1.54362,parents:[24,25,14,15,12,-1,16,22,14,15,26,19,0,21,5,5,0,1,2,3,0,4,5,5,14,15,24,25,8,5,16,19],tabs:{"11-30":30,"17-30":30,"10-31":31,"10-30":10,"3-23":23,"19-23":23,"7-23":23,"22-23":23,"15-23":23,"2-22":22,"18-22":22,"14-22":22,"2-26":2,"16-26":26,"10-16":16,"11-17":17,"9-29":29,"8-29":29,"28-29":29,"4-20":20,"6-20":20,"0-26":26,"17-27":27,"1-27":27},mirrored:false,angle:0.17453292519943295},
		{label:'B5 JIS (182×257 mm)',aspect:1.2987,parents:[24,21,24,27,12,29,21,18,12,29,30,17,-1,9,24,9,20,21,2,27,4,4,14,15,12,1,16,1,29,8,6,31],tabs:{"13-28":28,"12-28":28,"4-28":28,"8-28":28,"4-13":13,"13-21":21,"5-15":15,"5-23":5,"5-14":14,"6-20":20,"11-27":27,"19-31":31,"10-31":10,"10-26":10,"24-26":26,"7-22":7,"22-23":23,"3-25":25,"3-19":19,"19-23":19,"9-28":28,"1-13":13,"18-22":22,"18-31":31,"18-26":26,"10-18":18},mirrored:false,angle:1.4660765716752369}
	];
	presets.forEach(p => { if (!p.northPole) Object.assign(p, defaultPoles(c3)); });

	return {
		id: 'buckyball32',
		name: 'Buckyball-32',
		nFaces,
		storageKey: 'bucky-custom-layouts',
		c3, adj, frames,
		nSides,
		edgeIdx,
		apothem,
		circumR,
		tabH,
		tabInset: tabInset,
		singleTabArea,
		initialRotation: 0,

		ghostPlace(i, j, res, mirrored) {
			return regularGhostPlace(nSides, apothem, edgeIdx, i, j, res, mirrored);
		},
		tryPlace(i, j, res, placed, mirrored) {
			return regularTryPlace(this, i, j, res, placed, mirrored);
		},
		polyVerts(fx, fy, rot, i) {
			return regularPolyVerts(fx, fy, rot, nSides(i), circumR(i));
		},
		faceArea(i) { return regularArea(nSides(i)); },
		tabInsets(i, k) { return [tabInset, tabInset]; },
		edgeSlot(i, k, mirrored) { return regularEdgeSlot(nSides(i), k, mirrored); },
		faceLabel(i) { return i < 12 ? 'pent' : 'hex'; },
		faceColor(i, isSelf, isTarget) {
			const n = nSides(i);
			if (isSelf) return n === 5 ? 'rgba(100, 80, 180, 0.9)' : 'rgba(60, 100, 160, 0.9)';
			if (isTarget) return n === 5 ? 'rgba(120, 80, 200, 0.45)' : 'rgba(60, 140, 220, 0.45)';
			return n === 5 ? 'rgba(60, 50, 80, 0.85)' : 'rgba(40, 55, 75, 0.85)';
		},
		ghostColor(i) {
			return nSides(i) === 5 ? 'rgba(120, 80, 200, 0.25)' : 'rgba(60, 140, 220, 0.25)';
		},
		pip(rpx, rpy, i, invS) { return pipRegular(rpx, rpy, nSides(i), invS); },
		gnoProject(i, rpx, rpy, scale, faceOff) {
			const rF = i < 12 ? 0.9392580 : 0.9149168;
			const gS = scale * Math.sqrt(1 - rF * rF) * 2 * Math.sin(Math.PI / nSides(i));
			const co = Math.cos(faceOff), so = Math.sin(faceOff);
			return { gx: (rpx * co - rpy * so) * gS, gy: (rpx * so + rpy * co) * gS, rF };
		},
		presets,
	};
})();

// ─────────────────────────────────────────────────────────────────────
// Rhombic-30 (Rhombic Triacontahedron: 30 congruent golden rhombi)
// ─────────────────────────────────────────────────────────────────────
GEOMETRIES.rhombic30 = (function() {
	const N_FACES = 30;
	const PHI = (1 + Math.sqrt(5)) / 2;
	const iA = 1 / Math.sqrt(1 + PHI * PHI);
	const iB = PHI * iA;
	const INRADIUS = iA * iB;
	const PSI = Math.atan2(1, PHI);

	const rhombVtx = [[iB, 0], [0, iA], [-iB, 0], [0, -iA]];
	const edgeDirAngles = [Math.PI - PSI, Math.PI + PSI, -PSI, PSI];
	const _tabH = INRADIUS * 0.3;
	const tabInsetAcute = INRADIUS * 0.3 * PHI;
	const tabInsetObtuse = INRADIUS * 0.3 / PHI;
	const singleTabArea = (iA + iB) / 2 * _tabH * 0.7;
	const rhombusArea = 2 * iA * iB;

	// Icosahedron vertices
	const icoVerts = [];
	for (const s1 of [1, -1])
		for (const s2 of [1, -1]) {
			icoVerts.push(norm3([0, s1, s2 * PHI]));
			icoVerts.push(norm3([s1, s2 * PHI, 0]));
			icoVerts.push(norm3([s2 * PHI, 0, s1]));
		}

	// 30 icosahedron edges = 30 face normals
	const threshold = 1 / Math.sqrt(5);
	const edges = [];
	for (let i = 0; i < 12; i++)
		for (let j = i + 1; j < 12; j++)
			if (Math.abs(dot3(icoVerts[i], icoVerts[j]) - threshold) < 0.01)
				edges.push([i, j]);

	const c3 = edges.map(([i, j]) => {
		const m = [icoVerts[i][0] + icoVerts[j][0], icoVerts[i][1] + icoVerts[j][1], icoVerts[i][2] + icoVerts[j][2]];
		return norm3(m);
	});

	const frames = buildFrames(c3, N_FACES);

	// Face offsets
	const faceOffsets = [];
	for (let fi = 0; fi < N_FACES; fi++) {
		const N = c3[fi], [T1, T2] = frames[fi];
		const va = icoVerts[edges[fi][0]];
		const proj = sub3(va, scale3(N, dot3(va, N)));
		faceOffsets.push(Math.atan2(dot3(proj, T2), dot3(proj, T1)));
	}

	// Adjacency graph
	const vertexEdges = Array.from({ length: 12 }, () => []);
	edges.forEach(([a, b], ei) => { vertexEdges[a].push(ei); vertexEdges[b].push(ei); });

	const _cyclicOrderEdges = (vIdx, edgeList) => cyclicOrderEdges(icoVerts, edges, vIdx, edgeList);

	const adj = Array.from({ length: N_FACES }, () => []);
	for (let v = 0; v < 12; v++) {
		const ring = _cyclicOrderEdges(v, vertexEdges[v]);
		for (let k = 0; k < ring.length; k++) {
			const ei = ring[k], ej = ring[(k + 1) % ring.length];
			if (!adj[ei].includes(ej)) adj[ei].push(ej);
			if (!adj[ej].includes(ei)) adj[ej].push(ei);
		}
	}

	function edgeIdx(i, j) {
		const N = c3[i], [T1, T2] = frames[i];
		const proj = sub3(c3[j], scale3(N, dot3(c3[j], N)));
		const pn = norm3(proj);
		let a = Math.atan2(dot3(pn, T2), dot3(pn, T1));
		if (a < 0) a += 2 * Math.PI;
		let rel = a - faceOffsets[i];
		if (rel < 0) rel += 2 * Math.PI;
		if (rel >= 2 * Math.PI) rel -= 2 * Math.PI;
		return Math.floor(rel / (Math.PI / 2)) % 4;
	}

	const _ghostPlace = (i, j, res, mirrored) =>
		irregularGhostPlace(rhombVtx, 4, edgeDirAngles, edgeIdx, i, j, res, mirrored);
	const _collisionCheck = (j, px, py, pr, placed, res) =>
		irregularCollisionCheck(N_FACES, INRADIUS, iB, iA, placed, res, j, px, py);

	const presets = [
		{label:'DIN A (1:√2)',aspect:1.4142857142857144,parents:[-1,0,4,1,0,0,7,0,5,10,1,5,7,6,15,12,10,11,17,16,3,4,23,21,16,12,17,29,15,23],tabs:{"22-24":24,"3-10":10,"6-12":12,"8-11":8,"15-25":25,"22-29":22,"27-28":28,"2-3":3,"9-16":16},mirrored:false,angle:0.017453292519943295,lonOffset:1.5707963267948968,northPole:{type:'vertex',dir:[-1.3051454412604205e-17,-0.5257311121191336,0.8506508083520399]},southPole:{type:'vertex',dir:[0,0.5257311121191336,-0.8506508083520399]}},
		{label:'US Letter (8.5×11 in)',aspect:1.2941176470588234,parents:[-1,0,4,1,0,0,7,0,5,10,1,5,7,6,15,12,10,11,17,16,3,4,23,21,16,12,17,29,15,23],tabs:{"22-24":24,"3-10":10,"6-12":12,"8-11":8,"15-25":25,"22-29":22,"27-28":28,"2-3":3,"9-16":16},mirrored:false,angle:0.08726646259971647,northPole:{type:'vertex',dir:[-0.8506508083520399,0,0.5257311121191336]},southPole:{type:'vertex',dir:[0.8506508083520399,0,-0.5257311121191336]}},
		{label:'US Legal (8.5×14 in)',aspect:1.647058823529412,parents:[4,0,4,1,-1,0,7,0,5,10,1,5,7,8,28,12,10,11,17,16,3,4,23,21,16,12,17,29,29,23],tabs:{"13-14":14,"9-16":16,"3-10":10,"4-7":7,"15-25":25,"14-15":15,"19-27":27},mirrored:false,angle:1.064650843716541,northPole:{type:'vertex',dir:[-0.8506508083520399,0,0.5257311121191336]},southPole:{type:'vertex',dir:[0.8506508083520399,0,-0.5257311121191336]}},
		{label:'US Tabloid (11×17 in)',aspect:17/11,parents:[4,0,4,1,-1,0,7,0,5,10,1,5,7,8,28,12,10,11,17,16,3,4,23,21,16,12,17,29,29,23],tabs:{"13-14":14,"9-16":16,"3-10":10,"4-7":7,"15-25":15,"14-15":14,"19-27":27,"18-27":27,"18-19":19,"18-26":18,"8-11":11,"2-3":3,"19-24":24,"23-25":25},mirrored:false,angle:1.0821041362364843},
		{label:'B5 JIS (182×257 mm)',aspect:257/182,parents:[-1,0,4,1,0,0,7,0,5,10,1,5,7,6,15,12,10,11,17,16,3,4,23,21,16,12,17,29,15,23],tabs:{},mirrored:false,angle:0},
	];
	presets.forEach(p => { if (!p.northPole) Object.assign(p, defaultPoles(c3)); });

	return {
		id: 'rhombic30',
		name: 'Rhombic-30',
		nFaces: N_FACES,
		storageKey: 'rhombic30-custom-layouts',
		c3, adj, frames,
		nSides() { return 4; },
		edgeIdx,
		apothem() { return INRADIUS; },
		circumR() { return Math.sqrt(iA * iA + iB * iB); },
		tabH: _tabH,
		tabInset: tabInsetAcute,
		singleTabArea,
		initialRotation: Math.PI / 2,

		ghostPlace: _ghostPlace,
		tryPlace(i, j, res, placed, mirrored) {
			const pos = _ghostPlace(i, j, res, mirrored);
			if (_collisionCheck(j, pos.x, pos.y, pos.r, placed, res)) return null;
			return pos;
		},
		polyVerts(fx, fy, rot) {
			const cr = Math.cos(rot), sr = Math.sin(rot);
			return rhombVtx.map(([lx, ly]) => ({
				x: fx + lx * cr - ly * sr,
				y: fy + lx * sr + ly * cr
			}));
		},
		faceArea() { return rhombusArea; },
		tabInsets(i, k) {
			return (k % 2 === 0) ? [tabInsetAcute, tabInsetObtuse] : [tabInsetObtuse, tabInsetAcute];
		},
		edgeSlot(i, k) { return k; },
		faceLabel() { return 'rhombus'; },
		faceColor(i, isSelf, isTarget) {
			if (isSelf) return 'rgba(60, 100, 160, 0.9)';
			if (isTarget) return 'rgba(60, 140, 220, 0.45)';
			return 'rgba(40, 55, 75, 0.85)';
		},
		ghostColor() { return 'rgba(60, 140, 220, 0.25)'; },
		pip(rpx, rpy, i, invS) { return Math.abs(rpx) / (iB * invS) + Math.abs(rpy) / (iA * invS) < 1; },
		gnoProject(i, rpx, rpy, scale, faceOff) {
			const gS = scale / (iA + iB);
			const co = Math.cos(faceOff), so = Math.sin(faceOff);
			return { gx: (rpx * co - rpy * so) * gS, gy: (rpx * so + rpy * co) * gS, rF: 1 };
		},
		presets,
	};
})();

// ─────────────────────────────────────────────────────────────────────
// Truncoct-14 (Truncated Octahedron: 8 hexagons + 6 squares)
// ─────────────────────────────────────────────────────────────────────
GEOMETRIES.truncoct14 = (function() {
	const nFaces = 14;
	const INV_SQRT3 = 1 / Math.sqrt(3);
	const c3 = [
		[INV_SQRT3, INV_SQRT3, INV_SQRT3], [INV_SQRT3, INV_SQRT3, -INV_SQRT3],
		[INV_SQRT3, -INV_SQRT3, INV_SQRT3], [INV_SQRT3, -INV_SQRT3, -INV_SQRT3],
		[-INV_SQRT3, INV_SQRT3, INV_SQRT3], [-INV_SQRT3, INV_SQRT3, -INV_SQRT3],
		[-INV_SQRT3, -INV_SQRT3, INV_SQRT3], [-INV_SQRT3, -INV_SQRT3, -INV_SQRT3],
		[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
	];

	const nSides = i => i < 8 ? 6 : 4;

	const adj = Array.from({ length: nFaces }, () => []);
	for (let i = 0; i < nFaces; i++)
		for (let j = i + 1; j < nFaces; j++) {
			const d = Math.acos(Math.min(1, Math.max(-1, dot3(c3[i], c3[j]))));
			if (d < 1.3) { adj[i].push(j); adj[j].push(i); }
		}

	const frames = buildFrames(c3, nFaces);

	const ap6 = regularApothem(6);
	const ap4 = regularApothem(4);
	const cr6 = regularCircumR(6);
	const cr4 = regularCircumR(4);
	const tabH = ap4 * 0.3;
	const tabInset = 0.15;
	const singleTabArea = (1 - tabInset) * tabH;

	function edgeIdx(i, j) { return regularEdgeIdx(c3, frames, nSides, i, j); }
	function apothem(i) { return nSides(i) === 6 ? ap6 : ap4; }
	function circumR(i) { return nSides(i) === 6 ? cr6 : cr4; }


	const presets = [
		{label:'DIN A (1:√2)',aspect:1.4142857142857144,parents:[1,3,11,-1,6,13,7,3,1,6,1,7,6,3],tabs:{"4-9":4,"6-9":9,"4-6":6,"5-10":5,"0-10":0,"0-1":1,"5-9":5,"2-8":2,"3-8":3,"3-11":3,"6-11":6,"2-11":2,"4-12":4,"4-10":4,"2-12":2,"0-12":0,"0-4":4,"0-8":0,"7-13":7,"1-13":1,"1-10":10,"7-9":7,"4-5":5,"1-5":5,"0-2":2},mirrored:false,angle:0.951204442336909,lonOffset:-2.0943951023931957,northPole:{type:'center',face:2,dir:[0.5773502691896258,-0.5773502691896258,0.5773502691896258]},southPole:{type:'center',face:5,dir:[-0.5773502691896258,0.5773502691896258,-0.5773502691896258]}},
		{"label":"US Letter (8.5×11 in)","parents":[1,3,3,-1,10,1,2,13,1,7,1,2,2,1],"tabs":{"4-12":12,"4-6":6,"7-11":11},"mirrored":false,"angle":-1.308996938995747,"aspect":1.2941176470588234,"northPole":{"type":"center","face":7,"dir":[-0.5773502691896258,-0.5773502691896258,-0.5773502691896258]},"southPole":{"type":"center","face":0,"dir":[0.5773502691896258,0.5773502691896258,0.5773502691896258]}},
		{label:"US Legal (8.5×14 in)",aspect:1.6470588235294117,parents:[1,3,11,-1,6,13,7,3,1,6,1,7,6,3],tabs:{},mirrored:false,angle:0.9162978572970231},
		{label:"US Tabloid (11×17 in)",aspect:1.5454545454545454,parents:[1,3,11,-1,6,13,7,3,1,6,1,7,6,3],tabs:{},mirrored:false,angle:0.9162978572970231},
		{label:"B5 JIS (182×257 mm)",aspect:1.4120879120879122,parents:[1,3,11,-1,6,13,7,3,1,6,1,7,6,3],tabs:{},mirrored:false,angle:0.9512044423369095},
	];
	presets.forEach(p => { if (!p.northPole) Object.assign(p, defaultPoles(c3)); });

	return {
		id: 'truncoct14',
		name: 'Truncoct-14',
		nFaces,
		storageKey: 'truncoct14-custom-layouts',
		c3, adj, frames,
		nSides,
		edgeIdx,
		apothem,
		circumR,
		tabH,
		tabInset,
		singleTabArea,
		initialRotation: 0,

		ghostPlace(i, j, res, mirrored) {
			return regularGhostPlace(nSides, apothem, edgeIdx, i, j, res, mirrored);
		},
		tryPlace(i, j, res, placed, mirrored) {
			return regularTryPlace(this, i, j, res, placed, mirrored);
		},
		polyVerts(fx, fy, rot, i) {
			return regularPolyVerts(fx, fy, rot, nSides(i), circumR(i));
		},
		faceArea(i) { return regularArea(nSides(i)); },
		tabInsets(i, k) { return [tabInset, tabInset]; },
		edgeSlot(i, k, mirrored) { return regularEdgeSlot(nSides(i), k, mirrored); },
		faceLabel(i) { return i < 8 ? 'hex' : 'sq'; },
		faceColor(i, isSelf, isTarget) {
			const n = nSides(i);
			if (isSelf) return n === 6 ? 'rgba(80, 100, 180, 0.9)' : 'rgba(100, 140, 80, 0.9)';
			if (isTarget) return n === 6 ? 'rgba(60, 140, 220, 0.45)' : 'rgba(100, 200, 80, 0.45)';
			return n === 6 ? 'rgba(40, 55, 75, 0.85)' : 'rgba(50, 65, 50, 0.85)';
		},
		ghostColor(i) {
			return nSides(i) === 6 ? 'rgba(60, 140, 220, 0.25)' : 'rgba(100, 200, 80, 0.25)';
		},
		pip(rpx, rpy, i, invS) { return pipRegular(rpx, rpy, nSides(i), invS); },
		gnoProject(i, rpx, rpy, scale, faceOff) {
			const rF = i < 8 ? 0.7745966692 : 0.8944271910;
			const gS = scale * Math.sqrt(1 - rF * rF) * 2 * Math.sin(Math.PI / nSides(i));
			const co = Math.cos(faceOff), so = Math.sin(faceOff);
			return { gx: (rpx * co - rpy * so) * gS, gy: (rpx * so + rpy * co) * gS, rF };
		},
		presets,
	};
})();

// ─────────────────────────────────────────────────────────────────────
// Rhombicosidodecahedron-62 (20 triangles + 30 squares + 12 pentagons)
// ─────────────────────────────────────────────────────────────────────
GEOMETRIES.rhombicosi62 = (function() {
	const PHI = (1 + Math.sqrt(5)) / 2;

	// Icosahedron vertices (12) — cyclic perms of (1, 0, φ) to match
	// the RID vertex formula (even perms of (±1,±1,±φ³), etc.)
	const icoRaw = [];
	for (const s1 of [1, -1])
		for (const s2 of [1, -1]) {
			icoRaw.push([s1, 0, s2 * PHI]);
			icoRaw.push([0, s2 * PHI, s1]);
			icoRaw.push([s2 * PHI, s1, 0]);
		}
	const icoVerts = icoRaw.map(norm3);

	// Icosahedron edges (30)
	const icoThreshold = 1 / Math.sqrt(5);
	const icoEdges = [];
	for (let i = 0; i < 12; i++)
		for (let j = i + 1; j < 12; j++)
			if (Math.abs(dot3(icoVerts[i], icoVerts[j]) - icoThreshold) < 0.01)
				icoEdges.push([i, j]);

	// Icosahedron faces (20 triangles)
	const icoFaces = [];
	for (let i = 0; i < 12; i++)
		for (let j = i + 1; j < 12; j++)
			for (let k = j + 1; k < 12; k++) {
				const ij = Math.abs(dot3(icoVerts[i], icoVerts[j]) - icoThreshold) < 0.01;
				const jk = Math.abs(dot3(icoVerts[j], icoVerts[k]) - icoThreshold) < 0.01;
				const ik = Math.abs(dot3(icoVerts[i], icoVerts[k]) - icoThreshold) < 0.01;
				if (ij && jk && ik) icoFaces.push([i, j, k]);
			}

	// Face normals for the rhombicosidodecahedron:
	// 20 triangular normals = icosahedron face centers
	const triNormals = icoFaces.map(([a, b, c]) => {
		const m = [icoVerts[a][0] + icoVerts[b][0] + icoVerts[c][0],
				   icoVerts[a][1] + icoVerts[b][1] + icoVerts[c][1],
				   icoVerts[a][2] + icoVerts[b][2] + icoVerts[c][2]];
		return norm3(m);
	});
	// 30 square normals = icosahedron edge midpoints (= rhombic triacontahedron normals)
	const sqNormals = icoEdges.map(([i, j]) => {
		const m = [icoVerts[i][0] + icoVerts[j][0], icoVerts[i][1] + icoVerts[j][1], icoVerts[i][2] + icoVerts[j][2]];
		return norm3(m);
	});
	// 12 pentagonal normals = icosahedron vertices
	const pentNormals = icoVerts.map(v => v.slice());

	// Combined: triangles 0-19, squares 20-49, pentagons 50-61
	const c3 = [...triNormals, ...sqNormals, ...pentNormals];
	const nFaces = 62;
	const nSides = i => i < 20 ? 3 : i < 50 ? 4 : 5;

	// Adjacency: angular threshold differs by face-type pair
	// tri↔sq ≈ 37.4° (0.653 rad), sq↔pent ≈ 31.7° (0.553 rad)
	const adj = Array.from({ length: nFaces }, () => []);
	for (let i = 0; i < nFaces; i++)
		for (let j = i + 1; j < nFaces; j++) {
			const ni = nSides(i), nj = nSides(j);
			if (ni === nj) continue; // same-type faces never adjacent
			if ((ni === 3 && nj === 5) || (ni === 5 && nj === 3)) continue; // tri↔pent never adjacent
			const d = Math.acos(Math.min(1, Math.max(-1, dot3(c3[i], c3[j]))));
			const thresh = ((ni === 3 || nj === 3) ? 0.7 : 0.6);
			if (d < thresh) { adj[i].push(j); adj[j].push(i); }
		}

	const frames = buildFrames(c3, nFaces);

	const ap3 = regularApothem(3);
	const ap4 = regularApothem(4);
	const ap5 = regularApothem(5);
	const cr3 = regularCircumR(3);
	const cr4 = regularCircumR(4);
	const cr5 = regularCircumR(5);
	const tabH = ap3 * 0.3;
	const tabInset = 0.15;
	const singleTabArea = (1 - tabInset) * tabH;

	function edgeIdx(i, j) { return regularEdgeIdx(c3, frames, nSides, i, j); }
	function apothem(i) { const n = nSides(i); return n === 3 ? ap3 : n === 4 ? ap4 : ap5; }
	function circumR(i) { const n = nSides(i); return n === 3 ? cr3 : n === 4 ? cr4 : cr5; }


	const presets = [
		{"label":"DIN A (1:√2)","parents":[25,23,24,23,24,28,40,41,32,33,45,33,34,36,37,38,40,45,42,48,51,50,3,56,58,5,7,51,7,8,57,52,10,53,10,12,3,58,60,15,55,17,17,55,56,-1,60,19,18,19,20,26,29,32,36,41,40,41,33,42,35,43],"tabs":{"9-29":29,"9-31":31,"2-31":31,"36-56":36,"22-54":54,"6-26":26,"6-27":27,"27-56":56,"1-27":27,"1-20":20,"22-50":50,"21-50":50,"24-50":50,"2-21":21,"37-54":54,"14-46":46,"14-38":38,"11-46":46,"11-35":35,"35-53":53,"34-53":53,"29-53":53,"31-58":58,"23-50":50,"25-51":51,"28-51":51,"5-30":30,"30-57":57,"30-52":52,"25-52":52,"21-52":52,"4-37":37,"15-49":49,"49-61":61,"48-61":61,"18-43":43,"16-43":43,"16-44":44,"39-54":54,"13-44":44,"13-39":39,"39-61":61,"44-61":61,"42-55":55,"26-55":55,"42-59":59,"45-59":59,"48-59":59,"47-59":59,"47-60":60,"19-49":49,"19-48":48,"46-58":58,"38-54":38,"0-21":21,"0-20":20,"34-59":59,"8-30":30,"28-57":57,"45-57":57,"32-57":57},"mirrored":false,"angle":-0.49741883681838406,"aspect":1.4142857142857144,"lonOffset":-2.557831595636633,"northPole":{"type":"center","face":49,"dir":[-0.5000000000000001,-0.8090169943749475,-0.30901699437494745]},"southPole":{"type":"center","face":25,"dir":[0.5000000000000001,0.8090169943749475,0.30901699437494745]}},
		{label:"US Letter (8.5×11 in)",aspect:1.2941176470588236,parents:[25,23,24,23,24,28,40,41,32,33,45,33,34,36,37,38,40,45,42,48,51,50,3,56,58,5,7,51,7,8,57,52,10,53,10,12,3,58,60,15,55,17,17,55,56,-1,60,19,18,19,20,26,29,32,36,41,40,41,33,42,35,43],tabs:{},mirrored:false,angle:-0.5585053606381853},
		{label:"US Legal (8.5×14 in)",aspect:1.6470588235294117,parents:[25,23,24,23,24,28,40,41,32,33,45,33,34,36,37,38,40,45,42,48,51,50,3,56,58,5,7,51,7,8,57,52,10,53,10,12,3,58,60,15,55,17,17,55,56,-1,60,19,18,19,20,26,29,32,36,41,40,41,33,42,35,43],tabs:{},mirrored:false,angle:-0.4276056667386108},
		{label:"US Tabloid (11×17 in)",aspect:1.5454545454545454,parents:[25,23,24,23,24,28,40,41,32,33,45,33,34,36,37,38,40,45,42,48,51,50,3,56,58,5,7,51,7,8,57,52,10,53,10,12,3,58,60,15,55,17,17,55,56,-1,60,19,18,19,20,26,29,32,36,41,40,41,33,42,35,43],tabs:{},mirrored:false,angle:-0.4276056667386108},
		{label:"B5 JIS (182×257 mm)",aspect:1.4120879120879122,parents:[25,23,24,23,24,28,40,41,32,33,45,33,34,36,37,38,40,45,42,48,51,50,3,56,58,5,7,51,7,8,57,52,10,53,10,12,3,58,60,15,55,17,17,55,56,-1,60,19,18,19,20,26,29,32,36,41,40,41,33,42,35,43],tabs:{},mirrored:false,angle:-0.49741883681838406},
	];
	presets.forEach(p => { if (!p.northPole) Object.assign(p, defaultPoles(c3)); });

	return {
		id: 'rhombicosi62',
		name: 'Rhombicosidodecahedron-62',
		nFaces,
		storageKey: 'rhombicosi62-custom-layouts',
		c3, adj, frames,
		nSides,
		edgeIdx,
		apothem,
		circumR,
		tabH,
		tabInset,
		singleTabArea,
		initialRotation: 0,

		ghostPlace(i, j, res, mirrored) {
			return regularGhostPlace(nSides, apothem, edgeIdx, i, j, res, mirrored);
		},
		tryPlace(i, j, res, placed, mirrored) {
			return regularTryPlace(this, i, j, res, placed, mirrored);
		},
		polyVerts(fx, fy, rot, i) {
			return regularPolyVerts(fx, fy, rot, nSides(i), circumR(i));
		},
		faceArea(i) { return regularArea(nSides(i)); },
		tabInsets(i, k) { return [tabInset, tabInset]; },
		edgeSlot(i, k, mirrored) { return regularEdgeSlot(nSides(i), k, mirrored); },
		faceLabel(i) { return i < 20 ? 'tri' : i < 50 ? 'sq' : 'pent'; },
		faceColor(i, isSelf, isTarget) {
			const n = nSides(i);
			if (isSelf) return n === 3 ? 'rgba(180, 80, 80, 0.9)' : n === 4 ? 'rgba(80, 100, 180, 0.9)' : 'rgba(100, 180, 80, 0.9)';
			if (isTarget) return n === 3 ? 'rgba(220, 80, 80, 0.45)' : n === 4 ? 'rgba(60, 140, 220, 0.45)' : 'rgba(80, 200, 80, 0.45)';
			return n === 3 ? 'rgba(65, 40, 40, 0.85)' : n === 4 ? 'rgba(40, 55, 75, 0.85)' : 'rgba(40, 65, 40, 0.85)';
		},
		ghostColor(i) {
			const n = nSides(i);
			return n === 3 ? 'rgba(220, 80, 80, 0.25)' : n === 4 ? 'rgba(60, 140, 220, 0.25)' : 'rgba(80, 200, 80, 0.25)';
		},
		pip(rpx, rpy, i, invS) { return pipRegular(rpx, rpy, nSides(i), invS); },
		gnoProject(i, rpx, rpy, scale, faceOff) {
			const rF = i < 20 ? 0.9659953695 : i < 50 ? 0.9485360199 : 0.9245941063;
			const gS = scale * Math.sqrt(1 - rF * rF) * 2 * Math.sin(Math.PI / nSides(i));
			const co = Math.cos(faceOff), so = Math.sin(faceOff);
			return { gx: (rpx * co - rpy * so) * gS, gy: (rpx * so + rpy * co) * gS, rF };
		},
		presets,
	};
})();

// ─────────────────────────────────────────────────────────────────────
// Deltoidal-60 (Deltoidal Hexecontahedron: 60 congruent kite faces)
// Dual of the rhombicosidodecahedron (polar reciprocal via midsphere).
// Each face is a convex kite with vertices from 3 orbits:
//   pent-type (ico, degree 5, 67.783°), sq-type (icosidodeca, degree 4, 86.974° ×2),
//   tri-type (dodeca, degree 3, 118.269°).
// Vertex order: V0=sq-right, V1=pent(pointy tip), V2=sq-left, V3=tri(blunt).
// Edge pairing: long edges 0↔1 (sq↔pent), short edges 2↔3 (sq↔tri).
// ─────────────────────────────────────────────────────────────────────
GEOMETRIES.deltoidal60 = (function() {
	const N_FACES = 60;
	const PHI = (1 + Math.sqrt(5)) / 2;
	const PHI2 = PHI * PHI;
	const PHI3 = PHI2 * PHI;
	const TWO_PHI = 2 * PHI;
	const TWO_PLUS_PHI = 2 + PHI;

	// Generate all 60 rhombicosidodecahedron vertices (= dual face normals)
	// Even permutations of (±1,±1,±φ³), (±φ²,±φ,±2φ), (±(2+φ),0,±φ²)
	const rawVerts = [];
	for (const [a, b, c] of [[0, 1, 2], [1, 2, 0], [2, 0, 1]])
		for (const s1 of [1, -1]) for (const s2 of [1, -1]) for (const s3 of [1, -1]) {
			const v = [0, 0, 0]; v[a] = s1; v[b] = s2; v[c] = s3 * PHI3; rawVerts.push(v);
		}
	for (const [a, b, c] of [[0, 1, 2], [1, 2, 0], [2, 0, 1]])
		for (const s1 of [1, -1]) for (const s2 of [1, -1]) for (const s3 of [1, -1]) {
			const v = [0, 0, 0]; v[a] = s1 * PHI2; v[b] = s2 * PHI; v[c] = s3 * TWO_PHI; rawVerts.push(v);
		}
	for (const [a, b, c] of [[0, 1, 2], [1, 2, 0], [2, 0, 1]])
		for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
			const v = [0, 0, 0]; v[a] = s1 * TWO_PLUS_PHI; v[b] = 0; v[c] = s2 * PHI2; rawVerts.push(v);
		}

	const c3 = rawVerts.map(norm3);

	// Adjacency: RID edge length = 2 (in the unnormalized coordinates)
	const adj = Array.from({ length: N_FACES }, () => []);
	for (let i = 0; i < N_FACES; i++)
		for (let j = i + 1; j < N_FACES; j++) {
			const d = sub3(rawVerts[i], rawVerts[j]);
			if (Math.abs(dot3(d, d) - 4) < 0.01) { adj[i].push(j); adj[j].push(i); }
		}

	const frames = buildFrames(c3, N_FACES);

	// Kite shape from polar reciprocal of RID (correct Catalan dual geometry).
	// Projected dual vertex distances from face center:
	//   tri-type (closest) = 1.135414, sq-type = 1.416188, pent-type (farthest) = 1.747793
	// Canonical orientation: pent (pointy tip, 67.783°) at +Y, tri (blunt, 118.269°) at -Y.
	// V0=sq-right, V1=pent, V2=sq-left, V3=tri  (CCW order)
	const kiteVtx = [
		[0.858418, -0.192005],     // V0: sq-right
		[0, 1.085597],             // V1: pent (pointy tip, 67.783°)
		[-0.858418, -0.192005],    // V2: sq-left
		[0, -0.705233]             // V3: tri (blunt, 118.269°)
	];

	// Edge direction angles: atan2(V[(k+1)%4] - V[k]) — actual edge vectors, not neighbor directions
	const edgeDirAngles = [];
	for (let k = 0; k < 4; k++) {
		const a = kiteVtx[k], b = kiteVtx[(k + 1) % 4];
		edgeDirAngles.push(Math.atan2(b[1] - a[1], b[0] - a[0]));
	}

	// Sector boundaries for edgeIdx, relative to pent direction (faceOffset) in [0, 2π).
	// Boundaries at kite vertex angular positions relative to pent:
	//   V1(pent)=0°, V2(sq-left)≈102.608°, V3(tri)=180°, V0(sq-right)≈257.392°
	let _relV2 = Math.atan2(kiteVtx[2][1], kiteVtx[2][0]) - Math.PI / 2;
	if (_relV2 < 0) _relV2 += 2 * Math.PI;
	const SECT1 = _relV2;                // ≈ 1.7909 rad (102.608°)
	const SECT3 = 2 * Math.PI - SECT1;   // ≈ 4.4923 rad (257.392°) — mirror symmetry

	// Face offsets: angle to the pent (pointy tip) direction for each face.
	// The pent direction is at the midpoint of the LARGEST angular gap between neighbors.
	const faceOffsets = [];
	for (let fi = 0; fi < N_FACES; fi++) {
		const N = c3[fi], [T1, T2] = frames[fi];
		const nAngles = adj[fi].map(j => {
			const d = sub3(c3[j], scale3(N, dot3(c3[j], N)));
			const pn = norm3(d);
			return Math.atan2(dot3(pn, T2), dot3(pn, T1));
		});
		nAngles.sort((a, b) => a - b);
		let maxGap = 0, maxK = 0;
		for (let k = 0; k < 4; k++) {
			let gap = nAngles[(k + 1) % 4] - nAngles[k];
			if (gap < 0) gap += 2 * Math.PI;
			if (gap > maxGap) { maxGap = gap; maxK = k; }
		}
		let pentDir = (nAngles[maxK] + nAngles[(maxK + 1) % 4]) / 2;
		if (maxK === 3) pentDir += Math.PI;
		faceOffsets.push(pentDir);
	}

	function edgeIdx(i, j) {
		const N = c3[i], [T1, T2] = frames[i];
		const d = sub3(c3[j], scale3(N, dot3(c3[j], N)));
		const pn = norm3(d);
		let a = Math.atan2(dot3(pn, T2), dot3(pn, T1));
		let rel = a - faceOffsets[i];
		if (rel < 0) rel += 2 * Math.PI;
		if (rel >= 2 * Math.PI) rel -= 2 * Math.PI;
		if (rel < SECT1) return 1;
		if (rel < Math.PI) return 2;
		if (rel < SECT3) return 3;
		return 0;
	}

	// Kite metrics
	const shortEdge = Math.sqrt((kiteVtx[3][0] - kiteVtx[0][0]) ** 2 + (kiteVtx[3][1] - kiteVtx[0][1]) ** 2);
	const longEdge = Math.sqrt((kiteVtx[0][0] - kiteVtx[1][0]) ** 2 + (kiteVtx[0][1] - kiteVtx[1][1]) ** 2);
	const kiteArea = 0.5 * Math.abs(
		kiteVtx[0][0] * (kiteVtx[1][1] - kiteVtx[3][1]) +
		kiteVtx[1][0] * (kiteVtx[2][1] - kiteVtx[0][1]) +
		kiteVtx[2][0] * (kiteVtx[3][1] - kiteVtx[1][1]) +
		kiteVtx[3][0] * (kiteVtx[0][1] - kiteVtx[2][1])
	);
	// Inradius = distance from center to edge line (equal for all edges on Catalan solid)
	function edgeLineInradius(k) {
		const a = kiteVtx[k], b = kiteVtx[(k + 1) % 4];
		const dx = b[0] - a[0], dy = b[1] - a[1];
		return Math.abs(a[0] * dy - a[1] * dx) / Math.sqrt(dx * dx + dy * dy);
	}
	const INRADIUS = edgeLineInradius(0);
	const dPent = kiteVtx[1][1];   // circumradius = pent vertex distance
	const halfW = kiteVtx[0][0];   // half-width (sq-right x)

	const _tabH = INRADIUS * 0.3;
	const tabInsetLong = 0.12;
	const tabInsetShort = 0.15;
	const singleTabArea = ((shortEdge + longEdge) / 2) * _tabH * 0.5;

	const _ghostPlace = (i, j, res, mirrored) =>
		irregularGhostPlace(kiteVtx, 4, edgeDirAngles, edgeIdx, i, j, res, mirrored);
	const _collisionCheck = (j, px, py, pr, placed, res) =>
		irregularCollisionCheck(N_FACES, INRADIUS, halfW, dPent, placed, res, j, px, py);


	const presets = [
		{label:'DIN A (1:√2)',aspect:1.4182692307692308,parents:[56,58,0,1,0,1,2,3,32,33,8,9,8,9,49,13,-1,41,16,17,16,17,18,19,0,44,2,3,4,5,6,7,24,28,52,53,26,30,27,31,16,26,18,30,20,27,22,31,24,25,28,29,16,18,36,19,40,2,44,3],tabs:{"31-51":51,"29-46":29,"46-58":58,"35-46":46,"33-53":53,"39-47":47,"21-45":45,"12-48":48,"32-40":40,"24-40":40},mirrored:false,angle:1.3700834628155485,lonOffset:-0.3141592653589793,northPole:{type:'vertex',dir:[-0.8506508083520399,0.5257311121191335,0]},southPole:{type:'vertex',dir:[0.8506508083520399,-0.5257311121191335,0]}},
		{label:"US Letter (8.5×11 in)",aspect:1.2941176470588236,parents:[56,25,0,1,0,1,2,3,10,33,34,9,8,9,10,11,20,54,16,17,44,17,20,19,0,44,2,3,4,5,6,7,52,53,25,29,12,13,14,31,16,17,18,19,-1,27,22,31,8,25,9,29,20,22,38,39,40,2,44,3],tabs:{},mirrored:false,angle:0.8813912722571364},
		{label:"US Legal (8.5×14 in)",aspect:1.6470588235294117,parents:[56,3,0,7,0,7,2,-1,10,11,49,35,8,9,10,11,18,54,53,17,16,17,18,19,0,1,2,3,4,5,6,7,8,53,10,29,54,55,27,31,16,17,18,19,25,27,29,31,8,27,9,29,34,35,38,39,42,41,5,3],tabs:{},mirrored:false,angle:1.5707963267948966},
		{label:"US Tabloid (11×17 in)",aspect:1.5454545454545454,parents:[56,58,0,1,0,1,2,3,32,33,8,9,8,9,49,13,-1,41,16,17,16,17,18,19,0,44,2,3,4,5,6,7,24,28,52,53,26,30,27,31,16,26,18,30,20,27,22,31,24,25,28,29,16,18,36,19,40,2,44,3],tabs:{},mirrored:false,angle:1.2828170002158323},
		{label:"B5 JIS (182×257 mm)",aspect:1.4120879120879122,parents:[56,58,0,1,0,1,2,3,32,33,8,9,8,9,49,13,-1,41,16,17,16,17,18,19,0,44,2,3,4,5,6,7,24,28,52,53,26,30,27,31,16,26,18,30,20,27,22,31,24,25,28,29,16,18,36,19,40,2,44,3],tabs:{},mirrored:false,angle:1.3700834628155485},
	];
	presets.forEach(p => { if (!p.northPole) Object.assign(p, defaultPoles(c3)); });

	return {
		id: 'deltoidal60',
		name: 'Deltoidal-60',
		nFaces: N_FACES,
		storageKey: 'deltoidal60-custom-layouts',
		c3, adj, frames, faceOffsets, kiteVtx,
		nSides() { return 4; },
		edgeIdx,
		apothem() { return INRADIUS; },
		circumR() { return dPent; },
		tabH: _tabH,
		tabInset: tabInsetLong,
		singleTabArea,
		initialRotation: 0,

		irregularFace: true,
		ghostPlace: _ghostPlace,
		tryPlace(i, j, res, placed, mirrored) {
			const pos = _ghostPlace(i, j, res, mirrored);
			if (_collisionCheck(j, pos.x, pos.y, pos.r, placed, res)) return null;
			return pos;
		},
		polyVerts(fx, fy, rot, face, mirrored) {
			const cr = Math.cos(rot), sr = Math.sin(rot);
			const m = mirrored ? -1 : 1;
			return kiteVtx.map(([lx, ly]) => ({
				x: fx + m * lx * cr - ly * sr,
				y: fy + m * lx * sr + ly * cr
			}));
		},
		faceArea() { return kiteArea; },
		tabInsets(i, k) {
			// Edges 0,1 are long (sq↔pent), edges 2,3 are short (sq↔tri)
			return k < 2 ? [tabInsetLong, tabInsetLong] : [tabInsetShort, tabInsetShort];
		},
		edgeSlot(i, k) { return k; },
		faceLabel() { return 'kite'; },
		faceColor(i, isSelf, isTarget) {
			if (isSelf) return 'rgba(140, 80, 160, 0.9)';
			if (isTarget) return 'rgba(160, 100, 200, 0.45)';
			return 'rgba(55, 40, 65, 0.85)';
		},
		ghostColor() { return 'rgba(160, 100, 200, 0.25)'; },
		pip(rpx, rpy, i, invS) {
			const hw = kiteVtx[0][0] * invS, dp = kiteVtx[1][1] * invS;
			const sqY = kiteVtx[0][1] * invS, triY = kiteVtx[3][1] * invS;
			const ax = Math.abs(rpx);
			return rpy > triY && hw * (rpy - dp) - (sqY - dp) * ax <= 0
				&& (-hw) * (rpy - sqY) - (triY - sqY) * (ax - hw) <= 0;
		},
		gnoProject(i, rpx, rpy, scale, faceOff) {
			const GNO_S = 0.3794807;
			const fcx = rpx * scale, fcy = rpy * scale;
			const theta = faceOff - Math.PI * 0.5;
			const co = Math.cos(theta), so = Math.sin(theta);
			return { gx: (fcx * co - fcy * so) * GNO_S, gy: (fcx * so + fcy * co) * GNO_S, rF: 1 };
		},
		presets,
	};
})();

// ─────────────────────────────────────────────────────────────────────
// Pentahex-60 (Pentagonal Hexecontahedron: 60 congruent irregular pentagons)
// Dual of the snub dodecahedron (polar reciprocal via midsphere).
// Each face is a convex pentagon with bilateral symmetry:
//   V0 = pent-type vertex (67.454°, pointy tip), V1–V4 = tri-type (118.137° each).
// Edge pairing: 0↔4 (long), 1↔1 (short, self), 2↔3 (short).
// ─────────────────────────────────────────────────────────────────────
GEOMETRIES.pentahex60 = (function() {
	const N_FACES = 60;
	const PHI = (1 + Math.sqrt(5)) / 2;
	const PHI2 = PHI * PHI;

	// Snub dodecahedron: solve ξ³ − 2ξ − φ = 0
	let xi = 1.7;
	for (let i = 0; i < 100; i++) xi -= (xi * xi * xi - 2 * xi - PHI) / (3 * xi * xi - 2);
	const alpha = xi - 1 / xi;
	const beta = xi * PHI + PHI2 + PHI / xi;

	// 60 vertices: even permutations of 5 templates × even number of plus signs
	const templates = [
		[2 * alpha, 2, 2 * beta],
		[alpha + beta / PHI + PHI, -alpha * PHI + beta + 1 / PHI, alpha / PHI + beta * PHI - 1],
		[-alpha / PHI + beta * PHI + 1, -alpha + beta / PHI - PHI, alpha * PHI + beta - 1 / PHI],
		[-alpha / PHI + beta * PHI - 1, alpha - beta / PHI - PHI, alpha * PHI + beta + 1 / PHI],
		[alpha + beta / PHI - PHI, alpha * PHI - beta + 1 / PHI, alpha / PHI + beta * PHI + 1]
	];
	const rawVerts = [];
	for (const [ta, tb, tc] of templates)
		for (const [a, b, c] of [[ta, tb, tc], [tb, tc, ta], [tc, ta, tb]])
			for (const v of [[-a, -b, -c], [a, b, -c], [a, -b, c], [-a, b, c]])
				rawVerts.push(v);

	const c3 = rawVerts.map(norm3);

	// Adjacency: find edge length (shortest pairwise distance), then connect
	let edgeLen2 = Infinity;
	for (let i = 0; i < N_FACES; i++)
		for (let j = i + 1; j < N_FACES; j++) {
			const d2 = dot3(sub3(rawVerts[i], rawVerts[j]), sub3(rawVerts[i], rawVerts[j]));
			if (d2 < edgeLen2) edgeLen2 = d2;
		}
	const adj = Array.from({ length: N_FACES }, () => []);
	for (let i = 0; i < N_FACES; i++)
		for (let j = i + 1; j < N_FACES; j++) {
			const d = sub3(rawVerts[i], rawVerts[j]);
			if (Math.abs(dot3(d, d) - edgeLen2) < 0.5) { adj[i].push(j); adj[j].push(i); }
		}

	const frames = buildFrames(c3, N_FACES);

	// Canonical pentagon (short edge = 1, V0=pent at +Y, bilateral symmetry about Y)
	// Computed via polar reciprocal of snub dodecahedron face centers.
	const pentVtx = [
		[0.000000, 1.502778],      // V0: pent-type (pointy tip, 67.454°)
		[-0.971576, 0.047434],     // V1: tri-type (upper-left, 118.137°)
		[-0.500000, -0.834392],    // V2: tri-type (lower-left, 118.137°)
		[0.500000, -0.834392],     // V3: tri-type (lower-right, 118.137°)
		[0.971576, 0.047434]       // V4: tri-type (upper-right, 118.137°)
	];

	// Edge direction angles: atan2(V[(k+1)%5] - V[k])
	const edgeDirAngles = [];
	for (let k = 0; k < 5; k++) {
		const a = pentVtx[k], b = pentVtx[(k + 1) % 5];
		edgeDirAngles.push(Math.atan2(b[1] - a[1], b[0] - a[0]));
	}

	// Sector boundaries for edgeIdx (vertex angles relative to V0 direction)
	// SECT0 = angle of V1, SECT1 = angle of V2, SECT2 = 2π - SECT1, SECT3 = 2π - SECT0
	const SECT0 = Math.atan2(pentVtx[1][0], pentVtx[1][1]) + Math.PI; // rel from +Y, mapped to [0,2π)
	let _a1 = Math.atan2(pentVtx[1][1], pentVtx[1][0]) - Math.PI / 2;
	if (_a1 < 0) _a1 += 2 * Math.PI;
	const SECT_1 = _a1;
	let _a2 = Math.atan2(pentVtx[2][1], pentVtx[2][0]) - Math.PI / 2;
	if (_a2 < 0) _a2 += 2 * Math.PI;
	const SECT_2 = _a2;
	const SECT_3 = 2 * Math.PI - SECT_2;
	const SECT_4 = 2 * Math.PI - SECT_1;

	// Face offsets: direction to the pent vertex (largest gap midpoint)
	const faceOffsets = [];
	for (let fi = 0; fi < N_FACES; fi++) {
		const N = c3[fi], [T1, T2] = frames[fi];
		const nAngles = adj[fi].map(j => {
			const d = sub3(c3[j], scale3(N, dot3(c3[j], N)));
			const pn = norm3(d);
			return Math.atan2(dot3(pn, T2), dot3(pn, T1));
		});
		nAngles.sort((a, b) => a - b);
		let maxGap = 0, maxK = 0;
		for (let k = 0; k < 5; k++) {
			let gap = nAngles[(k + 1) % 5] - nAngles[k];
			if (gap < 0) gap += 2 * Math.PI;
			if (gap > maxGap) { maxGap = gap; maxK = k; }
		}
		let pentDir = (nAngles[maxK] + nAngles[(maxK + 1) % 5]) / 2;
		if (maxK === 4) pentDir += Math.PI;
		faceOffsets.push(pentDir);
	}

	function edgeIdx(i, j) {
		const N = c3[i], [T1, T2] = frames[i];
		const d = sub3(c3[j], scale3(N, dot3(c3[j], N)));
		const pn = norm3(d);
		let a = Math.atan2(dot3(pn, T2), dot3(pn, T1));
		let rel = a - faceOffsets[i];
		if (rel < 0) rel += 2 * Math.PI;
		if (rel >= 2 * Math.PI) rel -= 2 * Math.PI;
		if (rel < SECT_1) return 0;
		if (rel < SECT_2) return 1;
		if (rel < SECT_3) return 2;
		if (rel < SECT_4) return 3;
		return 4;
	}

	// Pentagon metrics
	const shortEdge = 1;
	const longEdge = Math.sqrt(pentVtx[0][0] ** 2 + (pentVtx[0][1] - pentVtx[1][1]) ** 2 +
		(pentVtx[0][0] - pentVtx[1][0]) ** 2 - pentVtx[0][0] ** 2);
	const longEdgeActual = Math.sqrt((pentVtx[0][0] - pentVtx[1][0]) ** 2 +
		(pentVtx[0][1] - pentVtx[1][1]) ** 2);
	let pentArea = 0;
	for (let k = 0; k < 5; k++) {
		const a = pentVtx[k], b = pentVtx[(k + 1) % 5];
		pentArea += a[0] * b[1] - b[0] * a[1];
	}
	pentArea = Math.abs(pentArea) / 2;

	const INRADIUS = 0.834392; // equal for all edges (Catalan property)
	const dPent = pentVtx[0][1]; // circumradius = pent vertex distance from center
	const halfW = pentVtx[4][0]; // half-width at widest point

	const _tabH = INRADIUS * 0.3;
	const tabInsetLong = 0.12;
	const tabInsetShort = 0.15;
	const singleTabArea = ((shortEdge + longEdgeActual) / 2) * _tabH * 0.5;

	const _ghostPlace = (i, j, res, mirrored) =>
		irregularGhostPlace(pentVtx, 5, edgeDirAngles, edgeIdx, i, j, res, mirrored);
	const _collisionCheck = (j, px, py, pr, placed, res) =>
		irregularCollisionCheck(N_FACES, INRADIUS, halfW, dPent, placed, res, j, px, py);


	const presets = [
		{label:'DIN A (1:√2)',aspect:1.4142857142857144,parents:[48,0,30,15,16,17,4,5,20,21,58,8,0,1,18,27,12,13,6,7,12,13,10,11,12,13,22,11,12,1,18,19,4,17,46,47,24,25,26,44,28,29,30,55,32,33,40,53,-1,1,38,39,4,5,6,7,44,45,37,24],tabs:{"3-15":15,"3-31":31,"31-50":31,"43-50":43,"44-54":54,"32-54":54,"20-32":20,"35-53":53,"7-53":53,"16-28":28,"12-28":28,"4-52":52,"6-52":52,"34-52":52,"46-52":46,"46-58":58,"10-58":58,"9-58":9,"9-25":9,"21-25":25,"31-43":43,"15-31":31,"15-19":19,"3-50":3,"25-37":37,"37-58":58,"37-46":46,"37-40":40,"4-32":32,"27-39":39,"11-56":56,"8-56":56,"37-49":49,"47-59":59,"14-26":26,"2-14":14},mirrored:false,angle:1.5271630954950381,lonOffset:-2.062977941152395,northPole:{type:'vertex',dir:[0.8506508083520399,-0.5257311121191336,-1.208259388534423e-17]},southPole:{type:'vertex',dir:[-0.8506508083520399,0.5257311121191336,-1.208259388534423e-17]}},
		{label:"US Letter (8.5×11 in)",aspect:1.2941176470588236,parents:[48,0,30,15,16,17,4,5,20,21,58,8,0,1,18,27,12,13,6,7,12,13,10,11,12,13,22,11,12,1,18,19,4,17,46,47,24,25,26,44,28,29,30,55,32,33,40,53,-1,1,38,39,4,5,6,7,44,45,37,24],tabs:{},mirrored:false,angle:1.5446163880149817},
		{"label":"US Legal (8.5×14 in)","parents":[12,0,14,15,16,17,4,5,20,21,9,8,-1,1,26,27,12,13,6,7,12,13,10,11,12,13,10,11,0,1,18,19,16,17,6,53,24,25,26,27,28,29,30,31,32,33,37,36,0,0,31,39,40,41,32,7,8,9,25,24],"tabs":{},"mirrored":false,"angle":0.7330382858376184,"aspect":1.647058823529412,"northPole":{"type":"vertex","dir":[-0.35682208977308993,0.9341723589627157,-1.9205239728688042e-17]},"southPole":{"type":"vertex","dir":[0.35682208977308993,-0.9341723589627157,-1.9205239728688042e-17]}},
		{label:"US Tabloid (11×17 in)",aspect:1.5454545454545454,parents:[48,0,30,15,16,17,4,5,20,21,58,8,0,1,18,27,12,13,6,7,12,13,10,11,12,13,22,11,12,1,18,19,4,17,46,47,24,25,26,44,28,29,30,55,32,33,40,53,-1,1,38,39,4,5,6,7,44,45,37,24],tabs:{},mirrored:false,angle:1.5184364492350666},
		{label:"B5 JIS (182×257 mm)",aspect:1.4120879120879122,parents:[48,0,30,15,16,17,4,5,20,21,58,8,0,1,18,27,12,13,6,7,12,13,10,11,12,13,22,11,12,1,18,19,4,17,46,47,24,25,26,44,28,29,30,55,32,33,40,53,-1,1,38,39,4,5,6,7,44,45,37,24],tabs:{},mirrored:false,angle:1.53588974175501},
	];
	presets.forEach(p => { if (!p.northPole) Object.assign(p, defaultPoles(c3)); });

	return {
		id: 'pentahex60',
		name: 'Pentahex-60',
		nFaces: N_FACES,
		storageKey: 'pentahex60-custom-layouts',
		c3, adj, frames, faceOffsets, pentVtx,
		nSides() { return 5; },
		edgeIdx,
		apothem() { return INRADIUS; },
		circumR() { return dPent; },
		tabH: _tabH,
		tabInset: tabInsetLong,
		singleTabArea,
		initialRotation: 0,

		ghostPlace: _ghostPlace,
		tryPlace(i, j, res, placed, mirrored) {
			const pos = _ghostPlace(i, j, res, mirrored);
			if (_collisionCheck(j, pos.x, pos.y, pos.r, placed, res)) return null;
			return pos;
		},
		polyVerts(fx, fy, rot) {
			const cr = Math.cos(rot), sr = Math.sin(rot);
			return pentVtx.map(([lx, ly]) => ({
				x: fx + lx * cr - ly * sr,
				y: fy + lx * sr + ly * cr
			}));
		},
		faceArea() { return pentArea; },
		tabInsets(i, k) {
			// Edges 0,4 are long (pent↔tri), edges 1,2,3 are short (tri↔tri)
			return (k === 0 || k === 4) ? [tabInsetLong, tabInsetLong] : [tabInsetShort, tabInsetShort];
		},
		edgeSlot(i, k) { return k; },
		faceLabel() { return 'pentagon'; },
		faceColor(i, isSelf, isTarget) {
			if (isSelf) return 'rgba(180, 120, 60, 0.9)';
			if (isTarget) return 'rgba(200, 150, 80, 0.45)';
			return 'rgba(70, 50, 30, 0.85)';
		},
		ghostColor() { return 'rgba(200, 150, 80, 0.25)'; },
		pip(rpx, rpy, i, invS) {
			const hw = pentVtx[4][0] * invS, dp = pentVtx[0][1] * invS;
			const triY = pentVtx[4][1] * invS, halfSE = pentVtx[3][0] * invS;
			const inR = -pentVtx[2][1] * invS;
			const ax = Math.abs(rpx);
			return rpy > -inR && hw * (rpy - dp) - (triY - dp) * ax <= 0
				&& (halfSE - hw) * (rpy - triY) - (-inR - triY) * (ax - hw) <= 0;
		},
		gnoProject(i, rpx, rpy, scale, faceOff) {
			const GNO_S = 0.2857528;
			const fcx = rpx * scale, fcy = rpy * scale;
			const theta = faceOff - Math.PI * 0.5;
			const co = Math.cos(theta), so = Math.sin(theta);
			return { gx: (fcx * co - fcy * so) * GNO_S, gy: (fcx * so + fcy * co) * GNO_S, rF: 1 };
		},
		presets,
	};
})();

// ─────────────────────────────────────────────────────────────────────
// Pentagonal-24 (Pentagonal Icositetrahedron: 24 congruent irregular pentagons)
// Dual of the snub cube (polar reciprocal via midsphere).
// Each face is a convex pentagon with bilateral symmetry:
//   V0 = oct-type vertex (80.752°, pointy tip), V1–V4 = tri-type (114.812° each).
// Edge pairing: 0↔4 (long), 1↔1 mirror (short), 2↔3 (short).
// ─────────────────────────────────────────────────────────────────────
GEOMETRIES.pentagonal24 = (function() {
	const N_FACES = 24;

	// Tribonacci constant: t³ = t² + t + 1
	let t = 1.8;
	for (let i = 0; i < 100; i++) t -= (t * t * t - t * t - t - 1) / (3 * t * t - 2 * t - 1);
	const t2 = t * t;

	// Snub cube vertices: even permutations of (±1, ±1/t, ±t) with even # of plus signs,
	// odd permutations with odd # of plus signs
	const evenP = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];
	const oddP = [[0, 2, 1], [2, 1, 0], [1, 0, 2]];
	const rawVerts = [];
	for (const [a, b, c] of evenP)
		for (const s1 of [1, -1]) for (const s2 of [1, -1]) for (const s3 of [1, -1]) {
			if (((s1 > 0 ? 1 : 0) + (s2 > 0 ? 1 : 0) + (s3 > 0 ? 1 : 0)) % 2 === 0) {
				const v = [0, 0, 0]; v[a] = s1; v[b] = s2 / t; v[c] = s3 * t; rawVerts.push(v);
			}
		}
	for (const [a, b, c] of oddP)
		for (const s1 of [1, -1]) for (const s2 of [1, -1]) for (const s3 of [1, -1]) {
			if (((s1 > 0 ? 1 : 0) + (s2 > 0 ? 1 : 0) + (s3 > 0 ? 1 : 0)) % 2 === 1) {
				const v = [0, 0, 0]; v[a] = s1; v[b] = s2 / t; v[c] = s3 * t; rawVerts.push(v);
			}
		}

	const c3 = rawVerts.map(norm3);

	// Adjacency: snub cube edge length² = 2 + 4t − 2t²
	const alpha2 = 2 + 4 * t - 2 * t2;
	const adj = Array.from({ length: N_FACES }, () => []);
	for (let i = 0; i < N_FACES; i++)
		for (let j = i + 1; j < N_FACES; j++) {
			const d = sub3(rawVerts[i], rawVerts[j]);
			if (Math.abs(dot3(d, d) - alpha2) < 0.01) { adj[i].push(j); adj[j].push(i); }
		}

	const frames = buildFrames(c3, N_FACES);

	// Canonical pentagon shape (short edge = 1, V0=oct at +Y, bilateral symmetry about Y)
	// Computed via polar reciprocal of snub cube face centers through midsphere.
	const pentVtx = [
		[0.000000, 1.228276],      // V0: oct-type (pointy tip, 80.752°)
		[-0.919643, 0.146776],     // V1: tri-type (upper-left, 114.812°)
		[-0.500000, -0.760914],    // V2: tri-type (lower-left, 114.812°)
		[0.500000, -0.760914],     // V3: tri-type (lower-right, 114.812°)
		[0.919643, 0.146776]       // V4: tri-type (upper-right, 114.812°)
	];

	// Edge direction angles: atan2(V[(k+1)%5] - V[k])
	const edgeDirAngles = [];
	for (let k = 0; k < 5; k++) {
		const a = pentVtx[k], b = pentVtx[(k + 1) % 5];
		edgeDirAngles.push(Math.atan2(b[1] - a[1], b[0] - a[0]));
	}

	// Sector boundaries for edgeIdx (vertex angles relative to V0 direction)
	let _a1 = Math.atan2(pentVtx[1][1], pentVtx[1][0]) - Math.PI / 2;
	if (_a1 < 0) _a1 += 2 * Math.PI;
	const SECT_1 = _a1;
	let _a2 = Math.atan2(pentVtx[2][1], pentVtx[2][0]) - Math.PI / 2;
	if (_a2 < 0) _a2 += 2 * Math.PI;
	const SECT_2 = _a2;
	const SECT_3 = 2 * Math.PI - SECT_2;
	const SECT_4 = 2 * Math.PI - SECT_1;

	// Face offsets: direction to the oct vertex (largest angular gap midpoint between neighbors)
	const faceOffsets = [];
	for (let fi = 0; fi < N_FACES; fi++) {
		const N = c3[fi], [T1, T2] = frames[fi];
		const nAngles = adj[fi].map(j => {
			const d = sub3(c3[j], scale3(N, dot3(c3[j], N)));
			const pn = norm3(d);
			return Math.atan2(dot3(pn, T2), dot3(pn, T1));
		});
		nAngles.sort((a, b) => a - b);
		let maxGap = 0, maxK = 0;
		for (let k = 0; k < 5; k++) {
			let gap = nAngles[(k + 1) % 5] - nAngles[k];
			if (gap < 0) gap += 2 * Math.PI;
			if (gap > maxGap) { maxGap = gap; maxK = k; }
		}
		let octDir = (nAngles[maxK] + nAngles[(maxK + 1) % 5]) / 2;
		if (maxK === 4) octDir += Math.PI;
		faceOffsets.push(octDir);
	}

	function edgeIdx(i, j) {
		const N = c3[i], [T1, T2] = frames[i];
		const d = sub3(c3[j], scale3(N, dot3(c3[j], N)));
		const pn = norm3(d);
		let a = Math.atan2(dot3(pn, T2), dot3(pn, T1));
		let rel = a - faceOffsets[i];
		if (rel < 0) rel += 2 * Math.PI;
		if (rel >= 2 * Math.PI) rel -= 2 * Math.PI;
		if (rel < SECT_1) return 0;
		if (rel < SECT_2) return 1;
		if (rel < SECT_3) return 2;
		if (rel < SECT_4) return 3;
		return 4;
	}

	// Pentagon metrics
	const shortEdge = 1;
	const longEdgeActual = Math.sqrt((pentVtx[0][0] - pentVtx[1][0]) ** 2 +
		(pentVtx[0][1] - pentVtx[1][1]) ** 2);
	let pentArea = 0;
	for (let k = 0; k < 5; k++) {
		const a = pentVtx[k], b = pentVtx[(k + 1) % 5];
		pentArea += a[0] * b[1] - b[0] * a[1];
	}
	pentArea = Math.abs(pentArea) / 2;

	const INRADIUS = 0.760914; // min inradius (distance from center to closest edge)
	const dOct = pentVtx[0][1]; // circumradius = oct vertex distance from center
	const halfW = pentVtx[4][0]; // half-width at widest point

	const _tabH = INRADIUS * 0.3;
	const tabInsetLong = 0.12;
	const tabInsetShort = 0.15;
	const singleTabArea = ((shortEdge + longEdgeActual) / 2) * _tabH * 0.5;

	const _ghostPlace = (i, j, res, mirrored) =>
		irregularGhostPlace(pentVtx, 5, edgeDirAngles, edgeIdx, i, j, res, mirrored);
	const _collisionCheck = (j, px, py, pr, placed, res) =>
		irregularCollisionCheck(N_FACES, INRADIUS, halfW, dOct, placed, res, j, px, py);


	const presets = [
		{label:'DIN A (1:√2)',aspect:1.4142857142857144,parents:[19,23,23,21,17,0,13,14,14,12,0,13,10,8,-1,10,6,14,21,13,1,0,13,8],tabs:{"10-12":12,"10-15":10,"12-20":20,"15-21":21,"9-20":9,"6-8":8,"1-6":6,"1-20":20,"2-17":2,"7-17":17,"4-18":18,"11-14":11,"3-11":11,"3-18":18,"9-15":9,"2-4":4,"2-9":9,"4-9":9,"4-15":15,"12-16":12,"7-18":7,"17-23":23,"14-23":14,"7-14":14,"11-22":22,"3-22":3,"19-22":19,"0-22":22,"10-21":10,"9-12":12,"5-19":5,"6-19":19,"5-10":10,"1-23":1,"2-20":2,"18-21":18,"15-18":15,"1-8":1,"1-16":1,"16-20":16,"5-16":16},mirrored:false,angle:-1.1780972450961724,lonOffset:0.4008164644327132,northPole:{type:'vertex',dir:[0.7984614318833957,0.5773502691896257,0.1706634362169713]},southPole:{type:'center',face:7,dir:[-0.850340207407311,-0.4623206278176563,-0.2513586456853625]}},
		{label:"US Letter (8.5×11 in)",aspect:1.2941176470588236,parents:[19,23,23,21,17,0,13,14,14,12,0,13,10,8,-1,10,6,14,21,13,1,0,13,8],tabs:{},mirrored:false,angle:-1.1780972450961724},
		{label:"US Legal (8.5×14 in)",aspect:1.6470588235294117,parents:[19,23,23,21,17,0,13,14,14,12,0,13,10,8,-1,10,6,14,21,13,1,0,13,8],tabs:{},mirrored:false,angle:-1.2740903539558606},
		{"label":"US Tabloid (11×17 in)","parents":[22,20,20,18,2,16,1,18,1,2,12,14,9,8,8,4,1,2,4,6,-1,18,19,2],"tabs":{"3-22":3,"7-17":17,"4-17":17,"17-23":23,"5-10":10,"3-21":21,"3-7":7,"10-15":15,"12-20":20},"mirrored":false,"angle":0.29670597283903605,"aspect":1.5454545454545456,"lonOffset":0.9843287277544175,"northPole":{"type":"center","face":14,"dir":[-0.4623206278176563,-0.850340207407311,0.2513586456853625]},"southPole":{"type":"vertex","dir":[0.5773502691896257,0.7984614318833957,-0.17066343621697133]}},
		{label:"B5 JIS (182×257 mm)",aspect:1.4120879120879122,parents:[19,23,23,21,17,0,13,14,14,12,0,13,10,8,-1,10,6,14,21,13,1,0,13,8],tabs:{},mirrored:false,angle:-1.1780972450961724},
	];
	presets.forEach(p => { if (!p.northPole) Object.assign(p, defaultPoles(c3)); });

	return {
		id: 'pentagonal24',
		name: 'Pentagonal-24',
		nFaces: N_FACES,
		storageKey: 'pentagonal24-custom-layouts',
		c3, adj, frames,
		nSides() { return 5; },
		edgeIdx,
		apothem() { return INRADIUS; },
		circumR() { return dOct; },
		tabH: _tabH,
		tabInset: tabInsetLong,
		singleTabArea,
		initialRotation: 0,

		ghostPlace: _ghostPlace,
		tryPlace(i, j, res, placed, mirrored) {
			const pos = _ghostPlace(i, j, res, mirrored);
			if (_collisionCheck(j, pos.x, pos.y, pos.r, placed, res)) return null;
			return pos;
		},
		irregularFace: true,
		polyVerts(fx, fy, rot, face, mirrored) {
			const cr = Math.cos(rot), sr = Math.sin(rot);
			const m = mirrored ? -1 : 1;
			return pentVtx.map(([lx, ly]) => ({
				x: fx + m * lx * cr - ly * sr,
				y: fy + m * lx * sr + ly * cr
			}));
		},
		faceArea() { return pentArea; },
		tabInsets(i, k) {
			// Edges 0,4 are long (oct↔tri), edges 1,2,3 are short (tri↔tri)
			return (k === 0 || k === 4) ? [tabInsetLong, tabInsetLong] : [tabInsetShort, tabInsetShort];
		},
		edgeSlot(i, k) { return k; },
		faceLabel() { return 'pentagon'; },
		faceColor(i, isSelf, isTarget) {
			if (isSelf) return 'rgba(80, 140, 180, 0.9)';
			if (isTarget) return 'rgba(100, 170, 220, 0.45)';
			return 'rgba(35, 55, 70, 0.85)';
		},
		ghostColor() { return 'rgba(100, 170, 220, 0.25)'; },
		pip(rpx, rpy, i, invS) {
			const hw = pentVtx[4][0] * invS, dp = pentVtx[0][1] * invS;
			const triY = pentVtx[4][1] * invS, halfSE = pentVtx[3][0] * invS;
			const inR = -pentVtx[2][1] * invS;
			const ax = Math.abs(rpx);
			return rpy > -inR && hw * (rpy - dp) - (triY - dp) * ax <= 0
				&& (halfSE - hw) * (rpy - triY) - (-inR - triY) * (ax - hw) <= 0;
		},
		gnoProject(i, rpx, rpy, scale, faceOff) {
			const GNO_S = 0.5126414, FC_CY = 0.02110;
			const fcx = rpx * scale, fcy = rpy * scale - FC_CY;
			const theta = faceOff - Math.PI * 0.5;
			const co = Math.cos(theta), so = Math.sin(theta);
			return { gx: (fcx * co - fcy * so) * GNO_S, gy: (fcx * so + fcy * co) * GNO_S, rF: 1 };
		},
		presets,
	};
})();

// ─────────────────────────────────────────────────────────────────────
// Dodecahedron-12 (12 regular pentagons)
// ─────────────────────────────────────────────────────────────────────
GEOMETRIES.dodecahedron12 = (function() {
	const N_FACES = 12;
	const PHI = (1 + Math.sqrt(5)) / 2;

	// Face normals of a regular dodecahedron (normalised)
	const rawC3 = [
		[0, 1, PHI], [0, 1, -PHI], [0, -1, PHI], [0, -1, -PHI],
		[1, PHI, 0], [1, -PHI, 0], [-1, PHI, 0], [-1, -PHI, 0],
		[PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, 1], [-PHI, 0, -1]
	];
	const c3 = rawC3.map(norm3);

	// Adjacency: pentagonal faces share an edge when angle ≈ 41.8° (dot ≈ 0.447)
	const adj = Array.from({ length: N_FACES }, () => []);
	for (let i = 0; i < N_FACES; i++)
		for (let j = i + 1; j < N_FACES; j++) {
			const d = dot3(c3[i], c3[j]);
			if (d > 0.4 && d < 0.5) { adj[i].push(j); adj[j].push(i); }
		}

	const frames = buildFrames(c3, N_FACES);

	const ap5 = regularApothem(5);
	const cr5 = regularCircumR(5);
	const tabH = ap5 * 0.3;
	const tabInset = 0.15;
	const singleTabArea = (1 - tabInset) * tabH;

	function nSides() { return 5; }
	function edgeIdx(i, j) { return regularEdgeIdx(c3, frames, nSides, i, j); }
	function apothem() { return ap5; }
	function circumR() { return cr5; }


	const presets = [
		{"label":"DIN A (1:√2)","parents":[4,4,0,1,-1,8,1,2,0,1,2,1],"tabs":{"10-11":11,"3-5":5,"4-6":4,"0-6":0},"mirrored":false,"angle":-0.7330382858376185,"aspect":1.4142857142857144,"lonOffset":-1.5707963267948966,"northPole":{"type":"vertex","dir":[0.9341723589627157,-0.3568220897730899,0]},"southPole":{"type":"vertex","dir":[-0.9341723589627157,0.3568220897730899,0]}},
		{"label":"US Letter (8.5×11 in)","parents":[4,4,0,1,-1,8,0,2,0,1,0,1],"tabs":{"10-11":11,"3-5":5,"4-6":4,"0-6":0},"mirrored":false,"angle":-0.8901179185171082,"aspect":1.2941176470588234,"lonOffset":-0.6283185307179586,"northPole":{"type":"center","face":9,"dir":[0.85065080835204,0,-0.5257311121191336]},"southPole":{"type":"center","face":10,"dir":[-0.85065080835204,0,0.5257311121191336]}},
		{"label":"US Legal (8.5×14 in)","parents":[4,4,0,1,-1,2,0,2,0,1,2,1],"tabs":{"10-11":11,"2-8":8},"mirrored":false,"angle":-0.5410520681182422,"aspect":1.647058823529412,"lonOffset":-1.1826568114247078,"northPole":{"type":"vertex","dir":[0.9341723589627157,-0.3568220897730899,0]},"southPole":{"type":"vertex","dir":[-0.9341723589627157,0.3568220897730899,0]}},
		{label:"US Tabloid (11×17 in)",aspect:1.5454545454545454,parents:[4,4,0,1,-1,2,0,2,0,1,0,1],tabs:{},mirrored:false,angle:-0.5846852994181004},
		{label:"B5 JIS (182×257 mm)",aspect:1.4120879120879122,parents:[4,4,0,1,-1,8,1,2,0,1,2,1],tabs:{},mirrored:false,angle:-0.7330382858376185},
	];
	presets.forEach(p => { if (!p.northPole) Object.assign(p, defaultPoles(c3)); });

	return {
		id: 'dodecahedron12',
		name: 'Dodecahedron-12',
		nFaces: N_FACES,
		storageKey: 'dodecahedron12-custom-layouts',
		c3, adj, frames,
		nSides,
		edgeIdx,
		apothem,
		circumR,
		tabH,
		tabInset,
		singleTabArea,
		initialRotation: 0,

		ghostPlace(i, j, res, mirrored) {
			return regularGhostPlace(nSides, apothem, edgeIdx, i, j, res, mirrored);
		},
		tryPlace(i, j, res, placed, mirrored) {
			return regularTryPlace(this, i, j, res, placed, mirrored);
		},
		polyVerts(fx, fy, rot) {
			return regularPolyVerts(fx, fy, rot, 5, cr5);
		},
		faceArea() { return regularArea(5); },
		tabInsets() { return [tabInset, tabInset]; },
		edgeSlot(i, k, mirrored) { return regularEdgeSlot(5, k, mirrored); },
		faceLabel() { return 'pent'; },
		faceColor(i, isSelf, isTarget) {
			if (isSelf) return 'rgba(140, 80, 160, 0.9)';
			if (isTarget) return 'rgba(160, 100, 200, 0.45)';
			return 'rgba(65, 40, 75, 0.85)';
		},
		ghostColor() { return 'rgba(160, 100, 200, 0.25)'; },
		pip(rpx, rpy, i, invS) { return pipRegular(rpx, rpy, 5, invS); },
		gnoProject(i, rpx, rpy, scale, faceOff) {
			const rF = 0.7946544723;
			const gS = scale * Math.sqrt(1 - rF * rF) * 2 * Math.sin(Math.PI / 5);
			const co = Math.cos(faceOff), so = Math.sin(faceOff);
			return { gx: (rpx * co - rpy * so) * gS, gy: (rpx * so + rpy * co) * gS, rF };
		},
		presets,
	};
})();

// ─────────────────────────────────────────────────────────────────────
// Rhombic-12 (Rhombic Dodecahedron: 12 congruent rhombi, diagonal ratio √2:1)
// ─────────────────────────────────────────────────────────────────────
GEOMETRIES.rhombic12 = (function() {
	const N_FACES = 12;

	// Unit-edge rhombus with diagonal ratio √2:1
	const RD_A = 1 / Math.sqrt(3);          // short half-diagonal ≈ 0.5774
	const RD_B = Math.sqrt(2 / 3);          // long half-diagonal  ≈ 0.8165
	const INRADIUS = RD_A * RD_B;           // = √2/3 ≈ 0.4714
	const PSI = Math.atan2(RD_A, RD_B);     // = atan(1/√2) ≈ 35.264°

	const rhombVtx = [[RD_B, 0], [0, RD_A], [-RD_B, 0], [0, -RD_A]];
	const edgeDirAngles = [Math.PI - PSI, Math.PI + PSI, -PSI, PSI];
	const _tabH = INRADIUS * 0.3;
	const tabInsetAcute = INRADIUS * 0.3 * Math.SQRT2;
	const tabInsetObtuse = INRADIUS * 0.3 / Math.SQRT2;
	const singleTabArea = (RD_A + RD_B) / 2 * _tabH * 0.7;
	const rhombusArea = 2 * RD_A * RD_B;

	// Octahedron vertices (6)
	const octaVerts = [
		[1, 0, 0], [-1, 0, 0],
		[0, 1, 0], [0, -1, 0],
		[0, 0, 1], [0, 0, -1]
	];

	// 12 perpendicular pairs of octahedron vertices → 12 face normals
	const octaEdges = [];
	for (let i = 0; i < 6; i++)
		for (let j = i + 1; j < 6; j++)
			if (Math.abs(dot3(octaVerts[i], octaVerts[j])) < 0.01)
				octaEdges.push([i, j]);

	const c3 = octaEdges.map(([i, j]) => {
		const m = [octaVerts[i][0] + octaVerts[j][0], octaVerts[i][1] + octaVerts[j][1], octaVerts[i][2] + octaVerts[j][2]];
		return norm3(m);
	});

	const frames = buildFrames(c3, N_FACES);

	// Face offsets: angle from T1 to the first octahedron vertex direction
	const faceOffsets = [];
	for (let fi = 0; fi < N_FACES; fi++) {
		const N = c3[fi], [T1, T2] = frames[fi];
		const va = octaVerts[octaEdges[fi][0]];
		const proj = sub3(va, scale3(N, dot3(va, N)));
		faceOffsets.push(Math.atan2(dot3(proj, T2), dot3(proj, T1)));
	}

	// Adjacency from cyclic ordering around octahedron vertices
	const vertexEdges = Array.from({ length: 6 }, () => []);
	octaEdges.forEach(([a, b], ei) => { vertexEdges[a].push(ei); vertexEdges[b].push(ei); });

	const _cyclicOrderEdges = (vIdx, edgeList) => cyclicOrderEdges(octaVerts, octaEdges, vIdx, edgeList);

	const adj = Array.from({ length: N_FACES }, () => []);
	for (let v = 0; v < 6; v++) {
		const ring = _cyclicOrderEdges(v, vertexEdges[v]);
		for (let k = 0; k < ring.length; k++) {
			const ei = ring[k], ej = ring[(k + 1) % ring.length];
			if (!adj[ei].includes(ej)) adj[ei].push(ej);
			if (!adj[ej].includes(ei)) adj[ej].push(ei);
		}
	}

	function edgeIdx(i, j) {
		const N = c3[i], [T1, T2] = frames[i];
		const proj = sub3(c3[j], scale3(N, dot3(c3[j], N)));
		const pn = norm3(proj);
		let a = Math.atan2(dot3(pn, T2), dot3(pn, T1));
		if (a < 0) a += 2 * Math.PI;
		let rel = a - faceOffsets[i];
		if (rel < 0) rel += 2 * Math.PI;
		if (rel >= 2 * Math.PI) rel -= 2 * Math.PI;
		return Math.floor(rel / (Math.PI / 2)) % 4;
	}

	const _ghostPlace = (i, j, res, mirrored) =>
		irregularGhostPlace(rhombVtx, 4, edgeDirAngles, edgeIdx, i, j, res, mirrored);
	const _collisionCheck = (j, px, py, pr, placed, res) =>
		irregularCollisionCheck(N_FACES, INRADIUS, RD_B, RD_A, placed, res, j, px, py);


	const presets = [
		{label:"DIN A (1:√2)",aspect:1.4142135623730951,parents:[2,10,1,1,6,10,5,5,6,7,-1,1],tabs:{},mirrored:false,angle:0},
		{label:"US Letter (8.5×11 in)",aspect:1.2941176470588236,parents:[2,10,1,1,6,10,5,5,6,7,-1,1],tabs:{},mirrored:false,angle:0.11344640137963143},
		{label:"US Legal (8.5×14 in)",aspect:1.6470588235294117,parents:[9,11,0,1,7,7,4,-1,4,4,5,5],tabs:{},mirrored:false,angle:0.17453292519943295},
		{label:"US Tabloid (11×17 in)",aspect:1.5454545454545454,parents:[9,11,0,1,7,7,4,-1,4,4,5,5],tabs:{},mirrored:false,angle:0.061086523819801536},
		{label:"B5 JIS (182×257 mm)",aspect:1.4120879120879122,parents:[2,10,1,1,6,10,5,5,6,7,-1,1],tabs:{},mirrored:false,angle:-0.02617993877991509},
	];
	presets.forEach(p => { if (!p.northPole) Object.assign(p, defaultPoles(c3)); });

	return {
		id: 'rhombic12',
		name: 'Rhombic-12',
		nFaces: N_FACES,
		storageKey: 'rhombic12-custom-layouts',
		c3, adj, frames,
		nSides() { return 4; },
		edgeIdx,
		apothem() { return INRADIUS; },
		circumR() { return Math.sqrt(RD_A * RD_A + RD_B * RD_B); },
		tabH: _tabH,
		tabInset: tabInsetAcute,
		singleTabArea,
		initialRotation: Math.PI / 2,

		ghostPlace: _ghostPlace,
		tryPlace(i, j, res, placed, mirrored) {
			const pos = _ghostPlace(i, j, res, mirrored);
			if (_collisionCheck(j, pos.x, pos.y, pos.r, placed, res)) return null;
			return pos;
		},
		polyVerts(fx, fy, rot) {
			const cr = Math.cos(rot), sr = Math.sin(rot);
			return rhombVtx.map(([lx, ly]) => ({
				x: fx + lx * cr - ly * sr,
				y: fy + lx * sr + ly * cr
			}));
		},
		faceArea() { return rhombusArea; },
		tabInsets(i, k) {
			return (k % 2 === 0) ? [tabInsetAcute, tabInsetObtuse] : [tabInsetObtuse, tabInsetAcute];
		},
		edgeSlot(i, k) { return k; },
		faceLabel() { return 'rhombus'; },
		faceColor(i, isSelf, isTarget) {
			if (isSelf) return 'rgba(100, 140, 180, 0.9)';
			if (isTarget) return 'rgba(80, 160, 220, 0.45)';
			return 'rgba(40, 60, 80, 0.85)';
		},
		ghostColor() { return 'rgba(80, 160, 220, 0.25)'; },
		pip(rpx, rpy, i, invS) { return Math.abs(rpx) / (RD_B * invS) + Math.abs(rpy) / (RD_A * invS) < 1; },
		gnoProject(i, rpx, rpy, scale, faceOff) {
			const gS = scale / RD_B;
			const co = Math.cos(faceOff), so = Math.sin(faceOff);
			return { gx: (rpx * co - rpy * so) * gS, gy: (rpx * so + rpy * co) * gS, rF: 1 };
		},
		presets,
	};
})();

// ─────────────────────────────────────────────────────────────────────
// Icosahedron-20 (20 equilateral triangles)
// ─────────────────────────────────────────────────────────────────────
GEOMETRIES.icosahedron20 = (function() {
	const N_FACES = 20;
	const PHI = (1 + Math.sqrt(5)) / 2;

	// 12 icosahedron vertices
	const icoV = [];
	for (const s1 of [1, -1])
		for (const s2 of [1, -1]) {
			icoV.push(norm3([0, s1, s2 * PHI]));
			icoV.push(norm3([s1, s2 * PHI, 0]));
			icoV.push(norm3([s2 * PHI, 0, s1]));
		}

	// Find minimum edge length between adjacent vertices
	let minDist = Infinity;
	for (let a = 0; a < 12; a++)
		for (let b = a + 1; b < 12; b++) {
			const d = Math.sqrt(sub3(icoV[a], icoV[b]).reduce((s, v) => s + v * v, 0));
			if (d < minDist) minDist = d;
		}

	// Find 20 triangular faces (triplets of vertices at edge distance)
	const faceNormals = [];
	for (let a = 0; a < 12; a++)
		for (let b = a + 1; b < 12; b++) {
			const dab = Math.sqrt(sub3(icoV[a], icoV[b]).reduce((s, v) => s + v * v, 0));
			if (Math.abs(dab - minDist) > 0.01) continue;
			for (let c = b + 1; c < 12; c++) {
				const dac = Math.sqrt(sub3(icoV[a], icoV[c]).reduce((s, v) => s + v * v, 0));
				const dbc = Math.sqrt(sub3(icoV[b], icoV[c]).reduce((s, v) => s + v * v, 0));
				if (Math.abs(dac - minDist) < 0.01 && Math.abs(dbc - minDist) < 0.01) {
					faceNormals.push(norm3([
						icoV[a][0] + icoV[b][0] + icoV[c][0],
						icoV[a][1] + icoV[b][1] + icoV[c][1],
						icoV[a][2] + icoV[b][2] + icoV[c][2]
					]));
				}
			}
		}

	const c3 = faceNormals;

	// Adjacency: adjacent triangles share an edge → dot ≈ 0.7454 (√5/3)
	const adj = Array.from({ length: N_FACES }, () => []);
	for (let i = 0; i < N_FACES; i++)
		for (let j = i + 1; j < N_FACES; j++) {
			const d = dot3(c3[i], c3[j]);
			if (d > 0.74 && d < 0.76) { adj[i].push(j); adj[j].push(i); }
		}

	const frames = buildFrames(c3, N_FACES);

	const ap3 = regularApothem(3);
	const cr3 = regularCircumR(3);
	const tabH = ap3 * 0.3;
	const tabInset = 0.15;
	const singleTabArea = (1 - tabInset) * tabH;

	function nSides() { return 3; }
	function edgeIdx(i, j) { return regularEdgeIdx(c3, frames, nSides, i, j); }
	function apothem() { return ap3; }
	function circumR() { return cr3; }


	const presets = [
		{"label":"DIN A (1:√2)","parents":[1,4,3,16,3,9,1,6,13,8,6,14,11,15,15,-1,13,4,16,15],"tabs":{"7-11":11},"mirrored":false,"angle":-0.8552113334772216,"aspect":1.4142857142857144,"lonOffset":2.5132741228718345,"northPole":{"type":"vertex","dir":[-0.85065080835204,2.794228342850189e-17,-0.5257311121191336]},"southPole":{"type":"vertex","dir":[0.85065080835204,1.3971141714250944e-17,0.5257311121191336]}},
		{"label":"US Letter (8.5×11 in)","parents":[1,4,3,16,3,7,1,6,2,8,6,7,10,16,11,13,-1,4,16,15],"tabs":{},"mirrored":false,"angle":1.1868238913561442,"aspect":1.2941176470588234,"northPole":{"type":"vertex","dir":[-0.85065080835204,2.794228342850189e-17,-0.5257311121191336]},"southPole":{"type":"vertex","dir":[0.85065080835204,1.3971141714250944e-17,0.5257311121191336]}},
		{"label":"US Legal (8.5×14 in)","parents":[1,4,0,4,17,0,1,5,9,14,12,12,-1,15,11,14,13,10,17,12],"tabs":{"2-8":8,"5-9":9,"5-7":7},"mirrored":false,"angle":-1.0471975511965979,"aspect":1.647058823529412,"northPole":{"type":"vertex","dir":[-0.5257311121191336,-0.85065080835204,0]},"southPole":{"type":"vertex","dir":[0.5257311121191336,0.8506508083520399,2.794228342850189e-17]}},
		{"label":"US Tabloid (11×17 in)","parents":[1,4,0,4,17,0,10,6,9,14,12,12,-1,15,11,14,13,10,17,12],"tabs":{"2-8":8,"5-9":9},"mirrored":false,"angle":-1.0471975511965979,"aspect":1.5454545454545456,"northPole":{"type":"vertex","dir":[-0.5257311121191336,-0.85065080835204,0]},"southPole":{"type":"vertex","dir":[0.5257311121191336,0.8506508083520399,2.794228342850189e-17]}},
		{"label":"B5 JIS (182×257 mm)","parents":[1,4,3,16,3,0,1,5,13,8,17,14,11,15,15,-1,13,4,16,15],"tabs":{"5-9":9},"mirrored":false,"angle":-0.7679448708775047,"aspect":1.4120879120879122,"northPole":{"type":"vertex","dir":[-0.85065080835204,2.794228342850189e-17,-0.5257311121191336]},"southPole":{"type":"vertex","dir":[0.85065080835204,1.3971141714250944e-17,0.5257311121191336]}},
	];
	presets.forEach(p => { if (!p.northPole) Object.assign(p, defaultPoles(c3)); });

	return {
		id: 'icosahedron20',
		name: 'Icosahedron-20',
		nFaces: N_FACES,
		storageKey: 'icosahedron20-custom-layouts',
		c3, adj, frames,
		nSides,
		edgeIdx,
		apothem,
		circumR,
		tabH,
		tabInset,
		singleTabArea,
		initialRotation: 0,

		ghostPlace(i, j, res, mirrored) {
			return regularGhostPlace(nSides, apothem, edgeIdx, i, j, res, mirrored);
		},
		tryPlace(i, j, res, placed, mirrored) {
			return regularTryPlace(this, i, j, res, placed, mirrored);
		},
		polyVerts(fx, fy, rot) {
			return regularPolyVerts(fx, fy, rot, 3, cr3);
		},
		faceArea() { return regularArea(3); },
		tabInsets() { return [tabInset, tabInset]; },
		edgeSlot(i, k, mirrored) { return regularEdgeSlot(3, k, mirrored); },
		faceLabel() { return 'tri'; },
		faceColor(i, isSelf, isTarget) {
			if (isSelf) return 'rgba(60, 150, 130, 0.9)';
			if (isTarget) return 'rgba(80, 200, 170, 0.45)';
			return 'rgba(30, 65, 55, 0.85)';
		},
		ghostColor() { return 'rgba(80, 200, 170, 0.25)'; },
		pip(rpx, rpy, i, invS) { return pipRegular(rpx, rpy, 3, invS); },
		gnoProject(i, rpx, rpy, scale, faceOff) {
			const rF = 0.7946544723;
			const gS = scale * Math.sqrt(1 - rF * rF) * 2 * Math.sin(Math.PI / 3);
			const co = Math.cos(faceOff), so = Math.sin(faceOff);
			return { gx: (rpx * co - rpy * so) * gS, gy: (rpx * so + rpy * co) * gS, rF };
		},
		presets,
	};
})();
