# Pentaliminal design system, V2

V2 is built from the brand spec in `brand/source-brand-spec.jpg` and the monogram concept in `brand/source-monogram-concept.jpg`.
Reference implementation: `src/` (built into `docs/`).

## Idea

A technical drawing. Everything is drawn on a 30° / 60° isometric grid with construction lines showing how it was made. Light mode is ink on drafting paper; dark mode is bone on charcoal (deliberately not blueprint blue).

Spec principles:
1. **Pure geometry.** Strong geometric relationships and reductive composition.
2. **Systematic design.** Computational rhythm, grids and structural precision.
3. **Abstract insignia.** Compact, distinctive forms with carefully resolved negative space.

Carried over from V1: the manifesto content and its order, the threshold idea, halftone shading, the lens-light interaction, registration marks and the section tracker.

## Brand assets (`brand/`)

| File | Use |
|---|---|
| `monogram.svg` | The P monogram: a ribbon folded through two planes, with halftone shading on the two inner faces (the stem's inner side and the foot's top). Paper-filled body, so it sits on top of grids. |
| `monogram-line.svg` | Line-only version in `currentColor`, for small sizes and single-color use. |
| `wordmark.svg` | PENTALIMINAL wordmark in `currentColor`. |

Both were traced from the source images. They're faithful to the drawings but not hand-built vectors; a designer should redraw them on the iso grid before print or large-format use.

## Tagline

- Brand line: **Beyond intelligence. Toward wisdom.** Condensed caps, directly under the wordmark, set to the same width. Both halves share one weight and size. "Beyond intelligence." is solid type in `--ink-2`. **"Toward wisdom." is the essence of the brand, so it gets depth.** The letters stay crisp, solid ink and fully legible. Behind them is an isometric extrusion along the 30° axis, about a third of the type size deep, shaded as a halftone, like the shaded inner faces of the monogram. The dots are largest where the side meets the letter and shrink as it recedes. A thin paper-colored halo keeps the letter edges sharp in front of it. The meaning: intelligence (and the wordmark) is flat; wisdom has a dimension to it.
  - On load the depth grows out from behind the letters, after the tagline arrives.
  - Pointing at the tagline deepens it a little more; it settles back when the pointer leaves.
  - It is drawn on a small canvas behind the real text and only redraws while it is changing. With reduced motion it is drawn once at rest.
  - Never obscure, blur or break up the words themselves: wisdom should read as clear.
- Descriptor: Infrastructure for wise intelligence.
- Supporting line: We build the foundations that help AI understand context, recognize uncertainty, consider what matters, and act responsibly.

## Color

No accent color. Emphasis comes from weight, fill, hatching and halftone.

| Token | Light: drafting paper | Dark: charcoal | Use |
|---|---|---|---|
| `--paper` | `#f4f1eb` | `#131312` | Background, and the fill inside drawn shapes |
| `--paper-2` | `#ebe7df` | `#1b1a18` | Rare raised surface |
| `--ink` | `#141414` | `#efebe3` | Text, linework, filled buttons, active states |
| `--ink-2` | `#57544f` | `#aaa59c` | Secondary text |
| `--ink-3` | `#8a867f` | `#7a766f` | Dimension lines, construction labels, inactive numbers |
| `--rule` | `#cdc8be` | `#34322e` | Hairlines between rows, minor ruler ticks |
| `--grid` | `#d9d4ca` | `#2a2926` | Isometric mesh |

A toggle in the header ("Dark" / "Light") switches modes and remembers the choice in the browser. Without a saved choice the page follows the system setting.

## Type

One family, **Archivo** (variable width and weight), used at three widths:

| Role | Setting |
|---|---|
| Wordmark | The traced `wordmark.svg`, never typeset |
| Headlines | Archivo, width 112%, weight 560, tracking -0.025em |
| Labels, nav, tagline, criteria names | Condensed caps: width 75%, weight 600, +0.02em tracking |
| Body | Archivo, width 100%, weight 400, 17px, line-height 1.6 |
| Quotes, lens questions | Archivo italic |

