import re, os, subprocess

archivos = ['seller-panel.html', 'panel-vendedor.html']

css_grid = """
<style id="ptl-grid-restore-css">
  @media (max-width: 768px) {
    /* Forzar 3 columnas */
    #productsList {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 8px !important;
        padding: 5px !important;
    }
    .ptl-product-card {
        background: #131A2E !important;
        border: 1px solid #1F2A44 !important;
        border-radius: 8px !important;
        padding: 6px !important;
        text-align: center !important;
        cursor: pointer !important;
        transition: transform 0.1s !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        overflow: hidden !important;
        height: 100% !important;
    }
    .ptl-product-card:active { transform: scale(0.95) !important; }
    
    /* Achicar la imagen */
    .ptl-product-img {
        width: 100% !important;
        height: 70px !important;
        object-fit: cover !important;
        border-radius: 6px !important;
        margin-bottom: 5px !important;
        display: block !important;
    }
    
    /* Precio en verde y título pequeño */
    .ptl-product-price {
        color: #22C55E !important;
        font-size: 11px !important;
        font-weight: bold !important;
        white-space: nowrap !important;
        margin: 0 !important;
    }
    .ptl-product-title-mini {
        color: #94A3B8 !important;
        font-size: 9px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        width: 100% !important;
        margin-top: 2px !important;
        text-align: center !important;
    }
  }
</style>
"""

for archivo in archivos:
    if os.path.exists(archivo):
        with open(archivo, 'r', encoding='utf-8') as f:
            html = f.read()

        # Eliminar si ya existía para no duplicar
        html = re.sub(r'<style id="ptl-grid-restore-css">.*?</style>', '', html, flags=re.DOTALL)

        # Inyectar el CSS justo antes de </head>
        html = html.replace('</head>', css_grid + '\n</head>')

        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ Cuadrícula de 3 columnas restaurada en {archivo}")

# Validar sintaxis
print("Validando sintaxis...")
err = False
for archivo in archivos:
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()
    scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', html)
    os.makedirs(os.path.expanduser('~/.check_js'), exist_ok=True)
    for i, js in enumerate(scripts):
        if js.strip():
            with open(os.path.expanduser(f'~/.check_js/s{i}.js'), 'w') as out: out.write(js)
            res = subprocess.run(['node', '--check', os.path.expanduser(f'~/.check_js/s{i}.js')], capture_output=True, text=True)
            if res.returncode != 0:
                print(f'❌ Error en {archivo} script {i}: {res.stderr}'); err = True
if not err: print('✅ Sintaxis Perfecta')
