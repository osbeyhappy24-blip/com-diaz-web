import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

js_nuevo = """
function renderProductos() {
  const list = document.getElementById('productsList');
  if (!productos.length) {
    list.innerHTML = '<div class="empty">Aún no tienes productos.<br>Toca "➕ Añadir producto" para empezar.</div>';
    return;
  }

  // 1. Filtrar SOLO publicados (y que no estén eliminados)
  let filtrados = productos.filter(p => p.publicado === true || p.publicado === 1);
  
  // 2. Aplicar buscador si existe
  const searchInput = document.getElementById('ptlSearchBar');
  if (searchInput && searchInput.value.trim() !== '') {
      const term = searchInput.value.toLowerCase();
      filtrados = filtrados.filter(p => (p.titulo || '').toLowerCase().includes(term));
  }

  if (!filtrados.length) {
      list.innerHTML = '<div class="empty">No se encontraron productos publicados.</div>';
      return;
  }

  list.innerHTML = filtrados.map(p => {
    const img = (p.imagenes && p.imagenes[0]) || 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 70 70%22><rect fill=%22%23111827%22 width=%2270%22 height=%2270%22/><text x=%2235%22 y=%2238%22 font-size=%2210%22 fill=%22%2364748b%22 text-anchor=%22middle%22>Sin img</text></svg>';
    const tituloCorto = (p.titulo || '').substring(0, 12) + ((p.titulo || '').length > 12 ? '...' : '');
    return `
      <div class="ptl-product-card" onclick="abrirAcciones('${p.id}')">
        <img class="ptl-product-img" src="${img}" alt="">
        <div class="ptl-product-price">$${Number(p.precio_usd || 0).toFixed(2)}</div>
        <div class="ptl-product-title-mini">${tituloCorto}</div>
      </div>
    `;
  }).join('');
}

// Función para abrir el modal de pago correctamente
function abrirModalPago(plan) {
    document.getElementById('ptlPlanNombre').innerText = plan;
    const modal = document.getElementById('ptlModalPago');
    if (modal) modal.style.display = 'flex';
    
    const waBtn = document.getElementById('ptlBtnWA');
    if (waBtn) waBtn.href = `https://wa.me/5358980267?text=Hola,%20quiero%20actualizar%20mi%20plan%20a%20${plan}%20en%20ProfitToLife`;
}
"""

css_extra = """
<style id="ptl-bugs-fix-css">
  /* Ocultar el modal de pago por defecto */
  #ptlModalPago {
      display: none !important;
      position: fixed !important;
      top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important;
      background: rgba(10, 14, 26, 0.85) !important;
      z-index: 99999 !important;
      justify-content: center !important;
      align-items: center !important;
  }
  /* Estilo del buscador */
  #ptlSearchBar {
      width: 100%;
      padding: 12px 15px;
      margin-bottom: 15px;
      border-radius: 8px;
      border: 1px solid #1F2A44;
      background: #131A2E;
      color: #F1F5F9;
      font-size: 14px;
      box-sizing: border-box;
  }
</style>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()

        # 1. Inyectar CSS
        if 'ptl-bugs-fix-css' not in html:
            html = html.replace('</head>', css_extra + '\n</head>')

        # 2. Inyectar Buscador antes de #productsList
        if 'ptlSearchBar' not in html:
            html = html.replace(
                '<div class="products-list" id="productsList">',
                '<input type="text" id="ptlSearchBar" placeholder="🔍 Buscar producto publicado..." oninput="renderProductos()">\n<div class="products-list" id="productsList">'
            )

        # 3. Reemplazar renderProductos
        inicio = html.find('function renderProductos()')
        if inicio != -1:
            # Encontrar el fin contando llaves
            idx = html.find('{', inicio)
            nivel = 1
            i = idx + 1
            while i < len(html) and nivel > 0:
                if html[i] == '{': nivel += 1
                elif html[i] == '}': nivel -= 1
                i += 1
            fin = i
            html = html[:inicio] + js_nuevo + html[fin:]

        # 4. Arreglar los botones de "Actualizar a Pro/Premium"
        # Buscamos si tienen onclick viejos y los reemplazamos por abrirModalPago()
        html = html.replace('onclick="document.getElementById(\'ptlModalPago\').style.display=\'flex\'"', 'onclick="abrirModalPago(\'Pro\')"')
        
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ Bugs corregidos en {archivo}")
