import re, os

archivo = 'seller.html'

css_seller_v2 = """
<style id="ptl-seller-visual-v2">
  /* 1. Fondo general */
  body, html { 
      background-color: #0A0E1A !important; 
      color: #F1F5F9 !important; 
  }

  /* 2. Forzar TODOS los títulos a blanco */
  h1, h2, h3, h4, h5, .title, .heading, .hero-title, .section-title { 
      color: #F1F5F9 !important; 
      text-shadow: 0 2px 4px rgba(0,0,0,0.8) !important;
  }
  
  /* 3. Textos generales */
  p, span, .subtitle, .description, label { 
      color: #94A3B8 !important; 
  }

  /* 4. Arreglar el cuadro raro de la tarjeta Básico */
  .plan-card {
      background: #131A2E !important;
      border: 1px solid #1F2A44 !important;
      border-radius: 12px !important;
      padding: 20px !important;
      margin-bottom: 15px !important;
  }
  
  /* Quitar bordes a los divs internos de las tarjetas */
  .plan-card div, .plan-card span, .plan-card p {
      border: none !important;
      background: transparent !important;
  }

  /* 5. Resaltar el plan seleccionado */
  .plan-card.active, .plan-card.selected {
      border: 2px solid #22C55E !important;
      box-shadow: 0 0 15px rgba(34, 197, 94, 0.2) !important;
  }
  
  /* 6. Precios y Checks */
  .plan-price, .precio {
      color: #22C55E !important;
      font-weight: 900 !important;
      font-size: 24px !important;
  }
  .plan-card li, .plan-card ul, .plan-features {
      color: #F1F5F9 !important;
  }

  /* 7. Inputs del formulario (para cuando se vean) */
  input, select, textarea {
      background-color: #131A2E !important;
      color: #F1F5F9 !important;
      border: 1px solid #1F2A44 !important;
      border-radius: 8px !important;
      padding: 12px !important;
      width: 100% !important;
      box-sizing: border-box !important;
  }
  input:focus, select:focus {
      border-color: #22C55E !important;
      outline: none !important;
  }
</style>
"""

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()

    # Eliminar el estilo anterior (v1) para no hacer conflicto
    html = re.sub(r'<style id="ptl-seller-visual-fix">.*?</style>', '', html, flags=re.DOTALL)
    
    # Inyectar el nuevo
    if 'ptl-seller-visual-v2' not in html:
        html = html.replace('</head>', css_seller_v2 + '\n</head>')
        
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ Estilos visuales V2 inyectados en seller.html")
