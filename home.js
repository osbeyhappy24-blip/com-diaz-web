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

async function api(path, opts={}) {
  const r = await fetch(API + path, {
    headers: { 'Content-Type':'application/json' },
    ...opts,
  });
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
  if (!on) {
    $('toggleBtn').className = 'toggle-btn loading';
    $('toggleIcon').textContent = '⏱';
    $('toggleLabel').textContent = 'Arrancando en 5s…';
    toast('Arrancando en 5 segundos…');
    await api('/api/automation/play', { method:'POST' });
    setTimeout(refresh, 5500);
  } else {
    await api('/api/automation/pause', { method:'POST' });
    await refresh();
    toast('Automatización pausada');
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
          await fetch((window.API||'http://localhost:3000') + '/api/publish-times', {
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
      await fetch((window.API||'http://localhost:3000') + '/api/publish-times', {
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

// ---------- Candado del margen ----------
(function initMarginLock(){
  const btn = document.getElementById('lockMargin');
  const row = document.querySelector('.margin-row');
  const slider = document.getElementById('marginRange');
  if (!btn || !row || !slider) return;

  const KEY = 'comdiaz_margin_locked';
  let locked = localStorage.getItem(KEY) === '1';

  function aplicar() {
    btn.textContent = locked ? '🔒' : '🔓';
    btn.classList.toggle('locked', locked);
    row.classList.toggle('locked', locked);
    // Guardar
    try { localStorage.setItem(KEY, locked ? '1' : '0'); } catch(_) {}
  }

  // Bloquear input directo si está locked
  slider.addEventListener('input', (e) => {
    if (locked) {
      e.preventDefault();
      return false;
    }
  }, { capture:true });

  // Botón toggle
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    locked = !locked;
    aplicar();
    if (typeof toast === 'function') {
      toast(locked ? '🔒 Margen bloqueado' : '🔓 Margen desbloqueado');
    }
  });

  aplicar();
  console.log('✅ Candado del margen inicializado');
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
