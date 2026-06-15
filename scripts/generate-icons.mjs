#!/usr/bin/env node
/**
 * Generates resources/icon.png (1024x1024), resources/icon-foreground.png,
 * resources/icon-background.png, and resources/splash.png (2732x2732)
 * using pure Node.js (zlib built-in, no npm deps).
 *
 * Design: orange gradient pill capsule on white (splash) / orange (icon).
 */
import { writeFileSync, mkdirSync } from 'fs';
import zlib from 'zlib';

mkdirSync('resources', { recursive: true });

// ─── CRC32 ────────────────────────────────────────────────────────────────────
const CRC = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC[i] = c;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
  const payload = Buffer.concat([t, data]);
  const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(payload));
  return Buffer.concat([l, payload, cr]);
}

const SIG = Buffer.from([137,80,78,71,13,10,26,10]);

// ─── PNG builder (RGBA) ───────────────────────────────────────────────────────
function buildPNG(w, h, rows) {
  // rows: Uint8Array of length h*(w*4+1) — each row: filterByte + RGBA...
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8]=8; ihdr[9]=6; // 8-bit RGBA
  const compressed = zlib.deflateSync(rows, { level: 6 });
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// ─── Math helpers ─────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const lerp  = (a, b, t) => a + (b - a) * t;

// Signed distance to a rounded-rect (positive = inside)
function sdfRRect(px, py, cx, cy, hw, hh, r) {
  const dx = Math.abs(px - cx) - (hw - r);
  const dy = Math.abs(py - cy) - (hh - r);
  if (dx > r || dy > r) return -(Math.hypot(Math.max(0,dx), Math.max(0,dy)) - r);
  if (dx > 0 && dy > 0)  return r - Math.hypot(dx, dy);
  return r - Math.max(dx, dy);
}

// Anti-alias helper: sdf → opacity 0..1
const aa = (d) => clamp(d + 0.5, 0, 1);

// ─── Brand colours ────────────────────────────────────────────────────────────
// Gradient: top #FF7A14 → bottom #CC3D00
const GR = [255,122,20];
const GB = [200,58,0];
const WHITE = [255,255,255];

// ─── Icon (1024×1024) ─────────────────────────────────────────────────────────
function makeIcon(w) {
  const row = w * 4 + 1;
  const buf = Buffer.alloc(w * row);
  const cx = w / 2, cy = w / 2;

  // Pill: 58% width, 24% height, fully rounded caps
  const PW = w * 0.58, PH = w * 0.235, PR = PH / 2;
  // Score line half-width
  const SW = w * 0.007;

  for (let y = 0; y < w; y++) {
    const t   = y / (w - 1);
    const bgR = lerp(GR[0], GB[0], t);
    const bgG = lerp(GR[1], GB[1], t);
    const bgB = lerp(GR[2], GB[2], t);

    const base = y * row;
    buf[base] = 0; // filter: None

    for (let x = 0; x < w; x++) {
      const i = base + 1 + x * 4;

      const dPill  = sdfRRect(x, y, cx, cy, PW/2, PH/2, PR);
      const aPill  = aa(dPill);
      const score  = aa(-(Math.abs(x - cx) - SW)); // score line inside pill
      const aScore = aPill > 0 ? score : 0;

      if (aPill <= 0) {
        buf[i]=Math.round(bgR); buf[i+1]=Math.round(bgG); buf[i+2]=Math.round(bgB); buf[i+3]=255;
      } else if (aScore > 0) {
        // Score line: mix white with gradient
        const sr = lerp(255, bgR, aScore * 0.7);
        const sg = lerp(255, bgG, aScore * 0.7);
        const sb = lerp(255, bgB, aScore * 0.7);
        buf[i]=Math.round(lerp(bgR,sr,aPill)); buf[i+1]=Math.round(lerp(bgG,sg,aPill)); buf[i+2]=Math.round(lerp(bgB,sb,aPill)); buf[i+3]=255;
      } else {
        // White pill
        buf[i]=Math.round(lerp(bgR,255,aPill)); buf[i+1]=Math.round(lerp(bgG,255,aPill)); buf[i+2]=Math.round(lerp(bgB,255,aPill)); buf[i+3]=255;
      }
    }
  }
  return buildPNG(w, w, buf);
}

