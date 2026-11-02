#!/usr/bin/env python3
"""Build the Pentaliminal site from src/.

Outputs
  docs/                     the production site (GitHub Pages serves this folder)
    index.html, 404.html, assets/{styles.css, main.js, favicon.svg, ...}, CNAME, robots.txt, sitemap.xml, .nojekyll
  dist-artifact/page.html   a single self-contained file for the claude.ai preview

Usage: python3 tools/build.py
"""
import json
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
FORM_ID = "783e6483245d4136aafd0ce7d705c0b8"
FALLBACK_MAIL = "783e6483245d4136aafd0ce7d705c0b8"
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


def brand_body():
    """The page body with the traced monogram and wordmark paths filled in."""
    mono = json.loads(read("monogram.json"))
    wm = json.loads(read("wordmark.json"))
    x0, y0, x1, y1 = wm["bbox"]
    body = read("body.html")
    for key, val in {
        "{{MONO_BODY}}": mono["body"], "{{MONO_SHADE}}": mono["shade"], "{{MONO_INK}}": mono["ink"],
        "{{WM_VB}}": f"{x0 - 2} {y0 - 2} {x1 - x0 + 4} {y1 - y0 + 4}", "{{WM_WH}}": f"{x1 - x0 + 4} {y1 - y0 + 4}",
        "{{WM_D}}": wm["d"], "{{FORM_ID}}": FORM_ID, "{{FALLBACK_MAIL}}": FALLBACK_MAIL,
    }.items():
        body = body.replace(key, val)
    assert "{{" not in body, "unfilled placeholder in body.html"
    return body, mono, wm


# Applies saved choices before first paint: a returning dark-mode visitor never sees a light flash,
# and a visitor who paused motion never sees it start.
THEME_BOOT = ('<script>try{var r=document.documentElement,t=localStorage.getItem("pentaliminal-theme");'
              'if(t==="dark"||t==="light")r.setAttribute("data-theme",t);'
              'if(localStorage.getItem("pentaliminal-motion")==="paused")r.classList.add("motion-paused")}catch(e){}</script>')


def site_head():
    org = {"@context": "https://schema.org", "@type": "Organization", "name": "Pentaliminal", "url": SITE_URL,
           "logo": SITE_URL + "assets/monogram.svg", "slogan": "Beyond intelligence. Toward wisdom.",
           "description": DESCRIPTION}
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{TITLE}</title>
<meta name="description" content="{DESCRIPTION}">
<link rel="canonical" href="{SITE_URL}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f4f1eb" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#131312" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pentaliminal">
<meta property="og:url" content="{SITE_URL}">
<meta property="og:title" content="Pentaliminal">
<meta property="og:description" content="Beyond intelligence. Toward wisdom. Infrastructure for wise intelligence.">
<meta property="og:image" content="{SITE_URL}assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="The Pentaliminal monogram and wordmark: Beyond intelligence. Toward wisdom.">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="preload" href="assets/fonts/archivo-latin-wdth-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/styles.css">
{THEME_BOOT}
<script src="assets/main.js" defer></script>
<script type="application/ld+json">{json.dumps(org)}</script>
</head>
<body>
"""


def build_site(body):
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "assets").mkdir(parents=True)
    (DIST / "index.html").write_text(site_head() + body + "</body>\n</html>\n", encoding="utf-8")
    (DIST / "assets" / "styles.css").write_text(font_faces() + read("styles.css"), encoding="utf-8")
    (DIST / "assets" / "main.js").write_text(read("main.js"), encoding="utf-8")
    for f in (SRC / "static").rglob("*"):
        if f.is_file():
            out = DIST / f.relative_to(SRC / "static")
            out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(f, out)


def build_artifact(body):
    """One file for the claude.ai preview: its wrapper adds the doctype, head and body tags."""
    ART.mkdir(exist_ok=True)
    head = (f'<title>Pentaliminal V2</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
            f'<meta name="description" content="{DESCRIPTION}">\n'
            f'<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            f'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            f'<link rel="stylesheet" href="{GOOGLE_FONTS}">\n')
    page = head + "<style>\n" + read("styles.css") + "</style>\n" + THEME_BOOT + "\n" + body + "<script>\n" + read("main.js") + "</script>\n"
    (ART / "page.html").write_text(page, encoding="utf-8")


if __name__ == "__main__":
    body, _, _ = brand_body()
    build_site(body)
    build_artifact(body)
    print("built", DIST, ART / "page.html")
