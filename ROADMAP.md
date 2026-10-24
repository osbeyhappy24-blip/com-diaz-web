# Comdiaz — Roadmap

## ✅ Completado (Sesión 23-24 Oct)

### Notificaciones in-app + push (100%)
- [x] Badge en header con contador de no leídas
- [x] Panel dropdown con iconos por tipo
- [x] Toast in-app al llegar nuevas (polling 60s)
- [x] Tiempo relativo ("hace 5 min", "ayer")
- [x] Swipe to dismiss + botón ✕
- [x] Web Push a barra Android con icono Shop + vibración
- [x] Click en notif → abre panel directo
- [x] Endpoints: subscribe, unsubscribe, list, count, read, read-all
- [x] Auto-notif al aprobar/suspender seller
- [x] Diagnóstico `#debugpush` visible en pantalla

### Bugs críticos de persistencia resueltos
- [x] `guardarEnNube()` no persistía: sellerSubscriptions, notifications,
  aiUsageCounters, shopStats, deletedHistory, sre
- [x] `cargarDesdeNube()` no los cargaba al startup
- [x] `save()` sin queue → race conditions
- [x] `notifications` faltaba en DEFAULTS
- [x] **Cada redeploy borraba suscripciones y notificaciones** ← RESUELTO

### Panel vendedor (100%)
- [x] Login, cuota, plan, estado
- [x] Carga masiva: N fotos → N formularios (delay 2.5s + retry 429)
- [x] Compresión cliente (JPEG 1200px @82%)
- [x] Comparador de 3 planes en registro
- [x] Backend respeta plan_id elegido
- [x] Panel con timeout 20s + retry visible

### Panel admin vendedores (100%)
- [x] Stats, tabs, aprobar/suspender
- [x] Modal detalle + WhatsApp
- [x] Endpoint `/api/admin/sellers/:id/products`
- [x] Endpoint `/api/admin/notifications`
- [x] Endpoint `/api/admin/push-subs`
- [x] Endpoint `/api/admin/push/test`

### WhatsApp por producto (100%)
- [x] `/api/public/seller-contact` con validación UUID
- [x] Rate limit 10/min por IP
- [x] Shop usa teléfono del vendedor (no global)
- [x] TWA-aware: `whatsapp://` en APK

### Auditoría + seguridad (100%)
- [x] Purga con `CATALOG_CAP` = 5000 (coherencia)
- [x] Rate limit upload por sellerId (30/min) no por IP
- [x] Fix CORS preflight Authorization
- [x] IA persistida en state + save debounced (5s)
- [x] Sellers test suspendidos (limpieza)

## 🔒 Próxima sesión

### Prioridad ALTA
- [ ] **Memory leaks:** `rateLimitMap` y `failMap` crecen sin límite
  - Fix: cron cada 1h que limpia entradas expiradas (10 min)
- [ ] **Save queue completo:** validar que no hay condiciones de carrera
  bajo carga (15 min)
- [ ] **Caducidad de planes + cron diario**
  - `plan_expira_at = now + 30d` al aprobar plan pago
  - Job diario: si expiró → bajar a básico + notificar
  - Grace period 3 días antes
- [ ] **Shop rediseño auténtico cubano**
  - Más cubana, única, fluida
  - Quitar TEMU/Amazon genéricos
  - Solo eBay + buscador para importados
  - Card de vendedores "palpitante"
  - Monetización: destacados primera fila

### Prioridad MEDIA
- [ ] Notas internas admin editables (modal las muestra pero no edita)
- [ ] Log de auditoría admin (quién aprobó/suspendió/cuándo)
- [ ] Notificaciones a compradores (productos nuevos)
- [ ] Validar MIME real de imágenes (hoy solo extensión)

### Prioridad BAJA
- [ ] 2FA admin
- [ ] Rotación automática PIN admin
- [ ] Exportar CSV vendedores
- [ ] Sonido custom en push (requiere recompilar TWA en Android Studio)

## 📏 Reglas del proyecto
- Nada de lo hecho se pierde — cambios aditivos con backup
- Cache-busters en cada deploy (`?v=N`)
- Verificar en prod con curl antes de dar por cerrado
- Scripts reusables:
  - `bash ~/comdiaz/test-e2e.sh` — test backend end-to-end
  - `bash ~/comdiaz/audit.sh` — auditoría general
  - `bash ~/comdiaz/audit-crons.sh` — auditoría crones
- **⚠️ CRÍTICO:** cada push = redeploy Render → solo pushear cuando esté todo verificado

## 🧪 Estado actual verificado (24 Oct)
- 1 seller aprobado (Osbey)
- 3 sellers suspendidos (test)
- 1 suscripción push activa
- 0 notificaciones pendientes (recién leídas)
- 5232 productos eBay (bajo cap 5000 activos)
- 10 productos manuales (Colonia Árabe)
- 8 API keys IA (12,000 llamadas/día)
