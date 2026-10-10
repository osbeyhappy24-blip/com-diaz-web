// Comdiaz Shop - Logica del catalogo publico

const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://com-diaz.onrender.com';


// ─── Helper: abrir WhatsApp en la app (no en el navegador) ───
function abrirWhatsApp(numero, mensaje) {
  const text = encodeURIComponent(mensaje || '');
  const clean = String(numero).replace(/[^0-9]/g, '');

  // 1) Intentar abrir la app directamente con el esquema nativo
  const appUrl = 'whatsapp://send?phone=' + clean + (text ? '&text=' + text : '');

  // 2) Fallback web (solo si la app no existe)
  const webUrl = 'https://wa.me/' + clean + (text ? '?text=' + text : '');

  // En móvil, usar el esquema nativo
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  if (isMobile) {
    // Redirigir al esquema nativo
    window.location.href = appUrl;
    // Si en 1.5s no cambió nada, abrir web
    const t = Date.now();
    setTimeout(() => {
      if (Date.now() - t < 2000 && !document.hidden) {
        window.location.href = webUrl;
      }
    }, 1500);
  } else {
    // Desktop: usar web directo
    window.open(webUrl, '_blank');
  }
}

let state = {
  products: [],
  filtered: [],
  config: {},
  categorias: [],
  currentTab: 'all',
  currentCat: 'todas',
  searchQuery: '',
  lightboxImages: [],
  lightboxIndex: 0,
};

const $ = id => document.getElementById(id);

// ─── Cargar catalogo ───
async function cargarCatalogo() {
  try {
    const r = await fetch(API_BASE + '/api/public/catalog');
    const data = await r.json();
    if (!data.ok) throw new Error('Respuesta invalida');

    state.products = data.products || [];
    state.categorias = data.categorias || [];
    state.config = data.config || {};

    // Actualizar header
    if (state.config.titulo) $('shopTitle').textContent = state.config.titulo;
    if (state.config.subtitulo) $('shopSubtitle').textContent = state.config.subtitulo;

    renderCategorias();
    aplicarFiltros();
  } catch (e) {
    console.error('Error cargando catalogo:', e);
    $('loading').innerHTML = '<p>Error al cargar. Verifica tu conexion.</p>';
  }
}

// ─── Renderizar categorias ───
function renderCategorias() {
  const bar = $('categoriesBar');
  if (!bar) return;

  const cats = ['todas', ...state.categorias];
  bar.innerHTML = '';

  cats.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = 'cat-chip' + (cat === state.currentCat ? ' active' : '');
    chip.textContent = cat === 'todas' ? 'Todas' : cat;
    chip.onclick = () => {
      state.currentCat = cat;
      renderCategorias();
      aplicarFiltros();
    };
    bar.appendChild(chip);
  });
}

// ─── Aplicar filtros (tab + categoria + busqueda) ───
function aplicarFiltros() {
  let filtered = [...state.products];

  // Tab
  if (state.currentTab === 'imported') {
    filtered = filtered.filter(p => p.source === 'ebay');
  } else if (state.currentTab === 'local') {
    filtered = filtered.filter(p => p.source === 'manual');
  }

  // Categoria
  if (state.currentCat !== 'todas') {
    filtered = filtered.filter(p => p.category === state.currentCat);
  }

  // Busqueda
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }

  state.filtered = filtered;
  renderProductos();
}

// ─── Renderizar productos ───
function renderProductos() {
  const grid = $('products');
  const empty = $('empty');
  const loading = $('loading');

  loading.classList.add('hidden');

  if (!state.filtered.length) {
    grid.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  grid.classList.remove('hidden');
  grid.innerHTML = '';

  state.filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const sourceLabel = p.source === 'manual' ? 'Local' : 'Importado';
    const sourceClass = p.source === 'manual' ? 'local' : '';

    card.innerHTML = `
      <div class="product-img-wrap">
        <img class="product-img" src="${p.image || ''}" alt="" loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f3f4f6%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 font-family=%22sans-serif%22 font-size=%2214%22 fill=%22%239ca3af%22 text-anchor=%22middle%22>Sin imagen</text></svg>'">
        <span class="product-source ${sourceClass}">${sourceLabel}</span>
      </div>
      <div class="product-body">
        <div class="product-category">${p.category || ''}</div>
        <div class="product-title">${p.title || 'Sin titulo'}</div>
        <div class="product-price">${Number(p.salePrice || 0).toFixed(2)}</div>
        <button class="product-add" data-pid="${p.id}">🛒 Agregar al pedido</button>
        <button class="product-buy" data-id="${p.id}">Pedir por WhatsApp</button>
      </div>
    `;

    // Click en la card (fuera del boton) abre modal
    card.addEventListener('click', (e) => {
      if (e.target.closest('.product-buy')) return;
      abrirModalProducto(p);
    });

    // Boton de WhatsApp directo
    card.querySelector('.product-buy').addEventListener('click', (e) => {
      e.stopPropagation();
      pedirPorWhatsApp(p);
    });

    grid.appendChild(card);
  });
}