Section labels are drawing callouts: the number in a circle, a short leader line, then the name in condensed caps. The page reads in this order: 01 Intersection, 02 Charter, 03 Thesis, 04 Five lenses, 05 Framework, 06 Problem wisdom, 07 Infrastructure, 08 How we work, 09 Labs.

## Grid and construction

- **Isometric grid**: vertical lines plus lines at +30° and -30°, dashed `2 3`, in `--grid`.
- **Hero**: the dodecahedron from V1 (twelve pentagons, the "penta" in the name), turning slowly about a vertical axis. Drawn in line: visible edges and corners in ink, hidden edges dashed, faces turned from the light (upper left) in halftone. Around it:
  - the iso grid, clipped to a hexagon that fades at the edges;
  - two construction rings that orbit very slowly in opposite directions (a dashed circle with degree ticks; a dashed diamond);
  - the parts of the drawing that stay true while it turns: the vertical axis with crosshairs, the dashed circle of the sphere it fits inside, and that sphere's radius (R).
  Moving the pointer across the figure turns the solid a little and drifts the grid.
- **Page mesh**: a loose triangular lattice on a fixed canvas behind the whole page, adapted from the GPT prototype. It waves slightly, bends as you scroll, and leans with the pointer. Lines are ink at about 2.5–6% opacity, a little stronger toward the hero; every eleventh node is a small dot. It should be felt more than seen. Cards and boxes have a paper fill so the mesh stays behind them. With reduced motion it is drawn once and only moves with scroll.
- **Iso grid**: used in the hero hexagon and inside the infrastructure cards only.
- **Section lines**: 1px ink with a scale ruler hanging from them (minor ticks every 24px, major every 120px) and a `+` registration mark at each end.
- **Footer**: a ruled box in the style of a drawing's title block, holding ordinary footer content: the monogram, the name with descriptor and tagline, two link columns (About, Work), and the copyright with a back-to-top link.

## Shading

Halftone dots stand in for the spec's flat grey: 7-unit dot pattern (4 units at small sizes), ink at 50% opacity (42% in dark mode). Shade the faces that turn away from the light, meaning right-facing sides and the monogram's inner faces. Top faces stay paper unless active.

## Figures

| Figure | Section | Details |
|---|---|---|
| Intersection | 01 Intersection | The same tetrahedron, still and labeled. Base corners carry circled numbers 01–03 for the science of intelligence, the wisdom of humanity and the engineering of AI; the apex is labeled PENTALIMINAL. Beside it, three ruled boxes joined by "+" connectors and an arrow down into an ink-filled result box with the wordmark and "Infrastructure for wise intelligence". Hovering a box highlights its corner and the edge to the apex; hovering the result highlights all three. |
| Charter | 02 Charter | A ruled definition list: The belief, The mission, The vision, The method, The ambition. Labels in condensed caps on the left, statements large on the right. |
| Lens plan | 04 Five lenses | A pentagon in plan view with a dashed circumcircle, a center mark and numbered corners 01–05. The chosen lens's coverage is a hatched wedge from its corner, bounded by dashed rays; the rest is left blank for the other lenses. The wedge rotates to the chosen corner. The interior angle (108°) is marked at that corner. |
| Step drawings | 05 Framework | A different isometric drawing per step, each sized to the same frame on a shared baseline. Knowing: a solid cube with a dashed "assumed" cube above it; hover separates them. Seeing: one cube and three observers; hover makes the sight lines solid. Situating: a tower among neighbors on a ground plate; hover shows the ground grid. Valuing: two unequal weights on a beam; hover tips it on its fulcrum. Acting: a cube moved from a dashed ghost along an arrow; hover carries it further. |
| Problem wisdom | 06 Problem wisdom | A shift diagram: "Conventional approach: What can we build with AI?" in a dashed box, an arrow, then "Pentaliminal approach: What is worth building, and why?" in a solid box. Then the seven criteria rows, then the Human Problem Atlas: a short description beside a ruled table of eight domains and their fundamental questions. |
| Infrastructure drawings | 07 Infrastructure | Numbered 01–03, never called "planes". Each on its own mesh. Pentagonal pyramid (orientation): hover raises it and shows the axis and target it aims at. Wireframe cube holding a solid cube (cognitive): hover grows the inner cube. Three stacked plates (agency): hover lifts them apart. |
| Monogram | Header, footer | In the header at 50px tall with a thickened line, then a divider and the wordmark at 18px. |
| Threshold monogram | Close | V1's threshold effect applied to the monogram, on a canvas. A horizontal bar with square end marks crosses the mark. Above it the mark is drawn crisp; below it the ink and shading are sampled into dots that drop out, drift sideways and fade the further they fall. Pointing at the figure (or dragging, on touch) moves the bar; it eases back when the pointer leaves. It's a vertical slider for keyboards (up and down arrows). |

