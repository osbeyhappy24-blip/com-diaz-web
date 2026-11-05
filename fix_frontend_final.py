import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

# 1. Forzar la función global pedirPlan
js_pedirPlan = """
<script id="ptl-pedir-plan-global">
window.pedirPlan = function(plan) {
    const modal = document.getElementById('ptlModalPago');
    if (modal) {
        document.getElementById('ptlPlanNombre').innerText = plan === 'Pro' ? 'Pro ($5 USD/mes)' : 'Premium ($15 USD/mes)';
        modal.style.display = 'flex';
        const waBtn = document.getElementById('ptlBtnWA');
        if (waBtn) waBtn.href = `https://wa.me/5358980267?text=Hola,%20quiero%20actualizar%20mi%20plan%20a%20${plan}%20en%20ProfitToLife`;
    } else {
        alert('Error: Modal no encontrado. Recarga la página.');
    }
};
</script>
"""

# 2. Mejorar la función eliminar para que muestre el error real
js_eliminar = """
async function eliminar(id) {
  if (!confirm('¿Eliminar este producto? No aparecerá más en la tienda.')) return;
  try {
    const r = await fetch(API + '/api/seller/products/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + TOKEN }
    });
    let d;
    try {
        d = await r.json();
    } catch(e) {
        throw new Error('Error del servidor. Código: ' + r.status + '. Contacta al admin.');
    }
    if (d.ok) {
      toast('✅ Producto eliminado', 'ok');
      cargarPerfil();
    } else {
      toast('Error: ' + (d.error || d.message || 'Desconocido'), 'err');
    }
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()

        # Inyectar pedirPlan global al final del body
        if 'ptl-pedir-plan-global' not in html:
            html = html.replace('</body>', js_pedirPlan + '\n</body>')
            print(f"✅ pedirPlan global inyectado en {archivo}")

        # Reemplazar la función eliminar
        pattern = re.compile(r'async function eliminar\(id\) \{.*?(?=\n(?:async )?function |\n//)', re.DOTALL)
        html = pattern.sub(js_eliminar, html)
        print(f"✅ Función eliminar mejorada en {archivo}")

        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)

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
