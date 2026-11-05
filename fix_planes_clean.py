import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

# Eliminar todos los scripts de planes anteriores
for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()
        
        # Eliminar scripts de planes inyectados previamente
        html = re.sub(r'<script id="ptl-pedir-plan-fix">.*?</script>', '', html, flags=re.DOTALL)
        html = re.sub(r'<script id="ptl-planes-definitivo">.*?</script>', '', html, flags=re.DOTALL)
        html = re.sub(r'<script id="ptl-pedir-plan-global">.*?</script>', '', html, flags=re.DOTALL)
        html = re.sub(r'<script id="ptl-fix-planes">.*?</script>', '', html, flags=re.DOTALL)
        
        # Eliminar el modal viejo si existe
        html = re.sub(r'<div id="ptlModalPago".*?</div>\s*</div>\s*</div>', '', html, flags=re.DOTALL)
        
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ Limpieza de scripts en {archivo}")

# Inyectar el modal y la función limpia
modal_html = """
<div id="ptlModalPago" class="ptl-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(10,14,26,0.85); z-index:99999; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
  <div class="ptl-modal-box" style="background:#131A2E; border:1px solid #1F2A44; border-radius:16px; padding:24px; width:90%; max-width:400px; text-align:center; color:#F1F5F9;">
    <h3 style="margin-top:0; font-size: 20px;">Actualizar Plan</h3>
    <p style="color:#94A3B8; font-size:14px;">Estás a punto de actualizar a <b id="ptlPlanNombre" style="color:#22C55E;"></b></p>
    
    <button class="ptl-btn-pago" onclick="alert('⚠️ IMPORTANTE: Debes estar autenticado en la app de Transfermóvil antes de realizar la transferencia.')" style="display:block; width:100%; padding:14px; margin:10px 0; border-radius:8px; font-weight:bold; font-size:16px; border:none; cursor:pointer; background:#0056b3; color:white;">
      💳 Pagar por Transfermóvil
    </button>
    
    <div style="background:#0A0E1A; padding:15px; border-radius:8px; margin:15px 0; border:1px dashed #FCD34D;">
      <p style="margin:0; font-size:12px; color:#94A3B8;">Cuenta destino (Pago Seguro):</p>
      <p style="font-size:22px; font-weight:bold; color:#FCD34D; letter-spacing:2px; user-select:none; -webkit-user-select:none; pointer-events:none; margin:5px 0;">5358980267</p>
      <p style="margin:0; font-size:10px; color:#F59E0B;">Protegido contra copia</p>
    </div>

    <a href="#" id="ptlBtnWA" target="_blank" style="display:block; width:100%; padding:14px; margin:10px 0; border-radius:8px; font-weight:bold; font-size:16px; border:none; cursor:pointer; background:#22C55E; color:white; text-decoration:none; box-sizing:border-box;">
      💬 Contactar al Administrador
    </a>
    
    <button onclick="document.getElementById('ptlModalPago').style.display='none'" style="margin-top:15px; background:none; border:none; color:#94A3B8; text-decoration:underline; cursor:pointer;">
      Cancelar
    </button>
  </div>
</div>

<script>
// Función global para abrir el modal
window.abrirModalPago = function(plan) {
    const modal = document.getElementById('ptlModalPago');
    if (modal) {
        document.getElementById('ptlPlanNombre').innerText = plan;
        modal.style.display = 'flex';
        const waBtn = document.getElementById('ptlBtnWA');
        if (waBtn) waBtn.href = `https://wa.me/5358980267?text=Hola,%20quiero%20actualizar%20mi%20plan%20a%20${plan}%20en%20ProfitToLife`;
    }
};

// Reemplazar pedirPlan para que use la función global
window.pedirPlan = function(plan) {
    window.abrirModalPago(plan === 'Pro' ? 'Pro ($5 USD/mes)' : 'Premium ($15 USD/mes)');
};
</script>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()
        
        # Insertar el modal antes de cerrar el body
        if 'id="ptlModalPago"' not in html:
            html = html.replace('</body>', modal_html + '\n</body>')
        
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ Modal limpio inyectado en {archivo}")

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
