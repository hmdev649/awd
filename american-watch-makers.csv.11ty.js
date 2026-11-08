// Spreadsheet export of the brand files, published at the old CSV address so
// existing links keep working. Generated on every build; edit brands/*.md instead.
export const data = { permalink: "/american-watch-makers.csv", eleventyExcludeFromCollections: true };

const columns = [
  ["Company Name", (d) => d.name],
  ["City", (d) => d.city],
  ["State", (d) => d.state],
  ["Country", (d) => d.country],
  ["Website", (d) => d.website],
  ["Instagram", (d) => d.instagram],
  ["Company Contact", (d) => d.email],
  ["Contact Name", (d) => d.contact_name],
  ["Contact Title", (d) => d.contact_title],
  ["Company Founded", (d) => d.founded],
  ["Company Revived", (d) => d.revived],
  ["Products", (d) => (d.products || []).join("; ")],
  ["Movements", (d) => (d.movements || []).join("; ")],
  ["Made in America", (d) => d.made_in_america],
  ["Status", (d) => d.status],
  ["Last Updated", (d) => d.last_updated],
  ["Directory Page", (d, page, site) => site.url + page.url],
];

const cell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function render({ collections, site }) {
  const lines = [columns.map(([h]) => cell(h)).join(",")];
  for (const { data: d, page } of collections.brands) {
    lines.push(columns.map(([, get]) => cell(get(d, page, site))).join(","));
  }
  return lines.join("\n") + "\n";
}
