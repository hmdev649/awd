// Looks up map coordinates for every brand location that isn't in
// _data/places.json yet, using OpenStreetMap's free Nominatim service
// (max 1 request/second). Run after adding brands: npm run geocode
import fs from "node:fs";
import regions from "../_data/regions.js";

const PLACES = "_data/places.json";
const places = fs.existsSync(PLACES) ? JSON.parse(fs.readFileSync(PLACES, "utf8")) : {};
const UA = "AmericanWatchmakingDirectory/1.0 (+https://americanwatchmakingdirectory.org)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const field = (text, key) => (text.match(new RegExp(`^${key}: (.*)$`, "m"))?.[1] || "").replace(/^"|"$/g, "").trim();

const wanted = new Map();
for (const f of fs.readdirSync("brands").filter((f) => f.endsWith(".md"))) {
  const t = fs.readFileSync(`brands/${f}`, "utf8");
  const city = field(t, "city"), state = field(t, "state"), country = field(t, "country");
  if (!state) continue; // nothing useful to place
  const key = `${city}|${state}|${country}`;
  if (!places[key]) wanted.set(key, { city, state, country });
}

console.log(`${wanted.size} location(s) to look up`);
for (const [key, { city, state, country }] of wanted) {
  const region = regions[`${country}-${state}`]?.name || state;
  const params = new URLSearchParams({ format: "json", limit: "1", country: country === "CA" ? "Canada" : "United States", state: region });
  if (city) params.set("city", city);
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "User-Agent": UA } });
  const [hit] = res.ok ? await res.json() : [];
  if (hit) {
    places[key] = { lat: +(+hit.lat).toFixed(4), lng: +(+hit.lon).toFixed(4), approximate: !city };
    console.log(`  ok   ${key} -> ${places[key].lat}, ${places[key].lng}`);
  } else {
    console.log(`  MISS ${key} (HTTP ${res.status}); add it to ${PLACES} by hand`);
  }
  await sleep(1100);
}

const sorted = Object.fromEntries(Object.entries(places).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(PLACES, JSON.stringify(sorted, null, 2) + "\n");
console.log(`Saved ${Object.keys(sorted).length} places to ${PLACES}`);
