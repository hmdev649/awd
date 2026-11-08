import fs from "node:fs";
import { validateBrands } from "./lib/validate-brands.js";

export default function (eleventyConfig) {
  // Hand-written pages and assets are copied through untouched.
  for (const p of [
    "index.html", "about.html", "contact.html", "directory.html", "faqs.html",
    "privacy.html", "terms.html", "test.html", "test-flags.html",
    "css", "js", "images", "sdc", "CNAME",
  ]) {
    eleventyConfig.addPassthroughCopy(p);
  }

  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("scripts/**");
  eleventyConfig.ignores.add("lib/**");
  eleventyConfig.ignores.add("node_modules/**");

  // All brands, sorted by name. The build fails if any brand file is invalid,
  // so a bad edit can never reach the live site.
  eleventyConfig.addCollection("brands", (api) => {
    const brands = api
      .getFilteredByGlob("brands/*.md")
      .sort((a, b) => a.data.name.localeCompare(b.data.name, "en", { sensitivity: "base" }));
    const logoFiles = new Set(fs.readdirSync("images/logos"));
    const errors = validateBrands(brands, logoFiles);
    if (errors.length) {
      throw new Error(`Brand data has ${errors.length} problem(s):\n  - ${errors.join("\n  - ")}`);
    }
    return brands;
  });

  // {{ city | location(state, country) }} -> "Oakland, CA" (or the country if both are blank)
  eleventyConfig.addFilter("location", (city, state, country) =>
    [city, state].filter(Boolean).join(", ") || (country === "CA" ? "Canada" : "United States"));
  eleventyConfig.addFilter("countryName", (c) => ({ US: "United States", CA: "Canada" })[c] || c);
  eleventyConfig.addFilter("readableDate", (iso) => {
    if (!iso) return "";
    const [y, m, d] = String(iso).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  });
  eleventyConfig.addFilter("plainText", (html) =>
    String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  eleventyConfig.addFilter("truncate", (s, n = 155) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s));
  // Safe to drop inside <script> tags
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v).replace(/</g, "\\u003c"));

  return {
    dir: { input: ".", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["md", "njk", "11ty.js"],
    markdownTemplateEngine: false,
  };
}
