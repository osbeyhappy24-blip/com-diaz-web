import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

nuevo_modal = """
<style id="ptl-modal-final-css">
  #ptlModalPago {
      display: none;
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(10, 14, 26, 0.85); z-index: 999999;
      justify-content: center; align-items: center; backdrop-filter: blur(4px);
  }
  #ptlModalPago.ptl-show { display: flex !important; }
  .ptl-modal-box {
      background: #131A2E; border: 1px solid #1F2A44; border-radius: 16px;
      padding: 24px; width: 90%; max-width: 400px; text-align: center; color: #F1F5F9;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
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
    
    <button class="ptl-btn-pago ptl-btn-transfer" onclick="pagarTransfermovil()">
      💳 Pagar por Transfermóvil
    </button>
    
    <div style="background:#0A0E1A; padding:15px; border-radius:8px; margin:15px 0; border:1px dashed #FCD34D;">
      <p style="margin:0; font-size:12px; color:#94A3B8;">Cuenta destino en CUP (Pago Seguro):</p>
      <p id="ptlCuentaNumero" style="font-size:20px; font-weight:bold; color:#FCD34D; letter-spacing:2px; user-select:none; -webkit-user-select:none; margin:5px 0;">0699 9111 6586 0313</p>
      <p style="margin:0; font-size:10px; color:#F59E0B;">Protegido contra copia</p>
    </div>

    <a href="#" id="ptlBtnWA" target="_blank" class="ptl-btn-pago ptl-btn-wa">
      💬 Contactar al Administrador
    </a>
    
    <button onclick="cerrarModalPago()" style="margin-top:15px; background:none; border:none; color:#94A3B8; text-decoration:underline; cursor:pointer;">
      Cancelar
    </button>
  </div>
</div>

<script id="ptl-pago-experiencia-js">
// Función para cerrar el modal
window.cerrarModalPago = function() {
    const modal = document.getElementById('ptlModalPago');
    if (modal) modal.classList.remove('ptl-show');
};

// Función para abrir el modal
window.abrirModalPago = function(plan) {
    const modal = document.getElementById('ptlModalPago');
    if (modal) {
        document.getElementById('ptlPlanNombre').innerText = plan;
        modal.classList.add('ptl-show');
        
        const waBtn = document.getElementById('ptlBtnWA');
        if (waBtn) waBtn.href = `https://wa.me/5358980267?text=Hola,%20quiero%20actualizar%20mi%20plan%20a%20${plan}%20en%20ProfitToLife`;
    }
};

// Función con el flujo de Transfermóvil (CORREGIDA CON \n)
window.pagarTransfermovil = function() {
    // Usamos \\n para que JavaScript lo lea como salto de línea sin romper el string
    var mensaje = "⚠️ IMPORTANTE: Debes estar autenticado en la app de Transfermóvil antes de realizar la transferencia.\\n\\n¿Ya estás autenticado y deseas continuar?";
    
    if (confirm(mensaje)) {
        const cuenta = "0699911165860313"; // Tu cuenta real sin espacios
        navigator.clipboard.writeText(cuenta).then(() => {
            alert("✅ Número de cuenta CUP copiado al portapapeles.\\n\\n1. Abre tu app Transfermóvil.\\n2. Ve a Transferencias.\\n3. Pega el número de cuenta.\\n4. Ingresa el monto del plan y confirma.");
        }).catch(err => {
            alert("El número de cuenta es: 0699 9111 6586 0313\\n(Por favor, anótalo manualmente).");
        });
    }
};
</script>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()

        # 1. Eliminar el modal roto anterior (buscando por el ID del script)
        html = re.sub(r'<style id="ptl-modal-final-css">.*?</style>', '', html, flags=re.DOTALL)
        html = re.sub(r'<div id="ptlModalPago".*?</script>', '', html, flags=re.DOTALL)
        
        # 2. Inyectar el nuevo modal al final del body
        html = html.replace('</body>', nuevo_modal + '\n</body>')

        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ Modal y cuenta CUP corregidos en {archivo}")

# Validar sintaxis estricta
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
