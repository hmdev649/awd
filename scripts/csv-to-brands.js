// One-time migration: american-watch-makers.csv -> brands/<slug>.md
// Kept for reference. Run with: node scripts/csv-to-brands.js <path-to-csv>
import fs from "node:fs";
import path from "node:path";
import { slugify } from "../lib/slugify.js";

const csvPath = process.argv[2] || "american-watch-makers.csv";
const outDir = "brands";

// Minimal RFC 4180 parser (quoted fields, escaped quotes, newlines in quotes)
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...data] = rows.filter(r => r.some(v => v.trim()));
  const keys = header.map(h => h.trim());
  return data.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] || "").trim()])));
}

// Logo filenames used to live in a hardcoded map inside directory.html
const html = fs.readFileSync("directory.html", "utf8");
const logoMap = Object.fromEntries([...html.matchAll(/'([^']+)': '([^']+\.png)'/g)].map(m => [m[1], m[2]]));

const isoDate = (mdy) => {
  const m = mdy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
};
const placeholder = (s) => !s || /^(also )?coming soon!?$/i.test(s);

// YAML scalar: JSON strings are valid YAML, so quote anything that is a string
const y = (v) => (v === null || v === undefined || v === "" ? "" : typeof v === "number" ? String(v) : JSON.stringify(v));
const yList = (a) => (a.length ? `[${a.map(y).join(", ")}]` : "[]");

const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
fs.mkdirSync(outDir, { recursive: true });
const seen = new Set();

for (const r of rows) {
  const name = r["Company Name"];
  const slug = slugify(name);
  if (seen.has(slug)) throw new Error(`Duplicate slug ${slug} (${name})`);
  seen.add(slug);

  const products = (r["Products"] || "").split(";").map(s => s.trim()).filter(Boolean);
  const founded = /^\d{4}$/.test(r["Company Founded"]) ? Number(r["Company Founded"]) : null;
  const revived = /^\d{4}$/.test(r["Company Revived"]) ? Number(r["Company Revived"]) : null;
  const about = placeholder(r["Company Description"]) ? "" : r["Company Description"];
  const making = placeholder(r["Making in America Description"]) ? "" : r["Making in America Description"];

  const fm = [
    "---",
    `name: ${y(name)}`,
    `city: ${y(r["City"])}`,
    `state: ${y(r["State"])}`,
    `country: ${y(r["Country"])}`,
    `website: ${y(r["Website"])}`,
    `instagram: ${y(r["Instagram"])}`,
    `email: ${y(r["Company Contact"])}`,
    `contact_name: ${y(r["Contact Name"])}`,
    `contact_title: ${y(r["Contact Title"])}`,
    `founded: ${y(founded)}`,
    `revived: ${y(revived)}`,
    `products: ${yList(products)}`,
    `logo: ${y(logoMap[name] || "")}`,
    `status: "active"`,
    `made_in_america: ""`,
    `movements: []`,
    `price_range: ""`,
    `sources: []`,
    `instagram_posts: []`,
    `last_updated: ${y(isoDate(r["Last Updated"]) || "")}`,
    "---",
    "",
  ];
  let body = "";
  if (about) body += `## About\n\n${about}\n\n`;
  if (making) body += `## Making in America\n\n${making}\n`;
  fs.writeFileSync(path.join(outDir, `${slug}.md`), fm.join("\n") + body);
}
console.log(`Wrote ${rows.length} brand files to ${outDir}/`);
