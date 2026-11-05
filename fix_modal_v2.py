import os

archivos = ['seller-panel.html', 'panel-vendedor.html']

# El nuevo modal (Sin tu nombre y con aviso de autenticación)
nuevo_modal = """
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

<script>
document.addEventListener('DOMContentLoaded', () => {
    // 1. Buscar TODOS los botones que digan Pro o Premium
    const botones = Array.from(document.querySelectorAll('button, a, div'));
    const btnPro = botones.find(b => b.textContent.trim() === 'Actualizar a Pro');
    const btnPremium = botones.find(b => b.textContent.trim() === 'Actualizar a Premium');
    
    function abrirModal(plan, e) {
        // DETENER la redirección a WhatsApp que hacía el código viejo
        if(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        document.getElementById('ptlPlanNombre').innerText = plan;
        document.getElementById('ptlModalPago').style.display = 'flex';
        
        // Actualizar link de WhatsApp pero NO redirigir, solo prepararlo
        document.getElementById('ptlBtnWA').href = `https://wa.me/5358980267?text=Hola,%20quiero%20actualizar%20mi%20plan%20a%20${plan}%20en%20ProfitToLife`;
    }

    if (btnPro) btnPro.onclick = (e) => abrirModal('Pro ($5 USD/mes)', e);
    if (btnPremium) btnPremium.onclick = (e) => abrirModal('Premium ($15 USD/mes)', e);
});
</script>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()
        
        # Eliminar el modal viejo si existe
        import re
        html = re.sub(r'<div id="ptlModalPago".*?</script>', '', html, flags=re.DOTALL)
        
        # Inyectar el nuevo antes de cerrar el body
        html = html.replace('</body>', nuevo_modal + '\n</body>')
        
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ Modal V2 inyectado en {archivo}")