## Roadmap page (`/roadmap/`)

A second page, linked from section 07 (a compact Now / Next / Later strip and a button) and from the footer. It shares the header style, footer, mesh and theme; page-specific scripts skip themselves when their figures aren't on the page.

It shows direction, not a blueprint: detail only for what's being built now, a line each for the rest.

| Part | Details |
|---|---|
| Overview | Three ruled columns: Now, Next, Later. Now has a heavier top rule. Now and Next show a small progress track; Later shows a status per product. Each column links to its section. |
| Progress track | Five stages on one line: Planning, Designing, Building, Testing, Live. Stages done are solid ink diamonds on a solid line; the current stage is a larger halftone diamond; stages ahead are hollow, on a dashed line. Each product also shows a plain status label ("Being designed", "Under construction"). |
| Now: Trust | Name, one line, the track, then the figure: protection (a threshold bar that keeps out AI nobody invited; your own agents inside a dashed boundary), provenance (person → agent → tool calls → records, joined by one line into the ledger), proof (ledger → review → reports). The ledger is the one ink-filled node. Then who it's for, what it does, and an invitation to get in touch. |
| Next: Notebook | Name, one line, the track. |
| Later | One sentence on the shared memory, then a ruled list with a line and a status per product, and an invitation to ask about what's further out. |

No accent color here either.

## Layout

- Max width 76rem, side gutter 28px (16px on phones). Left-aligned throughout.
- Header: section links show inline above 1120px. Below that, a Menu button opens them in a ruled panel under the header (same raised-block style as the buttons); Escape or choosing a link closes it.
- Script setup lives in one `pentaliminalBoot()` function that can safely run again: it clears what it drew before, and older animation loops stop themselves. It is registered with the artifact viewer's hot-update hook so drawings and controls come back after a live update.
- The hero follows the spec sheet: wordmark, tagline, meta lines and a rule on the left; the construction drawing on the right.
- Rows divided by hairlines for lists. One ruled grid of three for the planes; a ruled 3×3 grid for the principles.
- Corners are square. No shadows, no rounded cards.

## Motion

Rules (from the vendored `emil-design-eng` and `fixing-motion-performance` skills): animate only transform, opacity and stroke offsets; ease-out (`cubic-bezier(.23,1,.32,1)`) for things responding to the person, under 300ms; no scroll-event-driven animation; every animation loop stops when its canvas is off screen; `prefers-reduced-motion` turns everything off.

**Ambient** (only three things): the turning dodecahedron and its orbiting rings, and the page mesh (redrawn at about 30fps, paused while the tab is hidden). The dodecahedron and the threshold monogram stop their loops entirely when scrolled out of view.

**On load**: the hero wordmark is drawn on left to right (clip-path wipe), then the tagline and the rest of the hero rise in, followed by the hero drawing's grid, dimensions and solid.

**On scroll** (each plays once, via one IntersectionObserver; only content below the first screen is prepared, so the page is complete at rest): content blocks rise 40px and fade in over about 1.1s as they enter the bottom 10% of the viewport. Section callouts spin in (circle from 35% scale and -140°) with the leader line drawing after. Rows of items stagger: framework steps and infrastructure cards 0.11s apart, principles 0.1s per column. The Problem wisdom arrow draws across after the boxes arrive (1.1s), then the "Pentaliminal approach" box lifts.

