// ═══════════════════════════════════════════════════════
// Comparador de planes — componente compartido
// Uso: <div id="planesContainer" data-mode="register|upgrade"></div>
// ═══════════════════════════════════════════════════════
(function(){
  const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : 'https://com-diaz.onrender.com';

  const ESTILOS = `
<style id="planes-cards-css">
.planes-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin: 16px 0;
}
@media (min-width: 640px) {
  .planes-grid { grid-template-columns: repeat(3, 1fr); }
}
.plan-card {
  position: relative;
  background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%);
  border: 2px solid #334155;
  border-radius: 16px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  transition: all .25s ease;
  cursor: pointer;
}
.plan-card:hover {
  transform: translateY(-4px);
  border-color: #3b82f6;
  box-shadow: 0 8px 24px rgba(59,130,246,.2);
}
.plan-card.destacado {
  border-color: #fbbf24;
  background: linear-gradient(145deg, #1e293b 0%, #422006 100%);
}
.plan-card.destacado:hover {
  border-color: #fbbf24;
  box-shadow: 0 8px 24px rgba(251,191,36,.3);
}
.plan-card.selected {
  border-color: #22c55e;
  background: linear-gradient(145deg, #052e16 0%, #14532d 100%);
}
.plan-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: #fbbf24;
  color: #000;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .5px;
}
.plan-nombre {
  font-size: 22px;
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 4px;
}
.plan-precio {
  font-size: 28px;
  font-weight: 900;
  color: #22c55e;
  margin-bottom: 4px;
}
.plan-precio small {
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
}
.plan-precio.gratis {
  color: #fbbf24;
}
.plan-desc {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 16px;
  min-height: 36px;
}
.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  flex: 1;
}
.plan-features li {
  padding: 8px 0;
  font-size: 13px;
  color: #cbd5e1;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-bottom: 1px solid #1e293b;
}
.plan-features li:last-child { border-bottom: none; }
.plan-features li::before {
  content: '✓';
  color: #22c55e;
  font-weight: 900;
  flex-shrink: 0;
}
.plan-btn {
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all .2s;
  background: #334155;
  color: #f1f5f9;
}
.plan-btn:hover { background: #475569; }
.plan-btn.primary {
  background: #3b82f6;
  color: #fff;
}
.plan-btn.primary:hover { background: #2563eb; }
.plan-btn.selected {
  background: #22c55e;
  color: #000;
}
.plan-btn.destacado {
  background: #fbbf24;
  color: #000;
}
.plan-btn.destacado:hover { background: #f59e0b; }
.plan-loading {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
}
</style>
`;

  function inyectarEstilos() {
    if (!document.getElementById('planes-cards-css')) {
      document.head.insertAdjacentHTML('beforeend', ESTILOS);
    }
  }

  function renderizar(plans, modo, planSeleccionado, onSelect) {
    return plans.map(p => {
      const seleccionado = planSeleccionado === p.id;
      const esDestacado = p.destacado && modo === 'register';
      const precio = Number(p.precio_usd) === 0
        ? '<span class="plan-precio gratis">Gratis</span>'
        : `<div class="plan-precio">$${Number(p.precio_usd).toFixed(0)}<small>/mes</small></div>`;
      
      let btnTexto, btnClase;
      if (modo === 'register') {
        btnTexto = seleccionado ? '✓ Seleccionado' : 'Elegir ' + p.nombre;
        btnClase = seleccionado ? 'selected' : (esDestacado ? 'destacado' : 'primary');
      } else {
        btnTexto = 'Solicitar upgrade';
        btnClase = 'primary';
      }

      return `
        <div class="plan-card ${esDestacado ? 'destacado' : ''} ${seleccionado ? 'selected' : ''}" data-plan-id="${p.id}">
          ${esDestacado ? '<div class="plan-badge">⚡ MÁS POPULAR</div>' : ''}
          <h3 class="plan-nombre">${p.nombre}</h3>
          ${precio}
          <div class="plan-desc">${p.descripcion || ''}</div>
          <ul class="plan-features">
            ${(p.features || []).map(f => '<li>' + f + '</li>').join('')}
          </ul>
          <button class="plan-btn ${btnClase}" data-plan-id="${p.id}">${btnTexto}</button>
        </div>
      `;
    }).join('');
  }

  async function cargarPlanes(container, modo, planActual, onSelect) {
    inyectarEstilos();
    container.innerHTML = '<div class="plan-loading">Cargando planes...</div>';
    
    try {
      const r = await fetch(API + '/api/public/plans');
      const d = await r.json();
      if (!d.ok || !d.plans || d.plans.length === 0) {
        container.innerHTML = '<div class="plan-loading" style="color:#f87171">No se pudieron cargar los planes.</div>';
        return;
      }

      let seleccion = planActual || 'basico';
      container.innerHTML = '<div class="planes-grid">' + renderizar(d.plans, modo, seleccion, onSelect) + '</div>';

      // Bind clicks
      container.querySelectorAll('[data-plan-id]').forEach(el => {
        el.onclick = (e) => {
          e.preventDefault();
          const id = el.getAttribute('data-plan-id');
          if (modo === 'register') {
            seleccion = id;
            container.innerHTML = '<div class="planes-grid">' + renderizar(d.plans, modo, seleccion, onSelect) + '</div>';
            // Rebind
            container.querySelectorAll('[data-plan-id]').forEach(el2 => {
              el2.onclick = el.onclick;
            });
            if (onSelect) onSelect(id, d.plans.find(p => p.id === id));
          } else if (modo === 'upgrade' && onSelect) {
            onSelect(id, d.plans.find(p => p.id === id));
          }
        };
      });

      // Default selection callback
      if (onSelect && modo === 'register') {
        onSelect(seleccion, d.plans.find(p => p.id === seleccion));
      }
    } catch(e) {
      container.innerHTML = '<div class="plan-loading" style="color:#f87171">Error: ' + e.message + '</div>';
    }
  }

  // API pública
  window.ComdiazPlanes = {
    cargarEn: cargarPlanes
  };

  // Auto-init: cualquier <div id="planesContainer"> se rellena solo
  document.addEventListener('DOMContentLoaded', () => {
    const c = document.getElementById('planesContainer');
    if (c) {
      const modo = c.getAttribute('data-mode') || 'register';
      const actual = c.getAttribute('data-actual') || 'basico';
      cargarPlanes(c, modo, actual, (id, plan) => {
        // Guardar selección en localStorage para que el register la use
        try { localStorage.setItem('comdiaz_plan_seleccionado', id); } catch(_) {}
        // Emitir evento
        c.dispatchEvent(new CustomEvent('plan-selected', { detail: { id, plan } }));
      });
    }
  });

  console.log('✅ Planes-cards ready');
})();
