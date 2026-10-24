# Comdiaz — Roadmap

## ✅ Completado (Sesión 23-24 Oct)

### Notificaciones in-app + push
- [x] Badge + panel + toast + swipe + tiempo relativo
- [x] Web Push Android: icono Shop + vibración + sonido + click→panel
- [x] Persistencia: sobrevive redeploys (bug crítico resuelto)
- [x] Aislamiento: cada vendedor recibe solo lo suyo

### Monetización con caducidad
- [x] 3 planes: Básico (50/$0), Pro (200/$5), Premium (∞/$15)
- [x] Renovación: /api/admin/sellers/:id/renew +30d
- [x] Ciclo: 7/3/1 días aviso → gracia 24h → suspendido_pago
- [x] Overlay bloqueante (mensaje "no pierdes nada")
- [x] Botón Renovar → WhatsApp admin
- [x] Cron diario 09:00 aplica avisos + suspensión
- [x] Banner dinámico 5 urgencias + badge X días

### Panel vendedor
- [x] Login, cuota, plan, estado, productos
- [x] Carga masiva N fotos → N formularios (delay 2.5s + retry 429)
- [x] Compresión cliente (JPEG 1200px @82%)
- [x] Comparador 3 planes en registro
- [x] Timeout 20s + retry visible

### Panel admin vendedores
- [x] Stats frescos (manuales + sellers + suspendido_pago)
- [x] Tabs aprobar/rechazar/suspender
- [x] Modal detalle + WhatsApp
- [x] Endpoints: stats, sellers, products, notifications,
  push-subs, push/test, force-expiry, reset-ratelimit

### WhatsApp por producto
- [x] /api/public/seller-contact con validación UUID
- [x] Rate limit 10/min por IP
- [x] Shop usa teléfono del vendedor, no global
- [x] TWA-aware: whatsapp:// en APK

### Auditoría + seguridad
- [x] Rate limit upload por sellerId (30/min)
- [x] CORS preflight Authorization
- [x] IA persistida en state + save debounced
- [x] Purga con CATALOG_CAP=5000 coherente
- [x] password_hash nunca expuesto
- [x] Soft delete (productos preservados en DB)

### Memory leaks + consistencia
- [x] Cron 1h limpia rateLimitMap, failMap, loginAttempts
- [x] save() con queue serial (no race conditions)
- [x] 6 campos persistidos (subs, notifs, aiUsage, shopStats, history, sre)
- [x] Stats admin calcula en vivo

## 🔒 PRÓXIMAS SESIONES

### 🎨 PRIORIDAD 1 — Shop rediseño auténtico cubano
- Más cubana, única, fluida
- Quitar TEMU/Amazon genéricos
- Solo eBay + buscador para importados
- Card de vendedores "palpitante"
- Monetización: destacados primera fila
- Performance: caché 30s /api/public/local
- Métrica: carga <3s, 0 timeouts

### 💳 Método de pago
- Renovación cada 30 días
- Avisos 7/3/1d → gracia 24h → suspendido_pago
- Reactivación: pago → estado aprobado + plan_expira_at+30d
- Métodos (a definir): transferencia, Zelle/PayPal, CUP, USDT, WhatsApp
- Admin verifica cada pago (sin auto-aprobación)
- Log de pagos en tabla payments

### 🎁 Sistema de referidos (bonus +cuota)
**Reglas:**
- Compartir en grupo FB → +5 prod (3/mes)
- Compartir en grupo WA → +5 prod (3/mes)
- Verificado por admin → +10 prod (1/semana)
- Tope mensual +50 productos

**Anti-fraude:**
- Link único ?ref=<sellerId>
- Validación: no mismo grupo dos veces
- Bonus solo cuando NUEVO vendedor se registra vía link
- Cap total aunque comparta 100 veces
- No reemplaza plan pago (solo suma)

