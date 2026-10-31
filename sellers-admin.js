
// ═══════════════════════════════════════════════════════
// PANEL ADMIN — Vendedores
// ═══════════════════════════════════════════════════════
(function comdiaz_sellers_admin_v1(){
  const $S = id => document.getElementById(id);
  const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : 'https://com-diaz-ty2b.onrender.com';
  const KEY = () => localStorage.getItem('comdiaz_api_key') || '';

  let estadoActual = 'pendiente';
  let sellersCache = [];
  let inicializado = false;

  function toast(msg, tipo) {
    if (typeof window.toast === 'function') return window.toast(msg, tipo);
    console.log('[SELLERS-ADMIN]', msg);
  }

  async function api(path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    headers['X-Comdiaz-Key'] = KEY();
    if (opts.body) headers['Content-Type'] = 'application/json';
    const r = await fetch(API + path, Object.assign({}, opts, { headers }));
    if (!r.ok) {
      const t = await r.text();
      throw new Error('HTTP ' + r.status + ': ' + t.slice(0, 100));
    }
    return r.json();
  }

  // ═══ STATS GLOBALES ═══
  async function cargarStats() {
    try {
      const d = await api('/api/admin/stats');
      if (!d.ok) return;
      $S('statPendientes').textContent = d.sellers?.pendientes || 0;
      $S('statAprobados').textContent = d.sellers?.aprobados || 0;
      $S('statSuspendidos').textContent = d.sellers?.suspendidos || 0;
      $S('statProductos').textContent = d.productos?.totalActivos || 0;

      // Badge en el nav
      const pend = d.sellers?.pendientes || 0;
      const badge = $S('sellersBadge');
      if (badge) {
        if (pend > 0) {
          badge.textContent = pend;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    } catch(e) {
      console.warn('[SELLERS-ADMIN] Error stats:', e);
    }
  }

  // ═══ CARGAR VENDEDORES SEGÚN TAB ═══
  async function cargarSellers(estado) {
    estadoActual = estado;
    const list = $S('sellersList');
    if (!list) return;
    list.innerHTML = '<div class="act-empty">Cargando…</div>';

    try {
      const q = estado ? '?estado=' + encodeURIComponent(estado) : '';
      const d = await api('/api/admin/sellers' + q);
      sellersCache = d.sellers || [];
      
      const count = $S('vendedoresCount');
      if (count) count.textContent = sellersCache.length;

      renderSellers();
    } catch(e) {
      list.innerHTML = '<div class="act-empty" style="color:#f87171">Error: ' + e.message + '</div>';
    }
  }

  // ═══ RENDER ═══
  function renderSellers() {
    const list = $S('sellersList');
    if (!list) return;

    if (!sellersCache.length) {
      list.innerHTML = '<div class="act-empty">No hay vendedores en este estado.</div>';
      return;
    }

    list.innerHTML = sellersCache.map(s => {
      const estado = s.estado || 'pendiente';
      const plan = s.plan_id || 'basico';
      const fecha = s.created_at ? new Date(s.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
      const ubic = [s.provincia, s.municipio].filter(Boolean).join(' / ') || 'Sin ubicación';
      
      const acciones = [];
      if (estado === 'pendiente') {
        acciones.push(`<button class="btn-approve" data-action="approve" data-id="${s.id}">✅ Aprobar</button>`);
        acciones.push(`<button class="btn-suspend" data-action="suspend" data-id="${s.id}">🚫 Rechazar</button>`);
      } else if (estado === 'aprobado') {
        acciones.push(`<button class="btn-suspend" data-action="suspend" data-id="${s.id}">🚫 Suspender</button>`);
      } else if (estado === 'suspendido') {
        acciones.push(`<button class="btn-approve" data-action="approve" data-id="${s.id}">✅ Reactivar</button>`);
      }
      acciones.push(`<button class="btn-view" data-action="ver" data-id="${s.id}">👁️ Ver</button>`);

      return `
        <div class="seller-card ${estado}" data-id="${s.id}">
          <div class="seller-card-head">
            <div>
              <div class="seller-card-name">${(s.nombre || 'Sin nombre').replace(/</g,'&lt;')}</div>
              <div class="seller-card-phone">📱 ${s.telefono || '—'}</div>
            </div>
            <span class="seller-card-badge ${estado}">${estado}</span>
          </div>
          <div class="seller-card-meta">
            <span>📅 ${fecha}</span>
            <span>📍 ${ubic}</span>
            <span>💼 Plan: <b>${plan}</b></span>
          </div>
          <div class="seller-card-actions">
            ${acciones.join('')}
          </div>
        </div>
      `;
    }).join('');

    // Bind actions
    list.querySelectorAll('button[data-action]').forEach(btn => {
      btn.onclick = () => manejarAccion(btn.dataset.action, btn.dataset.id);
    });
  }

  // ═══ ACCIONES ═══
  async function manejarAccion(action, id) {
    const seller = sellersCache.find(s => s.id === id);
    if (!seller) return;

    if (action === 'approve') {
      if (!confirm('¿Aprobar a ' + seller.nombre + '?\\nPodrá empezar a publicar productos.')) return;
      try {
        await api('/api/admin/sellers/' + id + '/approve', { method: 'POST', body: '{}' });
        toast('✅ Vendedor aprobado', 'ok');
        await cargarStats();
        await cargarSellers(estadoActual);
      } catch(e) {
        toast('Error: ' + e.message, 'err');
      }
    }
    else if (action === 'suspend') {
      const motivo = prompt('Motivo de la suspensión:', '');
      if (motivo === null) return;
      try {
        await api('/api/admin/sellers/' + id + '/suspend', {
          method: 'POST',
          body: JSON.stringify({ motivo: motivo || 'Suspendido por admin' })
        });
        toast('🚫 Vendedor suspendido', 'ok');
        await cargarStats();
        await cargarSellers(estadoActual);
      } catch(e) {
        toast('Error: ' + e.message, 'err');
      }
    }
    else if (action === 'ver') {
      verDetalles(seller);
    }
  }

  // ═══ MODAL VER DETALLES ═══
  function verDetalles(s) {
    const info = [
      ['ID', s.id],
      ['Nombre', s.nombre],
      ['Teléfono', s.telefono],
      ['Email', s.email || '—'],
      ['Provincia', s.provincia || '—'],
      ['Municipio', s.municipio || '—'],
      ['Plan', s.plan_id],
      ['Estado', s.estado],
      ['Cuota usada', s.cuota_usada || 0],
      ['Plan expira', s.plan_expira_at ? new Date(s.plan_expira_at).toLocaleString('es') : '—'],
      ['Creado', s.created_at ? new Date(s.created_at).toLocaleString('es') : '—'],
      ['Notas', s.notas_internas || '—'],
    ];

    const html = `
      <div id="sellerDetailModal" class="modal" style="position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px">
        <div style="background:#0f1524;border:1px solid var(--border);border-radius:16px;max-width:420px;width:100%;max-height:80vh;overflow-y:auto">
          <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <h3 style="margin:0;font-size:16px">${(s.nombre || '').replace(/</g,'&lt;')}</h3>
            <button onclick="document.getElementById('sellerDetailModal').remove()" style="background:transparent;border:none;color:var(--muted);font-size:22px;cursor:pointer">✕</button>
          </div>
          <div style="padding:16px">
            ${info.map(([lbl, val]) => `
              <div class="seller-detail-row">
                <span class="lbl">${lbl}</span>
                <span class="val">${String(val || '—').replace(/</g,'&lt;')}</span>
              </div>
            `).join('')}
          </div>
          <div style="padding:12px 16px;border-top:1px solid var(--border);text-align:center">
            <a href="${(window.comdiaz_esAppNativa && window.comdiaz_esAppNativa()) ? 'whatsapp://send?phone=' : 'https://wa.me/'}${s.telefono}?text=Hola%20${encodeURIComponent(s.nombre || '')}%2C%20soy%20admin%20de%20Comdiaz" target="_blank" style="display:inline-block;padding:10px 16px;background:#25D366;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700">💬 Escribir por WhatsApp</a>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  // ═══ TABS ═══
  function bindTabs() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        cargarSellers(tab.dataset.estado);
      };
    });
  }

  // ═══ INIT ═══
  function init() {
    if (inicializado) return;
    const list = $S('sellersList');
    if (!list) return;
    inicializado = true;

    bindTabs();
    $S('sellersRefreshBtn')?.addEventListener('click', () => {
      cargarStats();
      cargarSellers(estadoActual);
    });

    cargarStats();
    cargarSellers('pendiente');

    // Auto-refresh cada 60s cuando estamos en la sección
    setInterval(() => {
      const card = $S('vendedoresCard');
      if (card && card.getBoundingClientRect().top < window.innerHeight && card.getBoundingClientRect().bottom > 0) {
        cargarStats();
      }
    }, 60000);

    // Actualizar badge cada 2 min (siempre)
    setInterval(cargarStats, 120000);

    console.log('✅ Panel vendedores listo');
  }

  // Init al cargar + cuando se navega a la vista
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1200));
  } else {
    setTimeout(init, 1200);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item');
    if (btn && btn.dataset.view === 'vendedores') {
      setTimeout(() => {
        if (!inicializado) { init(); }
        else { cargarStats(); cargarSellers(estadoActual); }
      }, 100);
    }
  });

  // Exponer para debug
  window.comdiaz_sellers_admin = { cargarStats, cargarSellers };
})();