**Always-on scroll feedback**: the header is sticky; once the page moves, the logo eases to 84% size. A 2px ink rule under the header fills left to right as you read (CSS scroll-timeline; browsers without it simply don't show it). The nav link and the tracker diamond for the current section are marked.

**Hover and press**:
- Buttons and the theme toggle lift up and to the left with a hard 3px ink offset, like an extruded block, and press back in on click (scale .98).
- Nav links draw an underline in from the left.
- Criteria and charter rows: a short ink tick draws along the top rule and the label nudges right. Atlas table rows shade with `--paper-2`.
- Principles: a registration `+` rotates into the top-left corner.
- Footer links nudge right. Tracker diamonds grow.
- Hero: a dashed drafting crosshair follows the pointer across the drawing; the grid drifts and the solid turns slightly.

**Theme switch**: the new theme opens out in a circle from the toggle button (View Transitions API; instant where unsupported).
## Don'ts

- Accent colors. The spec is ink on paper.
- Typesetting the wordmark in a font instead of using the SVG.
- Made-up spec data (version numbers, fake measurements). Construction labels should be true to the geometry.
- Rounded cards, drop shadows, gradients.
- Claims the manifesto doesn't make.

## V3: the products (branch `v3`)

V3 adds the products to the home page, right after the hero, so a visitor sees what Pentaliminal makes before reading why. Inspired by how momentic.ai shows its product: real-looking screens, a carousel of feature drawings, example cases and a swirl of sources. Everything stays in the V2 language (ink on paper, square corners, no accent color).

Files: `src/products.html` (markup, built into the home page at `{{PRODUCTS}}`), `src/products.css`, `src/products.js` (loaded before `main.js`, which calls it from `boot()` with its shared helpers). Status chips and Now / Next / Later come from `src/roadmap.json`, so the product chapters and the roadmap never disagree.

Page order: hero, P What can you use? (index of the four), T Trust, N Notebook, R Rhetor, F Forum, M How do they fit together? (the shared memory), then the manifesto sections 01 to 10 as before. The header nav leads with Products; the section tracker gains a "Use" group.

Each product chapter follows the same order, which is also how the copy is written (dream, then confidence, then time and effort):

| Part | What it is |
|---|---|
| Callout and status | Circled initial (T, N, R, F), full product name, stage chip and horizon from `roadmap.json`. |
| Outcome headline | What the visitor gets, in their words. Not a feature list. |
| Concept window | A drawn product screen with a made-up example. It plays one step at a time, once, when it comes into view (about 1.1 s a step), and "Play it again" restarts it. At rest, with reduced motion or with motion paused, it shows the finished state. Steps use `data-at` / `data-until` / `data-press` attributes; no step logic lives in CSS beyond `.is-off` and `.st-N`. |
| Feature rail | A carousel of cards, three across on desktop, each with an isometric drawing built from plates, nodes and flat icons (drawn by `art` in `products.js`, auto-fitted to the card). Hovering a card lifts the drawing's key part. Numbers appear only where the content is a sequence (Rhetor: study, imitate, compare, drill). |
| Example cases | Trust only: "What Trust is built to catch", clearly labeled as made-up examples. The honest version of a "bugs caught" wall. |
| Value lines | What you get / How you can check it / What it asks of you / How we'll know it works. The last one is the roadmap gate and first version: proof we hold ourselves to instead of invented metrics. |

Claim status marks are shared across products and the memory section: known (solid square), inferred (half), assumed (dashed), disputed (crosshatch), unknown (hollow circle). Always shown with a word, never alone.

The shared memory (section M) is a vortex: sources (notes, papers, agent runs, debates...) and the four product names spiral slowly into a pentagonal core, over dashed orbit rings and a center line. Depth is shown the way a drawing shows hidden lines, not with blur: items on the far side turn dashed and lighter. Four cards (Question, Claim, Trace, Review) sit over the field on desktop and below it on phones. One loop, about 30 fps, only while on screen and not paused.

Honesty rules for V3: none of the products is available yet, and the intro says so. Names, companies and numbers in the windows are made up and the windows are tagged "Concept". No testimonials, customer logos or usage stats until they are real.
