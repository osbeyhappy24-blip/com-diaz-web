# Comdiaz Shop — ROADMAP
**Última actualización:** 28 Oct 2026

---

## ✅ COMPLETADO (Sesiones 23-26 Oct)

### 🎁 Sistema de Referidos (100% end-to-end)
- [x] Código único determinístico por sellerId (inmutable)
- [x] Link compartido → seller.html?ref=CODIGO
- [x] Notificación `referral_registered` inmediata
- [x] Notificación `referral_bonus` al aprobar (+5)
- [x] **Persistencia: sobrevive redeploys** (guardarEnNube + cargarDesdeNube)
- [x] Cada seller tiene su código auto-generado
- [x] Push en barra Android funcionando
- [x] Soft delete libera teléfono para re-registro
- [x] Endpoint repair para casos edge
- [x] Bonus visible en panel vendedor (cuota_max)
- [x] Sección "Comparte y gana" movida arriba (visible)
- [x] Botón Compartir con `navigator.share` (modal nativo Android)
- [x] Botón vibrante (gradiente animado + pulse + shine)
- [x] Título "🎁 Comparte y gana productos gratis"

### 🔒 Headers de Seguridad (100% via Render API)
- [x] Content-Security-Policy
- [x] Permissions-Policy
- [x] Referrer-Policy
- [x] X-Content-Type-Options
- [x] X-Frame-Options
- [x] Configurados via API Render (PUT /v1/services/{id}/headers)

### 📸 Carga Masiva (100% completo)
- [x] A.1 UI: formularios por foto (lista vertical)
- [x] A.1: preview + campos editables por foto
- [x] A.1: provincia/municipio desplegable (16 prov + 168 mun)
- [x] A.1: sección "Aplicar a TODOS"
- [x] A.1: botón ✕ eliminar foto del lote
- [x] A.1: banner precaución >10 productos
- [x] A.1: confirm antes de comprimir si >10
- [x] A.1: auto-scroll al primer form
- [x] A.1: layout flex (botón no tapa campos)
- [x] A.2: IndexedDB borradores
- [x] A.2: auto-save cada 1.5s
- [x] A.2: heartbeat cada 5s
- [x] A.2: saveSync en visibilitychange/pagehide/beforeunload
- [x] A.2: banner recuperar borrador
- [x] A.2: recuperar / descartar
- [x] A.3: cola pendientes de sincronizar
- [x] A.3: retry con backoff (2s/4s/6s)
- [x] A.3: banner rojo pendientes
- [x] A.3: auto-sync al recuperar conexión
- [x] A.3: cleanup borradores >7 días
- [x] Bugs: timeout 30s por foto, 401 mid-upload, quota exceeded

### 🚨 Cap 5000 + Automation (100% resuelto)
- [x] Bug: catálogo excedía 125% (6260/5000)
- [x] Fix A: purgaDefensivaCap() recorta por score/publicados/IA
- [x] Fix B: mergeProducts rechaza si activos >= CATALOG_CAP
- [x] Fix C: ebay-notification NO agrega productos (verificado)
- [x] Fix D: automation.running = false si cap alcanzado
- [x] Fix E: cron cada hora valida y purga
- [x] Endpoint /api/admin/automation/cap-check (forzar manual)
- [x] /api/automation/start rechaza si cap (429)
- [x] **Estado actual: 5000/5000 activos, automation: false**

### ⚡ Escalabilidad
- [x] Rate limit adaptativo: 20/40/80/120 por plan
- [x] Caché 30s /api/public/local (6s → 1.3s = 4-6x)
- [x] Circuit breaker imgbb (5 fallos → 60s)
- [x] Fix bodyLimit Fastify 1MB → 5MB
- [x] Save queue serial (no race conditions)

### 🔐 Seguridad
- [x] Rate limit login: 5/15min por IP+teléfono
- [x] Rate limit register: 3/hora por IP
- [x] Rate limit upload: 30/min por sellerId
- [x] CORS preflight Authorization
- [x] password_hash nunca expuesto
- [x] Errores sin stack traces
- [x] Aislamiento: sellers no se ven entre sí
- [x] bcrypt hashing
- [x] Validación UUID en seller-contact