// ─── Generar link de WhatsApp ───
function generarLinkWhatsApp(producto) {
  const wa = state.config.whatsapp || '5351425691';
  const titulo = producto.title || 'producto';
  const precio = Number(producto.salePrice || 0).toFixed(2);
  const url = producto.url || '';

  let mensaje = `Hola, me interesa este producto de Comdiaz Shop:\n\n`;
  mensaje += `*${titulo}*\n`;
  mensaje += `Precio: $${precio}\n`;
  if (url) mensaje += `${url}\n`;
  mensaje += `\n¿Esta disponible?`;

  return 'https://wa.me/' + wa + '?text=' + encodeURIComponent(mensaje);
}

function pedirPorWhatsApp(producto) {
  const wa = state.config?.whatsapp || "5351425691";
  const titulo = producto.title || "producto";
  const precio = Number(producto.salePrice || 0).toFixed(2);
  const url = producto.url || "";
  let mensaje = "Hola, me interesa este producto de Comdiaz Shop:\n\n";
  mensaje += "*" + titulo + "*\n";
  mensaje += "Precio: $" + precio + "\n";
  if (url) mensaje += url + "\n";
  mensaje += "\n¿Esta disponible?";
  abrirWhatsApp(wa, mensaje);
}

// ─── Modal de producto ───
function abrirModalProducto(p) {
  const modal = $('productModal');
  $('pmImage').src = p.image || '';
  $('pmCategory').textContent = p.category || '';
  $('pmTitle').textContent = p.title || '';
  $('pmDescription').textContent = p.description || '';
  $('pmPrice').textContent = Number(p.salePrice || 0).toFixed(2);

  const waBtn = $('pmWaBtn');
  waBtn.onclick = () => pedirPorWhatsApp(p);

  const ebayBtn = $('pmEbayBtn');
  if (p.url && p.source === 'ebay') {
    ebayBtn.href = p.url;
    ebayBtn.classList.remove('hidden');
  } else {
    ebayBtn.classList.add('hidden');
  }

  // Imagen clickeable abre lightbox
  $('pmImage').onclick = () => {
    abrirLightbox([p.image, ...(p.images || [])].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i), 0);
  };

  modal.classList.remove('hidden');
}

$('pmClose').onclick = () => $('productModal').classList.add('hidden');
$('productModal').querySelector('.modal-backdrop').onclick = () => $('productModal').classList.add('hidden');

// ─── Lightbox ───
function abrirLightbox(images, index) {
  if (!images.length) return;
  state.lightboxImages = images;
  state.lightboxIndex = index || 0;
  actualizarLightbox();
  $('lightbox').classList.remove('hidden');
}

function actualizarLightbox() {
  const imgs = state.lightboxImages;
  const idx = state.lightboxIndex;
  if (!imgs.length) return;

  $('lbImage').src = imgs[idx];
  $('lbPrev').style.display = imgs.length > 1 ? 'flex' : 'none';
  $('lbNext').style.display = imgs.length > 1 ? 'flex' : 'none';

  const dots = $('lbDots');
  dots.innerHTML = '';
  if (imgs.length > 1) {
    imgs.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'lb-dot' + (i === idx ? ' active' : '');
      dots.appendChild(d);
    });
  }
}

$('lbClose').onclick = () => $('lightbox').classList.add('hidden');
$('lbPrev').onclick = () => {
  state.lightboxIndex = (state.lightboxIndex - 1 + state.lightboxImages.length) % state.lightboxImages.length;
  actualizarLightbox();
};
$('lbNext').onclick = () => {
  state.lightboxIndex = (state.lightboxIndex + 1) % state.lightboxImages.length;
  actualizarLightbox();
};
$('lightbox').onclick = (e) => {
  if (e.target === $('lightbox')) $('lightbox').classList.add('hidden');
};

// Swipe en lightbox
let touchStartX = 0;
$('lightbox').addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });
$('lightbox').addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) < 50) return;
  if (diff > 0) $('lbNext').click();
  else $('lbPrev').click();
});

// ─── Tabs ───
document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.currentTab = tab.dataset.tab;
    aplicarFiltros();
  };
});

// ─── Busqueda ───
let searchTimer = null;
$('searchInput').oninput = (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.searchQuery = e.target.value.trim();
    aplicarFiltros();
  }, 200);
};

// ─── WhatsApp flotante ───
$('waFloat').onclick = () => {
  const wa = state.config.whatsapp || '5351425691';
  const msg = 'Hola, quiero información sobre los productos de Comdiaz Shop.';
  abrirWhatsApp(wa, msg);
};

// ─── Arranque ───
cargarCatalogo();


