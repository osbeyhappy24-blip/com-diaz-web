// Helper de progreso
window.comdiaz_progress_marker = function(msg, color) {
  const el = document.getElementById('comdiaz_progress');
  if (el) { el.textContent = msg; el.style.background = color || '#10b981'; }
  console.log('[COMDIAZ] ' + msg);
};
window.comdiaz_progress_marker('Paso 1: home.js arrancando');

// ═══════════════════════════════════════════════
// CAPTURADOR DE ERRORES (temporal)
// ═══════════════════════════════════════════════
(function comdiaz_error_catcher(){
  function mostrar(msg, tipo) {
    let box = document.getElementById('comdiaz_error_box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'comdiaz_error_box';
      box.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#7f1d1d;color:#fff;padding:10px;font-size:11px;font-family:monospace;z-index:999999;max-height:40vh;overflow:auto;white-space:pre-wrap';
      box.innerHTML = '<b>🚨 ERRORES DETECTADOS:</b>\n';
      (document.body || document.documentElement).appendChild(box);
    }
    box.innerHTML += '\n[' + tipo + '] ' + msg;
  }
  window.addEventListener('error', e => {
    mostrar(e.message + '\n  en ' + (e.filename||'?') + ' línea ' + e.lineno, 'error');
  });
  window.addEventListener('unhandledrejection', e => {
    mostrar('Promise rechazada: ' + (e.reason && e.reason.message ? e.reason.message : e.reason), 'promise');
  });
  console.log('✅ Capturador de errores activo');
})();

// ---- Envía la clave como ?k= (evita preflight CORS) ----
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
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime())/1000);
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.floor(s/60)}m`;
  if (s < 86400) return `hace ${Math.floor(s/3600)}h`;
  return `hace ${Math.floor(s/86400)}d`;
}

// ---------- Render ----------
function renderStatus() {
  const on = state.automation.running;
  $('statusPill').textContent = on ? '● ACTIVO' : '● EN PAUSA';
  $('statusPill').className = 'status-pill ' + (on ? 'on' : 'off');
  $('statusText').textContent = on ? 'Automatización activa' : 'Automatización pausada';

  const btn = $('toggleBtn');
  btn.className = 'toggle-btn ' + (on ? 'running' : 'paused');
  $('toggleIcon').textContent = on ? '❚❚' : '▶';
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
    ? `${fmtMoney(state.results[0].basePrice)} → ${fmtMoney(state.results[0].salePrice)}`
    : 'Sin productos aún';
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
      x.textContent = '✕';
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
    div.innerHTML = `
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
}

// ---------- Carga ----------
async function refresh() {
  state = await api('/api/state');
  renderAll();
}

// ---------- Acciones ----------
$('toggleBtn').onclick = async () => {
  const on = state.automation.running;
  const btn = $('toggleBtn');

  if (!on) {
    // Optimista: pinta ámbar de inmediato
    btn.className = 'toggle-btn loading';
    $('toggleIcon').textContent = '⏱';
    $('toggleLabel').textContent = 'Arrancando en 5s…';
    toast('Arrancando en 5 segundos…');

    try {
      const r = await api('/api/automation/play', { method:'POST' });
      // Refresh inmediato del estado (sin esperar los 5s)
      await refresh();
      // Refresh tras 5.5s para reflejar primera búsqueda
      setTimeout(refresh, 5500);
      toast('▶ Automatización activada', 'ok');
    } catch (e) {
      toast('Error al activar: ' + e.message, 'err');
      await refresh();
    }
  } else {
    // Pausa: optimista
    btn.className = 'toggle-btn loading';
    $('toggleIcon').textContent = '⏱';
    $('toggleLabel').textContent = 'Pausando…';

    try {
      await api('/api/automation/pause', { method:'POST' });
      await refresh();
      toast('⏸ Automatización pausada');
    } catch (e) {
      toast('Error al pausar: ' + e.message, 'err');
      await refresh();
    }
  }
};

