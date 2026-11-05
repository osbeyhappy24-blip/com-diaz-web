import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

kill_js = """
<script id="ptl-kill-sw">
// Desactivar Service Worker para evitar caché viejo
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
            console.log('Service Worker desregistrado');
        }
    });
}
</script>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()
        if 'ptl-kill-sw' not in html:
            html = html.replace('</body>', kill_js + '\n</body>')
            with open(archivo, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"✅ Service Worker desactivado en {archivo}")
