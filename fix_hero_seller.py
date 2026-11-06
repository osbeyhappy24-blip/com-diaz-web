import re, os

archivo = 'seller.html'

css_hero = """
<style id="ptl-seller-hero-premium">
  /* 1. Ocultar el título negro y ponerlo blanco brillante */
  h1, h2, .hero-title, .main-title {
      color: #FFFFFF !important;
      font-weight: 900 !important;
      font-size: 28px !important;
      text-shadow: 0 2px 10px rgba(0,0,0,0.8) !important;
      line-height: 1.2 !important;
  }

  /* 2. Darle vida a la palabra ProfitToLife (asumiendo que es un span o h1) */
  h1 span, .hero-title span, .brand-highlight {
      color: #22C55E !important;
      text-shadow: 0 0 15px rgba(34, 197, 94, 0.6) !important;
  }

  /* 3. Arreglar el subtítulo "Tu negocio al alcance..." */
  .hero-subtitle, .subtitle, p.hero-text {
      color: #94A3B8 !important;
      font-size: 15px !important;
      font-weight: 500 !important;
      margin-top: 10px !important;
  }

  /* 4. Transformar las etiquetas (Gratis, Sin comisiones, etc.) en Píldoras Premium */
  .feature-badge, .badge-pill, .hero-features div {
      background: rgba(19, 26, 46, 0.8) !important;
      border: 1px solid rgba(34, 197, 94, 0.3) !important;
      color: #F1F5F9 !important;
      padding: 8px 16px !important;
      border-radius: 20px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 8px !important;
      margin-bottom: 8px !important;
      backdrop-filter: blur(10px) !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
      transition: transform 0.2s !important;
  }
  .feature-badge:active, .hero-features div:active {
      transform: scale(0.95) !important;
  }

  /* 5. Arreglar el texto "Crear tu cuenta" (que también estaba negro) */
  .form-title, h2.form-title, h3 {
      color: #F1F5F9 !important;
      font-weight: 800 !important;
  }

  /* 6. Fondo con un sutil resplandor para el Hero */
  .hero-section, .hero-container {
      position: relative !important;
      overflow: hidden !important;
      padding: 30px 15px !important;
  }
  .hero-section::before {
      content: '';
      position: absolute;
      top: -50%; left: -50%; width: 200%; height: 200%;
      background: radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.15), transparent 60%);
      z-index: 0;
      pointer-events: none;
  }
  .hero-content, .hero-section > * {
      position: relative !important;
      z-index: 1 !important;
  }
</style>
"""

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()

    # Eliminar estilos anteriores para no hacer conflicto
    html = re.sub(r'<style id="ptl-seller-visual-fix">.*?</style>', '', html, flags=re.DOTALL)
    html = re.sub(r'<style id="ptl-seller-visual-v2">.*?</style>', '', html, flags=re.DOTALL)
    
    # Inyectar el nuevo estilo premium
    if 'ptl-seller-hero-premium' not in html:
        html = html.replace('</head>', css_hero + '\n</head>')
        
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ Hero Section Premium inyectado en seller.html")
