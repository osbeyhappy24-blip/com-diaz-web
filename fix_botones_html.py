import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

modal_html = """
<div id="ptlModalPago" class="ptl-modal-overlay">
  <div class="ptl-modal-box">
    <h3 style="margin-top:0; font-size: 20px;">Actualizar Plan</h3>
    <p style="color:#94A3B8; font-size:14px;">Estás a punto de actualizar a <b id="ptlPlanNombre" style="color:#22C55E;"></b></p>
    
    <button class="ptl-btn-pago ptl-btn-transfer" onclick="alert('⚠️ IMPORTANTE: Debes estar autenticado en la app de Transfermóvil antes de realizar la transferencia.')">
      💳 Pagar por Transfermóvil
    </button>
    
    <div class="ptl-cuenta-box">
      <p style="margin:0; font-size:12px; color:#94A3B8;">Cuenta destino (Pago Seguro):</p>
      <p class="ptl-cuenta-numero">5358980267</p>
      <p style="margin:0; font-size:10px; color:#F59E0B;">Protegido contra copia</p>
    </div>

    <a href="#" id="ptlBtnWA" target="_blank" class="ptl-btn-pago ptl-btn-wa">
      💬 Contactar al Administrador
    </a>
    
    <button onclick="document.getElementById('ptlModalPago').style.display='none'" style="margin-top:15px; background:none; border:none; color:#94A3B8; text-decoration:underline; cursor:pointer;">
      Cancelar
    </button>
  </div>
</div>
"""

funcion_modal = """
<script>
function abrirModalPago(plan) {
    let modal = document.getElementById('ptlModalPago');
    // Si el modal no existe, lo creamos
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `""" + modal_html.replace('`', '\\`') + """`);
        modal = document.getElementById('ptlModalPago');
    }
    
    document.getElementById('ptlPlanNombre').innerText = plan;
    modal.style.display = 'flex';
    
    const waBtn = document.getElementById('ptlBtnWA');
    if (waBtn) waBtn.href = `https://wa.me/5358980267?text=Hola,%20quiero%20actualizar%20mi%20plan%20a%20${plan}%20en%20ProfitToLife`;
}
</script>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()

        # 1. Reemplazar los onclick de los botones
        html = html.replace('onclick="pedirPlan(\'Pro\')"', 'onclick="abrirModalPago(\'Pro ($5 USD/mes)\')"')
        html = html.replace('onclick="pedirPlan(\'Premium\')"', 'onclick="abrirModalPago(\'Premium ($15 USD/mes)\')"')

        # 2. Inyectar la función abrirModalPago al final del body
        if 'function abrirModalPago' not in html:
            html = html.replace('</body>', funcion_modal + '\n</body>')

        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ Botones HTML y función modal inyectados en {archivo}")

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
