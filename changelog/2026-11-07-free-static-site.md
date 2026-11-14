---
title: "Run the site on free services only, with one file per brand"
date: 2026-11-07
kind: decision
status: decided
summary: "Brand data moved from one spreadsheet to one text file per brand. Eleventy builds the site and GitHub publishes it for free."
---
**Decision.** Each brand is a text file in the site's public code repository. Eleventy builds the site from those files, and GitHub Actions publishes it to GitHub Pages on every change.

**Options considered.**

- Keep all brands in one CSV spreadsheet that the browser loads.
- A hosted database or no-code tool behind the site.
- Paid hosting.
- One text file per brand in the repository (chosen).

**Why.** The directory is a volunteer project with no income, so it uses only free services; the only cost is the domain name. A file per brand gives every brand its own page that can be shared and found in search, with room for longer descriptions and photos. Every change is recorded in the repository's history, and the build checks each file, so a typo can't break the live site. The spreadsheet is still available as a download, generated from the files.

On November 8 we also chose to stay on GitHub Pages instead of moving to Cloudflare Pages.
