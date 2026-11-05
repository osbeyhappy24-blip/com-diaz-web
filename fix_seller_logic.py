import re, os, subprocess

archivo = 'seller.html'

js_logica = """
<style id="ptl-seller-modal-css">
  #ptlModalPagoSeller {
      display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(10, 14, 26, 0.85); z-index: 999999;
      justify-content: center; align-items: center; backdrop-filter: blur(4px);
  }
  #ptlModalPagoSeller.ptl-show { display: flex !important; }
  .ptl-modal-box {
      background: #131A2E; border: 1px solid #1F2A44; border-radius: 16px;
      padding: 24px; width: 90%; max-width: 400px; text-align: center; color: #F1F5F9;
  }
</style>

<div id="ptlModalPagoSeller">
  <div class="ptl-modal-box">
    <h3 style="margin-top:0; font-size: 20px;">Registro con Plan <span id="ptlPlanNombreSeller" style="color:#22C55E;"></span></h3>
    <p style="color:#94A3B8; font-size:14px;">Para activar tu cuenta con este plan, debes realizar el pago y esperar aprobación del administrador.</p>
    
    <button onclick="alert('⚠️ Debes estar autenticado en Transfermóvil. Copia el número y realiza la transferencia.')" style="display:block; width:100%; padding:14px; margin:10px 0; border-radius:8px; font-weight:bold; font-size:16px; border:none; cursor:pointer; background:#0056b3; color:white;">
      💳 Pagar por Transfermóvil
    </button>
    
    <div style="background:#0A0E1A; padding:15px; border-radius:8px; margin:15px 0; border:1px dashed #FCD34D;">
      <p style="margin:0; font-size:12px; color:#94A3B8;">Cuenta destino CUP (Pago Seguro):</p>
      <p style="font-size:20px; font-weight:bold; color:#FCD34D; letter-spacing:2px; margin:5px 0;">0699 9111 6586 0313</p>
    </div>

    <a href="https://wa.me/5358980267?text=Hola,%20quiero%20registrarme%20con%20el%20plan%20" target="_blank" id="ptlBtnWASeller" style="display:block; width:100%; padding:14px; margin:10px 0; border-radius:8px; font-weight:bold; font-size:16px; border:none; cursor:pointer; background:#22C55E; color:white; text-decoration:none; box-sizing:border-box;">
      💬 Enviar comprobante al Admin
    </a>
    
    <button onclick="document.getElementById('ptlModalPagoSeller').classList.remove('ptl-show')" style="margin-top:15px; background:none; border:none; color:#94A3B8; text-decoration:underline; cursor:pointer;">
      Cancelar y elegir plan Gratis
    </button>
  </div>
</div>

<script id="ptl-seller-logica">
document.addEventListener('DOMContentLoaded', () => {
    // Buscar el formulario de registro y los botones de selección de plan
    const form = document.querySelector('form');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            // Detectar qué plan está seleccionado
            let planSeleccionado = 'Básico'; // Por defecto
            
            // Buscamos si hay algún input radio o botón con clase activa que diga Pro o Premium
            const planesActivos = document.querySelectorAll('.plan-card.active, .plan.selected, input[type="radio"]:checked');
            planesActivos.forEach(p => {
                if (p.innerText && p.innerText.includes('Pro')) planSeleccionado = 'Pro ($5 USD/mes)';
                if (p.innerText && p.innerText.includes('Premium')) planSeleccionado = 'Premium ($15 USD/mes)';
                if (p.value && p.value.toLowerCase().includes('pro')) planSeleccionado = 'Pro ($5 USD/mes)';
                if (p.value && p.value.toLowerCase().includes('premium')) planSeleccionado = 'Premium ($15 USD/mes)';
            });

            // Si es Pro o Premium, detenemos el registro normal
            if (planSeleccionado !== 'Básico') {
                e.preventDefault(); // Detiene el envío del formulario
                e.stopPropagation();
                
                // Mostrar el modal
                document.getElementById('ptlPlanNombreSeller').innerText = planSeleccionado;
                document.getElementById('ptlModalPagoSeller').classList.add('ptl-show');
                
                // Actualizar link de WhatsApp
                const waBtn = document.getElementById('ptlBtnWASeller');
                if (waBtn) waBtn.href = `https://wa.me/5358980267?text=Hola,%20quiero%20registrarme%20con%20el%20plan%20${planSeleccionado}%20en%20ProfitToLife`;
            }
            // Si es Básico, el formulario se envía normalmente (auto-aprobación)
        }, true); // Usar true para capturar el evento antes de que se envíe
    }
});
</script>
"""

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()

    if 'ptl-seller-logica' not in html:
        html = html.replace('</body>', js_logica + '\n</body>')
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ Lógica de planes para Seller inyectada")

# Validar sintaxis (extraer scripts y chequear con node)
print("Validando sintaxis...")
scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', html)
os.makedirs(os.path.expanduser('~/.check_js'), exist_ok=True)
err = False
for i, js in enumerate(scripts):
    if js.strip():
        with open(os.path.expanduser(f'~/.check_js/s{i}.js'), 'w') as out: out.write(js)
        res = subprocess.run(['node', '--check', os.path.expanduser(f'~/.check_js/s{i}.js')], capture_output=True, text=True)
        if res.returncode != 0:
            print(f'❌ Error en script {i}: {res.stderr}'); err = True
if not err: print('✅ Sintaxis Perfecta')
