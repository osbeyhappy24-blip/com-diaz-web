const fs = require('fs');
const file = '/data/data/com.termux/files/home/comdiaz/frontend/shop.js';
let s = fs.readFileSync(file, 'utf8');

// Verificar si ya existe
if (s.includes('data-pid="${p.id}"')) {
  console.log('ℹ️  Ya existe el botón product-add en el render');
  process.exit(0);
}

// Reemplazo exacto según la línea 126-129
const viejo = `        <div class="product-price">\${Number(p.salePrice || 0).toFixed(2)}</div>
        <button class="product-buy" data-id="\${p.id}">Pedir por WhatsApp</button>`;

const nuevo = `        <div class="product-price">\${Number(p.salePrice || 0).toFixed(2)}</div>
        <button class="product-add" data-pid="\${p.id}">🛒 Agregar al pedido</button>
        <button class="product-buy" data-id="\${p.id}">Pedir por WhatsApp</button>`;

if (s.includes(viejo)) {
  s = s.replace(viejo, nuevo);
  fs.writeFileSync(file, s);
  console.log('✅ Botón "Agregar al pedido" agregado al render');
} else {
  console.log('⚠️ No encontré el bloque exacto. Buscando variante...');
  // Variante con regex
  const re = /(<div class="product-price">\$\{Number\(p\.salePrice \|\| 0\)\.toFixed\(2\)\}<\/div>\s*\n\s*)(<button class="product-buy")/;
  if (re.test(s)) {
    s = s.replace(re, '$1        <button class="product-add" data-pid="${p.id}">🛒 Agregar al pedido</button>\n        $2');
    fs.writeFileSync(file, s);
    console.log('✅ Botón agregado (variante)');
  } else {
    console.log('❌ No se pudo agregar. Pégame las líneas 120-135:');
    console.log("   sed -n '120,135p' shop.js");
  }
}
