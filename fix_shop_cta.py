import re, os, subprocess

archivo = 'shop.html'

banner_cta = """
<style id="ptl-cta-css">
  .ptl-cta-banner {
    background: linear-gradient(135deg, #131A2E 0%, #1F2A44 100%);
    border: 1px solid #22C55E;
    border-radius: 12px;
    padding: 15px 20px;
    margin: 15px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.2);
    position: relative;
    overflow: hidden;
  }
  .ptl-cta-banner::before {
    content: '';
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: radial-gradient(circle at top right, rgba(34, 197, 94, 0.15), transparent 70%);
    pointer-events: none;
  }
  .ptl-cta-text h3 {
    margin: 0 0 5px 0;
    color: #F1F5F9;
    font-size: 16px;
    font-weight: 800;
  }
  .ptl-cta-text p {
    margin: 0;
    color: #94A3B8;
    font-size: 12px;
  }
  .ptl-cta-btn {
    background: #22C55E;
    color: #0A0E1A;
    padding: 10px 18px;
    border-radius: 8px;
    font-weight: 800;
    font-size: 14px;
    text-decoration: none;
    white-space: nowrap;
    transition: transform 0.2s, background 0.2s;
    z-index: 1;
  }
  .ptl-cta-btn:hover {
    background: #1ea34d;
    transform: scale(1.05);
  }
</style>

<div class="ptl-cta-banner">
  <div class="ptl-cta-text">
    <h3>🚀 ¡Vende en Cuba!</h3>
    <p>Crea tu tienda gratis y llega a miles de clientes.</p>
  </div>
  <a href="seller.html" class="ptl-cta-btn">Crear Tienda</a>
</div>
"""

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()

    if 'ptl-cta-banner' not in html:
        # Insertar el banner justo antes de donde empiezan los productos o el listado
        # Buscamos el contenedor principal de productos o el buscador
        # Como no sabemos el ID exacto, lo insertamos justo antes del primer div que contenga "products"
        match = re.search(r'(<div[^>]*id="[^"]*products[^"]*"[^>]*>|<div[^>]*class="[^"]*products[^"]*"[^>]*>)', html)
        
        if match:
            html = html[:match.start()] + banner_cta + '\n' + html[match.start():]
            print(f"✅ Banner CTA inyectado antes del contenedor de productos en {archivo}")
        else:
            # Si no lo encuentra, lo inyecta justo después del buscador
            search_match = re.search(r'(<input[^>]*placeholder="Buscar[^>]*>)', html)
            if search_match:
                html = html[:search_match.end()] + '\n' + banner_cta + '\n' + html[search_match.end():]
                print(f"✅ Banner CTA inyectado después del buscador en {archivo}")
            else:
                print(f"⚠️ No se encontró un lugar exacto para el banner, inyectando al principio del body.")
                html = html.replace('<body>', '<body>\n' + banner_cta)

        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
    else:
        print(f"⚠️ El banner CTA ya existe en {archivo}")
