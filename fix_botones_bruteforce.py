import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

js_forzado = """
<script id="ptl-botones-bruteforce">
document.addEventListener('DOMContentLoaded', () => {
    // Revisar cada segundo si los botones ya cargaron
    setInterval(() => {
        const btns = document.querySelectorAll('button');
        btns.forEach(b => {
            if (b.textContent.includes('Actualizar a Pro') && !b.dataset.fixed) {
                b.dataset.fixed = 'true';
                b.onclick = (e) => { e.preventDefault(); window.abrirModalPago('Pro ($5 USD/mes)'); };
            }
            if (b.textContent.includes('Actualizar a Premium') && !b.dataset.fixed) {
                b.dataset.fixed = 'true';
                b.onclick = (e) => { e.preventDefault(); window.abrirModalPago('Premium ($15 USD/mes)'); };
            }
        });
    }, 1000);
});
</script>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()
        
        if 'ptl-botones-bruteforce' not in html:
            html = html.replace('</body>', js_forzado + '\n</body>')
            with open(archivo, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"✅ Botones forzados en {archivo}")

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
if not err: print('✅ Sintaxis Frontend Perfecta')
