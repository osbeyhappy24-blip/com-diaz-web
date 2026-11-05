import os

archivos = ['seller-panel.html', 'panel-vendedor.html']

css_modal = """
<style id="ptl-pagos-css">
  .ptl-modal-overlay {
    display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(10, 14, 26, 0.85); z-index: 10000; justify-content: center; align-items: center;
    backdrop-filter: blur(4px);
  }
  .ptl-modal-box {
    background: #131A2E; border: 1px solid #1F2A44; border-radius: 16px;
    padding: 24px; width: 90%; max-width: 400px; text-align: center;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5); color: #F1F5F9;
  }
  .ptl-btn-pago {
    display: block; width: 100%; padding: 14px; margin: 10px 0;
    border-radius: 8px; font-weight: bold; font-size: 16px; border: none; cursor: pointer;
    transition: transform 0.2s;
  }
  .ptl-btn-pago:active { transform: scale(0.98); }
  .ptl-btn-transfer { background: #0056b3; color: white; }
  .ptl-btn-wa { background: #22C55E; color: white; text-decoration: none; box-sizing: border-box; }
  .ptl-cuenta-box {
    background: #0A0E1A; padding: 15px; border-radius: 8px; margin: 15px 0;
    border: 1px dashed #FCD34D;
  }
  .ptl-cuenta-numero {
    font-size: 22px; font-weight: bold; color: #FCD34D; letter-spacing: 2px;
    user-select: none; -webkit-user-select: none; pointer-events: none;
  }
</style>
"""

js_modal = """
<div id="ptlModalPago" class="ptl-modal-overlay">
  <div class="ptl-modal-box">
    <h3 style="margin-top:0; font-size: 20px;">Actualizar Plan</h3>
    <p style="color:#94A3B8; font-size:14px;">Estás a punto de actualizar a <b id="ptlPlanNombre" style="color:#22C55E;"></b></p>
    
    <button class="ptl-btn-pago ptl-btn-transfer" onclick="alert('Aquí se abrirá Transfermóvil o se mostrarán las instrucciones')">
      💳 Pagar por Transfermóvil
    </button>
    
    <div class="ptl-cuenta-box">
      <p style="margin:0; font-size:12px; color:#94A3B8;">Cuenta destino (Osbey Díaz):</p>
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

<script>
document.addEventListener('DOMContentLoaded', () => {
    // Buscar botones de actualizar
    const botones = Array.from(document.querySelectorAll('button, a'));
    const btnPro = botones.find(b => b.textContent.includes('Actualizar a Pro'));
    const btnPremium = botones.find(b => b.textContent.includes('Actualizar a Premium'));
    
    function abrirModal(plan) {
        document.getElementById('ptlPlanNombre').innerText = plan;
        document.getElementById('ptlModalPago').style.display = 'flex';
        document.getElementById('ptlBtnWA').href = `https://wa.me/5358980267?text=Hola,%20quiero%20actualizar%20mi%20plan%20a%20${plan}%20en%20ProfitToLife`;
    }

    if (btnPro) btnPro.addEventListener('click', (e) => { e.preventDefault(); abrirModal('Pro ($5 USD/mes)'); });
    if (btnPremium) btnPremium.addEventListener('click', (e) => { e.preventDefault(); abrirModal('Premium ($15 USD/mes)'); });
});
</script>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()
        
        if 'ptl-pagos-css' not in html:
            html = html.replace('</head>', css_modal + '\n</head>')
            html = html.replace('</body>', js_modal + '\n</body>')
            
            with open(archivo, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"✅ Flujo de pago Transfermóvil inyectado en {archivo}")
        else:
            print(f"⚠️ {archivo} ya tiene el flujo de pago.")
