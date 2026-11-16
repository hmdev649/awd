# Style guide

How the American Watchmaking Directory looks, and the rules any change to the site's design should follow. Everything lives in one stylesheet, `css/shared.css`. Its `:root` block holds every color, text size, corner and shadow; use those variables and the existing classes rather than new values.

If a change needs something this guide doesn't cover, follow the closest existing pattern, then add the new rule here.

## Look and feel

Warm, quiet and plain: cream page, paper-colored panels, white cards, one dark slate-blue ink for text and buttons. One typeface (Manrope). No gradients, no extra accent colors, no decorative icons. Content sits in rounded panels and cards with soft shadows.

## Color

| Variable | Use |
|---|---|
| `--cream` | Page background |
| `--paper` | Large panels: text pages, forms, brand profiles, filter bar, footer |
| `--surface` (white) | Small cards, logo tiles, inputs, pills |
| `--ink` | Text, buttons, active states, focus outlines |
| `--ink-dark` | Button hover only |
| `--muted` | Secondary text: intros, captions, meta lines, counts |
| `--line` | Borders and dividers |
| `--brass` | Small uppercase accent labels ("Brand of the week"), the decision chip, and Canadian pins and clusters on maps |
| `--ok` (green) | "Details confirmed by the brand" only |
| `--alert` (red) | "No longer trading" only |
| `--info` (blue) | "Coming soon" and "Open question" only |

Status colors mean one thing each; don't reuse them for decoration. Text on cream or paper must stay at least 4.5:1 contrast; `--muted` is the lightest text color allowed.

## Type

One family, one scale. Never set a raw `font-size`; use a variable.

| Variable | Desktop | Phone | Use |
|---|---|---|---|
| `--text-2xl` | 28px | 22.4px | Page titles (every page's `h1`, including the homepage headline) and the site name |
| `--text-xl` | 21.6px | 19.2px | Section headings (`h2`), stat numbers |
| `--text-lg` | 18.4px | same | Page intros, small headings (`h3`), card titles |
| `--text-md` | 16px | same | Body text, inputs, buttons |
| `--text-sm` | 14.4px | same | Secondary text, form labels, pills, footer and table-of-contents links |
| `--text-xs` | 13px | same | Captions, meta lines, uppercase labels |
| `--text-2xs` | 12px | same | Smallest captions (phone logo tiles); nothing goes below this |

Rules:
- Page titles are the largest text on any page, all the same size, and never bigger than the site name on desktop. On phones the site name shrinks to fit one line; titles stay at `--text-2xl`.
- Headings get smaller at each level: `h1` > `h2` > `h3`.
- Headings are weight 700; body is 450. Bold links and action links are 600.
- Small uppercase labels (filter labels, "At a glance", "On this page", footer column headings): `--text-xs`, weight 700, `--muted`, uppercase, letter-spacing `.08em`.
- Running text is capped at `--measure` (68 characters); page intros at 62 characters, except the directory intro.

## Shape and spacing

- Corners: `--radius-sm` (8px) for inputs and buttons, `--radius` (14px) for cards and tiles, `--radius-lg` (20px, 16px on phones) for panels. Pills are fully rounded.
- Shadows: `--shadow-sm` on cards and tiles, `--shadow` on panels.
- Page width is 1200px with 20px padding (16px on phones). Sections are 48px apart (36px on phones).

## Components

Reuse these; don't restyle them per page.

- **Panel** (`.panel`, or the paper background on text pages and forms): paper, `--radius-lg`, `--shadow`, 32px padding (20px on phones).
- **Card** (`.card`, `.stat`, `.region-tile`, `.option`, logo tiles): white, `--radius`, `--shadow-sm`. Clickable cards get a 2px ink border on hover.
- **Buttons** (`.btn`): ink fill, cream text, 44px minimum height. `.btn.ghost` is transparent with a `--line` border that turns ink on hover. `.btn-sm` is for small header and toolbar buttons.
- **Text boxes and dropdowns**: all share one rule. They're 48px tall (`--control-h`), white, with a 2px `--line` border and `--radius-sm` corners. On focus the border turns ink and gets `--focus-ring`. Dropdowns use the custom chevron, not the browser's arrow. Multi-choice pickers (the directory's State and Founded pickers) use the same button look and open a white checklist card.
- **Pills**: filter pills (`.fchip`) and link pills (`.chip-link`) are the same size (about 36px tall), white, with a 2px `--line` border, `--text-sm` text at weight 600, and a muted count after the label. When selected, a pill fills with ink.
- **Status chips** (`.chip`): small and fully rounded. Status chips have a colored outline.
- **"Details confirmed by the brand" mark**: always a filled green circle with a white check. It's small beside a name on cards and inside the outlined chip on brand pages. It must stay visible when a name is cut off.
- **Term lists** (`dl.claims`): bold term, plain ink definition, and a 3px ink bar down the left of each pair.
- **Site mark**: the round AWD mark (the favicon image) sits before the site name in the header, 40px on desktop and 28px on phones.
- **Directory results line**: the count ("Showing 12 of 215") and "Clear all filters" on the left, the Sort dropdown on the right with its label beside it. Sort is not inside the filter panel.
- **Maps**: United States pins and clusters are `--ink`, Canadian ones `--brass`, and the two are clustered separately so a count never mixes countries. Pins placed only at state level are hollow. Maps showing both countries get a color key underneath.
- **Photo gallery** (`.gallery`, brand pages): up to three photos in one row, 4:3, `--radius` corners, with an optional caption and credit.
- **Expandable rows** (`.faq`): a line above each row, a "+" or "−" on the right, and an "Expand all" button above the list.

## Layout and phones

- Breakpoints in use: 1100px, 1000px, 900px, 860px, 768px (the main phone breakpoint), 640px, 600px, 520px. Reuse these rather than adding new ones.
- Nothing may scroll sideways at 375px, 768px or 1280px wide. Long names get cut off with "…" instead.
- Tap targets are at least 32px tall: small buttons (`.btn-sm`) are about 33px, pills 36px, main buttons 44px and text boxes 48px.
- Grids drop to fewer columns on phones; logo tiles go three per row, state tiles two per row.
- The header shows the site mark and name, then Directory, Map and About, plus the "Suggest a brand" button; on phones the button reads "Suggest".

## Writing on the page

Copy follows the rules in `CLAUDE.md`: describe businesses (not the people running them), say "based in America", and attribute every made-in claim to the brand.

## Checking a change

Before pushing a design change:
1. Build, and look at the affected pages at phone width (375px) and desktop width (1280px).
2. Check that no page scrolls sideways, and that no text is below 12px.
3. Check that the new parts match the components above: sizes, colors, corners and borders.
4. If you've added a pattern, describe it in this file.
