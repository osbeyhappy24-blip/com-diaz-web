# Comdiaz — Roadmap

## ✅ Completado (23/10/2026)

### Panel Admin Vendedores (Bloque 9C+D)
- [x] Panel `/home.html` con stats, tabs, aprobar/rechazar/suspender
- [x] Modal detalles + WhatsApp admin
- [x] `sellers-admin.js` con auto-refresh, badge, notas
- [x] Fix vista `vendedores` en `VIEWS` + CSS

### Panel Vendedor (Bloque 9D)
- [x] `seller.html`: registro con comparador de planes
- [x] `seller-panel.html`: cuota, plan, productos
- [x] Carga masiva: N fotos → N formularios (1 foto = 1 producto)
- [x] Compresión cliente (JPEG 1200px @82% ~150KB)
- [x] Upload con delay 2.5s (evita rate limit)
- [x] Retry automático en 429, preserva 401
- [x] Timeout 20s + fallback visible

### Planes (Bloque 9B.5)
- [x] 3 planes: Básico (50/$0), Pro (200/$5), Premium (∞/$15)
- [x] Endpoint público `/api/public/plans`
- [x] Register respeta plan_id
- [x] Features calculadas por plan_id (sin columnas extra en DB)

### WhatsApp por producto (P0)
- [x] Endpoint `/api/public/seller-contact`
- [x] Rate limit 10/min por IP
- [x] Interceptor en `shop.js` — usa teléfono del vendedor
- [x] Local vs seller: cada uno abre su WhatsApp

### Escalabilidad + TWA (P0)
- [x] Rate limit upload por sellerId (no por IP)
- [x] WhatsApp TWA-aware (`whatsapp://` en APK)
- [x] Links internos sin Custom Tab
- [x] Fix bug `?text=` → `&text=`

### Auditoría + Coherencia
- [x] Purga `CAP_MAX = CATALOG_CAP` (5000)
- [x] Admin sellers resuelve plan + cuota_max
- [x] Endpoint `/api/admin/sellers/:id/products`
- [x] IA persistida en `state` + save debounced

## 🔒 Pendiente siguiente sesión

### Prioridad ALTA
- [ ] **Notificaciones in-app** (bandeja + badge + toast)
  - Vendedor recibe al aprobar/suspender
  - Vendedor recibe cuando plan está por vencer
  - Compradores reciben de productos nuevos
- [ ] **Caducidad de planes + job diario**
  - Al aprobar plan pago → `plan_expira_at = now + 30d`
  - Cron: si `plan_expira_at < now` → bajar a básico + notificar
  - Grace period 3 días antes
- [ ] **Shop rediseño auténtico cubano**
  - Más cubana, única, fluida
  - Quitar TEMU, Amazon genéricos
  - Solo eBay para importados + buscador propio
  - Card de vendedores "palpitante"
  - Monetización: destacados en primera fila

### Prioridad MEDIA
- [ ] Admin: notas internas editables (modal las muestra pero no edita)
- [ ] Admin: log de auditoría (quién aprobó/suspendió/cuándo)
- [ ] Caducidad tokens JWT con refresh (hoy 30 días fijos)
- [ ] Validar MIME real de imágenes (hoy solo extensión)

### Prioridad BAJA
- [ ] 2FA para admin
- [ ] Rotación automática del PIN admin
- [ ] Push notifications Web (VAPID ya configurado en backend)
- [ ] Exportar CSV de vendedores

## 📏 Reglas del proyecto
- Nada de lo hecho se pierde — cambios aditivos con backup
- Cache-busters en cada deploy (`?v=N`)
- Verificar en prod con curl antes de dar por cerrado
- Test E2E reutilizable: `bash ~/comdiaz/test-e2e.sh`
- Auditoría reutilizable: `bash ~/comdiaz/audit.sh`
- Auditoría crones: `bash ~/comdiaz/audit-crons.sh`
