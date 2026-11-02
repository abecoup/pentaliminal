#!/usr/bin/env python3
"""Build the Pentaliminal site from src/.

Outputs
  docs/                     the production site (GitHub Pages serves this folder)
    index.html, 404.html, assets/{styles.css, main.js, favicon.svg, ...}, CNAME, robots.txt, sitemap.xml, .nojekyll
  dist-artifact/page.html   a single self-contained file for the claude.ai preview

Usage: python3 tools/build.py
"""
import json
import re
import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, DIST, ART = ROOT / "src", ROOT / "docs", ROOT / "dist-artifact"

SITE_URL = "https://pentaliminal.ai/"
# "Your question" messages are delivered through formsubmit.co.
# FORM_ID: the inbox address, or (better) the random alias FormSubmit issues after the one-time confirmation,
#          which keeps the real address out of the page.
# FALLBACK_MAIL: an address shown as an email link if sending ever fails; leave empty to keep every address
#          out of the page (people are then asked to try again).
# How each half of the hero tagline arrives. Either half can be "decode" (resolves out of drafting marks,
# letter by letter), "label" (an ink tag wipes in behind it) or "none".
TAGLINE_A_FX = "decode"   # "Beyond intelligence."
TAGLINE_B_FX = "label"    # "Toward wisdom."
FORM_ID = "783e6483245d4136aafd0ce7d705c0b8"
FALLBACK_MAIL = ""
TITLE = "Pentaliminal: Infrastructure for wise intelligence"
DESCRIPTION = ("Pentaliminal advances the science and engineering of wise intelligence: infrastructure that helps AI "
               "understand context, recognize uncertainty, consider what matters, and act responsibly.")
GOOGLE_FONTS = ("https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,300..800;"
         "1,62..125,300..800&display=swap")

# The site serves its own copy of Archivo (SIL Open Font License, see assets/fonts/OFL.txt):
# no third-party request, no layout shift from a late swap. Latin covers the page; latin-ext loads only if needed.
LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,"
         "U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")
LATIN_EXT = ("U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,"
             "U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF")


def font_faces():
    out = ["/* Archivo, self-hosted (SIL OFL 1.1) */"]
    for subset, rng in (("latin", LATIN), ("latin-ext", LATIN_EXT)):
        for style in ("normal", "italic"):
            out.append(f'@font-face {{ font-family: "Archivo"; font-style: {style}; font-weight: 100 900; '
                       f'font-stretch: 62% 125%; font-display: swap; '
                       f'src: url(fonts/archivo-{subset}-wdth-{style}.woff2) format("woff2"); unicode-range: {rng}; }}')
    return "\n".join(out) + "\n\n"


def read(name):
    return (SRC / name).read_text(encoding="utf-8")


def brand_values():
    mono = json.loads(read("monogram.json"))
    wm = json.loads(read("wordmark.json"))
    x0, y0, x1, y1 = wm["bbox"]
    return {
        "{{MONO_BODY}}": mono["body"], "{{MONO_SHADE}}": mono["shade"], "{{MONO_INK}}": mono["ink"],
        "{{WM_VB}}": f"{x0 - 2} {y0 - 2} {x1 - x0 + 4} {y1 - y0 + 4}", "{{WM_WH}}": f"{x1 - x0 + 4} {y1 - y0 + 4}",
        "{{WM_D}}": wm["d"],
    }


def fill(text, values):
    # partials first, since they carry placeholders of their own
    for key in ("{{DEFS}}", "{{FOOTER}}"):
        if key in values:
            text = text.replace(key, values[key])
    for key, val in values.items():
        text = text.replace(key, val)
    left = re.findall(r"{{[A-Z_:a-z]+}}", text)
    assert not left, f"unfilled placeholders: {sorted(set(left))}"
    return text


def page_values(home, roadmap):
    """Placeholders shared by every page. `home` and `roadmap` are links relative to the page."""
    values = brand_values()
    values.update({"{{DEFS}}": read("partials/defs.html"), "{{FOOTER}}": read("partials/footer.html"),
                   "{{HOME}}": home, "{{ROADMAP}}": roadmap})
    return values


