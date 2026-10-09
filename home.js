// 
// CAPTURADOR DE ERRORES (temporal)
// 


// ---- Enva la clave como ?k= (evita preflight CORS) ----
(function inyectarAuth(){
  const _fetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    const key = localStorage.getItem('comdiaz_api_key');
    if (key && typeof input === 'string' && input.includes(API)) {
      const sep = input.includes('?') ? '&' : '?';
      input = input + sep + 'k=' + encodeURIComponent(key);
    }
    return _fetch(input, init);
  };
})();

const API_LOCAL = 'http://localhost:3000';
const API_PROD  = 'https://com-diaz.onrender.com';
const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? API_LOCAL
  : API_PROD;

let state = null;

const $ = id => document.getElementById(id);
const fmtMoney = n => '$' + Number(n).toFixed(2);

function toast(msg, kind='') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show ' + kind;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.className = 'toast ' + kind, 2200);
}

async function api(path, opts = {}) {
  const headers = Object.assign({}, opts.headers || {});
  // Solo agrega Content-Type si hay body
  if (opts.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const r = await fetch(API + path, Object.assign({}, opts, { headers }));
  return r.json();
}

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime())/1000);
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.floor(s/60)}m`;
  if (s < 86400) return `hace ${Math.floor(s/3600)}h`;
  return `hace ${Math.floor(s/86400)}d`;
}

// ---------- Render ----------
function renderStatus() {
  const on = state.automation.running;
  $('statusPill').textContent = on ? ' ACTIVO' : ' EN PAUSA';
  $('statusPill').className = 'status-pill ' + (on ? 'on' : 'off');
  $('statusText').textContent = on ? 'Automatización activa' : 'Automatización pausada';

  const btn = $('toggleBtn');
  btn.className = 'toggle-btn ' + (on ? 'running' : 'paused');
  $('toggleIcon').textContent = on ? '' : '';
  $('toggleLabel').textContent = on ? 'Pausar automatización' : 'Iniciar automatización';
}

function renderMeta() {
  $('countProducts').textContent = state.results.length;
  $('countCats').textContent = state.categories.length;
  $('lastRun').textContent = timeAgo(state.automation.lastRun);
}

function renderMargin() {
  $('marginRange').value = state.margin;
  $('marginVal').textContent = state.margin;
  const example = state.results[0]
    ? `${fmtMoney(state.results[0].basePrice)}  ${fmtMoney(state.results[0].salePrice)}`
    : 'Sin productos an';
  $('marginExample').textContent = `Ejemplo: ${example}`;
}

function renderCategories() {
  const box = $('catsList');
  box.innerHTML = '';
  state.categories.forEach(c => {
    const el = document.createElement('div');
    el.className = 'chip active';
    el.innerHTML = `<span>${c.label}</span>`;
    if ($('addCatBox').classList.contains('hidden') === false) {
      const x = document.createElement('span');
      x.textContent = '\u00D7';
      x.style.opacity = '.7';
      x.onclick = async (e) => {
        e.stopPropagation();
        await api('/api/categories/remove', {
          method:'POST',
          body: JSON.stringify({ label: c.label }),
        });
        await refresh();
        toast(`Eliminada: ${c.label}`);
      };
      el.appendChild(x);
    }
    box.appendChild(el);
  });
}

function renderResults() {
  $('resultsBadge').textContent = state.results.length;
  const box = $('results');
  box.innerHTML = '';
  state.results.slice(0, 60).forEach(r => {
    const div = document.createElement('div');
    div.className = 'prod';
    div.dataset.pid = r.id || '';
    div.innerHTML = `
      <div class="prod-actions">
        <button class="prod-btn" data-pid="${r.id || ''}" title="Publicar al catálogo">📤</button>
      </div>
      <img src="${r.image}" alt="" loading="lazy" onerror="this.style.opacity=.2">
      <div class="prod-body">
        <div class="prod-cat">${r.category || r.source}</div>
        <div class="prod-title">${r.title}</div>
        <div class="prod-prices">
          <span class="price-base">${fmtMoney(r.basePrice)}</span>
          <span class="price-sale">${fmtMoney(r.salePrice)}</span>
          <span class="price-tag">+${r.marginPct}%</span>
        </div>
      </div>
    `;
    box.appendChild(div);
  });
  if (!state.results.length) {
    box.innerHTML = '<div style="color:var(--muted);text-align:center;padding:30px 10px">Sin resultados. Pulsa <b>Buscar ahora</b> o inicia la automatización.</div>';
  }
}

function renderAll() {
  renderStatus();
  renderMeta();
  renderMargin();
  renderCategories();
  renderResults();
  // Después del render, marcar cuáles están publicados
  setTimeout(() => {
    if (typeof marcarPublicados === 'function') marcarPublicados();
    else if (window.comdiaz_shop_actualizar) window.comdiaz_shop_actualizar();
  }, 100);
}

// ---------- Carga ----------
async function refresh() {
  const cached = window.comdiaz_read_cache ? window.comdiaz_read_cache() : null;

  // 1) Si hay caché, mostrarlo primero (rápido)
  if (cached && (!state || !state.categories)) {
    state = cached;
    try { renderAll(); } catch(e) { console.warn(e); }
  }

  // 2) Si no hay internet, no intentar actualizar
  if (!navigator.onLine) {
    if (window.comdiaz_update_badge) window.comdiaz_update_badge('offline');
    if (!cached) toast('🔴 Sin conexión y sin datos guardados', 'err');
    return;
  }

  // 3) Intentar traer del servidor
  try {
    if (window.comdiaz_update_badge) window.comdiaz_update_badge('syncing');
    state = await api('/api/state');
    if (window.comdiaz_save_cache) window.comdiaz_save_cache(state);
    renderAll();
    if (window.comdiaz_update_badge) window.comdiaz_update_badge('online');
  } catch (e) {
    console.error('refresh error:', e);
    if (cached) {
      // Usar caché y marcar offline
      state = cached;
      try { renderAll(); } catch(_){}
      if (window.comdiaz_update_badge) window.comdiaz_update_badge('offline');
      toast('🔴 Sin conexión · usando datos guardados', 'err');
    } else {
      if (window.comdiaz_update_badge) window.comdiaz_update_badge('error');
      toast('No se pudo conectar y no hay datos guardados', 'err');
    }
  }
}

// ---------- Acciones ----------
$('toggleBtn').onclick = async () => {
  const on = state.automation.running;
  const btn = $('toggleBtn');

  if (!on) {
    // Optimista: pinta mbar de inmediato
    btn.className = 'toggle-btn loading';
    $('toggleIcon').textContent = '\u23F1';
    $('toggleLabel').textContent = 'Arrancando en 5s';
    toast('Arrancando en 5 segundos');

    try {
      const r = await api('/api/automation/play', { method:'POST' });
      // Refresh inmediato del estado (sin esperar los 5s)
      await refresh();
      // Refresh tras 5.5s para reflejar primera bsqueda
      setTimeout(refresh, 5500);
      toast(' Automatización activada', 'ok');
    } catch (e) {
      toast('Error al activar: ' + e.message, 'err');
      await refresh();
    }
  } else {
    // Pausa: optimista
    btn.className = 'toggle-btn loading';
    $('toggleIcon').textContent = '\u23F1';
    $('toggleLabel').textContent = 'Pausando';

    try {
      await api('/api/automation/pause', { method:'POST' });
      await refresh();
      toast(' Automatización pausada');
    } catch (e) {
      toast('Error al pausar: ' + e.message, 'err');
      await refresh();
    }
  }
};

$('searchNow').onclick = async () => {
  toast('Buscando');
  const r = await api('/api/search/now', { method:'POST' });
  window.__lastSearchCount = r.count;
  await refresh();
  toast(`Listo: ${r.count} productos`, 'ok');
};

let marginTimer = null;
$('marginRange').oninput = e => {
  const v = Number(e.target.value);
  $('marginVal').textContent = v;
  clearTimeout(marginTimer);
  marginTimer = setTimeout(async () => {
    await api('/api/margin', { method:'POST', body: JSON.stringify({ margin:v }) });
    await refresh();
  }, 220);
};

$('toggleCats').onclick = () => {
  const box = $('addCatBox');
  box.classList.toggle('hidden');
  $('toggleCats').textContent = box.classList.contains('hidden') ? 'Editar' : 'Listo';
  renderCategories();
};

$('addCatBtn').onclick = async () => {
  const v = $('newCatInput').value.trim();
  if (!v) return;
  await api('/api/categories/add', { method:'POST', body: JSON.stringify({ label:v }) });
  $('newCatInput').value = '';
  await refresh();
  toast(`Agregada: ${v}`, 'ok');
};

$('newCatInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('addCatBtn').click();
});

refresh();
setInterval(refresh, 15000);

// ---------- Share modal ----------
async function generarShare() {
  const opts = (typeof window.__getShareOpts === 'function')
    ? window.__getShareOpts()
    : { mode: 'custom', limit: 30, perCategory: 5 };
  const r = await api('/api/share', {
    method:'POST',
    body: JSON.stringify(opts),
  });
  $('shareText').value = r.text;
  const enc = encodeURIComponent(r.text);
  $('waBtn').href = 'https://wa.me/?text=' + enc;
  $('fbBtn').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://comdiaz.app');
}

$('shareBtn').onclick = async () => {
  toast('Generando resumen');
  await generarShare();
  $('shareModal').classList.remove('hidden');
};

// Registrar evento de compartir
if (window.comdiazTrack) window.comdiazTrack.share();




// ---------- Modal bindings (limpios, una sola vez) ----------
(function bindShareModal(){
  const modal = document.getElementById('shareModal');
  if (!modal || modal.dataset.bound === '1') return;
  modal.dataset.bound = '1';

  modal.addEventListener('click', (e) => {
    const t = e.target;

    // Botn  o clic en el fondo oscuro => cerrar
    if (t.id === 'closeModal' || t.closest('#closeModal') || t === modal) {
      e.stopPropagation();
      modal.classList.add('hidden');
      return;
    }

    // Copiar
    if (t.id === 'copyBtn' || t.closest('#copyBtn')) {
      e.stopPropagation();
      const ta = document.getElementById('shareText');
      if (!ta) return;
      try { navigator.clipboard.writeText(ta.value); }
      catch { ta.select(); document.execCommand('copy'); }
      if (typeof toast === 'function') toast('Copiado ','ok');
      return;
    }

    // Regenerar
    if (t.id === 'regenBtn' || t.closest('#regenBtn')) {
      e.stopPropagation();
      if (typeof generarShare === 'function') {
        toast('Regenerando');
        generarShare().then(()=> toast('Listo','ok'));
      }
      return;
    }
  });

  // Esc para cerrar (opcional)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.classList.add('hidden');
  });
})();





// ---------- Horarios de publicación ----------
(function initHoras(){
  const $id = (id) => document.getElementById(id);

  function renderHoras() {
    const box = $id('hoursList');
    if (!box) return;
    if (!window.state && typeof state === 'undefined') return;

    const st = window.state || state;
    box.innerHTML = '';
    const times = (st.automation && st.automation.publishTimes) || [];
    const editing = !$id('addHourBox').classList.contains('hidden');

    times.forEach(t => {
      const el = document.createElement('div');
      el.className = 'chip active';
      el.innerHTML = '<span>\uD83D\uDD50 ' + t + '</span>';
      if (editing) {
        const x = document.createElement('span');
        x.textContent = '\u00D7';
        x.style.opacity = '.7';
        x.style.cursor = 'pointer';
        x.style.marginLeft = '6px';
        x.onclick = async (e) => {
          e.stopPropagation();
          const nuevas = times.filter(v => v !== t);
          if (!nuevas.length) { alert('Debe haber al menos 1 horario'); return; }
          await fetch(API + '/api/publish-times', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ times: nuevas })
          });
          location.reload();
        };
        el.appendChild(x);
      }
      box.appendChild(el);
    });

    const next = (st.automation && st.automation.nextRuns) || [];
    const hint = next.length
      ? next.slice(0,3).map(d => {
          const f = new Date(d);
          return f.toLocaleString('es', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short' });
        }).join('  ')
      : '';
    const span = $id('nextRuns');
    if (span) span.textContent = hint;
  }

  document.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.id === 'toggleHours' || (t.closest && t.closest('#toggleHours'))) {
      const box = $id('addHourBox');
      box.classList.toggle('hidden');
      $id('toggleHours').textContent = box.classList.contains('hidden') ? 'Editar' : 'Listo';
      renderHoras();
    }
    if (t.id === 'addHourBtn' || (t.closest && t.closest('#addHourBtn'))) {
      const st = window.state || state;
      const v = $id('newHourInput').value;
      if (!v) return;
      if ((st.automation.publishTimes || []).includes(v)) { alert('Esa hora ya est'); return; }
      const nuevas = [...(st.automation.publishTimes || []), v].sort();
      await fetch(API + '/api/publish-times', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ times: nuevas })
      });
      location.reload();
    }
  });

  // Exponer y enganchar con la carga real
  window.renderHoras = renderHoras;

  // Se llama cada vez que se actualiza el estado: sobreescribimos API para no romper
  const waitState = setInterval(() => {
    const st = window.state || (typeof state !== 'undefined' && state);
    if (st) {
      renderHoras();
      clearInterval(waitState);
    }
  }, 300);

  // Y tambin en cada cambio de #countProducts (seal de refresh)
  const target = document.getElementById('countProducts');
  if (target) {
    new MutationObserver(renderHoras).observe(target, { childList:true, characterData:true, subtree:true });
  }
})();

// ---------- Toggle de resultados ----------
(function initResultsToggle(){
  const head = document.getElementById('resultsHead');
  const box  = document.getElementById('resultsCollapse');
  const chev = document.getElementById('resultsChevron');
  if (!head || !box || head.dataset.bound === '1') return;
  head.dataset.bound = '1';

  // Estado guardado
  const KEY = 'comdiaz_results_open';
  const abierto = localStorage.getItem(KEY) === '1';
  if (abierto) {
    box.classList.remove('collapsed');
    box.classList.add('open');
    chev.classList.add('open');
    chev.textContent = '\u25BE';
  }

  head.addEventListener('click', () => {
    const isOpen = box.classList.contains('open');
    if (isOpen) {
      box.classList.remove('open');
      box.classList.add('collapsed');
      chev.classList.remove('open');
      chev.textContent = '\u25B8';
      localStorage.setItem(KEY, '0');
    } else {
      box.classList.remove('collapsed');
      box.classList.add('open');
      chev.classList.add('open');
      chev.textContent = '\u25BE';
      localStorage.setItem(KEY, '1');
    }
  });
})();

// ---------- Fuentes ----------
(function initSources(){
  let sourcesData = [];
  let editMode = false;
  const $id = (id) => document.getElementById(id);

  async function cargarSources() {
    try {
      const r = await fetch(API + '/api/sources');
      const data = await r.json();
      sourcesData = data.sources || [];
      renderSources();
    } catch (e) { console.error('Error cargando fuentes:', e); }
  }

  function renderSources() {
    const box = $id('sourcesList');
    if (!box) return;
    box.innerHTML = '';

    sourcesData.forEach(src => {
      const wrap = document.createElement('div');
      wrap.className = 'source-item' + (src.enabled ? ' on' : '');

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%';

      const emoji = document.createElement('div');
      emoji.className = 'source-emoji';
      emoji.textContent = src.emoji;

      const info = document.createElement('div');
      info.className = 'source-info';
      let sub = src.needsKey
        ? (src.hasConfig ? '<span class="source-sub ok"> Configurada</span>' : '<span class="source-sub warn"> Requiere configuración</span>')
        : '<span class="source-sub">Sin clave  lista para usar</span>';
      info.innerHTML = '<div class="source-name">' + src.label + '</div>' + sub;

      const toggle = document.createElement('button');
      toggle.className = 'source-toggle' + (src.enabled ? ' on' : '');
      toggle.type = 'button';
      toggle.onclick = async () => {
        const nuevo = !src.enabled;
        await fetch(API + '/api/sources/toggle', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id: src.id, enabled: nuevo })
        });
        await cargarSources();
        if (typeof toast === 'function') toast((nuevo?' Activada: ':' Desactivada: ') + src.label);
      };

      row.appendChild(emoji);
      row.appendChild(info);
      row.appendChild(toggle);
      wrap.appendChild(row);

      if (editMode && src.needsKey) {
        const cfg = document.createElement('div');
        cfg.className = 'source-cfg';
        // Selector de environment (solo eBay)
        if (src.id === 'ebay') {
          const lblEnv = document.createElement('label');
          lblEnv.textContent = 'Ambiente';
          const selEnv = document.createElement('select');
          selEnv.id = 'cfg-ebay-environment';
          selEnv.style.cssText = 'background:#0f1524;border:1px solid var(--border);color:var(--text);padding:8px 10px;border-radius:8px;font-size:12.5px;outline:none;width:100%';
          selEnv.innerHTML = '<option value="sandbox">Sandbox (pruebas)</option><option value="production">Production (real)</option>';
          const savedEnv = (src.config && src.config.environment) || 'sandbox';
          selEnv.value = savedEnv;
          cfg.appendChild(lblEnv);
          cfg.appendChild(selEnv);
        }

        src.keyFields.forEach(field => {
          const lbl = document.createElement('label');
          const nombres = { appId: 'App ID (Client ID)', certId: 'Cert ID (Client Secret)', accessKey: 'Access Key', secretKey: 'Secret Key', partnerTag: 'Partner Tag', apiKey: 'API Key' };
          lbl.textContent = nombres[field] || field;
          const inp = document.createElement('input');
          inp.type = field === 'appId' ? 'text' : 'password';
          inp.placeholder = 'Pega aquí tu ' + (nombres[field] || field);
          inp.id = 'cfg-' + src.id + '-' + field;
          if (src.config && src.config[field]) inp.value = src.config[field];
          cfg.appendChild(lbl);
          cfg.appendChild(inp);
        });

        const btn = document.createElement('button');
        btn.className = 'save-cfg';
        btn.textContent = ' Guardar credenciales';
        btn.onclick = async () => {
          const config = {};
          if (src.id === 'ebay') {
            const selEnv = $id('cfg-ebay-environment');
            if (selEnv) config.environment = selEnv.value;
          }
          src.keyFields.forEach(f => {
            const v = $id('cfg-' + src.id + '-' + f).value.trim();
            if (v) config[f] = v;
          });
          await fetch(API + '/api/sources/config', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ id: src.id, config })
          });
          await cargarSources();
          if (typeof toast === 'function') toast('Credenciales guardadas', 'ok');
        };
        cfg.appendChild(btn);

        if (src.docsUrl) {
          const a = document.createElement('a');
          a.className = 'docs-link';
          a.href = src.docsUrl;
          a.target = '_blank';
          a.textContent = 'Cmo obtener las claves? ';
          cfg.appendChild(a);
        }
        wrap.appendChild(cfg);
      }
      box.appendChild(wrap);
    });
  }

  document.addEventListener('click', (e) => {
    if (e.target.id === 'toggleSources' || (e.target.closest && e.target.closest('#toggleSources'))) {
      editMode = !editMode;
      $id('toggleSources').textContent = editMode ? 'Listo' : 'Configurar';
      renderSources();
    }
  });

  cargarSources();
  setInterval(cargarSources, 30000);
})();


// 
//  SISTEMA COLAPSABLE (Comdiaz v0.2)
// 
(function initCollapsible(){
  const STORAGE_KEY = 'comdiaz_cards_state';

  // Cargar estado
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(_) {}

  // Envolver el contenido de cada card colapsable en .card-body
  document.querySelectorAll('.collapsible').forEach(card => {
    const id = card.dataset.card;
    if (!id) return;

    // El hero no necesita envoltura ni chevron (siempre visible)
    if (id === 'hero') return;

    const head = card.querySelector('.card-head');
    if (!head) return;

    // Agregar chevron al head si no existe
    if (!head.querySelector('.card-chev')) {
      const left = document.createElement('div');
      left.className = 'head-left';
      // Mover los hijos del head a la izquierda (excepto el botn/label derecho)
      const rightBtn = head.querySelector('.btn-mini, .badge, button');
      const h2 = head.querySelector('h2');
      if (h2) left.appendChild(h2);
      head.insertBefore(left, head.firstChild);

      const chev = document.createElement('span');
      chev.className = 'card-chev';
      chev.textContent = '\u25B8';
      left.insertBefore(chev, left.firstChild);
    }

    // Envolver todo lo que NO es .card-head en .card-body
    if (!card.querySelector('.card-body')) {
      const body = document.createElement('div');
      body.className = 'card-body';
      // El grid de resultados tiene contenido grande
      if (id === 'results') body.classList.add('tall');

      const nodos = Array.from(card.childNodes);
      const headIdx = nodos.indexOf(head);
      // Mover todo lo que viene despus del head
      nodos.slice(headIdx + 1).forEach(n => {
        if (n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())) {
          body.appendChild(n);
        }
      });
      card.appendChild(body);
    }

    // Aplicar estado inicial
    const def = card.dataset.default || 'closed';
    const estado = (saved[id] !== undefined) ? saved[id] : (def === 'open');

    // El chevron
    const chev = head.querySelector('.card-chev');

    // Funcin para aplicar
    function aplicar(abrir) {
      if (abrir) {
        card.classList.add('open');
        if (chev) chev.textContent = '\u25BE';
      } else {
        card.classList.remove('open');
        if (chev) chev.textContent = '\u25B8';
      }
    }
    aplicar(estado);

    // Click para togglear
    head.addEventListener('click', (e) => {
      // Ignorar si el click fue en un botn de accin (ej: Configurar, Editar)
      if (e.target.closest('.btn-mini')) return;
      const abrir = !card.classList.contains('open');
      aplicar(abrir);
      saved[id] = abrir;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch(_) {}
    });
  });

  console.log(' Sistema colapsable inicializado');
})();

// ---------- Modos de resumen ----------
(function initShareModes(){
  let currentMode = 'custom';
  let currentPart = 1;

  function actualizar() {
    // Modo
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === currentMode);
    });
    // Selector de parte (solo visible en tercios)
    const ps = document.getElementById('partSelector');
    if (ps) {
      if (currentMode === 'tercios') ps.classList.remove('hidden');
      else ps.classList.add('hidden');
    }
    // Partes
    document.querySelectorAll('.part-btn').forEach(b => {
      b.classList.toggle('active', Number(b.dataset.part) === currentPart);
    });
    // Habilitar/deshabilitar inputs manuales
    const limitInp = document.getElementById('shareLimit');
    const perInp = document.getElementById('sharePerCat');
    if (limitInp && perInp) {
      const custom = (currentMode === 'custom');
      limitInp.disabled = !custom;
      perInp.disabled = !custom;
      limitInp.style.opacity = custom ? '1' : '.4';
      perInp.style.opacity = custom ? '1' : '.4';
    }
  }

  document.addEventListener('click', (e) => {
    const mb = e.target.closest && e.target.closest('.mode-btn');
    if (mb) {
      currentMode = mb.dataset.mode;
      actualizar();
      // Regenerar automticamente
      if (typeof generarShare === 'function') {
        generarShare();
      }
      return;
    }
    const pb = e.target.closest && e.target.closest('.part-btn');
    if (pb) {
      currentPart = Number(pb.dataset.part);
      actualizar();
      if (typeof generarShare === 'function') {
        generarShare();
      }
    }
  });

  // Modificar generarShare para que use el modo/parte
  window.__getShareOpts = function() {
    const opts = { mode: currentMode };
    if (currentMode === 'tercios') opts.part = currentPart;
    if (currentMode === 'custom') {
      const l = document.getElementById('shareLimit');
      const p = document.getElementById('sharePerCat');
      if (l) opts.limit = Number(l.value) || 30;
      if (p) opts.perCategory = Number(p.value) || 5;
    }
    return opts;
  };

  actualizar();
  console.log(' Modos de resumen inicializados');
})();



// ---------- Análisis y medicin de red ----------
(function initAnalytics(){
  const KEY = 'comdiaz_analytics';
  const SESSION_START = Date.now();

  // ---------- Estructura de datos ----------
  function loadStats() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {
        searches: [],      // {ts, count}
        shares: [],        // {ts, mode}
        net: {             // bytes por perodo
          day:   { date: '', bytes: 0 },
          week:  { key: '',  bytes: 0 },
          month: { key: '',  bytes: 0 },
          year:  { key: '',  bytes: 0 },
        }
      };
    } catch(_) { return { searches: [], shares: [], net: { day:{date:'',bytes:0},week:{key:'',bytes:0},month:{key:'',bytes:0},year:{key:'',bytes:0} } }; }
  }
  function saveStats(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(_) {}
  }

  let stats = loadStats();

  // ---------- Fechas ----------
  const todayKey = () => new Date().toISOString().slice(0,10);         // YYYY-MM-DD
  const weekKey  = () => {
    const d = new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    return d.getFullYear() + '-W' + String(week).padStart(2,'0');
  };
  const monthKey = () => new Date().toISOString().slice(0,7);          // YYYY-MM
  const yearKey  = () => String(new Date().getFullYear());

  function resetIfNeeded() {
    const t = todayKey(), w = weekKey(), m = monthKey(), y = yearKey();
    if (stats.net.day.date !== t)   stats.net.day   = { date: t,  bytes: 0 };
    if (stats.net.week.key !== w)   stats.net.week  = { key: w,   bytes: 0 };
    if (stats.net.month.key !== m)  stats.net.month = { key: m,   bytes: 0 };
    if (stats.net.year.key !== y)   stats.net.year  = { key: y,   bytes: 0 };
    saveStats(stats);
  }
  resetIfNeeded();

  // ---------- Envolver fetch para medir bytes ----------
  const _fetch = window.fetch.bind(window);
  window.fetch = async function(input, init) {
    const res = await _fetch(input, init);
    // Clonar para no afectar el consumo real
    try {
      const clone = res.clone();
      clone.text().then(txt => {
        const bytes = new Blob([txt]).size;
        // Sumar
        stats.net.day.bytes   += bytes;
        stats.net.week.bytes  += bytes;
        stats.net.month.bytes += bytes;
        stats.net.year.bytes  += bytes;
        saveStats(stats);
        updateNetDisplay();
      }).catch(()=>{});
    } catch(_) {}
    return res;
  };

  // ---------- Registrar eventos ----------
  window.comdiazTrack = {
    search(count) {
      stats.searches.push({ ts: Date.now(), count });
      // Mantener ltimos 100
      if (stats.searches.length > 100) stats.searches = stats.searches.slice(-100);
      saveStats(stats);
      updateStatsDisplay();
    },
    share(mode) {
      stats.shares.push({ ts: Date.now(), mode: mode || 'custom' });
      if (stats.shares.length > 100) stats.shares = stats.shares.slice(-100);
      saveStats(stats);
      updateStatsDisplay();
    }
  };

  // ---------- Render ----------
  function fmtBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024*1024) return (b/1024).toFixed(1) + ' KB';
    return (b/1024/1024).toFixed(2) + ' MB';
  }
  function fmtTime(ms) {
    const s = Math.floor(ms/1000);
    if (s < 60) return s + 's';
    const m = Math.floor(s/60);
    if (m < 60) return m + 'm';
    return Math.floor(m/60) + 'h' + (m%60) + 'm';
  }

  function updateStatsDisplay() {
    const hoy = new Date().toISOString().slice(0,10);
    const searchesHoy = stats.searches.filter(s => new Date(s.ts).toISOString().slice(0,10) === hoy);
    const sharesHoy = stats.shares.filter(s => new Date(s.ts).toISOString().slice(0,10) === hoy);
    const productosHoy = searchesHoy.reduce((a, s) => a + (s.count || 0), 0);

    const e1 = document.getElementById('statSearches');
    const e2 = document.getElementById('statProducts');
    const e3 = document.getElementById('statShares');
    const e4 = document.getElementById('statUptime');
    if (e1) e1.textContent = searchesHoy.length;
    if (e2) e2.textContent = productosHoy;
    if (e3) e3.textContent = sharesHoy.length;
    if (e4) e4.textContent = fmtTime(Date.now() - SESSION_START);
  }

  function updateNetDisplay() {
    const e = {
      day:   document.getElementById('duDay'),
      week:  document.getElementById('duWeek'),
      month: document.getElementById('duMonth'),
      year:  document.getElementById('duYear'),
    };
    if (e.day)   e.day.textContent   = fmtBytes(stats.net.day.bytes);
    if (e.week)  e.week.textContent  = fmtBytes(stats.net.week.bytes);
    if (e.month) e.month.textContent = fmtBytes(stats.net.month.bytes);
    if (e.year)  e.year.textContent  = fmtBytes(stats.net.year.bytes);
  }

  async function updateHistory() {
    const box = document.getElementById('historyList');
    if (!box) return;
    try {
      const r = await _fetch(API + '/api/summaries');
      const data = await r.json();
      const list = (data.summaries || []).slice(0, 10);
      if (!list.length) {
        box.innerHTML = '<div class="hist-empty">Sin historial todava</div>';
        return;
      }
      box.innerHTML = '';
      list.forEach(s => {
        const el = document.createElement('div');
        el.className = 'hist-item';
        const date = new Date(s.createdAt);
        const timeAgo = Math.floor((Date.now() - date.getTime()) / 60000);
        const timeStr = timeAgo < 1 ? 'ahora' : timeAgo < 60 ? 'hace ' + timeAgo + 'm' : 'hace ' + Math.floor(timeAgo/60) + 'h';
        el.innerHTML = '<div>' +
          '<div class="h-trigger">' + s.trigger + (s.mode ? '  ' + s.mode : '') + '</div>' +
          '<div class="h-info">' + s.products + ' productos  ' + s.margin + '%</div>' +
          '</div>' +
          '<div class="h-time">' + timeStr + '</div>';
        box.appendChild(el);
      });
    } catch(_) {}
  }

  function updateNetLog() {
    const box = document.getElementById('netLog');
    if (!box) return;
    const entries = Object.entries(stats.net);
    box.innerHTML = entries.map(([k, v]) =>
      k.padEnd(6) + ' : ' + fmtBytes(v.bytes).padStart(10)
    ).join('\n');
  }

  function renderAll() {
    updateStatsDisplay();
    updateNetDisplay();
    updateNetLog();
    updateHistory();
  }

  // ---------- Exportar ----------
  const exportBtn = document.getElementById('exportStats');
  if (exportBtn) {
    exportBtn.onclick = () => {
      const blob = new Blob([JSON.stringify({
        generado: new Date().toISOString(),
        stats,
        uptime_ms: Date.now() - SESSION_START,
      }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'comdiaz-reporte-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      if (typeof toast === 'function') toast('Reporte descargado', 'ok');
    };
  }

  // ---------- Reiniciar ----------
  const resetBtn = document.getElementById('resetStats');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (!confirm('Borrar todas las estadísticas locales?')) return;
      stats = { searches: [], shares: [], net: { day:{date:'',bytes:0},week:{key:'',bytes:0},month:{key:'',bytes:0},year:{key:'',bytes:0} } };
      saveStats(stats);
      resetIfNeeded();
      renderAll();
      if (typeof toast === 'function') toast('Estadísticas reiniciadas');
    };
  }

  // Actualizar cada 30s (uptime + red)
  setInterval(renderAll, 30000);
  renderAll();

  // Enganchar al botn "Buscar ahora"
  const searchBtn = document.getElementById('searchNow');
  if (searchBtn) {
    const original = searchBtn.onclick;
    searchBtn.onclick = async function(e) {
      const r = await original?.call(this, e);
      if (typeof window.__lastSearchCount === 'number') {
        window.comdiazTrack.search(window.__lastSearchCount);
      }
      return r;
    };
  }

  console.log(' Analytics inicializado');
})();





// ---------- Logout (v3, directo al botn) ----------
(function initLogoutV3(){
  function bind() {
    const btn = document.getElementById('logoutBtn');
    if (!btn) {
      console.log(' logoutBtn no encontrado en el DOM');
      return;
    }
    // onclick sobreescribe cualquier listener anterior
    btn.onclick = function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      console.log(' Logout: limpiando sesión y redirigiendo');
      try { localStorage.removeItem('comdiaz_auth_until'); } catch(_) {}
      // Forzar recarga limpia
      setTimeout(() => {
        window.location.replace('index.html');
      }, 50);
    };
    console.log(' Logout bindeado al botn');
  }
  // El script corre al final del body, el botn ya debera existir
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();













// 
// INTERACCIONES CRTICAS (delegacin  v3)
// 
(function initDelegado(){
  console.log(' initDelegado arrancando');

  // --- CANDADO DEL PLAY ---
  const KEY_LOCK = 'comdiaz_play_locked';
  function aplicarLockPlay() {
    const btn = document.getElementById('lockPlay');
    const row = document.querySelector('.play-row');
    if (!btn || !row) return;
    const locked = localStorage.getItem(KEY_LOCK) === '1';
    btn.textContent = locked ? '' : '';
    btn.classList.toggle('locked', locked);
    row.classList.toggle('locked', locked);
  }

  // --- MODAL DE PIN ---
  function abrirPinModal() {
    const m = document.getElementById('pinModal');
    if (!m) { console.log(' pinModal no existe'); return; }
    const a = document.getElementById('pinActual');
    const n = document.getElementById('pinNuevo');
    const c = document.getElementById('pinConfirm');
    const msg = document.getElementById('pinMsg');
    if (a) a.value = '';
    if (n) n.value = '';
    if (c) c.value = '';
    if (msg) { msg.textContent = ''; msg.style.color = '#94a3b8'; }
    m.classList.remove('hidden');
    console.log(' Modal abierto');
  }
  function cerrarPinModal() {
    const m = document.getElementById('pinModal');
    if (m) m.classList.add('hidden');
  }
  async function guardarPin() {
    const a = document.getElementById('pinActual').value.trim();
    const n = document.getElementById('pinNuevo').value.trim();
    const c = document.getElementById('pinConfirm').value.trim();
    const msg = document.getElementById('pinMsg');

    if (!/^[0-9]{4,10}$/.test(n)) {
      msg.textContent = ' El PIN debe tener 4-10 dígitos';
      msg.style.color = '#ef4444'; return;
    }
    if (n !== c) {
      msg.textContent = ' Los PIN nuevos no coinciden';
      msg.style.color = '#ef4444'; return;
    }
    msg.textContent = 'Guardando';
    msg.style.color = '#94a3b8';

    try {
      const r = await fetch(API + '/api/pin/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Comdiaz-Key': a },
        body: JSON.stringify({ actual: a, nuevo: n }),
      });
      const data = await r.json();
      if (data.ok) {
        localStorage.setItem('comdiaz_api_key', n);
        msg.textContent = ' PIN actualizado';
        msg.style.color = '#10b981';
        if (typeof toast === 'function') toast('PIN actualizado ', 'ok');
        setTimeout(cerrarPinModal, 1200);
      } else {
        msg.textContent = ' ' + (data.error || 'Error');
        msg.style.color = '#ef4444';
      }
    } catch (e) {
      msg.textContent = ' Error de conexin';
      msg.style.color = '#ef4444';
    }
  }

  // --- Delegacin de clicks ---
  document.addEventListener('click', (e) => {
    const t = e.target;
    const btn = t.closest ? t.closest('button') : null;

    // Cambiar PIN
    if (btn && btn.id === 'changePinBtn') {
      e.preventDefault(); e.stopPropagation();
      abrirPinModal();
      return;
    }
    if (btn && btn.id === 'closePinModal') {
      e.preventDefault(); e.stopPropagation();
      cerrarPinModal();
      return;
    }
    if (btn && btn.id === 'savePinBtn') {
      e.preventDefault(); e.stopPropagation();
      guardarPin();
      return;
    }
    // Cerrar modal si toca el fondo
    if (t.id === 'pinModal') {
      cerrarPinModal();
      return;
    }

    // Candado del Play: manejado por initCandados

  }, true); // capture:true para anticiparnos a otros listeners

  // Aplicar estado inicial
  function aplicarTodo() {
    aplicarLockPlay();
  }
  aplicarTodo();
  // Por si el DOM se carga despus
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicarTodo);
  }
  setTimeout(aplicarTodo, 500);

  console.log(' initDelegado listo');
})();


// 
// CANDADOS: Play + Margen (delegacin  v3)
// 
(function initCandados(){
  console.log(' initCandados arrancando');

  const KEY_PLAY = 'comdiaz_play_locked';
  const KEY_MARGIN = 'comdiaz_margin_locked';

  //  Aplicar estados 
  function aplicarPlayLock() {
    const btn = document.getElementById('lockPlay');
    const row = document.querySelector('.play-row');
    if (!btn || !row) return;
    const locked = localStorage.getItem(KEY_PLAY) === '1';
    btn.textContent = locked ? '' : '';
    btn.classList.toggle('locked', locked);
    row.classList.toggle('locked', locked);
  }

  function aplicarMarginLock() {
    const btn = document.getElementById('lockMargin');
    const row = document.querySelector('.margin-row');
    const slider = document.getElementById('marginRange');
    if (!btn || !row) return;
    const locked = localStorage.getItem(KEY_MARGIN) === '1';
    btn.textContent = locked ? '' : '';
    btn.classList.toggle('locked', locked);
    row.classList.toggle('locked', locked);
    if (slider) slider.style.pointerEvents = locked ? 'none' : '';
    if (slider) slider.style.filter = locked ? 'grayscale(1) brightness(.7)' : '';
  }

  //  Delegacin de clicks 
  document.addEventListener('click', (e) => {
    const btn = e.target.closest ? e.target.closest('button') : null;
    if (!btn) return;

    // Candado del Play
    if (btn.id === 'lockPlay') {
      e.preventDefault(); e.stopPropagation();
      const locked = localStorage.getItem(KEY_PLAY) === '1';
      const nuevo = !locked;
      localStorage.setItem(KEY_PLAY, nuevo ? '1' : '0');
      aplicarPlayLock();
      if (typeof toast === 'function') {
        toast(nuevo ? ' Play bloqueado' : ' Play desbloqueado');
      }
      return;
    }

    // Candado del Margen
    if (btn.id === 'lockMargin') {
      e.preventDefault(); e.stopPropagation();
      const locked = localStorage.getItem(KEY_MARGIN) === '1';
      const nuevo = !locked;
      localStorage.setItem(KEY_MARGIN, nuevo ? '1' : '0');
      aplicarMarginLock();
      if (typeof toast === 'function') {
        toast(nuevo ? ' Margen bloqueado' : ' Margen desbloqueado');
      }
      return;
    }
  }, true);

  //  Bloquear el Play si el candado est cerrado 
  document.addEventListener('click', (e) => {
    const btn = e.target.closest ? e.target.closest('button') : null;
    if (!btn || btn.id !== 'toggleBtn') return;
    if (localStorage.getItem(KEY_PLAY) === '1') {
      e.preventDefault(); e.stopPropagation();
      if (typeof toast === 'function') toast(' Desbloquea el candado primero', 'err');
      return false;
    }
  }, true);

  //  Aplicar al cargar 
  function aplicarTodo() {
    aplicarPlayLock();
    aplicarMarginLock();
  }
  aplicarTodo();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicarTodo);
  }
  // Por si el DOM cambia despus
  setTimeout(aplicarTodo, 800);
  setTimeout(aplicarTodo, 2000);

  // Observer: si aparecen los botones despus, aplicar
  const obs = new MutationObserver(() => aplicarTodo());
  obs.observe(document.body, { childList: true, subtree: true });

  console.log(' initCandados listo');
})();


// 
// PANEL DE DIAGNSTICO (temporal)
// 

// ═══════════════════════════════════════════════
// SISTEMA OFFLINE-FIRST (comdiaz_offline_v1)
// ═══════════════════════════════════════════════
(function comdiaz_offline_v1(){
  const KEY_CACHE = 'comdiaz_state_cache';
  const KEY_LAST_SYNC = 'comdiaz_last_sync';
  const KEY_LAST_ATTEMPT = 'comdiaz_last_attempt';

  // ─── Estado de conexión ───
  window.comdiaz_online = navigator.onLine;
  window.comdiaz_syncing = false;

  // ─── Guardar estado en caché ───
  window.comdiaz_save_cache = function(state) {
    try {
      localStorage.setItem(KEY_CACHE, JSON.stringify(state));
      localStorage.setItem(KEY_LAST_SYNC, String(Date.now()));
    } catch(e) { console.warn('Error guardando caché:', e); }
  };

  // ─── Leer estado del caché ───
  window.comdiaz_read_cache = function() {
    try {
      const raw = localStorage.getItem(KEY_CACHE);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  };

  // ─── Actualizar badge de sincronización ───
  window.comdiaz_update_badge = function(estado) {
    let badge = document.getElementById('syncBadge');
    if (!badge) {
      // Crear el badge si no existe
      const topbar = document.querySelector('.topbar');
      if (!topbar) return;
      badge = document.createElement('div');
      badge.id = 'syncBadge';
      badge.style.cssText = 'position:absolute;bottom:-22px;left:12px;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:99px;font-family:monospace;transition:all .3s;z-index:10';
      topbar.style.position = 'relative';
      topbar.appendChild(badge);
    }

    const lastSync = Number(localStorage.getItem(KEY_LAST_SYNC) || 0);
    const diff = lastSync ? Math.floor((Date.now() - lastSync) / 1000) : null;
    const diffText = diff === null ? 'nunca' :
                     diff < 60 ? diff + 's' :
                     diff < 3600 ? Math.floor(diff/60) + 'm' :
                     Math.floor(diff/3600) + 'h';

    const configs = {
      online:    { texto: '🟢 Sincronizado hace ' + diffText, bg: 'rgba(16,185,129,.15)', color: '#10b981', borde: 'rgba(16,185,129,.35)' },
      syncing:   { texto: '🟡 Sincronizando...', bg: 'rgba(245,158,11,.15)', color: '#f59e0b', borde: 'rgba(245,158,11,.35)' },
      offline:   { texto: '🔴 Sin conexión · última sync hace ' + diffText, bg: 'rgba(239,68,68,.15)', color: '#ef4444', borde: 'rgba(239,68,68,.35)' },
      error:     { texto: '⚠️ Error de sync · reintentando', bg: 'rgba(245,158,11,.15)', color: '#f59e0b', borde: 'rgba(245,158,11,.35)' }
    };
    const c = configs[estado] || configs.offline;
    badge.textContent = c.texto;
    badge.style.background = c.bg;
    badge.style.color = c.color;
    badge.style.border = '1px solid ' + c.borde;
  };

  // ─── Actualizar badge cada 30s (para que el "hace Xs" avance) ───
  setInterval(() => {
    if (navigator.onLine) window.comdiaz_update_badge('online');
    else window.comdiaz_update_badge('offline');
  }, 30000);

  // ─── Detectar online/offline ───
  window.addEventListener('online', () => {
    console.log('[COMDIAZ] Recuperó conexión');
    window.comdiaz_update_badge('syncing');
    if (typeof refresh === 'function') {
      refresh().then(() => window.comdiaz_update_badge('online'))
              .catch(() => window.comdiaz_update_badge('error'));
    }
  });

  window.addEventListener('offline', () => {
    console.log('[COMDIAZ] Perdió conexión');
    window.comdiaz_update_badge('offline');
  });

  // ─── Envolver fetch para detectar fallos y bloquear acciones sin red ───
  const _fetchOrig = window.fetch.bind(window);
  window.fetch = function(input, init) {
    // Si está offline y no es un GET, bloquear
    if (!navigator.onLine && init && init.method && init.method !== 'GET') {
      console.warn('[COMDIAZ] Acción bloqueada: sin conexión');
      if (typeof toast === 'function') toast('🔴 Sin conexión · acción bloqueada', 'err');
      return Promise.reject(new Error('Sin conexión'));
    }
    return _fetchOrig(input, init);
  };

  // ─── Marcar en el localStorage que estamos intentando sync ───
  const _apiOrig = window.api;
  window.api = async function(path, opts) {
    localStorage.setItem(KEY_LAST_ATTEMPT, String(Date.now()));
    return _apiOrig(path, opts);
  };
  // Actualizar la referencia global
  if (typeof api === 'function') {
    // No se puede sobreescribir una const, hacemos un workaround: parche sobre fetch
  }

  // ─── Estado inicial del badge ───
  setTimeout(() => {
    if (navigator.onLine) window.comdiaz_update_badge('online');
    else window.comdiaz_update_badge('offline');
  }, 1500);

  console.log('✅ comdiaz_offline_v1 listo');
})();


// ═══════════════════════════════════════════════
// SEGURIDAD FRONTEND (comdiaz_security_v1)
// ═══════════════════════════════════════════════
(function comdiaz_security_v1(){
  // ─────────────────────────────────────────────
  // A) AUTO-LOGOUT tras 30 min de inactividad
  // ─────────────────────────────────────────────
  const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos
  const KEY_LAST_ACTIVE = 'comdiaz_last_active';
  let lastActivity = Number(localStorage.getItem(KEY_LAST_ACTIVE) || Date.now());

  function registrarActividad() {
    lastActivity = Date.now();
    try { localStorage.setItem(KEY_LAST_ACTIVE, String(lastActivity)); } catch(_) {}
  }

  // Detectar eventos del usuario
  ['click', 'touchstart', 'keydown', 'scroll'].forEach(evt => {
    document.addEventListener(evt, registrarActividad, { passive: true });
  });

  // Chequear cada 60 segundos
  setInterval(() => {
    const inactivo = Date.now() - lastActivity;
    if (inactivo >= INACTIVITY_MS) {
      mostrarSesionExpirada();
    }
  }, 60000);

  function mostrarSesionExpirada() {
    if (document.getElementById('sessionExpiredOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'sessionExpiredOverlay';
    overlay.className = 'session-expired-overlay';
    overlay.innerHTML = `
      <h2>🔒 Sesión expirada</h2>
      <p>Por seguridad, tu sesión se cerró tras 30 minutos de inactividad.</p>
      <button id="reloginBtn">Volver a entrar</button>
    `;
    document.body.appendChild(overlay);

    // Al tocar, limpiar y volver al welcome
    overlay.querySelector('#reloginBtn').onclick = () => {
      try {
        localStorage.removeItem('comdiaz_auth_until');
        localStorage.removeItem('comdiaz_last_active');
      } catch(_) {}
      location.href = 'index.html';
    };
  }

  // ─────────────────────────────────────────────
  // B) CARD DE ACTIVIDAD
  // ─────────────────────────────────────────────
  let filtroActividad = 'all';
  const ICONOS = {
    login_success: '🟢', login_failed: '🔴', login_blocked: '🚫',
    ip_blocked: '🚫', logout: '⎋',
    play: '▶️', pause: '⏸️',
    search: '🔍',
    margin: '💸',
    publish_times: '⏰',
    pin_change: '🔑',
    log_cleared: '🧹',
  };
  const TITULOS = {
    login_success: 'Acceso exitoso',
    login_failed: 'Intento fallido',
    login_blocked: 'Acceso bloqueado',
    ip_blocked: 'IP bloqueada',
    play: 'Play activado',
    pause: 'Automatización pausada',
    search: 'Búsqueda realizada',
    margin: 'Cambio de margen',
    publish_times: 'Cambio de horarios',
    pin_change: 'PIN cambiado',
    log_cleared: 'Log limpiado',
  };

  function fmtHora(iso) {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'hace ' + diff + 's';
    if (diff < 3600) return 'hace ' + Math.floor(diff/60) + 'm';
    if (diff < 86400) return 'hace ' + Math.floor(diff/3600) + 'h';
    return 'hace ' + Math.floor(diff/86400) + 'd';
  }

  function fmtDetalle(tipo, d) {
    if (!d) return '';
    if (tipo === 'search') return d.productos + ' productos · ' + d.categorias + ' categorías · ' + d.fuentes + ' fuentes (' + d.trigger + ')';
    if (tipo === 'margin') return 'De ' + d.viejo + '% a ' + d.nuevo + '%';
    if (tipo === 'publish_times') return 'De [' + (d.viejo||[]).join(', ') + '] a [' + (d.nuevo||[]).join(', ') + ']';
    if (tipo === 'login_success') return 'Desde ' + d.ip;
    if (tipo === 'login_failed') return 'Intento #' + d.intento + ' desde ' + d.ip;
    if (tipo === 'login_blocked' || tipo === 'ip_blocked') return d.ip + ' · bloqueado ' + (d.minutosRestantes||15) + ' min';
    if (tipo === 'play') return 'Arranca en ' + d.delay + 's';
    if (tipo === 'pin_change') return 'Desde ' + d.ip;
    return JSON.stringify(d).slice(0, 80);
  }

  function renderActividad(events) {
    const box = document.getElementById('activityList');
    if (!box) return;

    let filtered = events;
    if (filtroActividad === 'search') filtered = events.filter(e => e.tipo === 'search');
    else if (filtroActividad === 'login') filtered = events.filter(e => e.tipo.startsWith('login'));
    else if (filtroActividad === 'security') filtered = events.filter(e => e.tipo.includes('blocked') || e.tipo === 'pin_change');

    if (!filtered.length) {
      box.innerHTML = '<div class="act-empty">Sin eventos' + (filtroActividad !== 'all' ? ' en este filtro' : '') + '</div>';
      return;
    }

    box.innerHTML = '';
    filtered.slice(0, 50).forEach(e => {
      const div = document.createElement('div');
      div.className = 'act-item tipo-' + e.tipo;
      div.innerHTML = `
        <div class="act-icon">${ICONOS[e.tipo] || '•'}</div>
        <div class="act-body">
          <div class="act-title">${TITULOS[e.tipo] || e.tipo}</div>
          <div class="act-detail">${fmtDetalle(e.tipo, e.detalle)}</div>
        </div>
        <div class="act-time">${fmtHora(e.ts)}</div>
      `;
      box.appendChild(div);
    });
  }

  async function cargarActividad() {
    if (!navigator.onLine) return;
    try {
      const r = await fetch(API + '/api/activity?limit=100');
      const data = await r.json();
      if (data.ok) renderActividad(data.events || []);
    } catch(e) {
      const box = document.getElementById('activityList');
      if (box && box.innerHTML.includes('Cargando')) {
        box.innerHTML = '<div class="act-empty">Sin conexión · no se puede cargar</div>';
      }
    }
  }

  // Delegación de clicks para filtros y limpiar
  document.addEventListener('click', async (e) => {
    const t = e.target;

    // Filtros
    const fb = t.closest && t.closest('.filter-btn');
    if (fb) {
      filtroActividad = fb.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === filtroActividad);
      });
      cargarActividad();
      return;
    }

    // Limpiar
    if (t.id === 'clearActivity' || (t.closest && t.closest('#clearActivity'))) {
      if (!confirm('¿Borrar todo el registro de actividad?')) return;
      try {
        await fetch(API + '/api/activity', { method: 'DELETE' });
        await cargarActividad();
        if (typeof toast === 'function') toast('Log limpiado', 'ok');
      } catch(_) {}
    }
  });

  // Cargar al inicio y cada 30s
  setTimeout(cargarActividad, 2000);
  setInterval(cargarActividad, 30000);

  console.log('✅ Seguridad frontend lista');
})();


// ═══════════════════════════════════════════════
// COMDIAZ SHOP — Control desde Home (v1)
// ═══════════════════════════════════════════════
(function comdiaz_shop_ui_v1(){
  const $id = (id) => document.getElementById(id);

  // ─── Cargar config del shop en los inputs ───
  async function cargarConfigShop() {
    try {
      if (!navigator.onLine) return;
      const r = await fetch(API + '/api/state');
      const s = await r.json();
      const cfg = s.shopConfig || {};
      const t = $id('shopTitulo');
      const sub = $id('shopSubtitulo');
      const wa = $id('shopWhatsapp');
      const mx = $id('shopMax');
      if (t) t.value = cfg.titulo || 'Comdiaz Shop';
      if (sub) sub.value = cfg.subtitulo || 'Productos importados y locales';
      if (wa) wa.value = cfg.whatsapp || '5351425691';
      if (mx) mx.value = cfg.maxProductos || 200;
      const hor = $id('shopHorario');
      if (hor) hor.value = cfg.horarioAtencion || 'Lun-Sab 9:00am - 9:00pm';
    } catch(e) { console.warn(e); }
  }

  // ─── Guardar config ───
  async function guardarConfigShop() {
    const titulo = ($id('shopTitulo')?.value || '').trim();
    const subtitulo = ($id('shopSubtitulo')?.value || '').trim();
    const whatsapp = ($id('shopWhatsapp')?.value || '').replace(/[^0-9]/g, '');
    const maxProductos = Number($id('shopMax')?.value) || 200;
    const horarioAtencion = ($id('shopHorario')?.value || '').trim() || 'Lun-Sab 9:00am - 9:00pm';

    if (!titulo) { toast('El nombre no puede estar vacío', 'err'); return; }
    if (!whatsapp || whatsapp.length < 8) { toast('WhatsApp inválido', 'err'); return; }
    if (maxProductos < 10 || maxProductos > 500) { toast('Máximo debe estar entre 10 y 500', 'err'); return; }

    try {
      const r = await fetch(API + '/api/shop-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, subtitulo, whatsapp, maxProductos, horarioAtencion }),
      });
      const d = await r.json();
      if (d.ok) {
        toast('✅ Configuración guardada', 'ok');
        await actualizarContadores();
      } else {
        toast('Error: ' + (d.error || ''), 'err');
      }
    } catch(_) { toast('Error de conexión', 'err'); }
  }

  // Exponer
  window.comdiaz_shop_cargar_config = cargarConfigShop;
  window.comdiaz_shop_guardar_config = guardarConfigShop;

  // ─── Actualizar contadores y estado ───
  async function actualizarContadores() {
    try {
      if (!navigator.onLine) return;
      const r = await fetch(API + '/api/state');
      const s = await r.json();

      const published = s.published || [];
      const total = (s.results || []).length;

      const cnt = $id('publishedCount');
      if (cnt) cnt.textContent = published.length;
      const pn = $id('publishedNum');
      if (pn) pn.textContent = published.length;
      const tn = $id('totalNum');
      if (tn) tn.textContent = total;

      const tog = $id('autoPublishToggle');
      if (tog) tog.checked = !!s.shopConfig?.publicarAutomatico;

      const dot = $id('shopStatusDot');
      const txt = $id('shopStatusText');
      if (dot && txt) {
        if (published.length > 0) {
          dot.className = 'on';
          dot.textContent = '●';
          txt.textContent = 'Catálogo activo · ' + published.length + ' productos visibles';
        } else {
          dot.className = 'off';
          dot.textContent = '●';
          txt.textContent = 'Catálogo vacío';
        }
      }
    } catch(e) { console.warn('Error shop UI:', e); }
  }

  // ─── Marcar productos publicados en el grid ───
  async function marcarPublicados() {
    try {
      if (!navigator.onLine) return;
      const r = await fetch(API + '/api/published');
      const data = await r.json();
      const ids = new Set(data.ids || []);

      document.querySelectorAll('.prod').forEach(card => {
        const btn = card.querySelector('.prod-btn');
        if (!btn) return;
        const id = btn.dataset.pid;
        if (ids.has(id)) {
          btn.classList.add('published');
          btn.textContent = '✓';
          btn.title = 'Publicado · clic para ocultar';
        } else {
          btn.classList.remove('published');
          btn.textContent = '📤';
          btn.title = 'Publicar al catálogo';
        }
      });
    } catch(e) { console.warn(e); }
  }

  // ─── Toggle de auto-publicar ───
  document.addEventListener('change', async (e) => {
    if (e.target.id === 'autoPublishToggle') {
      const val = e.target.checked;
      try {
        await fetch(API + '/api/shop-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicarAutomatico: val }),
        });
        if (typeof toast === 'function') {
          toast(val ? '✅ Auto-publicar activado' : '⏸ Auto-publicar desactivado');
        }
      } catch(_) {}
    }
  });

  // ─── Botones principales ───
  document.addEventListener('click', async (e) => {
    const t = e.target;
    const btn = t.closest ? t.closest('button, a') : null;
    if (!btn) return;

    // Guardar config del shop
    if (btn.id === 'saveShopConfigBtn') {
      e.preventDefault();
      await guardarConfigShop();
      return;
    }

    // Publicar todos
    if (btn.id === 'publishAllBtn') {
      e.preventDefault();
      if (!navigator.onLine) { toast('🔴 Sin conexión', 'err'); return; }
      if (!confirm('¿Publicar TODOS los productos encontrados al catálogo?')) return;
      toast('Publicando…');
      try {
        const r = await fetch(API + '/api/publish-all', { method:'POST' });
        const d = await r.json();
        toast('✅ ' + d.total + ' productos publicados', 'ok');
        await actualizarContadores();
        await marcarPublicados();
      } catch(_) { toast('Error al publicar', 'err'); }
      return;
    }

    // Vaciar catálogo
    if (btn.id === 'unpublishAllBtn') {
      e.preventDefault();
      if (!confirm('¿Ocultar TODOS los productos del catálogo público?')) return;
      toast('Vaciando…');
      try {
        await fetch(API + '/api/unpublish-all', { method: 'POST' });
        toast('🗑 Catálogo vacío');
        await actualizarContadores();
        await marcarPublicados();
      } catch(_) { toast('Error', 'err'); }
      return;
    }

    // Publicar/despublicar producto individual
    if (btn.classList && btn.classList.contains('prod-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const pid = btn.dataset.pid;
      if (!pid) return;
      if (!navigator.onLine) { toast('🔴 Sin conexión', 'err'); return; }

      const published = btn.classList.contains('published');
      const endpoint = published ? '/api/unpublish/' : '/api/publish/';
      try {
        await fetch(API + endpoint + encodeURIComponent(pid), { method: 'POST' });
        toast(published ? '🗑 Oculto del catálogo' : '✅ Publicado', 'ok');
        await actualizarContadores();
        await marcarPublicados();
      } catch(_) { toast('Error', 'err'); }
    }
  }, true);

  // ─── Agregar botones a los productos del grid ───
  function inyectarBotonesProductos() {
    // Ya no hace falta inyectar: el botón se agrega en el render
    marcarPublicados();
  }

  // Exponer globalmente
  window.comdiaz_shop_actualizar = async function() {
    await actualizarContadores();
    inyectarBotonesProductos();
  };

  // Arrancar
  setTimeout(actualizarContadores, 2000);
  setTimeout(cargarConfigShop, 2000);
  setTimeout(inyectarBotonesProductos, 2500);
  setInterval(() => {
    actualizarContadores();
    inyectarBotonesProductos();
  }, 30000);

  // Enganchar con el refresh
  const _prevRefresh = window.refresh;
  if (typeof _prevRefresh === 'function') {
    window.refresh = async function() {
      await _prevRefresh.apply(this, arguments);
      setTimeout(inyectarBotonesProductos, 500);
    };
  }

  console.log('✅ comdiaz_shop_ui_v1 listo');
})();


// ═══════════════════════════════════════════════
// PRODUCTOS MANUALES (comdiaz_manual_v1)
// ═══════════════════════════════════════════════
(function comdiaz_manual_v1(){
  const $id = (id) => document.getElementById(id);
  let fotoBase64 = '';
  let productosManuales = [];

  // ─── Cargar productos manuales ───
  async function cargarManuales() {
    if (!navigator.onLine) return;
    try {
      const r = await fetch(API + '/api/manual/products');
      const data = await r.json();
      productosManuales = data.products || [];
      renderManuales();
      const badge = $id('manualCount');
      if (badge) badge.textContent = productosManuales.length;
    } catch(e) { console.warn('Error manuales:', e); }
  }

  // ─── Renderizar lista ───
  function renderManuales() {
    const box = $id('manualList');
    if (!box) return;

    if (!productosManuales.length) {
      box.innerHTML = '<div class="manual-empty">No hay productos manuales aún</div>';
      return;
    }

    box.innerHTML = '';
    productosManuales.forEach(p => {
      const el = document.createElement('div');
      el.className = 'manual-item';
      el.innerHTML = `
        <img src="${p.image}" alt="" onerror="this.style.opacity=.3">
        <div class="manual-item-body">
          <div class="manual-item-title">${p.title}</div>
          <div class="manual-item-info">
            <span>Costo: $${Number(p.priceBase).toFixed(2)}</span>
            <span>Venta: <b>$${Number(p.salePrice).toFixed(2)}</b></span>
            <span>Stock: ${p.cantidad}</span>
          </div>
        </div>
        <div class="manual-item-actions">
          <button class="manual-item-btn sold" data-action="sold" data-id="${p.id}" title="Marcar 1 vendido">✓</button>
          <button class="manual-item-btn delete" data-action="delete" data-id="${p.id}" title="Eliminar">🗑</button>
        </div>
      `;
      box.appendChild(el);
    });
  }

  // ─── Comprimir imagen (usa editor automático profesional) ───
  async function comprimirImagen(file, maxSize = 800, quality = 0.8) {
    // Usar el editor automático profesional
    if (typeof window.comdiaz_procesarFoto === 'function') {
      return await window.comdiaz_procesarFoto(file, true);
    }
    // Fallback: compresión simple
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > h && w > maxSize) { h = h * maxSize / w; w = maxSize; }
          else if (h > maxSize) { w = w * maxSize / h; h = maxSize; }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ─── Subir imagen a ImgBB ───
  async function subirFoto(base64) {
    const r = await fetch(API + '/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        nombre: 'comdiaz-manual-' + Date.now(),
      }),
    });
    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'Error al subir');
    return data.url;
  }

  // ─── Actualizar preview del precio ───
  function updatePreview() {
    const base = Number($id('manualPrice')?.value) || 0;
    const margen = Number($id('manualMargin')?.value) || 0;
    const sale = base * (1 + margen / 100);
    const preview = $id('salePreview');
    if (preview) preview.textContent = '$' + sale.toFixed(2);
  }

  // ─── Abrir modal ───
  function abrirModal() {
    const m = $id('manualModal');
    if (!m) return;
    // Reset
    fotoBase64 = '';
    $id('manualTitle').value = '';
    $id('manualCategory').value = 'Local';
    $id('manualDescription').value = '';
    $id('manualPrice').value = '';
    $id('manualQty').value = '1';
    $id('manualMargin').value = state?.margin || 35;
    $id('photoPreview').classList.add('hidden');
    $id('photoPreview').src = '';
    $id('photoPlaceholder').classList.remove('hidden');
    $id('manualMsg').textContent = '';
    updatePreview();
    m.classList.remove('hidden');
  }

  function cerrarModal() {
    $id('manualModal')?.classList.add('hidden');
  }

  // ─── Guardar producto ───
  async function guardarProducto() {
    const msg = $id('manualMsg');
    const btn = $id('manualSave');

    const title = ($id('manualTitle')?.value || '').trim();
    const category = ($id('manualCategory')?.value || 'Local').trim() || 'Local';
    const description = ($id('manualDescription')?.value || '').trim();
    const priceBase = Number($id('manualPrice')?.value) || 0;
    const cantidad = Number($id('manualQty')?.value) || 1;
    const margenPct = Number($id('manualMargin')?.value) || 35;

    if (!fotoBase64) { msg.textContent = '✕ Sube una foto'; msg.style.color = '#ef4444'; return; }
    if (!title) { msg.textContent = '✕ Escribe un título'; msg.style.color = '#ef4444'; return; }
    if (priceBase <= 0) { msg.textContent = '✕ Precio inválido'; msg.style.color = '#ef4444'; return; }

    if (btn) btn.disabled = true;
    msg.textContent = 'Subiendo foto...';
    msg.style.color = '#94a3b8';

    try {
      // 1. Subir la foto a ImgBB
      const imageUrl = await subirFoto(fotoBase64);

      msg.textContent = 'Guardando producto...';

      // 2. Guardar el producto
      const r = await fetch(API + '/api/manual/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, category, description,
          image: imageUrl,
          images: [imageUrl],
          priceBase, cantidad, margenPct,
          publicado: true,
        }),
      });
      const data = await r.json();

      if (!data.ok) throw new Error(data.error || 'Error al guardar');

      msg.textContent = '✓ Producto publicado en Comdiaz Shop';
      msg.style.color = '#10b981';
      if (typeof toast === 'function') toast('✅ Publicado en la tienda', 'ok');

      await cargarManuales();
      setTimeout(cerrarModal, 800);
    } catch(e) {
      msg.textContent = '✕ ' + e.message;
      msg.style.color = '#ef4444';
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ─── Delegación de eventos ───
  document.addEventListener('click', async (e) => {
    const t = e.target;

    // Abrir modal
    if (t.id === 'addManualBtn' || (t.closest && t.closest('#addManualBtn'))) {
      e.preventDefault();
      abrirModal();
      return;
    }

    // Cerrar modal
    if (t.id === 'manualClose' || (t.closest && t.closest('#manualClose')) ||
        (t.classList && t.classList.contains('modal') && t.id === 'manualModal')) {
      cerrarModal();
      return;
    }

    // Subir foto
    if (t.id === 'photoPreviewBox' || (t.closest && t.closest('#photoPreviewBox'))) {
      $id('photoInput')?.click();
      return;
    }

    // Guardar
    if (t.id === 'manualSave' || (t.closest && t.closest('#manualSave'))) {
      e.preventDefault();
      guardarProducto();
      return;
    }

    // Acciones de items
    const btn = t.closest && t.closest('.manual-item-btn');
    if (btn) {
      e.preventDefault();
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === 'sold') {
        if (!confirm('¿Marcar 1 unidad como vendida?')) return;
        await fetch(API + '/api/manual/products/' + id + '/sold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cantidad: 1 }),
        });
        await cargarManuales();
        if (typeof toast === 'function') toast('✓ Vendido');
      } else if (action === 'delete') {
        if (!confirm('¿Eliminar este producto?')) return;
        await fetch(API + '/api/manual/products/' + id, { method: 'DELETE' });
        await cargarManuales();
        if (typeof toast === 'function') toast('🗑 Eliminado');
      }
    }
  }, true);

  // ─── Cambio de foto ───
  document.addEventListener('change', async (e) => {
    if (e.target.id === 'photoInput') {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        fotoBase64 = await comprimirImagen(file);
        const img = $id('photoPreview');
        img.src = fotoBase64;
        img.classList.remove('hidden');
        $id('photoPlaceholder').classList.add('hidden');
      } catch(err) {
        if (typeof toast === 'function') toast('Error al procesar foto', 'err');
      }
    }
    if (e.target.id === 'manualMargin' || e.target.id === 'manualPrice') {
      updatePreview();
    }
  });

  // Input change para el preview
  document.addEventListener('input', (e) => {
    if (e.target.id === 'manualMargin' || e.target.id === 'manualPrice') {
      updatePreview();
    }
  });

  // Exponer
  window.comdiaz_manual_actualizar = cargarManuales;

  // Cargar al arrancar
  setTimeout(cargarManuales, 2000);
  setInterval(cargarManuales, 30000);

  console.log('✅ Productos manuales listos');
})();


// ═══════════════════════════════════════════════
// EDITOR AUTOMÁTICO DE FOTOS (comdiaz_auto_edit_v1)
// ═══════════════════════════════════════════════
(function comdiaz_auto_edit_v1(){
  const $id = (id) => document.getElementById(id);

  // ─── Aplicar auto-ajustes a una imagen ───
  function aplicarAutoAjustes(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // 1) Calcular promedio de luminosidad y contraste
    let sumLum = 0;
    let minLum = 255;
    let maxLum = 0;
    const lumValues = new Uint8Array(w * h);

    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
      lumValues[i/4] = lum;
      sumLum += lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    const avgLum = sumLum / (w * h);
    const rango = maxLum - minLum;

    // 2) Calcular factores
    // Brillo: acercar el promedio a 128
    let brillo = 0;
    if (avgLum < 110) brillo = Math.min(40, (128 - avgLum) * 0.7);
    else if (avgLum > 175) brillo = Math.max(-25, (128 - avgLum) * 0.6);

    // Contraste: si el rango es pequeño, aumentarlo
    let contraste = 1.0;
    if (rango < 200) contraste = 1 + (200 - rango) / 250;
    contraste = Math.min(contraste, 1.5);

    // Saturación: subir ligeramente
    const saturacion = 1.30;

    // 3) Aplicar los ajustes
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i+1];
      let b = data[i+2];

      // Brillo
      r += brillo;
      g += brillo;
      b += brillo;

      // Contraste (aplicado sobre el gris medio 128)
      r = ((r - 128) * contraste) + 128;
      g = ((g - 128) * contraste) + 128;
      b = ((b - 128) * contraste) + 128;

      // Saturación (mezclar con el gris)
      const gris = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gris + (r - gris) * saturacion;
      g = gris + (g - gris) * saturacion;
      b = gris + (b - gris) * saturacion;

      // Clamp
      data[i] = Math.max(0, Math.min(255, r));
      data[i+1] = Math.max(0, Math.min(255, g));
      data[i+2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);

    // Aplicar sharpen suave (mejora la nitidez)
    try {
      const w2 = canvas.width;
      const h2 = canvas.height;
      const original = ctx.getImageData(0, 0, w2, h2);
      const data2 = original.data;
      const copy = new Uint8ClampedArray(data2);
      const amount = 0.4;
      
      for (let y = 1; y < h2 - 1; y++) {
        for (let x = 1; x < w2 - 1; x++) {
          const i = (y * w2 + x) * 4;
          for (let c = 0; c < 3; c++) {
            const idx = i + c;
            const arriba = ((y-1) * w2 + x) * 4 + c;
            const abajo = ((y+1) * w2 + x) * 4 + c;
            const izq = (y * w2 + (x-1)) * 4 + c;
            const der = (y * w2 + (x+1)) * 4 + c;
            const val = copy[idx] * (1 + 4 * amount) - amount * (copy[arriba] + copy[abajo] + copy[izq] + copy[der]);
            data2[idx] = Math.max(0, Math.min(255, val));
          }
        }
      }
      ctx.putImageData(original, 0, 0);
    } catch(e) { console.warn('Sharpen error:', e); }

    return { brillo, contraste, saturacion };
  }

  // ─── Redimensionar y centrar en cuadrado 800x800 ───
  function normalizarCuadrado(img, size = 800) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Calcular el rectángulo para ajustar la imagen
    const ratio = img.width / img.height;
    let newW, newH;
    if (ratio > 1) {
      newW = size;
      newH = size / ratio;
    } else {
      newH = size;
      newW = size * ratio;
    }

    const x = (size - newW) / 2;
    const y = (size - newH) / 2;

    ctx.drawImage(img, x, y, newW, newH);
    return canvas;
  }

  // ─── Procesar foto: comprimir + auto-ajustes + cuadrado ───
  window.comdiaz_procesarFoto = function(file, conAutoAjustes = true) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 1. Normalizar a cuadrado 800x800 con fondo blanco
          const canvas = normalizarCuadrado(img, 800);

          // 2. Aplicar auto-ajustes
          if (conAutoAjustes) {
            try {
              aplicarAutoAjustes(canvas);
              console.log('✅ Auto-ajustes aplicados');
            } catch(err) {
              console.warn('Error en auto-ajustes:', err);
            }
          }

          // 3. Convertir a JPEG 85%
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  console.log('✅ Editor automático listo');
})();
