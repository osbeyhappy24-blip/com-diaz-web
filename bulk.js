
// ═══════════════════════════════════════════════════════
// CARGA MASIVA v2 — Acordeón de productos
// ═══════════════════════════════════════════════════════
(function comdiaz_bulk_v2(){
  const $B = id => document.getElementById(id);
  const KEY = 'comdiaz_bulk_v2_state';
  const MAX_FOTOS = 50;
  const BATCH_SIZE = 5;

  let productos = [];  // Array de productos individuales
  let provinciasCache = null;
  let categoriasCache = null;
  let publicando = false;

  function sleep(ms) { return new Promise(s => setTimeout(s, ms)); }

  // ─── Persistencia ───
  function cargar() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && Array.isArray(saved.productos) && saved.productos.length) {
        if (confirm('📦 Tienes ' + saved.productos.length + ' productos en borrador. ¿Continuar editando?')) {
          productos = saved.productos;
        } else {
          localStorage.removeItem(KEY);
        }
      }
    } catch(_) {}
  }

  function guardar() {
    try {
      const copia = productos.map(p => ({
        id: p.id, base64: p.base64, url: p.url,
        titulo: p.titulo, descripcion: p.descripcion,
        precioUSD: p.precioUSD, precioCUP: p.precioCUP,
        category: p.category, estado: p.estado,
        provincia: p.provincia, municipio: p.municipio,
        cantidad: p.cantidad, notas: p.notas,
        descartado: p.descartado, listo: p.listo
      }));
      localStorage.setItem(KEY, JSON.stringify({ productos: copia }));
    } catch(e) {
      if (e.name === 'QuotaExceededError') {
        try {
          const copia = productos.map(p => ({ ...p, base64: p.url ? null : p.base64 }));
          localStorage.setItem(KEY, JSON.stringify({ productos: copia }));
        } catch(_) {}
      }
    }
  }

  // ─── Comprimir imagen ───
  function comprimir(file, maxSize, quality) {
    maxSize = maxSize || 800; quality = quality || 0.6;
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = e => img.src = e.target.result;
      reader.onerror = reject;
      reader.readAsDataURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = (h / w) * maxSize; w = maxSize; }
          else { w = (w / h) * maxSize; h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    });
  }


  // ─── Cargar provincias y categorías ───
  async function cargarProvincias() {
    if (provinciasCache && Object.keys(provinciasCache).length > 0) return provinciasCache;
    try {
      const cached = localStorage.getItem('comdiaz_provincias_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Object.keys(parsed).length > 0) {
          provinciasCache = parsed;
          return provinciasCache;
        }
      }
    } catch(_) {}
    try {
      const r = await fetch(API + '/api/public/provincias');
      const d = await r.json();
      if (d && d.provincias) {
        provinciasCache = d.provincias;
        try { localStorage.setItem('comdiaz_provincias_cache', JSON.stringify(d.provincias)); } catch(_) {}
        return provinciasCache;
      }
    } catch(_) {}
    return {};
  }

  function cargarCategorias() {
    if (categoriasCache) return categoriasCache;
    const cats = (window.state?.categories || []).map(c => c.label || c);
    categoriasCache = cats.length ? cats : ['Local'];
    return categoriasCache;
  }

  // ─── Preview de fotos (Paso 1) ───
  function renderPreview() {
    const grid = $B('bulkPreviewGrid');
    if (!grid) return;
    grid.innerHTML = productos.map((p, i) => `
      <div class="bulk-preview-item">
        <img src="${p.base64 || ''}" alt="">
        <span class="bulk-num">${i + 1}</span>
        <button class="bulk-remove" data-idx="${i}">✕</button>
      </div>
    `).join('');
    grid.querySelectorAll('.bulk-remove').forEach(btn => {
      btn.onclick = () => {
        productos.splice(Number(btn.dataset.idx), 1);
        guardar();
        renderPreview();
        actualizarContador();
      };
    });
    actualizarContador();
    if ($B('bulkNext1')) $B('bulkNext1').disabled = productos.length === 0;
  }

  function actualizarContador() {
    if ($B('bulkCounter')) $B('bulkCounter').textContent = productos.length + ' / ' + MAX_FOTOS + ' productos';
  }

  // ─── Ir a paso (1 o 2 o 3) ───
  function irPaso(n) {
    [1, 2, 3].forEach(i => {
      const step = $B('bulkStep' + i);
      if (step) step.classList.toggle('hidden', i !== n);
    });
  }

  // ─── Iniciar edición (Paso 2) ───
  async function iniciarEdicion() {
    if (productos.length === 0) return;
    await cargarProvincias();
    cargarCategorias();
    irPaso(2);
    renderAcordeon();
    actualizarPublishCount();
  }

  // ─── Render acordeón ───
  function renderAcordeon() {
    const list = $B('bulkEditList');
    if (!list) return;
    const provincias = provinciasCache || {};
    const categorias = categoriasCache || [];

    list.innerHTML = productos.map((p, i) => {
      const provinciaOpts = Object.keys(provincias).sort()
        .map(pr => `<option value="${pr}" ${p.provincia === pr ? 'selected' : ''}>${pr}</option>`).join('');
      const catOpts = categorias
        .map(c => `<option value="${c}" ${p.category === c ? 'selected' : ''}>${c}</option>`).join('');
      
      return `
        <div class="bulk-edit-item ${p.listo ? 'ready' : ''} ${p.descartado ? 'discarded' : ''}" data-idx="${i}">
          <div class="bulk-edit-header" data-idx="${i}">
            <img class="bulk-thumb" src="${p.base64 || p.url || ''}" alt="">
            <div class="bulk-edit-summary">
              <div class="b-title">${p.titulo || 'Sin título'}</div>
              <div class="b-meta">
                <span class="b-price">$${Number(p.precioUSD || 0).toFixed(2)}</span>
                <span>${p.provincia || 'Sin provincia'}</span>
              </div>
            </div>
            <span class="bulk-edit-badge">${p.listo ? '✅' : '⏳'}</span>
            <button class="bulk-delete" data-idx="${i}">🗑️</button>
          </div>
          <div class="bulk-edit-body" style="display:none" data-body="${i}">
            <label><span>Título *</span><input type="text" data-field="titulo" data-idx="${i}" value="${(p.titulo || '').replace(/"/g, '&quot;')}" placeholder="Ej: Bicicleta rodado 26"></label>
            <label><span>Descripción (opcional)</span><textarea data-field="descripcion" data-idx="${i}" placeholder="La IA la generará después si la dejas vacía">${p.descripcion || ''}</textarea></label>
            <div class="bulk-row-2">
              <label><span>Precio USD *</span><input type="number" data-field="precioUSD" data-idx="${i}" value="${p.precioUSD || ''}" step="0.01" min="0"></label>
              <label><span>Precio CUP</span><input type="number" data-field="precioCUP" data-idx="${i}" value="${p.precioCUP || ''}" step="1" min="0"></label>
            </div>
            <div class="bulk-row-2">
              <label><span>Categoría</span><select data-field="category" data-idx="${i}"><option value="">Elige...</option>${catOpts}</select></label>
              <label><span>Estado</span><select data-field="estado" data-idx="${i}"><option value="nuevo" ${p.estado === 'nuevo' ? 'selected' : ''}>Nuevo</option><option value="usado" ${p.estado === 'usado' ? 'selected' : ''}>Usado</option><option value="reacondicionado" ${p.estado === 'reacondicionado' ? 'selected' : ''}>Reacondicionado</option></select></label>
            </div>
            <div class="bulk-row-2">
              <label><span>Provincia *</span><select data-field="provincia" data-idx="${i}"><option value="">Elige...</option>${provinciaOpts}</select></label>
              <label><span>Municipio</span><select data-field="municipio" data-idx="${i}" ${!p.provincia ? 'disabled' : ''}><option value="">Todos</option></select></label>
            </div>
            <button type="button" class="btn-apply-ubic" data-idx="${i}">📍 Aplicar esta ubicación a todas</button>
            <div class="bulk-row-2">
              <label><span>Cantidad</span><input type="number" data-field="cantidad" data-idx="${i}" value="${p.cantidad || 1}" min="1"></label>
              <label><span>Notas (privadas)</span><input type="text" data-field="notas" data-idx="${i}" value="${(p.notas || '').replace(/"/g, '&quot;')}" placeholder="Opcional"></label>
            </div>
            <div class="bulk-actions-row">
              <button type="button" class="bulk-btn-ready" data-ready="${i}" ${p.listo ? 'disabled' : ''}>${p.listo ? '✅ Listo' : '✅ Marcar listo'}</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    bindAcordeon();
    if (productos.length > 0) {
      const firstBody = list.querySelector('[data-body="0"]');
      if (firstBody) firstBody.style.display = 'flex';
    }
  }


  // ─── Bind eventos del acordeón ───
  function bindAcordeon() {
    const list = $B('bulkEditList');
    if (!list) return;

    // Toggle expandir/colapsar
    list.querySelectorAll('.bulk-edit-header').forEach(h => {
      h.onclick = (e) => {
        if (e.target.closest('.bulk-delete')) return;
        const idx = h.dataset.idx;
        const body = list.querySelector('[data-body="' + idx + '"]');
        if (!body) return;
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : 'flex';
        h.closest('.bulk-edit-item').classList.toggle('expanded', !isOpen);
      };
    });

    // Eliminar producto
    list.querySelectorAll('.bulk-delete').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar este producto del lote?')) return;
        productos.splice(Number(btn.dataset.idx), 1);
        guardar();
        renderAcordeon();
        actualizarPublishCount();
      };
    });

    // Cambios en campos
    list.querySelectorAll('[data-field]').forEach(el => {
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        const idx = Number(el.dataset.idx);
        const field = el.dataset.field;
        if (!productos[idx]) return;
        productos[idx][field] = el.value;
        
        // Actualizar resumen en header
        const item = list.querySelector('[data-idx="' + idx + '"]');
        if (item) {
          const summary = item.querySelector('.b-title');
          const price = item.querySelector('.b-price');
          const prov = item.querySelector('.b-meta span:nth-child(2)');
          if (summary) summary.textContent = productos[idx].titulo || 'Sin título';
          if (price) price.textContent = '$' + Number(productos[idx].precioUSD || 0).toFixed(2);
          if (prov) prov.textContent = productos[idx].provincia || 'Sin provincia';
        }

        // Si cambia provincia, actualizar municipios
        if (field === 'provincia') {
          const munSel = list.querySelector('[data-field="municipio"][data-idx="' + idx + '"]');
          if (munSel) {
            const prov = el.value;
            const municipios = (provinciasCache || {})[prov] || [];
            munSel.disabled = !municipios.length;
            munSel.innerHTML = '<option value="">Todos</option>' + municipios.sort().map(m => `<option value="${m}">${m}</option>`).join('');
          }
        }

        guardar();
        actualizarPublishCount();
      });
    });

    // Aplicar ubicación a todas
    list.querySelectorAll('.btn-apply-ubic').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.idx);
        const p = productos[idx];
        if (!p || !p.provincia) {
          alert('Elige primero la provincia de este producto');
          return;
        }
        if (!confirm('¿Aplicar "' + p.provincia + (p.municipio ? ' / ' + p.municipio : '') + '" a todos los productos?')) return;
        productos.forEach(x => {
          x.provincia = p.provincia;
          x.municipio = p.municipio;
        });
        guardar();
        renderAcordeon();
        alert('✅ Ubicación aplicada a todos');
      };
    });

    // Marcar listo
    list.querySelectorAll('.bulk-btn-ready').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.ready);
        const p = productos[idx];
        if (!p) return;
        if (!p.titulo || !p.titulo.trim()) { alert('Falta el título'); return; }
        if (!p.precioUSD || Number(p.precioUSD) <= 0) { alert('Falta el precio USD'); return; }
        if (!p.provincia) { alert('Falta la provincia'); return; }
        p.listo = true;
        guardar();
        renderAcordeon();
        actualizarPublishCount();
      };
    });
  }

  function actualizarPublishCount() {
    const listos = productos.filter(p => p.listo && !p.descartado).length;
    if ($B('bulkPublishCount')) $B('bulkPublishCount').textContent = listos;
    if ($B('bulkPublishAll')) $B('bulkPublishAll').disabled = listos === 0;
  }

  // ─── Upload con XHR ───
  function apiUpload(payload) {
    return new Promise((resolve) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', API + '/api/upload-image', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Comdiaz-Key', localStorage.getItem('comdiaz_api_key') || '');
        xhr.timeout = 120000;
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch(e) { resolve({ ok: false, error: 'JSON inválido' }); }
          } else resolve({ ok: false, error: 'HTTP ' + xhr.status });
        };
        xhr.onerror = () => resolve({ ok: false, error: 'Error de red' });
        xhr.ontimeout = () => resolve({ ok: false, error: 'Timeout' });
        xhr.send(JSON.stringify(payload));
      } catch(e) { resolve({ ok: false, error: e.message }); }
    });
  }

  // ─── Publicar de 5 en 5 ───
  async function publicarTodos() {
    const listos = productos.filter(p => p.listo && !p.descartado);
    if (!listos.length) { alert('No hay productos listos'); return; }
    if (publicando) return;
    publicando = true;

    irPaso(3);
    const log = $B('bulkPublishLog');
    if (log) log.innerHTML = '';

    let exitosos = 0;
    let fallidos = 0;

    for (let i = 0; i < listos.length; i++) {
      const p = listos[i];
      const pct = Math.round(((i) / listos.length) * 100);
      
      if ($B('bulkProgressFill')) $B('bulkProgressFill').style.width = pct + '%';
      if ($B('bulkProgressText')) $B('bulkProgressText').textContent = 'Publicando ' + (i + 1) + ' / ' + listos.length + '...';
      if ($B('bulkProgressOk')) $B('bulkProgressOk').textContent = '✅ ' + exitosos + (fallidos ? ' · ❌ ' + fallidos : '');

      try {
        // 1) Subir foto si no tiene URL
        let imgUrl = p.url;
        if (!imgUrl && p.base64) {
          const up = await apiUpload({ image: p.base64, nombre: 'local_' + Date.now() });
          if (!up || !up.ok || !up.url) throw new Error('Upload: ' + (up?.error || '?'));
          imgUrl = up.url;
          p.url = imgUrl;
        }
        if (!imgUrl) throw new Error('Sin imagen');

        // 2) Crear producto
        const body = {
          tipo: 'local',
          title: p.titulo,
          description: p.descripcion || '',
          images: [imgUrl],
          image: imgUrl,
          category: p.category || 'Local',
          estado: p.estado || 'nuevo',
          provincia: p.provincia,
          municipio: p.municipio || null,
          precioUSD: Number(p.precioUSD) || 0,
          precioCUP: Number(p.precioCUP) || null,
          cantidad: Number(p.cantidad) || 1,
          notas: p.notas || null,
          publicado: true
        };

        const r = await api('/api/manual/products', {
          method: 'POST',
          body: JSON.stringify(body)
        });

        if (!r || !r.ok) throw new Error('Backend: ' + (r?.error || '?'));

        // Marcar como publicado
        p.publicado = true;
        exitosos++;
        if (log) log.innerHTML += '<div style="color:#10b981">✅ ' + (p.titulo || '(sin título)').slice(0, 50) + '</div>';
      } catch(e) {
        fallidos++;
        if (log) log.innerHTML += '<div style="color:#ef4444">❌ ' + (p.titulo || '').slice(0, 30) + ': ' + e.message + '</div>';
      }

      // Throttle 1s entre productos
      await sleep(1000);
    }

    if ($B('bulkProgressFill')) $B('bulkProgressFill').style.width = '100%';
    if ($B('bulkProgressText')) $B('bulkProgressText').textContent = '✅ Completado: ' + exitosos + ' publicados' + (fallidos ? ' · ' + fallidos + ' fallidos' : '');
    if ($B('bulkProgressOk')) $B('bulkProgressOk').textContent = '';

    // Quitar los publicados del array
    productos = productos.filter(p => !p.publicado);
    guardar();
    publicando = false;

    setTimeout(() => {
      if (productos.length === 0) {
        cerrarModal();
        window.dispatchEvent(new CustomEvent('comdiaz:reload-locales'));
      } else {
        alert('✅ Publicados: ' + exitosos + '\\n❌ Fallidos: ' + fallidos + '\\n\\nQuedan ' + productos.length + ' pendientes');
        irPaso(2);
        renderAcordeon();
        actualizarPublishCount();
      }
    }, 1500);
  }

  // ─── Abrir/cerrar modal ───
  function abrirModal() {
    const modal = $B('bulkModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    irPaso(1);
    renderPreview();
    actualizarContador();
  }

  function cerrarModal() {
    const modal = $B('bulkModal');
    if (modal) modal.classList.add('hidden');
    if (productos.length === 0) {
      try { localStorage.removeItem(KEY); } catch(_) {}
    }
  }

  // ─── Init ───
  function init() {
    cargar();

    // Paso 1: seleccionar fotos
    $B('bulkSelectBtn')?.addEventListener('click', () => $B('bulkFileInput').click());
    $B('bulkFileInput')?.addEventListener('change', async (e) => {
      if (!e.target.files) return;
      const files = Array.from(e.target.files).slice(0, MAX_FOTOS - productos.length);
      if (!files.length) { alert('Máximo ' + MAX_FOTOS + ' fotos'); return; }

      const btn = $B('bulkSelectBtn');
      const orig = btn.textContent;
      btn.textContent = '⏳ Comprimiendo ' + files.length + '...';
      btn.disabled = true;

      for (const file of files) {
        try {
          const base64 = await comprimir(file, 800, 0.6);
          productos.push({
            id: 'p' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            base64: base64,
            url: null,
            titulo: '',
            descripcion: '',
            precioUSD: '',
            precioCUP: '',
            category: '',
            estado: 'nuevo',
            provincia: '',
            municipio: '',
            cantidad: 1,
            notas: '',
            listo: false,
            descartado: false
          });
        } catch(_) {}
      }

      btn.textContent = orig;
      btn.disabled = false;
      e.target.value = '';
      guardar();
      renderPreview();
    });

    // Paso 1 → Paso 2
    $B('bulkNext1')?.addEventListener('click', iniciarEdicion);
    $B('bulkCancel1')?.addEventListener('click', () => {
      if (productos.length && !confirm('¿Descartar los ' + productos.length + ' productos?')) return;
      productos = [];
      guardar();
      cerrarModal();
    });

    // Paso 2 → Paso 1 (volver)
    $B('bulkBack1')?.addEventListener('click', () => irPaso(1));

    // Paso 2 → publicar
    $B('bulkPublishAll')?.addEventListener('click', publicarTodos);

    // Cerrar modal
    $B('bulkModalClose')?.addEventListener('click', () => {
      if (publicando) { alert('Espera a que termine de publicar'); return; }
      cerrarModal();
    });

    // Trigger desde botón "Carga masiva"
    window.addEventListener('comdiaz:open-bulk', abrirModal);

    // Recargar locales al terminar
    window.addEventListener('comdiaz:reload-locales', () => {
      if (typeof cargarLocales === 'function') cargarLocales();
    });

    console.log('✅ Bulk v2 listo');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1500));
  } else {
    setTimeout(init, 1500);
  }

})();