### 🎨 Shop Rediseño Cubano
- [x] Paleta: azul #003f7f, rojo #dc2626, amarillo #fbbf24
- [x] Hero banner con buscador
- [x] Header vivo: 4 botones (Vender/Pedidos/Carrito/WhatsApp)
- [x] Tabs: Todo/Locales/Importados (sin Temu/Amazon)
- [x] Cards con badge por tipo + avatar flotante sellers
- [x] Banner turista v2 con thumbnails de productos
- [x] 5 promos rotando cada 4s (HOT/SALE/LIMITED/NEW/FREE)
- [x] SEO completo (og:*, twitter:*)
- [x] Cache-busters actualizados

### 💳 Sistema de Pagos
- [x] Modal con Zelle/USDT/CUP
- [x] Flujo: solicitar → WhatsApp admin → aprobar → +30d
- [x] Cola admin con badge
- [x] 7 endpoints backend
- [x] Notif Telegram al admin
- [x] Notif in-app al aprobar

### 🔔 Notificaciones
- [x] In-app: badge + panel + toast + swipe + tiempo relativo
- [x] Web Push Android (FCM acepta 201, verificado en tests)
- [x] Persistencia: sobrevive redeploys (6 campos críticos)
- [x] 10 tipos (aprobado, suspendido, plan_*, pago_*, referral_*)
- [x] Cron 1h limpia rateLimitMap/failMap/loginAttempts

---

## ✅ COMPLETADO (Sesión 27-28 Oct) — MIGRACIÓN CRÍTICA + EMERGENCIA

### 🚨 Emergencia Render → GitHub Pages (RESUELTA)
- [x] Render suspendió cuenta vieja (5 GB ancho de banda agotados)
- [x] Servicios caídos ~2 días (frontend + backend)
- [x] Cuenta nueva Render creada: `com-diaz-ty2b.onrender.com` (5 GB frescos)
- [x] Frontend migrado a **GitHub Pages**: `osbeyhappy24-blip.github.io/com-diaz-web/`
- [x] Backend redesplegado con state desde GitHub (5000 productos recuperados)
- [x] Fix bug crítico: `published=0` en state → auto-sanación desde `results`
- [x] CSP actualizado en `shop.html` + `home.html` con dominio nuevo
- [x] UptimeRobot reconfigurado (83ms promedio, ping cada 5min, evita cold start)
- [x] PWA instalable con manifest + service worker
- [x] Service worker bumped a v25 (force refresh)

### 🔑 Admin — Login con PIN (EN PROGRESO)
- [x] Añadida función `asegurarLogin()` al arranque del admin
- [x] **PIN actual en Render: `321302`** (no `985898` — ese quedó en Termux sin subir)
- [x] Login usa `?k=` en vez de header `X-Comdiaz-Key` (evita preflight CORS)
- [x] Rate limit reset endpoint documentado (`/api/admin/reset-ratelimit`)
- [ ] **Verificar login funcional en móvil** (pendiente: rate limit + test)

### 🌐 Dominio (PENDIENTE)
- [ ] `devs.li`: SSL falló por rate limit Let's Encrypt (devs.li no está en PSL)
- [ ] `888.moe`: cuota DNS llena del proveedor (no se pueden crear registros)
- [ ] **Próximo:** comprar dominio propio (~$10/año, Cloudflare/Porkbun)
- [ ] Mientras tanto: usar `osbeyhappy24-blip.github.io/com-diaz-web/`

### 📱 APKs (PENDIENTE)
- [ ] APK Shop: muerta (URL vieja `com-diaz-web.onrender.com`)
- [ ] APK Admin: muerta (URL vieja)
- [ ] **Workaround actual:** PWA instalable desde Chrome
- [ ] **Próximo:** recompilar con Bubblewrap (keystore disponible en `~/comdiaz/keystore-backup/`)




## 🔴 NUEVAS FASES — Tiendas por Seller + Promociones (28 Oct+)

### FASE 1: Unificar catálogo (2h) — ALTA PRIORIDAD
**Objetivo:** eBay + locales + sellers todos visibles juntos en la Shop.
- [ ] Un solo endpoint `/api/public/catalog` que una los 3 orígenes
- [ ] Productos seller aparecen en la Shop general con badge 🏪
- [ ] `seller_id` oculto en público (solo se revela al pedir WhatsApp)
- [ ] Provincia y municipio visibles en descripción de productos seller
- [ ] Productos de seller anónimos hasta WhatsApp (privacidad)
- [ ] Eliminar tab separado "Locales" (todo integrado en "Todo")

