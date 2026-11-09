import fs from "node:fs";
import { validateBrands } from "./lib/validate-brands.js";

const byName = (a, b) => a.data.name.localeCompare(b.data.name, "en", { sensitivity: "base" });

export default function (eleventyConfig) {
  // Hand-written assets and pages that aren't templates are copied through untouched.
  for (const p of ["test.html", "test-flags.html", "css", "js", "images", "CNAME"]) {
    eleventyConfig.addPassthroughCopy(p);
  }

  for (const p of ["README.md", "scripts/**", "lib/**", "node_modules/**"]) eleventyConfig.ignores.add(p);

  // All brands, sorted by name. The build fails if any brand file is invalid,
  // so a bad edit can never reach the live site.
  eleventyConfig.addCollection("brands", (api) => {
    const brands = api.getFilteredByGlob("brands/*.md").sort(byName);
    const errors = validateBrands(brands, new Set(fs.readdirSync("images/logos")));
    if (errors.length) {
      throw new Error(`Brand data has ${errors.length} problem(s):\n  - ${errors.join("\n  - ")}`);
    }
    const unplaced = brands.filter((b) => b.data.state && !b.data.place).map((b) => b.page.inputPath);
    if (unplaced.length) {
      console.warn(`[awd] ${unplaced.length} brand(s) have a location that isn't on the map yet. Run "npm run geocode":\n  ${unplaced.join("\n  ")}`);
    }
    return brands;
  });

  // One entry per state/province that has at least one brand:
  // { code, name, slug, country, kind, brands: [...] }. US first, then Canada, A-Z.
  eleventyConfig.addCollection("regions", (api) => {
    const groups = new Map();
    for (const b of api.getFilteredByGlob("brands/*.md").sort(byName)) {
      const r = b.data.region;
      if (!r) continue;
      const key = `${r.country}-${r.code}`;
      if (!groups.has(key)) groups.set(key, { ...r, key, brands: [] });
      groups.get(key).brands.push(b);
    }
    return [...groups.values()].sort((a, b) => (a.country === b.country ? a.name.localeCompare(b.name) : a.country === "US" ? -1 : 1));
  });

  // ---- Filters ----
  // {{ city | location(state, country) }} -> "Oakland, CA" (or the country if both are blank)
  eleventyConfig.addFilter("location", (city, state, country) =>
    [city, state].filter(Boolean).join(", ") || (country === "CA" ? "Canada" : "United States"));
  eleventyConfig.addFilter("countryName", (c) => ({ US: "United States", CA: "Canada" })[c] || c);
  eleventyConfig.addFilter("readableDate", (iso) => {
    if (!iso) return "";
    const [y, m, d] = String(iso).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  });
  eleventyConfig.addFilter("plainText", (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  eleventyConfig.addFilter("truncate", (s, n = 155) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s));
  // Safe to drop inside <script> tags
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v).replace(/</g, "\\u003c"));
  eleventyConfig.addFilter("regionUrl", (r) => (r ? `/states/${r.slug}/` : ""));
  // The collections.regions entry (with its brands) for a brand's region
  eleventyConfig.addFilter("regionGroup", (regions, r) => (r ? regions.find((g) => g.key === `${r.country}-${r.code}`) : null));

  // [{ value, count }] for a field across brands; array fields are flattened
  eleventyConfig.addFilter("facet", (brands, key) => {
    const counts = new Map();
    for (const b of brands) for (const v of [].concat(b.data[key] ?? [])) if (v) counts.set(v, (counts.get(v) || 0) + 1);
    return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || String(a.value).localeCompare(b.value));
  });

  // Newest additions first
  eleventyConfig.addFilter("recentlyAdded", (brands, n = 6) =>
    [...brands].sort((a, b) => String(b.data.added).localeCompare(String(a.data.added)) || byName(a, b)).slice(0, n));

  // A different brand (with a logo) each week; the site rebuilds weekly to rotate it.
  eleventyConfig.addFilter("weeklyPick", (brands) => {
    const pool = brands.filter((b) => b.data.thumb);
    const week = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
    const i = (week * 7919) % pool.length; // stride through the list so neighbors aren't consecutive
    return pool[i];
  });

  eleventyConfig.addFilter("oldest", (brands) =>
    brands.filter((b) => b.data.founded).sort((a, b) => a.data.founded - b.data.founded)[0]);
  eleventyConfig.addFilter("foundedSince", (brands, year) => brands.filter((b) => b.data.founded >= year).length);
  eleventyConfig.addFilter("names", (brands, n = 3) => brands.slice(0, n).map((b) => b.data.name).join(", "));
  eleventyConfig.addFilter("largest", (regions, n = 12) =>
    [...regions].sort((a, b) => b.brands.length - a.brands.length || a.name.localeCompare(b.name)).slice(0, n));
  eleventyConfig.addFilter("brandCount", (regions) => regions.reduce((sum, r) => sum + r.brands.length, 0));
  eleventyConfig.addFilter("unplaced", (brands) => brands.filter((b) => !b.data.place));
  eleventyConfig.addFilter("others", (brands, self) => brands.filter((b) => b.url !== self));

  // "Houston (3), Austin (2)" style city breakdown
  eleventyConfig.addFilter("topCities", (brands, n = 3) => {
    const counts = new Map();
    for (const b of brands) if (b.data.city) counts.set(b.data.city, (counts.get(b.data.city) || 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([city, count]) => ({ city, count }));
  });

  // Compact marker data for js/map.js
  eleventyConfig.addFilter("mapPoints", (brands) =>
    brands.filter((b) => b.data.place).map((b) => ({
      n: b.data.name,
      u: b.url,
      l: [b.data.city, b.data.state].filter(Boolean).join(", "),
      lat: b.data.place.lat,
      lng: b.data.place.lng,
      a: b.data.place.approximate || undefined,
      t: b.data.thumb?.src2x,
    })));

  return {
    dir: { input: ".", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["md", "njk", "11ty.js"],
    markdownTemplateEngine: false,
  };
}
