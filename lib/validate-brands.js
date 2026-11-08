// Checks every brand file before the site is built. Returns a list of
// human-readable problems; an empty list means the data is good.
import fs from "node:fs";
import { slugify } from "./slugify.js";

const COUNTRIES = ["US", "CA"];
const PRODUCTS = ["Watches", "Straps", "Components", "Tools", "Restoration"];
const STATUSES = ["active", "upcoming", "inactive", "defunct"];
const MOVEMENTS = ["mechanical", "quartz", "mecha-quartz", "solar", "smart"];
const MADE_IN_AMERICA = ["", "designed", "assembled", "manufactured", "components"];

const isUrl = (s) => /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(s);
const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function validateBrands(brands, logoFiles) {
  const errors = [];
  const slugs = new Map();
  const thisYear = new Date().getFullYear();

  for (const b of brands) {
    const d = b.data;
    const file = b.page.inputPath.replace(/^\.\//, "");
    const err = (msg) => errors.push(`${file}: ${msg}`);

    if (!d.name || typeof d.name !== "string") { err("missing name"); continue; }

    const slug = b.page.fileSlug;
    if (slug !== slugify(d.name)) err(`file name should be ${slugify(d.name)}.md to match the name "${d.name}"`);
    if (slugs.has(slug)) err(`duplicate of ${slugs.get(slug)}`);
    slugs.set(slug, file);

    if (!COUNTRIES.includes(d.country)) err(`country must be one of ${COUNTRIES.join(", ")} (got "${d.country}")`);
    for (const k of ["website", "instagram"]) {
      if (d[k] && !isUrl(d[k])) err(`${k} is not a full URL: "${d[k]}"`);
    }
    if (d.instagram && !/instagram\.com\//i.test(d.instagram)) err(`instagram should be an instagram.com link`);
    if (d.email && !isEmail(d.email)) err(`email is not an email address: "${d.email}"`);

    for (const k of ["founded", "revived"]) {
      if (d[k] != null && !(Number.isInteger(d[k]) && d[k] >= 1700 && d[k] <= thisYear)) {
        err(`${k} must be a year between 1700 and ${thisYear} (got "${d[k]}")`);
      }
    }

    if (!Array.isArray(d.products) || !d.products.length) err("products must list at least one item");
    else for (const p of d.products) if (!PRODUCTS.includes(p)) err(`unknown product "${p}" (allowed: ${PRODUCTS.join(", ")})`);

    if (d.status && !STATUSES.includes(d.status)) err(`status must be one of ${STATUSES.join(", ")}`);
    if (d.made_in_america && !MADE_IN_AMERICA.includes(d.made_in_america)) {
      err(`made_in_america must be one of ${MADE_IN_AMERICA.filter(Boolean).join(", ")}`);
    }
    for (const m of d.movements || []) if (!MOVEMENTS.includes(m)) err(`unknown movement "${m}"`);
    for (const s of d.sources || []) if (!isUrl(s)) err(`source is not a URL: "${s}"`);

    // Exact-case match: GitHub Pages is case-sensitive even though macOS isn't.
    if (d.logo && !logoFiles.has(d.logo)) err(`logo images/logos/${d.logo} does not exist (check upper/lower case)`);

    if (d.last_updated && !isIsoDate(String(d.last_updated))) err(`last_updated must be YYYY-MM-DD in quotes`);
    if (!d.added || !isIsoDate(String(d.added))) err(`added must be the date the brand was listed, YYYY-MM-DD in quotes`);

    // photos: [{ src: "images/brands/<slug>/1.jpg", alt: "...", credit: "..." }]
    for (const p of d.photos || []) {
      if (!p || !p.src || !p.alt) { err(`each photo needs src and alt`); continue; }
      if (!fs.existsSync(p.src.replace(/^\//, ""))) err(`photo ${p.src} does not exist`);
    }

    if (d.state && !d.region) err(`state "${d.state}" isn't a known ${d.country === "CA" ? "province" : "state"} code`);
  }
  return errors;
}
