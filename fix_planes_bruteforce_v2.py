import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

# 1. EL MODAL (Sin el !important que bloqueaba la apertura)
modal_html = """
<style id="ptl-modal-css">
  #ptlModalPago {
      display: none;
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(10, 14, 26, 0.85); z-index: 999999;
      justify-content: center; align-items: center; backdrop-filter: blur(4px);
  }
  #ptlModalPago.ptl-show {
      display: flex !important; /* Solo es flex cuando tiene la clase .ptl-show */
  }
  .ptl-modal-box {
      background: #131A2E; border: 1px solid #1F2A44; border-radius: 16px;
      padding: 24px; width: 90%; max-width: 400px; text-align: center; color: #F1F5F9;
  }
  .ptl-btn-pago {
      display: block; width: 100%; padding: 14px; margin: 10px 0;
      border-radius: 8px; font-weight: bold; font-size: 16px; border: none; cursor: pointer;
  }
  .ptl-btn-transfer { background: #0056b3; color: white; }
  .ptl-btn-wa { background: #22C55E; color: white; text-decoration: none; box-sizing: border-box; }
</style>

<div id="ptlModalPago">
  <div class="ptl-modal-box">
    <h3 style="margin-top:0; font-size: 20px;">Actualizar Plan</h3>
    <p style="color:#94A3B8; font-size:14px;">Estás a punto de actualizar a <b id="ptlPlanNombre" style="color:#22C55E;"></b></p>
    
    <button class="ptl-btn-pago ptl-btn-transfer" onclick="alert('⚠️ IMPORTANTE: Debes estar autenticado en la app de Transfermóvil antes de realizar la transferencia.')">
      💳 Pagar por Transfermóvil
    </button>
    
    <div style="background:#0A0E1A; padding:15px; border-radius:8px; margin:15px 0; border:1px dashed #FCD34D;">
      <p style="margin:0; font-size:12px; color:#94A3B8;">Cuenta destino (Pago Seguro):</p>
      <p style="font-size:22px; font-weight:bold; color:#FCD34D; letter-spacing:2px; user-select:none; -webkit-user-select:none; pointer-events:none; margin:5px 0;">5358980267</p>
      <p style="margin:0; font-size:10px; color:#F59E0B;">Protegido contra copia</p>
    </div>

    <a href="#" id="ptlBtnWA" target="_blank" class="ptl-btn-pago ptl-btn-wa">
      💬 Contactar al Administrador
    </a>
    
    <button onclick="document.getElementById('ptlModalPago').classList.remove('ptl-show')" style="margin-top:15px; background:none; border:none; color:#94A3B8; text-decoration:underline; cursor:pointer;">
      Cancelar
    </button>
  </div>
</div>

<script id="ptl-planes-event-delegation">
// Esta función abre el modal agregando la clase .ptl-show
window.abrirModalPago = function(plan) {
    const modal = document.getElementById('ptlModalPago');
    if (modal) {
        document.getElementById('ptlPlanNombre').innerText = plan;
        modal.classList.add('ptl-show'); // Esto quita el display:none y pone display:flex
        
        const waBtn = document.getElementById('ptlBtnWA');
        if (waBtn) waBtn.href = `https://wa.me/5358980267?text=Hola,%20quiero%20actualizar%20mi%20plan%20a%20${plan}%20en%20ProfitToLife`;
    } else {
        alert("Error: El modal no existe en el HTML.");
    }
};

// DELEGACIÓN DE EVENTOS: Atrapa cualquier clic en la pantalla
document.addEventListener('click', function(e) {
    // Buscamos si el clic fue en un botón o en un texto que diga "Actualizar a Pro/Premium"
    let target = e.target;
    
    // Si el clic fue en un ícono dentro del botón, subimos al elemento padre
    if (target.tagName !== 'BUTTON' && target.tagName !== 'A') {
        target = target.closest('button') || target.closest('a') || target;
    }

    const text = (target.innerText || target.textContent || '').trim();

    if (text.includes('Actualizar a Pro')) {
        e.preventDefault(); e.stopPropagation();
        window.abrirModalPago('Pro ($5 USD/mes)');
    } else if (text.includes('Actualizar a Premium')) {
        e.preventDefault(); e.stopPropagation();
        window.abrirModalPago('Premium ($15 USD/mes)');
    }
}, true); // El 'true' hace que capture el evento antes que otros scripts
</script>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()

        # 1. Limpiar intentos anteriores (estilos y scripts del modal)
        html = re.sub(r'<style id="ptl-.*?-css">.*?</style>', '', html, flags=re.DOTALL)
        html = re.sub(r'<script id="ptl-.*?-js">.*?</script>', '', html, flags=re.DOTALL)
        html = re.sub(r'<script id="ptl-.*?-fix">.*?</script>', '', html, flags=re.DOTALL)
        html = re.sub(r'<script id="ptl-.*?-bruteforce">.*?</script>', '', html, flags=re.DOTALL)
        html = re.sub(r'<script id="ptl-.*?-global">.*?</script>', '', html, flags=re.DOTALL)
        html = re.sub(r'<div id="ptlModalPago".*?</div>\s*</div>\s*</div>', '', html, flags=re.DOTALL)

        # 2. Inyectar el modal y script limpios antes de </body>
        html = html.replace('</body>', modal_html + '\n</body>')

        # 3. Corregir los onclick del HTML que hacían referencia a pedirPlan
        html = html.replace('onclick="pedirPlan(\'Pro\')"', 'onclick="window.abrirModalPago(\'Pro ($5 USD/mes)\')"')
        html = html.replace('onclick="pedirPlan(\'Premium\')"', 'onclick="window.abrirModalPago(\'Premium ($15 USD/mes)\')"')
        html = html.replace('onclick="abrirModalPago(\'Pro ($5 USD/mes)\')"', 'onclick="window.abrirModalPago(\'Pro ($5 USD/mes)\')"')
        html = html.replace('onclick="abrirModalPago(\'Premium ($15 USD/mes)\')"', 'onclick="window.abrirModalPago(\'Premium ($15 USD/mes)\')"')

        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ Planes fix (v2) inyectado en {archivo}")

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