$('searchNow').onclick = async () => {
  toast('Buscando…');
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
  toast('Generando resumen…');
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

    // Botón ✕ o clic en el fondo oscuro => cerrar
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
      if (typeof toast === 'function') toast('Copiado ✅','ok');
      return;
    }

    // Regenerar
    if (t.id === 'regenBtn' || t.closest('#regenBtn')) {
      e.stopPropagation();
      if (typeof generarShare === 'function') {
        toast('Regenerando…');
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
      el.innerHTML = '<span>🕐 ' + t + '</span>';
      if (editing) {
        const x = document.createElement('span');
        x.textContent = '✕';
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
        }).join(' · ')
      : '—';
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
      if ((st.automation.publishTimes || []).includes(v)) { alert('Esa hora ya está'); return; }
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

  // Y también en cada cambio de #countProducts (señal de refresh)
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
    chev.textContent = '▾';
  }

  head.addEventListener('click', () => {
    const isOpen = box.classList.contains('open');
    if (isOpen) {
      box.classList.remove('open');
      box.classList.add('collapsed');
      chev.classList.remove('open');
      chev.textContent = '▸';
      localStorage.setItem(KEY, '0');
    } else {
      box.classList.remove('collapsed');
      box.classList.add('open');
      chev.classList.add('open');
      chev.textContent = '▾';
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
        ? (src.hasConfig ? '<span class="source-sub ok">✓ Configurada</span>' : '<span class="source-sub warn">⚠ Requiere configuración</span>')
        : '<span class="source-sub">Sin clave · lista para usar</span>';
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
        if (typeof toast === 'function') toast((nuevo?'✅ Activada: ':'⏸ Desactivada: ') + src.label);
      };

      row.appendChild(emoji);
      row.appendChild(info);
      row.appendChild(toggle);
      wrap.appendChild(row);

      if (editMode && src.needsKey) {
        const cfg = document.createElement('div');
        cfg.className = 'source-cfg';
        src.keyFields.forEach(field => {
          const lbl = document.createElement('label');
          lbl.textContent = field;
          const inp = document.createElement('input');
          inp.type = 'password';
          inp.placeholder = 'Pega aquí tu ' + field;
          inp.id = 'cfg-' + src.id + '-' + field;
          cfg.appendChild(lbl);
          cfg.appendChild(inp);
        });

        const btn = document.createElement('button');
        btn.className = 'save-cfg';
        btn.textContent = '💾 Guardar credenciales';
        btn.onclick = async () => {
          const config = {};
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
          a.textContent = '¿Cómo obtener las claves? →';
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


// ════════════════════════════════════════
//  SISTEMA COLAPSABLE (Comdiaz v0.2)
// ════════════════════════════════════════
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
      // Mover los hijos del head a la izquierda (excepto el botón/label derecho)
      const rightBtn = head.querySelector('.btn-mini, .badge, button');
      const h2 = head.querySelector('h2');
      if (h2) left.appendChild(h2);
      head.insertBefore(left, head.firstChild);

      const chev = document.createElement('span');
      chev.className = 'card-chev';
      chev.textContent = '▸';
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
      // Mover todo lo que viene después del head
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

    // Función para aplicar
    function aplicar(abrir) {
      if (abrir) {
        card.classList.add('open');
        if (chev) chev.textContent = '▾';
      } else {
        card.classList.remove('open');
        if (chev) chev.textContent = '▸';
      }
    }
    aplicar(estado);

    // Click para togglear
    head.addEventListener('click', (e) => {
      // Ignorar si el click fue en un botón de acción (ej: Configurar, Editar)
      if (e.target.closest('.btn-mini')) return;
      const abrir = !card.classList.contains('open');
      aplicar(abrir);
      saved[id] = abrir;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch(_) {}
    });
  });

  console.log('✅ Sistema colapsable inicializado');
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
      // Regenerar automáticamente
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
  console.log('✅ Modos de resumen inicializados');
})();



// ---------- Análisis y medición de red ----------
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
        net: {             // bytes por período
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
      // Mantener últimos 100
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
        box.innerHTML = '<div class="hist-empty">Sin historial todavía</div>';
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
          '<div class="h-trigger">' + s.trigger + (s.mode ? ' · ' + s.mode : '') + '</div>' +
          '<div class="h-info">' + s.products + ' productos · ' + s.margin + '%</div>' +
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
      if (!confirm('¿Borrar todas las estadísticas locales?')) return;
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

  // Enganchar al botón "Buscar ahora"
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

  console.log('✅ Analytics inicializado');
})();





