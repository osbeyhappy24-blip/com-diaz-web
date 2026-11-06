import re, os, subprocess

archivo = 'seller.html'
js_check = """
<script id="ptl-check-phone-js">
document.addEventListener('DOMContentLoaded', () => {
    const telInput = document.getElementById('regTelefono');
    if (!telInput) return;

    // Crear un mensaje debajo del input
    const msgDiv = document.createElement('div');
    msgDiv.id = 'ptlPhoneMsg';
    msgDiv.style.cssText = 'font-size: 12px; margin-top: 5px; font-weight: bold; display: none;';
    telInput.parentNode.insertBefore(msgDiv, telInput.nextSibling);

    let timeout = null;

    telInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().replace(/\\D/g, ''); // Solo números
        msgDiv.style.display = 'none';
        
        if (val.length < 8) return; // Esperar a que tenga un mínimo de dígitos

        clearTimeout(timeout);
        timeout = setTimeout(async () => {
            msgDiv.style.display = 'block';
            msgDiv.style.color = '#94A3B8';
            msgDiv.textContent = '⏳ Verificando...';

            try {
                const r = await fetch(API + '/api/seller/check-phone?tel=' + encodeURIComponent(val));
                const d = await r.json();
                
                if (d.ok) {
                    if (d.exists) {
                        msgDiv.style.color = '#EF4444'; // Rojo
                        msgDiv.textContent = '❌ Este número ya está registrado.';
                    } else {
                        msgDiv.style.color = '#22C55E'; // Verde
                        msgDiv.textContent = '✅ Número disponible.';
                    }
                }
            } catch(err) {
                msgDiv.style.display = 'none'; // Ignorar errores de red
            }
        }, 500); // Esperar 500ms después de que deje de escribir
    });
});
</script>
"""

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()
    if 'ptl-check-phone-js' not in html:
        html = html.replace('</body>', js_check + '\n</body>')
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ Validación en tiempo real inyectada")

# Validar
scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', html)
os.makedirs(os.path.expanduser('~/.check_js'), exist_ok=True)
err = False
for i, js in enumerate(scripts):
    if js.strip():
        with open(os.path.expanduser(f'~/.check_js/s{i}.js'), 'w') as out: out.write(js)
        res = subprocess.run(['node', '--check', os.path.expanduser(f'~/.check_js/s{i}.js')], capture_output=True, text=True)
        if res.returncode != 0:
            print(f'❌ Error en script {i}: {res.stderr}'); err = True
if not err: print('✅ Sintaxis Frontend Perfecta')
