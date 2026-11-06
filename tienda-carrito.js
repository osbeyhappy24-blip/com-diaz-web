(function() {
  let attempts = 0;
  const checkInterval = setInterval(() => {
    attempts++;
    const grid = document.getElementById('productsGrid');
    if ((grid && grid.children.length > 0) || attempts > 20) {
      clearInterval(checkInterval);
      initTienda();
    }
  }, 500);

  function initTienda() {
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

    // --- 2. BOTÓN QR EN EL HEADER DE LA TIENDA ---
    const actionsContainer = document.querySelector('.tienda-actions');
    if (actionsContainer && !document.getElementById('btn-show-qr')) {
      const btnQr = document.createElement('button');
      btnQr.id = 'btn-show-qr';
      btnQr.className = 'btn-share';
      btnQr.innerHTML = '📱 QR';
      btnQr.onclick = () => window.openQrModal();
      const contactBtn = Array.from(actionsContainer.children).find(el => el.textContent.includes('Contactar'));
      if (contactBtn) { actionsContainer.insertBefore(btnQr, contactBtn); } else { actionsContainer.appendChild(btnQr); }
    }

    // --- 3. INYECTAR MODALES ---
    if (!document.getElementById('cart-overlay')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="cart-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:1000;align-items:flex-end;justify-content:center;">
          <div id="cart-modal" style="background:#0A0E1A;width:100%;max-width:500px;border-radius:20px 20px 0 0;padding:20px;max-height:85vh;display:flex;flex-direction:column;transform:translateY(100%);transition:transform 0.3s ease-out;border:1px solid #1F2A44;border-bottom:none;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
              <h2 style="color:#FFF;font-size:20px;margin:0;">Tu Pedido 🛒</h2>
              <button id="close-cart-btn" style="background:none;border:none;color:#94A3B8;font-size:28px;cursor:pointer;">&times;</button>
            </div>
            <div id="cart-items-list" style="overflow-y:auto;flex:1;color:#FFF;padding-right:5px;"></div>
            <div style="margin-top:15px;border-top:1px solid #1F2A44;padding-top:15px;">
              <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:bold;color:#22C55E;margin-bottom:15px;">
                <span>Total:</span>
                <span id="cart-total-display">$0.00</span>
              </div>
              <button id="btn-checkout-wa" style="width:100%;background:#22C55E;color:#0A0E1A;border:none;padding:15px;border-radius:10px;font-size:16px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                Pedir todo por WhatsApp 📲
              </button>
            </div>
          </div>
        </div>

        <div id="product-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:1001;align-items:center;justify-content:center;padding:20px;">
          <div id="product-modal" style="background:#0A0E1A;width:100%;max-width:450px;border-radius:16px;padding:20px;position:relative;border:1px solid #1F2A44;max-height:90vh;overflow-y:auto;">
            <button id="close-product-btn" style="position:absolute;top:10px;right:15px;background:none;border:none;color:#94A3B8;font-size:28px;cursor:pointer;z-index:10;">&times;</button>
            <img id="pm-image" style="width:100%;height:250px;object-fit:contain;background:#131A2E;border-radius:10px;margin-bottom:15px;" />
            <h2 id="pm-title" style="color:#FFF;font-size:20px;margin-bottom:10px;line-height:1.3;"></h2>
            <div id="pm-price" style="color:#22C55E;font-size:24px;font-weight:900;margin-bottom:10px;"></div>
            <div id="pm-location" style="color:#94A3B8;font-size:14px;margin-bottom:20px;"></div>
            <div style="display:flex;gap:10px;margin-top:20px;">
              <button id="pm-btn-add" style="flex:1;background:#E2E8F0;color:#1E293B;border:none;padding:12px;border-radius:10px;font-weight:bold;font-size:15px;cursor:pointer;">🛒 Agregar</button>
              <button id="pm-btn-wa" style="flex:1;background:#22C55E;color:#0A0E1A;border:none;padding:12px;border-radius:10px;font-weight:bold;font-size:15px;cursor:pointer;">📲 Pedir</button>
              <button id="pm-btn-share" style="background:#3B82F6;color:#FFF;border:none;padding:12px;border-radius:10px;font-weight:bold;font-size:15px;cursor:pointer;">📤</button>
            </div>
            <a id="pm-btn-details" href="#" style="display:block;text-align:center;margin-top:15px;color:#94A3B8;font-size:13px;text-decoration:underline;">Ver descripción completa</a>
            <div id="pm-related-section" style="margin-top:25px; padding-top:15px; border-top:1px solid #1F2A44; display:none;">
              <h3 style="color:#FFF; font-size:15px; margin-bottom:10px;">Otros productos de esta tienda</h3>
              <div id="pm-related-list" style="display:flex; gap:10px; overflow-x:auto; padding-bottom:5px;"></div>
            </div>
          </div>
        </div>

        <div id="qr-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:1002;align-items:center;justify-content:center;padding:20px;">
          <div style="background:#0A0E1A;width:100%;max-width:320px;border-radius:16px;padding:25px;position:relative;border:1px solid #1F2A44;text-align:center;">
            <button id="close-qr-btn" style="position:absolute;top:10px;right:15px;background:none;border:none;color:#94A3B8;font-size:28px;cursor:pointer;">&times;</button>
            <h2 style="color:#FFF;font-size:18px;margin-bottom:5px;">Escanea este QR</h2>
            <p style="color:#94A3B8;font-size:13px;margin-bottom:20px;">Para abrir la tienda en otro dispositivo</p>
            <div style="background:#FFF;padding:15px;border-radius:12px;display:inline-block;margin-bottom:15px;">
              <img id="qr-image" src="" alt="QR Code" style="width:200px;height:200px;display:block;">
            </div>
            <p style="color:#CBD5E1;font-size:12px;word-break:break-all;" id="qr-url-text"></p>
          </div>
        </div>
      `);

      document.getElementById('close-cart-btn').onclick = () => window.closeCart();
      document.getElementById('cart-overlay').onclick = (e) => { if(e.target.id === 'cart-overlay') window.closeCart(); };
      document.getElementById('btn-checkout-wa').onclick = () => window.checkoutWhatsApp();
      document.getElementById('close-product-btn').onclick = () => window.closeProductModal();
      document.getElementById('product-overlay').onclick = (e) => { if(e.target.id === 'product-overlay') window.closeProductModal(); };
      document.getElementById('close-qr-btn').onclick = () => window.closeQrModal();
      document.getElementById('qr-overlay').onclick = (e) => { if(e.target.id === 'qr-overlay') window.closeQrModal(); };
    }

    // --- 4. BOTÓN FLOTANTE CARRITO ---
    if (!document.getElementById('cart-fab')) {
      const fab = document.createElement('button');
      fab.id = 'cart-fab';
      fab.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#22c55e;color:#0A0E1A;border:none;width:60px;height:60px;border-radius:50%;font-size:24px;box-shadow:0 4px 12px rgba(34,197,94,0.4);cursor:pointer;z-index:999;display:none;align-items:center;justify-content:center;';
      fab.innerHTML = '🛒 <span id="cart-count" style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:white;border-radius:50%;padding:4px 8px;font-size:12px;font-weight:bold;">0</span>';
      fab.onclick = () => window.openCart();
      document.body.appendChild(fab);
    }

    // --- 5. AÑADIR BOTONES A CADA TARJETA ---
    document.querySelectorAll('.product-card').forEach(card => {
      if (card.querySelector('.product-actions')) return;
      const link = card.getAttribute('href') || '';
      const idMatch = link.match(/id=([^&]+)/);
      if (!idMatch) return;
      const productId = idMatch[1];
      card.setAttribute('data-id', productId);

      const imgSrc = card.querySelector('.product-img')?.src || '';
      const title = card.querySelector('.product-title')?.textContent || 'Producto';
      const priceText = card.querySelector('.product-price')?.textContent.replace('$', '') || '0';
      const price = parseFloat(priceText) || 0;
      const locationText = card.querySelector('.product-location')?.textContent || '';

      const actions = document.createElement('div');
      actions.className = 'product-actions';
      actions.style.cssText = 'display:flex;gap:5px;margin-top:8px;';

      const btnAdd = document.createElement('button');
      btnAdd.textContent = '🛒';
      btnAdd.style.cssText = 'flex:1;padding:6px;border:none;border-radius:6px;font-weight:bold;font-size:14px;cursor:pointer;background:#E2E8F0;color:#1E293B;';
      btnAdd.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.addToCart(productId, title, price); };

      const btnWa = document.createElement('button');
      btnWa.textContent = '📲';
      btnWa.style.cssText = 'flex:1;padding:6px;border:none;border-radius:6px;font-weight:bold;font-size:14px;cursor:pointer;background:#22C55E;color:#0A0E1A;';
      btnWa.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.orderSingle(title, price); };

      const btnShare = document.createElement('button');
      btnShare.textContent = '📤';
      btnShare.style.cssText = 'flex:1;padding:6px;border:none;border-radius:6px;font-weight:bold;font-size:14px;cursor:pointer;background:#3B82F6;color:#FFF;';
      btnShare.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.shareProduct(productId, title, price); };

      actions.appendChild(btnAdd);
      actions.appendChild(btnWa);
      actions.appendChild(btnShare);
      const info = card.querySelector('.product-info');
      if (info) info.appendChild(actions);
      card.removeAttribute('href');
      card.style.cursor = 'default';
      
      const img = card.querySelector('.product-img');
      if (img) { img.style.cursor = 'pointer'; img.onclick = () => window.openProductModal(productId, imgSrc, title, price, locationText); }
      const titleEl = card.querySelector('.product-title');
      if (titleEl) { titleEl.style.cursor = 'pointer'; titleEl.onclick = () => window.openProductModal(productId, imgSrc, title, price, locationText); }
    });

    // --- 6. FUNCIONES GLOBALES ---
    window.openQrModal = function() {
      const storeUrl = location.origin + location.pathname + '?slug=' + slug;
      const qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(storeUrl);
      document.getElementById('qr-image').src = qrApiUrl;
      document.getElementById('qr-url-text').textContent = storeUrl;
      document.getElementById('qr-overlay').style.display = 'flex';
    };
    window.closeQrModal = function() { document.getElementById('qr-overlay').style.display = 'none'; };

    window.openProductModal = function(id, img, title, price, loc) {
      document.getElementById('pm-image').src = img;
      document.getElementById('pm-title').textContent = title;
      document.getElementById('pm-price').textContent = '$' + price.toFixed(2);
      document.getElementById('pm-location').textContent = loc;
      document.getElementById('pm-btn-details').href = 'producto.html?id=' + id;
      document.getElementById('pm-btn-add').onclick = () => { window.addToCart(id, title, price); window.closeProductModal(); };
      document.getElementById('pm-btn-wa').onclick = () => window.orderSingle(title, price);
      document.getElementById('pm-btn-share').onclick = () => window.shareProduct(id, title, price);
      
      const relatedList = document.getElementById('pm-related-list');
      const relatedSection = document.getElementById('pm-related-section');
      relatedList.innerHTML = '';
      let relatedCount = 0;
      document.querySelectorAll('.product-card').forEach(c => {
        if (relatedCount >= 5) return;
        const otherId = c.getAttribute('data-id');
        if (otherId && otherId !== id) {
          const otherImg = c.querySelector('.product-img')?.src || '';
          const otherTitle = c.querySelector('.product-title')?.textContent || '';
          const otherPrice = c.querySelector('.product-price')?.textContent || '';
          const miniCard = document.createElement('div');
          miniCard.style.cssText = 'min-width:100px; width:100px; cursor:pointer;';
          miniCard.innerHTML = `<img src="${otherImg}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid #1F2A44; margin-bottom:5px;"><div style="color:#FFF; font-size:11px; line-height:1.2; margin-bottom:2px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${otherTitle}</div><div style="color:#22C55E; font-size:12px; font-weight:bold;">${otherPrice}</div>`;
          miniCard.onclick = () => { const loc2 = c.querySelector('.product-location')?.textContent || ''; const p2 = parseFloat(otherPrice.replace('$', '')) || 0; window.openProductModal(otherId, otherImg, otherTitle, p2, loc2); };
          relatedList.appendChild(miniCard);
          relatedCount++;
        }
      });
      relatedSection.style.display = relatedCount > 0 ? 'block' : 'none';
      document.getElementById('product-overlay').style.display = 'flex';
    };
    window.closeProductModal = function() { document.getElementById('product-overlay').style.display = 'none'; };

    window.shareProduct = async function(id, title, price) {
      const url = location.origin + location.pathname + '?slug=' + slug + '#producto=' + id;
      const shareData = { title: title, text: `Mira este producto en ProfitToLife: *${title}* - $${price}`, url: url };
      if (navigator.share) { try { await navigator.share(shareData); } catch(e) { console.log('Error sharing', e); } }
      else { try { await navigator.clipboard.writeText(`${shareData.text}\n${url}`); alert('✅ Link del producto copiado. Pégalo en WhatsApp.'); } catch(e) { prompt('Copia este link:', url); } }
    };

    window.openCart = function() { renderCartItems(); const overlay = document.getElementById('cart-overlay'); const modal = document.getElementById('cart-modal'); overlay.style.display = 'flex'; setTimeout(() => { modal.style.transform = 'translateY(0)'; }, 10); };
    window.closeCart = function() { const overlay = document.getElementById('cart-overlay'); const modal = document.getElementById('cart-modal'); if (modal) modal.style.transform = 'translateY(100%)'; setTimeout(() => { if (overlay) overlay.style.display = 'none'; }, 300); };
    window.changeQty = function(index, delta) { cart[index].qty += delta; if (cart[index].qty <= 0) cart.splice(index, 1); localStorage.setItem('ptl_cart_' + slug, JSON.stringify(cart)); updateUI(); renderCartItems(); };
    window.addToCart = function(productId, title, price) { const existing = cart.find(item => String(item.id) === String(productId)); if (existing) existing.qty += 1; else cart.push({ id: productId, titulo: title, precio_usd: price, qty: 1 }); localStorage.setItem('ptl_cart_' + slug, JSON.stringify(cart)); updateUI(); const fab = document.getElementById('cart-fab'); if (fab) { fab.style.transform = 'scale(1.2)'; setTimeout(() => fab.style.transform = 'scale(1)', 200); } };
    window.orderSingle = function(title, price) { const phone = getPhone(); const text = `Hola! Me interesa este producto de tu tienda:\n\n*${title}* - $${price}\n\n¿Está disponible?`; window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank'); };
    window.checkoutWhatsApp = function() { if (cart.length === 0) return; const phone = getPhone(); let total = 0; let lista = cart.map(item => { total += (item.precio_usd * item.qty); return `${item.qty}x ${item.titulo} - $${(item.precio_usd * item.qty).toFixed(2)}`; }).join('\n'); const mensaje = `Hola! Quiero hacer un pedido:\n\n${lista}\n\n*TOTAL: $${total.toFixed(2)}*`; window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`, '_blank'); window.closeCart(); };

    // --- 7. AUXILIARES ---
    function updateUI() { const count = cart.reduce((acc, item) => acc + item.qty, 0); const badge = document.getElementById('cart-count'); const fab = document.getElementById('cart-fab'); if (badge) badge.textContent = count; if (fab) fab.style.display = count > 0 ? 'flex' : 'none'; }
    function renderCartItems() {
      const list = document.getElementById('cart-items-list'); let total = 0;
      if (cart.length === 0) { list.innerHTML = '<p style="color:#94A3B8;text-align:center;margin-top:20px;">Tu carrito está vacío 🛒</p>'; document.getElementById('cart-total-display').textContent = '$0.00'; return; }
      list.innerHTML = cart.map((item, index) => {
        total += item.precio_usd * item.qty;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #1F2A44;"><div style="flex:1;padding-right:10px;"><div style="font-size:14px;line-height:1.3;">${item.titulo}</div><div style="color:#22C55E;font-weight:bold;font-size:15px;">$${item.precio_usd}</div></div><div style="display:flex;align-items:center;gap:12px;background:#131A2E;padding:4px 8px;border-radius:20px;border:1px solid #1F2A44;"><button onclick="window.changeQty(${index}, -1)" style="background:none;border:none;color:#FFF;font-size:18px;font-weight:bold;cursor:pointer;">−</button><span style="font-weight:bold;font-size:14px;min-width:15px;text-align:center;">${item.qty}</span><button onclick="window.changeQty(${index}, 1)" style="background:none;border:none;color:#22C55E;font-size:18px;font-weight:bold;cursor:pointer;">+</button></div></div>`;
      }).join('');
      document.getElementById('cart-total-display').textContent = '$' + total.toFixed(2);
    }
    function getPhone() { const contactBtn = Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Contactar')); if (contactBtn && contactBtn.href) { const match = contactBtn.href.match(/wa\.me\/(\d+)/); if (match) return match[1]; } return ''; }
    updateUI();

    // --- 8. AUTO-ABRIR PRODUCTO DESDE LINK ---
    if (location.hash.startsWith('#producto=')) {
      const pid = location.hash.replace('#producto=', '');
      const card = document.querySelector(`.product-card[data-id="${pid}"]`);
      if (card) {
        const imgSrc = card.querySelector('.product-img')?.src || '';
        const title = card.querySelector('.product-title')?.textContent || 'Producto';
        const priceText = card.querySelector('.product-price')?.textContent.replace('$', '') || '0';
        const price = parseFloat(priceText) || 0;
        const loc = card.querySelector('.product-location')?.textContent || '';
        window.openProductModal(pid, imgSrc, title, price, loc);
        history.replaceState(null, null, location.pathname + location.search);
      }
    }
  }
})();
