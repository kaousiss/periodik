#!/usr/bin/env python3
"""Génère toutes les icônes de Periodik (PWA, Android, iOS, Windows, Linux) à partir d'un seul dessin.
Usage : python3 tools/make-icons.py      (nécessite : pip install playwright && playwright install chromium)"""
import os
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
INK, TILE, FLAME = '#0F0E24', '#1B1840', '#FFB020'
FONT = "'Bricolage Grotesque','DejaVu Sans',Arial,sans-serif"


def tile(scale=1.0):
    """La case d'élément « Pk 119 », centrée dans un repère 512×512."""
    return f'''<g transform="translate(256 256) scale({scale}) translate(-256 -256)">
  <rect x="104" y="104" width="304" height="304" rx="38" fill="{TILE}" stroke="{FLAME}" stroke-width="14"/>
  <text x="140" y="166" font-family="{FONT}" font-size="40" font-weight="700" fill="{FLAME}">119</text>
  <text x="256" y="346" text-anchor="middle" font-family="{FONT}" font-size="186" font-weight="800" letter-spacing="-6" fill="{FLAME}">Pk</text>
</g>'''


def grid():
    lines = ''.join(f'<path d="M{i} 0V512M0 {i}H512" stroke="#fff" stroke-opacity=".035" stroke-width="2"/>' for i in range(32, 512, 64))
    return lines


def svg(size, rounded=True, scale=1.0, canvas=512, bg=True):
    r = 112 if rounded else 0
    back = f'<rect width="512" height="512" rx="{r}" fill="{INK}"/>{grid()}' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 512 512">{back}{tile(scale)}</svg>')


OUT = [
    # (fichier, taille, arrondi, échelle de la case)
    ('www/icons/icon-180.png', 180, False, 1.0),          # iOS : carré plein, iOS arrondit lui-même
    ('www/icons/icon-192.png', 192, True, 1.0),
    ('www/icons/icon-512.png', 512, True, 1.0),
    ('www/icons/icon-maskable-512.png', 512, False, 0.74),  # zone de sécurité Android
    ('resources/icon.png', 1024, False, 1.0),             # source pour Capacitor Assets, Electron, Windows, Linux
]

os.makedirs(os.path.join(ROOT, 'www/icons'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'resources'), exist_ok=True)

with open(os.path.join(ROOT, 'www/icon.svg'), 'w', encoding='utf-8') as f:
    f.write(svg(512))

with sync_playwright() as p:
    b = p.chromium.launch()
    for path, size, rounded, scale in OUT:
        pg = b.new_page(viewport={'width': size, 'height': size})
        pg.set_content(f'<html><body style="margin:0;background:transparent">{svg(size, rounded, scale)}</body></html>')
        pg.screenshot(path=os.path.join(ROOT, path), omit_background=True)
        pg.close()
    # écran de lancement : grand fond uni avec la case au centre
    S = 2732
    pg = b.new_page(viewport={'width': S, 'height': S})
    pg.set_content(f'''<html><body style="margin:0;background:{INK}"><svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}">
      <rect width="{S}" height="{S}" fill="{INK}"/><g transform="translate({S/2} {S/2}) scale(1.7) translate(-256 -256)">{tile(1.0)}</g></svg></body></html>''')
    pg.screenshot(path=os.path.join(ROOT, 'resources/splash.png'))
    b.close()
print('icônes générées')
