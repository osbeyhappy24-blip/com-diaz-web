# Comdiaz Shop — Roadmap

## ✅ COMPLETADO (Sesión 23-24 Oct 2026)

### 🎨 Rediseño Shop cubano
- [x] Paleta cubana: azul colonial #003f7f, rojo #dc2626, amarillo sol #fbbf24
- [x] Hero banner con buscador destacado
- [x] Header vivo: 4 botones animados (Vender/Pedidos/Carrito/WhatsApp)
- [x] Tabs: Todo 🌎 / Locales 🇨🇺 / Importados 🌐
- [x] Cards con badge por tipo + avatar flotante para sellers
- [x] Promociones arriba con shine animado
- [x] Destacados automáticos con badge ⭐
- [x] SEO completo: og:title, og:image, twitter:card

### 📸 Panel vendedor
- [x] Login, cuota, plan, estado
- [x] Carga masiva: N fotos → N formularios (delay 2.5s + retry 429)
- [x] Compresión cliente (JPEG 1200px @82% ~150KB)
- [x] Comparador 3 planes en registro
- [x] Timeout 20s + retry visible
- [x] Modal de renovación con métodos dinámicos
- [x] Sección "🎁 Comparte y gana" (referidos)

### 🔔 Notificaciones completas
- [x] In-app: badge + panel + toast + swipe + tiempo relativo
- [x] Web Push Android: icono Shop + vibración + sonido
- [x] Persistencia: sobrevive redeploys
- [x] Aislamiento: cada vendedor recibe solo lo suyo
- [x] 10 tipos: aprobado, suspendido, plan_*, pago_*, referral_bonus

### 💳 Sistema de pagos
- [x] Modal con Zelle / USDT / CUP
- [x] Flujo: solicitar → WhatsApp admin → aprobar → +30d
- [x] Cola admin con badge
- [x] 7 endpoints: options, request, list, approve, reject, methods GET/PUT
- [x] Notificación Telegram al admin al crear
- [x] Notif in-app + push al aprobar

### 🎁 Sistema de referidos
- [x] Código determinístico (sobrevive redeploys)
- [x] Link único: seller.html?ref=CODIGO
- [x] Registro con referred_by_code
- [x] Resolución lazy al aprobar (fix robusto)
- [x] +5 productos por referido aprobado
- [x] Cap: 3/mes, tope +50 acumulado
- [x] Dashboard admin con ranking 🥇🥈🥉
- [x] Endpoint repair para casos edge

### 💰 Monetización con caducidad
- [x] 3 planes: Básico (50/$0), Pro (200/$5), Premium (∞/$15)
- [x] Ciclo: 7/3/1 días aviso → gracia 24h → suspendido_pago
- [x] Cron diario 09:00
- [x] Banner dinámico 5 urgencias + overlay bloqueante
- [x] Botón Renovar → modal de pago
- [x] Force-expiry para tests

### 🔒 Seguridad
- [x] Rate limit login: 5/15min por IP+teléfono
- [x] Rate limit register: 3/hora por IP
- [x] Rate limit upload: 30/min por sellerId
- [x] CORS preflight Authorization
- [x] password_hash nunca expuesto
- [x] Errores sin stack traces

### 🧹 Robustez
- [x] Persistencia 6 campos críticos (subs, notifs, aiUsage, shopStats, deletedHistory, sre)
- [x] save() con queue serial
- [x] Cron 1h limpia rateLimitMap/failMap/loginAttempts
- [x] Stats admin calcula en vivo (no cache)
- [x] Service Worker network-first para CSS/JS

### 📱 WhatsApp por producto
- [x] /api/public/seller-contact con validación UUID
- [x] Rate limit 10/min por IP
- [x] Shop usa teléfono del vendedor
- [x] TWA-aware: whatsapp:// en APK

---

## 📊 Estado actual (24 Oct 2026, 23:00)

| Métrica | Valor |
|---|---|
| Sellers aprobados | 1 (Osbey Díaz - Pro) |
| Sellers suspendidos | 7 (tests) |
| Productos activos | 11 (10 manuales + 1 seller) |
| Push subs activas | 1 |
| Referidos activos | 1 (Osbey con +5) |
| Pagos procesados | 1 ($5 Pro Osbey) |
| Notificaciones | 10 históricas |
| eBay products | 5232 (bajo cap 5000 activos) |

