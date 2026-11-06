import re, os

archivo = 'seller.html'

css_layout = """
<style id="ptl-seller-hero-layout">
  /* 1. Forzar que toda la sección superior sea una columna centrada */
  body > div:first-child, 
  .hero, 
  .hero-section, 
  .header-hero,
  main > div:first-child {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      padding: 30px 20px !important;
      gap: 15px !important;
      background: transparent !important;
  }

  /* 2. Arreglar el texto "Vende en" (que estaba negro) */
  h1, h2, .hero-title, .title {
      color: #F1F5F9 !important;
      font-size: 26px !important;
      font-weight: 900 !important;
      margin: 0 !important;
      line-height: 1.2 !important;
      text-shadow: 0 4px 10px rgba(0,0,0,0.5) !important;
  }

  /* 3. El color verde de ProfitToLife (asumiendo que es un span o está en un div) */
  .hero-title span, h1 span, .brand-green {
      color: #22C55E !important;
      text-shadow: 0 0 15px rgba(34, 197, 94, 0.4) !important;
  }

  /* 4. Subtítulo "Tu negocio al alcance..." */
  .hero-subtitle, p, .subtitle {
      color: #94A3B8 !important;
      font-size: 15px !important;
      margin: 0 !important;
  }

  /* 5. Las etiquetas (Gratis, Sin comisiones, etc.) en fila y centradas */
  .hero-features, .features, .badges {
      display: flex !important;
      flex-wrap: wrap !important;
      justify-content: center !important;
      gap: 10px !important;
      margin-top: 10px !important;
  }

  /* 6. Diseño de las píldoras (Glassmorphism) */
  .hero-features div, .features div, .badge-pill {
      background: rgba(19, 26, 46, 0.8) !important;
      border: 1px solid rgba(34, 197, 94, 0.4) !important;
      color: #F1F5F9 !important;
      padding: 8px 16px !important;
      border-radius: 20px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
  }

  /* 7. Separar el logo del texto */
  .logo, .brand-logo, .hero-logo {
      margin-bottom: 10px !important;
      border-radius: 20px !important;
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.3) !important;
  }

  /* 8. Arreglar el texto "Crear tu cuenta" */
  h2, h3, .form-title {
      color: #F1F5F9 !important;
      font-weight: 800 !important;
      margin-top: 20px !important;
  }
</style>
"""

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()

    # Eliminar estilos anteriores para limpiar
    html = re.sub(r'<style id="ptl-seller-visual-fix">.*?</style>', '', html, flags=re.DOTALL)
    html = re.sub(r'<style id="ptl-seller-visual-v2">.*?</style>', '', html, flags=re.DOTALL)
    html = re.sub(r'<style id="ptl-seller-hero-premium">.*?</style>', '', html, flags=re.DOTALL)
    
    # Inyectar el nuevo estilo de layout
    if 'ptl-seller-hero-layout' not in html:
        html = html.replace('</head>', css_layout + '\n</head>')
        
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ Layout del Hero de Seller inyectado (Centrado y Espacioso)")
