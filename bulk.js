
// ═══════════════════════════════════════════════════════
// CARGA MASIVA CON IA — Parte 1: Setup + helpers
// ═══════════════════════════════════════════════════════
(function comdiaz_bulk_v1(){
  const $B = id => document.getElementById(id);
  const KEY = 'comdiaz_bulk_state';
  const QUOTA_KEY = 'comdiaz_bulk_quota';
  const MAX_FOTOS = 30;
  const MAX_DAILY = 300;
  const BATCH_SIZE = 5;
  const BATCH_INTERVAL = 15000;  // 15s entre batches (con 3 keys Gemini = 45 RPM)

  let st = { paso: 1, fotos: [], provincia: '', municipio: '', estadoBase: 'auto', categoria: '', procesando: false, pausado: false };
  let provinciasCache = null;

  function sleep(ms) { return new Promise(s => setTimeout(s, ms)); }

  function cargar() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && Array.isArray(saved.fotos) && saved.fotos.length) {
        if (confirm('📦 Tienes un lote sin terminar (' + saved.fotos.length + ' fotos). ¿Continuar?')) st = saved;
        else localStorage.removeItem(KEY);
      }
    } catch(_) {}
  }

  function guardar() {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch(e) {
      if (e.name === 'QuotaExceededError') {
        // NO borrar base64 de memoria (rompe el flujo actual)
        // Solo guardar versión sin base64 en localStorage, sin tocar st
        try {
          const copia = JSON.parse(JSON.stringify(st));
          copia.fotos.forEach(f => { if (f.url && f.base64) delete f.base64; });
          localStorage.setItem(KEY, JSON.stringify(copia));
          console.warn('[BULK] localStorage lleno, guardando sin base64');
        } catch(_) {}
      }
    }
  }

  function cargarCuota() {
    try {
      const raw = localStorage.getItem(QUOTA_KEY);
      if (raw) {
        const q = JSON.parse(raw);
        const hoy = new Date().toISOString().slice(0, 10);
        if (q.fecha === hoy) return q.usados || 0;
      }
    } catch(_) {}
    return 0;
  }

  function guardarCuota(usados) {
    const hoy = new Date().toISOString().slice(0, 10);
    try { localStorage.setItem(QUOTA_KEY, JSON.stringify({ fecha: hoy, usados })); } catch(_) {}
  }

  function cuotaDisponible() { return MAX_DAILY - cargarCuota(); }

  function actualizarCuotaUI() {
    const usados = cargarCuota();
    const pct = Math.min(100, (usados / MAX_DAILY) * 100);
    if ($B('bulkQuotaFill')) {
      $B('bulkQuotaFill').style.width = pct + '%';
      $B('bulkQuotaFill').classList.toggle('warn', pct >= 80);
    }
    if ($B('bulkQuotaText')) $B('bulkQuotaText').textContent = usados + ' / ' + MAX_DAILY;
    if ($B('bulkQuotaAvailable')) $B('bulkQuotaAvailable').textContent = (MAX_DAILY - usados);
  }

  function comprimir(file, maxSize, quality) {
    maxSize = maxSize || 800; quality = quality || 0.6;
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
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


  // ─── Navegación entre pasos ───
  function irPaso(n) {
    st.paso = n;
    guardar();
    [1,2,3,4].forEach(i => {
      const panel = $B('bulkStep' + i);
      if (panel) panel.classList.toggle('hidden', i !== n);
      const dot = document.querySelector('.bulk-step-dot[data-step="' + i + '"]');
      if (dot) {
        dot.classList.toggle('active', i === n);
        dot.classList.toggle('done', i < n);
      }
      const line = document.querySelectorAll('.bulk-step-line')[i - 1];
      if (line) line.classList.toggle('done', i < n);
    });
    if ($B('bulkStepLabel')) $B('bulkStepLabel').textContent = 'Paso ' + n + ' de 4';
    if (n === 3) actualizarProgreso();
    if (n === 4) renderReview();
  }


  // ─── Selección de archivos ───
  async function handleFiles(files) {
    const disponibles = MAX_FOTOS - st.fotos.length;
    if (disponibles <= 0) { alert('Máximo ' + MAX_FOTOS + ' fotos por lote'); return; }
    const arr = Array.from(files).slice(0, disponibles);
    if (!arr.length) return;

    const btn = $B('bulkSelectBtn');
    const original = btn.textContent;
    btn.textContent = '⏳ Comprimiendo...';
    btn.disabled = true;

    for (const file of arr) {
      try {
        const base64 = await comprimir(file, 800, 0.6);
        st.fotos.push({
          id: 'f' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          base64: base64, url: null, sugerencia: null,
          analizada: false, error: null, dup: false
        });
      } catch(e) { console.warn('[BULK] Error comprimiendo:', e); }
    }

    btn.textContent = original;
    btn.disabled = false;
    guardar();
    renderPreview();
  }

  // ─── Render preview (paso 1) ───
  function renderPreview() {
    const grid = $B('bulkPreviewGrid');
    if (!grid) return;
    grid.innerHTML = st.fotos.map((f, i) => `
      <div class="bulk-preview-item">
        <img src="${f.base64 || f.url || ''}" alt="">
        <button class="bulk-remove" data-idx="${i}">✕</button>
      </div>
    `).join('');
    grid.querySelectorAll('.bulk-remove').forEach(btn => {
      btn.onclick = () => {
        st.fotos.splice(Number(btn.dataset.idx), 1);
        guardar(); renderPreview();
      };
    });
    if ($B('bulkNext1')) $B('bulkNext1').disabled = st.fotos.length === 0;
  }


  // ─── Análisis individual ───
  async function analizarFoto(foto) {
    try {
      if (!foto.url) {
        const up = await api('/api/upload-image', {
          method: 'POST',
          body: JSON.stringify({ image: foto.base64, nombre: 'bulk_' + foto.id })
        });
        if (up && up.ok && up.url) {
          foto.url = up.url;
          // NO borrar base64 hasta después de publicar (respaldo)
          // delete foto.base64;
          console.log('[BULK] Foto subida a ImgBB:', foto.url);
          guardar();
        } else {
          console.warn('[BULK] ImgBB falló:', up?.error);
          foto.error = 'No se pudo subir: ' + (up?.error || '?');
          return;
        }
      }

      const r = await api('/api/ai/analyze-photo', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: foto.url })
      });

      if (r && r.ok && r.sugerencia) {
        console.log('[BULK] Análisis OK:', foto.id, '→', r.sugerencia.titulo);
        if (st.estadoBase && st.estadoBase !== 'auto') r.sugerencia.estado = st.estadoBase;
        if (st.categoria) r.sugerencia.categoria = st.categoria;
        foto.sugerencia = r.sugerencia;
        foto.analizada = true;
        foto.error = null;

        const existentes = (window.state && window.state.productosManuales) || [];
        foto.dup = existentes.some(p =>
          p.tipo === 'local' && p.title && foto.sugerencia &&
          String(p.title).toLowerCase().trim() === String(foto.sugerencia.titulo).toLowerCase().trim()
        );

        guardarCuota(cargarCuota() + 1);
      } else {
        foto.error = (r && r.error) || 'Error analizando';
      }
    } catch(e) {
      foto.error = e.message || 'Error de red';
    }
    guardar();
    renderLive();
    actualizarProgreso();
  }


  // ─── Procesar lote completo ───
  async function procesarLote() {
    if (st.procesando) return;
    st.procesando = true;
    st.pausado = false;
    irPaso(3);
    renderLive();

    const pendientes = st.fotos.filter(f => !f.analizada && !f.error && (f.base64 || f.url));
    const disponibles = cuotaDisponible();

    if (!pendientes.length) {
      st.procesando = false;
      irPaso(4);
      return;
    }

    if (pendientes.length > disponibles) {
      const ok = confirm('Solo te quedan ' + disponibles + ' análisis hoy. Se procesarán ' + disponibles + ' fotos. ¿Continuar?');
      if (!ok) { st.procesando = false; return; }
    }

    const aProcesar = pendientes.slice(0, disponibles);

    for (let i = 0; i < aProcesar.length; i += BATCH_SIZE) {
      if (st.pausado) { st.procesando = false; actualizarProgreso(); return; }

      const lote = aProcesar.slice(i, i + BATCH_SIZE);
      const batchStart = Date.now();
      lote.forEach(f => { f.procesando = true; });
      renderLive();

      await Promise.all(lote.map(f => analizarFoto(f)));
      lote.forEach(f => { delete f.procesando; });

      guardar();

      if (i + BATCH_SIZE < aProcesar.length) {
        const elapsed = Date.now() - batchStart;
        const wait = Math.max(0, BATCH_INTERVAL - elapsed);
        if (wait > 0 && !st.pausado) await sleep(wait);
      }
    }

    st.procesando = false;
    guardar();
    irPaso(4);
    renderReview();
  }


  // ─── Render live (paso 3) ───
  function renderLive() {
    const grid = $B('bulkLiveGrid');
    if (!grid) return;
    grid.innerHTML = st.fotos.map(f => {
      let cls = 'pending', txt = '⏳ Esperando';
      if (f.analizada) { cls = 'done'; txt = '✅ ' + Math.round((f.sugerencia?.confianza || 0) * 100) + '%'; }
      else if (f.procesando) { cls = 'processing'; txt = '🤖 Analizando...'; }
      else if (f.error) { cls = 'error'; txt = '❌ ' + String(f.error).slice(0, 30); }

      return `
        <div class="bulk-live-card ${cls}">
          <img src="${f.base64 || f.url || ''}" alt="">
          <div class="bulk-live-body">
            <div class="bulk-live-title">${f.sugerencia?.titulo || 'Sin título'}</div>
            <div class="bulk-live-status ${cls}">${txt}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function actualizarProgreso() {
    const total = st.fotos.length;
    const listas = st.fotos.filter(f => f.analizada || f.error).length;
    const pct = total > 0 ? (listas / total) * 100 : 0;
    if ($B('bulkProgressFill')) $B('bulkProgressFill').style.width = pct + '%';
    if ($B('bulkProgressText')) $B('bulkProgressText').textContent = 'Analizando ' + listas + ' / ' + total + '...';
    if ($B('bulkProgressETA')) {
      const restantes = total - listas;
      if (restantes <= 0) $B('bulkProgressETA').textContent = '✅ Completado';
      else {
        const min = Math.ceil(restantes / 5);
        $B('bulkProgressETA').textContent = '~' + min + ' min';
      }
    }
  }


  // ─── Render review (paso 4) ───
  function renderReview() {
    console.log('[BULK-REVIEW] Ejecutando renderReview. Fotos totales:', st.fotos.length);
    st.fotos.forEach((f, i) => {
      console.log('[BULK-REVIEW] Foto', i, '→', {
        analizada: f.analizada,
        tieneSugerencia: !!f.sugerencia,
        tieneUrl: !!f.url,
        tieneBase64: !!f.base64,
        error: f.error
      });
    });
    const grid = $B('bulkReviewGrid');
    if (!grid) { console.error('[BULK-REVIEW] GRID NO ENCONTRADO'); return; }
    const validas = st.fotos.filter(f => f.analizada && f.sugerencia);
    console.log('[BULK-REVIEW] Fotos válidas:', validas.length);
    if (!validas.length) {
      grid.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px">No hay fotos analizadas</p>';
      if ($B('bulkPublishCount')) $B('bulkPublishCount').textContent = '0';
      return;
    }

    const cats = (window.state?.categories || []).map(c => c.label || c);

    try {
    grid.innerHTML = validas.map(f => {
      const s = f.sugerencia;
      const idx = st.fotos.indexOf(f);
      const conf = Math.round((s.confianza || 0) * 100);
      return `
        <div class="bulk-review-card ${f.descartada ? 'discarded' : ''}" data-idx="${idx}">
          <input type="checkbox" class="bulk-review-check" data-idx="${idx}" ${f.descartada ? '' : 'checked'}>
          ${f.url || f.base64 
            ? `<img src="${f.url || f.base64}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
          <div style="width:80px;height:80px;border-radius:8px;background:var(--bg);display:${f.url||f.base64?'none':'flex'};align-items:center;justify-content:center;color:var(--muted);font-size:10px;flex-shrink:0">Sin img</div>
          <div class="bulk-review-body">
            <input type="text" class="bulk-edit-titulo" data-idx="${idx}" value="${(s.titulo || '').replace(/"/g, '&quot;')}">
            <div class="bulk-review-row">
              <select class="bulk-edit-cat" data-idx="${idx}">
                ${cats.map(c => `<option value="${c}" ${c === s.categoria ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
              <select class="bulk-edit-estado" data-idx="${idx}">
                <option value="nuevo" ${s.estado === 'nuevo' ? 'selected' : ''}>Nuevo</option>
                <option value="usado" ${s.estado === 'usado' ? 'selected' : ''}>Usado</option>
                <option value="reacondicionado" ${s.estado === 'reacondicionado' ? 'selected' : ''}>Reacond.</option>
              </select>
            </div>
            <div class="bulk-review-row" style="align-items:center">
              <input type="number" class="bulk-edit-precio" data-idx="${idx}" value="${s.precioSugeridoUSD || 0}" step="0.01" min="0">
              <span class="bulk-review-badge ${conf < 70 ? 'warn' : ''}">${conf}%</span>
              ${f.dup ? '<span class="bulk-review-badge warn">⚠️ Dup</span>' : ''}
            </div>
            <textarea class="bulk-edit-desc" data-idx="${idx}">${s.descripcion || ''}</textarea>
          </div>
        </div>
      `;
    }).join('');
    } catch(err) {
      console.error('[BULK-REVIEW] ERROR:', err);
      grid.innerHTML = '<p style="color:#f87171;padding:20px">Error al mostrar fotos: ' + err.message + '</p>';
    }

    bindReviewEdits(grid);
    actualizarPublishCount();
  }

  function bindReviewEdits(grid) {
    grid.querySelectorAll('.bulk-review-check').forEach(el => {
      el.onchange = () => {
        const i = Number(el.dataset.idx);
        if (st.fotos[i]) { st.fotos[i].descartada = !el.checked; guardar(); renderReview(); }
      };
    });
    ['titulo','cat','estado','precio','desc'].forEach(campo => {
      const cls = '.bulk-edit-' + campo;
      grid.querySelectorAll(cls).forEach(el => {
        const evt = (campo === 'cat' || campo === 'estado') ? 'change' : 'input';
        el[evt === 'change' ? 'onchange' : 'oninput'] = () => {
          const i = Number(el.dataset.idx);
          if (!st.fotos[i]?.sugerencia) return;
          const s = st.fotos[i].sugerencia;
          if (campo === 'titulo') s.titulo = el.value;
          if (campo === 'cat') s.categoria = el.value;
          if (campo === 'estado') s.estado = el.value;
          if (campo === 'precio') s.precioSugeridoUSD = Number(el.value) || 0;
          if (campo === 'desc') s.descripcion = el.value;
          guardar();
        };
      });
    });
  }

  function actualizarPublishCount() {
    const total = st.fotos.filter(f => f.analizada && !f.descartada).length;
    if ($B('bulkPublishCount')) $B('bulkPublishCount').textContent = total;
  }


  // ─── Publicar todos ───
  async function publicarTodos() {
    const aPublicar = st.fotos.filter(f => f.analizada && f.sugerencia && !f.descartada);
    if (!aPublicar.length) { alert('No hay fotos para publicar'); return; }
    if (!st.provincia) { alert('Falta provincia'); return; }

    const btn = $B('bulkPublishAll');
    const original = btn.textContent;
    let ok = 0, fail = 0;

    for (let i = 0; i < aPublicar.length; i++) {
      const foto = aPublicar[i];
      btn.textContent = '⏳ ' + (i + 1) + '/' + aPublicar.length + '...';
      btn.disabled = true;

      try {
        if (!foto.url) {
          const up = await api('/api/upload-image', {
            method: 'POST',
            body: JSON.stringify({ image: foto.base64, nombre: 'bulk_' + foto.id })
          });
          if (!up?.ok || !up.url) { fail++; continue; }
          foto.url = up.url;
          delete foto.base64;
        }

        const s = foto.sugerencia;
        const body = {
          tipo: 'local', title: s.titulo, description: s.descripcion,
          category: s.categoria, estado: s.estado,
          provincia: st.provincia, municipio: st.municipio || null,
          precioUSD: s.precioSugeridoUSD,
          image: foto.url, images: [foto.url],
          publicado: true, cantidad: 1
        };

        const r = await api('/api/manual/products', { method: 'POST', body: JSON.stringify(body) });
        if (r && r.ok) { ok++; foto.publicado = true; }
        else { fail++; }
      } catch(e) { fail++; }

      await sleep(1500);
    }

    btn.textContent = original;
    btn.disabled = false;
    st.fotos = st.fotos.filter(f => !f.publicado);
    guardar();

    alert('✅ Publicados: ' + ok + '\n❌ Fallidos: ' + fail);

    if (st.fotos.length === 0) {
      localStorage.removeItem(KEY);
      cerrarModal();
      window.dispatchEvent(new CustomEvent('comdiaz:reload-locales'));
    } else {
      renderReview();
    }
  }

  // ─── Provincias / municipios ───
  async function cargarProvincias() {
    if (provinciasCache && Object.keys(provinciasCache).length > 0) return provinciasCache;

    // 1) Intentar desde localStorage (caché de sesión anterior)
    try {
      const cached = localStorage.getItem('comdiaz_provincias_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Object.keys(parsed).length > 0) {
          provinciasCache = parsed;
          console.log('[BULK] Provincias desde caché:', Object.keys(parsed).length);
          return provinciasCache;
        }
      }
    } catch(_) {}

    // 2) Fetch al backend con retry
    const urls = [
      'https://com-diaz.onrender.com/api/public/provincias',
      API + '/api/public/provincias'
    ];
    for (const url of urls) {
      for (let intento = 1; intento <= 2; intento++) {
        try {
          console.log('[BULK] Cargando provincias desde', url, 'intento', intento);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const r = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const d = await r.json();
          if (d && d.provincias && Object.keys(d.provincias).length > 0) {
            provinciasCache = d.provincias;
            try { localStorage.setItem('comdiaz_provincias_cache', JSON.stringify(d.provincias)); } catch(_) {}
            console.log('[BULK] Provincias cargadas:', Object.keys(d.provincias).length);
            return provinciasCache;
          }
        } catch(e) {
          console.warn('[BULK] Falló ' + url + ' intento ' + intento + ':', e.message);
          if (intento < 2) await new Promise(rs => setTimeout(rs, 1000));
        }
      }
    }

    console.error('[BULK] No se pudieron cargar provincias');
    return {};
  }

  async function poblarSelects() {
    const provincias = await cargarProvincias();
    const selProv = $B('bulkProvincia');
    const selCat = $B('bulkCategoria');
    if (selProv) {
      selProv.innerHTML = '<option value="">Elige provincia...</option>';
      Object.keys(provincias).sort().forEach(p => {
        selProv.innerHTML += `<option value="${p}" ${p === st.provincia ? 'selected' : ''}>${p}</option>`;
      });
    }
    if (selCat) {
      const cats = (window.state?.categories || []).map(c => c.label || c);
      selCat.innerHTML = '<option value="">IA decide</option>';
      cats.forEach(c => {
        selCat.innerHTML += `<option value="${c}" ${c === st.categoria ? 'selected' : ''}>${c}</option>`;
      });
    }
  }

  function poblarMunicipios() {
    const prov = $B('bulkProvincia')?.value;
    const selMun = $B('bulkMunicipio');
    if (!selMun) return;
    if (!prov || !provinciasCache?.[prov]) {
      selMun.innerHTML = '<option value="">Todos</option>';
      selMun.disabled = true;
      return;
    }
    selMun.disabled = false;
    selMun.innerHTML = '<option value="">Todos</option>';
    (provinciasCache[prov] || []).sort().forEach(m => {
      selMun.innerHTML += `<option value="${m}" ${m === st.municipio ? 'selected' : ''}>${m}</option>`;
    });
  }

  async function abrirModal() {
    const modal = $B('bulkModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const selProv = $B('bulkProvincia');
    if (selProv) selProv.innerHTML = '<option value="">Cargando provincias...</option>';

    try {
      await poblarSelects();
      poblarMunicipios();
      actualizarCuotaUI();
      renderPreview();
      if (st.fotos.length) irPaso(st.paso);
      else irPaso(1);

      // Verificar si realmente se cargaron provincias
      if (selProv && selProv.options.length <= 1) {
        selProv.innerHTML = '<option value="">⚠️ Error cargando provincias</option>';
        alert('⚠️ No se pudieron cargar las provincias.\n\nVerifica tu conexión a internet e intenta de nuevo.\n\nSi el problema persiste, cierra y vuelve a abrir la app.');
      }
    } catch(e) {
      console.error('[BULK] Error abriendo modal:', e);
      if (selProv) selProv.innerHTML = '<option value="">⚠️ Error: ' + e.message + '</option>';
    }
  }

  function cerrarModal() {
    const modal = $B('bulkModal');
    if (modal) modal.classList.add('hidden');
  }


  // ─── Init ───
  function init() {
    cargar();

    $B('bulkSelectBtn')?.addEventListener('click', () => $B('bulkFileInput').click());
    $B('bulkFileInput')?.addEventListener('change', (e) => {
      if (e.target.files) handleFiles(e.target.files);
      e.target.value = '';
    });
    $B('bulkModalClose')?.addEventListener('click', () => {
      if (st.procesando) {
        if (!confirm('Hay análisis en curso. ¿Cerrar? (se pausará)')) return;
        st.pausado = true;
      }
      cerrarModal();
    });
    $B('bulkCancel1')?.addEventListener('click', () => {
      if (confirm('¿Descartar las fotos seleccionadas?')) {
        st.fotos = []; guardar(); cerrarModal();
      }
    });
    $B('bulkNext1')?.addEventListener('click', () => {
      if (!st.fotos.length) return;
      irPaso(2);
      actualizarCuotaUI();
    });
    $B('bulkBack2')?.addEventListener('click', () => irPaso(1));
    $B('bulkNext2')?.addEventListener('click', () => {
      st.provincia = $B('bulkProvincia')?.value || '';
      st.municipio = $B('bulkMunicipio')?.value || '';
      st.estadoBase = $B('bulkEstado')?.value || 'auto';
      st.categoria = $B('bulkCategoria')?.value || '';
      if (!st.provincia) { alert('Elige una provincia'); return; }
      guardar();
      procesarLote();
    });
    $B('bulkProvincia')?.addEventListener('change', poblarMunicipios);
    $B('bulkPauseBtn')?.addEventListener('click', () => {
      st.pausado = true;
      alert('⏸ Pausado. Los análisis en curso terminarán.');
    });
    $B('bulkSkip3')?.addEventListener('click', () => {
      st.pausado = true;
      st.procesando = false;
      irPaso(4);
      renderReview();
    });
    $B('bulkBack4')?.addEventListener('click', () => irPaso(3));
    $B('bulkPublishAll')?.addEventListener('click', publicarTodos);
    $B('bulkSelectAll')?.addEventListener('click', () => {
      st.fotos.forEach(f => { if (f.analizada) f.descartada = false; });
      guardar(); renderReview();
    });
    $B('bulkDeselectAll')?.addEventListener('click', () => {
      st.fotos.forEach(f => { f.descartada = true; });
      guardar(); renderReview();
    });

    // Botón recargar provincias
    $B('bulkReloadProv')?.addEventListener('click', async () => {
      provinciasCache = null;
      try { localStorage.removeItem('comdiaz_provincias_cache'); } catch(_) {}
      const selProv = $B('bulkProvincia');
      if (selProv) selProv.innerHTML = '<option value="">Cargando...</option>';
      await poblarSelects();
      poblarMunicipios();
      if (selProv && selProv.options.length <= 1) {
        alert('❌ Aún no se pudieron cargar. Verifica tu internet.');
      }
    });

    window.addEventListener('comdiaz:open-bulk', abrirModal);
    console.log('✅ Bulk upload IA listo');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1500));
  } else {
    setTimeout(init, 1500);
  }

})();
