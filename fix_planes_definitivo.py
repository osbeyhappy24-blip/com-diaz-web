import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

js_fix = """
<script id="ptl-planes-definitivo">
document.addEventListener('DOMContentLoaded', () => {
    // Observador que revisa cada segundo si los botones ya se dibujaron
    const observer = new MutationObserver(() => {
        const botones = Array.from(document.querySelectorAll('button, a, div'));
        botones.forEach(b => {
            const txt = (b.textContent || '').trim();
            
            if (txt === 'Actualizar a Pro' && !b.dataset.ptlFixed) {
                b.dataset.ptlFixed = 'true';
                b.onclick = null; // Limpiar onclick viejo
                b.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (typeof abrirModalPago === 'function') abrirModalPago('Pro ($5 USD/mes)');
                });
            }
            if (txt === 'Actualizar a Premium' && !b.dataset.ptlFixed) {
                b.dataset.ptlFixed = 'true';
                b.onclick = null;
                b.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (typeof abrirModalPago === 'function') abrirModalPago('Premium ($15 USD/mes)');
                });
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
});
</script>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()
        
        if 'ptl-planes-definitivo' not in html:
            html = html.replace('</body>', js_fix + '\n</body>')
            with open(archivo, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"✅ Planes fix inyectado en {archivo}")

# Validar sintaxis
print("Validando sintaxis...")
err = False
for archivo in archivos:
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()
    scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', html)
    os.makedirs(os.path.expanduser('~/.check_js'), exist_ok=True)
    for i, js in enumerate(scripts):
        if js.strip():
            with open(os.path.expanduser(f'~/.check_js/s{i}.js'), 'w') as out: out.write(js)
            res = subprocess.run(['node', '--check', os.path.expanduser(f'~/.check_js/s{i}.js')], capture_output=True, text=True)
            if res.returncode != 0:
                print(f'❌ Error en {archivo} script {i}: {res.stderr}'); err = True
if not err: print('✅ Sintaxis perfecta')
