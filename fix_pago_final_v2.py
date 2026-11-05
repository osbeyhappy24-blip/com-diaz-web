import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

# JS con \\n escapado correctamente para que llegue como \n literal
nuevo_bloque = r"""
<!-- MODAL PAGO INICIO -->
<div id="ptlModalPago" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(10,14,26,0.85); z-index:999999; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
  <div style="background:#131A2E; border:1px solid #1F2A44; border-radius:16px; padding:24px; width:90%; max-width:400px; text-align:center; color:#F1F5F9; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
    <h3 style="margin-top:0; font-size:20px;">Actualizar Plan</h3>
    <p style="color:#94A3B8; font-size:14px;">Estás a punto de actualizar a <b id="ptlPlanNombre" style="color:#22C55E;"></b></p>
    
    <button onclick="pagarTransfermovil()" style="display:block; width:100%; padding:14px; margin:10px 0; border-radius:8px; font-weight:bold; font-size:16px; border:none; cursor:pointer; background:#0056b3; color:white;">
      💳 Pagar por Transfermóvil
    </button>
    
    <div style="background:#0A0E1A; padding:15px; border-radius:8px; margin:15px 0; border:1px dashed #FCD34D;">
      <p style="margin:0; font-size:12px; color:#94A3B8;">Cuenta destino CUP (Pago Seguro):</p>
      <p style="font-size:20px; font-weight:bold; color:#FCD34D; letter-spacing:2px; user-select:none; -webkit-user-select:none; margin:5px 0;">0699 9111 6586 0313</p>
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
window.abrirModalPago = function(plan) {
    const modal = document.getElementById('ptlModalPago');
    if (modal) {
        document.getElementById('ptlPlanNombre').innerText = plan;
        modal.style.display = 'flex';
        const waBtn = document.getElementById('ptlBtnWA');
        if (waBtn) waBtn.href = 'https://wa.me/5358980267?text=Hola,%20quiero%20actualizar%20mi%20plan%20a%20' + plan + '%20en%20ProfitToLife';
    }
};

window.pagarTransfermovil = function() {
    var msg1 = "⚠️ IMPORTANTE: Debes estar autenticado en la app de Transfermóvil antes de realizar la transferencia.\n\n¿Ya estás autenticado y deseas continuar?";
    if (confirm(msg1)) {
        const cuenta = "0699911165860313";
        if (navigator.clipboard) {
            navigator.clipboard.writeText(cuenta).then(function() {
                alert("✅ Número de cuenta CUP copiado.\n\n1. Abre tu app Transfermóvil.\n2. Ve a Transferencias.\n3. Pega el número de cuenta.\n4. Ingresa el monto y confirma.");
            }).catch(function() {
                alert("El número de cuenta es: 0699 9111 6586 0313\n(Por favor, anótalo manualmente).");
            });
        } else {
            alert("El número de cuenta es: 0699 9111 6586 0313\n(Por favor, anótalo manualmente).");
        }
    }
};

document.addEventListener('click', function(e) {
    let target = e.target;
    while (target && target !== document) {
        if (target.tagName === 'BUTTON' || target.tagName === 'A') {
            const text = (target.innerText || target.textContent || '').trim();
            if (text.includes('Actualizar a Pro')) {
                e.preventDefault(); e.stopPropagation();
                window.abrirModalPago('Pro ($5 USD/mes)');
                return;
            }
            if (text.includes('Actualizar a Premium')) {
                e.preventDefault(); e.stopPropagation();
                window.abrirModalPago('Premium ($15 USD/mes)');
                return;
            }
        }
        target = target.parentNode;
    }
}, true);
</script>
<!-- MODAL PAGO FIN -->
"""

def limpiar_modal(html):
    # Eliminar bloques entre marcadores si existen
    html = re.sub(r'<!-- MODAL PAGO INICIO -->.*?<!-- MODAL PAGO FIN -->', '', html, flags=re.DOTALL)
    # Eliminar cualquier div con id ptlModalPago (con conteo de divs)
    while '<div id="ptlModalPago"' in html:
        start = html.find('<div id="ptlModalPago"')
        # Encontrar el cierre contando divs
        i = start
        depth = 0
        found_start = False
        while i < len(html):
            if html[i:i+4] == '<div':
                depth += 1
                found_start = True
            elif html[i:i+6] == '</div>':
                depth -= 1
                if found_start and depth == 0:
                    i += 6
                    break
            i += 1
        # Eliminar también el script que le sigue si existe
        resto = html[i:]
        script_match = re.match(r'\s*<script>.*?</script>', resto, re.DOTALL)
        if script_match:
            i += script_match.end()
        html = html[:start] + html[i:]
    # Eliminar scripts viejos que contengan abrirModalPago o pagarTransfermovil
    html = re.sub(r'<script>\s*window\.abrirModalPago.*?</script>', '', html, flags=re.DOTALL)
    return html

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()

        html = limpiar_modal(html)
        html = html.replace('</body>', nuevo_bloque + '\n</body>')

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
