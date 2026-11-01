# Comdiaz Admin — Estado actual (30 Oct 2026)

## Lo que funciona en Admin

### Header
- Logo + "Panel de administración"
- Botón 🔑 (cambiar PIN)
- Botón ⎋ (logout)

### Tab Inicio
- Stats: 10 productos, 37 categorías
- Card Categorías (editable)
- Card Resultados (productos locales)
- Card Accesos (histórico login)

### Tab Productos
- Lista completa con: foto, título, precio, stock
- Botones: Editar, Ocultar, Eliminar

### Tab Locales
- Filtros: provincia/municipio/estado/búsqueda
- Botones: Nuevo producto, Carga masiva (IA)
- 10 productos actuales:
  - Batidora Hamilton ($30)
  - Cafetera de Inducción ($12)
  - Ventilador F22 ($100)
  - Casuelas de Inducción ($35)
  - 6× Colonia Árabe ($5)

### Tab Vendedores
- Stats: Pendientes, Aprobados, Suspendidos, Productos
- Tabs: Pendientes/Aprobados/Suspendidos/Todos
- Botón Actualizar
- Pagos pendientes (0)
- Referidos (0)

### Tab Pedidos
- Filtros: Todos, Pendiente, Pagado, Tránsito, Cuba, Listo
- Lista de pedidos (0 actualmente)

### Tab Análisis
- **Visitantes:** Apps instaladas, Activos 7 días, Solo web, Pedidos, Tasa conversión
- **Visitas:** Hoy (2), 7 días (21), 30 días (21), Total (21)
- **Top 5 productos más vistos** (Lacoste, Colonia Árabe)
- **Fuentes de tráfico** (con ?ref=)
- **Tesorería:** Ingresos, Egresos, Ganancia, Movimientos
- Botones: Exportar JSON, Exportar PDF, Nuevo movimiento

### Configuración
- Nombre tienda: "Comdiaz Shop"
- Subtítulo
- WhatsApp: 5351425691
- Horario: Lun-Sab 9:00am - 9:00pm
- Banner promociones (activable)
- 🌐 Promociones rotativas (5 activas)
- Rotación cada 4 segundos
- Barra envío gratis (activable)
- Modo advertencia amarillo
- Botón Guardar cambios
- Botón Abrir Comdiaz Shop

## Lo que se eliminó (Fase A/B/L1/L2/L3)

- ❌ Iniciar/Pausar automatización
- ❌ Buscar ahora
- ❌ Compartir resumen
- ❌ Margen de ganancia
- ❌ Fuentes de productos
- ❌ Import Hub (Temu/Amazon/Walmart)
- ❌ Tab Importar
- ❌ Máximo de productos (input huérfano pendiente)
- ❌ Publicar todos / Vaciar catálogo
- ❌ Búsquedas hoy / Productos hoy / Resúmenes / Sesión activa
- ❌ Consumo de datos / Últimas búsquedas / Actividad de red
- ❌ Card Monitoreo IA
- ❌ Card Publicaciones rápidas
- ❌ Horarios de publicación

## Bugs menores conocidos

1. ⚠️ "Error de sync · reintentando" — SW sigue llamando /api/state (no bloquea)
2. "Máximo de productos: 200" — input huérfano pendiente de eliminar
3. "ia_local_desc" en activity — histórico, no hace nada
4. HTML desbalanceado (div 255/256, label 46/45) — no rompe navegación

## Lo que viene (FASE C — Seller)

### Objetivo
Convertir Comdiaz en marketplace de vendedores cubanos con tiendas propias.

### Arquitectura
- `comdiaz.provolt.cloud` → frontend público
- `admin.comdiaz.provolt.cloud` → admin (opcional)
- `[slug].comdiaz.provolt.cloud` → tienda de cada seller

### Features
- [ ] Tabla `tiendas` (id, seller_id, slug, nombre, logo, banner, color)
- [ ] Endpoint `/api/seller/crear-tienda`
- [ ] Página `/tienda/:slug` (sala pública del seller)
- [ ] Página `/producto/:id` (link directo)
- [ ] En cada card de producto: badge "🏪 [Nombre tienda]"
- [ ] Link compartible por producto
- [ ] Link compartible por tienda
- [ ] Panel seller: "Ver mi tienda" + "Compartir mi tienda"
- [ ] Subdominios wildcard DNS

### Reference: Nidazo (competencia)
- 1.200 usuarios Cuba
- Gratis hasta 10 productos
- Planes 599-1.999 pesos/mes
- **Comdiaz ventaja:** subdominios + links directos + push

### Planes actuales (mantener)
- Básico: 50 productos (gratis)
- Pro: 200 productos ($5)
- Premium: ilimitado ($15)

### Base de datos (Supabase)
- Tabla `sellers` (ya existe en backend)
- Tabla `seller_products` (ya existe)
- Nueva: tabla `tiendas`
