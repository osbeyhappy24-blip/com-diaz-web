import re, os, subprocess

archivo = 'seller.html'

css_modal = """
<style id="ptl-seller-pulido-css">
  /* Estilos para el Modal de Éxito */
  #ptlModalExito {
      display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(10, 14, 26, 0.9); z-index: 999999;
      justify-content: center; align-items: center; backdrop-filter: blur(5px);
  }
  #ptlModalExito.ptl-show { display: flex !important; }
  .ptl-exito-box {
      background: #131A2E; border: 1px solid #22C55E; border-radius: 16px;
      padding: 30px; width: 90%; max-width: 350px; text-align: center;
      box-shadow: 0 10px 30px rgba(34, 197, 94, 0.2);
      animation: ptlPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  @keyframes ptlPop {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
  }
  .ptl-check-circle {
      width: 70px; height: 70px; border-radius: 50%;
      background: rgba(34, 197, 94, 0.15); border: 2px solid #22C55E;
      display: flex; align-items: center; justify-content: center;
      font-size: 35px; color: #22C55E; margin: 0 auto 20px auto;
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
  }
</style>

<div id="ptlModalExito">
  <div class="ptl-exito-box">
    <div class="ptl-check-circle">✓</div>
    <h2 style="color: #F1F5F9; margin: 0 0 10px 0; font-size: 22px; font-weight: 900;">¡Cuenta Creada!</h2>
    <p id="ptlExitoMensaje" style="color: #94A3B8; font-size: 14px; margin-bottom: 25px; line-height: 1.5;">
        Tu cuenta ha sido creada exitosamente.
    </p>
    <button onclick="window.location.href='seller-panel.html'" style="background: #22C55E; color: #0A0E1A; padding: 14px; border-radius: 8px; font-weight: 800; font-size: 16px; border: none; width: 100%; cursor: pointer;">
        Ir a mi Panel
    </button>
    <button onclick="window.location.href='seller.html'" style="margin-top: 15px; background: none; border: none; color: #94A3B8; text-decoration: underline; cursor: pointer; font-size: 14px;">
        Cerrar
    </button>
  </div>
</div>
"""

js_pulido = """
<script id="ptl-seller-pulido-js">
document.addEventListener('DOMContentLoaded', () => {
    // 1. DUPLICAR CAMPO DE CONTRASEÑA
    const passInput = document.querySelector('input[type="password"]');
    if (passInput && !document.getElementById('ptlConfirmPass')) {
        const confirmGroup = document.createElement('div');
        confirmGroup.className = 'ptl-input-group';
        confirmGroup.style.position = 'relative';
        confirmGroup.style.width = '100%';
        confirmGroup.style.marginBottom = '15px';

        const confirmInput = document.createElement('input');
        confirmInput.type = 'password';
        confirmInput.id = 'ptlConfirmPass';
        confirmInput.placeholder = 'Confirmar contraseña';
        confirmInput.required = true;
        // Copiar estilos del input original
        confirmInput.style.cssText = passInput.style.cssText;
        if (!confirmInput.style.cssText) {
            confirmInput.style.cssText = 'width:100%; padding:12px; border-radius:8px; border:1px solid #1F2A44; background:#131A2E; color:#F1F5F9; margin-top:10px;';
        }

        // Insertar después del input original
        passInput.parentNode.parentNode.insertBefore(confirmGroup, passInput.parentNode.nextSibling);
        confirmGroup.appendChild(confirmInput);
    }

    // 2. VALIDAR Y MOSTRAR MODAL
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            // Validar contraseñas
            const pass1 = passInput ? passInput.value : '';
            const pass2 = document.getElementById('ptlConfirmPass') ? document.getElementById('ptlConfirmPass').value : '';
            
            if (pass1 !== pass2) {
                e.preventDefault();
                e.stopPropagation();
                alert('⚠️ Las contraseñas no coinciden. Por favor, verifícalas.');
                return;
            }

            // Validar términos
            const terms = document.getElementById('ptlTermsCheck');
            if (terms && !terms.checked) {
                e.preventDefault();
                e.stopPropagation();
                alert('⚠️ Debes aceptar los Términos y Condiciones.');
                return;
            }

            // Si pasa las validaciones, interceptamos la respuesta para mostrar el modal
            // Como el formulario usa fetch (probablemente), monitoreamos el DOM para ver si sale el mensaje de éxito
            // O interceptamos el XMLHttpRequest / fetch.
            // Para no romper el código original, usaremos un MutationObserver.
            const observer = new MutationObserver((mutations) => {
                // Si el mensaje de éxito original se vuelve visible
                const msgs = Array.from(document.querySelectorAll('div, p, span')).filter(el => 
                    el.textContent.includes('Cuenta creada exitosamente') || 
                    el.textContent.includes('pendiente de aprobación')
                );
                
                const visibleMsg = msgs.find(m => m.offsetParent !== null);
                if (visibleMsg) {
                    // Mostrar nuestro modal bonito
                    const planSeleccionado = document.querySelector('.plan-card.active')?.innerText || 'Básico';
                    const exitoMsg = document.getElementById('ptlExitoMensaje');
                    
                    if (planSeleccionado.toLowerCase().includes('pro') || planSeleccionado.toLowerCase().includes('premium')) {
                        exitoMsg.innerHTML = "Tu cuenta ha sido creada con el plan <b>" + (planSeleccionado.includes('Pro') ? 'Pro' : 'Premium') + "</b>.<br><br>⏳ <b>Pendiente de aprobación.</b><br>Te avisaremos por WhatsApp cuando el administrador confirme tu pago.";
                    } else {
                        exitoMsg.innerHTML = "Tu cuenta con el plan <b>Básico</b> está lista.<br><br>✅ <b>Aprobación automática.</b><br>Ya puedes empezar a subir productos.";
                    }
                    
                    document.getElementById('ptlModalExito').classList.add('ptl-show');
                    observer.disconnect(); // Detener observación
                }
            });
            
            observer.observe(document.body, { childList: true, subtree: true, attributes: true });
        });
    }
});
</script>
"""

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()

    if 'ptl-seller-pulido-js' not in html:
        # Inyectar CSS en el head y JS+HTML antes de cerrar body
        html = html.replace('</head>', css_modal + '\n</head>')
        html = html.replace('</body>', js_pulido + '\n</body>')
        
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ Doble contraseña y Modal de Éxito inyectados")

# Validar sintaxis
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
