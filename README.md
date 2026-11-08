# American Watchmaking Directory

Source for [americanwatchmakingdirectory.org](https://americanwatchmakingdirectory.org).

The site is static and costs nothing to run beyond the domain. Each brand is a text file in `brands/`, [Eleventy](https://www.11ty.dev/) builds the site from those files, and GitHub Actions publishes it to GitHub Pages on every push to `main`.

## How it fits together

| Path | What it is |
|---|---|
| `brands/<slug>.md` | **The data.** One file per brand. Facts go between the `---` lines and descriptions go below them, written in Markdown. |
| `images/logos/` | Brand logos, referenced by each brand's `logo:` field. |
| `_includes/brand.njk` | Template for each brand page at `/brands/<slug>/`. |
| `directory.html` + `js/directory.js` | The searchable directory, which loads `/brands.json`. |
| `brands.json.11ty.js` | Generates `/brands.json` from the brand files. |
| `american-watch-makers.csv.11ty.js` | Generates a spreadsheet export at `/american-watch-makers.csv`. |
| `lib/validate-brands.js` | Checks every brand file. Bad data fails the build, so it never reaches the live site. |
| `index.html`, `about.html`, … | Hand-written pages, copied to the site as they are. |
| `scripts/csv-to-brands.js` | One-time script that converted the old CSV into brand files. |

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
status: "active"            # active, upcoming, inactive, defunct
made_in_america: ""         # designed, assembled, manufactured, components
movements: []               # mechanical, quartz, mecha-quartz, solar, smart
price_range: ""
sources: []                 # URLs the facts came from
instagram_posts: []         # links to our posts featuring this brand
last_updated: "2026-11-07"
---

## About

Free-form Markdown. Leave the body empty and the page shows a "profile coming soon" note.

## Making in America

What they make here, and what they source elsewhere.
```

3. Commit and push to `main`. The site rebuilds in about a minute. If a field is wrong, the Actions run fails and says which file and field to fix.

## Running locally

```bash
npm install
npm run serve      # http://localhost:8888, rebuilds on save
npm run build      # writes the site to _site/
```