def brand_body():
    """The home page body with the traced monogram and wordmark paths filled in."""
    values = page_values("", "roadmap/")
    values.update({"{{FORM_ID}}": FORM_ID, "{{TAGLINE_A_FX}}": TAGLINE_A_FX, "{{TAGLINE_B_FX}}": TAGLINE_B_FX,
                   "{{FALLBACK_MAIL}}": FALLBACK_MAIL, "{{ROADMAP_STRIP}}": roadmap_strip(load_roadmap(), "roadmap/")})
    return fill(read("body.html"), values)


# ---------- the roadmap page ----------
# Status lives in src/roadmap.json; copy and the Trust figure live in src/roadmap.html.

def load_roadmap():
    data = json.loads(read("roadmap.json"))
    stages = [s["key"] for s in data["stages"]]
    horizons = [h["key"] for h in data["horizons"]]
    for pr in data["products"]:
        assert pr["stage"] in stages, f'{pr["id"]}: unknown stage "{pr["stage"]}" (use one of {stages})'
        assert pr["horizon"] in horizons, f'{pr["id"]}: unknown horizon "{pr["horizon"]}" (use one of {horizons})'
    return data


def stage_of(data, key):
    i = [s["key"] for s in data["stages"]].index(key)
    return i, data["stages"][i]


def in_horizon(data, key):
    return [pr for pr in data["products"] if pr["horizon"] == key]


def track(data, key, small=False):
    """The five-stage progress track: stages done are solid, the current one is shaded, the rest are dashed."""
    at, stage = stage_of(data, key)
    items = []
    for i, s in enumerate(data["stages"]):
        state = "done" if i < at else "now" if i == at else "ahead"
        label = "" if small else f'<span class="cap">{s["name"]}</span>'
        items.append(f'<li class="{state}"><i></i>{label}</li>')
    cls = "track sm" if small else "track"
    return (f'<div class="{cls}" role="img" aria-label="Progress: stage {at + 1} of {len(data["stages"])}, {stage["name"].lower()}">'
            f'<ol aria-hidden="true">{"".join(items)}</ol></div>')


def chip(data, pr):
    _, s = stage_of(data, pr["stage"])
    return f'<p class="chip cap"><span class="dm" aria-hidden="true"></span>{s["status"]}</p>'


def horizon_cols(data):
    """The overview: one ruled column each for now, next and later."""
    out = []
    for h in data["horizons"]:
        items = []
        for pr in in_horizon(data, h["key"]):
            tr = track(data, pr["stage"], small=True) if h["key"] != "later" else ""
            items.append(f'<li><b>{pr["name"]}</b>{tr}{chip(data, pr)}</li>')
        now = " now" if h["key"] == "now" else ""
        out.append(f'        <li class="hz{now}"><a href="#{h["key"]}"><span class="hz-k cap">{h["name"]}</span>'
                   f'<span class="hz-s">{h["says"]}</span><ul>{"".join(items)}</ul></a></li>')
    return "\n".join(out)


def later_list(data):
    return "\n".join(f'        <li><b>{pr["name"]}</b><span>{pr["line"]}</span>{chip(data, pr)}</li>'
                     for pr in in_horizon(data, "later"))


def legend(data):
    return "\n".join(f'          <li><span class="cap">{s["name"]}</span><span>{s["means"]}</span></li>' for s in data["stages"])


def roadmap_strip(data, link):
    """The compact roadmap row on the home page (section 07): now, next, later."""
    cols = []
    for h in data["horizons"]:
        prs = in_horizon(data, h["key"])
        names = [pr["name"] if i == 0 else pr["name"][0].lower() + pr["name"][1:] if pr["name"].startswith("An ") else pr["name"]
                 for i, pr in enumerate(prs)]
        names = names[0] if len(names) == 1 else ", ".join(names[:-1]) + " and " + names[-1]
        if h["key"] == "later":
            st = ""
        else:
            _, s = stage_of(data, prs[0]["stage"])
            st = f'<span class="st cap"><span class="dm" aria-hidden="true"></span>{s["status"]}</span>'
        now = ' class="now"' if h["key"] == "now" else ""
        cols.append(f'<li{now}><span class="ph-no cap">{h["name"]}</span><b>{names}</b>{st}</li>')
    return (f'<div class="rm-strip"><div class="rs-head"><p class="cap">Roadmap</p>'
            f'<h3>What we’re building.</h3></div><ol>{"".join(cols)}</ol>'
            f'<a class="btn ghost" href="{link}">See the roadmap</a></div>')


