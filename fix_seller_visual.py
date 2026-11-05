import re, os

archivo = 'seller.html'

css_seller = """
<style id="ptl-seller-visual-fix">
  /* 1. Fondo general oscuro */
  body, html { 
      background-color: #0A0E1A !important; 
      color: #F1F5F9 !important; 
  }

  /* 2. Arreglar títulos y textos */
  h1, h2, h3, h4, .title, .heading { 
      color: #F1F5F9 !important; 
      text-shadow: 0 2px 4px rgba(0,0,0,0.5) !important;
  }
  p, span, .subtitle, .description { 
      color: #94A3B8 !important; 
  }

  /* 3. Arreglar las tarjetas de los planes */
  .plan-card, .card, .plan {
      background: #131A2E !important;
      border: 1px solid #1F2A44 !important;
      border-radius: 12px !important;
      padding: 20px !important;
      margin-bottom: 15px !important;
  }
  .plan-card.active, .plan.selected {
      border: 2px solid #22C55E !important;
      box-shadow: 0 0 15px rgba(34, 197, 94, 0.2) !important;
  }
  
  /* 4. Los checks verdes y precios */
  .plan-card li, .plan-card ul, .plan-features {
      color: #F1F5F9 !important;
      list-style: none !important;
  }
  .plan-price, .precio {
      color: #22C55E !important;
      font-weight: 900 !important;
  }

  /* 5. Inputs del formulario */
  input, select, textarea {
      background-color: #131A2E !important;
      color: #F1F5F9 !important;
      border: 1px solid #1F2A44 !important;
      border-radius: 8px !important;
      padding: 12px !important;
  }
  input:focus, select:focus {
      border-color: #22C55E !important;
      outline: none !important;
  }
  input::placeholder { color: #64748B !important; }

  /* 6. Botón de Registro */
  button[type="submit"], .btn-primary {
      background: #22C55E !important;
      color: #0A0E1A !important;
      font-weight: 800 !important;
      border-radius: 8px !important;
      padding: 14px !important;
  }
</style>
"""

if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()
    if 'ptl-seller-visual-fix' not in html:
        html = html.replace('</head>', css_seller + '\n</head>')
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ Estilos visuales para Seller inyectados")