### FASE 2: Tienda propia por seller (4h) — ALTA
**Objetivo:** cada seller tiene su "sala" con sus productos y link directo.
- [ ] Tabla nueva `seller_shops`: `id, seller_id, slug, nombre, descripcion, logo, banner, color, creada_en`
- [ ] Página nueva `tienda.html?slug=xxx` (solo productos del seller)
- [ ] Botón "Crear mi tienda" en panel del vendedor
- [ ] Validar slug único + no ofensivo (lista de bloqueo)
- [ ] En catálogo general: `🏪 Vendedor: [nombre tienda]` o "Anónimo"
- [ ] Compartir link directo de tienda (`?ref=CODIGO` para referidos)
- [ ] SEO: og:image + title por tienda

### FASE 3: Límites de planes (2h) — ALTA
**Objetivo:** 50 free / 200 pro / ∞ premium + referidos suman cupo.
- [ ] Validar límite al crear producto (`SELECT COUNT(*) WHERE seller_id=X`)
- [ ] Error 429 "Límite alcanzado, cambia de plan"
- [ ] Referidos suman cupo al plan (`cuota_max` ya existe en panel seller)
- [ ] Notif admin cuando seller llega al 80% del límite
- [ ] Página de upgrade con precios visibles
- [ ] Anti-fraude: bloquear multi-cuentas por mismo teléfono

### FASE 4: Sistema de Promociones (8h) — MEDIA
**A) Espacios automáticos gratuitos (10 rotativos)**
- [ ] 🥇 Primera tienda creada (solo la 1ra, para siempre)
- [ ] 🥈 Tienda con más artículos activos
- [ ] 🥉 Provincia con más artículos
- [ ] 🎯 Seller con más artículos vendidos (o publicados)
- [ ] 🆕 Últimos 5 productos subidos
- [ ] 🔥 Productos más vistos (últimos 7 días)
- [ ] Rotación cada 5s con `Math.random()` entre criterios
- [ ] Notif admin: "🏆 Nueva primera tienda: [nombre]"
- [ ] Persistencia: primero en Supabase, si falla → state local

**B) Promociones pagadas (monetización)**
- [ ] Tabla `promotions` (`seller_id, product_id, tipo, desde, hasta, pagado`)
- [ ] Seller paga $X por destacar 7/15/30 días
- [ ] Producto destacado aparece en rotación con prioridad
- [ ] Cap: 5 destacados por seller, 10 totales (anti-saturación)
- [ ] Notif admin en cada pago
- [ ] Preview de cómo se verá antes de pagar
- [ ] Integrar con sistema de pagos existente (Zelle/USDT/CUP)

### FASE 5: Admin robusto (4h) — MEDIA
- [ ] Log de eventos en panel admin (nueva tienda, pago, límite, etc.)
- [ ] Tab "🔔 Eventos" con feed en tiempo real
- [ ] Backup automático del state cada 6h a GitHub
- [ ] Rate limit en `/api/seller/register` (anti-spam cuentas)
- [ ] Detección de fraude: IPs repetidas, teléfonos similares, productos duplicados
- [ ] Exportar CSV de sellers + productos + pagos
- [ ] Dashboard financiero (ingresos promociones + planes)

## 🔴 PRÓXIMOS BLOQUES (Prioridad ALTA)

### 1. Banners reales dinámicos (45 min)
**Problema:** 4 de 5 textos son ficticios:
- ❌ "-25% productos locales" (no hay descuentos)
- ❌ "Compra 2 y llévate 3" (no existe)
- ❌ "Envío gratis +$50" (sin regla)
- ❌ "Nuevos productos cada semana" (sin nuevos reales)
- ✅ "Sin comisiones WhatsApp" (única real)

**Fix:** 5 textos dinámicos basados en catálogo:
- "X productos disponibles" (contar results)
- "Desde $[min] USD" (más barato real)
- "X vendedores verificados" (contar aprobados)
- "Compra directo por WhatsApp" (sin comisiones real)
- "Productos cubanos e importados"
- Deshabilitar aiBanners genéricos

### 2. Compartir producto con link directo (20 min)
- Botón "🔗 Compartir" en cada product card
- Genera link: shop.html?product=<id>
- Al abrir → scroll al producto + abre modal
- Usa navigator.share() (todas las apps Android)

### 3. Verificación visual completa (30 min)
**Shop pública:**
- [ ] Header 4 botones con colores
- [ ] Banner v2 rota cada 4s con thumbnails
- [ ] Tabs: 3 (sin Temu/Amazon)
- [ ] Cards: avatar sellers + "Verificado"
- [ ] Sin tag de nombre del vendedor
- [ ] WhatsApp por tipo de producto
- [ ] Responsive en móvil