// ─── Icon foreground (white pill, transparent bg) ─────────────────────────────
function makeIconFG(w) {
  const row = w * 4 + 1;
  const buf = Buffer.alloc(w * row);
  const cx = w / 2, cy = w / 2;
  const PW = w * 0.72, PH = w * 0.30, PR = PH / 2;
  const SW = w * 0.007;

  for (let y = 0; y < w; y++) {
    buf[y * row] = 0;
    for (let x = 0; x < w; x++) {
      const i = y * row + 1 + x * 4;
      const dPill = sdfRRect(x, y, cx, cy, PW/2, PH/2, PR);
      const aPill = aa(dPill);
      const score = aPill > 0 ? aa(-(Math.abs(x - cx) - SW)) : 0;
      if (aPill <= 0) {
        buf[i]=0; buf[i+1]=0; buf[i+2]=0; buf[i+3]=0;
      } else {
        const a = Math.round(aPill * 255);
        if (score > 0) {
          buf[i]=200; buf[i+1]=80; buf[i+2]=0; buf[i+3]=Math.round(score*180);
        } else {
          buf[i]=255; buf[i+1]=255; buf[i+2]=255; buf[i+3]=a;
        }
      }
    }
  }
  return buildPNG(w, w, buf);
}

// ─── Icon background (solid orange gradient) ──────────────────────────────────
function makeIconBG(w) {
  const row = w * 4 + 1;
  const buf = Buffer.alloc(w * row);
  for (let y = 0; y < w; y++) {
    const t=y/(w-1), r=Math.round(lerp(GR[0],GB[0],t)), g=Math.round(lerp(GR[1],GB[1],t)), b=Math.round(lerp(GR[2],GB[2],t));
    buf[y*row]=0;
    for (let x = 0; x < w; x++) { const i=y*row+1+x*4; buf[i]=r;buf[i+1]=g;buf[i+2]=b;buf[i+3]=255; }
  }
  return buildPNG(w, w, buf);
}

// ─── Splash (2732×2732) ───────────────────────────────────────────────────────
// White bg, large centered orange pill
function makeSplash(w) {
  const row = w * 4 + 1;
  const buf = Buffer.alloc(w * row);
  const cx = w / 2, cy = w / 2;
  const PW = w * 0.34, PH = w * 0.135, PR = PH / 2;
  const SW = w * 0.003;

  for (let y = 0; y < w; y++) {
    const t = y / (w - 1);
    buf[y * row] = 0;
    for (let x = 0; x < w; x++) {
      const i = y * row + 1 + x * 4;
      const dPill = sdfRRect(x, y, cx, cy, PW/2, PH/2, PR);
      const aPill = aa(dPill);
      if (aPill <= 0) {
        buf[i]=255; buf[i+1]=255; buf[i+2]=255; buf[i+3]=255;
      } else {
        const pr=Math.round(lerp(GR[0],GB[0],t)), pg=Math.round(lerp(GR[1],GB[1],t)), pb=Math.round(lerp(GR[2],GB[2],t));
        const score = aa(-(Math.abs(x - cx) - SW));
        if (score > 0) {
          buf[i]=Math.round(lerp(255,pr,aPill*0.25)); buf[i+1]=Math.round(lerp(255,pg,aPill*0.25)); buf[i+2]=Math.round(lerp(255,pb,aPill*0.25)); buf[i+3]=255;
        } else {
          buf[i]=Math.round(lerp(255,pr,aPill)); buf[i+1]=Math.round(lerp(255,pg,aPill)); buf[i+2]=Math.round(lerp(255,pb,aPill)); buf[i+3]=255;
        }
      }
    }
  }
  return buildPNG(w, w, buf);
}

// ─── Generate ─────────────────────────────────────────────────────────────────
console.log('Generating icon.png (1024×1024)…');
writeFileSync('resources/icon.png', makeIcon(1024));

console.log('Generating icon-foreground.png (1024×1024)…');
writeFileSync('resources/icon-foreground.png', makeIconFG(1024));

console.log('Generating icon-background.png (1024×1024)…');
writeFileSync('resources/icon-background.png', makeIconBG(1024));

console.log('Generating splash.png (2732×2732) — this takes ~20s…');
writeFileSync('resources/splash.png', makeSplash(2732));

console.log('Done. Run: npx @capacitor/assets generate');
