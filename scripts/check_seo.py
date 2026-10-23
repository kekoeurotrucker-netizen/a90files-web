#!/usr/bin/env python3
"""Validate the published SEO discovery files without network access."""
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree
import re

root = Path(__file__).resolve().parents[1] / "public"
site = "https://a90files-web.a90files.workers.dev"
robots = (root / "robots.txt").read_text(encoding="utf-8")
assert f"Sitemap: {site}/sitemap.xml" in robots
assert "Disallow: /api/" in robots and "Disallow: /admin/" in robots

document = ElementTree.parse(root / "sitemap.xml")
namespace = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
urls = [el.text for el in document.iter(namespace + "loc")]
assert 30 <= len(urls) <= 100, f"Unexpected page count: {len(urls)}"
assert len(urls) == len(set(urls)), "Duplicate sitemap URLs"
for url in urls:
    parsed = urlparse(url)
    assert url.startswith(site + "/") and not parsed.query and not parsed.fragment, url
    assert not parsed.path.startswith(("/admin/", "/api/")), url
    assert (root / parsed.path.lstrip("/") / "index.html").is_file(), url

for pathname in ("/", "/software/", "/juegos/", "/novedades/", "/software/vaultpool/"):
    content = (root / pathname.lstrip("/") / "index.html").read_text(encoding="utf-8")
    expected = f'<link rel="canonical" href="{site}{pathname}">'
    assert expected in content, pathname
    assert re.search(r'<title>[^<]{10,}</title>', content), pathname
    assert re.search(r'<meta name="description" content="[^"]{50,}">', content), pathname

print(f"PASS: {len(urls)} public SEO URLs, crawler policy, metadata, and canonical tags")
