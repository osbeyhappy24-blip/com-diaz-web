import re, os, subprocess

archivo = 'shop.js'

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        js = f.read()

    # Función que renderiza SOLO las tiendas
    funcion_tiendas = """
// === RENDERIZADO EXCLUSIVO DE TIENDAS ===
window._renderSoloTiendas = async function() {
    const grid = document.getElementById('productsGrid') || document.querySelector('.products-grid') || document.querySelector('main');
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align:center; padding:20px; color:#94A3B8;">Cargando tiendas...</div>';

    try {
        const res = await fetch(API + '/api/public/tiendas');
        const data = await res.json();
        
        if (!data.ok || !data.tiendas || data.tiendas.length === 0) {
            grid.innerHTML = '<div style="text-align:center; padding:20px; color:#94A3B8;">No hay tiendas disponibles aún.</div>';
            return;
        }

        // Ocultar contadores de productos, mostrar contador de tiendas
        const contador = document.getElementById('resultsCount');
        if (contador) contador.textContent = data.tiendas.length + ' tiendas';

        grid.innerHTML = data.tiendas.map(t => `
            <div style="background:#131A2E; border:1px solid #1F2A44; border-radius:12px; padding:15px; display:flex; flex-direction:column; align-items:center; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.2);">
                ${t.logo ? `<img src="${t.logo}" style="width:60px; height:60px; border-radius:50%; object-fit:cover; margin-bottom:10px; border:2px solid #22C55E;">` : `<div style="width:60px; height:60px; border-radius:50%; background:#1F2A44; color:#22C55E; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:bold; margin-bottom:10px;">${t.nombre.charAt(0)}</div>`}
                <h3 style="margin:0 0 5px 0; color:#F1F5F9; font-size:16px; font-weight:800;">${t.nombre}</h3>
                <p style="margin:0 0 15px 0; color:#94A3B8; font-size:12px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${t.descripcion || 'Tienda oficial en ProfitToLife'}</p>
                <a href="tienda.html?slug=${t.slug}" style="background:#22C55E; color:#0A0E1A; padding:8px 16px; border-radius:8px; font-weight:bold; font-size:12px; text-decoration:none; width:100%; box-sizing:border-box;">Visitar Tienda</a>
            </div>
        `).join('');
    } catch(e) {
        console.error('Error cargando tiendas:', e);
        grid.innerHTML = '<div style="text-align:center; padding:20px; color:#f87171;">Error al cargar las tiendas.</div>';
    }
};
"""

    if '_renderSoloTiendas' not in js:
        js = funcion_tiendas + '\n' + js
        print("✅ Función de renderizado exclusivo de tiendas inyectada")

    # Interceptar el clic de la pestaña "Tiendas"
    # Buscamos cualquier botón o enlace que tenga el texto "Tiendas"
    interceptor = """
// INTERCEPTOR DE PESTAÑA TIENDAS
document.addEventListener('click', function(e) {
    let target = e.target;
    while (target && target !== document) {
        if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'DIV') {
            const txt = (target.innerText || target.textContent || '').trim();
            if (txt === '🏪 Tiendas' || txt === 'Tiendas') {
                e.preventDefault();
                e.stopPropagation();
                
                // Cambiar el estado activo visualmente (opcional)
                document.querySelectorAll('.tab-btn, .category-btn, button').forEach(b => b.classList.remove('active'));
                if (target.classList.contains('tab-btn') || target.tagName === 'BUTTON') {
                    target.classList.add('active');
                }

                // Ejecutar nuestro renderizado
                if (typeof window._renderSoloTiendas === 'function') {
                    window._renderSoloTiendas();
                }
                return;
            }
        }
        target = target.parentNode;
    }
}, true); // true para capturar antes que el JS original
"""

    if 'INTERCEPTOR DE PESTAÑA TIENDAS' not in js:
        js = js + '\n' + interceptor
        print("✅ Interceptor de pestaña inyectado")

    with open(archivo, 'w', encoding='utf-8') as f:
        f.write(js)

# Validar sintaxis
print("Validando sintaxis de shop.js...")
res = subprocess.run(['node', '--check', archivo], capture_output=True, text=True)
if res.returncode == 0:
    print("✅ Sintaxis JS Perfecta")
else:
    print(f"❌ Error en shop.js: {res.stderr}")
