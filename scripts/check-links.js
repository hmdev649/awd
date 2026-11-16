// Visits every listing's website and source links and reports the ones that
// look dead, moved or parked. It changes no brand files: a person decides what
// a problem means (see "Health check" in README.md).
//
//   npm run health            print the report
//   npm run health -- --json  print the raw results
//
// The results name businesses whose sites are failing, so they are kept in the
// private tracker sheet, not in this public repo or its issues.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const TIMEOUT_MS = 25000;
const CONCURRENCY = 6;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// Text that shows up on parked domains and closed shops.
const PARKED = [
  /this domain (name )?is for sale/i,
  /buy this domain/i,
  /domain (has )?expired/i,
  /parked (free|domain)/i,
  /sedoparking|parkingcrew|hugedomains|afternic|dan\.com\/buy-domain/i,
  /sorry, this (shop|store) is currently unavailable/i,
  /this (shop|store) is unavailable/i,
  /website (has )?expired/i,
  /account (has been )?suspended/i,
];

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
// myshopify.com and similar are the same shop under another name, not a move.
const sameSite = (a, b) => a === b || a.endsWith("." + b) || b.endsWith("." + a);

async function visit(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": UA, accept: "text/html,*/*;q=0.8", "accept-language": "en-US,en;q=0.9" },
    });
    const finalHost = host(res.url);
    if ([401, 403, 405, 429, 503, 999].includes(res.status)) return { kind: "blocked", detail: `answered ${res.status}` };
    const type = res.headers.get("content-type") || "";
    const body = type.includes("html") ? (await res.text()).slice(0, 200000) : "";
    const parked = PARKED.find((re) => re.test(body));
    if (parked) return { kind: "parked", detail: `page says "${body.match(parked)[0].toLowerCase()}"` };
    if (!res.ok) return { kind: "dead", detail: `answered ${res.status}` };
    if (finalHost && !sameSite(finalHost, host(url))) return { kind: "moved", detail: `now goes to ${finalHost}` };
    return { kind: "ok" };
  } catch (e) {
    const code = e.cause?.code || e.name;
    if (e.name === "AbortError") return { kind: "dead", detail: "no answer (timed out)" };
    if (code === "ENOTFOUND") return { kind: "dead", detail: "domain doesn't exist" };
    return { kind: "dead", detail: `couldn't connect (${code})` };
  } finally {
    clearTimeout(timer);
  }
}

// One retry, so a blip doesn't count as a failure.
async function check(url) {
  let r = await visit(url);
  if (r.kind === "dead") {
    await new Promise((ok) => setTimeout(ok, 4000));
    r = await visit(url);
  }
  return r;
}

async function pool(items, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await worker(items[i]);
    }
  }));
  return out;
}

function loadLinks() {
  const links = [];
  for (const file of fs.readdirSync("brands").filter((f) => f.endsWith(".md")).sort()) {
    const d = matter(fs.readFileSync(path.join("brands", file), "utf8")).data;
    const brand = { slug: file.replace(/\.md$/, ""), name: d.name, status: d.status || "active" };
    if (d.website) links.push({ ...brand, field: "website", url: d.website });
    for (const s of d.sources || []) if (s !== d.website) links.push({ ...brand, field: "source", url: s });
  }
  return links;
}

function report(results, today) {
  const problems = results.filter((r) => ["dead", "parked", "moved"].includes(r.kind));
  const sites = problems.filter((r) => r.field === "website");
  const sources = problems.filter((r) => r.field === "source");
  const blocked = results.filter((r) => r.kind === "blocked" && r.field === "website");
  const websites = results.filter((r) => r.field === "website");
  const row = (r) => `| [${r.name}](https://americanwatchmakingdirectory.org/brands/${r.slug}/) | ${r.url} | ${r.detail} |`;
  const table = (rows) => ["| Listing | Link | What happened |", "|---|---|---|", ...rows.map(row)].join("\n");
  const label = { dead: "Not answering", parked: "Parked or closed", moved: "Goes somewhere else" };

  const out = [`Checked ${today}: ${websites.length} websites and ${results.length - websites.length} source links. ` +
    `${websites.filter((r) => r.kind === "ok").length} websites are fine, ${sites.length} need a look, ${blocked.length} couldn't be checked.`, ""];
  if (!sites.length) out.push("No website problems this week.", "");
  for (const kind of ["parked", "dead", "moved"]) {
    const rows = sites.filter((r) => r.kind === kind).sort((a, b) => a.name.localeCompare(b.name));
    if (rows.length) out.push(`## Websites: ${label[kind].toLowerCase()} (${rows.length})`, "", table(rows), "");
  }
  if (sources.length) out.push(`## Source links with problems (${sources.length})`, "", table(sources.sort((a, b) => a.name.localeCompare(b.name))), "");
  if (blocked.length) {
    out.push(`<details><summary>Couldn't be checked (${blocked.length}): these sites turn away automated visits, which usually means they are up</summary>`, "",
      blocked.map((r) => `- ${r.name}: ${r.url} (${r.detail})`).join("\n"), "", "</details>", "");
  }
  out.push("A link that fails two weeks running is worth a look by hand. This report changes no listings.");
  return out.join("\n");
}

const links = loadLinks();
const results = (await pool(links, async (l) => ({ ...l, ...(await check(l.url)) })))
  // A closed business's site pointing somewhere else is expected, not news.
  .map((r) => (r.kind === "moved" && r.status === "inactive" ? { ...r, kind: "ok" } : r));
const today = new Date().toISOString().slice(0, 10);

if (process.argv.includes("--json")) console.log(JSON.stringify(results.filter((r) => r.kind !== "ok"), null, 2));
else console.log(report(results, today));
