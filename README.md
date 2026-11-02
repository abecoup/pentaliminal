# Pentaliminal

The website for Pentaliminal: infrastructure for wise intelligence. Live at **https://pentaliminal.ai**.

## Layout

| Path | What it is |
|---|---|
| `src/body.html` | Home page markup. `{{MONO_*}}` and `{{WM_*}}` placeholders are filled with the traced brand paths at build time. |
| `src/roadmap.html` | Roadmap page markup (`/roadmap/`): Now, Next, Later, and the Trust figure. |
| `src/roadmap.json` | Roadmap status: each product's horizon (now, next or later), its stage and its one-line description. Feeds the roadmap page and the strip in section 07. |
| `src/partials/` | The brand symbols and the footer, shared by both pages. |
| `src/styles.css` | All styles. Design tokens (colors, type) are at the top; light and dark themes. |
| `src/main.js` | All behavior. Vanilla JS, no dependencies. Each feature is a small module started from `boot()`; one failing module can't take down the rest, and animation loops stop when off screen, paused or reduced. |
| `src/monogram.json`, `src/wordmark.json` | Vector paths of the P monogram and the wordmark. |
| `src/static/` | Copied into the site as-is: icons, link-preview image, the Archivo font files (SIL OFL, see `assets/fonts/OFL.txt`), 404 page, `CNAME`, `robots.txt`, `sitemap.xml`. |
| `tools/build.py` | Builds `docs/` (the live site) and `dist-artifact/page.html` (a single-file preview). |
| `docs/` | **Generated.** The deployed site. Don't edit by hand; edit `src/` and rebuild. |

## Working on it

```sh
python3 tools/build.py              # rebuild docs/ after editing src/
python3 -m http.server -d docs 8000 # preview at http://localhost:8000
```

No build tools or packages are needed: Python 3 only.

## Hosting

GitHub Pages serves the `docs/` folder of the `main` branch (Settings → Pages → Deploy from a branch → `main` / `/docs`). The custom domain comes from `docs/CNAME`.

DNS for `pentaliminal.ai` (set at the domain registrar):

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | abecoup.github.io |

After DNS resolves, tick **Enforce HTTPS** in Settings → Pages.

## Updating the roadmap

Progress lives in `src/roadmap.json`. To move a product along, set its `"stage"` to one of `planning`, `designing`, `building`, `testing` or `live`. To move it between sections, set its `"horizon"` to `now`, `next` or `later`. Change `"updated"` to the current month, then rebuild. The roadmap page and the home page strip both update from the same file.

The page is deliberately light on detail beyond what's being built now: Trust gets a figure and specifics, Notebook a line, and the later products a line each. The Trust copy and figure are in `src/roadmap.html`.

## Behavior worth knowing

- **Motion.** The hero turns, the rings orbit and the background mesh drifts. A *Pause motion* button under the hero stops all of it and is remembered; visitors with reduced motion set in their system get a still page.
- **Theme.** Light or dark follows the system until the visitor picks one with the header button; the choice is remembered and applied before first paint.
- **Fonts.** Archivo is served from the site itself (no third-party font request). The claude.ai preview build uses Google Fonts instead.

## Hero tagline

`TAGLINE_A_FX` and `TAGLINE_B_FX` at the top of `tools/build.py` set how each half of "Beyond intelligence. Toward wisdom." arrives: `"decode"` (resolves out of drafting marks, letter by letter, and again on hover), `"label"` (an ink tag wipes in behind it) or `"none"`. Rebuild after changing them.

## Contact form

The "Your question" section sends through [FormSubmit](https://formsubmit.co) (free, no account). The address is set at the top of `tools/build.py`:

- `FORM_ID`: where messages go. The first message to a new address sends a one-time confirmation email; click it to activate. FormSubmit then provides a random alias: put that in `FORM_ID` so the real address isn't in the page.
- `FALLBACK_MAIL`: shown as an email link if sending fails. Set it to `""` to keep every address out of the page.

## Design

See `DESIGN.md` for the design system: tokens, type, figures, motion rules and the brand foundations.
