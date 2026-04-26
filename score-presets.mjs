// Compute page-fill ratio for every preset in foldable-geometries.js
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('./foldable-geometries.js', import.meta.url), 'utf8');
const ctx = { console };
vm.createContext(ctx);
const GEOMETRIES = vm.runInContext(src + '\n;GEOMETRIES;', ctx);

function edgeKey(i, j) { return Math.min(i, j) + '-' + Math.max(i, j); }

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
			res[j] = geo.ghostPlace(p, j, res, !!mirrored);
			placed[j] = true;
			queue.push(j);
		}
	}
	return { res, placed, parent, mirrored: !!mirrored };
}

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
}

function bboxCriticalPoints(geo, layout, tabs) {
	const N = geo.nFaces;
	const { res, placed, parent, mirrored } = layout;
	const pts = [];
	for (let i = 0; i < N; i++) {
		if (!placed[i]) continue;
		const verts = geo.polyVerts(res[i].x, res[i].y, res[i].r, i, mirrored);
		const fx = res[i].x, fy = res[i].y;
		const n = geo.nSides(i);
		for (let k = 0; k < n; k++) {
			const v1 = verts[k], v2 = verts[(k + 1) % n];
			pts.push(v1.x, v1.y);
			let targetFace = -1;
			for (const j of geo.adj[i]) {
				const slot = geo.edgeSlot(i, geo.edgeIdx(i, j), mirrored);
				if (slot === k) { targetFace = j; break; }
			}
			if (targetFace < 0) continue;
			const isInternal = placed[targetFace] && (parent[targetFace] === i || parent[i] === targetFace);
			if (isInternal) continue;
			const isCutEdge = placed[targetFace];
			let hasTab = true;
			if (isCutEdge) {
				const key = edgeKey(i, targetFace);
				const owner = tabs[key] !== undefined ? tabs[key] : Math.min(i, targetFace);
				hasTab = (owner === i);
			}
			if (hasTab) {
				const emx = (v1.x + v2.x) / 2 - fx, emy = (v1.y + v2.y) / 2 - fy;
				const eml = Math.sqrt(emx * emx + emy * emy);
				const nx = emx / eml, ny = emy / eml;
				const dx = v2.x - v1.x, dy = v2.y - v1.y;
				const [ins1, ins2] = geo.tabInsets(i, k);
				pts.push(v1.x + nx * geo.tabH + dx * ins1, v1.y + ny * geo.tabH + dy * ins1);
				pts.push(v2.x + nx * geo.tabH - dx * ins2, v2.y + ny * geo.tabH - dy * ins2);
			}
		}
	}
	return pts;
}

function paperArea(pts, aspect) {
	let mnX = 1e9, mxX = -1e9, mnY = 1e9, mxY = -1e9;
	for (let p = 0; p < pts.length; p += 2) {
		const x = pts[p], y = pts[p + 1];
		if (x < mnX) mnX = x; if (x > mxX) mxX = x;
		if (y < mnY) mnY = y; if (y > mxY) mxY = y;
	}
	const w = mxX - mnX, h = mxY - mnY;
	const s = Math.min(aspect / w, 1 / h);
	return aspect / (s * s);
}

function netArea(geo, layout, tabs) {
	const N = geo.nFaces;
	const { placed, parent } = layout;
	let area = 0;
	for (let i = 0; i < N; i++) if (placed[i]) area += geo.faceArea(i);
	for (let i = 0; i < N; i++) {
		if (!placed[i]) continue;
		for (const j of geo.adj[i]) {
			if (j <= i || !placed[j]) continue;
			if (parent[j] === i || parent[i] === j) continue;
			area += geo.singleTabArea;
		}
	}
	return area;
}

function paperScoreScalar(pts, angle, aspect) {
	let mnX = 1e9, mxX = -1e9, mnY = 1e9, mxY = -1e9;
	const cs = Math.cos(angle), sn = Math.sin(angle);
	for (let p = 0; p < pts.length; p += 2) {
		const rx = pts[p] * cs - pts[p + 1] * sn;
		const ry = pts[p] * sn + pts[p + 1] * cs;
		if (rx < mnX) mnX = rx; if (rx > mxX) mxX = rx;
		if (ry < mnY) mnY = ry; if (ry > mxY) mxY = ry;
	}
	const w = mxX - mnX, h = mxY - mnY;
	const s = Math.min(aspect / w, 1 / h);
	return aspect / (s * s);
}

function optimizeAngle(geo, layout, tabs, aspect) {
	const pts = bboxCriticalPoints(geo, layout, tabs);
	let bestA = 0, bestAr = Infinity;
	for (let hdeg = 0; hdeg < 360; hdeg++) {
		const rad = hdeg * 0.5 * Math.PI / 180;
		const ar = paperScoreScalar(pts, rad, aspect);
		if (ar < bestAr) { bestAr = ar; bestA = rad; }
	}
	if (bestA > Math.PI / 2) bestA -= Math.PI;
	return bestA;
}

const rows = [];
for (const [id, geo] of Object.entries(GEOMETRIES)) {
	if (!geo || !geo.presets) continue;
	for (const p of geo.presets) {
		const layout = unfoldNet(geo, p.parents, p.mirrored);
		const tabs = p.tabs || {};
		// Re-optimize angle like the UI does (tab-aware), instead of using stored p.angle
		const optAngle = optimizeAngle(geo, layout, tabs, p.aspect);
		applyNetAngle(layout, optAngle, geo.nFaces);
		const pts = bboxCriticalPoints(geo, layout, tabs);
		const pA = paperArea(pts, p.aspect);
		const nA = netArea(geo, layout, tabs);
		const fill = nA / pA * 100;
		const stored = (p.angle || 0);
		rows.push({ geometry: geo.id, label: p.label, aspect: p.aspect, fill, optAngle, stored });
	}
}

rows.sort((a, b) => a.fill - b.fill);
console.log('worst → best fill ratio:\n');
console.log('fill%   geometry          page format');
console.log('─────   ───────────────   ────────────────────');
for (const r of rows) {
	console.log(`${r.fill.toFixed(1).padStart(5)}   ${r.geometry.padEnd(15)}   ${r.label}`);
}
