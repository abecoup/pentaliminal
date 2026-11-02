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
TITLE = "Pentaliminal: Infrastructure for wise intelligence"
DESCRIPTION = ("Pentaliminal advances the science and engineering of wise intelligence: infrastructure that helps AI "
               "understand context, recognize uncertainty, consider what matters, and act responsibly.")
FONTS = ("https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,300..800;"
         "1,62..125,300..800&display=swap")


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
        "{{WM_D}}": wm["d"],
    }.items():
        body = body.replace(key, val)
    assert "{{" not in body, "unfilled placeholder in body.html"
    return body, mono, wm


# Applies a saved theme before first paint, so a returning dark-mode visitor never sees a light flash.
THEME_BOOT = ('<script>try{var t=localStorage.getItem("pentaliminal-theme");'
              'if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>')


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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
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
    (DIST / "assets" / "styles.css").write_text(read("styles.css"), encoding="utf-8")
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
            f'<link rel="stylesheet" href="{FONTS}">\n')
    page = head + "<style>\n" + read("styles.css") + "</style>\n" + THEME_BOOT + "\n" + body + "<script>\n" + read("main.js") + "</script>\n"
    (ART / "page.html").write_text(page, encoding="utf-8")


if __name__ == "__main__":
    body, _, _ = brand_body()
    build_site(body)
    build_artifact(body)
    print("built", DIST, ART / "page.html")