def roadmap_body():
    data = load_roadmap()
    values = page_values("../", "./")
    values.update({"{{UPDATED}}": data["updated"], "{{HORIZONS}}": horizon_cols(data), "{{LEGEND}}": legend(data),
                   "{{LATER}}": later_list(data)})
    for pr in data["products"]:
        values["{{TRACK:" + pr["id"] + "}}"] = track(data, pr["stage"])
        values["{{STATUS:" + pr["id"] + "}}"] = chip(data, pr)
        values["{{LINE:" + pr["id"] + "}}"] = pr["line"]
    return fill(read("roadmap.html"), values)


# Applies saved choices before first paint: a returning dark-mode visitor never sees a light flash,
# and a visitor who paused motion never sees it start.
THEME_BOOT = ('<script>try{var r=document.documentElement,t=localStorage.getItem("pentaliminal-theme");'
              'if(t==="dark"||t==="light")r.setAttribute("data-theme",t);'
              'if(localStorage.getItem("pentaliminal-motion")==="paused")r.classList.add("motion-paused")}catch(e){}</script>')


def site_head(title=TITLE, description=DESCRIPTION, url=SITE_URL, base=""):
    org = {"@context": "https://schema.org", "@type": "Organization", "name": "Pentaliminal", "url": SITE_URL,
           "logo": SITE_URL + "assets/monogram.svg", "slogan": "Beyond intelligence. Toward wisdom.",
           "description": DESCRIPTION}
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{url}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f4f1eb" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#131312" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pentaliminal">
<meta property="og:url" content="{url}">
<meta property="og:title" content="Pentaliminal">
<meta property="og:description" content="Beyond intelligence. Toward wisdom. Infrastructure for wise intelligence.">
<meta property="og:image" content="{SITE_URL}assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="The Pentaliminal monogram and wordmark: Beyond intelligence. Toward wisdom.">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{base}assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="{base}assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="{base}assets/apple-touch-icon.png">
<link rel="preload" href="{base}assets/fonts/archivo-latin-wdth-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{base}assets/styles.css">
{THEME_BOOT}
<script src="{base}assets/main.js" defer></script>
<script type="application/ld+json">{json.dumps(org)}</script>
</head>
<body>
"""


ROADMAP_TITLE = "Roadmap: Pentaliminal"
ROADMAP_DESCRIPTION = "What Pentaliminal is building now, what comes next, and where each product stands."


def build_site(home, roadmap):
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "assets").mkdir(parents=True)
    (DIST / "roadmap").mkdir()
    (DIST / "index.html").write_text(site_head() + home + "</body>\n</html>\n", encoding="utf-8")
    (DIST / "roadmap" / "index.html").write_text(
        site_head(ROADMAP_TITLE, ROADMAP_DESCRIPTION, SITE_URL + "roadmap/", "../") + roadmap + "</body>\n</html>\n",
        encoding="utf-8")
    (DIST / "assets" / "styles.css").write_text(font_faces() + read("styles.css"), encoding="utf-8")
    (DIST / "assets" / "main.js").write_text(read("main.js"), encoding="utf-8")
    for f in (SRC / "static").rglob("*"):
        if f.is_file():
            out = DIST / f.relative_to(SRC / "static")
            out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(f, out)


def build_artifact(body, name="page.html", title="Pentaliminal V2"):
    """One file for the claude.ai preview: its wrapper adds the doctype, head and body tags."""
    ART.mkdir(exist_ok=True)
    head = (f'<title>{title}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
            f'<meta name="description" content="{DESCRIPTION}">\n'
            f'<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            f'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            f'<link rel="stylesheet" href="{GOOGLE_FONTS}">\n')
    page = head + "<style>\n" + read("styles.css") + "</style>\n" + THEME_BOOT + "\n" + body + "<script>\n" + read("main.js") + "</script>\n"
    (ART / name).write_text(page, encoding="utf-8")


if __name__ == "__main__":
    home, roadmap = brand_body(), roadmap_body()
    build_site(home, roadmap)
    build_artifact(home)
    build_artifact(roadmap, "roadmap.html", "Pentaliminal Roadmap")
    print("built", DIST, ART)
