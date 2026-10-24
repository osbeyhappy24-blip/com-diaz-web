# Comdiaz Shop — Roadmap Completo

**Última actualización:** 24 Oct 2026, 23:45

---

## ✅ COMPLETADO — Sesión 23-24 Oct

### 🎨 Shop rediseño cubano
- [x] Paleta: azul colonial #003f7f, rojo #dc2626, amarillo sol #fbbf24
- [x] Hero banner con buscador destacado
- [x] Header vivo: 4 botones animados (Vender/Pedidos/Carrito/WhatsApp)
- [x] Tabs: Todo 🌎 / Locales 🇨🇺 / Importados 🌐
- [x] Cards con badge por tipo + avatar flotante para sellers
- [x] SEO completo: og:title, og:image, twitter:card
- [x] **Banner turista v2 con thumbnails de productos** (recién completado)

### 🎨 Banner turista v2 (nuevo)
- [x] 5 ofertas rotando cada 4s (envío gratis, -25%, 2x1, nuevos, sin comisiones)
- [x] 4 thumbnails de productos reales (2 izq + 2 der, flotando)
- [x] Thumbnails elegidos por filtro (local/ebay/all/seller)
- [x] Badge dinámico (HOT/SALE/LIMITED/NEW/FREE) con pulse
- [x] Emoji con wiggle animation
- [x] Dots indicadores clickables
- [x] Pausa al tocar, reanuda al soltar
- [x] 7 gradientes de color (azul, rojo, amarillo, morado, verde, naranja, rosa)
- [x] Endpoints admin GET/PUT /api/admin/shop/promociones
- [x] Rotación configurable (3-15s)

### 📸 Panel vendedor
- [x] Login, cuota, plan, estado
- [x] Carga masiva: N fotos → N formularios
- [x] Compresión cliente (JPEG 1200px @82% ~150KB)
- [x] Comparador 3 planes en registro
- [x] Timeout 20s + retry visible
- [x] Modal de renovación con métodos dinámicos
- [x] Sección "🎁 Comparte y gana" (referidos)

### 🔔 Notificaciones in-app
- [x] Badge + panel + toast + swipe + tiempo relativo
- [x] Persistencia: sobrevive redeploys
- [x] Aislamiento: cada vendedor recibe solo lo suyo
- [x] 10 tipos (aprobado, suspendido, plan_*, pago_*, referral_bonus)

### ⚠️ Web Push Android (PARCIAL)
- [x] Backend: FCM acepta (status 201)
- [x] Suscripción activa (1)
- [x] Service Worker con handler push + notificationclick
- [x] In-app funciona 100%
- [ ] **Push a barra Android NO aparece** (limitación de TWA/PWABuilder)
  - Bug conocido de TWA generadas por PWABuilder
  - FCM acepta pero Android no muestra
  - Solución: recompilar APK con Bubblewrap o usar PWA Chrome

### 💳 Sistema de pagos
- [x] Modal con Zelle / USDT / CUP
- [x] Flujo: solicitar → WhatsApp admin → aprobar → +30d
- [x] Cola admin con badge
- [x] 7 endpoints backend
- [x] Notificación Telegram al admin
- [x] Notif in-app al aprobar
- [x] Verificado end-to-end (Osbey pagó $5 Pro)

### 🎁 Sistema de referidos
- [x] Códigos determinísticos (sobreviven redeploys)
- [x] Link único: seller.html?ref=CODIGO
- [x] Registro con referred_by_code
- [x] Resolución lazy al aprobar (robusto)
- [x] +5 productos por referido aprobado
- [x] Cap: 3/mes, tope +50 acumulado
- [x] Dashboard admin con ranking 🥇🥈🥉
- [x] Endpoint repair para casos edge
- [x] **VERIFICADO:** Osbey tiene 1 referido, +5 productos, cuota 205

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
- [x] Aislamiento: sellers no se ven entre sí

### 🧹 Robustez
- [x] Persistencia 6 campos críticos
- [x] save() con queue serial
- [x] Cron 1h limpia rateLimitMap/failMap/loginAttempts
- [x] Stats admin calcula en vivo (no cache)
- [x] Service Worker network-first para CSS/JS

### 📱 WhatsApp por producto (VERIFICADO)
**3 flujos independientes funcionando correctamente:**
- [x] **eBay (importados)** → WhatsApp global (5351425691)
- [x] **Manuales (APK privada)** → WhatsApp global (5351425691)
- [x] **De vendedores** → WhatsApp del vendedor específico
- [x] **Botón Compartir referidos** → WhatsApp sin número (vendedor elige destino)
- [x] `/api/public/seller-contact` con validación UUID
- [x] Rate limit 10/min por IP
- [x] TWA-aware: whatsapp:// en APK

