// Renders the extension icon (original artwork, no NYT marks) as PNGs for the manifest and the Chrome
// Web Store, plus the SVG source. Dependency-free: shapes are rasterised here with supersampling and
// encoded with node's zlib. Run `pnpm icons` after changing the design.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "src/icons");
const SIZES = [16, 32, 48, 128];

/* Design: a dark rounded tile (the extension's #121213 background) holding a 3×3 crossword-like grid
   whose five centre cells form a bold "+" in white — the grid for the puzzles, the plus for the name.
   The corner cells are a quiet gray so the grid still reads as a grid. */
const COLORS = {
  tile: [0x12, 0x12, 0x13],
  edge: [0x3a, 0x3a, 0x3c],
  plus: [0xff, 0xff, 0xff],
  corner: [0x4a, 0x4a, 0x4c],
};

function geometry(S) {
  const small = S <= 32;
  const pad = small ? 0.12 * S : 0.15 * S;
  const gap = small ? Math.max(1, 0.06 * S) : 0.06 * S;
  const cell = (S - 2 * pad - 2 * gap) / 3;
  const edge = Math.max(1, Math.round(0.025 * S));
  return { pad, gap, cell, edge, tileRadius: 0.22 * S, cellRadius: 0.12 * cell };
}

function inRoundedRect(px, py, x0, y0, x1, y1, r) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const dx = Math.max(x0 + r - px, 0, px - (x1 - r));
  const dy = Math.max(y0 + r - py, 0, py - (y1 - r));
  return dx * dx + dy * dy <= r * r;
}

/** Colour (rgb + alpha 0/1) of the design at a point, in tile coordinates. */
function sample(px, py, S, g) {
  if (!inRoundedRect(px, py, 0, 0, S, S, g.tileRadius)) return null;
  let color = inRoundedRect(px, py, g.edge, g.edge, S - g.edge, S - g.edge, Math.max(0, g.tileRadius - g.edge)) ? COLORS.tile : COLORS.edge;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x0 = g.pad + col * (g.cell + g.gap);
      const y0 = g.pad + row * (g.cell + g.gap);
      if (inRoundedRect(px, py, x0, y0, x0 + g.cell, y0 + g.cell, g.cellRadius)) {
        const isPlus = row === 1 || col === 1;
        color = isPlus ? COLORS.plus : COLORS.corner;
      }
    }
  }
  return color;
}

function render(S) {
  const g = geometry(S);
  const N = S <= 48 ? 8 : 4; // supersamples per axis
  const rgba = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let r = 0, gr = 0, b = 0, a = 0;
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const c = sample(x + (i + 0.5) / N, y + (j + 0.5) / N, S, g);
          if (!c) continue;
          r += c[0]; gr += c[1]; b += c[2]; a += 1;
        }
      }
      const o = (y * S + x) * 4;
      if (a > 0) {
        rgba[o] = Math.round(r / a);
        rgba[o + 1] = Math.round(gr / a);
        rgba[o + 2] = Math.round(b / a);
        rgba[o + 3] = Math.round((a / (N * N)) * 255);
      }
    }
  }
  return rgba;
}

/* Minimal PNG writer: 8-bit RGBA, no filtering. */
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}
function png(S, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0);
  ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  const rows = Buffer.alloc((S * 4 + 1) * S);
  for (let y = 0; y < S; y++) {
    rows[y * (S * 4 + 1)] = 0; // filter: none
    rgba.copy(rows, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function svg() {
  const S = 128;
  const g = geometry(S);
  const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  const cells = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = (g.pad + col * (g.cell + g.gap)).toFixed(2);
      const y = (g.pad + row * (g.cell + g.gap)).toFixed(2);
      const fill = hex(row === 1 || col === 1 ? COLORS.plus : COLORS.corner);
      cells.push(`  <rect x="${x}" y="${y}" width="${g.cell.toFixed(2)}" height="${g.cell.toFixed(2)}" rx="${g.cellRadius.toFixed(2)}" fill="${fill}"/>`);
    }
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">`,
    `  <!-- Games Plus for NYT icon: original artwork (MIT). Source for src/icons/icon-*.png, see scripts/make-icons.mjs -->`,
    `  <rect width="${S}" height="${S}" rx="${g.tileRadius.toFixed(2)}" fill="${hex(COLORS.edge)}"/>`,
    `  <rect x="${g.edge}" y="${g.edge}" width="${S - 2 * g.edge}" height="${S - 2 * g.edge}" rx="${(g.tileRadius - g.edge).toFixed(2)}" fill="${hex(COLORS.tile)}"/>`,
    ...cells,
    `</svg>`,
    "",
  ].join("\n");
}

mkdirSync(OUT, { recursive: true });
for (const S of SIZES) writeFileSync(join(OUT, `icon-${S}.png`), png(S, render(S)));
writeFileSync(join(OUT, "icon.svg"), svg());
console.log(`[nyte] icons written to src/icons/ (${SIZES.map((s) => `${s}px`).join(", ")} + icon.svg)`);
