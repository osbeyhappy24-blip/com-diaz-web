import re, os, subprocess

archivo = 'seller.html'

js_eye = """
<script id="ptl-eye-confirm-js">
document.addEventListener('DOMContentLoaded', () => {
    // Buscar el input de confirmar contraseña que inyectamos antes
    const confirmInput = document.getElementById('ptlConfirmPass');
    
    if (confirmInput && !document.getElementById('ptlEyeBtnConfirm')) {
        // Crear el contenedor relativo
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        
        // Insertar el wrapper antes del input y mover el input dentro
        confirmInput.parentNode.insertBefore(wrapper, confirmInput);
        wrapper.appendChild(confirmInput);

        // Crear el botón del ojito
        const eyeBtn = document.createElement('button');
        eyeBtn.id = 'ptlEyeBtnConfirm';
        eyeBtn.type = 'button';
        eyeBtn.innerHTML = '👁️';
        eyeBtn.style.cssText = 'position: absolute; right: 15px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94A3B8; font-size: 20px; cursor: pointer; z-index: 10;';
        wrapper.appendChild(eyeBtn);

        // Lógica para mostrar/ocultar
        eyeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirmInput.type === 'password') {
                confirmInput.type = 'text';
                eyeBtn.innerHTML = '🙈';
            } else {
                confirmInput.type = 'password';
                eyeBtn.innerHTML = '👁️';
            }
        });
    }
});
</script>
"""

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()

    if 'ptl-eye-confirm-js' not in html:
        html = html.replace('</body>', js_eye + '\n</body>')
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ Ojito inyectado en el campo de confirmar contraseña")

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
