// Este script se ejecuta DESPUÉS de que la tienda cargue
// No modifica el código original, solo "decora" el DOM

(function() {
  // Esperar a que la tienda esté cargada
  const checkInterval = setInterval(() => {
    const grid = document.getElementById('productsGrid');
    if (grid && grid.children.length > 0 && window.tienda) {
      clearInterval(checkInterval);
      initCarrito();
    }
  }, 300);

  function initCarrito() {
    const slug = new URLSearchParams(location.search).get('slug');
    let cart = JSON.parse(localStorage.getItem('ptl_cart_' + slug)) || [];

    // --- 1. BOTÓN VOLVER ARRIBA ---
    const banner = document.querySelector('.tienda-banner');
    if (banner && !document.querySelector('.btn-back-top')) {
      const btn = document.createElement('a');
      btn.href = 'shop.html';
      btn.className = 'btn-back-top';
      btn.textContent = '← Volver';
      btn.style.cssText = 'position:absolute;top:15px;left:15px;z-index:100;background:rgba(0,0,0,0.7);color:#FFF;padding:8px 14px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;gap:5px;';
      banner.parentNode.insertBefore(btn, banner);
    }

    // --- 2. BOTÓN FLOTANTE CARRITO ---
    if (!document.getElementById('cart-fab')) {
      const fab = document.createElement('button');
      fab.id = 'cart-fab';
      fab.className = 'cart-fab';
      fab.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#22c55e;color:#0A0E1A;border:none;width:60px;height:60px;border-radius:50%;font-size:24px;box-shadow:0 4px 12px rgba(34,197,94,0.4);cursor:pointer;z-index:999;display:none;align-items:center;justify-content:center;';
      fab.innerHTML = '🛒 <span id="cart-count" style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:white;border-radius:50%;padding:4px 8px;font-size:12px;font-weight:bold;">0</span>';
      fab.onclick = openCart;
      document.body.appendChild(fab);
    }

    // --- 3. AÑADIR BOTONES A CADA TARJETA ---
    document.querySelectorAll('.product-card').forEach(card => {
      // Evitar duplicados
      if (card.querySelector('.product-actions')) return;
      
      // Obtener ID del producto desde el link original
      const link = card.getAttribute('href') || '';
      const idMatch = link.match(/id=([^&]+)/);
      if (!idMatch) return;
      const productId = idMatch[1];

      // Contenedor de botones
      const actions = document.createElement('div');
      actions.className = 'product-actions';
      actions.style.cssText = 'display:flex;gap:5px;margin-top:8px;';

      const btnAdd = document.createElement('button');
      btnAdd.textContent = '🛒';
      btnAdd.style.cssText = 'flex:1;padding:6px;border:none;border-radius:6px;font-weight:bold;font-size:14px;cursor:pointer;background:#E2E8F0;color:#1E293B;';
      btnAdd.onclick = (e) => { e.preventDefault(); e.stopPropagation(); addToCart(productId); };

      const btnWa = document.createElement('button');
      btnWa.textContent = '📲';
      btnWa.style.cssText = 'flex:1;padding:6px;border:none;border-radius:6px;font-weight:bold;font-size:14px;cursor:pointer;background:#22C55E;color:#0A0E1A;';
      btnWa.onclick = (e) => { e.preventDefault(); e.stopPropagation(); orderSingle(productId); };

      actions.appendChild(btnAdd);
      actions.appendChild(btnWa);

      // Insertar dentro de product-info
      const info = card.querySelector('.product-info');
      if (info) info.appendChild(actions);
      
      // Quitar el link href para que no navegue al tocar la tarjeta (pero mantener cursor)
      card.removeAttribute('href');
      card.style.cursor = 'default';
      // Hacer la imagen clickeable para ir al producto
      const img = card.querySelector('.product-img');
      if (img) {
        img.style.cursor = 'pointer';
        img.onclick = () => { window.location.href = 'producto.html?id=' + productId; };
      }
    });

    // --- 4. ACTUALIZAR UI DEL CARRITO ---
    function updateCartUI() {
      const count = cart.reduce((acc, item) => acc + item.qty, 0);
      const badge = document.getElementById('cart-count');
      const fab = document.getElementById('cart-fab');
      if (badge) badge.textContent = count;
      if (fab) fab.style.display = count > 0 ? 'flex' : 'none';
    }

    // --- 5. FUNCIONES GLOBALES ---
    window.addToCart = function(productId) {
      // Buscar producto en el array global
      const product = (window.productos || []).find(p => String(p.id) === String(productId));
      if (!product) return alert('Producto no encontrado');
      
      const existing = cart.find(item => String(item.id) === String(productId));
      if (existing) existing.qty += 1;
      else cart.push({ ...product, qty: 1 });
      
      localStorage.setItem('ptl_cart_' + slug, JSON.stringify(cart));
      updateCartUI();
      
      const fab = document.getElementById('cart-fab');
      if (fab) { fab.style.transform = 'scale(1.2)'; setTimeout(() => fab.style.transform = 'scale(1)', 200); }
    };

    window.orderSingle = function(productId) {
      const product = (window.productos || []).find(p => String(p.id) === String(productId));
      if (!product) return;
      const phone = (window.tienda && window.tienda.whatsapp) ? window.tienda.whatsapp.replace(/\D/g, '') : '';
      const text = `Hola! Me interesa este producto de tu tienda *${window.tienda.nombre}*:\n\n*${product.titulo}* - $${product.precio_usd}\n\n¿Está disponible?`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    window.openCart = function() {
      if (cart.length === 0) return alert("Tu carrito está vacío 🛒");
      let total = 0;
      let lista = cart.map(item => {
        total += (item.precio_usd * item.qty);
        return `${item.qty}x ${item.titulo} - $${(item.precio_usd * item.qty).toFixed(2)}`;
      }).join('\n');
      const mensaje = `Hola! Quiero hacer un pedido desde tu tienda *${window.tienda.nombre}*:\n\n${lista}\n\n*TOTAL: $${total.toFixed(2)}*`;
      const phone = (window.tienda.whatsapp || '').replace(/\D/g, '');
      if(confirm(`Resumen de tu pedido:\n\n${lista}\n\nTOTAL: $${total.toFixed(2)}\n\n¿Enviar pedido por WhatsApp?`)) {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`, '_blank');
      }
    };

    updateCartUI();
  }
})();
