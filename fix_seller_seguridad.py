import re, os, subprocess

archivo = 'seller.html'

css_js_seguridad = """
<style id="ptl-seller-seguridad-css">
  .ptl-input-group {
      position: relative;
      width: 100%;
      margin-bottom: 15px;
  }
  .ptl-eye-btn {
      position: absolute;
      right: 15px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #94A3B8;
      font-size: 20px;
      cursor: pointer;
      z-index: 10;
  }
  .ptl-terms-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      color: #94A3B8;
      font-size: 12px;
      margin: 15px 0;
      text-align: left;
      line-height: 1.4;
  }
  .ptl-terms-label input {
      width: 18px !important;
      height: 18px !important;
      margin-top: 2px;
      accent-color: #22C55E;
  }
  .ptl-terms-label a {
      color: #22C55E;
      text-decoration: none;
      font-weight: bold;
  }
</style>

<script id="ptl-seller-seguridad-js">
document.addEventListener('DOMContentLoaded', () => {
    // 1. Encontrar el input de contraseña
    const passInput = document.querySelector('input[type="password"]');
    if (passInput && !document.getElementById('ptlEyeBtn')) {
        // Envolver el input en un div contenedor
        const wrapper = document.createElement('div');
        wrapper.className = 'ptl-input-group';
        passInput.parentNode.insertBefore(wrapper, passInput);
        wrapper.appendChild(passInput);

        // Crear el botón del ojito
        const eyeBtn = document.createElement('button');
        eyeBtn.id = 'ptlEyeBtn';
        eyeBtn.type = 'button';
        eyeBtn.className = 'ptl-eye-btn';
        eyeBtn.innerHTML = '👁️';
        wrapper.appendChild(eyeBtn);

        // Lógica para mostrar/ocultar
        eyeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (passInput.type === 'password') {
                passInput.type = 'text';
                eyeBtn.innerHTML = '🙈';
            } else {
                passInput.type = 'password';
                eyeBtn.innerHTML = '👁️';
            }
        });
    }

    // 2. Agregar Checkbox de Términos antes del botón de Registro
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn && !document.getElementById('ptlTerms')) {
        const termsHTML = `
            <label class="ptl-terms-label" id="ptlTerms">
                <input type="checkbox" id="ptlTermsCheck" required>
                <span>Acepto los <a href="#" onclick="alert('Aquí irán los términos legales de ProfitToLife'); return false;">Términos y Condiciones</a> y la política de privacidad.</span>
            </label>
        `;
        submitBtn.parentNode.insertBefore(document.createRange().createContextualFragment(termsHTML), submitBtn);
    }

    // 3. Validar antes de enviar
    const form = submitBtn ? submitBtn.closest('form') : null;
    if (form) {
        form.addEventListener('submit', (e) => {
            const termsCheck = document.getElementById('ptlTermsCheck');
            if (termsCheck && !termsCheck.checked) {
                e.preventDefault();
                alert('⚠️ Debes aceptar los Términos y Condiciones para registrarte.');
                return;
            }
        });
    }
});
</script>
"""

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()

    if 'ptl-seller-seguridad-js' not in html:
        html = html.replace('</head>', css_js_seguridad + '\n</head>')
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ Seguridad y UX (Ojito, Términos) inyectados en seller.html")

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
