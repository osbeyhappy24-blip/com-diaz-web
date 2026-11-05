import os
import re

archivos = ['seller-panel.html', 'panel-vendedor.html']

# 1. CSS Definitivo y Agresivo (Solo para móviles)
css_final = """
<style id="ptl-ultimate-css">
  @media (max-width: 768px) {
    /* Forzar 3 columnas exactas y limpiar la lista */
    #productsList {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 8px !important;
      padding: 5px !important;
      align-items: start !important;
    }

    /* Crear la tarjeta perfecta */
    #productsList .ptl-card-real {
      display: flex !important;
      flex-direction: column !important;
      background: #131A2E !important;
      border: 1px solid #1F2A44 !important;
      border-radius: 8px !important;
      padding: 6px !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      width: 100% !important;
      height: 100% !important;
      position: relative !important;
    }

    /* Imagen perfecta */
    #productsList .ptl-card-real img {
      width: 100% !important;
      height: 70px !important;
      object-fit: cover !important;
      border-radius: 6px !important;
      margin-bottom: 4px !important;
      display: block !important;
    }

    /* Textos achicados y cortados si son muy largos */
    #productsList .ptl-card-real h3, 
    #productsList .ptl-card-real h4, 
    #productsList .ptl-card-real p, 
    #productsList .ptl-card-real span {
      font-size: 9px !important;
      line-height: 1.1 !important;
      margin: 1px 0 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      width: 100% !important;
      text-align: left !important;
      display: block !important;
    }

    /* El precio resaltado */
    #productsList .ptl-card-real .ptl-precio {
      color: #22C55E !important;
      font-weight: bold !important;
      font-size: 11px !important;
      margin: 2px 0 !important;
    }

    /* Contenedor de botones (abajo y en fila) */
    #productsList .ptl-card-real .ptl-botones {
      display: flex !important;
      gap: 4px !important;
      margin-top: auto !important; /* Empuja los botones al fondo */
      padding-top: 4px !important;
      width: 100% !important;
    }

    /* Botones mini */
    #productsList .ptl-card-real .ptl-botones button, 
    #productsList .ptl-card-real .ptl-botones a {
      flex: 1 !important;
      font-size: 8px !important;
      padding: 4px 2px !important;
      margin: 0 !important;
      white-space: nowrap !important;
      border-radius: 4px !important;
      min-width: 0 !important;
      text-align: center !important;
    }

    /* Ocultar el badge PUBLICADO si molesta mucho, o achicarlo */
    #productsList .ptl-card-real .ptl-badge {
      font-size: 7px !important;
      padding: 2px 4px !important;
      border-radius: 4px !important;
      display: inline-block !important;
      width: auto !important;
      margin-top: 2px !important;
      background: rgba(34, 197, 94, 0.2) !important;
      color: #22C55E !important;
    }
  }
</style>
"""

# 2. JavaScript para reestructurar el HTML feo en Tarjetas Perfectas
js_restructurar = """
<script id="ptl-ultimate-js">
document.addEventListener('DOMContentLoaded', () => {
    const list = document.getElementById('productsList');
    if (!list) return;

    // Función para agrupar los elementos sueltos en tarjetas
    function arreglarTarjetas() {
        // Si ya están arregladas, no hacer nada
        if (list.querySelector('.ptl-card-real')) return;

        const children = Array.from(list.children);
        // Agrupamos cada 3 o 4 elementos (dependiendo de cómo el JS los inyecte)
        // Por lo general, un producto tiene: Imagen, Título, Precio, Categoría, Badge, Botones
        
        // En lugar de adivinar, buscamos las imágenes y creamos la tarjeta a partir de ahí
        let currentCard = null;
        
        children.forEach((el, index) => {
            // Si encontramos una imagen, es el inicio de un nuevo producto
            if (el.tagName === 'IMG' || el.querySelector('img') || (el.style.backgroundImage && el.style.backgroundImage !== 'none')) {
                currentCard = document.createElement('div');
                currentCard.className = 'ptl-card-real';
                list.insertBefore(currentCard, el);
            }

            if (currentCard) {
                // Mover el elemento a la tarjeta
                currentCard.appendChild(el);
                
                // Detectar botones para meterlos en su propio contenedor
                if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.innerHTML.includes('Editar') || el.innerHTML.includes('Eliminar')) {
                    el.classList.add('ptl-btn');
                    if (!currentCard.querySelector('.ptl-botones')) {
                        const btnWrap = document.createElement('div');
                        btnWrap.className = 'ptl-botones';
                        currentCard.appendChild(btnWrap);
                    }
                    currentCard.querySelector('.ptl-botones').appendChild(el);
                } 
                // Detectar precios
                else if (el.textContent.includes('$')) {
                    el.classList.add('ptl-precio');
                }
                // Detectar badges
                else if (el.textContent.includes('PUBLICADO') || el.textContent.includes('Oculto')) {
                    el.classList.add('ptl-badge');
                }
            }
        });
    }

    // Ejecutar cuando cargue
    arreglarTarjetas();

    // Observar si la lista cambia (cuando el JS recarga los productos)
    const observer = new MutationObserver((mutations) => {
        arreglarTarjetas();
    });
    observer.observe(list, { childList: true });
});
</script>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()
        
        # 1. Eliminar CSS viejos que están causando conflicto
        html = re.sub(r'<style id="ptl-grid-css">.*?</style>', '', html, flags=re.DOTALL)
        html = re.sub(r'<style id="ptl-grid-v4">.*?</style>', '', html, flags=re.DOTALL)
        
        # 2. Inyectar el nuevo CSS y JS
        if 'ptl-ultimate-css' not in html:
            html = html.replace('</head>', css_final + '\n</head>')
            html = html.replace('</body>', js_restructurar + '\n</body>')
            
            with open(archivo, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"✅ ESTILO DEFINITIVO inyectado en {archivo}")
        else:
            print(f"⚠️ {archivo} ya tiene el estilo definitivo.")
