import os

archivos = ['seller-panel.html', 'panel-vendedor.html']

css_extra = """
<style id="ptl-grid-css">
  /* Convertir la lista en cuadrícula */
  #productsList {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important; /* 3 columnas exactas */
    gap: 8px !important;
    padding: 0 5px !important;
  }
  
  /* Hacer las tarjetas más pequeñas y ajustadas */
  #productsList > div {
    margin: 0 !important;
    padding: 8px !important;
    font-size: 12px !important;
    border-radius: 8px !important;
  }
  
  /* Achicar las imágenes dentro de las tarjetas */
  #productsList > div img {
    height: 80px !important;
    object-fit: cover !important;
    border-radius: 6px !important;
  }

  /* Estilo del buscador */
  #ptlBuscador {
    width: calc(100% - 20px);
    margin: 10px;
    padding: 10px 15px;
    border-radius: 20px;
    border: 1px solid #1F2A44;
    background: #131A2E;
    color: #F1F5F9;
    font-size: 14px;
    outline: none;
  }
</style>
"""

js_extra = """
<script id="ptl-buscador-js">
document.addEventListener('DOMContentLoaded', () => {
    const list = document.getElementById('productsList');
    if (list && !document.getElementById('ptlBuscador')) {
        // Crear buscador
        const input = document.createElement('input');
        input.id = 'ptlBuscador';
        input.placeholder = '🔍 Buscar producto...';
        
        // Insertarlo justo antes de la lista
        list.parentNode.insertBefore(input, list);
        
        // Lógica de filtrado
        input.addEventListener('input', (e) => {
            const texto = e.target.value.toLowerCase();
            const items = list.children;
            for (let item of items) {
                if(item.classList.contains('empty')) continue;
                const match = item.textContent.toLowerCase().includes(texto);
                item.style.display = match ? '' : 'none';
            }
        });
    }
});
</script>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()
        
        if 'ptl-grid-css' not in html:
            html = html.replace('</head>', css_extra + '\n</head>')
            html = html.replace('</body>', js_extra + '\n</body>')
            
            with open(archivo, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"✅ Cuadrícula y Buscador inyectados en {archivo}")
        else:
            print(f"⚠️ {archivo} ya tiene la cuadrícula.")
