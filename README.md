# American Watchmaking Directory

Source for [americanwatchmakingdirectory.org](https://americanwatchmakingdirectory.org).

The site is static and costs nothing to run beyond the domain. Each brand is a text file in `brands/`, [Eleventy](https://www.11ty.dev/) builds the site from those files, and GitHub Actions publishes it to GitHub Pages on every push to `main`.

## How it fits together

| Path | What it is |
|---|---|
| `brands/<slug>.md` | **The data.** One file per brand. Facts go between the `---` lines and descriptions go below them, written in Markdown. |
| `images/logos/` | Original brand logos, referenced by each brand's `logo:` field. The build makes small WebP copies in `/img/logos/`. |
| `_data/places.json` | Map coordinates for each "City, State" in the brand files. Fill it in with `npm run geocode`. |
| `_data/regions.js` | US state and Canadian province codes → names and URL slugs. |
| `_data/tiers.js` | Labels and explanations for the `made_in_america` badge. |
| `_data/site.js` | Site name, navigation, Formspree form address, Google Analytics ID. |
| `_includes/base.njk` | Shared page layout: header, footer, link-preview tags. |
| `_includes/macros.njk` | Shared pieces: brand card, logo, map. |
| `_includes/brand.njk` | Template for each brand page at `/brands/<slug>/`. |
| `index.njk` | Homepage: search, stats, brand of the week, recently added, map preview. |
| `directory.njk` + `js/directory.js` | The directory. Every card is rendered at build time; the script filters, counts and sorts them and keeps filters in the URL (e.g. `/directory.html?region=US-TX&product=Watches`). |
| `map.njk`, `states.njk`, `state.njk` + `js/map.js` | The map, the state/province index, and one page per state or province at `/states/<name>/`. Maps use MapLibre with free OpenFreeMap tiles (no API key). |
| `suggest.njk`, `update.njk`, `contact.njk` + `js/forms.js` | Forms. All post to Formspree; `?brand=Name` pre-fills the update form. |
| `about.njk`, `faqs.njk`, `privacy.njk`, `terms.njk` | Text pages. |
| `brands.json.11ty.js`, `american-watch-makers.csv.11ty.js` | Generate the `/brands.json` and `/american-watch-makers.csv` data exports. |
| `lib/validate-brands.js` | Checks every brand file. Bad data fails the build, so it never reaches the live site. |
| `scripts/` | `geocode.js` (map coordinates) and `csv-to-brands.js` (the one-time CSV conversion). |

The site rebuilds every Monday, as well as on every push, so that "Brand of the week" on the homepage rotates.

## Adding or editing a brand

1. Copy an existing file in `brands/` and rename it to the brand's slug: lowercase, with dashes, and `&` written as `and`. For example, "Crown & Buckle" becomes `crown-and-buckle.md`.
2. Fill in the fields:

```yaml
---
name: "Otto Frei"
city: "Oakland"
state: "CA"                 # US state or Canadian province code
country: "US"               # US or CA
website: "https://www.ottofrei.com/"
instagram: "https://www.instagram.com/ottofrei1930/"
email: "info@ottofrei.com"
contact_name:
contact_title:
founded: 1930               # a year, or leave blank
revived:                    # year a historic brand was revived
products: ["Tools", "Components"]   # Watches, Straps, Components, Tools, Restoration
logo: "otto_frei.png"       # file in images/logos/, exact upper/lower case
photos:                     # optional gallery; files go in images/brands/<slug>/
  - { src: "images/brands/otto-frei/bench.jpg", alt: "The Oakland warehouse", credit: "Otto Frei" }
status: "active"            # active, upcoming, inactive, defunct
made_in_america: ""         # designed, assembled, manufactured, components
movements: []               # mechanical, quartz, mecha-quartz, solar, smart
price_range: ""
sources: []                 # URLs the facts came from
instagram_posts: []         # links to our posts featuring this brand
last_updated: "2026-11-07"
added: "2026-11-07"         # date it was first listed (drives "Recently added")
---

## About

Free-form Markdown. Leave the body empty and the page shows a "profile coming soon" note.

## Making in America

What they make here, and what they source elsewhere.
```

3. If the brand has a new city or state, run `npm run geocode` to put it on the map.
4. Commit and push to `main`. The site rebuilds in about a minute. If a field is wrong, the Actions run fails and says which file and field to fix.

## Running locally

```bash
npm install
npm run serve      # http://localhost:8888, rebuilds on save
npm run build      # writes the site to _site/
```
