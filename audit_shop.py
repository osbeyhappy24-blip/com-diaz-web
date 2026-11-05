import re

with open('shop.html', 'r', encoding='utf-8') as f:
    html = f.read()

print("=== BUSCANDO ETIQUETA 'IMPORTADO' ===")
for m in re.finditer(r'.{0,50}IMPORTADO.{0,50}', html):
    print(m.group(0))

print("\n=== BUSCANDO CONTADORES (PRODUCTOS/LOCALES) ===")
for m in re.finditer(r'.{0,50}(0 PRODUCTOS|0 LOCALES|totalProductos|totalTiendas).{0,50}', html, re.IGNORECASE):
    print(m.group(0))

print("\n=== BUSCANDO LA CASITA / HOME ===")
for m in re.finditer(r'.{0,50}(icon.*home|home.*icon|fa-home|casita).{0,50}', html, re.IGNORECASE):
    print(m.group(0))
