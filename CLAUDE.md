# American Watchmaking Directory: notes for Claude

americanwatchmakingdirectory.org: a free, volunteer-run directory of watchmaking businesses based in the US, plus a few in Canada. Run by Hamza and Vivek. `README.md` explains how the site is built; read it before changing code or data.

**This repository is public.** Everything in this file and in `changelog/` can be read by anyone. Keep private notes (personal contacts, frank opinions about specific businesses) out of the repo.

## Rules that always apply

- **Free services only.** The project has no income. Don't propose paid hosting, databases, APIs or SaaS. Git is the database, Eleventy builds the site, GitHub Pages hosts it.
- **Based in America, not made in America.** A listing means a business is *based* in the US (or Canada), wherever its products are made. Never describe listed brands, or the directory, as "American-made", "domestic" or "making watches in America". Tagline: "A free, volunteer-run guide to watchmaking businesses based in America."
- **About the businesses, not the people behind them.** The directory is a guide to companies. In taglines, headlines and descriptions, talk about the businesses (brands, makers, suppliers), not "the people running" them.
- **Only report what brands claim.** Never say in our own voice what is or isn't made in America (or Swiss made, handmade, in-house). Attribute every such claim: "the brand says its watches are assembled in Texas". Don't repeat press claims as fact. Third-party ratings may only appear credited to their source.
- **Makers, not repairers, when searching for new listings** (the 2026-11-14 search). Restoration is a product type, but repair and service businesses weren't in scope for that search.
- **Ask before adding a business** that doesn't clearly fit (for example, a company with offices in several countries). Research, then present candidates for approval; don't add them unasked.

## Working conventions

- **Design changes follow `STYLE.md`.** Read it before changing anything visual (CSS, layout, components, new pages). Use the variables and components it lists, check phone and desktop widths, and add any new pattern to it.

- `checked` is the date someone last looked a listing over against the business's own site and found it still right; set it whenever you do that, even if nothing changed. `last_updated` is for changes, `verified` only for the brand's own confirmation. A passing health check is not a check.
- The weekly health check (`npm run health`) only reports. Don't change a listing's `status` because of it without asking. Its results name businesses whose sites are failing, so they go in the private tracker sheet, never in an issue, a workflow log or anything else public.
- Brand data lives in `brands/<slug>.md`. Edit those, never the CSV (it is generated). Allowed values are in `lib/validate-brands.js`; a bad value fails the build and leaves the live site unchanged.
- New city or state: run `npm run geocode`. New logo: put the original in `logo-sources/<slug>.<ext>`, run `npm run logos`, and make sure the brand file has a `logo:` line.
- Every push to `main` deploys in about a minute. `gh` isn't installed; check runs at `https://api.github.com/repos/hmdev649/awd/actions/runs`.
- Other Claude sessions may have uncommitted work in this folder. Run `git status` first and commit only your own changes.
- Commit messages describe the change in plain words.

## Changelog and decisions

`changelog/` holds one Markdown file per entry, named `YYYY-MM-DD-short-name.md`. They are published at /changelog/.

- **Read it before starting a task.** It records what the user has decided, the options considered and why. Don't reopen a settled decision without a reason.
- **Add an entry** when the user makes a decision (`kind: decision`, `status: decided`), when a question is left open for them (`status: pending`), and for each notable change to the site or listings (`kind: update`). When a decision changes, set the old one to `status: replaced` and add a new entry.
- Write for the public: plain words, neutral and factual. Don't name a specific business in a negative light or reveal private correspondence. A decision prompted by one business can be written as a general rule.
- Front matter: `title`, `date`, `kind` (update | decision), `status` for decisions (decided | pending | replaced), and a one-sentence `summary`. Body for decisions: **Decision.** (or **Question.**), **Options considered.**, **Why.** (or **What matters.**).