---

## 🔴 PRÓXIMA SESIÓN — Prioridad alta

### 1. Diagnóstico push Android (bloqueante para UX)
**Problema:** FCM acepta (201) pero Android no muestra la notificación en TWA.
**Plan:**
- [ ] Verificar Service Worker en `chrome://inspect`
- [ ] Test notificación local (sin backend) para aislar
- [ ] Verificar permisos Android de la APK (Notificaciones ON + Sin restricciones de batería)
- [ ] **Si es bug de TWA:** recompilar con PWABuilder actualizado o Bubblewrap
- [ ] **Alternativa práctica:** documentar que vendedores usen PWA (Chrome) para push, APK para gestión

### 2. APK admin completa (dashboard)
**Faltantes identificados:**
- [ ] Editor de métodos de pago (Zelle/USDT/CUP editables desde UI)
- [ ] Dashboard financiero (ingresos por plan, proyección)
- [ ] Ver productos de cada vendedor (modal desde lista)
- [ ] Editar notas internas del vendedor
- [ ] Log de auditoría (quién aprobó/cuándo/qué acción)
- [ ] Historial completo de pagos (no solo pendientes)
- [ ] Historial de notificaciones por seller
- [ ] Detección de abuso (mismo IP múltiples sellers)
- [ ] Exportar CSV (vendedores, pagos, productos, referidos)
- [ ] Preview del banner de la Shop en tiempo real
- [ ] Editor de categorías
- [ ] Ver productos ocultos (inactivos de sellers suspendidos)
- [ ] Reactivar vendedor suspendido_pago manualmente

### 3. IA en procesos (expandir uso)
**Ya implementado:**
- [x] Descripción de productos (auto)
- [x] Título optimizado (aiTitulo)
- [x] Banners promocionales
- [x] Copiloto (chat asistente)

**A implementar:**
- [ ] Sugerencia de precio óptimo (comparar con eBay)
- [ ] Análisis de competencia
- [ ] Predicción de ventas (basado en histórico)
- [ ] Detección de fraude (patrones sospechosos)
- [ ] Traducción auto eBay inglés → español
- [ ] Respuesta automática a mensajes de compradores
- [ ] Resumen de perfil vendedor ("vende motos, precio promedio $80")
- [ ] Auto-categorización de productos

---

## 🟡 PRÓXIMAS SESIONES — Prioridad media

### 4. Notificaciones a compradores (diseñado)
**Diseño aprobado:**
- Agrupación por provincia (no 1x1 por producto)
- Resumen cada 12h: "25 productos nuevos en La Habana"
- Cap 2/día por comprador
- Cooldown 4h entre notificaciones
- Filtro: solo productos con imagen + precio > 0

**Auto-activar (limitación Chrome Android):**
- Chrome Android NO permite activar sin user gesture
- Popup estratégico al 3er producto visto
- Incentivo claro: "Recibe ofertas de tu provincia"
- Recordatorio suave cada 7 días si no acepta

**Fases (4 bloques, ~2h total):**
1. Backend subscribe-buyer + tracking provincia
2. Cron agrupador cada 12h
3. Frontend popup estratégico
4. Test end-to-end

**Escalado FCM:** 500k/día límite → 10k compradores × 2/día = 20k/día → OK año 1

### 5. Destacados pagados (nueva monetización)
- [ ] Vendedor paga $1 para destacar producto 7 días
- [ ] Admin aprueba destacado
- [ ] Producto va a `featuredSection` del Shop
- [ ] Badge ⭐ DESTACADO pulsante
- [ ] Tracking de vistas por destacado

### 6. Métodos de pago configurables
- [ ] Editor en admin: cambiar Zelle email, USDT address, CUP instrucciones
- [ ] Activar/desactivar métodos
- [ ] Historial de cambios

---

## 🟢 BACKLOG — Prioridad baja

### Seguridad avanzada
- [ ] 2FA para admin (Google Authenticator)
- [ ] Rotación automática del PIN admin
- [ ] Verificar email al registrar (opcional)
- [ ] Log de accesos admin (IP, hora)
- [ ] Detección de duplicados (mismo producto 2 sellers)

