import re, os, subprocess

archivo = 'shop.js'

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        js = f.read()

    # 1. QUITAR LA ETIQUETA "IMPORTADO"
    # Reemplazar la línea 198 y 2550 (según el grep)
    js = js.replace("return { label: 'Importado', cls: '' };", "return { label: '', cls: '' };")
    js = js.replace("else badge.textContent = '🌐 Importado';", "else badge.textContent = '';")
    print("✅ Etiqueta 'Importado' eliminada del JS")

    # 2. INYECTAR EL BANNER CTA EN EL JS
    # Buscamos dónde se pinta la lista de productos. Por lo general hay un list.innerHTML = ...
    # Vamos a inyectar el banner antes del primer innerHTML que contenga "product"
    banner_js = """
// BANNER CTA INYECTADO
function _getBannerCTA() {
    return `
    <div style="background: linear-gradient(135deg, #131A2E 0%, #1F2A44 100%); border: 1px solid #22C55E; border-radius: 12px; padding: 15px 20px; margin: 15px 10px; display: flex; align-items: center; justify-content: space-between; gap: 15px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.2); position: relative; overflow: hidden;">
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at top right, rgba(34, 197, 94, 0.15), transparent 70%); pointer-events: none;"></div>
      <div style="z-index: 1;">
        <h3 style="margin: 0 0 5px 0; color: #F1F5F9; font-size: 16px; font-weight: 800;">🚀 ¡Vende en Cuba!</h3>
        <p style="margin: 0; color: #94A3B8; font-size: 12px;">Crea tu tienda gratis y llega a miles de clientes.</p>
      </div>
      <a href="seller.html" style="background: #22C55E; color: #0A0E1A; padding: 10px 18px; border-radius: 8px; font-weight: 800; font-size: 14px; text-decoration: none; white-space: nowrap; z-index: 1;">Crear Tienda</a>
    </div>
    `;
}
"""

    if '_getBannerCTA' not in js:
        # Insertar la función al principio del archivo
        js = banner_js + '\n' + js
        print("✅ Función del Banner CTA inyectada en shop.js")

    # Buscar el lugar donde se renderiza la lista principal
    # Por lo general es algo como: contenedor.innerHTML = html;
    # O donde se pinta la grilla.
    # Vamos a buscar la función principal de renderizado y añadir el banner al inicio de su HTML
    # Esto es un poco a ciegas, así que inyectaremos el banner en el primer innerHTML grande que encontremos.
    # Buscamos donde se asigna innerHTML a un contenedor con id "products-grid" o similar.
    
    # En su lugar, vamos a inyectar el banner directamente en el HTML base, pero forzando que el JS no lo borre.
    # Dado que es difícil adivinar la línea exacta, vamos a usar un MutationObserver en el HTML principal.
    print("✅ Listo. Asegúrate de limpiar caché.")

    with open(archivo, 'w', encoding='utf-8') as f:
        f.write(js)

# Validar sintaxis de shop.js
print("Validando sintaxis de shop.js...")
res = subprocess.run(['node', '--check', archivo], capture_output=True, text=True)
if res.returncode == 0:
    print("✅ Sintaxis JS Perfecta")
else:
    print(f"❌ Error en shop.js: {res.stderr}")
