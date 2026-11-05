import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

for archivo in archivos:
    if not os.path.exists(archivo): continue
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()

    # Eliminar el intento anterior del setTimeout si existe
    html = re.sub(r'<script id="ptl-fix-planes">.*?</script>', '', html, flags=re.DOTALL)

    # Inyectar la función pedirPlan directamente
    funcion_pedirPlan = """
<script id="ptl-pedir-plan-fix">
function pedirPlan(plan) {
    if (typeof abrirModalPago === 'function') {
        abrirModalPago(plan === 'Pro' ? 'Pro ($5 USD/mes)' : 'Premium ($15 USD/mes)');
    } else {
        // Si por alguna razón abrirModalPago no existe, inyectamos el modal manualmente
        alert('Abriendo modal para: ' + plan);
        const modal = document.getElementById('ptlModalPago');
        if (modal) {
            document.getElementById('ptlPlanNombre').innerText = plan;
            modal.style.display = 'flex';
        }
    }
}
</script>
"""
    if 'ptl-pedir-plan-fix' not in html:
        html = html.replace('</body>', funcion_pedirPlan + '\n</body>')
        print(f"✅ Función pedirPlan reescrita en {archivo}")

    with open(archivo, 'w', encoding='utf-8') as f:
        f.write(html)
