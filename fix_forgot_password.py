import re, os, subprocess

archivo = 'seller.html'

js_forgot = """
<script id="ptl-forgot-password-js">
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('formLogin');
    if (loginForm && !document.getElementById('ptlForgotLink')) {
        // Crear el enlace de "¿Olvidaste tu contraseña?"
        const forgotDiv = document.createElement('div');
        forgotDiv.style.textAlign = 'center';
        forgotDiv.style.marginTop = '15px';
        forgotDiv.id = 'ptlForgotLink';
        
        forgotDiv.innerHTML = `
            <a href="#" id="ptlForgotBtn" style="color: #94A3B8; font-size: 13px; text-decoration: underline;">
                ¿Olvidaste tu contraseña?
            </a>
        `;
        
        // Insertar después del formulario
        loginForm.parentNode.insertBefore(forgotDiv, loginForm.nextSibling);
        
        // Lógica del botón
        document.getElementById('ptlForgotBtn').addEventListener('click', (e) => {
            e.preventDefault();
            const tel = document.getElementById('logTelefono').value.trim();
            const msg = tel 
                ? `Hola admin, olvidé mi contraseña de ProfitToLife. Mi número es: ${tel}. ¿Me puedes ayudar a recuperarla?`
                : `Hola admin, olvidé mi contraseña de ProfitToLife. ¿Me puedes ayudar a recuperarla?`;
            
            window.open('https://wa.me/5358980267?text=' + encodeURIComponent(msg), '_blank');
        });
    }
});
</script>
"""

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()
    if 'ptl-forgot-password-js' not in html:
        html = html.replace('</body>', js_forgot + '\n</body>')
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ Enlace '¿Olvidaste tu contraseña?' inyectado")

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