**Panel vendedor:**
- [ ] Referidos ARRIBA del botón Añadir productos
- [ ] Link seller.html?ref= correcto
- [ ] Botón Compartir vibrante
- [ ] Cuota incluye bonus referidos
- [ ] Modal bulk abre sin overlap

**Admin panel:**
- [ ] Stats: 5000/5000 correcto
- [ ] Automation: false
- [ ] Ranking referidos visible
- [ ] Notif push con icono Shop

---

## 🟡 PRÓXIMAS SESIONES (Prioridad MEDIA)

### 4. Antifraude SMS OTP (90 min + Firebase setup)
- Verificar que el teléfono sea real
- Firebase Phone Auth (10k/mes gratis)
- Al registrar: enviar código 6 dígitos
- Sin verificar → cuenta pendiente

### 5. IA fotos locales (120 min)
- Detectar fotos de cámara vs editadas (EXIF)
- Mejorar fotos feas con Gemini
- Generar descripción automática
- Respetar cuota diaria API
- **Las 10 fotos locales actuales sin descripción se pueden generar**

### 6. Notificaciones compradores (120 min)
- Agrupación por provincia (no 1x1)
- Resumen cada 12h: "25 productos nuevos en La Habana"
- Cap 2/día por comprador
- Popup auto-activar (Chrome requiere gesture)

### 7. APK admin completa (2-3h)
**14 items faltantes:**
- [ ] Editor métodos de pago
- [ ] Dashboard financiero
- [ ] Ver productos por vendedor
- [ ] Editar notas internas
- [ ] Log de auditoría
- [ ] Historial completo de pagos
- [ ] Exportar CSV
- [ ] Editor de promociones
- [ ] Ver productos ocultos
- [ ] Reactivar suspendido_pago manual
- [ ] Detección de abuso
- [ ] Preview banner en vivo
- [ ] Editor de categorías
- [ ] Historial notifs por seller

---

## 🟢 BACKLOG (Prioridad BAJA)

### Seguridad avanzada
- [ ] 2FA admin (Google Authenticator)
- [ ] Rotación automática PIN admin
- [ ] Verificar email al registrar
- [ ] Log de accesos admin (IP, hora)
- [ ] Detección duplicados (mismo producto 2 sellers)

### UX
- [ ] Sonido custom push (requiere TWA recompilado)
- [ ] Modo oscuro
- [ ] Favoritos/wishlist
- [ ] Chat interno comprador-vendedor
- [ ] App PWA instalable

### Monetización
- [ ] Destacados pagados ($1/7 días)
- [ ] Planes anuales con descuento
- [ ] Comisiones por venta (opcional)

### Capacidad (mes 3-6)
- [ ] Bump `state.notifications` 500 → 2000
- [ ] Bump `state.sellerSubscriptions` 500 → 5000
- [ ] Migrar notifs/subs a Supabase
- [ ] Índices Supabase para búsquedas

---

## 🚨 RIESGOS CONOCIDOS

### Push Android TWA
- FCM acepta 201 pero Android no siempre muestra
- Bug conocido de PWABuilder/Bubblewrap
- **Workaround:** PWA Chrome para push

### Termux NO tiene /tmp/
- `curl -o /tmp/x` falla silenciosamente
- Usar `$HOME/` o pipes `| head -c 500`
- **Este bug nos hizo perder 2+ horas**

### Cold start Render
- Backend free tier duerme tras 15min
- Primera request: 30-50s
- Frontend tiene timeout 45s + retry

### Caps de storage
| Storage | Cap | Se llena |
|---|---|---|
| state.notifications | 500 | ~2 semanas |
| state.sellerSubscriptions | 500 | >500 sellers |
| state.payments | 1000 | ~1 año |
| state.results | 5000 (ACTIVO) | ✅ en cap |
| Supabase seller_products | 500MB | 3+ años |

---

## 📏 REGLAS DEL PROYECTO

1. **Nada se pierde** — cambios aditivos con backup
2. **Cache-busters en cada deploy** (`?v=N`)
3. **Verificar en prod con curl ANTES de cerrar**
4. **Cada push = redeploy Render** (evitar innecesarios)
5. **NUNCA usar `/tmp/` en Termux** (usar `$HOME/`)
6. **Alerts cuando algo falla silenciosamente**
7. **No dejar returns silenciosos** (siempre mostrar error)
8. **Fixes estructurales > padding hacks** (lección del footer overlap)