// ─── WhatsApp mejorado (header + footer) ───
(function mejorarWhatsApp(){
  const updateConfig = () => {
    // Actualizar footer con datos del config
    const cfg = state.config || {};
    const fTitle = document.getElementById('footerTitle');
    const fSub = document.getElementById('footerSubtitle');
    const fHor = document.getElementById('footerHorario');
    const fYear = document.getElementById('footerYear');

    if (fTitle && cfg.titulo) fTitle.textContent = cfg.titulo;
    if (fSub && cfg.subtitulo) fSub.textContent = cfg.subtitulo;
    if (fHor && cfg.horarioAtencion) fHor.textContent = cfg.horarioAtencion;
    if (fYear) fYear.textContent = new Date().getFullYear();
  };

  // Actualizar después de cargar el catálogo
  const _orig = window.cargarCatalogo;
  if (typeof _orig === 'function') {
    window.cargarCatalogo = async function() {
      await _orig.apply(this, arguments);
      setTimeout(updateConfig, 300);
    };
  }

  // Si ya cargó, actualizar ahora
  setTimeout(updateConfig, 800);

  // Botón del header
  const headerBtn = document.getElementById('headerWaBtn');
  if (headerBtn) {
    headerBtn.onclick = () => {
      const wa = state.config?.whatsapp || '5351425691';
      const nombre = state.config?.titulo || 'Comdiaz Shop';
      const horario = state.config?.horarioAtencion || '';
      let msg = 'Hola, vengo de *' + nombre + '* y quiero información sobre productos.';
      if (horario) msg += '\n\n(Su horario: ' + horario + ')';
      abrirWhatsApp(wa, msg);
    };
  }

  // Botón del footer
  const footerBtn = document.getElementById('footerWaBtn');
  if (footerBtn) {
    footerBtn.onclick = () => {
      const wa = state.config?.whatsapp || '5351425691';
      const nombre = state.config?.titulo || 'Comdiaz Shop';
      const msg = 'Hola, vengo de *' + nombre + '* y quiero hablar con un vendedor.';
      abrirWhatsApp(wa, msg);
    };
  }
})();


