import os

archivos = ['seller-panel.html', 'panel-vendedor.html']

css_extra = """
<style id="ptl-grid-v4">
  @media (max-width: 768px) {
    /* Forzar 3 columnas */
    #productsList {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 6px !important;
      padding: 0 4px !important;
    }
    
    /* Tarjeta compacta */
    #productsList > div {
      margin: 0 !important;
      padding: 5px !important;
      font-size: 10px !important;
      border-radius: 6px !important;
      min-width: 0 !important; /* Permite que se encoja */
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
    }
    
    /* Imagen pequeña */
    #productsList > div img {
      height: 60px !important;
      width: 100% !important;
      object-fit: cover !important;
      border-radius: 4px !important;
      margin-bottom: 4px !important;
    }
    
    /* Título cortado si es muy largo */
    #productsList > div h4, 
    #productsList > div h3, 
    #productsList > div .title {
      font-size: 11px !important;
      line-height: 1.2 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      margin: 2px 0 !important;
    }
    
    /* Precio y categoría */
    #productsList > div p, 
    #productsList > div span {
      font-size: 10px !important;
      margin: 1px 0 !important;
    }

    /* Botones de Editar/Eliminar pequeños y en fila */
    #productsList > div button, 
    #productsList > div a {
      padding: 4px !important;
      font-size: 9px !important;
      margin: 1px 0 !important;
      flex: 1 !important; /* Se reparten el espacio */
    }
    
    /* Contenedor de botones */
    #productsList > div > div:last-child {
      display: flex !important;
      gap: 3px !important;
      margin-top: 4px !important;
    }
  }
</style>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()
        
        if 'ptl-grid-v4' not in html:
            html = html.replace('</head>', css_extra + '\n</head>')
            with open(archivo, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"✅ Modo Compacto V4 inyectado en {archivo}")
        else:
            print(f"⚠️ {archivo} ya tiene el Modo Compacto V4.")
