import os
ROOT = os.environ.get('REHLATI_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
HTTP_ROOT = os.environ.get('REHLATI_HTTP', 'http://localhost:8765')
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
from playwright.sync_api import sync_playwright
import json, statistics
U = HTTP_ROOT + '/index.html?demo=1'
JS = """() => new Promise(res => { let lcp = 0, cls = 0;
 new PerformanceObserver(l => { for (const e of l.getEntries()) lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
 new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
 setTimeout(() => { const n = performance.getEntriesByType('navigation')[0]; res({ lcp, cls, dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, html: n.transferSize || n.encodedBodySize, heap: performance.memory ? performance.memory.usedJSHeapSize : 0 }); }, 2500); })"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    out = {}
    for name, vp, cpu in [('desktop', {'width': 1360, 'height': 900}, 1), ('mobile-4xCPU-slow4G', {'width': 390, 'height': 844}, 4)]:
        runs = []
        for i in range(3):
            ctx = b.new_context(viewport=vp); pg = ctx.new_page(); cdp = ctx.new_cdp_session(pg)
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': cpu})
            if cpu > 1: cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 150, 'downloadThroughput': 1.6e6 / 8, 'uploadThroughput': 750e3 / 8})
            pg.goto(U); runs.append(pg.evaluate(JS))
            # interaction latency: open trips list + filter
            t = pg.evaluate("""async () => { const t0 = performance.now(); location.hash = '#/trips'; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; }""")
            runs[-1]['route_ms'] = t; ctx.close()
        out[name] = {k: round(statistics.median([r[k] for r in runs]), 3) for k in runs[0]}
    print(json.dumps(out, indent=1))
    b.close()
