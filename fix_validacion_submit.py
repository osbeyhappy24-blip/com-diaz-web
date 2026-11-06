import re, os, subprocess

archivo = 'seller.html'

js_validacion = """
<script id="ptl-validacion-submit">
document.addEventListener('DOMContentLoaded', () => {
    // Buscar el botón de registro y su formulario
    const btnRegister = document.getElementById('btnRegister');
    if (btnRegister) {
        const form = btnRegister.closest('form');
        if (form) {
            // Escuchar el evento submit en fase de captura (true) para detenerlo antes que nada
            form.addEventListener('submit', (e) => {
                const pass1 = document.querySelector('input[type="password"]');
                const pass2 = document.getElementById('ptlConfirmPass');
                const terms = document.getElementById('ptlTermsCheck');
                
                // Validar contraseñas
                if (pass1 && pass2 && pass1.value !== pass2.value) {
                    e.preventDefault();
                    e.stopImmediatePropagation(); // Detiene cualquier otro listener
                    alert('⚠️ Las contraseñas no coinciden. Por favor, verifícalas.');
                    return false;
                }
                
                // Validar términos
                if (terms && !terms.checked) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    alert('⚠️ Debes aceptar los Términos y Condiciones.');
                    return false;
                }
                
                // Si todo está bien, dejamos que el formulario se envíe normalmente
            }, true); // El 'true' es crucial para la fase de captura
        }
    }
});
</script>
"""

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()

    if 'ptl-validacion-submit' not in html:
        html = html.replace('</body>', js_validacion + '\n</body>')
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ Validación de submit inyectada en fase de captura")
    else:
        print("⚠️ La validación ya estaba inyectada")

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