**Implementación futura:**
- Campo referral_code, referred_by, bonus_quota en sellers
- Cron mensual: reset bonus
- Notificación: "¡Ganaste +5 productos!"
- Dashboard admin de referidos
- Viralidad orgánica

## 📊 Estado verificado (24 Oct)

Sellers:
- 0 pendientes / 1 aprobado (Osbey, Pro, 200 cuota, expira 23/11) / 3 suspendidos

Productos:
- 10 manuales (Colonia Árabe) ↔ admin y público ven lo mismo
- 0 sellers activos (Osbey tiene 3 inactivos - soft delete)
- Total público: 10

Sistema:
- Push subs: 1 activa (Osbey)
- Notificaciones: 7 preservadas
- eBay: 5232 productos (bajo cap 5000 activos)
- IA: 8 keys, 12,000 llamadas/día
- Backend responde <1s (health 401)

## 📋 Backlog media/baja prioridad
- [ ] Log auditoría admin (quién aprobó/cuándo)
- [ ] Notas internas admin editables
- [ ] Notificaciones a compradores (productos nuevos)
- [ ] Validar MIME real de imágenes
- [ ] Caché /api/public/local
- [ ] 2FA admin
- [ ] Rotación PIN admin
- [ ] Exportar CSV vendedores
- [ ] Sonido custom push (requiere recompilar TWA)

## 📏 Reglas del proyecto
- Nada de lo hecho se pierde
- Cambios aditivos con backup
- Cache-busters en cada deploy (?v=N)
- Verificar en prod con curl antes de cerrar
- ⚠️ CRÍTICO: cada push = redeploy Render

## 🧪 Scripts reusables
- bash ~/comdiaz/test-e2e.sh — backend end-to-end
- bash ~/comdiaz/audit.sh — auditoría general
- bash ~/comdiaz/audit-crons.sh — auditoría crones
- bash ~/comdiaz/audit-full.sh — auditoría completa 13 secciones

## 🔧 Endpoints admin útiles
- POST /api/admin/reset-ratelimit — limpia maps
- POST /api/admin/sellers/:id/renew — renueva +30d
- POST /api/admin/sellers/:id/force-expiry — test caducidad (días)
- GET /api/admin/push-subs — ver suscripciones
- GET /api/admin/notifications — ver notificaciones

---

## ✅ Auditoría Completa — Sesión 24 Oct

### Seguridad
- [x] Rate limit login: 5 intentos / 15 min por IP+teléfono
- [x] Rate limit register: 3 registros / hora por IP
- [x] Rate limit upload: 30/min por sellerId (5 anón)
- [x] Errores 500 sin stack traces
- [x] password_hash nunca expuesto
- [x] CORS preflight acepta Authorization
- [x] Validación de esquemas en register (400 no 500)
- [x] Sin IDOR (endpoints validan seller_id)

