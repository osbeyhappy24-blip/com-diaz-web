import os
import re

archivos = ['seller-panel.html', 'panel-vendedor.html']

css_final = """
<style id="ptl-ultimate-v5-css">
  @media (max-width: 768px) {
    /* Forzar 3 columnas y limpiar */
    #productsList {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 8px !important;
      padding: 5px !important;
      align-items: start !important;
    }

    /* La tarjeta contenedora */
    #productsList .ptl-card-real {
      display: flex !important;
      flex-direction: column !important;
      background: #131A2E !important;
      border: 1px solid #1F2A44 !important;
      border-radius: 8px !important;
      padding: 6px !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      height: 100% !important;
    }

    /* La imagen */
    #productsList .ptl-card-real img {
      width: 100% !important;
      height: 70px !important;
      object-fit: cover !important;
      border-radius: 6px !important;
      margin-bottom: 4px !important;
    }

    /* Los textos (título, categoría, precio, badge) */
    #productsList .ptl-card-real h3, 
    #productsList .ptl-card-real h4, 
    #productsList .ptl-card-real p, 
    #productsList .ptl-card-real span,
    #productsList .ptl-card-real div:not(.ptl-botones) {
      font-size: 9px !important;
      line-height: 1.2 !important;
      margin: 1px 0 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      width: 100% !important;
      text-align: left !important;
    }

    /* Precio resaltado */
    #productsList .ptl-card-real .ptl-precio {
      color: #22C55E !important;
      font-weight: bold !important;
      font-size: 11px !important;
    }

    /* Contenedor de botones */
    #productsList .ptl-card-real .ptl-botones {
      display: flex !important;
      gap: 4px !important;
      margin-top: auto !important;
      padding-top: 4px !important;
    }

    /* Botones mini */
    #productsList .ptl-card-real .ptl-botones button {
      flex: 1 !important;
      font-size: 8px !important;
      padding: 4px 2px !important;
      margin: 0 !important;
      border-radius: 4px !important;
      text-align: center !important;
    }
  }
</style>
"""

js_agrupador = """
<script id="ptl-ultimate-v5-js">
document.addEventListener('DOMContentLoaded', () => {
    const list = document.getElementById('productsList');
    if (!list) return;

    function agruparTarjetas() {
        // Si ya están agrupadas, no hacemos nada
        if (list.querySelector('.ptl-card-real')) return;

        const nodos = Array.from(list.childNodes);
        let tarjetaActual = null;

        nodos.forEach(nodo => {
            // Si es un elemento HTML y es una imagen (o contiene una)
            if (nodo.nodeType === 1 && (nodo.tagName === 'IMG' || nodo.querySelector('img') || nodo.style.backgroundImage !== '')) {
                tarjetaActual = document.createElement('div');
                tarjetaActual.className = 'ptl-card-real';
                list.insertBefore(tarjetaActual, nodo);
            }

            if (tarjetaActual) {
                // Si es el botón de editar/eliminar, lo metemos en su contenedor
                if (nodo.nodeType === 1 && (nodo.tagName === 'BUTTON' || (nodo.tagName === 'A' && (nodo.textContent.includes('Editar') || nodo.textContent.includes('Eliminar'))))) {
                    if (!tarjetaActual.querySelector('.ptl-botones')) {
                        const btnWrap = document.createElement('div');
                        btnWrap.className = 'ptl-botones';
                        tarjetaActual.appendChild(btnWrap);
                    }
                    tarjetaActual.querySelector('.ptl-botones').appendChild(nodo);
                } 
                // Si es el precio, le ponemos clase
                else if (nodo.nodeType === 1 && nodo.textContent && nodo.textContent.includes('$')) {
                    nodo.classList.add('ptl-precio');
                    tarjetaActual.appendChild(nodo);
                }
                // Cualquier otra cosa va dentro de la tarjeta
                else {
                    tarjetaActual.appendChild(nodo);
                }
            }
        });
    }

    agruparTarjetas();

    // Observar si la lista se recarga
    const observer = new MutationObserver(() => {
        agruparTarjetas();
    });
    observer.observe(list, { childList: true });
});
</script>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()
        
        # Limpiar inyecciones anteriores
        html = re.sub(r'<style id="ptl-grid-css">.*?</style>', '', html, flags=re.DOTALL)
        html = re.sub(r'<style id="ptl-grid-v4">.*?</style>', '', html, flags=re.DOTALL)
        html = re.sub(r'<style id="ptl-ultimate-css">.*?</style>', '', html, flags=re.DOTALL)
        html = re.sub(r'<script id="ptl-ultimate-js">.*?</script>', '', html, flags=re.DOTALL)
        
        # Inyectar la versión final
        if 'ptl-ultimate-v5-css' not in html:
            html = html.replace('</head>', css_final + '\n</head>')
            html = html.replace('</body>', js_agrupador + '\n</body>')
            
            with open(archivo, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"✅ SOLUCIÓN V5 inyectada en {archivo}")
        else:
            print(f"⚠️ {archivo} ya tiene la V5.")
