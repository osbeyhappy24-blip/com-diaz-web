import re, os, subprocess

archivo = 'seller.html'

# 1. LIMPIAR EL CÓDIGO ANTERIOR
if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()

    # Eliminar estilos y scripts inyectados previamente
    html = re.sub(r'<style id="ptl-seller-pulido-css">.*?</style>', '', html, flags=re.DOTALL)
    html = re.sub(r'<script id="ptl-seller-pulido-js">.*?</script>', '', html, flags=re.DOTALL)
    html = re.sub(r'<div id="ptlModalExito">.*?</div>\s*</div>\s*</div>', '', html, flags=re.DOTALL)
    
    # 2. INYECTAR EL NUEVO MODAL (CON COLORES FORZADOS)
    nuevo_css = """
<style id="ptl-seller-modal-v2-css">
  #ptlModalExito {
      display: none !important; /* Oculto por defecto, a la fuerza */
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(10, 14, 26, 0.95); z-index: 999999;
      justify-content: center; align-items: center; backdrop-filter: blur(5px);
  }
  #ptlModalExito.ptl-show { display: flex !important; }
  
  .ptl-exito-box {
      background: #131A2E !important; border: 1px solid #22C55E !important; border-radius: 16px !important;
      padding: 30px !important; width: 90% !important; max-width: 350px !important; text-align: center !important;
      box-shadow: 0 10px 30px rgba(34, 197, 94, 0.2) !important;
      animation: ptlPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
  }
  
  @keyframes ptlPop {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
  }
  
  .ptl-check-circle {
      width: 70px !important; height: 70px !important; border-radius: 50% !important;
      background: rgba(34, 197, 94, 0.15) !important; border: 2px solid #22C55E !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
      font-size: 35px !important; color: #22C55E !important; margin: 0 auto 20px auto !important;
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.4) !important;
  }
  
  /* FORZAR COLORES DE TEXTO */
  .ptl-exito-box h2 { 
      color: #F1F5F9 !important; 
      margin: 0 0 10px 0 !important; 
      font-size: 22px !important; 
      font-weight: 900 !important; 
  }
  .ptl-exito-box p { 
      color: #94A3B8 !important; 
      font-size: 14px !important; 
      margin-bottom: 25px !important; 
      line-height: 1.5 !important; 
  }
</style>

<div id="ptlModalExito">
  <div class="ptl-exito-box">
    <div class="ptl-check-circle">✓</div>
    <h2>¡Cuenta Creada!</h2>
    <p id="ptlExitoMensaje">
        Tu cuenta ha sido creada exitosamente.
    </p>
    <button onclick="window.location.href='seller-panel.html'" style="background: #22C55E !important; color: #0A0E1A !important; padding: 14px !important; border-radius: 8px !important; font-weight: 800 !important; font-size: 16px !important; border: none !important; width: 100% !important; cursor: pointer !important;">
        Ir a mi Panel
    </button>
    <button onclick="window.location.href='seller.html'" style="margin-top: 15px !important; background: none !important; border: none !important; color: #94A3B8 !important; text-decoration: underline !important; cursor: pointer !important; font-size: 14px !important;">
        Cerrar
    </button>
  </div>
</div>
"""

    nuevo_js = """
<script id="ptl-seller-modal-v2-js">
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('ptlModalExito');
    let isSubmitting = false; // Bandera de seguridad

    // 1. DUPLICAR CAMPO DE CONTRASEÑA (Si no existe ya)
    const passInput = document.querySelector('input[type="password"]');
    if (passInput && !document.getElementById('ptlConfirmPass')) {
        const confirmGroup = document.createElement('div');
        confirmGroup.style.position = 'relative';
        confirmGroup.style.width = '100%';
        confirmGroup.style.marginBottom = '15px';

        const confirmInput = document.createElement('input');
        confirmInput.type = 'password';
        confirmInput.id = 'ptlConfirmPass';
        confirmInput.placeholder = 'Confirmar contraseña';
        confirmInput.required = true;
        confirmInput.style.cssText = 'width:100%; padding:12px; border-radius:8px; border:1px solid #1F2A44; background:#131A2E; color:#F1F5F9; margin-top:10px; box-sizing:border-box;';

        passInput.parentNode.parentNode.insertBefore(confirmGroup, passInput.parentNode.nextSibling);
        confirmGroup.appendChild(confirmInput);
    }

    // 2. LÓGICA DEL FORMULARIO
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', (e) => {
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

            // Si pasa todo, activamos la bandera
            isSubmitting = true;
            
            // Empezar a vigilar si el mensaje de éxito original aparece
            // (Usamos setInterval porque es más seguro que el Observer)
            let intentos = 0;
            const checkSuccess = setInterval(() => {
                intentos++;
                if (intentos > 50) { // Si pasan 5 segundos (50 * 100ms), dejamos de buscar
                    clearInterval(checkSuccess);
                    isSubmitting = false;
                    return;
                }

                if (!isSubmitting) return; // Si se canceló, no hacer nada

                // Buscar el mensaje de éxito original en el DOM
                const allElements = document.querySelectorAll('div, p, span, h3');
                for (let el of allElements) {
                    if (el.textContent.includes('Cuenta creada exitosamente') || el.textContent.includes('pendiente de aprobación')) {
                        // Verificar que sea visible (display != none y opacity > 0)
                        const style = window.getComputedStyle(el);
                        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                            
                            // ¡ENCONTRADO! Mostrar nuestro modal bonito
                            const planSeleccionado = document.querySelector('.plan-card.active')?.innerText || 'Básico';
                            const exitoMsg = document.getElementById('ptlExitoMensaje');
                            
                            if (planSeleccionado.toLowerCase().includes('pro') || planSeleccionado.toLowerCase().includes('premium')) {
                                exitoMsg.innerHTML = "Tu cuenta ha sido creada con el plan <b>" + (planSeleccionado.includes('Pro') ? 'Pro' : 'Premium') + "</b>.<br><br>⏳ <b>Pendiente de aprobación.</b><br>Te avisaremos por WhatsApp cuando el administrador confirme tu pago.";
                            } else {
                                exitoMsg.innerHTML = "Tu cuenta con el plan <b>Básico</b> está lista.<br><br>✅ <b>Aprobación automática.</b><br>Ya puedes empezar a subir productos.";
                            }
                            
                            modal.classList.add('ptl-show');
                            clearInterval(checkSuccess); // Detener la búsqueda
                            isSubmitting = false;
                            return;
                        }
                    }
                }
            }, 100); // Revisar cada 100ms
        });
    }
});
</script>
"""

    # Inyectar los nuevos códigos
    html = html.replace('</head>', nuevo_css + '\n</head>')
    html = html.replace('</body>', nuevo_js + '\n</body>')

    with open(archivo, 'w', encoding='utf-8') as f:
        f.write(html)
    print("✅ Modal V2 inyectado (Oculto por defecto, colores forzados, detección estricta)")

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