// ═══════════════════════════════════════════════
// CARRITO DE COMPRAS (comdiaz_cart_v1)
// ═══════════════════════════════════════════════
(function comdiaz_cart_v1(){
  const CART_KEY = 'comdiaz_cart';
  const $id = (id) => document.getElementById(id);

  // ─── Estado del carrito ───
  let cart = loadCart();

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(_) { return []; }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch(_) {}
  }

  // ─── Agregar producto ───
  function addToCart(producto) {
    if (!producto || !producto.id) return;

    const existente = cart.find(x => x.id === producto.id);
    if (existente) {
      existente.qty = (existente.qty || 1) + 1;
    } else {
      cart.push({
        id: producto.id,
        title: producto.title || 'Producto',
        image: producto.image || '',
        price: Number(producto.salePrice) || 0,
        url: producto.url || '',
        source: producto.source || '',
        category: producto.category || '',
        qty: 1,
      });
    }
    saveCart();
    updateCartUI();
    if (typeof toast === 'function') toast('✅ Agregado al pedido', 'ok');
  }

  // ─── Quitar producto ───
  function removeFromCart(id) {
    cart = cart.filter(x => x.id !== id);
    saveCart();
    updateCartUI();
  }

  // ─── Cambiar cantidad ───
  function changeQty(id, delta) {
    const item = cart.find(x => x.id === id);
    if (!item) return;
    item.qty = (item.qty || 1) + delta;
    if (item.qty <= 0) {
      removeFromCart(id);
    } else {
      saveCart();
      updateCartUI();
    }
  }

  // ─── Vaciar ───
  function clearCart() {
    if (!cart.length) return;
    if (!confirm('¿Vaciar el carrito?')) return;
    cart = [];
    saveCart();
    updateCartUI();
  }

  // ─── Calcular total ───
  function getTotal() {
    return cart.reduce((acc, item) => acc + (Number(item.price) * (item.qty || 1)), 0);
  }

  // ─── Actualizar UI ───
  function updateCartUI() {
    const badge = $id('cartBadge');
    if (badge) {
      const total = cart.reduce((a, i) => a + (i.qty || 1), 0);
      if (total > 0) {
        badge.textContent = total;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    // Actualizar botones de "Agregar" en las tarjetas
    document.querySelectorAll('.product-add').forEach(btn => {
      const pid = btn.dataset.pid;
      const enCarrito = cart.some(x => x.id === pid);
      btn.classList.toggle('added', enCarrito);
      btn.innerHTML = enCarrito ? '✓ En el pedido' : '🛒 Agregar al pedido';
    });
  }

  // ─── Renderizar el modal del carrito ───
  function renderCartModal() {
    const itemsBox = $id('cartItems');
    const footerBox = $id('cartFooter');
    const emptyBox = $id('cartEmpty');
    const totalBox = $id('cartTotal');

    if (!itemsBox || !footerBox || !emptyBox) return;

    if (!cart.length) {
      itemsBox.classList.add('hidden');
      footerBox.classList.add('hidden');
      emptyBox.classList.remove('hidden');
      return;
    }

    emptyBox.classList.add('hidden');
    itemsBox.classList.remove('hidden');
    footerBox.classList.remove('hidden');

    // Render items
    itemsBox.innerHTML = '';
    cart.forEach(item => {
      const subtotal = (Number(item.price) * (item.qty || 1)).toFixed(2);
      const el = document.createElement('div');
      el.className = 'cart-item';
      el.innerHTML = `
        <img class="cart-item-img" src="${item.image}" alt="" onerror="this.style.opacity=.3">
        <div class="cart-item-body">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-price">$${Number(item.price).toFixed(2)} c/u</div>
          <div class="cart-item-subtotal">$${subtotal}</div>
        </div>
        <div class="cart-item-qty">
          <button class="cart-qty-btn" data-id="${item.id}" data-delta="-1">−</button>
          <span class="cart-qty-num">${item.qty || 1}</span>
          <button class="cart-qty-btn" data-id="${item.id}" data-delta="1">+</button>
        </div>
        <button class="cart-item-remove" data-id="${item.id}" title="Quitar">✕</button>
      `;
      itemsBox.appendChild(el);
    });

    // Total
    if (totalBox) {
      totalBox.textContent = '$' + getTotal().toFixed(2);
    }
  }

  // ─── Abrir/cerrar modal ───
  function openCart() {
    renderCartModal();
    $id('cartModal')?.classList.remove('hidden');
  }

  function closeCart() {
    $id('cartModal')?.classList.add('hidden');
  }

  // ─── Enviar pedido por WhatsApp ───
  function sendOrder() {
    if (!cart.length) return;

    const nombre = ($id('cartName')?.value || '').trim();
    const notas = ($id('cartNotes')?.value || '').trim();

    if (!nombre) {
      if (typeof toast === 'function') toast('Escribe tu nombre para enviar el pedido', 'err');
      $id('cartName')?.focus();
      return;
    }

    const wa = state.config?.whatsapp || '5351425691';
    const tienda = state.config?.titulo || 'Comdiaz Shop';

    let msg = '🛒 *NUEVO PEDIDO — ' + tienda + '*\n\n';
    msg += '👤 *Cliente:* ' + nombre + '\n\n';
    msg += '📦 *Productos:*\n\n';

    cart.forEach((item, i) => {
      const subtotal = (Number(item.price) * (item.qty || 1)).toFixed(2);
      msg += (i + 1) + '. ' + item.title + '\n';
      msg += '   x' + (item.qty || 1) + ' · $' + Number(item.price).toFixed(2) + ' c/u → $' + subtotal + '\n';
      if (item.url) msg += '   ' + item.url + '\n';
      msg += '\n';
    });

    msg += '━━━━━━━━━━━━━━━\n';
    msg += '💰 *TOTAL: $' + getTotal().toFixed(2) + '*\n';
    msg += '━━━━━━━━━━━━━━━\n';

    if (notas) {
      msg += '\n📝 *Notas:* ' + notas + '\n';
    }

    msg += '\n¿Me confirman disponibilidad?';

    abrirWhatsApp(wa, msg);
  }

  // ─── Exponer funciones ───
  window.comdiaz_cart = {
    add: addToCart,
    remove: removeFromCart,
    changeQty: changeQty,
    clear: clearCart,
    open: openCart,
    close: closeCart,
    send: sendOrder,
    count: () => cart.reduce((a, i) => a + (i.qty || 1), 0),
    total: getTotal,
  };

  // ─── Eventos ───
  document.addEventListener('click', (e) => {
    const t = e.target;

    // Abrir carrito
    if (t.closest && t.closest('#cartBtn')) {
      e.preventDefault();
      openCart();
      return;
    }

    // Cerrar
    if (t.id === 'cartClose' || (t.closest && t.closest('#cartClose')) ||
        (t.classList && t.classList.contains('cart-backdrop'))) {
      e.preventDefault();
      closeCart();
      return;
    }

    // Seguir comprando
    if (t.id === 'cartContinue' || (t.closest && t.closest('#cartContinue'))) {
      e.preventDefault();
      closeCart();
      return;
    }

    // Enviar por WhatsApp
    if (t.id === 'cartSend' || (t.closest && t.closest('#cartSend'))) {
      e.preventDefault();
      sendOrder();
      return;
    }

    // Vaciar carrito
    if (t.id === 'cartClear' || (t.closest && t.closest('#cartClear'))) {
      e.preventDefault();
      clearCart();
      return;
    }

    // Cambiar cantidad
    if (t.classList && t.classList.contains('cart-qty-btn')) {
      e.preventDefault();
      const id = t.dataset.id;
      const delta = Number(t.dataset.delta);
      changeQty(id, delta);
      return;
    }

    // Quitar producto
    if (t.classList && t.classList.contains('cart-item-remove')) {
      e.preventDefault();
      removeFromCart(t.dataset.id);
      return;
    }

    // Agregar al pedido (en la tarjeta del producto)
    if (t.classList && t.classList.contains('product-add')) {
      e.preventDefault();
      e.stopPropagation();
      const pid = t.dataset.pid;
      const prod = state.products.find(p => p.id === pid);
      if (prod) addToCart(prod);
      return;
    }
  }, true);

  // ─── Inicializar ───
  setTimeout(() => {
    updateCartUI();
  }, 500);

  // Exponer función para actualizar cuando se renderizan productos
  window.comdiaz_cart_update_ui = updateCartUI;

  console.log('✅ Carrito listo · productos guardados:', cart.length);
})();


(function comdiaz_wa_panel_v1(){
  var $id = function(id){ return document.getElementById(id); };
  function abrir(){ var p = $id("waInfoPanel"); if(!p) return; var hh = $id("waInfoHorario"); if(hh && state.config && state.config.horarioAtencion) hh.textContent = state.config.horarioAtencion; p.classList.remove("hidden"); }
  function cerrar(){ var p = $id("waInfoPanel"); if(p) p.classList.add("hidden"); }
  function wa(){ var w = (state.config && state.config.whatsapp) || "5351425691"; var t = (state.config && state.config.titulo) || "Comdiaz Shop"; var m = "Hola, vengo de *" + t + "* y quiero informacion."; abrirWhatsApp(w, m); }
  document.addEventListener("click", function(e){
    var t = e.target;
    if (t.closest && t.closest("#headerWaBtn")) { e.preventDefault(); abrir(); return; }
    if (t.id === "waInfoClose" || (t.closest && t.closest("#waInfoClose"))) { e.preventDefault(); cerrar(); return; }
    if (t.classList && t.classList.contains("wa-info-backdrop")) { cerrar(); return; }
    if (t.id === "waInfoBtn" || (t.closest && t.closest("#waInfoBtn"))) { e.preventDefault(); cerrar(); wa(); return; }
  });
  console.log("Panel de contacto listo");
})();


// ═══════════════════════════════════════════════
// BÚSQUEDA EN VIVO EN EBAY (comdiaz_live_search_v1)
// ═══════════════════════════════════════════════
(function comdiaz_live_search_v1(){
  const $id = (id) => document.getElementById(id);
  let ultimaQuery = '';
  let buscandoLive = false;

  // Crear el botón "Buscar en eBay" si no existe
  function ensureBotonLive() {
    return $id('liveSearchBtn') || null;
  }

  function mostrarBotonLive(mostrar) {
    const container = $id('liveSearchContainer');
    if (!container) return;
    if (mostrar) container.classList.remove('hidden');
    else container.classList.add('hidden');
  }

  // Agregar productos al estado y re-renderizar
  function addProductosLive(productos) {
    // Evitar duplicados
    const existentes = new Set(state.products.map(p => p.id));
    const nuevos = productos.filter(p => !existentes.has(p.id));
    state.products = [...nuevos, ...state.products];
    // Re-aplicar filtros para que aparezcan
    state.currentCat = 'todas';
    aplicarFiltros();
  }

  async function buscarEnEbay(q) {
    if (buscandoLive) return;
    if (!q || q.length < 2) return;
    buscandoLive = true;

    const btn = $id('liveSearchBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Buscando en eBay…';
    }

    try {
      const r = await fetch(API_BASE + '/api/public/live-search?q=' + encodeURIComponent(q));
      const data = await r.json();

      if (!data.ok) {
        if (typeof toast === 'function') toast('Error: ' + (data.error || 'no encontrado'), 'err');
      } else if (!data.products.length) {
        if (typeof toast === 'function') toast('Sin resultados en eBay', 'err');
      } else {
        addProductosLive(data.products);
        if (typeof toast === 'function') toast('✅ ' + data.products.length + ' productos encontrados', 'ok');
      }
    } catch(e) {
      if (typeof toast === 'function') toast('Error al buscar: ' + e.message, 'err');
    } finally {
      buscandoLive = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🔍 Buscar <b id="liveQuery"></b> en eBay';
        if ($id('liveQuery')) $id('liveQuery').textContent = '"' + q + '"';
      }
    }
  }

  // Actualizar visibilidad del botón después de aplicar filtros
  function actualizarBotonLive() {
    const q = (state.searchQuery || '').trim();
    const hayBusqueda = q.length >= 2;

    if (hayBusqueda) {
      mostrarBotonLive(true);
      const lq = $id('liveQuery');
      if (lq) lq.textContent = '"' + q + '"';
      ultimaQuery = q;
    } else {
      mostrarBotonLive(false);
    }
  }

  // Enganchar al final de aplicarFiltros
  const _origAplicar = window.aplicarFiltros;
  if (typeof _origAplicar === 'function') {
    window.aplicarFiltros = function() {
      _origAplicar.apply(this, arguments);
      setTimeout(actualizarBotonLive, 50);
    };
  }

  // Delegación de clicks
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.id === 'liveSearchBtn' || (t.closest && t.closest('#liveSearchBtn'))) {
      e.preventDefault();
      const q = (state.searchQuery || '').trim();
      if (q) buscarEnEbay(q);
      return;
    }
  });

  // Actualizar al arrancar
  setTimeout(actualizarBotonLive, 1500);
  setInterval(actualizarBotonLive, 3000);

  console.log('✅ Búsqueda en vivo lista');
})();


