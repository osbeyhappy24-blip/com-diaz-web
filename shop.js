// Comdiaz Shop - Logica del catalogo publico

const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://com-diaz.onrender.com';

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
  window.open(generarLinkWhatsApp(producto), '_blank');
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
  window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(msg), '_blank');
};

// ─── Arranque ───
cargarCatalogo();
