import re, os, subprocess

archivo_html = 'shop.html'

# CSS específico para las tarjetas de tiendas
css_tiendas = """
<style id="ptl-tiendas-estilos">
  .ptl-store-card {
      background: #131A2E !important;
      border: 1px solid #1F2A44 !important;
      border-radius: 12px !important;
      padding: 20px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      text-align: center !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important;
      transition: transform 0.2s !important;
  }
  .ptl-store-card:active {
      transform: scale(0.98) !important;
  }
  .ptl-store-name {
      color: #F1F5F9 !important;
      font-size: 18px !important;
      font-weight: 800 !important;
      margin: 0 0 5px 0 !important;
      white-space: normal !important;
      line-height: 1.2 !important;
  }
  .ptl-store-desc {
      color: #94A3B8 !important;
      font-size: 12px !important;
      margin: 0 0 12px 0 !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
      height: 34px !important;
  }
  .ptl-store-badge {
      background: rgba(34, 197, 94, 0.15) !important;
      color: #22C55E !important;
      padding: 6px 12px !important;
      border-radius: 20px !important;
      font-size: 11px !important;
      font-weight: 800 !important;
      margin-bottom: 15px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
  }
  .ptl-store-logo {
      width: 70px !important; height: 70px !important;
      border-radius: 50% !important; object-fit: cover !important;
      margin-bottom: 12px !important; border: 3px solid #22C55E !important;
  }
  .ptl-store-logo-initial {
      width: 70px !important; height: 70px !important;
      border-radius: 50% !important;
      background: linear-gradient(135deg, #1F2A44, #131A2E) !important;
      color: #22C55E !important; display: flex !important;
      align-items: center !important; justify-content: center !important;
      font-size: 28px !important; font-weight: bold !important;
      margin-bottom: 12px !important; border: 3px solid #22C55E !important;
  }
  .ptl-store-btn {
      background: #22C55E !important; color: #0A0E1A !important;
      padding: 12px 16px !important; border-radius: 8px !important;
      font-weight: 800 !important; font-size: 14px !important;
      text-decoration: none !important; width: 100% !important;
      box-sizing: border-box !important; display: block !important;
  }
</style>
"""

# Nuevo template de las tarjetas de tiendas
nuevo_template = """
            tiendasContainer.innerHTML = data.tiendas.map(t => `
                <div class="ptl-store-card">
                    ${t.logo 
                        ? `<img src="${t.logo}" class="ptl-store-logo">` 
                        : `<div class="ptl-store-logo-initial">${(t.nombre || 'T').charAt(0)}</div>`
                    }
                    <h3 class="ptl-store-name">${t.nombre}</h3>
                    <p class="ptl-store-desc">${t.descripcion || 'Tienda oficial en ProfitToLife'}</p>
                    <span class="ptl-store-badge">${t.numProductos || 0} productos</span>
                    <a href="tienda.html?slug=${t.slug}" class="ptl-store-btn">Visitar Tienda</a>
                </div>
            `).join('');
"""

if os.path.exists(archivo_html):
    with open(archivo_html, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Inyectar CSS (si no existe)
    if 'ptl-tiendas-estilos' not in html:
        html = html.replace('</head>', css_tiendas + '\n</head>')
        print("✅ CSS de tiendas inyectado")

    # 2. Reemplazar el template de JS antiguo por el nuevo con clases
    # Buscamos el bloque donde se genera el innerHTML de las tiendas
    patron_template = r"tiendasContainer\.innerHTML = data\.tiendas\.map\(t => `.*?`\)\.join\(''\);"
    
    if re.search(patron_template, html, flags=re.DOTALL):
        html = re.sub(patron_template, nuevo_template.strip(), html, flags=re.DOTALL)
        print("✅ Template JS actualizado con clases y colores forzados")
    else:
        print("⚠️ No se encontró el template antiguo. Asegúrate de haber subido la v3.")

    with open(archivo_html, 'w', encoding='utf-8') as f:
        f.write(html)

# Validar sintaxis de shop.js (por si acaso)
print("Validando sintaxis de shop.js...")
res = subprocess.run(['node', '--check', 'shop.js'], capture_output=True, text=True)
if res.returncode == 0:
    print("✅ Sintaxis JS Perfecta")
else:
    print(f"❌ Error en shop.js: {res.stderr}")
