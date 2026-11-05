import re, os, subprocess

# 1. LIMPIAR EL shop.js DE INTENTOS ANTERIORES
archivo_js = 'shop.js'
if os.path.exists(archivo_js):
    with open(archivo_js, 'r', encoding='utf-8') as f:
        js = f.read()
    # Eliminar inyecciones previas para no causar conflictos
    js = re.sub(r'// === RENDERIZADO EXCLUSIVO DE TIENDAS ===.*?\n\};\n', '', js, flags=re.DOTALL)
    js = re.sub(r'// INTERCEPTOR DE PESTAÑA TIENDAS.*?\}, false\);', '', js, flags=re.DOTALL)
    js = re.sub(r'// INTERCEPTOR DE PESTAÑA TIENDAS.*?\}, true\);', '', js, flags=re.DOTALL)
    with open(archivo_js, 'w', encoding='utf-8') as f:
        f.write(js)
    print("✅ shop.js limpio de intentos anteriores")

# 2. INYECTAR EL SCRIPT DEFINITIVO EN shop.html
archivo_html = 'shop.html'
script_html = """
<script id="ptl-tiendas-definitivo">
document.addEventListener('DOMContentLoaded', () => {
    const tiendasContainer = document.getElementById('tiendasContainer');
    const productosContainer = document.getElementById('featuredProducts');
    
    if (!tiendasContainer || !productosContainer) return;

    // Función para cargar y mostrar las tiendas
    async function cargarTiendasReales() {
        tiendasContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#94A3B8;">Cargando tiendas...</div>';
        
        try {
            const API = 'https://com-diaz-ty2b.onrender.com';
            const res = await fetch(API + '/api/public/tiendas');
            const data = await res.json();
            
            if (!data.ok || !data.tiendas || data.tiendas.length === 0) {
                tiendasContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#94A3B8;">No hay tiendas disponibles.</div>';
                return;
            }

            // Actualizar contador
            const contador = document.getElementById('resultsCount');
            if (contador) contador.textContent = data.tiendas.length + ' tiendas';

            // Dibujar las tarjetas
            tiendasContainer.innerHTML = data.tiendas.map(t => `
                <div style="background:#131A2E; border:1px solid #1F2A44; border-radius:12px; padding:20px; display:flex; flex-direction:column; align-items:center; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.3); transition: transform 0.2s;">
                    ${t.logo 
                        ? `<img src="${t.logo}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; margin-bottom:12px; border:3px solid #22C55E;">` 
                        : `<div style="width:70px; height:70px; border-radius:50%; background:linear-gradient(135deg, #1F2A44, #131A2E); color:#22C55E; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:bold; margin-bottom:12px; border:3px solid #22C55E;">${(t.nombre || 'T').charAt(0)}</div>`
                    }
                    <h3 style="margin:0 0 5px 0; color:#F1F5F9; font-size:18px; font-weight:800;">${t.nombre}</h3>
                    <p style="margin:0 0 8px 0; color:#94A3B8; font-size:12px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; height:34px;">${t.descripcion || 'Tienda oficial en ProfitToLife'}</p>
                    <span style="background:rgba(34, 197, 94, 0.1); color:#22C55E; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:bold; margin-bottom:15px;">${t.numProductos || 0} productos</span>
                    <a href="tienda.html?slug=${t.slug}" style="background:#22C55E; color:#0A0E1A; padding:10px 16px; border-radius:8px; font-weight:800; font-size:14px; text-decoration:none; width:100%; box-sizing:border-box; transition: background 0.2s;">Visitar Tienda</a>
                </div>
            `).join('');
        } catch(e) {
            console.error('Error:', e);
            tiendasContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#f87171;">Error al cargar las tiendas. Revisa tu conexión.</div>';
        }
    }

    // Interceptar clics en las pestañas superiores
    document.addEventListener('click', function(e) {
        let target = e.target;
        while (target && target !== document) {
            const txt = (target.innerText || target.textContent || '').trim();
            
            // Si toca "Tiendas"
            if (txt === '🏪 Tiendas' || txt === 'Tiendas') {
                e.preventDefault();
                e.stopPropagation();
                
                // Ocultar productos, mostrar tiendas
                productosContainer.classList.add('hidden');
                tiendasContainer.classList.remove('hidden');
                
                // Cargar datos
                cargarTiendasReales();
                return;
            }
            
            // Si toca "Todo" o "Vendedores", restaurar vista de productos
            if (txt === '🛍️ Todo' || txt === 'Todo' || txt === '🏷️ Vendedores' || txt === 'Vendedores') {
                // Dejar que el código original haga su trabajo, pero asegurarnos de ocultar tiendas
                tiendasContainer.classList.add('hidden');
                productosContainer.classList.remove('hidden');
                // No hacemos preventDefault para que el código original filtre
            }
            
            target = target.parentNode;
        }
    }, true);
});
</script>
"""

if os.path.exists(archivo_html):
    with open(archivo_html, 'r', encoding='utf-8') as f:
        html = f.read()

    # Eliminar cualquier script de tiendas previo para no duplicar
    html = re.sub(r'<script id="ptl-tiendas-definitivo">.*?</script>', '', html, flags=re.DOTALL)
    
    # Inyectar el nuevo antes de cerrar body
    html = html.replace('</body>', script_html + '\n</body>')

    with open(archivo_html, 'w', encoding='utf-8') as f:
        f.write(html)
    print("✅ Script definitivo inyectado en shop.html")

# Validar sintaxis JS de shop.js
print("Validando sintaxis de shop.js...")
res = subprocess.run(['node', '--check', 'shop.js'], capture_output=True, text=True)
if res.returncode == 0:
    print("✅ Sintaxis JS Perfecta")
else:
    print(f"❌ Error en shop.js: {res.stderr}")
