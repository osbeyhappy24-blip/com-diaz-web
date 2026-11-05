import re, os, subprocess

archivo_html = 'tienda.html'

css_tienda = """
<style id="ptl-tienda-visual-fix">
  /* 1. Fondo general oscuro para toda la tienda */
  body, html { 
      background-color: #0A0E1A !important; 
      color: #F1F5F9 !important; 
  }

  /* 2. Eliminar fondos blancos de los contenedores */
  .tienda-header, .tienda-info, .main-container, .container, .store-details {
      background-color: transparent !important;
      background: transparent !important;
  }

  /* 3. Nombre de la tienda y descripción */
  h1, h2, h3, .tienda-nombre, .store-name { 
      color: #F1F5F9 !important; 
      text-shadow: 0 2px 4px rgba(0,0,0,0.5) !important;
  }
  p, .tienda-descripcion, .store-description, .descripcion { 
      color: #94A3B8 !important; 
  }

  /* 4. Estadísticas (11 productos, 1 provincia, 5 categorías) */
  .tienda-stats, .store-stats, .stats-bar, .stats span, .tienda-stats span {
      color: #F1F5F9 !important;
      background: #131A2E !important;
      padding: 4px 10px !important;
      border-radius: 12px !important;
      border: 1px solid #1F2A44 !important;
  }

  /* 5. Botones de la tienda (Compartir, Contactar) */
  .btn-compartir, .btn-contactar { 
      color: #FFF !important; 
      font-weight: 800 !important;
  }

  /* 6. Pestañas de categorías (Todo, Pianos...) */
  .categorias-tabs, .tabs-container, .tabs { 
      background: #131A2E !important; 
      border-radius: 12px !important;
      padding: 8px !important;
      border: 1px solid #1F2A44 !important;
  }
  .categoria-btn, .tab-btn, .tabs button, .tabs a {
      color: #94A3B8 !important;
      background: transparent !important;
      font-weight: bold !important;
  }
  .categoria-btn.active, .tab-btn.active, .tabs button.active, .tabs a.active {
      background: #22C55E !important;
      color: #0A0E1A !important;
      border-radius: 8px !important;
  }

  /* 7. Barra de búsqueda */
  input[type="text"], input[type="search"], .search-input {
      background-color: #131A2E !important;
      color: #F1F5F9 !important;
      border: 1px solid #1F2A44 !important;
  }
  input::placeholder { color: #64748B !important; }

  /* 8. Arreglar la superposición del logo de ProfitToLife */
  .brand-logo, .ptl-logo-container { 
      position: relative !important; 
      z-index: 1 !important; 
      margin-top: -10px !important; 
  }

  /* 9. Si el banner superior está roto, darle un color de fondo */
  .banner-container, .tienda-banner {
      background-color: #004d65 !important; /* Color base de MTM */
      min-height: 120px !important;
  }
</style>
"""

if os.path.exists(archivo_html):
    with open(archivo_html, 'r', encoding='utf-8') as f:
        html = f.read()

    if 'ptl-tienda-visual-fix' not in html:
        html = html.replace('</head>', css_tienda + '\n</head>')
        with open(archivo_html, 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ Estilos de tienda (Modo Oscuro forzado) inyectados en tienda.html")
    else:
        print("⚠️ Los estilos ya estaban inyectados.")
