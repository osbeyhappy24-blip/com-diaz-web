import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

nuevo_codigo = """
function renderProductos() {
  const list = document.getElementById('productsList');
  if (!productos.length) {
    list.innerHTML = '<div class="empty">Aún no tienes productos.<br>Toca "➕ Añadir producto" para empezar.</div>';
    return;
  }
  list.innerHTML = productos.map(p => {
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

function abrirAcciones(id) {
    const p = productos.find(x => String(x.id) === String(id));
    if (!p) return;
    
    let modal = document.getElementById('modalAccionesProducto');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalAccionesProducto';
        modal.className = 'ptl-modal-acciones';
        document.body.appendChild(modal);
    }

    const img = (p.imagenes && p.imagenes[0]) || '';
    
    modal.innerHTML = `
        <div class="ptl-modal-content">
            <img src="${img}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:10px;">
            <h3 style="margin:0 0 5px 0; color:#F1F5F9; font-size:16px;">${p.titulo}</h3>
            <p style="margin:0 0 10px 0; color:#22C55E; font-weight:bold; font-size:18px;">$${Number(p.precio_usd || 0).toFixed(2)}</p>
            <p style="margin:0 0 15px 0; color:#94A3B8; font-size:12px;">${p.categoria || 'Sin categoría'} · ${p.publicado ? 'Publicado' : 'Oculto'}</p>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <button onclick="editar('${p.id}'); document.getElementById('modalAccionesProducto').style.display='none';" style="padding:12px; background:#3B82F6; color:white; border:none; border-radius:8px; font-weight:bold; font-size:14px;">✏️ Editar</button>
                <button onclick="eliminar('${p.id}'); document.getElementById('modalAccionesProducto').style.display='none';" style="padding:12px; background:#EF4444; color:white; border:none; border-radius:8px; font-weight:bold; font-size:14px;">🗑️ Eliminar</button>
            </div>
            <button onclick="document.getElementById('modalAccionesProducto').style.display='none';" style="margin-top:15px; width:100%; padding:12px; background:transparent; color:#94A3B8; border:1px solid #1F2A44; border-radius:8px; font-size:14px;">Cerrar</button>
        </div>
    `;
    modal.style.display = 'flex';
}
"""

css_new = """
<style id="ptl-final-css">
  @media (max-width: 768px) {
    #productsList {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 8px !important;
        padding: 5px !important;
    }
    .ptl-product-card {
        background: #131A2E;
        border: 1px solid #1F2A44;
        border-radius: 8px;
        padding: 8px;
        text-align: center;
        cursor: pointer;
        transition: transform 0.1s;
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden;
    }
    .ptl-product-card:active { transform: scale(0.95); }
    .ptl-product-img {
        width: 100%;
        height: 70px;
        object-fit: cover;
        border-radius: 6px;
        margin-bottom: 5px;
    }
    .ptl-product-price {
        color: #22C55E;
        font-size: 11px;
        font-weight: bold;
        white-space: nowrap;
    }
    .ptl-product-title-mini {
        color: #94A3B8;
        font-size: 9px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
        margin-top: 2px;
    }
    .ptl-modal-acciones {
        display: none;
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(10, 14, 26, 0.85);
        z-index: 99999;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(4px);
    }
    .ptl-modal-content {
        background: #131A2E;
        padding: 20px;
        border-radius: 12px;
        width: 85%;
        max-width: 350px;
        border: 1px solid #1F2A44;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
  }
</style>
"""

def encontrar_fin_funcion(texto, inicio):
    # Encuentra la primera llave de apertura después de 'function renderProductos'
    idx = texto.find('{', inicio)
    if idx == -1: return -1
    nivel = 1
    i = idx + 1
    while i < len(texto) and nivel > 0:
        if texto[i] == '{': nivel += 1
        elif texto[i] == '}': nivel -= 1
        i += 1
    return i if nivel == 0 else -1

for archivo in archivos:
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()

    # Limpiar CSS anterior
    html = re.sub(r'<style id="ptl-.*?-css">.*?</style>', '', html, flags=re.DOTALL)

    # Encontrar la función renderProductos
    inicio = html.find('function renderProductos()')
    if inicio != -1:
        fin = encontrar_fin_funcion(html, inicio)
        if fin != -1:
            html = html[:inicio] + nuevo_codigo + html[fin:]
            print(f"✅ Función reemplazada en {archivo}")
        else:
            print(f"❌ No se encontró el fin de la función en {archivo}")
    else:
        print(f"❌ No se encontró renderProductos en {archivo}")

    # Inyectar CSS
    if 'ptl-final-css' not in html:
        html = html.replace('</head>', css_new + '\n</head>')

    with open(archivo, 'w', encoding='utf-8') as f:
        f.write(html)

# Validar sintaxis
print("Validando sintaxis...")
for archivo in archivos:
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()
    scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', html)
    os.makedirs(os.path.expanduser('~/.check_js'), exist_ok=True)
    error = False
    for i, js in enumerate(scripts):
        if js.strip():
            with open(os.path.expanduser(f'~/.check_js/s{i}.js'), 'w') as out:
                out.write(js)
            res = subprocess.run(['node', '--check', os.path.expanduser(f'~/.check_js/s{i}.js')], capture_output=True, text=True)
            if res.returncode != 0:
                print(f"❌ Error en {archivo} script {i}: {res.stderr}")
                error = True
    if not error:
        print(f"✅ {archivo}: Sintaxis perfecta")
