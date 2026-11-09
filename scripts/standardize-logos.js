// Turns every original logo in logo-sources/<slug>.<ext> into a consistent
// 512x512 tile at images/logos/<slug>.png, and points each brand's `logo:`
// field at it. Safe to re-run: npm run logos
//
// For each logo it:
//  1. removes a solid background (white, black or any flat color), keeping
//     anti-aliased edges clean (color-to-alpha)
//  2. trims to the visible mark
//  3. recolors light-on-dark marks (e.g. white text on a black square) to dark
//     ink so they stay visible on the site's white logo tiles
//  4. scales by visual weight (equal area, not equal width), so square marks
//     and long wordmarks look equally prominent, and centers it on white
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = "logo-sources";
const OUT = "images/logos";
const SIZE = 512;
const TARGET = 300;          // side of the square with the same area as the mark
const MAX_W = 440, MAX_H = 400;
const INK = [31, 42, 47];    // #1f2a2f, the site's dark ink

const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

async function load(file) {
  const { data, info } = await sharp(file, { density: 300 })
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { px: data, w: info.width, h: info.height };
}

// Median color of the outer ring, and how uniform/transparent it is
function borderStats({ px, w, h }) {
  const samples = [];
  const ring = Math.max(2, Math.round(Math.min(w, h) * 0.01));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= ring && y >= ring && x < w - ring && y < h - ring) continue;
    const i = (y * w + x) * 4;
    samples.push([px[i], px[i + 1], px[i + 2], px[i + 3]]);
  }
  const transparent = samples.filter((s) => s[3] < 40).length / samples.length;
  const opaque = samples.filter((s) => s[3] >= 40);
  const med = (k) => { const v = opaque.map((s) => s[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)] ?? 255; };
  const bg = [med(0), med(1), med(2)];
  const near = opaque.filter((s) => Math.abs(s[0] - bg[0]) + Math.abs(s[1] - bg[1]) + Math.abs(s[2] - bg[2]) < 40).length;
  return { transparent, bg, uniform: opaque.length ? near / opaque.length : 1 };
}

// Color-to-alpha: pixels matching bg become transparent; edges are un-blended
function removeBackground({ px, w, h }, bg) {
  const out = Buffer.from(px);
  for (let i = 0; i < out.length; i += 4) {
    const d = Math.max(Math.abs(px[i] - bg[0]), Math.abs(px[i + 1] - bg[1]), Math.abs(px[i + 2] - bg[2]));
    // ignore small differences (vignettes, JPEG noise in the background)
    const a = Math.max(0, Math.min(1, (d - 24) / 80));
    if (a > 0 && a < 1) for (let k = 0; k < 3; k++) out[i + k] = Math.max(0, Math.min(255, Math.round((px[i + k] - bg[k] * (1 - a)) / a)));
    out[i + 3] = Math.round(a * px[i + 3]);
  }
  return out;
}

function inkLuminance(px) {
  let sum = 0, weight = 0;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3] / 255;
    if (a < 0.3) continue;
    sum += lum(px[i], px[i + 1], px[i + 2]) * a; weight += a;
  }
  return weight ? sum / weight : 0;
}

function saturation(px) {
  let sum = 0, n = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 80) continue;
    const mx = Math.max(px[i], px[i + 1], px[i + 2]), mn = Math.min(px[i], px[i + 1], px[i + 2]);
    sum += mx ? (mx - mn) / mx : 0; n++;
  }
  return n ? sum / n : 0;
}

function bbox(px, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (px[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

async function standardize(file) {
  const img = await load(file);
  const { transparent, bg, uniform } = borderStats(img);
  let px = img.px, note = "";

  // Already has real transparency (even if the mark touches the edges)
  let clear = 0;
  for (let i = 3; i < img.px.length; i += 4) if (img.px[i] < 40) clear++;
  const hasTransparency = clear / (img.px.length / 4) > 0.15;

  if (transparent > 0.6 || hasTransparency) {
    note = "transparent";
  } else if (uniform > 0.85 && Math.max(...bg) > 120 && (Math.max(...bg) - Math.min(...bg)) / Math.max(...bg) > 0.35) {
    note = "photo/badge kept (colored tile)";   // e.g. a white mark on a red square: the square is the logo
  } else if (uniform > 0.85) {
    px = removeBackground(img, bg);
    note = lum(...bg) > 0.92 ? "white bg" : `bg ${bg.join(",")} removed`;
  } else {
    note = "photo/badge kept";   // busy edges: treat the whole image as the mark
  }

  // Pale grey/white ink (made for dark backgrounds) vanishes on a white tile:
  // turn its neutral light parts into dark ink, keeping colored accents.
  // Badges and photos are left exactly as they are.
  const isBadge = note.startsWith("photo");
  const isPale = (i) => {
    const mx = Math.max(px[i], px[i + 1], px[i + 2]), mn = Math.min(px[i], px[i + 1], px[i + 2]);
    return (mx ? (mx - mn) / mx : 0) < 0.2 && lum(px[i], px[i + 1], px[i + 2]) > 0.4;
  };
  // Only when pale neutral ink is most of the mark (not e.g. a white letter
  // inside a red square, which should stay white)
  let inkPx = 0, palePx = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] >= 80) { inkPx++; if (isPale(i)) palePx++; }
  if (!isBadge && inkPx && palePx / inkPx > 0.5) {
    for (let i = 0; i < px.length; i += 4) if (px[i + 3] >= 8 && isPale(i)) [px[i], px[i + 1], px[i + 2]] = INK;
    note += ", pale ink darkened";
  }

  const box = bbox(px, img.w, img.h);
  if (!box) throw new Error("empty after background removal");
  const mark = await sharp(px, { raw: { width: img.w, height: img.h, channels: 4 } }).extract(box).png().toBuffer();

  const scale = Math.min(TARGET / Math.sqrt(box.width * box.height), MAX_W / box.width, MAX_H / box.height);
  const w = Math.max(1, Math.round(box.width * scale)), h = Math.max(1, Math.round(box.height * scale));
  const resized = await sharp(mark).resize(w, h, { kernel: "lanczos3" }).toBuffer();

  const out = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: "#ffffff" } })
    .composite([{ input: resized, left: Math.round((SIZE - w) / 2), top: Math.round((SIZE - h) / 2) }])
    .flatten({ background: "#ffffff" })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
  return { out, note: `${note}; ${box.width}x${box.height} -> ${w}x${h}` };
}

fs.mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
const report = [];
for (const f of fs.readdirSync(SRC).sort()) {
  const slug = path.parse(f).name;
  if (only.length && !only.includes(slug)) continue;
  try {
    const { out, note } = await standardize(path.join(SRC, f));
    fs.writeFileSync(path.join(OUT, `${slug}.png`), out);
    report.push(`ok    ${slug}: ${note}`);
    // point the brand at the standardized file
    const md = `brands/${slug}.md`;
    if (fs.existsSync(md)) {
      const t = fs.readFileSync(md, "utf8");
      const next = /^logo: .*$/m.test(t) ? t.replace(/^logo: .*$/m, `logo: "${slug}.png"`) : t;
      if (next !== t) fs.writeFileSync(md, next);
    } else report.push(`  !! no brand file brands/${slug}.md`);
  } catch (e) {
    report.push(`FAIL  ${slug}: ${e.message}`);
  }
}
console.log(report.join("\n"));
