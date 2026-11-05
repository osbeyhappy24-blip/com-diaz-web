import re, os, subprocess

archivo_html = 'shop.html'

nuevo_script = """
<style id="ptl-tiendas-css">
  /* Ocultar productos cuando estamos en modo tiendas */
  body.ptl-modo-tiendas #featuredProducts,
  body.ptl-modo-tiendas .products-grid,
  body.ptl-modo-tiendas #productsGrid {
      display: none !important;
  }
  
  /* Mostrar tiendas cuando estamos en modo tiendas */
  body.ptl-modo-tiendas #tiendasContainer {
      display: grid !important;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
      padding: 15px;
  }

  /* Ocultar tiendas cuando NO estamos en modo tiendas */
  body:not(.ptl-modo-tiendas) #tiendasContainer {
      display: none !important;
  }
</style>

<script id="ptl-tiendas-definitivo-v3">
document.addEventListener('DOMContentLoaded', () => {
    const tiendasContainer = document.getElementById('tiendasContainer');
    const productosContainer = document.getElementById('featuredProducts');
    const API = 'https://com-diaz-ty2b.onrender.com';
    let tiendasCargadas = false;

    async function cargarTiendasReales() {
        if (tiendasCargadas) return; // Evitar recargar si ya están
        tiendasContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#94A3B8; grid-column: 1 / -1;">Cargando tiendas...</div>';
        
        try {
            const res = await fetch(API + '/api/public/tiendas');
            const data = await res.json();
            
            if (!data.ok || !data.tiendas || data.tiendas.length === 0) {
                tiendasContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#94A3B8; grid-column: 1 / -1;">No hay tiendas disponibles.</div>';
                return;
            }

            tiendasContainer.innerHTML = data.tiendas.map(t => `
                <div style="background:#131A2E; border:1px solid #1F2A44; border-radius:12px; padding:20px; display:flex; flex-direction:column; align-items:center; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.3);">
                    ${t.logo 
                        ? `<img src="${t.logo}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; margin-bottom:12px; border:3px solid #22C55E;">` 
                        : `<div style="width:70px; height:70px; border-radius:50%; background:linear-gradient(135deg, #1F2A44, #131A2E); color:#22C55E; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:bold; margin-bottom:12px; border:3px solid #22C55E;">${(t.nombre || 'T').charAt(0)}</div>`
                    }
                    <h3 style="margin:0 0 5px 0; color:#F1F5F9; font-size:18px; font-weight:800;">${t.nombre}</h3>
                    <p style="margin:0 0 8px 0; color:#94A3B8; font-size:12px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; height:34px;">${t.descripcion || 'Tienda oficial en ProfitToLife'}</p>
                    <span style="background:rgba(34, 197, 94, 0.1); color:#22C55E; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:bold; margin-bottom:15px;">${t.numProductos || 0} productos</span>
                    <a href="tienda.html?slug=${t.slug}" style="background:#22C55E; color:#0A0E1A; padding:10px 16px; border-radius:8px; font-weight:800; font-size:14px; text-decoration:none; width:100%; box-sizing:border-box;">Visitar Tienda</a>
                </div>
            `).join('');
            
            const contador = document.getElementById('resultsCount');
            if (contador) contador.textContent = data.tiendas.length + ' tiendas';
            
            tiendasCargadas = true;
        } catch(e) {
            console.error('Error:', e);
            tiendasContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#f87171; grid-column: 1 / -1;">Error al cargar las tiendas. Revisa tu conexión.</div>';
        }
    }

    document.addEventListener('click', function(e) {
        let target = e.target;
        while (target && target !== document) {
            const txt = (target.innerText || target.textContent || '').trim();
            
            if (txt === '🏪 Tiendas' || txt === 'Tiendas') {
                e.preventDefault();
                e.stopPropagation();
                
                // Activar modo tiendas vía CSS
                document.body.classList.add('ptl-modo-tiendas');
                
                // Cargar datos si no están
                cargarTiendasReales();
                return;
            }
            
            if (txt === '🛍️ Todo' || txt === 'Todo' || txt === '🏷️ Vendedores' || txt === 'Vendedores') {
                // Quitar modo tiendas
                document.body.classList.remove('ptl-modo-tiendas');
                // Dejar que el código original haga su trabajo
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

    # Eliminar script anterior de tiendas
    html = re.sub(r'<script id="ptl-tiendas-definitivo">.*?</script>', '', html, flags=re.DOTALL)
    # Inyectar el nuevo
    html = html.replace('</body>', nuevo_script + '\n</body>')

    with open(archivo_html, 'w', encoding='utf-8') as f:
        f.write(html)
    print("✅ Lógica CSS + JS v3 inyectada en shop.html")

# Validar sintaxis de shop.js (por si acaso)
print("Validando sintaxis de shop.js...")
res = subprocess.run(['node', '--check', 'shop.js'], capture_output=True, text=True)
if res.returncode == 0:
    print("✅ Sintaxis JS Perfecta")
else:
    print(f"❌ Error en shop.js: {res.stderr}")