---

## 📊 Estado verificado (24 Oct 23:45)

| Métrica | Valor |
|---|---|
| Sellers aprobados | 1 (Osbey, Pro, 205 cuota) |
| Sellers suspendidos | 7 (tests) |
| Productos activos | 11 (10 manuales + 1 seller) |
| Push subs activas | 1 |
| Referidos activos | 1 (+5 aplicado a Osbey) |
| Pagos procesados | 1 ($5 Pro) |
| Notificaciones históricas | 10+ |
| Promociones activas | 5 manuales + 5 IA |
| Rotación banner | 4s |

---

## 🔴 PRÓXIMA SESIÓN — Prioridad alta

### 1. Push Android en TWA (bloqueante para UX)
**Estado:** FCM 201 pero Android no muestra.

**Opciones:**
- [ ] A) Recompilar APK con Bubblewrap actualizado
- [ ] B) Recompilar con PWABuilder (versión más reciente)
- [ ] C) Documentar que vendedores usen PWA Chrome para push
- [ ] D) Investigar configuración AndroidManifest (notification channels)

**Recomendación:** empezar con C (documentar), luego A/B si hay tiempo.

### 2. APK admin completa (dashboard)
**14 items faltantes identificados:**
- [ ] Editor de métodos de pago (Zelle/USDT/CUP editables)
- [ ] Dashboard financiero (ingresos por plan, proyección)
- [ ] Ver productos de un vendedor (modal)
- [ ] Editar notas internas
- [ ] Log de auditoría (quién aprobó/cuándo)
- [ ] Historial completo de pagos
- [ ] Historial de notificaciones por seller
- [ ] Detección de abuso (mismo IP múltiples sellers)
- [ ] Exportar CSV (vendedores, pagos, productos)
- [ ] Preview del banner de la Shop en vivo
- [ ] Editor de categorías
- [ ] Ver productos ocultos
- [ ] Reactivar vendedor suspendido_pago manual
- [ ] Editor de promociones del banner (UI)

### 3. IA en procesos (expandir)
**Ya implementado:**
- [x] Descripción de productos
- [x] Título optimizado
- [x] Banners promocionales (5 generados)
- [x] Copiloto (chat asistente)

**A implementar:**
- [ ] Sugerencia de precio óptimo
- [ ] Análisis de competencia
- [ ] Predicción de ventas
- [ ] Detección de fraude
- [ ] Traducción eBay inglés → español
- [ ] Respuesta automática a compradores
- [ ] Resumen de perfil vendedor
- [ ] Auto-categorización

---

## 🟡 PRÓXIMAS SESIONES — Prioridad media

### 4. Notificaciones a compradores (diseñado)
**Diseño aprobado:**
- Agrupación por provincia (no 1x1)
- Resumen cada 12h: "25 productos nuevos en La Habana"
- Cap 2/día por comprador
- Cooldown 4h entre notificaciones
- Filtro: solo productos con imagen + precio > 0

**Auto-activar (Chrome Android):**
- Requiere user gesture (no se puede sin click)
- Popup estratégico al 3er producto visto
- Incentivo claro: "Recibe ofertas de tu provincia"
- Recordatorio suave cada 7 días

**Fases (4 bloques, ~2h):**
1. Backend subscribe-buyer + tracking provincia
2. Cron agrupador cada 12h
3. Frontend popup estratégico
4. Test end-to-end

### 5. Destacados pagados (nueva monetización)
- [ ] Vendedor paga $1 para destacar 7 días
- [ ] Admin aprueba destacado
- [ ] Badge ⭐ DESTACADO pulsante
- [ ] Tracking de vistas por destacado

---

## 🟢 BACKLOG — Prioridad baja

### Seguridad avanzada
- [ ] 2FA para admin
- [ ] Rotación PIN admin
- [ ] Verificar email al registrar
- [ ] Log de accesos admin
- [ ] Detección de duplicados (mismo producto 2 sellers)

### Capacidad (mes 3-6)
- [ ] Bump cap `state.notifications` 500 → 2000
- [ ] Bump cap `state.sellerSubscriptions` 500 → 5000
- [ ] Migrar notifs/subs a Supabase si crece >50%
- [ ] Cron limpiador (notifs viejas >30d)

### UX
- [ ] Sonido custom push (requiere TWA recompilado)
- [ ] Modo oscuro
- [ ] Favoritos/wishlist
- [ ] Chat interno comprador-vendedor

---

## 🚨 Riesgos técnicos conocidos

### 1. Push Android en TWA
- FCM acepta 201 pero Android no muestra
- Bug de PWABuilder/Bubblewrap
- **Workaround:** PWA Chrome para push

