// 
// CAPTURADOR DE ERRORES (temporal)
// 


// ---- Envia la clave en header X-Comdiaz-Key ----
(function inyectarAuth(){
  const _fetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    const key = localStorage.getItem('comdiaz_api_key');
    if (key && typeof input === 'string' && input.includes(API)) {
      init = init || {};
      init.headers = Object.assign({}, init.headers || {}, { "X-Comdiaz-Key": key });
    }
    return _fetch(input, init);
  };
})();

const API_LOCAL = 'http://localhost:3000';
const API_PROD  = 'https://com-diaz-ty2b.onrender.com';
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
  if (state._lightMode && state._lightCounts) {
    $('countProducts').textContent = state._lightCounts.productos || 0;
    $('countCats').textContent = state._lightCounts.categorias || 0;
  } else {
    $('countProducts').textContent = (state.results || []).length;
    $('countCats').textContent = (state.categories || []).length;
  }
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

  // 3) Intentar traer estado completo (1.7 MB)
  try {
    if (window.comdiaz_update_badge) window.comdiaz_update_badge('syncing');
    state = await api('/api/state');
    if (window.comdiaz_save_cache) window.comdiaz_save_cache(state);
    renderAll();
    if (window.comdiaz_update_badge) window.comdiaz_update_badge('online');
    return;
  } catch (e) {
    console.warn('refresh /api/state falló, probando /api/home:', e.message);
  }

  // 4) FALLBACK: /api/home (300 bytes) — mantiene running real del servidor
  try {
    const home = await api('/api/home');
    if (home && home.ok) {
      const base = state || cached || {};
      state = {
        ...base,
        automation: {
          ...(base.automation || {}),
          running: home.running === true,
          publishTimes: home.publishTimes || [],
          lastRun: home.lastRun || null,
          delaySeconds: home.delaySeconds || 5,
        },
        margin: home.margin || base.margin || 35,
        // Contadores que renderMeta usará
        _lightCounts: {
          productos: home.productos,
          categorias: home.categorias,
          conIA: home.conIA,
          locales: home.locales,
          capMax: home.capMax,
        },
        _lightMode: true,
      };
      renderAll();
      if (window.comdiaz_update_badge) window.comdiaz_update_badge('online');
      return;
    }
  } catch (e) {
    console.warn('refresh /api/home también falló:', e.message);
  }

  // 5) Todo falló — usar caché
  if (cached) {
    state = cached;
    try { renderAll(); } catch(_){}
    if (window.comdiaz_update_badge) window.comdiaz_update_badge('offline');
    toast('🔴 Usando datos guardados', 'err');
  } else {
    if (window.comdiaz_update_badge) window.comdiaz_update_badge('error');
    toast('No se pudo conectar', 'err');
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
  const waBtnEl = $('waBtn');
  if (waBtnEl) {
    waBtnEl.removeAttribute('target');
    waBtnEl.href = '#';
    waBtnEl.onclick = (e) => { e.preventDefault(); (window.comdiaz_abrirWA || function(n,t){window.open('https://wa.me/'+n+'?text='+t,'_blank')})('5351425691', decodeURIComponent(enc)); };
  }
  $('fbBtn').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://com-diaz-ty2b.onrender.com/shop.html');
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
      const bAct = $id('shopBannerActiv');
      if (bAct) bAct.checked = !!cfg.bannerActivo;
      const bTxt = $id('shopBannerTexto');
      if (bTxt) bTxt.value = cfg.bannerTexto || '';
      const bCol = $id('shopBannerColor');
      if (bCol) bCol.value = cfg.bannerColor || 'gradient';
      const eAct = $id("shopEnvioActiv");
      if (eAct) eAct.checked = !!cfg.envioGratisActivo;
      const eTxt = $id("shopEnvioTexto");
      if (eTxt) eTxt.value = cfg.envioGratisTexto || "";
      const eWarn = $id("shopEnvioWarning");
      if (eWarn) eWarn.checked = !!cfg.envioGratisWarning;
    } catch(e) { console.warn(e); }
  }

  // ─── Guardar config ───
  async function guardarConfigShop() {
    const titulo = ($id('shopTitulo')?.value || '').trim();
    const subtitulo = ($id('shopSubtitulo')?.value || '').trim();
    const whatsapp = ($id('shopWhatsapp')?.value || '').replace(/[^0-9]/g, '');
    const maxProductos = Number($id('shopMax')?.value) || 200;
    const horarioAtencion = ($id('shopHorario')?.value || '').trim() || 'Lun-Sab 9:00am - 9:00pm';
    const bannerActivo = !!$id('shopBannerActiv')?.checked;
    const bannerTexto = ($id('shopBannerTexto')?.value || '').trim();
    const bannerColor = $id('shopBannerColor')?.value || 'gradient';

    if (!titulo) { toast('El nombre no puede estar vacío', 'err'); return; }
    if (!whatsapp || whatsapp.length < 8) { toast('WhatsApp inválido', 'err'); return; }
    if (maxProductos < 10 || maxProductos > 500) { toast('Máximo debe estar entre 10 y 500', 'err'); return; }

    try {
      const r = await fetch(API + '/api/shop-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, subtitulo, whatsapp, maxProductos, horarioAtencion, bannerActivo, bannerTexto, bannerColor, envioGratisActivo: !!$id('shopEnvioActiv')?.checked, envioGratisTexto: ($id('shopEnvioTexto')?.value || '').trim(), envioGratisWarning: !!$id('shopEnvioWarning')?.checked }),
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


// ═══════════════════════════════════════════════
// PANEL DE ESTADÍSTICAS (comdiaz_stats_v1)
// ═══════════════════════════════════════════════
(function comdiaz_stats_v1(){
  const $id = (id) => document.getElementById(id);

  async function cargarStats() {
    if (!navigator.onLine) return;
    try {
      const r = await fetch(API + '/api/stats');
      const s = await r.json();
      if (!s.ok) return;
      renderStats(s);
    } catch(e) { console.warn('Error stats:', e); }
  }

  function renderStats(s) {
    // Hoy
    const hoy = s.hoy || {};
    if ($id('sVisitsToday')) $id('sVisitsToday').textContent = hoy.visitas || 0;
    if ($id('sProductsToday')) $id('sProductsToday').textContent = hoy.productos || 0;
    if ($id('sCartToday')) $id('sCartToday').textContent = hoy.carrito || 0;
    if ($id('sWaToday')) $id('sWaToday').textContent = hoy.whatsapp || 0;

    // Total
    if ($id('sTotal')) $id('sTotal').textContent = s.total || 0;

    // Barra semanal
    const weekBox = $id('sWeek');
    if (weekBox) {
      const dias = s.ultimos7 || [];
      const maxVisitas = Math.max(1, ...dias.map(d => d.visitas || 0));
      weekBox.innerHTML = '';
      dias.forEach(d => {
        const wrap = document.createElement('div');
        wrap.className = 'stats-bar-wrap';
        const pct = ((d.visitas || 0) / maxVisitas) * 100;
        const diaSem = new Date(d.fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'short' });
        wrap.innerHTML = `
          <div class="stats-bar" style="height: ${Math.max(4, pct)}%">
            <span class="stats-bar-num">${d.visitas || 0}</span>
          </div>
          <span class="stats-bar-lbl">${diaSem}</span>
        `;
        weekBox.appendChild(wrap);
      });
    }

    // Top productos
    const topBox = $id('sTopProducts');
    if (topBox) {
      const top = s.topProductos || [];
      if (!top.length) {
        topBox.innerHTML = '<div style="color:var(--muted);font-size:12px;text-align:center;padding:14px">Sin datos aún</div>';
      } else {
        topBox.innerHTML = '';
        top.forEach((p, i) => {
          const el = document.createElement('div');
          el.className = 'top-item';
          el.innerHTML = `
            <span class="top-rank">${i + 1}</span>
            <span class="top-title">${(p.title || 'Sin título').slice(0, 45)}</span>
            <span class="top-count">${p.count}×</span>
          `;
          topBox.appendChild(el);
        });
      }
    }
  }

  // Botón refrescar
  document.addEventListener('click', (e) => {
    if (e.target.id === 'refreshStats' || (e.target.closest && e.target.closest('#refreshStats'))) {
      e.preventDefault();
      if (typeof toast === 'function') toast('🔄 Actualizando...');
      cargarStats();
    }
  });

  // Cargar al arrancar
  setTimeout(cargarStats, 2500);
  // Y cada 60 segundos
  setInterval(cargarStats, 60000);

  console.log('✅ Panel de estadísticas listo');
})();


// ═══════════════════════════════════════════════
// DESTACAR DESDE EL HOME (comdiaz_featured_home_v1)
// ═══════════════════════════════════════════════
(function comdiaz_featured_home_v1(){
  let destacados = [];

  // Cargar IDs destacados
  async function cargarDestacados() {
    try {
      if (!navigator.onLine) return;
      const r = await fetch(API + "/api/featured");
      const data = await r.json();
      destacados = data.ids || [];
      marcarEstrellas();
    } catch(e) {}
  }

  // Marcar las estrellas según los IDs
  function marcarEstrellas() {
    document.querySelectorAll(".prod").forEach(card => {
      const pid = card.dataset.pid;
      const star = card.querySelector(".prod-star");
      if (!star) return;
      const activo = destacados.includes(pid);
      star.classList.toggle("active", activo);
      star.textContent = activo ? "⭐" : "☆";
      star.title = activo ? "Quitar de destacados" : "Marcar como destacado";
    });
  }

  // Agregar estrella a cada producto (después del render)
  function agregarEstrellas() {
    document.querySelectorAll(".prod").forEach(card => {
      if (card.querySelector(".prod-star")) return;
      const pid = card.dataset.pid;
      if (!pid) return;
      const actions = card.querySelector(".prod-actions");
      if (!actions) return;
      const star = document.createElement("button");
      star.className = "prod-btn prod-star";
      star.textContent = destacados.includes(pid) ? "⭐" : "☆";
      star.title = "Marcar como destacado";
      actions.appendChild(star);
    });
    marcarEstrellas();
  }

  // Click en estrella
  document.addEventListener("click", async (e) => {
    const star = e.target.closest && e.target.closest(".prod-star");
    if (!star) return;
    e.preventDefault();
    e.stopPropagation();
    const card = star.closest(".prod");
    const pid = card?.dataset.pid;
    if (!pid) return;

    try {
      const r = await fetch(API + "/api/featured/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pid }),
      });
      const data = await r.json();
      if (data.ok) {
        await cargarDestacados();
        const activo = destacados.includes(pid);
        if (typeof toast === "function") {
          toast(activo ? "⭐ Marcado como destacado" : "☆ Quitado de destacados", "ok");
        }
      }
    } catch(err) {
      if (typeof toast === "function") toast("Error al destacar", "err");
    }
  }, true);

  // Enganchar con refresh
  const _origRefresh = window.refresh;
  if (typeof _origRefresh === "function") {
    window.refresh = async function() {
      await _origRefresh.apply(this, arguments);
      setTimeout(agregarEstrellas, 200);
    };
  }

  // Arranque
  setTimeout(() => {
    cargarDestacados();
    agregarEstrellas();
  }, 2500);
  setInterval(() => {
    cargarDestacados();
    agregarEstrellas();
  }, 30000);

  console.log("✅ Destacar desde Home activo");
})();


/* ═══════════════════════════════════════════════
   PANEL PEDIDOS — Fase 2
   ═══════════════════════════════════════════════ */
(function comdiaz_orders_panel_v1(){
  let pedidos = [];
  let filtroEstado = 'all';
  let pedidoActivo = null;

  const $id = id => document.getElementById(id);

  const MENSAJES_ESTADO = {
    pendiente_pago: 'Hola {nombre} 👋\n\nRecibimos tu pedido *{id}* por ${total}. Cuando confirmes el pago, te avisamos para empezar a prepararlo.\n\nGracias por confiar en Comdiaz Shop 💙',
    pagado: 'Hola {nombre} 🎉\n\n¡Confirmamos tu pago del pedido *{id}*!\n\nYa estamos preparando tus productos. Te avisamos cuando salgan hacia Cuba ✈️',
    en_transito: 'Hola {nombre} ✈️\n\nTus productos del pedido *{id}* ya están en camino a Cuba.\n\n{tracking_info}En cuanto lleguen a la isla, te avisamos 🇨🇺',
    en_cuba: 'Hola {nombre} 🇨🇺\n\n¡Tu pedido *{id}* ya llegó a Cuba!\n\nEstamos coordinando la entrega. Pronto te avisamos para que lo recojas 📦',
    listo_recoger: 'Hola {nombre} 🎉\n\n¡Tu pedido *{id}* está LISTO PARA RECOGER!\n\nEscribenos para coordinar la entrega:\n📞 5351425691',
    entregado: 'Hola {nombre} 💙\n\n¡Gracias por tu compra! Esperamos que disfrutes tu pedido *{id}*.\n\nSi necesitas algo más, aquí estamos 🛍️',
    cancelado: 'Hola {nombre},\n\nTu pedido *{id}* fue cancelado. Si tienes dudas, escríbenos.'
  };

  const SIGUIENTE_ESTADO = {
    pendiente_pago: 'pagado',
    pagado: 'en_transito',
    en_transito: 'en_cuba',
    en_cuba: 'listo_recoger',
    listo_recoger: 'entregado',
    entregado: 'entregado',
    cancelado: 'cancelado'
  };

  function armarMensaje(p, estado) {
    const tpl = MENSAJES_ESTADO[estado] || MENSAJES_ESTADO.pendiente_pago;
    const trackInfo = p.tracking
      ? '📦 Tracking: ' + p.tracking + (p.agencia ? ' (' + p.agencia + ')' : '') + '\n\n'
      : '';
    return tpl
      .replace(/{nombre}/g, p.nombre || 'cliente')
      .replace(/{id}/g, p.id || '')
      .replace(/{total}/g, Number(p.total || 0).toFixed(2))
      .replace(/{tracking}/g, p.tracking || 'pendiente')
      .replace(/{agencia}/g, p.agencia || '')
      .replace(/{tracking_info}/g, trackInfo);
  }

  const ESTADO_LABEL = {
    pendiente_pago: '⏳ Pendiente',
    pagado: '💵 Pagado',
    en_transito: '✈️ En tránsito',
    en_cuba: '🇨🇺 En Cuba',
    listo_recoger: '✅ Listo',
    entregado: '🎉 Entregado',
    cancelado: '❌ Cancelado'
  };

  async function api(path, opts) {
    const headers = Object.assign({}, (opts && opts.headers) || {});
    if (opts && opts.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const r = await fetch(API + path, Object.assign({}, opts, { headers }));
    return r.json();
  }

  async function cargarPedidos() {
    const list = $id('pedidosList');
    if (!list) return;
    try {
      const r = await api('/api/orders');
      pedidos = r.orders || [];
      renderContador();
      renderLista();
    } catch(e) {
      list.innerHTML = '<div class="act-empty">Error al cargar: ' + e.message + '</div>';
    }
  }

  function renderContador() {
    const c = $id('pedidosCount');
    if (!c) return;
    const pendientes = pedidos.filter(p => p.estado === 'pendiente_pago').length;
    c.textContent = pendientes > 0 ? pendientes : pedidos.length;
    if (pendientes > 0) c.style.background = 'linear-gradient(135deg,#f59e0b,#d97706)';
  }

  function renderLista() {
    const list = $id('pedidosList');
    if (!list) return;
    let filtrados = pedidos;
    if (filtroEstado !== 'all') filtrados = pedidos.filter(p => p.estado === filtroEstado);
    if (!filtrados.length) {
      list.innerHTML = '<div class="act-empty">No hay pedidos ' + (filtroEstado !== 'all' ? 'en este estado' : 'aún') + '</div>';
      return;
    }
    list.innerHTML = filtrados.map(p => {
      const fecha = new Date(p.createdAt || Date.now()).toLocaleDateString('es', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
      const cant = (p.items || []).length;
      return '<div class="pedido-item" data-id="' + p.id + '">' +
        '<div class="pedido-item-left">' +
          '<div class="pedido-item-id">' + p.id + '</div>' +
          '<div class="pedido-item-nombre">' + (p.nombre || 'Sin nombre') + '</div>' +
          '<div class="pedido-item-meta">' + cant + ' producto' + (cant!==1?'s':'') + ' · ' + fecha + '</div>' +
          '<span class="pedido-estado-badge estado-' + (p.estado || 'pendiente_pago') + '">' + (ESTADO_LABEL[p.estado] || p.estado) + '</span>' +
        '</div>' +
        '<div class="pedido-item-total">$' + Number(p.total || 0).toFixed(2) + '</div>' +
      '</div>';
    }).join('');
  }

  function abrirPedido(id) {
    const p = pedidos.find(x => String(x.id) === String(id));
    if (!p) return;
    pedidoActivo = p;

    $id('pedidoModalTitle').textContent = '📦 ' + p.id;
    $id('pedidoEstado').value = p.estado || 'pendiente_pago';
    $id('pedidoAgencia').value = p.agencia || '';
    $id('pedidoTracking').value = p.tracking || '';
    $id('pedidoNota').value = '';
    $id('pedidoNotasInt').value = p.notasInternas || '';

    const productos = (p.items || []).map(it =>
      '<div class="pedido-producto-row">' +
        '<span class="pedido-producto-titulo">' + (it.title || 'Producto') + ' × ' + (it.qty || 1) + '</span>' +
        '<span class="pedido-producto-precio">$' + (Number(it.price || 0) * (it.qty || 1)).toFixed(2) + '</span>' +
      '</div>'
    ).join('') || '<div class="pedido-producto-row">Sin items</div>';

    const historial = (p.historial || []).map(h => {
      const f = new Date(h.fecha).toLocaleString('es', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
      return '<div class="pedido-hist-item"><b>' + (ESTADO_LABEL[h.estado] || h.estado) + '</b> · ' + f + (h.nota ? '<br>' + h.nota : '') + '</div>';
    }).join('') || '<div class="pedido-hist-item">Sin historial</div>';

    $id('pedidoModalBody').innerHTML =
      '<div class="pedido-cliente-row"><span class="pedido-cliente-label">Cliente</span><span class="pedido-cliente-value">' + (p.nombre || '-') + '</span></div>' +
      '<div class="pedido-cliente-row"><span class="pedido-cliente-label">WhatsApp</span><span class="pedido-cliente-value">' + (p.whatsapp || '-') + '</span></div>' +
      '<div class="pedido-cliente-row"><span class="pedido-cliente-label">Dirección</span><span class="pedido-cliente-value">' + (p.direccion || '-') + '</span></div>' +
      '<div class="pedido-cliente-row"><span class="pedido-cliente-label">Notas del cliente</span><span class="pedido-cliente-value">' + (p.notas || '-') + '</span></div>' +
      '<div class="pedido-cliente-row"><span class="pedido-cliente-label">Total</span><span class="pedido-cliente-value" style="color:#10b981">$' + Number(p.total||0).toFixed(2) + '</span></div>' +
      '<div class="pedido-productos"><div style="font-weight:700;margin-bottom:6px;color:#cbd5e1">Productos</div>' + productos + '</div>' +
      '<div class="pedido-historial"><div style="font-weight:700;margin-bottom:6px;color:#cbd5e1">Historial</div>' + historial + '</div>';

    actualizarWA(p);

    $id('pedidoModal').classList.remove('hidden');
  }

  function actualizarWA(p) {
    if (!p) return;
    const wa = (p.whatsapp || '').replace(/[^0-9]/g, '');
    const estado = $id('pedidoEstado')?.value || p.estado || 'pendiente_pago';
    // Leer tracking/agencia actuales del formulario (por si se cambió sin guardar)
    const pTmp = Object.assign({}, p, {
      tracking: ($id('pedidoTracking')?.value || '').trim() || p.tracking,
      agencia: ($id('pedidoAgencia')?.value || '').trim() || p.agencia
    });
    const msg = encodeURIComponent(armarMensaje(pTmp, estado));
    const link = $id('notificarWA');
    if (link) {
    if (wa && window.comdiaz_abrirWA) {
      // Usar helper: scheme nativo en APK, web en navegador
      link.removeAttribute('target');
      link.href = '#';
      link.onclick = (e) => { e.preventDefault(); window.comdiaz_abrirWA(wa, decodeURIComponent(msg)); };
    } else {
      link.href = wa ? ('https://wa.me/' + wa + '?text=' + msg) : '#';
    }
  }
  }

  async function avanzarNotificar() {
    if (!pedidoActivo) return;
    const actual = $id('pedidoEstado').value;
    const siguiente = SIGUIENTE_ESTADO[actual] || actual;

    // Actualizar el dropdown al nuevo estado
    $id('pedidoEstado').value = siguiente;

    // Guardar el cambio
    const body = {
      estado: siguiente,
      agencia: $id('pedidoAgencia').value.trim(),
      tracking: $id('pedidoTracking').value.trim(),
      notasInternas: $id('pedidoNotasInt').value.trim(),
      notaEstado: 'Avance automatico'
    };

    try {
      const r = await api('/api/orders/' + pedidoActivo.id, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      if (r.ok) {
        // Actualizar el pedido local
        pedidoActivo = Object.assign(pedidoActivo, body, { historial: r.order?.historial || pedidoActivo.historial });
        actualizarWA(pedidoActivo);
        // Abrir WhatsApp automaticamente
        const link = $id('notificarWA');
        if (link && link.href && link.href !== '#') {
          window.open(link.href, '_blank');
        }
        mostrarAviso('✅ Avanzado a: ' + (ESTADO_LABEL[siguiente] || siguiente), 'ok');
        await cargarPedidos();
        // Refrescar el modal
        setTimeout(() => abrirPedido(pedidoActivo.id), 500);
      } else {
        mostrarAviso('Error: ' + (r.error || ''), 'err');
      }
    } catch(e) {
      mostrarAviso('Error: ' + e.message, 'err');
    }
  }

  async function guardarPedido() {
    if (!pedidoActivo) return;
    const body = {
      estado: $id('pedidoEstado').value,
      agencia: $id('pedidoAgencia').value.trim(),
      tracking: $id('pedidoTracking').value.trim(),
      notasInternas: $id('pedidoNotasInt').value.trim(),
      notaEstado: $id('pedidoNota').value.trim()
    };

    // ─── OPTIMISTA: actualizar en memoria + render INSTANTANEO ───
    const idx = pedidos.findIndex(p => String(p.id) === String(pedidoActivo.id));
    const backup = idx !== -1 ? { ...pedidos[idx] } : null;
    if (idx !== -1) {
      pedidos[idx] = { ...pedidos[idx], ...body, actualizado: new Date().toISOString() };
      // Agregar al historial local
      if (body.estado && body.estado !== backup.estado) {
        pedidos[idx].historial = [...(pedidos[idx].historial || []), {
          estado: body.estado,
          fecha: new Date().toISOString(),
          nota: body.notaEstado || ''
        }];
      }
    }
    $id('pedidoModal').classList.add('hidden');
    renderContador();
    renderLista();
    if (typeof toast === 'function') toast('✅ Pedido actualizado', 'ok');

    // ─── Servidor en background (no bloquea UI) ───
    try {
      const r = await api('/api/orders/' + pedidoActivo.id, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        // Revertir si fallo
        if (idx !== -1 && backup) pedidos[idx] = backup;
        renderContador();
        renderLista();
        if (typeof toast === 'function') toast('Error: ' + (r.error || ''), 'err');
      }
    } catch(e) {
      if (idx !== -1 && backup) pedidos[idx] = backup;
      renderContador();
      renderLista();
      if (typeof toast === 'function') toast('Error: ' + e.message, 'err');
    }
  }

  // Listeners
  document.addEventListener('click', (e) => {
    const item = e.target.closest('.pedido-item');
    if (item) { abrirPedido(item.dataset.id); return; }

    const filtBtn = e.target.closest('#pedidosFilters .filter-btn');
    if (filtBtn) {
      document.querySelectorAll('#pedidosFilters .filter-btn').forEach(b => b.classList.remove('active'));
      filtBtn.classList.add('active');
      filtroEstado = filtBtn.dataset.estado || 'all';
      renderLista();
      return;
    }
  });

  // Listeners en MODO CAPTURA (se ejecutan ANTES que cualquier otro listener)
  document.addEventListener('click', (e) => {
    if (e.target.closest('#closePedidoModal')) {
      const m = $id('pedidoModal');
      if (m) m.classList.add('hidden');
      e.stopPropagation();
      return;
    }
    if (e.target.closest('#guardarPedido')) {
      e.preventDefault();
      e.stopPropagation();
      guardarPedido();
      return;
    }
    if (e.target.closest('#avanzarNotificar')) {
      e.preventDefault();
      e.stopPropagation();
      avanzarNotificar();
      return;
    }
    if (e.target.closest('#eliminarPedido')) {
      e.preventDefault();
      e.stopPropagation();
      if (!pedidoActivo) return;
      if (!confirm('¿Eliminar el pedido ' + pedidoActivo.id + '? Esta acción no se puede deshacer.')) return;

      // ─── OPTIMISTA: quitar del array local + render INSTANTANEO ───
      const idEliminar = pedidoActivo.id;
      const backup = pedidos.find(p => String(p.id) === String(idEliminar));
      const backupIdx = pedidos.findIndex(p => String(p.id) === String(idEliminar));
      pedidos = pedidos.filter(p => String(p.id) !== String(idEliminar));
      $id('pedidoModal').classList.add('hidden');
      pedidoActivo = null;
      renderContador();
      renderLista();
      mostrarAviso('✅ Pedido eliminado', 'ok');

      // ─── Servidor en background (no bloquea UI) ───
      (async () => {
        try {
          const r = await api('/api/orders/' + idEliminar + '/delete', { method: 'POST' });
          if (!r.ok) {
            // Revertir si fallo
            if (backup) pedidos.splice(backupIdx, 0, backup);
            renderContador();
            renderLista();
            mostrarAviso('Error: ' + (r.error || ''), 'err');
          }
        } catch(err) {
          if (backup) pedidos.splice(backupIdx, 0, backup);
          renderContador();
          renderLista();
          mostrarAviso('Error: ' + err.message, 'err');
        }
      })();
      return;
    }
    if (e.target.closest('#refreshPedidos')) {
      e.preventDefault();
      e.stopPropagation();
      cargarPedidos();
      return;
    }
  }, true);

  // Cerrar modal al tocar fuera
  document.addEventListener('click', (e) => {
    const m = $id('pedidoModal');
    if (m && e.target === m) m.classList.add('hidden');
  }, true);

  // Actualizar href de WhatsApp cuando cambie el estado en el dropdown
  document.addEventListener('change', (e) => {
    if (e.target.id === 'pedidoEstado' && pedidoActivo) {
      actualizarWA(pedidoActivo);
    }
  });

  // Arranque
  setTimeout(cargarPedidos, 2000);
  setInterval(cargarPedidos, 30000);

  console.log('✅ Panel de pedidos activo');
})();


/* ═══════════════════════════════════════════════
   IMPORT HUB — Panel multi-fuente
   ═══════════════════════════════════════════════ */
(function comdiaz_import_hub_v1(){
  const $id = id => document.getElementById(id);
  let currentSource = 'temu';
  let currentResults = [];

  async function apiCall(path, opts) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {});
    const r = await fetch(API + path, Object.assign({}, opts, { headers }));
    return r.json();
  }

  async function buscar() {
    const keyword = ($id('importKeyword')?.value || '').trim();
    const limit = Number($id('importLimit')?.value) || 20;
    if (!keyword) {
      if (typeof toast === 'function') toast('Escribe que buscar', 'err');
      return;
    }
    const box = $id('importResults');
    const btn = $id('importSearchBtn');
    if (btn) btn.disabled = true;
    if (btn) btn.textContent = '⏳ Buscando...';
    if (box) box.innerHTML = '<div class="act-empty">Buscando en ' + currentSource + '… (60-90 seg)</div>';

    try {
      const r = await apiCall('/api/import/search', {
        method: 'POST',
        body: JSON.stringify({ source: currentSource, keyword, maxResults: limit })
      });
      if (r.ok) {
        currentResults = r.products || [];
        renderResults();
        if (typeof toast === 'function') toast('✅ ' + r.total + ' productos', 'ok');
      } else {
        if (box) box.innerHTML = '<div class="act-empty">Error: ' + (r.error || '') + '</div>';
      }
    } catch(e) {
      if (box) box.innerHTML = '<div class="act-empty">Error: ' + e.message + '</div>';
    }
    if (btn) btn.disabled = false;
    if (btn) btn.textContent = '🔍 Buscar';
  }

  function renderResults() {
    const box = $id('importResults');
    if (!box) return;
    if (!currentResults.length) {
      box.innerHTML = '<div class="act-empty">Sin resultados</div>';
      return;
    }
    box.innerHTML = currentResults.map((p, i) => `
      <div class="import-product">
        <img class="import-product-img" src="${p.image || ''}" loading="lazy" onerror="this.style.opacity=.3">
        <div class="import-product-info">
          <div class="import-product-title">${(p.title || 'Producto').replace(/</g,'&lt;')}</div>
          <div class="import-product-price">$${Number(p.priceBase || 0).toFixed(2)}</div>
        </div>
        <div class="import-product-actions">
          <button class="import-add-btn" data-index="${i}">➕ Importar</button>
        </div>
      </div>
    `).join('');
  }

  async function importarProducto(index) {
    const p = currentResults[index];
    if (!p) return;
    const margin = Number($id('importMargin-' + currentSource)?.value) || 40;
    const btn = document.querySelector(`.import-add-btn[data-index="${index}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

    try {
      const r = await apiCall('/api/manual/products', {
        method: 'POST',
        body: JSON.stringify({
          title: p.title,
          image: p.image,
          images: p.images || [p.image],
          category: p.category || 'Importado',
          priceBase: p.priceBase,
          margenPct: margin,
          cantidad: 1,
          publicado: true,
          source: p.source,
          sourceUrl: p.url
        })
      });
      if (r.ok) {
        if (typeof toast === 'function') toast('✅ Importado: $' + (r.product?.salePrice || 0), 'ok');
        if (btn) { btn.textContent = '✔️'; }
      } else {
        if (typeof toast === 'function') toast('Error: ' + (r.error || ''), 'err');
        if (btn) { btn.disabled = false; btn.textContent = '➕ Importar'; }
      }
    } catch(e) {
      if (typeof toast === 'function') toast('Error: ' + e.message, 'err');
      if (btn) { btn.disabled = false; btn.textContent = '➕ Importar'; }
    }
  }

  let todasLasCategorias = [];

  async function cargarCategorias() {
    try {
      const r = await apiCall('/api/state');
      todasLasCategorias = (r.categories || []).map(c => ({
        label: c.label,
        queries: c.dummyjson || []
      }));
      renderCategorias();
    } catch(e) {
      const box = $id('importCategoryList');
      if (box) box.innerHTML = '<div class="act-empty">Error cargando categorías</div>';
    }
  }

  function renderCategorias(seleccionadas) {
    const box = $id('importCategoryList');
    if (!box) return;
    const sel = seleccionadas || [];
    box.innerHTML = todasLasCategorias.map((c, i) => {
      const marcada = sel.length === 0 ? (c.queries.length > 0) : sel.includes(c.label);
      const sinQueries = c.queries.length === 0;
      return '<label class="import-cat-item' + (marcada ? ' checked' : '') + (sinQueries ? ' no-queries' : '') + '">' +
        '<input type="checkbox" data-cat="' + c.label.replace(/"/g, '&quot;') + '"' + (marcada ? ' checked' : '') + (sinQueries ? ' disabled' : '') + '>' +
        '<span>' + c.label + (sinQueries ? ' (sin queries)' : '') + '</span>' +
      '</label>';
    }).join('');
    actualizarPreview();
  }

  function getCategoriasSeleccionadas() {
    const boxes = document.querySelectorAll('#importCategoryList input[type=checkbox]:checked');
    return Array.from(boxes).map(b => b.dataset.cat);
  }

  function getFuentesActivas() {
    return ['temu','amazon','walmart'].filter(s => $id('importSrc-' + s)?.checked);
  }

  function actualizarPreview() {
    const cats = getCategoriasSeleccionadas();
    const fuentes = getFuentesActivas();
    const limit = Number($id('importLimitPerCat')?.value) || 5;
    // Contar queries
    let totalQueries = 0;
    cats.forEach(cat => {
      const c = todasLasCategorias.find(x => x.label === cat);
      if (c) totalQueries += c.queries.length;
    });
    const total = totalQueries * fuentes.length * limit;
    const p = $id('importPreview');
    if (p) {
      p.textContent = cats.length + ' categorías × ' + fuentes.length + ' fuentes × ' + limit + ' = ~' + total + ' productos';
    }
  }

  async function cargarConfig() {
    try {
      await cargarCategorias();
      const r = await apiCall('/api/import/config');
      const cfg = r.config?.autoImport || {};
      const enabled = $id('importAutoEnabled');
      if (enabled) enabled.checked = !!cfg.enabled;
      const lim = $id('importLimitPerCat');
      if (lim) lim.value = cfg.limitPerCategory || 5;
      const mar = $id('importGlobalMargin');
      if (mar) mar.value = cfg.margin || 40;
      ['temu','amazon','walmart'].forEach(src => {
        const srcCfg = (cfg.sources || {})[src] || {};
        const chk = $id('importSrc-' + src);
        if (chk) chk.checked = !!srcCfg.enabled;
      });
      renderCategorias(cfg.categories || []);
    } catch(e) {}
  }

  async function guardarConfig() {
    const autoImport = {
      enabled: !!$id('importAutoEnabled')?.checked,
      limitPerCategory: Number($id('importLimitPerCat')?.value) || 5,
      margin: Number($id('importGlobalMargin')?.value) || 40,
      categories: getCategoriasSeleccionadas(),
      sources: {}
    };
    ['temu','amazon','walmart'].forEach(src => {
      autoImport.sources[src] = { enabled: !!$id('importSrc-' + src)?.checked };
    });
    try {
      const r = await apiCall('/api/import/config', { method: 'POST', body: JSON.stringify({ autoImport }) });
      if (r.ok) {
        if (typeof toast === 'function') toast('✅ Config guardada', 'ok');
      }
    } catch(e) {
      if (typeof toast === 'function') toast('Error: ' + e.message, 'err');
    }
  }

  async function ejecutarAhora() {
    // Ejecuta import de las categorías seleccionadas
    const categorias = getCategoriasSeleccionadas();
    const fuentes = getFuentesActivas();
    const limit = Number($id('importLimitPerCat')?.value) || 5;
    const margin = Number($id('importGlobalMargin')?.value) || 40;

    if (!categorias.length) {
      if (typeof toast === 'function') toast('Selecciona al menos una categoría', 'err');
      return;
    }
    if (!fuentes.length) {
      if (typeof toast === 'function') toast('Selecciona al menos una fuente', 'err');
      return;
    }

    // Construir keywords desde las categorías seleccionadas
    const keywordsSet = new Set();
    categorias.forEach(cat => {
      const c = todasLasCategorias.find(x => x.label === cat);
      if (c) c.queries.forEach(q => keywordsSet.add(q));
    });
    const keywords = Array.from(keywordsSet);

    if (!keywords.length) {
      if (typeof toast === 'function') toast('Las categorías no tienen queries', 'err');
      return;
    }

    const total = keywords.length * fuentes.length * limit;
    if (typeof toast === 'function') toast('⏳ Importando ~' + total + ' productos...', 'ok');

    // Ejecutar por fuente (en serie para no saturar Apify)
    let totalImportados = 0;
    for (const src of fuentes) {
      try {
        const r = await apiCall('/api/import/run-now', {
          method: 'POST',
          body: JSON.stringify({ source: src, keywords, limit, margin })
        });
        if (r.ok) totalImportados += (r.imported || 0);
      } catch(e) {
        console.error('[IMPORT] Error en ' + src + ':', e.message);
      }
    }

    if (typeof toast === 'function') toast('✅ Importados: ' + totalImportados, 'ok');
  }

  // Listeners
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('#importTabs .filter-btn');
    if (tab) {
      document.querySelectorAll('#importTabs .filter-btn').forEach(b => b.classList.remove('active'));
      tab.classList.add('active');
      currentSource = tab.dataset.source || 'temu';
      currentResults = [];
      const box = $id('importResults');
      if (box) box.innerHTML = '<div class="act-empty">Busca productos en ' + currentSource + '</div>';
      return;
    }

    if (e.target.closest('#importSearchBtn')) {
      e.preventDefault();
      buscar();
      return;
    }

    if (e.target.closest('#importHubRefresh')) {
      e.preventDefault();
      cargarConfig();
      return;
    }

    if (e.target.closest('#importSelectAll')) {
      e.preventDefault();
      document.querySelectorAll('#importCategoryList input[type=checkbox]:not(:disabled)').forEach(b => {
        b.checked = true;
        b.closest('.import-cat-item')?.classList.add('checked');
      });
      actualizarPreview();
      return;
    }

    if (e.target.closest('#importSelectNone')) {
      e.preventDefault();
      document.querySelectorAll('#importCategoryList input[type=checkbox]').forEach(b => {
        b.checked = false;
        b.closest('.import-cat-item')?.classList.remove('checked');
      });
      actualizarPreview();
      return;
    }

    const catBox = e.target.closest('#importCategoryList input[type=checkbox]');
    if (catBox) {
      setTimeout(() => {
        catBox.closest('.import-cat-item')?.classList.toggle('checked', catBox.checked);
        actualizarPreview();
      }, 0);
    }

    if (e.target.closest('#importSaveConfig')) {
      e.preventDefault();
      guardarConfig();
      return;
    }

    if (e.target.closest('#importRunNow')) {
      e.preventDefault();
      ejecutarAhora();
      return;
    }

    const addBtn = e.target.closest('.import-add-btn');
    if (addBtn) {
      e.preventDefault();
      importarProducto(Number(addBtn.dataset.index));
      return;
    }
  }, true);

  // Actualizar preview al cambiar inputs
  ['importLimitPerCat','importSrc-temu','importSrc-amazon','importSrc-walmart'].forEach(id => {
    const el = $id(id);
    if (el) el.addEventListener('change', actualizarPreview);
  });

  // Cargar config al arrancar
  setTimeout(cargarConfig, 2000);

  window.comdiaz_import = { buscar, guardarConfig, ejecutarAhora };
  console.log('✅ Import Hub listo');
})();


/* ═══════════════════════════════════════════════
   NAVEGACIÓN POR VISTAS (Rediseño moderno)
   ═══════════════════════════════════════════════ */
(function comdiaz_navigation_v1(){
  const VIEWS = ['home', 'productos', 'locales', 'vendedores', 'import', 'pedidos', 'analisis'];
  const STORAGE_KEY = 'comdiaz_active_view';

  function cambiarVista(view) {
    if (!VIEWS.includes(view)) view = 'home';

    // Actualizar el body
    document.body.setAttribute('data-active-view', view);

    // Actualizar botones del nav
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Guardar en localStorage
    try { localStorage.setItem(STORAGE_KEY, view); } catch(e) {}

    // Scroll al top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Listener del nav
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item');
    if (btn) {
      e.preventDefault();
      cambiarVista(btn.dataset.view);
      return;
    }
    // Cuando se abre una card, scroll suave para que se vea completa
    const cardHead = e.target.closest('.card-head');
    if (cardHead) {
      const card = cardHead.closest('section[data-view]');
      if (card) {
        setTimeout(() => {
          const rect = card.getBoundingClientRect();
          // Si la card empieza muy arriba o muy abajo, ajustar
          if (rect.top < 60) {
            window.scrollTo({ top: card.offsetTop - 70, behavior: 'smooth' });
          }
        }, 200);
      }
    }
  }, true);

  // Restaurar última vista al arrancar
  function init() {
    let viewInicial = 'home';
    try {
      const guardada = localStorage.getItem(STORAGE_KEY);
      if (guardada && VIEWS.includes(guardada)) viewInicial = guardada;
    } catch(e) {}
    cambiarVista(viewInicial);
    console.log('✅ Navegación por vistas lista (' + viewInicial + ')');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }
})();


/* ═══════════════════════════════════════════════
   TESORERIA — Panel admin
   ═══════════════════════════════════════════════ */
(function comdiaz_tesoreria_v1(){
  const $id = id => document.getElementById(id);
  let periodoActual = 'hoy';
  let movimientos = [];

  async function apiCall(path, opts) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {});
    const r = await fetch(API + path, Object.assign({}, opts, { headers }));
    return r.json();
  }

  async function cargarStats() {
    try {
      const r = await apiCall('/api/tesoreria/stats');
      if (!r.ok) return;
      const p = r[periodoActual] || r.hoy;
      const ing = $id('tesIngresos');
      const egr = $id('tesEgresos');
      const gan = $id('tesGanancia');
      const movs = $id('tesTotalMovs');
      const badge = $id('tesoreriaBalanceBadge');
      if (ing) ing.textContent = '$' + Number(p.ingresos || 0).toFixed(2);
      if (egr) egr.textContent = '$' + Number(p.egresos || 0).toFixed(2);
      if (gan) gan.textContent = '$' + Number(p.ganancia || 0).toFixed(2);
      if (movs) movs.textContent = p.movimientos || 0;
      if (badge) {
        badge.textContent = '$' + Number(r.balance || 0).toFixed(2);
        if (r.balance > 0) badge.style.background = 'linear-gradient(135deg,#10b981,#059669)';
        else if (r.balance < 0) badge.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
        else badge.style.background = 'linear-gradient(135deg,#64748b,#475569)';
      }
    } catch(e) {}
  }

  async function cargarMovimientos() {
    const box = $id('tesoreriaLista');
    if (!box) return;
    try {
      const r = await apiCall('/api/tesoreria/movimientos');
      movimientos = r.movimientos || [];
      renderMovimientos();
    } catch(e) {
      box.innerHTML = '<div class="act-empty">Error: ' + e.message + '</div>';
    }
  }

  function renderMovimientos() {
    const box = $id('tesoreriaLista');
    if (!box) return;
    if (!movimientos.length) {
      box.innerHTML = '<div class="act-empty">Sin movimientos</div>';
      return;
    }
    box.innerHTML = movimientos.slice(0, 50).map(m => {
      const esIng = m.tipo === 'ingreso';
      const fecha = new Date(m.fecha || m.createdAt).toLocaleDateString('es', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
      const icon = esIng ? '+' : '−';
      const desc = (m.descripcion || '').replace(/</g,'&lt;').slice(0, 60) || (m.categoria || 'Movimiento');
      return '<div class="mov-item mov-' + m.tipo + '" data-id="' + m.id + '">' +
        '<div class="mov-icon">' + icon + '</div>' +
        '<div class="mov-info">' +
          '<div class="mov-desc">' + desc + '</div>' +
          '<div class="mov-fecha">' + fecha + ' · ' + (m.categoria || 'otro') + '</div>' +
        '</div>' +
        '<div class="mov-monto">' + (esIng ? '+' : '−') + '$' + Number(m.monto || 0).toFixed(2) + '</div>' +
        '<button class="mov-del" data-del="' + m.id + '" title="Eliminar">✕</button>' +
      '</div>';
    }).join('');
  }

  async function crearMovimiento() {
    const tipo = $id('tesTipo')?.value;
    const categoria = $id('tesCategoria')?.value;
    const monto = Number($id('tesMonto')?.value);
    const descripcion = ($id('tesDescripcion')?.value || '').trim();
    const fechaInput = $id('tesFecha')?.value;

    if (!monto || monto <= 0) {
      if (typeof toast === 'function') toast('Ingresa un monto válido', 'err');
      return;
    }

    const body = { tipo, categoria, monto, descripcion };
    if (fechaInput) body.fecha = new Date(fechaInput + 'T12:00:00').toISOString();

    try {
      const r = await apiCall('/api/tesoreria/movimientos', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      if (r.ok) {
        if (typeof toast === 'function') toast('✅ Movimiento guardado', 'ok');
        $id('tesoreriaModal').classList.add('hidden');
        await cargarStats();
        await cargarMovimientos();
      } else {
        if (typeof toast === 'function') toast('Error: ' + (r.error || ''), 'err');
      }
    } catch(e) {
      if (typeof toast === 'function') toast('Error: ' + e.message, 'err');
    }
  }

  async function eliminarMovimiento(id) {
    if (!confirm('¿Eliminar el movimiento ' + id + '?')) return;
    const idx = movimientos.findIndex(m => m.id === id);
    const backup = idx !== -1 ? movimientos[idx] : null;
    if (idx !== -1) movimientos.splice(idx, 1);
    renderMovimientos();
    try {
      const r = await apiCall('/api/tesoreria/movimientos/' + id, { method: 'DELETE' });
      if (!r.ok && backup) {
        movimientos.splice(idx, 0, backup);
        renderMovimientos();
        if (typeof toast === 'function') toast('Error: ' + (r.error || ''), 'err');
      } else {
        if (typeof toast === 'function') toast('✅ Movimiento eliminado', 'ok');
        await cargarStats();
      }
    } catch(e) {
      if (backup) {
        movimientos.splice(idx, 0, backup);
        renderMovimientos();
      }
      if (typeof toast === 'function') toast('Error: ' + e.message, 'err');
    }
  }

  async function descargarPDF() {
    if (typeof toast === 'function') toast('⏳ Generando PDF…', 'ok');
    try {
      const r = await apiCall('/api/tesoreria/stats');
      if (!r.ok) throw new Error('Error stats');
      const movs = await apiCall('/api/tesoreria/movimientos');
      generarPDFLocal(r, movs.movimientos || []);
    } catch(e) {
      if (typeof toast === 'function') toast('Error: ' + e.message, 'err');
    }
  }

  function generarPDFLocal(stats, movs) {
    // Generar un HTML simple y abrirlo en nueva ventana para imprimir
    const hoy = new Date().toLocaleDateString('es');
    const filas = movs.slice(0, 200).map(m => {
      const fecha = new Date(m.fecha || m.createdAt).toLocaleDateString('es');
      return '<tr>' +
        '<td>' + fecha + '</td>' +
        '<td>' + (m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso') + '</td>' +
        '<td>' + (m.categoria || '') + '</td>' +
        '<td>' + (m.descripcion || '').replace(/</g,'&lt;').slice(0,80) + '</td>' +
        '<td style="text-align:right">' + (m.tipo === 'ingreso' ? '+' : '−') + '$' + Number(m.monto || 0).toFixed(2) + '</td>' +
      '</tr>';
    }).join('');

    const html = '<!doctype html><html><head><meta charset="utf-8"><title>Tesorería Comdiaz - ' + hoy + '</title>' +
      '<style>body{font-family:Arial,sans-serif;padding:20px;color:#333}h1{color:#7c3aed}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:8px;border-bottom:1px solid #ddd;font-size:12px}th{background:#7c3aed;color:#fff;text-align:left}.stats{display:flex;gap:20px;margin:20px 0}.stat{background:#f5f5f5;padding:15px;border-radius:8px;flex:1}.stat-label{color:#666;font-size:11px;text-transform:uppercase}.stat-value{font-size:22px;font-weight:800;color:#7c3aed;margin-top:5px}.total-row{background:#f0f0f0;font-weight:800}</style></head><body>' +
      '<h1>Comdiaz Shop - Tesorería</h1>' +
      '<p>Generado: ' + hoy + '</p>' +
      '<div class="stats">' +
        '<div class="stat"><div class="stat-label">Balance Total</div><div class="stat-value">$' + stats.balance.toFixed(2) + '</div></div>' +
        '<div class="stat"><div class="stat-label">Ingresos (Total)</div><div class="stat-value" style="color:#10b981">$' + stats.total.ingresos.toFixed(2) + '</div></div>' +
        '<div class="stat"><div class="stat-label">Egresos (Total)</div><div class="stat-value" style="color:#ef4444">$' + stats.total.egresos.toFixed(2) + '</div></div>' +
        '<div class="stat"><div class="stat-label">Ganancia</div><div class="stat-value" style="color:#7c3aed">$' + stats.total.ganancia.toFixed(2) + '</div></div>' +
      '</div>' +
      '<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th style="text-align:right">Monto</th></tr></thead><tbody>' +
      filas + '</tbody></table>' +
      '</body></html>';

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    } else {
      if (typeof toast === 'function') toast('Permite ventanas emergentes para el PDF', 'err');
    }
  }

  // Listeners
  document.addEventListener('click', (e) => {
    if (e.target.closest('#refreshTesoreria')) {
      e.preventDefault();
      cargarStats();
      cargarMovimientos();
      return;
    }

    const filtro = e.target.closest('#tesoreriaPeriodos .filter-btn');
    if (filtro) {
      e.preventDefault();
      e.stopPropagation();
      // Quitar active + blur de todos
      document.querySelectorAll('#tesoreriaPeriodos .filter-btn').forEach(b => {
        b.classList.remove('active');
        b.blur();
      });
      // Poner active solo al clickado
      filtro.classList.add('active');
      periodoActual = filtro.dataset.periodo || 'hoy';
      cargarStats();
      return;
    }

    if (e.target.closest('#nuevoMovimientoBtn')) {
      e.preventDefault();
      const f = $id('tesFecha');
      if (f) f.value = new Date().toISOString().slice(0, 10);
      $id('tesMonto').value = '';
      $id('tesDescripcion').value = '';
      $id('tesoreriaModal').classList.remove('hidden');
      return;
    }

    if (e.target.closest('#closeTesoreriaModal')) {
      $id('tesoreriaModal').classList.add('hidden');
      return;
    }

    if (e.target.closest('#guardarMovimiento')) {
      e.preventDefault();
      crearMovimiento();
      return;
    }

    if (e.target.closest('#descargarPDFBtn')) {
      e.preventDefault();
      descargarPDF();
      return;
    }

    const del = e.target.closest('[data-del]');
    if (del) {
      e.preventDefault();
      eliminarMovimiento(del.dataset.del);
      return;
    }
  }, true);

  // Arranque
  setTimeout(() => {
    cargarStats();
    cargarMovimientos();
  }, 2500);

  console.log('✅ Tesorería lista');
})();


/* ═══════════════════════════════════════════════
   PROMOCIONES ROTATIVAS - Panel admin
   ═══════════════════════════════════════════════ */
(function comdiaz_promos_panel_v1(){
  const $id = id => document.getElementById(id);

  const EMOJIS = [
    { k: 'truck', v: '🚚' },
    { k: 'gift', v: '🎁' },
    { k: 'star', v: '⭐' },
    { k: 'fire', v: '🔥' },
    { k: 'money', v: '💰' },
    { k: 'cart', v: '🛒' },
    { k: 'bell', v: '🔔' },
    { k: 'sparkles', v: '✨' },
    { k: 'whatsapp', v: '💬' },
    { k: 'clock', v: '⏰' },
    { k: 'rocket', v: '🚀' }
  ];

  const COLORES = ['gradient', 'green', 'orange', 'red', 'blue', 'dark'];

  let promos = [];

  async function apiCall(path, opts) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {});
    const r = await fetch(API + path, Object.assign({}, opts, { headers }));
    return r.json();
  }

  function render() {
    const box = $id('promocionesList');
    if (!box) return;
    if (!promos.length) {
      box.innerHTML = '<div class="act-empty">Sin promociones. Añade una.</div>';
      return;
    }
    box.innerHTML = promos.map((p, i) => {
      const emojiOpts = EMOJIS.map(e =>
        '<option value="' + e.k + '"' + (p.emoji === e.k ? ' selected' : '') + '>' + e.v + '</option>'
      ).join('');
      const colorOpts = COLORES.map(c =>
        '<option value="' + c + '"' + ((p.color || 'gradient') === c ? ' selected' : '') + '>' + c + '</option>'
      ).join('');
      return '<div class="promo-item' + (p.activo === false ? ' inactivo' : '') + '" data-i="' + i + '">' +
        '<select class="promo-emoji-sel" data-emoji="' + i + '">' + emojiOpts + '</select>' +
        '<input type="text" class="pedido-input promo-texto-inp" data-texto="' + i + '" value="' + String(p.texto || '').replace(/"/g, '&quot;') + '" maxlength="80">' +
        '<select class="promo-color-sel" data-color="' + i + '">' + colorOpts + '</select>' +
        '<input type="checkbox" class="promo-check" data-activo="' + i + '"' + (p.activo !== false ? ' checked' : '') + ' title="Activo">' +
        '<button class="promo-del" data-del="' + i + '" title="Eliminar">🗑️</button>' +
      '</div>';
    }).join('');
  }

  async function cargar() {
    try {
      const r = await apiCall('/api/import/config');
      // Cargar desde state (shopConfig)
      const s = await apiCall('/api/state');
      const cfg = s.shopConfig || {};
      promos = Array.isArray(cfg.promociones) ? JSON.parse(JSON.stringify(cfg.promociones)) : [];
      const rot = $id('shopRotacionSeg');
      if (rot) rot.value = cfg.rotacionSeg || 5;
      render();
    } catch(e) {}
  }

  async function guardar() {
    // Recolectar del DOM (por si el usuario editó sin eventos)
    const items = document.querySelectorAll('.promo-item');
    const nuevas = [];
    items.forEach((it, i) => {
      const emoji = it.querySelector('[data-emoji]')?.value || 'star';
      const texto = it.querySelector('[data-texto]')?.value?.trim() || '';
      const color = it.querySelector('[data-color]')?.value || 'gradient';
      const activo = it.querySelector('[data-activo]')?.checked !== false;
      if (texto) nuevas.push({ id: 'p' + (i+1) + '-' + Date.now(), emoji, texto, color, activo });
    });
    const rotacionSeg = Number($id('shopRotacionSeg')?.value) || 5;

    try {
      const r = await apiCall('/api/shop-config', {
        method: 'POST',
        body: JSON.stringify({ promociones: nuevas, rotacionSeg })
      });
      if (r.ok) {
        promos = nuevas;
        if (typeof toast === 'function') toast('✅ Promociones guardadas', 'ok');
      } else {
        if (typeof toast === 'function') toast('Error: ' + (r.error || ''), 'err');
      }
    } catch(e) {
      if (typeof toast === 'function') toast('Error: ' + e.message, 'err');
    }
  }

  function addPromo() {
    promos.push({ id: 'p' + Date.now(), emoji: 'star', texto: 'Nueva promoción', color: 'gradient', activo: true });
    render();
  }

  function delPromo(i) {
    promos.splice(i, 1);
    render();
  }

  // Listeners
  document.addEventListener('click', (e) => {
    if (e.target.closest('#addPromoBtn')) {
      e.preventDefault();
      addPromo();
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      e.preventDefault();
      delPromo(Number(del.dataset.del));
      return;
    }
    // Guardar (reutilizar el botón existente de guardar config)
    if (e.target.closest('#guardarConfigShop')) {
      // El handler original corre, pero forzamos también guardar promos
      setTimeout(guardar, 100);
      return;
    }
  }, true);

  // Inputs: cambios en emoji/texto/color/activo se guardan al tocar Guardar
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-activo]')) {
      const i = Number(t.dataset.activo);
      if (promos[i]) promos[i].activo = t.checked;
      render();
    }
  }, true);

  setTimeout(cargar, 2500);
  console.log('✅ Panel de promociones listo');
})();


/* ═══════════════════════════════════════════════
   DASHBOARD ESTADISTICAS SHOP
   ═══════════════════════════════════════════════ */
(function comdiaz_dashboard_v1(){
  const $id = id => document.getElementById(id);

  async function apiCall(path, opts) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {});
    const r = await fetch(API + path, Object.assign({}, opts, { headers }));
    return r.json();
  }

  async function cargar() {
    try {
      const d = await apiCall('/api/stats/dashboard');
      if (!d.ok) return;

      // Dispositivos
      $id('dashApps').textContent = d.dispositivos.appsInstaladas || 0;
      $id('dashActivos7d').textContent = d.dispositivos.activos7d || 0;
      $id('dashWeb').textContent = d.dispositivos.web || 0;
      $id('dashPedidos').textContent = d.pedidos.total || 0;

      const badge = $id('dashboardBadge');
      if (badge) {
        badge.textContent = (d.dispositivos.total || 0) + ' disp · ' + (d.pedidos.total || 0) + ' ped';
      }

      // Conversión
      const conv = Number(d.pedidos.tasaConversion) || 0;
      $id('dashConversion').textContent = conv.toFixed(2) + '%';
      const bar = $id('dashConvBar');
      if (bar) bar.style.width = Math.min(conv * 5, 100) + '%';

      // Visitas
      $id('dashVisitasHoy').textContent = d.visitas.hoy || 0;
      $id('dashVisitas7d').textContent = d.visitas.ultimos7d || 0;
      $id('dashVisitas30d').textContent = d.visitas.ultimos30d || 0;
      $id('dashVisitasTotal').textContent = d.visitas.total || 0;

      // Top productos
      const topBox = $id('dashTopProductos');
      if (topBox) {
        if (!d.topProductos.length) {
          topBox.innerHTML = '<div class="act-empty">Sin datos aún</div>';
        } else {
          topBox.innerHTML = d.topProductos.map((p, i) => 
            '<div class="dash-item">' +
              '<span style="color:#a78bfa;font-weight:800">#' + (i+1) + '</span>' +
              '<span class="dash-item-titulo">' + (p.title || p.id).replace(/</g, '&lt;').slice(0, 50) + '</span>' +
              '<span class="dash-item-count">' + p.count + '</span>' +
            '</div>'
          ).join('');
        }
      }

      // Referidos
      const refBox = $id('dashReferidos');
      if (refBox) {
        if (!d.referidos.length) {
          refBox.innerHTML = '<div class="act-empty">Sin datos. Comparte links con ?ref=grupo1</div>';
        } else {
          refBox.innerHTML = d.referidos.map(r =>
            '<div class="dash-item">' +
              '<span class="dash-item-ref">' + r.ref + '</span>' +
              '<span class="dash-item-titulo">' + (r.pedidos || 0) + ' pedidos</span>' +
              '<span class="dash-item-count">' + r.visitas + ' visitas</span>' +
            '</div>'
          ).join('');
        }
      }

    } catch(e) {
      console.error('Error dashboard:', e);
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#refreshDashboard')) {
      e.preventDefault();
      cargar();
      return;
    }
  }, true);

  setTimeout(cargar, 2500);
  setInterval(cargar, 60000); // cada minuto
  console.log('✅ Dashboard listo');
})();


/* ═══════════════════════════════════════════════
   GENERADOR DE PUBLICACIONES
   ═══════════════════════════════════════════════ */
(function comdiaz_posts_v1(){
  const $id = id => document.getElementById(id);
  let ultimoTexto = '';

  async function apiCall(path, opts) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {});
    const r = await fetch(API + path, Object.assign({}, opts, { headers }));
    return r.json();
  }

  async function generar(tipo) {
    const ref = ($id('postsRef')?.value || '').trim() || 'directo';
    const preview = $id('postsPreview');
    const texto = $id('postsTexto');
    const tipoLbl = $id('postsPreviewTipo');
    if (!preview || !texto) return;

    preview.classList.remove('hidden');
    texto.value = '⏳ Generando...';

    try {
      // Intentar con IA primero, fallback a plantillas
      let r = null;
      let usóIA = false;

      try {
        texto.value = '⏳ Generando con IA...';
        if (tipoLbl) tipoLbl.textContent = '🧠 Gemini trabajando...';
        r = await apiCall('/api/posts/generate-ai', {
          method: 'POST',
          body: JSON.stringify({ tipo, ref })
        });
        if (r.ok) usóIA = true;
      } catch(_) {
        r = null;
      }

      // Fallback a plantillas si IA falló
      if (!r || !r.ok) {
        if (typeof toast === 'function') toast('⚠️ IA no disponible, usando plantilla', 'ok');
        texto.value = '⏳ Generando plantilla...';
        if (tipoLbl) tipoLbl.textContent = '📝 Generando (sin IA)...';
        try {
          r = await apiCall('/api/posts/generate', {
            method: 'POST',
            body: JSON.stringify({ tipo, ref })
          });
        } catch(e) {
          r = null;
        }
      }

      if (r && r.ok) {
        ultimoTexto = r.texto || '';
        texto.value = ultimoTexto;
        const prefix = usóIA ? '🧠 IA · ' : '📝 Plantilla · ';
        if (tipoLbl) {
          tipoLbl.textContent = '✅ ' + prefix + (r.titulo || tipo) + ' · ref: ' + ref;
          tipoLbl.style.color = usóIA ? '#10b981' : '#fbbf24';
        }
        if (typeof toast === 'function') {
          toast(usóIA ? '✅ Publicación con IA generada' : '✅ Publicación con plantilla', 'ok');
        }
      } else {
        texto.value = 'Error: ' + ((r && r.error) || 'IA y plantilla fallaron');
        if (tipoLbl) tipoLbl.textContent = '❌ Error';
      }
    } catch(e) {
      texto.value = 'Error: ' + e.message;
    }
  }

  async function copiarTexto() {
    const t = $id('postsTexto');
    if (!t || !t.value) return;
    try {
      await navigator.clipboard.writeText(t.value);
      if (typeof toast === 'function') toast('✅ Copiado al portapapeles', 'ok');
    } catch(e) {
      // Fallback: seleccionar
      t.select();
      document.execCommand('copy');
      if (typeof toast === 'function') toast('✅ Copiado', 'ok');
    }
  }

  async function abrirWhatsApp() {
    const t = $id('postsTexto');
    if (!t || !t.value) return;
    const texto = t.value;
    // Selector nativo de Android (permite elegir grupo o contacto)
    if (navigator.share) {
      try {
        await navigator.share({ text: texto });
        return;
      } catch(e) {
        if (e.name === 'AbortError') return;
      }
    }
    // Fallback: copiar al portapapeles
    try {
      await navigator.clipboard.writeText(texto);
      if (typeof toast === 'function') toast('📋 Texto copiado. Pegalo donde quieras.', 'ok');
    } catch(e) {
      if (typeof toast === 'function') toast('Error al compartir', 'err');
    }
  }

  function abrirFacebook() {
    const t = $id('postsTexto');
    if (!t || !t.value) return;
    const texto = encodeURIComponent(t.value);
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://com-diaz-ty2b.onrender.com/shop.html') + '&quote=' + texto, '_blank');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.post-btn');
    if (btn) {
      e.preventDefault();
      generar(btn.dataset.tipo);
      return;
    }

    if (e.target.closest('#postsCopiar')) {
      e.preventDefault();
      copiarTexto();
      return;
    }
    if (e.target.closest('#postsWhatsapp')) {
      e.preventDefault();
      abrirWhatsApp();
      return;
    }
    if (e.target.closest('#postsFacebook')) {
      e.preventDefault();
      abrirFacebook();
      return;
    }
    if (e.target.closest('#postsClosePreview')) {
      e.preventDefault();
      $id('postsPreview').classList.add('hidden');
      return;
    }
    if (e.target.closest('#refreshPosts')) {
      e.preventDefault();
      $id('postsPreview')?.classList.add('hidden');
      return;
    }
  }, true);

  console.log('✅ Generador de publicaciones listo');
})();


/* ═══════════════════════════════════════════════
   MONITOREO IA
   ═══════════════════════════════════════════════ */
(function comdiaz_ia_monitor_v1(){
  const $id = id => document.getElementById(id);

  async function apiCall(path, opts) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {});
    const r = await fetch(API + path, Object.assign({}, opts, { headers }));
    return r.json();
  }

  function tiempoRelativo(iso) {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    const seg = Math.floor(ms / 1000);
    if (seg < 60) return 'hace ' + seg + 's';
    const min = Math.floor(seg / 60);
    if (min < 60) return 'hace ' + min + 'm';
    const h = Math.floor(min / 60);
    if (h < 24) return 'hace ' + h + 'h';
    return 'hace ' + Math.floor(h / 24) + 'd';
  }

  async function cargar() {
    try {
      const d = await apiCall('/api/ai/status');
      if (!d.ok) return;

      // Progreso
      $id('iaConIA').textContent = d.conIA + '/' + d.total;
      const fill = $id('iaProgresoFill');
      if (fill) fill.style.width = d.progreso + '%';
      const badge = $id('iaProgresoBadge');
      if (badge) {
        badge.textContent = d.progreso + '%';
        if (d.progreso >= 100) badge.style.background = 'linear-gradient(135deg,#10b981,#059669)';
        else if (d.progreso >= 50) badge.style.background = 'linear-gradient(135deg,#7c3aed,#ec4899)';
      }

      // Stats
      $id('iaConIACount').textContent = d.conIA || 0;
      $id('iaSinIACount').textContent = d.sinIA || 0;
      $id('iaUltimaHora').textContent = d.ultimaHora || 0;
      $id('iaTotal').textContent = d.total || 0;

      // Keys
      const keysBox = $id('iaKeys');
      if (keysBox) {
        if (!d.keys || !d.keys.length) {
          keysBox.innerHTML = '<div class="act-empty">Sin keys configuradas</div>';
        } else {
          keysBox.innerHTML = d.keys.map(k =>
            '<div class="ia-key-item' + (k.bloqueadaHasta ? ' bloqueada' : '') + '">' +
              '<span class="ia-key-suffix">' + k.sufijo + '</span>' +
              '<span class="ia-key-estado">' + (k.bloqueadaHasta ? '🔒 bloqueada' : '✅ activa') + '</span>' +
            '</div>'
          ).join('');
        }
      }

      // Modelo
      const mod = $id('iaModelo');
      if (mod) mod.textContent = d.modelo || '—';

      // Ultimas
      const ult = $id('iaUltimas');
      if (ult) {
        if (!d.ultimos || !d.ultimos.length) {
          ult.innerHTML = '<div class="act-empty">Sin generaciones aún</div>';
        } else {
          ult.innerHTML = d.ultimos.map(p =>
            '<div class="ia-item">' +
              '<div class="ia-item-titulo">✨ ' + (p.tituloIA || '').replace(/</g, '&lt;') + '</div>' +
              '<div class="ia-item-original">Original: ' + (p.tituloOriginal || '').replace(/</g, '&lt;') + '</div>' +
              '<div class="ia-item-fecha">' + tiempoRelativo(p.generadoEn) + '</div>' +
            '</div>'
          ).join('');
        }
      }
    } catch(e) {
      console.error('Error IA monitor:', e);
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#refreshIA')) {
      e.preventDefault();
      cargar();
      return;
    }
  }, true);

  setTimeout(cargar, 3000);
  setInterval(cargar, 30000);

  console.log('✅ Monitor IA listo');
})();


// ═══════════════════════════════════════════════════════
// MÓDULO: PRODUCTOS LOCALES (vista Locales)
// ═══════════════════════════════════════════════════════
(function comdiaz_locales_v1(){
  let provinciasCache = null;
  let localesCache = [];
  let editingId = null;
  let imagenesActuales = [];
  let inicializado = false;

  function $L(id) { return document.getElementById(id); }

  // ─── Cargar provincias (una sola vez) ───
  async function cargarProvincias() {
    if (provinciasCache) return provinciasCache;
    try {
      const r = await fetch('https://com-diaz-ty2b.onrender.com/api/public/provincias');
      const d = await r.json();
      provinciasCache = d.provincias || {};
      return provinciasCache;
    } catch(e) {
      console.warn('[LOCALES] Error cargando provincias:', e);
      return {};
    }
  }

  // ─── Popula select de provincias ───
  function poblarProvincias(provincias) {
    const selFiltro = $L('localFilterProvincia');
    const selForm = $L('localProvincia');
    if (selFiltro) {
      selFiltro.innerHTML = '<option value="">Todas las provincias</option>';
      Object.keys(provincias).sort().forEach(p => {
        selFiltro.innerHTML += `<option value="${p}">${p}</option>`;
      });
    }
    if (selForm) {
      selForm.innerHTML = '<option value="">Elige provincia...</option>';
      Object.keys(provincias).sort().forEach(p => {
        selForm.innerHTML += `<option value="${p}">${p}</option>`;
      });
    }
  }

  // ─── Popula municipios de una provincia ───
  function poblarMunicipios(provincia, targetId) {
    const provincias = provinciasCache || {};
    const municipios = provincias[provincia] || [];
    const sel = $L(targetId);
    if (!sel) return;
    if (!municipios.length) {
      sel.innerHTML = '<option value="">Sin municipios</option>';
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    sel.innerHTML = '<option value="">Todos los municipios</option>';
    municipios.sort().forEach(m => {
      sel.innerHTML += `<option value="${m}">${m}</option>`;
    });
  }

  // ─── Cargar categorías del state global ───
  function cargarCategorias() {
    const sel = $L('localCategory');
    if (!sel) return;
    let cats = [];
    try {
      const st = typeof state !== 'undefined' ? state : null;
      if (st && Array.isArray(st.categories)) {
        cats = st.categories.map(c => c.label || c);
      }
    } catch(e) {}
    if (!cats.length) {
      cats = ['📱 Celulares','💻 Computación','👕 Ropa de Hombre','👗 Ropa de Mujer',
              '🏍️ Motos y Bicicletas','🔧 Herramientas','🏠 Hogar','🍳 Cocina',
              '🧸 Niños y Juguetes','📚 Escolar','🏋️ Deportes','🐕 Mascotas','Local'];
    }
    sel.innerHTML = '';
    cats.forEach(c => {
      sel.innerHTML += `<option value="${c}">${c}</option>`;
    });
  }

  // ─── Cargar lista de locales desde el backend ───
  async function cargarLocales() {
    const box = $L('localesList');
    if (!box) return;
    try {
      const r = await api('/api/manual/products?tipo=local');
      const d = r || {};
      localesCache = (d.products || []).filter(p => 
        p.tipo === 'local' || p.source === 'local'
      );
      renderLocales();
      const cnt = $L('localesCount');
      if (cnt) cnt.textContent = localesCache.length;
    } catch(e) {
      console.error('[LOCALES] Error cargando:', e);
      box.innerHTML = '<div class="act-empty">Error cargando productos: ' + (e.message || e) + '</div>';
    }
  }

  // ─── Render de la lista ───
  function renderLocales() {
    const box = $L('localesList');
    if (!box) return;

    if (!localesCache.length) {
      box.innerHTML = '<div class="act-empty">No hay productos locales aún. Toca <b>➕ Nuevo producto</b> para añadir el primero.</div>';
      return;
    }

    box.innerHTML = '';
    localesCache.forEach(p => {
      const precio = p.salePrice ? '$' + Number(p.salePrice).toFixed(2) : '—';
      const cup = p.precioCUP ? ' · ' + Number(p.precioCUP).toLocaleString() + ' CUP' : '';
      const ubic = [p.provincia, p.municipio].filter(Boolean).join(' / ') || 'Sin ubicación';
      const estado = p.estado || 'nuevo';
      const pubBadge = p.publicado ? '<span class="local-item-badge publicado">Publicado</span>' : '<span class="local-item-badge oculto">Oculto</span>';

      const el = document.createElement('div');
      el.className = 'local-item';
      el.innerHTML = `
        <img class="local-item-img" src="${p.image || ''}" alt="" onerror="this.style.opacity=.3">
        <div class="local-item-body">
          <div class="local-item-title">${(p.title || '(sin título)').replace(/</g,'&lt;')}</div>
          <div class="local-item-meta">📍 ${ubic}</div>
          <div class="local-item-meta">
            <span class="local-item-price">${precio}${cup}</span>
            <span class="local-item-badge estado-${estado}">${estado}</span>
            ${pubBadge}
          </div>
          <div class="local-item-meta">🏷️ ${p.category || 'Local'} · Stock: ${p.cantidad || 1}</div>
          <div class="local-item-actions">
            <button class="btn-edit" data-action="edit" data-id="${p.id}">✏️ Editar</button>
            <button class="btn-pub" data-action="toggle" data-id="${p.id}">${p.publicado ? '👁️ Ocultar' : '📤 Publicar'}</button>
            <button class="btn-del" data-action="del" data-id="${p.id}">🗑️ Eliminar</button>
          </div>
        </div>
      `;
      box.appendChild(el);
    });
  }

  // ─── Aplicar filtros ───
  function aplicarFiltros() {
    const prov = ($L('localFilterProvincia')?.value || '').trim();
    const muni = ($L('localFilterMunicipio')?.value || '').trim();
    const est = ($L('localFilterEstado')?.value || '').trim();
    const busq = ($L('localSearch')?.value || '').toLowerCase().trim();

    const filtrados = localesCache.filter(p => {
      if (prov && p.provincia !== prov) return false;
      if (muni && p.municipio !== muni) return false;
      if (est && (p.estado || 'nuevo') !== est) return false;
      if (busq) {
        const txt = ((p.title || '') + ' ' + (p.description || '') + ' ' + (p.category || '')).toLowerCase();
        if (!txt.includes(busq)) return false;
      }
      return true;
    });

    // Guardar copia temporal para render
    const backup = localesCache;
    localesCache = filtrados;
    renderLocales();
    localesCache = backup;
  }

  // ─── Abrir modal nuevo ───
  function abrirNuevoLocal() {
    editingId = null;
    imagenesActuales = [];
    $L('localModalTitle').textContent = '➕ Nuevo producto local';
    $L('localTitle').value = '';
    $L('localDesc').value = '';
    $L('localPrecioUSD').value = '';
    $L('localPrecioCUP').value = '';
    $L('localCantidad').value = '1';
    $L('localNotas').value = '';
    $L('localPublicado').checked = true;
    $L('localEstado').value = 'nuevo';
    $L('localProvincia').value = '';
    $L('localMunicipio').innerHTML = '<option value="">Primero elige provincia</option>';
    $L('localMunicipio').disabled = true;
    renderImgsPreview();
    $L('localModal').classList.remove('hidden');
  }

  // ─── Abrir modal editar ───
  async function abrirEditarLocal(id) {
    const p = localesCache.find(x => x.id === id);
    if (!p) return;
    editingId = id;
    imagenesActuales = Array.isArray(p.images) ? [...p.images] : (p.image ? [p.image] : []);
    $L('localModalTitle').textContent = '✏️ Editar producto';
    $L('localTitle').value = p.title || '';
    $L('localDesc').value = p.description || '';
    $L('localPrecioUSD').value = p.precioUSD || p.salePrice || '';
    $L('localPrecioCUP').value = p.precioCUP || '';
    $L('localCantidad').value = p.cantidad || 1;
    $L('localNotas').value = p.notas || '';
    $L('localPublicado').checked = p.publicado !== false;
    $L('localEstado').value = p.estado || 'nuevo';
    $L('localCategory').value = p.category || 'Local';
    if (p.provincia) {
      $L('localProvincia').value = p.provincia;
      poblarMunicipios(p.provincia, 'localMunicipio');
      if (p.municipio) $L('localMunicipio').value = p.municipio;
    }
    renderImgsPreview();
    $L('localModal').classList.remove('hidden');
  }

  // ─── Render de preview de imágenes ───
  function renderImgsPreview() {
    const box = $L('localImgsPreview');
    if (!box) return;
    box.innerHTML = '';
    imagenesActuales.forEach((url, i) => {
      const div = document.createElement('div');
      div.className = 'img-thumb';
      div.innerHTML = `
        <img src="${url}" alt="">
        <button type="button" data-idx="${i}" title="Quitar">✕</button>
      `;
      div.querySelector('button').onclick = () => {
        imagenesActuales.splice(i, 1);
        renderImgsPreview();
      };
      box.appendChild(div);
    });
  }

  // ─── Subir imagen(es) ───
  // ─── Upload con XHR (WebView compatible) ───
  function apiUploadXHR(payload) {
    return new Promise((resolve) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', API + '/api/upload-image', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Comdiaz-Key', localStorage.getItem('comdiaz_api_key') || '');
        xhr.timeout = 120000;
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch(e) { resolve({ ok: false, error: 'JSON inválido' }); }
          } else {
            resolve({ ok: false, error: 'HTTP ' + xhr.status });
          }
        };
        xhr.onerror = function() { resolve({ ok: false, error: 'Error de red (XHR)' }); };
        xhr.ontimeout = function() { resolve({ ok: false, error: 'Timeout (XHR)' }); };
        xhr.send(JSON.stringify(payload));
      } catch(e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  async function subirImagenes(files) {
    const box = $L('localImgsPreview');
    for (const file of files) {
      if (imagenesActuales.length >= 8) {
        alert('Máximo 8 imágenes por producto');
        break;
      }
      // Preview loading
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'img-thumb loading';
      loadingDiv.textContent = '⏳';
      box.appendChild(loadingDiv);

      try {
        // Comprimir si existe la función
        let base64;
        if (typeof comprimirImagen === 'function') {
          base64 = await comprimirImagen(file, 800, 0.8);
        } else {
          base64 = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(file);
          });
        }

        const resp = await apiUploadXHR({ image: base64, nombre: 'local_' + Date.now() });

        if (resp && resp.ok && resp.url) {
          imagenesActuales.push(resp.url);
        } else {
          alert('Error subiendo imagen: ' + (resp?.error || 'desconocido'));
        }
      } catch(e) {
        alert('Error subiendo: ' + (e.message || e));
      } finally {
        loadingDiv.remove();
      }
    }
    renderImgsPreview();
  }

  // ─── Guardar (POST o PUT) ───
  async function guardarLocal() {
    const title = ($L('localTitle').value || '').trim();
    const precio = Number($L('localPrecioUSD').value) || 0;
    const provincia = $L('localProvincia').value;

    if (!title) { alert('El título es obligatorio'); return; }
    if (precio <= 0) { alert('El precio USD es obligatorio'); return; }
    if (!imagenesActuales.length) { alert('Añade al menos 1 foto'); return; }
    if (!provincia) { alert('La provincia es obligatoria'); return; }

    const body = {
      tipo: 'local',
      title: title,
      description: $L('localDesc').value || '',
      images: imagenesActuales,
      image: imagenesActuales[0],
      category: $L('localCategory').value || 'Local',
      estado: $L('localEstado').value || 'nuevo',
      provincia: provincia,
      municipio: $L('localMunicipio').value || null,
      precioUSD: precio,
      precioCUP: Number($L('localPrecioCUP').value) || null,
      cantidad: Number($L('localCantidad').value) || 1,
      notas: $L('localNotas').value || null,
      publicado: $L('localPublicado').checked
    };

    const btn = $L('localSaveBtn');
    const prevTxt = btn.textContent;
    btn.textContent = '⏳ Guardando...';
    btn.disabled = true;

    try {
      let resp;
      if (editingId) {
        resp = await api('/api/manual/products/' + editingId, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      } else {
        resp = await api('/api/manual/products', {
          method: 'POST',
          body: JSON.stringify(body)
        });
      }

      if (resp && resp.ok) {
        $L('localModal').classList.add('hidden');
        await cargarLocales();
      } else {
        alert('Error: ' + (resp?.error || 'desconocido'));
      }
    } catch(e) {
      alert('Error guardando: ' + (e.message || e));
    } finally {
      btn.textContent = prevTxt;
      btn.disabled = false;
    }
  }

  // ─── Eliminar ───
  async function eliminarLocal(id) {
    if (!confirm('¿Eliminar este producto? No se puede deshacer.')) return;
    try {
      await api('/api/manual/products/' + id, { method: 'DELETE' });
      await cargarLocales();
    } catch(e) {
      alert('Error eliminando: ' + (e.message || e));
    }
  }

  // ─── Toggle publicado ───
  async function togglePublicado(id) {
    const p = localesCache.find(x => x.id === id);
    if (!p) return;
    try {
      await api('/api/manual/products/' + id, {
        method: 'PUT',
        body: JSON.stringify({ publicado: !p.publicado })
      });
      await cargarLocales();
    } catch(e) {
      alert('Error: ' + (e.message || e));
    }
  }

  // ─── Click en botones de la lista ───
  function bindLista() {
    const box = $L('localesList');
    if (!box) return;
    box.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'edit') abrirEditarLocal(id);
      else if (action === 'del') eliminarLocal(id);
      else if (action === 'toggle') togglePublicado(id);
    });
  }

  // ─── Init ───
  async function init() {
    if (inicializado) return;
    if (!$L('localesList')) return; // No estamos en la vista correcta aún
    inicializado = true;

    const provincias = await cargarProvincias();
    poblarProvincias(provincias);
    cargarCategorias();

    await cargarLocales();
    bindLista();

    // Botón nuevo
    $L('localNewBtn')?.addEventListener('click', abrirNuevoLocal);

    // Botones del modal
    $L('localModalClose')?.addEventListener('click', () => $L('localModal').classList.add('hidden'));
    $L('localCancelBtn')?.addEventListener('click', () => $L('localModal').classList.add('hidden'));
    $L('localSaveBtn')?.addEventListener('click', guardarLocal);

    // Add image btn
    $L('localAddImgBtn')?.addEventListener('click', () => $L('localImgInput').click());
    $L('localImgInput')?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) {
        subirImagenes(Array.from(e.target.files));
        e.target.value = '';
      }
    });

    // Provincia → municipio (formulario)
    $L('localProvincia')?.addEventListener('change', (e) => {
      poblarMunicipios(e.target.value, 'localMunicipio');
    });

    // Provincia → municipio (filtros)
    $L('localFilterProvincia')?.addEventListener('change', (e) => {
      if (e.target.value) {
        poblarMunicipios(e.target.value, 'localFilterMunicipio');
      } else {
        const sel = $L('localFilterMunicipio');
        sel.innerHTML = '<option value="">Todos los municipios</option>';
        sel.disabled = true;
      }
      aplicarFiltros();
    });

    // Filtros
    $L('localFilterMunicipio')?.addEventListener('change', aplicarFiltros);
    $L('localFilterEstado')?.addEventListener('change', aplicarFiltros);
    $L('localSearch')?.addEventListener('input', aplicarFiltros);

    // Carga masiva (placeholder - después)
    $L('localBulkBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('comdiaz:open-bulk'));
    });

    console.log('✅ Panel Locales listo');
  }

  // Ejecutar init al cargar, y cuando se navega a la vista locales
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }

  // Re-init cuando cambia la vista (por si acaso)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item');
    if (btn && btn.dataset.view === 'locales') {
      setTimeout(init, 100);
    }
  });

})();


// ═══════════════════════════════════════════════════════
// COPILOTO IA — Panel flotante con chat contextual
// ═══════════════════════════════════════════════════════
(function comdiaz_copilot_v1(){
  const $cp = id => document.getElementById(id);
  const HIST_KEY = 'comdiaz_copilot_hist';
  const QUEUE_KEY = 'comdiaz_copilot_queue';
  const SNAP_KEY = 'comdiaz_copilot_snapshot';
  const MAX_HIST = 30;

  let historial = [];
  let colaOffline = [];
  let abierto = false;
  let enviando = false;
  let accionPendiente = null;

  // ─── Cargar estado desde localStorage ───
  function cargar() {
    try { historial = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch(_) {}
    try { colaOffline = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch(_) {}
    if (!Array.isArray(historial)) historial = [];
    if (!Array.isArray(colaOffline)) colaOffline = [];
  }

  function guardar() {
    try {
      localStorage.setItem(HIST_KEY, JSON.stringify(historial.slice(-MAX_HIST)));
      localStorage.setItem(QUEUE_KEY, JSON.stringify(colaOffline));
    } catch(_) {}
  }

  // ─── Detectar conexión ───
  function estaOnline() {
    return navigator.onLine !== false;
  }

  function actualizarEstado() {
    const status = $cp('copilotStatus');
    const offline = $cp('copilotOffline');
    if (!status) return;
    if (estaOnline()) {
      status.textContent = 'En línea';
      status.classList.remove('offline');
      if (offline) offline.classList.add('hidden');
      // Si hay cola, intentar enviar
      procesarCola();
    } else {
      const pendientes = colaOffline.length;
      status.textContent = pendientes > 0 ? `Offline (${pendientes})` : 'Offline';
      status.classList.add('offline');
      if (offline) offline.classList.remove('hidden');
    }
  }

  // ─── Añadir mensaje al chat (visual + memoria) ───
  function addMsg(rol, texto, opts = {}) {
    const messages = $cp('copilotMessages');
    if (!messages) return;

    const div = document.createElement('div');
    div.className = 'copilot-msg copilot-msg-' + rol;
    const bubble = document.createElement('div');
    bubble.className = 'copilot-bubble';
    if (opts.loading) bubble.classList.add('loading');
    bubble.innerHTML = texto.replace(/\n/g, '<br>');
    div.appendChild(bubble);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;

    if (!opts.loading && !opts.noPersist) {
      historial.push({ rol, texto, ts: Date.now() });
      guardar();
    }
    return bubble;
  }

  // ─── Mostrar acciones sugeridas ───
  function mostrarAccion(accion) {
    if (!accion || !accion.tipo) return;
    const messages = $cp('copilotMessages');
    if (!messages) return;

    const div = document.createElement('div');
    div.className = 'copilot-msg copilot-msg-bot';
    const bubble = document.createElement('div');
    bubble.className = 'copilot-bubble';
    bubble.innerHTML = `💡 <b>Acción sugerida:</b> ${accion.tipo}`;

    const btn = document.createElement('button');
    btn.className = 'copilot-action-btn';
    btn.textContent = '⚙️ Ver y confirmar';
    btn.onclick = () => abrirConfirmacion(accion);
    bubble.appendChild(btn);

    div.appendChild(bubble);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  // ─── Modal de confirmación ───
  function abrirConfirmacion(accion) {
    accionPendiente = accion;
    const modal = $cp('copilotActionModal');
    const title = $cp('copilotActionTitle');
    const desc = $cp('copilotActionDesc');
    if (!modal) return;

    title.textContent = '⚙️ ' + (accion.tipo || 'Acción');
    desc.textContent = accion.detalles || 'El copiloto sugiere esta acción. ¿Deseas ejecutarla?';
    modal.classList.remove('hidden');
  }

  function cerrarConfirmacion() {
    const modal = $cp('copilotActionModal');
    if (modal) modal.classList.add('hidden');
    accionPendiente = null;
  }

  // ─── Ejecutar acción confirmada ───
  async function ejecutarAccion() {
    if (!accionPendiente) return;
    const accion = accionPendiente;
    cerrarConfirmacion();

    if (!estaOnline()) {
      addMsg('bot', '⚠️ No hay conexión. La acción se ejecutará al reconectar.');
      colaOffline.push({ tipo: 'accion', accion, ts: Date.now() });
      guardar();
      actualizarEstado();
      return;
    }

    try {
      addMsg('bot', '⚙️ Ejecutando: ' + accion.tipo + '...');

      // Mapeo de tipos → endpoints
      let resultado = null;
      const t = accion.tipo.toLowerCase();

      if (t.includes('publicar') && accion.detalles) {
        // Ejemplo: publicar producto por ID
        const match = String(accion.detalles).match(/local-[\w-]+/);
        if (match) {
          resultado = await api('/api/manual/products/' + match[0], {
            method: 'PUT',
            body: JSON.stringify({ publicado: true })
          });
        }
      } else if (t.includes('sincronizar')) {
        resultado = await api('/api/manual/sync-published', { method: 'POST', body: '{}' });
      } else if (t.includes('banner')) {
        resultado = await api('/api/ai/generate-banners', { method: 'POST', body: '{}' });
      } else {
        addMsg('bot', '⚠️ No sé cómo ejecutar "' + accion.tipo + '" todavía. Dímelo y lo implemento.');
        return;
      }

      if (resultado && resultado.ok) {
        addMsg('bot', '✅ Acción completada con éxito.');
      } else {
        addMsg('bot', '❌ Error: ' + (resultado?.error || 'desconocido'));
      }
    } catch (e) {
      addMsg('bot', '❌ Error ejecutando: ' + e.message);
    }
  }

  // ─── Procesar cola offline ───
  async function procesarCola() {
    if (!estaOnline() || !colaOffline.length || enviando) return;
    const pendientes = [...colaOffline];
    colaOffline = [];
    guardar();

    for (const item of pendientes) {
      try {
        if (item.tipo === 'mensaje') {
          await enviarAlBackend(item.mensaje, item.historial, { silencioso: true });
        } else if (item.tipo === 'accion') {
          // TODO: ejecutar acción pendiente
        }
      } catch(e) {
        colaOffline.push(item);
      }
    }
    guardar();
    actualizarEstado();
  }

  // ─── Enviar mensaje al backend ───
  // ─── Enviar mensaje al backend (XHR puro para máxima compatibilidad) ───
  async function enviarAlBackend(mensaje, hist, opts = {}) {
    const onChunk = opts.onChunk || (() => {});
    
    console.log('[COPILOT] Enviando con XMLHttpRequest...');
    
    return new Promise((resolve) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', API + '/api/ai/copilot', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Comdiaz-Key', localStorage.getItem('comdiaz_api_key') || '');
        xhr.timeout = 90000;
        
        xhr.onload = function() {
          console.log('[COPILOT] XHR status:', xhr.status);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log('[COPILOT] XHR OK, respuesta recibida');
              if (data.ok && data.respuesta) {
                onChunk(data.respuesta);
              }
              resolve(data);
            } catch(e) {
              console.error('[COPILOT] XHR JSON error:', e);
              resolve({ ok: false, error: 'Respuesta inválida' });
            }
          } else {
            console.error('[COPILOT] XHR HTTP error:', xhr.status);
            resolve({ ok: false, error: 'HTTP ' + xhr.status });
          }
        };
        
        xhr.onerror = function() {
          console.error('[COPILOT] XHR error de red');
          resolve({ ok: false, error: 'Error de red (XHR)' });
        };
        
        xhr.ontimeout = function() {
          console.error('[COPILOT] XHR timeout');
          resolve({ ok: false, error: 'Timeout (XHR)' });
        };
        
        const body = JSON.stringify({ mensaje, historial: hist });
        xhr.send(body);
      } catch(e) {
        console.error('[COPILOT] XHR excepción:', e);
        resolve({ ok: false, error: e.message });
      }
    });
  }

  async function enviar() {
    const input = $cp('copilotInput');
    if (!input) return;
    const texto = input.value.trim();
    if (!texto || enviando) return;

    input.value = '';
    input.style.height = 'auto';
    addMsg('user', texto);

    if (!estaOnline()) {
      addMsg('bot', '📡 Sin conexión. Tu mensaje se guardará y enviaré al reconectar.');
      colaOffline.push({ tipo: 'mensaje', mensaje: texto, historial: [...historial], ts: Date.now() });
      guardar();
      actualizarEstado();
      return;
    }

    enviando = true;
    const loadingBubble = addMsg('bot', '🤔 Pensando...', { loading: true, noPersist: true });

    // Bubble vacío que se rellenará con el streaming
    let streamBubble = null;

    try {
      const data = await enviarAlBackend(texto, historial.slice(-6), {
        onChunk: (chunk) => {
          if (!streamBubble) {
            if (loadingBubble && loadingBubble.parentElement) {
              loadingBubble.parentElement.remove();
            }
            const msgDiv = document.createElement('div');
            msgDiv.className = 'copilot-msg copilot-msg-bot';
            streamBubble = document.createElement('div');
            streamBubble.className = 'copilot-bubble';
            msgDiv.appendChild(streamBubble);
            const messages = $cp('copilotMessages');
            if (messages) {
              messages.appendChild(msgDiv);
              messages.scrollTop = messages.scrollHeight;
            }
          }
          // Streaming: no escapamos hasta el final, usamos textContent durante el stream
          streamBubble.textContent += chunk;
          const messages = $cp('copilotMessages');
          if (messages) messages.scrollTop = messages.scrollHeight;
        }
      });

      if (loadingBubble && loadingBubble.parentElement) {
        loadingBubble.parentElement.remove();
      }

      if (!data.ok) {
        if (streamBubble) streamBubble.textContent = '❌ Error: ' + (data.error || 'desconocido');
        else addMsg('bot', '❌ Error: ' + (data.error || 'desconocido'));
        return;
      }

      // Reemplazar el contenido del bubble con HTML escapado final
      if (streamBubble) {
        streamBubble.innerHTML = String(data.respuesta || '').replace(/\n/g, '<br>');
      } else {
        addMsg('bot', data.respuesta || '(sin respuesta)');
      }

      // Persistir en historial
      historial.push({ rol: 'bot', texto: data.respuesta || '', ts: Date.now() });
      guardar();

      if (data.accionSugerida) {
        mostrarAccion(data.accionSugerida);
      }
    } catch (e) {
      if (loadingBubble && loadingBubble.parentElement) {
        loadingBubble.parentElement.remove();
      }
      if (streamBubble) streamBubble.textContent = '❌ Error de conexión.';
      else addMsg('bot', '❌ Error de conexión. Reintentaré al reconectar.');
      colaOffline.push({ tipo: 'mensaje', mensaje: texto, historial: [...historial], ts: Date.now() });
      guardar();
    } finally {
      enviando = false;
      actualizarEstado();
    }
  }

  // ─── Abrir / cerrar panel ───
  function abrirPanel() {
    const panel = $cp('copilotPanel');
    if (!panel) return;
    panel.classList.remove('hidden');
    abierto = true;
    actualizarEstado();
    // Warmup: 4 pings escalonados para despertar Render
    [0, 2000, 8000, 20000].forEach(ms => {
      setTimeout(() => {
        fetch(API + '/health', { cache: 'no-store' }).catch(() => {});
      }, ms);
    });
    const input = $cp('copilotInput');
    if (input) setTimeout(() => input.focus(), 200);
    // Cargar historial visual
    renderHistorial();
  }

  function cerrarPanel() {
    const panel = $cp('copilotPanel');
    if (panel) panel.classList.add('hidden');
    abierto = false;
  }

  // ─── Render historial guardado ───
  function renderHistorial() {
    const messages = $cp('copilotMessages');
    if (!messages) return;
    // Mantener mensaje inicial del bot
    const initial = messages.querySelector('.copilot-msg-bot .copilot-bubble:not(.loading)');
    messages.innerHTML = '';
    if (initial) {
      const clone = initial.closest('.copilot-msg').cloneNode(true);
      messages.appendChild(clone);
    }
    // Re-añadir historial (últimos 10)
    historial.slice(-10).forEach(h => {
      const div = document.createElement('div');
      div.className = 'copilot-msg copilot-msg-' + (h.rol === 'user' ? 'user' : 'bot');
      const bubble = document.createElement('div');
      bubble.className = 'copilot-bubble';
      bubble.innerHTML = String(h.texto || '').replace(/\n/g, '<br>');
      div.appendChild(bubble);
      messages.appendChild(div);
    });
    messages.scrollTop = messages.scrollHeight;
  }

  // ─── Detección de cambios en el state (innovador) ───
  function detectarCambios() {
    try {
      const st = window.state || null;
      if (!st || !st.results) return;

      const snapAnterior = JSON.parse(localStorage.getItem(SNAP_KEY) || 'null');
      const snapActual = {
        ts: Date.now(),
        resultsTotal: st.results.length,
        localesTotal: (st.productosManuales || []).filter(p => p.tipo === 'local').length,
        publishedTotal: (st.published || []).length,
        resultsIds: st.results.slice(0, 500).map(r => r.id), // hash parcial
      };

      if (snapAnterior) {
        const diffs = [];
        if (snapActual.resultsTotal !== snapAnterior.resultsTotal) {
          const delta = snapActual.resultsTotal - snapAnterior.resultsTotal;
          diffs.push(`${delta > 0 ? '+' : ''}${delta} productos eBay`);
        }
        if (snapActual.localesTotal !== snapAnterior.localesTotal) {
          const delta = snapActual.localesTotal - snapAnterior.localesTotal;
          diffs.push(`${delta > 0 ? '+' : ''}${delta} locales`);
        }
        if (snapActual.publishedTotal !== snapAnterior.publishedTotal) {
          const delta = snapActual.publishedTotal - snapAnterior.publishedTotal;
          diffs.push(`${delta > 0 ? '+' : ''}${delta} publicados`);
        }
        if (diffs.length && !abierto) {
          const badge = $cp('copilotBadge');
          if (badge) {
            badge.textContent = String((Number(badge.textContent) || 0) + 1);
            badge.classList.remove('hidden');
          }
          console.log('[COPILOT] Cambios detectados:', diffs.join(', '));
        }
      }

      localStorage.setItem(SNAP_KEY, JSON.stringify(snapActual));
    } catch(e) {
      console.warn('[COPILOT] Error detectando cambios:', e);
    }
  }

  // ─── Init ───
  function init() {
    const btn = $cp('copilotBtn');
    const panel = $cp('copilotPanel');
    const close = $cp('copilotClose');
    const send = $cp('copilotSend');
    const input = $cp('copilotInput');
    const cancel = $cp('copilotActionCancel');
    const confirm = $cp('copilotActionConfirm');

    if (!btn || !panel) {
      console.warn('[COPILOT] Elementos no encontrados');
      return;
    }

    cargar();
    actualizarEstado();

    btn.onclick = () => {
      if (abierto) cerrarPanel();
      else {
        abrirPanel();
        const badge = $cp('copilotBadge');
        if (badge) badge.classList.add('hidden');
      }
    };

    if (close) close.onclick = cerrarPanel;
    if (cancel) cancel.onclick = cerrarConfirmacion;
    if (confirm) confirm.onclick = ejecutarAccion;

    if (send) send.onclick = enviar;

    if (input) {
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          enviar();
        }
      });
    }

    // Escuchar conexión
    window.addEventListener('online', () => {
      actualizarEstado();
      addMsg('bot', '✅ Reconectado. Procesando mensajes pendientes...');
    });
    window.addEventListener('offline', actualizarEstado);

    // Detección de cambios cada 30s
    setInterval(detectarCambios, 30000);
    setTimeout(detectarCambios, 5000);

    console.log('✅ Copiloto listo');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 800));
  } else {
    setTimeout(init, 800);
  }
})();


// ═══════════════════════════════════════════════════════
// PANEL DE CATÁLOGO — Progreso visual
// ═══════════════════════════════════════════════════════
(function comdiaz_catalog_panel_v1(){
  const $C = id => document.getElementById(id);
  
  function proximaBusqueda(tipo) {
    const now = new Date();
    const cuba = new Date(now.toLocaleString('en-US', { timeZone: 'America/Havana' }));
    const dia = cuba.getDay();
    const hora = cuba.getHours();
    
    if (tipo === 'diaria') {
      // Lun-Sáb 05:00
      const diasHasta = (dia === 0) ? 1 : (dia === 6) ? 2 : 1;
      const target = new Date(cuba);
      if (hora < 5) {
        target.setDate(target.getDate());
        target.setHours(5, 0, 0, 0);
      } else {
        target.setDate(target.getDate() + diasHasta);
        target.setHours(5, 0, 0, 0);
      }
      return target.toLocaleString('es', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    if (tipo === 'semanal') {
      // Domingo 05:00
      const diasHastaDom = (7 - dia) % 7 || 7;
      const target = new Date(cuba);
      if (dia === 0 && hora < 5) {
        target.setHours(5, 0, 0, 0);
      } else {
        target.setDate(target.getDate() + diasHastaDom);
        target.setHours(5, 0, 0, 0);
      }
      return target.toLocaleString('es', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    if (tipo === 'mensual') {
      // 1er domingo del mes 06:00
      const target = new Date(cuba);
      target.setDate(1);
      while (target.getDay() !== 0) target.setDate(target.getDate() + 1);
      target.setHours(6, 0, 0, 0);
      if (target <= cuba) {
        target.setMonth(target.getMonth() + 1);
        target.setDate(1);
        while (target.getDay() !== 0) target.setDate(target.getDate() + 1);
        target.setHours(6, 0, 0, 0);
      }
      return target.toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
    return '—';
  }
  
  async function cargarEstado() {
    try {
      const r = await api('/api/catalog/status');
      if (!r || !r.ok) {
        $C('catalogStatusMsg').textContent = '⚠️ No se pudo cargar el estado';
        return;
      }
      
      // Contador y porcentaje
      $C('catalogCount').textContent = r.activos.toLocaleString() + ' / ' + r.capMax.toLocaleString();
      $C('catalogPercent').textContent = r.porcentaje + '%';
      $C('catalogBadge').textContent = r.porcentaje + '%';
      
      // Barra de progreso con color
      const fill = $C('catalogProgressFill');
      fill.style.width = r.porcentaje + '%';
      fill.className = 'catalog-progress-fill';
      if (r.estado === 'amarillo') fill.classList.add('warn');
      if (r.estado === 'rojo') fill.classList.add('danger');
      
      // Mensaje de estado
      const msg = $C('catalogStatusMsg');
      msg.textContent = (r.estado === 'verde' ? '🟢 ' : r.estado === 'amarillo' ? '🟡 ' : '🔴 ') + r.mensaje;
      msg.className = 'catalog-status-msg';
      if (r.estado === 'amarillo') msg.classList.add('warn');
      if (r.estado === 'rojo') msg.classList.add('danger');
      
      // Métricas
      $C('catalogConIA').textContent = r.conIA.toLocaleString();
      $C('catalogSinIA').textContent = r.sinIA.toLocaleString();
      $C('catalogDisponibles').textContent = r.disponibles.toLocaleString();
      
      // Próximas búsquedas
      $C('nextDaily').textContent = proximaBusqueda('diaria');
      $C('nextWeekly').textContent = proximaBusqueda('semanal');
      $C('nextMonthly').textContent = proximaBusqueda('mensual');
    } catch(e) {
      console.warn('[CATALOG-PANEL] Error:', e);
    }
  }
  
  function init() {
    if (!$C('catalogCard')) return;
    
    cargarEstado();
    
    // Botón recargar
    $C('catalogRefreshBtn')?.addEventListener('click', () => {
      const btn = $C('catalogRefreshBtn');
      btn.textContent = '⏳ Actualizando...';
      btn.disabled = true;
      cargarEstado().finally(() => {
        btn.textContent = '🔄 Actualizar';
        btn.disabled = false;
      });
    });
    
    // Auto-refresh cada 60s si la tarjeta está visible
    setInterval(() => {
      const card = $C('catalogCard');
      if (card && card.getBoundingClientRect().top < window.innerHeight) {
        cargarEstado();
      }
    }, 60000);
    
    console.log('✅ Panel de catálogo listo');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 800));
  } else {
    setTimeout(init, 800);
  }
})();