### SEO
- [x] og:title, og:description, og:image
- [x] twitter:card + twitter:title + twitter:image
- [x] theme-color cubano (#003f7f)
- [x] apple-mobile-web-app-title
- [x] keywords + author
- Compartir en WhatsApp/FB muestra preview correcta

### Consistencia Visual
- [x] Fuentes unificadas: de 20+ a 10 tamaños
  (10/11/12/13/14/16/18/20/24/28/32)
- [x] Colores hardcodeados → var(--card)/var(--bg)
- [x] 38 usos de variables CSS (antes ~6)
- [x] Todos los colores centralizados en :root

### Performance
- [x] /api/public/local responde 0.5-0.9s (bajo 3s requerido)
- [x] Service Worker network-first para CSS/JS
- [x] Cache v7 (invalida caché viejo de v6)
- [x] HTML network-first
- [x] SW no cachea /api/seller ni /api/admin

### Bugs Resueltos
- [x] Persistencia de subs push y notificaciones (6 campos)
- [x] save() con queue serial (no race conditions)
- [x] Stats admin calcula en vivo (no cache)
- [x] Memory leaks prevenidos (cron 1h)
- [x] Service Worker stale-while → network-first

## 📊 Estado Actual Verificado

| Métrica | Valor |
|---|---|
| Backend health | 401 en <1s |
| Login rate limit | 6º intento → 429 ✅ |
| Register rate limit | 4º registro → 429 ✅ |
| Upload rate limit | 5º anónimo → 429 ✅ |
| SEO meta tags | 7+ propiedades OG/Twitter |
| Tamaños fuente | 10 únicos (de 20+) |
| Variables CSS | 38 usos (de ~6) |
| /api/public/local | 0.5-0.9s |
| Soft delete | 3 productos Osbey inactivos |
| Push subs | 1 activa (Osbey) |
| Notificaciones | 7 preservadas |
| eBay products | 5232 (bajo cap 5000 activos) |
| IA keys | 8 (12,000 llamadas/día) |

---

## ✅ Sistema de Pagos — COMPLETADO (24 Oct)

### Flujo end-to-end verificado
- [x] Vendedor: modal de renovación con métodos dinámicos
- [x] Métodos: Zelle / USDT (TRC20) / CUP (editables por admin)
- [x] Envío: crea pago pendiente + abre WhatsApp al admin
- [x] Admin: sección "💳 Pagos pendientes" con badge
- [x] Admin: aprobar → activa plan +30d automáticamente
- [x] Admin: rechazar → pide motivo + notifica al vendedor
- [x] Notif Telegram al admin al crear pago
- [x] Notif in-app + push al vendedor al aprobar
- [x] Pago queda con auditoría: aprobado_at, aprobado_por

### Backend (7 endpoints)
- [x] GET /api/seller/payment/options
- [x] POST /api/seller/payment/request
- [x] GET /api/seller/payments
- [x] GET /api/admin/payments?estado=
- [x] POST /api/admin/payments/:id/approve
- [x] POST /api/admin/payments/:id/reject
- [x] GET/PUT /api/admin/payment-methods

### Storage y estado
- [x] state.payments (JSON, cap 1000)
- [x] paymentMethods en shopConfig (editable)
- [x] Notif tipos: pago_pendiente, pago_aprobado, pago_rechazado

### Validado en producción
- [x] Pago de Osbey: $5 Zelle → aprobado 24/10
- [x] Plan activo hasta 23/11/2026
- [x] Notificaciones + push llegaron al vendedor

### Bugs resueltos en el camino
- [x] z-index modal (era 10002 < overlay 99999 → quedaba oculto)
- [x] Alerts multi-línea rompían el `<script>` (0x0a literales)
- [x] Fallback duplicado de abrirPaymentModal sobrescribía con undefined
- [x] onclick renovarPlan() viejo (WhatsApp) → abrirPaymentModal() (modal)
- [x] Sección HTML #paymentsAdminCard faltaba (JS la buscaba sin éxito)
- [x] Overlay de suspensión bloqueaba visualmente el modal de pago

## 🔒 Siguiente — Sistema de Referidos (bloque C, ~75 min)

**Reglas:**
- Compartir en grupo FB → +5 prod (3/mes)
- Compartir en grupo WA → +5 prod (3/mes)  
- Verificado por admin → +10 prod (1/semana)
- Tope mensual: +50 productos

**Anti-fraude:**
- Link único ?ref=<sellerId>
- Validación: no mismo grupo dos veces
- Bonus solo cuando NUEVO vendedor se registra vía link + es aprobado
- Cap total aunque comparta 100 veces
- No reemplaza plan pago (solo suma)

**Implementación:**
- Campos en sellers: referral_code, referred_by, ref_count, ref_bonus_quota, ref_last_reset
- POST /api/seller/referral/generate → genera link
- GET /api/seller/referral → stats
- POST /api/seller/register → acepta referred_by
- Al aprobar vendedor: +5 al que lo refirió (si válido)
- Cron mensual: reset ref_count, mantener bonus_quota
- Dashboard admin de referidos