### 2. Termux no tiene /tmp/
- Todos los `curl -o /tmp/x` fallan silenciosamente
- Usar `$HOME/` o pipes `| head -c 500`
- **Lección aprendida:** futuros scripts nunca usan /tmp/

### 3. Cold start de Render
- Backend free tier duerme tras 15min inactivo
- Primera request tarda 30-50s
- Frontend tiene timeout 20s + retry
- **Workaround:** plan pagado o ping externo cada 10min

### 4. Caps de storage
| Storage | Cap | Se llena |
|---|---|---|
| state.notifications | 500 | ~2 semanas alto volumen |
| state.sellerSubscriptions | 500 | >500 sellers |
| state.payments | 1000 | ~año 1 |
| state.referrals | sin cap | ~año 2 |
| Supabase seller_products | 500MB | 500,000 prod = año 3+ |

---

## 📏 Reglas del proyecto

1. Nada de lo hecho se pierde (cambios aditivos con backup)
2. Cache-busters en cada deploy (`?v=N`)
3. Verificar en prod con curl ANTES de cerrar
4. **Cada push = redeploy Render** (evitar pushes innecesarios)
5. **NUNCA usar `/tmp/` en Termux** (no existe, usar `$HOME/` o pipes)
6. Scripts reusables en `~/comdiaz/`:
   - `test-e2e.sh` — backend end-to-end
   - `audit.sh` — auditoría general
   - `audit-crons.sh` — auditoría crones
   - `audit-full.sh` — auditoría 13 secciones
   - `audit-cierre.sh` — auditoría de cierre
   - `audit-profunda.sh` — auditoría 9 áreas profundas

---

## 🔗 Links de producción

- **Shop:** https://com-diaz-web.onrender.com/shop.html
- **Seller register:** https://com-diaz-web.onrender.com/seller.html
- **Seller panel:** https://com-diaz-web.onrender.com/seller-panel.html
- **Admin panel:** https://com-diaz-web.onrender.com/home.html
- **Backend:** https://com-diaz.onrender.com
- **APK Drive:** https://drive.google.com/file/d/1YYad5ECgr8eDiWjWsip5D11md3ayuvxL/view
- **Grupo WhatsApp:** https://chat.whatsapp.com/HVbGq9WJLgzLVSvhY9WDqh
- **WhatsApp pedidos:** 5351425691

---

## 🎯 Métricas de éxito (mes 1)

| Métrica | Meta | Actual |
|---|---|---|
| Descargas APK | 20+ | - |
| Sellers registrados | 5+ | 1 |
| Sellers aprobados | 3+ | 1 |
| Productos en catálogo | 30+ | 11 |
| Referidos activos | 2+ | 1 |
| Pagos procesados | 2+ | 1 |

---

## ⏱️ Historial de sesiones

- **Sesión 22 Oct:** Panel vendedor (carga masiva, fotos)
- **Sesión 23 Oct:** Notificaciones + monetización + auditoría
- **Sesión 24 Oct:** Shop rediseño + pagos + referidos + banner v2 + auditoría

### Logros sesión 24 Oct
- 20+ commits
- 15+ bugs resueltos
- Shop rediseño cubano (100%)
- Banner v2 con thumbnails de productos (100%)
- Pagos end-to-end (100%)
- Referidos end-to-end (100%)
- Auditoría profunda 46 puntos (0 fallos críticos)
- Bug persistencia datos críticos resuelto
- WhatsApp por producto verificado (3 flujos correctos)

---

## 🔍 Verificaciones pendientes para próxima sesión

### Banner v2 — probar en APK
- [ ] Cerrar APK, limpiar caché Chrome, abrir
- [ ] ¿Ves los thumbnails de productos?
- [ ] ¿Rota cada 4s?
- [ ] ¿Badges de color aparecen?
- [ ] ¿Dots clickeables funcionan?

### Sistema completo
- [ ] Re-verificar after cold start
- [ ] Confirmar 5 promos + 5 IA en Shop
- [ ] Confirmar cuota 205 de Osbey
- [ ] Confirmar 1 pago procesado

---

## 📝 Estado de cuenta de Osbey (para referencia)

- **ID:** d754d687-aff9-41c3-9aa7-aabd38042098
- **Teléfono:** 5358980267
- **Plan:** Pro ($5/mes)
- **Cuota:** 205 productos (200 plan + 5 referidos)
- **Expira:** 23/11/2026
- **Código referido:** OSBEY02676H0
- **Referidos activos:** 1
- **Productos:** 3 (1 activo, 2 inactivos)

---

**Para retomar:** dime "seguimos con Comdiaz" y leo este ROADMAP.

**Prioridades próxima sesión:**
1. Verificar banner v2 en APK
2. Push Android (diagnóstico profundo o workaround PWA)
3. APK admin completa
4. Notificaciones compradores (diseñado)