// ---------- Logout (v3, directo al botón) ----------
(function initLogoutV3(){
  function bind() {
    const btn = document.getElementById('logoutBtn');
    if (!btn) {
      console.log('⚠️ logoutBtn no encontrado en el DOM');
      return;
    }
    // onclick sobreescribe cualquier listener anterior
    btn.onclick = function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      console.log('🔓 Logout: limpiando sesión y redirigiendo');
      try { localStorage.removeItem('comdiaz_auth_until'); } catch(_) {}
      // Forzar recarga limpia
      setTimeout(() => {
        window.location.replace('index.html');
      }, 50);
    };
    console.log('✅ Logout bindeado al botón');
  }
  // El script corre al final del body, el botón ya debería existir
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();













// ═══════════════════════════════════════════════
// INTERACCIONES CRÍTICAS (delegación — v3)
// ═══════════════════════════════════════════════
(function initDelegado(){
  console.log('🔧 initDelegado arrancando');

  // --- CANDADO DEL PLAY ---
  const KEY_LOCK = 'comdiaz_play_locked';
  function aplicarLockPlay() {
    const btn = document.getElementById('lockPlay');
    const row = document.querySelector('.play-row');
    if (!btn || !row) return;
    const locked = localStorage.getItem(KEY_LOCK) === '1';
    btn.textContent = locked ? '🔒' : '🔓';
    btn.classList.toggle('locked', locked);
    row.classList.toggle('locked', locked);
  }

  // --- MODAL DE PIN ---
  function abrirPinModal() {
    const m = document.getElementById('pinModal');
    if (!m) { console.log('❌ pinModal no existe'); return; }
    const a = document.getElementById('pinActual');
    const n = document.getElementById('pinNuevo');
    const c = document.getElementById('pinConfirm');
    const msg = document.getElementById('pinMsg');
    if (a) a.value = '';
    if (n) n.value = '';
    if (c) c.value = '';
    if (msg) { msg.textContent = ''; msg.style.color = '#94a3b8'; }
    m.classList.remove('hidden');
    console.log('🔑 Modal abierto');
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
      msg.textContent = '✕ El PIN debe tener 4-10 dígitos';
      msg.style.color = '#ef4444'; return;
    }
    if (n !== c) {
      msg.textContent = '✕ Los PIN nuevos no coinciden';
      msg.style.color = '#ef4444'; return;
    }
    msg.textContent = 'Guardando…';
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
        msg.textContent = '✓ PIN actualizado';
        msg.style.color = '#10b981';
        if (typeof toast === 'function') toast('PIN actualizado ✅', 'ok');
        setTimeout(cerrarPinModal, 1200);
      } else {
        msg.textContent = '✕ ' + (data.error || 'Error');
        msg.style.color = '#ef4444';
      }
    } catch (e) {
      msg.textContent = '✕ Error de conexión';
      msg.style.color = '#ef4444';
    }
  }

  // --- Delegación de clicks ---
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

    // Candado del Play
    if (btn && btn.id === 'lockPlay') {
      e.preventDefault(); e.stopPropagation();
      const locked = localStorage.getItem(KEY_LOCK) === '1';
      localStorage.setItem(KEY_LOCK, locked ? '0' : '1');
      aplicarLockPlay();
      if (typeof toast === 'function') {
        toast(!locked ? '🔒 Play bloqueado' : '🔓 Play desbloqueado');
      }
      return;
    }

    // Bloquear el Play si el candado está cerrado
    if (btn && btn.id === 'toggleBtn') {
      if (localStorage.getItem(KEY_LOCK) === '1') {
        e.preventDefault(); e.stopPropagation();
        if (typeof toast === 'function') toast('🔒 Desbloquea el candado primero', 'err');
        return false;
      }
    }
  }, true); // capture:true para anticiparnos a otros listeners

  // Aplicar estado inicial
  function aplicarTodo() {
    aplicarLockPlay();
  }
  aplicarTodo();
  // Por si el DOM se carga después
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicarTodo);
  }
  setTimeout(aplicarTodo, 500);

  console.log('✅ initDelegado listo');
})();


