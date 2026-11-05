archivos = ['seller-panel.html', 'panel-vendedor.html']
for archivo in archivos:
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Arreglar el botón de guardar para que llame a la función correcta
    html = html.replace('onclick="guardarProductoEnLote()"', 'onclick="guardarProducto()"')
    
    with open(archivo, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"✅ Botón guardar corregido en {archivo}")