### Scripts reusables en ~/comdiaz/
- `test-e2e.sh` — backend end-to-end
- `audit.sh` — auditoría general
- `audit-crons.sh` — crones
- `audit-full.sh` — 13 secciones
- `audit-profunda.sh` — 9 áreas

---

## 🔗 LINKS DE PRODUCCIÓN

- **Shop**: https://osbeyhappy24-blip.github.io/com-diaz-web/shop.html
- **Registro seller**: https://osbeyhappy24-blip.github.io/com-diaz-web/seller.html
- **Panel vendedor**: https://osbeyhappy24-blip.github.io/com-diaz-web/seller-panel.html
- **Admin**: https://osbeyhappy24-blip.github.io/com-diaz-web/home.html
- **Backend**: https://com-diaz-ty2b.onrender.com
- **Backend health**: https://com-diaz-ty2b.onrender.com/health
- **Repo frontend**: https://github.com/osbeyhappy24-blip/com-diaz-web
- **Repo backend**: https://github.com/osbeyhappy24-blip/com-diaz
- **Repo state**: https://github.com/osbeyhappy24-blip/comdiaz-state (privado)
- **Grupo WA**: https://chat.whatsapp.com/HVbGq9WJLgzLVSvhY9WDqh
- **WA admin**: 5351425691
- **Osbey**: 5358980267 / código OSBEY02676H0

### Credenciales actuales (RENDER - backend env)
- PIN admin: `321302`
- COMDIAZ_KEY: `ukafr7gb`
- GITHUB_STATE_REPO: `osbeyhappy24-blip/comdiaz-state`


---

## 📊 ESTADO ACTUAL (28 Oct 2026)

### Infraestructura
| Componente | Valor |
|---|---|
| **Backend** | `com-diaz-ty2b.onrender.com` (Render free tier) |
| **Frontend** | `osbeyhappy24-blip.github.io/com-diaz-web/` (GitHub Pages) |
| **Dominio propio** | ❌ Pendiente (comprar ~$10/año) |
| **UptimeRobot** | ✅ Corriendo (83ms promedio) |
| **Service Worker** | v25 (force refresh) |

### Catálogo
| Métrica | Valor |
|---|---|
| **Productos eBay** | 4.992 |
| **Productos locales (manuales)** | 10 |
| **Productos seller** | 0 (Supabase sin credenciales) |
| **Total visible** | **5.002** |
| **Categorías** | 45 |
| **Cap actual** | 5.000 (ACTIVO, auto-pausa en cap) |

### Sellers
| Métrica | Valor |
|---|---|
| **Sellers aprobados** | 3 (Osbey, Keila, Yaumel) — en Supabase, no en state |
| **Sellers suspendidos** | 9 (tests) |
| **Sellers eliminados** | 1 |

### Estado actual
| Componente | Estado |
|---|---|
| **Shop PWA** | ✅ Funcional (5002 productos) |
| **Admin PWA** | ⚠️ Login en fixing (rate limit + PIN 321302) |
| **APK Shop** | ❌ Muerta (URL vieja) |
| **APK Admin** | ❌ Muerta (URL vieja) |
| **Supabase** | ❌ Sin configurar en Render (sellers no cargan) |
| **eBay API** | ❌ Sin credenciales (live-search falla, catálogo funciona vía scraping) |


---|---|
| Productos activos | **5000/5000 (CAP)** |
| Automation | **false** ✅ |
| Categorías | 36 |
| Con IA | 5965 |
| Pendientes IA | 295 |
| Sellers aprobados | 3 (Osbey Pro + Keila + Yaumel) |
| Sellers suspendidos | 9 (tests) |
| Sellers eliminados | 1 (Keila antigua) |
| Bonus referidos | Osbey: +5 (persistido) |
| Pagos procesados | 1 ($5 Pro) |
| Push subs | 1 activa |
| Headers seguridad | ✅ Todos configurados |
| Referrals persistencia | ✅ Verificada tras redeploy |
| Carga masiva | ✅ A.1 + A.2 + A.3 |

---

## 🎯 PRÓXIMA SESIÓN — Orden sugerido

1. **Verificación visual** (30 min)
2. **Banners reales dinámicos** (45 min)
3. **Compartir producto con link** (20 min)
4. Luego: **Antifraude SMS** o **IA fotos** o **APK admin**

---

**Para retomar:** di "seguimos con Comdiaz" → leo ROADMAP.

**Última actualización:** 28 Oct 2026
