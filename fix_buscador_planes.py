import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

for archivo in archivos:
    if not os.path.exists(archivo): continue
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()

    # ─── 1. INYECTAR BUSCADOR (buscando solo por id="productsList") ───
    if 'id="ptlSearchBar"' not in html:
        # Buscar la etiqueta div con id="productsList" sin importar la clase
        pattern = r'(<div[^>]*id="productsList"[^>]*>)'
        match = re.search(pattern, html)
        if match:
            buscador = '<input type="text" id="ptlSearchBar" placeholder="🔍 Buscar producto publicado..." oninput="renderProductos()" style="width:100%; padding:12px 15px; margin:10px 0; border-radius:8px; border:1px solid #1F2A44; background:#131A2E; color:#F1F5F9; font-size:14px; box-sizing:border-box;">\n'
            html = html[:match.start()] + buscador + html[match.start():]
            print(f"✅ Buscador inyectado en {archivo}")
        else:
            print(f"⚠️ No se encontró id='productsList' en {archivo}")

    # ─── 2. ARREGLAR BOTONES DE PLAN (agregar event listener global) ───
    # Insertar al final del body un script que busque los botones por texto y les asigne el modal
    fix_planes_js = """
<script id="ptl-fix-planes">
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const botones = Array.from(document.querySelectorAll('button, a, div'));
        botones.forEach(b => {
            const txt = (b.textContent || '').trim();
            if (txt === 'Actualizar a Pro' || txt.includes('Actualizar a Pro')) {
                b.onclick = null; // Limpiar eventos viejos
                b.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (typeof abrirModalPago === 'function') abrirModalPago('Pro ($5 USD/mes)');
                    else alert('Error: abrirModalPago no definido');
                });
            }
            if (txt === 'Actualizar a Premium' || txt.includes('Actualizar a Premium')) {
                b.onclick = null;
                b.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (typeof abrirModalPago === 'function') abrirModalPago('Premium ($15 USD/mes)');
                    else alert('Error: abrirModalPago no definido');
                });
            }
        });
    }, 1000); // Esperar 1s para que el JS original cargue los planes
});
</script>
"""
    if 'ptl-fix-planes' not in html:
        html = html.replace('</body>', fix_planes_js + '\n</body>')
        print(f"✅ Fix planes inyectado en {archivo}")

    with open(archivo, 'w', encoding='utf-8') as f:
        f.write(html)

# ─── 3. VALIDAR SINTAXIS ANTES DEL PUSH ───
print("\n═══ Validando sintaxis JS ═══")
for archivo in archivos:
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()
    scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', html)
    os.makedirs(os.path.expanduser('~/.check_js'), exist_ok=True)
    err = False
    for i, js in enumerate(scripts):
        if js.strip():
            with open(os.path.expanduser(f'~/.check_js/s{i}.js'), 'w') as out:
                out.write(js)
            res = subprocess.run(['node', '--check', os.path.expanduser(f'~/.check_js/s{i}.js')], capture_output=True, text=True)
            if res.returncode != 0:
                print(f'❌ Error en {archivo} script {i}: {res.stderr}')
                err = True
    if not err:
        print(f'✅ {archivo}: Sintaxis perfecta')
