import sys, json, threading, http.server, socketserver, os, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'www')
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT))
PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{PORT}/index.html'

errors, fails = [], []
def check(name, cond, info=''):
    print(('  ok   ' if cond else '  FAIL ') + name + (' — ' + str(info) if (info and not cond) else ''))
    if not cond: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 800}, has_touch=True, permissions=['clipboard-read', 'clipboard-write'])
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errors.append('console.' + m.type + ': ' + m.text) if (m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'ERR_NAME_NOT_RESOLVED' not in m.text) else None)
    native = []
    pg.on('dialog', lambda d: (native.append(d.message), d.accept()))
    pg.goto(URL)
    pg.wait_for_selector('.menu')
    check('accueil affiché', pg.locator('.mtile').count() == 10, pg.locator('.mtile').count())

    # --- tous les écrans simples s'affichent
    for scr in ['learn', 'challenge', 'ranked', 'multi', 'daily', 'review', 'table', 'profile', 'creator', 'online', 'settings']:
        pg.evaluate(f"window.__periodik.go('{scr}')")
        pg.wait_for_timeout(80)
        n = pg.locator('#app .wrap').count()
        check('écran ' + scr, n == 1 and len(pg.inner_text('#app')) > 20, n)

    # --- tableau : 118 cases
    pg.evaluate("window.__periodik.go('table')")
    check('tableau : 118 cases', pg.locator('.pt .cell').count() == 118, pg.locator('.pt .cell').count())
    pg.locator('.pt .cell').nth(25).click()
    check('fiche élément', 'Fer' in pg.inner_text('#modal'), pg.inner_text('#modal')[:60])
    pg.locator('#modal .btn').click()

    # --- niveau 1 : leçon + quiz joué jusqu'au bout (toujours juste via la logique)
    pg.evaluate("window.__periodik.go('lesson', 0)")
    check('leçon : fiche courante', pg.locator('.ecard, .card .cell.xl').count() >= 1)
    pg.locator('text=Je suis prêt').click()
    pg.wait_for_selector('.qbox .big')
    answered = 0
    for _ in range(40):
        if pg.locator('.bigscore').count(): break
        pg.wait_for_selector('.ans .opt, .ans .pt, .bigscore', timeout=4000)
        if pg.locator('.bigscore').count(): break
        # stratégie : lire la question via le texte et répondre au hasard -> on ne triche pas, on vérifie juste le flux
        if pg.locator('.ans .opt').count():
            pg.locator('.ans .opt').first.click()
        elif pg.locator('.ans .pt').count():
            pg.locator('.ans .pt .cell').first.click()
        answered += 1
        pg.wait_for_timeout(1150)
    pg.wait_for_selector('.bigscore', timeout=8000)
    check('quiz niveau 1 terminé (' + str(answered) + ' réponses)', pg.locator('.bigscore').count() == 1)
    check('résultats avec stats', pg.locator('.stat').count() == 5, pg.locator('.stat').count())

    # --- défi chrono : lancement, réponses, fin
    pg.evaluate("window.__periodik.go('challenge')")
    pg.locator('.chip', has_text='1 min').first.click()
    pg.locator('text=Lancer le défi').click()
    pg.wait_for_selector('.cd', timeout=2000)
    pg.wait_for_selector('.qbox .big', timeout=6000)
    check('compte à rebours puis question', True)
    for _ in range(6):
        if pg.locator('.ans .opt').count(): pg.locator('.ans .opt').first.click()
        elif pg.locator('.ans .pt').count(): pg.locator('.ans .pt .cell').first.click()
        pg.wait_for_timeout(1150)
    t = pg.inner_text('.time')
    check('chrono qui décroît', t.startswith('0:') or t.startswith('1:'), t)


    # la partie chrono précédente est encore en cours : on la quitte via le dialogue
    pg.locator('.hud .back').click()
    pg.locator('.dlg .btn.primary').click()
    pg.wait_for_selector('.menu')

    # --- sortie en pleine partie : dialogue intégré (jamais confirm())
    pg.evaluate("window.__periodik.go('challenge')")
    pg.locator('.chip', has_text='1 min').first.click()
    pg.locator('text=Lancer le défi').click()
    pg.wait_for_selector('.qbox .big', timeout=6000)
    pg.locator('.hud .back').click()
    check('dialogue « Quitter la partie ? »', pg.locator('.dlg').count() == 1)
    pg.locator('.dlg .btn', has_text='Continuer').click()
    check('on reprend la partie', pg.locator('.dlg').count() == 0 and pg.locator('.qbox .big').count() == 1)
    pg.locator('.hud .back').click()
    pg.locator('.dlg .btn.primary').click()
    pg.wait_for_selector('.menu')
    check('quitter ramène au menu', pg.locator('.mtile').count() == 10)

    # --- skins : créer, copier le code, importer
    pg.evaluate("window.__periodik.go('creator')")
    pg.locator('.btn', has_text='Copier le code').click()
    pg.wait_for_timeout(200)
    code = pg.evaluate("navigator.clipboard.readText()")
    check('code de skin copié', len(code) > 20, code)
    pg.evaluate("window.__periodik.go('profile')")
    pg.locator('.btn', has_text='Importer un code').click()
    pg.locator('.dlg textarea').fill(code)
    pg.locator('.dlg .btn.primary').click()
    pg.wait_for_timeout(200)
    check('skin importé', pg.evaluate("window.__periodik.S.cs.length") == 1)
    pg.locator('.btn', has_text='Importer un code').click()
    pg.locator('.dlg textarea').fill('pas un code')
    pg.locator('.dlg .btn.primary').click()
    pg.wait_for_timeout(200)
    check('code invalide refusé', pg.evaluate("window.__periodik.S.cs.length") == 1)

    # --- réinitialisation
    pg.evaluate("window.__periodik.go('settings')")
    pg.locator('.btn', has_text='Réinitialiser').click()
    check('dialogue de réinitialisation', pg.locator('.dlg .btn.danger').count() == 1)
    pg.locator('.dlg .btn.danger').click()
    pg.wait_for_selector('.menu')
    check('progression effacée', pg.evaluate("window.__periodik.S.xp") == 0 and pg.evaluate("window.__periodik.S.cs.length") == 0)
    check('aucun dialogue natif du navigateur', not native, native)

    # --- multijoueur complet, horloge accélérée
    m = ctx.new_page()
    m.on('pageerror', lambda e: errors.append('pageerror(multi): ' + str(e)))
    m.clock.install()
    m.goto(URL)
    m.wait_for_selector('.menu')
    m.evaluate("window.__periodik.go('multi')")
    m.locator('input.txt').nth(0).fill('Awa')
    m.locator('input.txt').nth(1).fill('Moussa')
    m.locator('.btn', has_text='Commencer').click()
    for who in ['Awa', 'Moussa']:
        m.wait_for_selector('text=À ' + who)
        m.locator('.btn', has_text='Je suis prêt').click()
        m.clock.run_for(3600)
        m.wait_for_selector('.qbox .big')
        for _ in range(3):
            if m.locator('.ans .opt').count(): m.locator('.ans .opt').first.click()
            elif m.locator('.ans .pt').count(): m.locator('.ans .pt .cell').first.click()
            m.clock.run_for(1300)
        # on avance l'horloge seconde par seconde jusqu'à la fin de la manche
        for _ in range(80):
            if m.locator('.suspense').count() or m.locator('text=de jouer').count(): break
            m.clock.run_for(1000)
    m.wait_for_selector('.suspense .num')
    check('suspense de 10 s affiché', m.inner_text('.suspense .num').strip() == '10', m.inner_text('.suspense .num'))
    m.clock.run_for(5000)
    check('compte à rebours du suspense', int(m.inner_text('.suspense .num').strip()) <= 6)
    m.clock.run_for(7000)
    m.wait_for_selector('.podium')
    m.clock.run_for(4000)
    check('podium : 2 joueurs révélés', m.locator('.prow.show').count() == 2, m.locator('.prow.show').count())
    check('un gagnant désigné', m.locator('.prow.win').count() >= 1)
    m.close()

    b.close()

print('\nERREURS JS:', errors if errors else 'aucune')
print('ÉCHECS:', fails if fails else 'aucun')
sys.exit(1 if (errors or fails) else 0)
