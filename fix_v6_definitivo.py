import os
import re

archivos = ['seller-panel.html', 'panel-vendedor.html']

css_v6 = """
<style id="ptl-v6-css">
  @media (max-width: 768px) {
    /* Forzar 3 columnas */
    #productsList {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 8px !important;
      padding: 5px !important;
    }
    
    /* Hacer que cada producto sea una tarjeta vertical */
    #productsList > div {
      display: flex !important;
      flex-direction: column !important;
      background: #131A2E !important;
      border: 1px solid #1F2A44 !important;
      border-radius: 8px !important;
      padding: 6px !important;
      overflow: hidden !important;
      height: 100% !important;
      margin: 0 !important;
      width: 100% !important;
      box-sizing: border-box !important;
      color: #F1F5F9 !important; /* Forzar texto blanco */
    }
    
    /* Achicar la imagen */
    #productsList > div img {
      width: 100% !important;
      height: 65px !important;
      object-fit: cover !important;
      border-radius: 6px !important;
      margin-bottom: 4px !important;
      flex-shrink: 0 !important;
    }
    
    /* Achicar los textos y hacer que se vean */
    #productsList > div h3,
    #productsList > div h4,
    #productsList > div p,
    #productsList > div span,
    #productsList > div > div:not([style*="background-image"]) {
      font-size: 9px !important;
      line-height: 1.1 !important;
      margin: 1px 0 !important;
      white-space: normal !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      width: 100% !important;
      text-align: left !important;
      color: #F1F5F9 !important; /* Texto visible */
    }
    
    /* Contenedor de botones al fondo */
    #productsList > div > div:last-child {
      display: flex !important;
      gap: 4px !important;
      margin-top: auto !important;
      padding-top: 6px !important;
      width: 100% !important;
    }
    
    /* Botones mini */
    #productsList > div button,
    #productsList > div a {
      flex: 1 !important;
      font-size: 8px !important;
      padding: 5px 2px !important;
      margin: 0 !important;
      border-radius: 4px !important;
      text-align: center !important;
      white-space: nowrap !important;
    }
  }
</style>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()

        # 1. ELIMINAR TODAS LAS INYECCIONES ANTERIORES (Limpieza profunda)
        html = re.sub(r'<style id="ptl-.*?-css">.*?</style>', '', html, flags=re.DOTALL)
        html = re.sub(r'<script id="ptl-.*?-js">.*?</script>', '', html, flags=re.DOTALL)
        html = re.sub(r'<style id="ptl-.*?">.*?</style>', '', html, flags=re.DOTALL)

        # 2. INYECTAR LA V6
        html = html.replace('</head>', css_v6 + '\n</head>')

        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ LIMPIEZA TOTAL Y V6 inyectada en {archivo}")