// ═══════════════════════════════════════════════
// FILTROS, ORDEN Y PAGINACIÓN (comdiaz_controls_v1)
// ═══════════════════════════════════════════════
(function comdiaz_controls_v1(){
  const $id = (id) => document.getElementById(id);

  // Estado
  let ordenActual = 'default';
  let precioMin = 0;
  let precioMax = 999999;
  let productosMostrados = 20;
  const INCREMENTO = 20;

  // ─── Aplicar orden y filtros a la lista filtrada ───
  function aplicarOrdenYFiltros() {
    let lista = [...state.filtered];

    // Filtro de precio
    lista = lista.filter(p => {
      const precio = Number(p.salePrice) || 0;
      return precio >= precioMin && precio <= precioMax;
    });

    // Orden
    if (ordenActual === 'price-asc') {
      lista.sort((a, b) => (Number(a.salePrice) || 0) - (Number(b.salePrice) || 0));
    } else if (ordenActual === 'price-desc') {
      lista.sort((a, b) => (Number(b.salePrice) || 0) - (Number(a.salePrice) || 0));
    } else if (ordenActual === 'newest') {
      // Los que tienen foundAt (recién traídos) primero
      lista.sort((a, b) => {
        const fa = a.foundAt || '';
        const fb = b.foundAt || '';
        return fb.localeCompare(fa);
      });
    }

    state.filteredOrdenados = lista;
    productosMostrados = 20;
    renderPaginado();
    actualizarContadores();
  }

  // ─── Renderizar solo los productos visibles ───
  function renderPaginado() {
    const grid = $id('products');
    const empty = $id('empty');
    const loading = $id('loading');
    const loadMoreWrap = $id('loadMoreWrap');

    if (!grid) return;
    if (loading) loading.classList.add('hidden');

    const lista = state.filteredOrdenados || state.filtered || [];
    const visibles = lista.slice(0, productosMostrados);

    if (!lista.length) {
      grid.classList.add('hidden');
      if (empty) empty.classList.remove('hidden');
      if (loadMoreWrap) loadMoreWrap.classList.add('hidden');
      return;
    }

    if (empty) empty.classList.add('hidden');
    grid.classList.remove('hidden');
    grid.innerHTML = '';

    visibles.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      const sourceLabel = p.source === 'manual' ? 'Local' : 'Importado';
      const sourceClass = p.source === 'manual' ? 'local' : '';

      card.innerHTML = `
        <div class="product-img-wrap">
          <img class="product-img" src="${p.image || ''}" alt="" loading="lazy" onerror="this.style.opacity=.3">
          <span class="product-source ${sourceClass}">${sourceLabel}</span>
        </div>
        <div class="product-body">
          <div class="product-category">${p.category || ''}</div>
          <div class="product-title">${p.title || 'Sin titulo'}</div>
          <div class="product-price">${Number(p.salePrice || 0).toFixed(2)}</div>
          <button class="product-add" data-pid="${p.id}">🛒 Agregar al pedido</button>
          <button class="product-buy" data-id="${p.id}">Pedir por WhatsApp</button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.product-buy')) return;
        if (e.target.closest('.product-add')) return;
        abrirModalProducto(p);
      });

      card.querySelector('.product-buy').addEventListener('click', (e) => {
        e.stopPropagation();
        pedirPorWhatsApp(p);
      });

      grid.appendChild(card);
    });

    // Actualizar marca de "En el pedido" si el carrito está activo
    if (typeof window.comdiaz_cart_update_ui === 'function') {
      setTimeout(window.comdiaz_cart_update_ui, 50);
    }

    // Mostrar/ocultar botón "Ver más"
    if (loadMoreWrap) {
      if (visibles.length < lista.length) {
        loadMoreWrap.classList.remove('hidden');
        const info = $id('loadMoreInfo');
        if (info) info.textContent = 'Mostrando ' + visibles.length + ' de ' + lista.length;
      } else {
        loadMoreWrap.classList.add('hidden');
      }
    }
  }

  // ─── Actualizar contadores ───
  function actualizarContadores() {
    const badge = $id('resultsCount');
    const lista = state.filteredOrdenados || state.filtered || [];
    if (badge) {
      badge.textContent = lista.length + ' producto' + (lista.length === 1 ? '' : 's');
    }
  }

  // ─── Actualizar visibilidad de la barra ───
  function actualizarBarra() {
    const bar = $id('filtersBar');
    const lista = state.filtered || [];
    if (bar) {
      if (lista.length > 0) bar.classList.remove('hidden');
      else bar.classList.add('hidden');
    }
  }

  // ─── Enganchar al aplicarFiltros existente ───
  const _origAplicar = window.aplicarFiltros;
  if (typeof _origAplicar === 'function') {
    window.aplicarFiltros = function() {
      _origAplicar.apply(this, arguments);
      setTimeout(() => {
        aplicarOrdenYFiltros();
        actualizarBarra();
      }, 100);
    };
  }

  // ─── Eventos ───
  document.addEventListener('change', (e) => {
    if (e.target.id === 'sortSelect') {
      ordenActual = e.target.value;
      aplicarOrdenYFiltros();
    }
  });

  document.addEventListener('click', (e) => {
    const t = e.target;

    // Toggle panel de filtros
    if (t.id === 'filtersToggle' || (t.closest && t.closest('#filtersToggle'))) {
      const panel = $id('filtersPanel');
      const btn = $id('filtersToggle');
      if (panel) panel.classList.toggle('hidden');
      if (btn) btn.classList.toggle('active');
      return;
    }

    // Aplicar filtros
    if (t.id === 'applyFilters' || (t.closest && t.closest('#applyFilters'))) {
      precioMin = Number($id('priceMin')?.value) || 0;
      precioMax = Number($id('priceMax')?.value) || 999999;
      aplicarOrdenYFiltros();
      const panel = $id('filtersPanel');
      if (panel) panel.classList.add('hidden');
      const btn = $id('filtersToggle');
      if (btn) btn.classList.remove('active');
      return;
    }

    // Limpiar filtros
    if (t.id === 'clearFilters' || (t.closest && t.closest('#clearFilters'))) {
      if ($id('priceMin')) $id('priceMin').value = '';
      if ($id('priceMax')) $id('priceMax').value = '';
      precioMin = 0;
      precioMax = 999999;
      ordenActual = 'default';
      if ($id('sortSelect')) $id('sortSelect').value = 'default';
      aplicarOrdenYFiltros();
      return;
    }

    // Ver más
    if (t.id === 'loadMoreBtn' || (t.closest && t.closest('#loadMoreBtn'))) {
      productosMostrados += INCREMENTO;
      renderPaginado();
      return;
    }
  });

  // Exponer
  window.comdiaz_render_paginado = renderPaginado;

  // Arrancar
  setTimeout(() => {
    aplicarOrdenYFiltros();
    actualizarBarra();
  }, 1500);

  console.log('✅ Controles listos');
})();


// ═══════════════════════════════════════════════
// TRACKING DE VISITAS (comdiaz_tracking_v1)
// ═══════════════════════════════════════════════
(function comdiaz_tracking_v1(){
  // ─── Enviar evento al backend ───
  function track(tipo, extra) {
    if (!navigator.onLine) return;
    const data = Object.assign({ tipo }, extra || {});
    try {
      // Silent fetch (fire and forget)
      fetch(API_BASE + '/api/track-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(() => {});
    } catch(e) {}
  }

  // ─── 1) Visita de página (1 vez por sesión) ───
  const SESSION_KEY = 'comdiaz_tracked_session';
  const ultimaSesion = sessionStorage.getItem(SESSION_KEY);
  if (!ultimaSesion) {
    track('page');
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  }

  // ─── 2) Ver producto (desde el modal) ───
  const _origAbrir = window.abrirModalProducto;
  if (typeof _origAbrir === 'function') {
    window.abrirModalProducto = function(producto) {
      if (producto && producto.id) {
        track('product', {
          productId: producto.id,
          productTitle: producto.title,
        });
      }
      return _origAbrir.apply(this, arguments);
    };
  }

  // ─── 3) Agregar al carrito ───
  const _origAdd = window.comdiaz_cart?.add;
  if (typeof _origAdd === 'function') {
    // No podemos sobreescribir directamente, pero escuchamos el evento
    // Al hacer click en .product-add, el carrito agrega. Lo detectamos abajo.
  }

  // ─── 4) WhatsApp click (delegación) ───
  document.addEventListener('click', (e) => {
    const t = e.target;

    // Agregar al carrito
    if (t.classList && t.classList.contains('product-add')) {
      const pid = t.dataset.pid;
      if (pid) {
        const prod = state.products?.find(p => p.id === pid);
        track('cart', {
          productId: pid,
          productTitle: prod?.title || '',
        });
      }
    }

    // Clic en WhatsApp (cualquier botón de WhatsApp)
    if (t.closest && (
      t.closest('#headerWaBtn') ||
      t.closest('#waInfoBtn') ||
      t.closest('#footerWaBtn') ||
      t.closest('#waFloat') ||
      t.closest('.product-buy') ||
      t.closest('#cartSend') ||
      t.closest('#pmWaBtn')
    )) {
      track('whatsapp');
    }
  }, true);

  console.log('✅ Tracking de visitas activo');
})();


// ═══════════════════════════════════════════════
// COMPARTIR PRODUCTO (comdiaz_share_v1)
// ═══════════════════════════════════════════════
(function comdiaz_share_v1(){
  let productoActual = null;

  // Guardar el producto cuando se abre el modal
  const _origAbrir = window.abrirModalProducto;
  if (typeof _origAbrir === 'function') {
    window.abrirModalProducto = function(producto) {
      productoActual = producto;
      return _origAbrir.apply(this, arguments);
    };
  }

  function generarMensaje(p) {
    const titulo = p.title || 'Producto';
    const precio = Number(p.salePrice || 0).toFixed(2);
    const shopUrl = 'https://com-diaz-web.onrender.com/shop.html';
    const wa = (state && state.config && state.config.whatsapp) || '5351425691';
    const tienda = (state && state.config && state.config.titulo) || 'Comdiaz Shop';

    return '🛍️ Mira este producto en *' + tienda + ':*\n\n' +
           '*_' + titulo + '_*\n\n' +
           '💰 Precio: $' + precio + '\n\n' +
           '🔗 ' + shopUrl + '\n\n' +
           '📲 Pedidos por WhatsApp:\n' +
           'https://wa.me/' + wa;
  }

  async function compartir(p) {
    if (!p) return;
    const texto = generarMensaje(p);

    // 1) Web Share API (nativo móvil)
    if (navigator.share) {
      try {
        await navigator.share({ title: p.title, text: texto });
        if (typeof toast === 'function') toast('✅ Compartido', 'ok');
        return;
      } catch(e) {
        if (e.name === 'AbortError') return;
      }
    }

    // 2) Copiar al portapapeles
    try {
      await navigator.clipboard.writeText(texto);
      if (typeof toast === 'function') toast('📋 Copiado al portapapeles', 'ok');
    } catch(e) {
      prompt('Copia el texto:', texto);
    }
  }

  document.addEventListener('click', async (e) => {
    if (e.target.id === 'pmShareBtn' || (e.target.closest && e.target.closest('#pmShareBtn'))) {
      e.preventDefault();
      if (productoActual) await compartir(productoActual);
      else if (typeof toast === 'function') toast('Producto no disponible', 'err');
    }
  });

  console.log('✅ Compartir producto listo');
})();


// ═══════════════════════════════════════════════
// NOTIFICAR PEDIDO AL BACKEND (comdiaz_order_v1)
// ═══════════════════════════════════════════════
(function comdiaz_order_v1(){
  // Interceptar el envío del pedido
  const _origSend = window.comdiaz_cart && window.comdiaz_cart.send;
  if (typeof _origSend !== 'function') {
    console.log('⚠️  No encontré comdiaz_cart.send');
    return;
  }

  // Sobreescribir send
  window.comdiaz_cart.send = async function() {
    // Obtener datos del pedido ANTES de abrir WhatsApp
    const items = Array.isArray(window.comdiaz_cart.items) ? window.comdiaz_cart.items : [];
    // Nota: el carrito guarda internamente. Vamos a leer el localStorage
    let cart = [];
    try {
      const raw = localStorage.getItem('comdiaz_cart');
      if (raw) cart = JSON.parse(raw);
    } catch(_) {}

    const nombre = (document.getElementById('cartName')?.value || '').trim();
    const notas = (document.getElementById('cartNotes')?.value || '').trim();

    if (!nombre) {
      // El original ya valida esto
      return _origSend.apply(this, arguments);
    }

    if (cart.length === 0) {
      return _origSend.apply(this, arguments);
    }

    const total = cart.reduce((acc, item) => acc + (Number(item.price) * (item.qty || 1)), 0);

    // Enviar al backend (silencioso, no bloquea)
    try {
      fetch(API_BASE + '/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          notas,
          items: cart.map(i => ({
            title: i.title,
            price: Number(i.price),
            qty: Number(i.qty) || 1,
          })),
          total,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch(_) {}

    // Y ahora sí, abrir WhatsApp como siempre
    return _origSend.apply(this, arguments);
  };

  console.log('✅ Notificación de pedidos activa');
})();


// ═══════════════════════════════════════════════
// BANNER DE PROMOCIONES (comdiaz_banner_v1)
// ═══════════════════════════════════════════════
(function comdiaz_banner_v1(){
  function renderBanner() {
    const box = document.getElementById('shopBanner');
    if (!box) return;

    const cfg = state.config || {};
    const activo = cfg.bannerActivo === true;
    const texto = (cfg.bannerTexto || '').trim();
    const color = cfg.bannerColor || 'gradient';

    if (!activo || !texto) {
      box.classList.add('hidden');
      return;
    }

    box.className = 'shop-banner ' + color;
    box.textContent = texto;
    box.classList.remove('hidden');
  }

  // Enganchar al cargar catálogo
  const _orig = window.cargarCatalogo;
  if (typeof _orig === 'function') {
    window.cargarCatalogo = async function() {
      await _orig.apply(this, arguments);
      setTimeout(renderBanner, 200);
    };
  }

  // Arranque
  setTimeout(renderBanner, 1500);
  setInterval(renderBanner, 10000);

  console.log('✅ Banner listo');
})();


// NOTIFICAR PEDIDO AL BACKEND (v2)
(function comdiaz_order_v2(){
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest && e.target.closest("#cartSend");
    if (!btn) return;

    let cart = [];
    try {
      const raw = localStorage.getItem("comdiaz_cart");
      if (raw) cart = JSON.parse(raw);
    } catch(_) {}

    if (!cart.length) return;

    const nombre = (document.getElementById("cartName")?.value || "").trim();
    const notas = (document.getElementById("cartNotes")?.value || "").trim();
    if (!nombre) return;

    const total = cart.reduce((acc, item) => acc + (Number(item.price) * (item.qty || 1)), 0);

    console.log("[ORDER] Enviando pedido:", nombre, cart.length, total);

    try {
      const r = await fetch(API_BASE + "/api/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          notas,
          items: cart.map(i => ({
            title: i.title,
            price: Number(i.price),
            qty: Number(i.qty) || 1,
          })),
          total,
        }),
      });
      const data = await r.json();
      console.log("[ORDER] Respuesta:", data);
    } catch(err) {
      console.error("[ORDER] Error:", err.message);
    }
  }, true);

  console.log("✅ Notificador de pedidos v2 activo");
})();