### Capacidad (mes 3-6)
- [ ] Bump cap `state.notifications` 500 → 2000
- [ ] Bump cap `state.sellerSubscriptions` 500 → 5000
- [ ] Migrar notifs/subs a Supabase si crece >50% capacidad
- [ ] Cron limpiador (borrar notifs viejas >30d)
- [ ] Caché 30s en `/api/public/local` si crece >10k productos

### Rendimiento
- [ ] Caché Redis para endpoints frecuentes (opcional)
- [ ] Índices Supabase (`seller_products(publicado, activo)`, `sellers(estado)`)
- [ ] Lazy loading de imágenes en Shop
- [ ] Preload de fuentes críticas

### UX mejoras
- [ ] Sonido custom en push (requiere recompilar TWA)
- [ ] Modo oscuro en Shop
- [ ] Favoritos/wishlist para compradores
- [ ] Historial de pedidos mejorado
- [ ] Chat interno comprador-vendedor (alternativa a WhatsApp)

---

## 🚨 Riesgos y límites técnicos conocidos

### Push Android en TWA
**Estado:** FCM acepta 201 pero Android no muestra en algunas TWAs.
**Causa probable:** bug de PWABuilder o configuración AndroidManifest.
**Impacto:** Push in-app funciona, push a barra Android falla.
**Plan:** Diagnóstico profundo en próxima sesión (chrome://inspect + test local).

### Capacidad
| Storage | Cap | Se llena |
|---|---|---|
| state.notifications | 500 | ~2 semanas alto volumen |
| state.sellerSubscriptions | 500 | >500 sellers |
| state.payments | 1000 | ~año 1 |
| state.referrals | sin cap | ~año 2 |
| Supabase seller_products | 500MB | 500,000 prod = año 3+ |
| GitHub State | 100MB | uso actual ~2MB |

### Save queue
**Estado:** serial, funciona bien.
**Riesgo:** con state >50MB, save a GitHub puede tardar >5s.
**Plan:** migrar a Supabase si crece >25MB (año 1+).

### Crones
**Estado:** todos idempotentes con try/catch.
**Riesgo:** si Render duerme, crones no corren (pérdida de 1 día de tareas).
**Plan:** considerar plan pagado o ping externo cada 10 min.

---

## 📏 Reglas del proyecto

1. Nada de lo hecho se pierde (cambios aditivos con backup)
2. Cache-busters en cada deploy (`?v=N`)
3. Verificar en prod con curl antes de cerrar
4. **Cada push = redeploy Render** (evitar pushes innecesarios)
5. Scripts reusables:
   - `bash ~/comdiaz/test-e2e.sh` — backend end-to-end
   - `bash ~/comdiaz/audit.sh` — auditoría general
   - `bash ~/comdiaz/audit-crons.sh` — auditoría crones
   - `bash ~/comdiaz/audit-full.sh` — auditoría 13 secciones
   - `bash ~/comdiaz/audit-cierre.sh` — auditoría de cierre

---

## 🔗 Links de producción

- **Shop:** https://com-diaz-web.onrender.com/shop.html
- **Seller register:** https://com-diaz-web.onrender.com/seller.html
- **Seller panel:** https://com-diaz-web.onrender.com/seller-panel.html
- **Admin panel:** https://com-diaz-web.onrender.com/home.html
- **Backend:** https://com-diaz.onrender.com
- **APK Drive:** https://drive.google.com/file/d/1YYad5ECgr8eDiWjWsip5D11md3ayuvxL/view
- **Grupo WhatsApp:** https://chat.whatsapp.com/HVbGq9WJLgzLVSvhY9WDqh
- **WhatsApp pedidos:** 5358980267

---

## 🎯 Métricas de éxito (mes 1)

| Métrica | Meta |
|---|---|
| Descargas APK | 20+ |
| Sellers registrados | 5+ |
| Sellers aprobados | 3+ |
| Productos en catálogo | 30+ |
| Referidos activos | 2+ |
| Pagos procesados | 2+ |

---

## ⏱️ Historial de sesiones

- **Sesión 22 Oct:** Panel vendedor (carga masiva, fotos)
- **Sesión 23 Oct:** Notificaciones + monetización + auditoría
- **Sesión 24 Oct:** Shop rediseño + pagos + referidos + auditoría
- **Próxima sesión:** Push Android + APK admin + IA + notif compradores

---

**Última actualización:** 24 Oct 2026, 23:00