// ═══════════════════════════════════════════════
// CANDADOS: Play + Margen (delegación — v3)
// ═══════════════════════════════════════════════
(function initCandados(){
  console.log('🔐 initCandados arrancando');

  const KEY_PLAY = 'comdiaz_play_locked';
  const KEY_MARGIN = 'comdiaz_margin_locked';

  // ─── Aplicar estados ───
  function aplicarPlayLock() {
    const btn = document.getElementById('lockPlay');
    const row = document.querySelector('.play-row');
    if (!btn || !row) return;
    const locked = localStorage.getItem(KEY_PLAY) === '1';
    btn.textContent = locked ? '🔒' : '🔓';
    btn.classList.toggle('locked', locked);
    row.classList.toggle('locked', locked);
  }

  function aplicarMarginLock() {
    const btn = document.getElementById('lockMargin');
    const row = document.querySelector('.margin-row');
    const slider = document.getElementById('marginRange');
    if (!btn || !row) return;
    const locked = localStorage.getItem(KEY_MARGIN) === '1';
    btn.textContent = locked ? '🔒' : '🔓';
    btn.classList.toggle('locked', locked);
    row.classList.toggle('locked', locked);
    if (slider) slider.style.pointerEvents = locked ? 'none' : '';
    if (slider) slider.style.filter = locked ? 'grayscale(1) brightness(.7)' : '';
  }

  // ─── Delegación de clicks ───
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
        toast(nuevo ? '🔒 Play bloqueado' : '🔓 Play desbloqueado');
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
        toast(nuevo ? '🔒 Margen bloqueado' : '🔓 Margen desbloqueado');
      }
      return;
    }
  }, true);

  // ─── Bloquear el Play si el candado está cerrado ───
  document.addEventListener('click', (e) => {
    const btn = e.target.closest ? e.target.closest('button') : null;
    if (!btn || btn.id !== 'toggleBtn') return;
    if (localStorage.getItem(KEY_PLAY) === '1') {
      e.preventDefault(); e.stopPropagation();
      if (typeof toast === 'function') toast('🔒 Desbloquea el candado primero', 'err');
      return false;
    }
  }, true);

  // ─── Aplicar al cargar ───
  function aplicarTodo() {
    aplicarPlayLock();
    aplicarMarginLock();
  }
  aplicarTodo();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicarTodo);
  }
  // Por si el DOM cambia después
  setTimeout(aplicarTodo, 800);
  setTimeout(aplicarTodo, 2000);

  // Observer: si aparecen los botones después, aplicar
  const obs = new MutationObserver(() => aplicarTodo());
  obs.observe(document.body, { childList: true, subtree: true });

  console.log('✅ initCandados listo');
})();


// ═══════════════════════════════════════════════
// PANEL DE DIAGNÓSTICO (temporal)
// ═══════════════════════════════════════════════
(function comdiaz_debug_panel(){
  setTimeout(() => {
    const key = localStorage.getItem('comdiaz_api_key');
    const session = localStorage.getItem('comdiaz_auth_until');
    const debug = document.createElement('div');
    debug.id = 'comdiaz_debug_panel';
    debug.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#0f1524;border-top:2px solid #7c3aed;padding:10px;font-size:11px;color:#e5e7eb;z-index:99999;font-family:monospace;max-height:200px;overflow:auto';
    debug.innerHTML = '<b>🔍 DIAGNÓSTICO</b><br>' +
      'API key en localStorage: <b>' + (key ? '"' + key + '"' : 'NULL ❌') + '</b><br>' +
      'Sesión: <b>' + (session ? 'activa' : 'null') + '</b><br>' +
      'API backend: <b>' + (typeof API !== 'undefined' ? API : 'undefined') + '</b><br>' +
      'Interceptor: <b>' + (typeof window.fetch.toString().includes('comdiaz') ? 'activo' : 'no detectado') + '</b><br>' +
      '<span id="dbg_result">Probando fetch…</span>';

    document.body.appendChild(debug);

    // Test fetch con la clave
    fetch(API + '/api/state', {
      headers: { 'X-Comdiaz-Key': key || '' }
    })
    .then(r => r.json())
    .then(d => {
      const el = document.getElementById('dbg_result');
      if (el) el.innerHTML = 'Fetch con key: <b style="color:#10b981">' + (d.results ? d.results.length + ' productos ✅' : JSON.stringify(d).slice(0,80)) + '</b>';
    })
    .catch(e => {
      const el = document.getElementById('dbg_result');
      if (el) el.innerHTML = 'Fetch con key: <b style="color:#ef4444">ERROR: ' + e.message + '</b>';
    });
  }, 3000);
})();


window.comdiaz_progress_marker('Paso 99: home.js terminó OK');
