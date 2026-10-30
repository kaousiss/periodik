#!/usr/bin/env python3
"""Prépare une version « page unique » de www/ pour un hébergeur qui ajoute lui-même <html>/<head>/<body>.
Usage : python3 tools/make-artifact.py SORTIE_DIR"""
import os, re, shutil, sys
out = sys.argv[1]
src = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'www')
os.makedirs(out, exist_ok=True)
html = open(os.path.join(src, 'index.html'), encoding='utf-8').read()
html = re.sub(r'<!doctype html>\s*', '', html, flags=re.I)
html = re.sub(r'</?(html|head|body)[^>]*>\s*', '', html)
html = re.sub(r'\s*<meta http-equiv="Content-Security-Policy"[^>]*>', '', html)
html = re.sub(r'\s*<link rel="(manifest|icon|apple-touch-icon)"[^>]*>', '', html)
html = re.sub(r'\s*<meta name="(apple-mobile-web-app|mobile-web-app)[^>]*>', '', html)
html = html.replace('<title>', '<meta name="claude:viewport-fit-sides" content="cover">\n  <title>', 1)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html.strip() + '\n')
for f in ('core.js', 'app.js', 'style.css'):
    shutil.copy(os.path.join(src, f), os.path.join(out, f))
print(html)
