# Comdiaz Shop — ROADMAP
**Última actualización:** 25 Oct 2026

---

## ✅ COMPLETADO HOY (Sesión 25 Oct)

### Sistema de referidos (100%)
- [x] Notif `referral_registered` al referente INMEDIATAMENTE
- [x] Notif `referral_bonus` al aprobar al referido (+5 productos)
- [x] Código determinístico (sobrevive redeploys)
- [x] Resolución lazy del referred_by
- [x] Dashboard admin con ranking 🥇🥈🥉
- [x] Endpoint repair para casos edge
- [x] Probado con usuario real (Yaumel Gonzales - no usó link, sin bonus)

### Robustez y escalabilidad
- [x] Rate limit adaptativo: 20/40/80/120 por plan
- [x] Caché 30s en `/api/public/local` (4-6x más rápido: 6s → 1.3s)
- [x] Circuit breaker imgbb (5 fallos → 60s cooldown)
- [x] Invalidación de caché al crear producto
- [x] Fix bodyLimit Fastify 1MB → 5MB

### Bugs resueltos
- [x] CSS header botones se perdió (re-añadido)
- [x] Banner JS leía `cfg.shopConfig` pero API devuelve `cfg.config`
- [x] Compresión fotos: 1200px@82% → 900px@75% (~80KB)
- [x] Upload con retry 2x + skip failures + resumen
- [x] Notificación al referente se insertó en lugar incorrecto (fix definitivo)

### Estado actual verificado
| Métrica | Valor |
|---|---|
| Sellers aprobados | 2 (Osbey Pro + Yaumel basico) |
| Sellers suspendidos | 9 (tests) |
| Productos activos | 11 (10 manuales + 1 seller) |
| Push subs | 1 activa (Osbey) |
| Referidos activos | 0 (Yaumel sin código) |
| Pagos procesados | 1 ($5 Pro Osbey) |
| Promociones banner | 5 manuales + 5 IA |

---

## 🔴 BUG CONOCIDO — Banner con textos ficticios

**Problema:** 4 de 5 textos del banner son inventados:
- ❌ "-25% en productos locales" — no hay descuentos reales
- ❌ "Compra 2 y llévate 3" — no existe la promo
- ❌ "Envío gratis en pedidos +$50" — no hay regla configurada
- ❌ "Nuevos productos cada semana" — sin productos "nuevos" reales
- ✅ "Sin comisiones por WhatsApp" — **es la única real**

**Solo los thumbnails son reales** (4 fotos de productos reales del catálogo).

**Fix propuesto para próxima sesión (45 min):**
1. Reemplazar los 5 textos por 5 REALES dinámicos:
   - "X productos disponibles" (contar del catálogo)
   - "Desde $[min] USD" (producto más barato real)
   - "X vendedores verificados" (contar aprobados)
   - "Compra directo por WhatsApp" (sin comisiones real)
   - "Productos cubanos e importados" (verdad)
2. Deshabilitar los 5 aiBanners hasta que IA analice catálogo real
3. Habilitar IA real cuando esté bien configurada

---

## 🔴 PRÓXIMA SESIÓN — Prioridad ALTA

### 1. Banners REALES dinámicos (45 min)
**Motivo:** el banner es lo PRIMERO que ve el usuario. Textos ficticios generan desconfianza.

**Implementación:**
- 5 textos dinámicos calculados del catálogo real
- 5 aiBanners deshabilitados (o IA con contexto real)
- Cache-buster nuevo

### 2. Carga masiva UI estilo APK privada (90 min, 3 sub-bloques)
**Lo que pediste:** flujo como `bulk.js` de tu APK privada.

**A.1 — UI formularios por foto (30 min)**
- Lista vertical: 1 formulario por foto
- Preview de cada foto
- Campos: título, precio USD/CUP, categoría, provincia, municipio, estado, stock
- Botón ✕ para eliminar foto del lote
- Sección "🌍 Aplicar a TODOS": provincia/municipio/categoría
- Botón "💾 Guardar N productos"

**A.2 — Guardado en IndexedDB (30 min)**
- Cada cambio se guarda automáticamente en IndexedDB
- Si cierras app → recupera formularios al abrir
- Estado "borrador guardado"

**A.3 — Cola de sync con retries (30 min)**
- Subir fotos + crear productos con backoff exponencial (1s→2s→4s→8s→16s)
- Sección "⏳ Pendientes de sincronizar" con badge
- Botón "🔄 Sincronizar ahora"
- Estado visible por producto (pendiente/sincronizando/completado/error)

### 3. Push Android en TWA (variable)
**Estado:** FCM acepta 201 pero Android no muestra.
**Causa:** limitación de PWABuilder/Bubblewrap (bug conocido).
**Opciones:**
- A) Recompilar APK con Bubblewrap actualizado
- B) Usar PWA de Chrome para push (funciona 100%)
- C) Notificaciones nativas Android (FCM directo)

---

## 🟡 PRÓXIMAS SESIONES — Prioridad MEDIA

### 4. APK admin completa (dashboard)
**14 items faltantes:**
- [ ] Editor de métodos de pago (Zelle/USDT/CUP editables)
- [ ] Dashboard financiero (ingresos por plan, proyección)
- [ ] Ver productos de cada vendedor (modal desde lista)
- [ ] Editar notas internas del vendedor
- [ ] Log de auditoría (quién aprobó/cuándo/qué)
- [ ] Historial completo de pagos
- [ ] Historial de notificaciones por seller
- [ ] Detección de abuso (mismo IP múltiples sellers)
- [ ] Exportar CSV (vendedores, pagos, productos, referidos)
- [ ] Preview del banner de la Shop en tiempo real
- [ ] Editor de categorías
- [ ] Ver productos ocultos (inactivos de sellers suspendidos)
- [ ] Reactivar vendedor suspendido_pago manual
- [ ] Editor de promociones del banner (UI)

### 5. Notificaciones a compradores (diseñado)
**Diseño aprobado:**
- Agrupación por provincia (no 1x1)
- Resumen cada 12h: "25 productos nuevos en La Habana"
- Cap 2/día por comprador
- Cooldown 4h entre notifs
- Filtro: solo productos con imagen + precio > 0

**Auto-activar:**
- Chrome Android requiere user gesture
- Popup al 3er producto visto
- Incentivo: "Recibe ofertas de tu provincia"

**Fases (4 bloques, ~2h):**
1. Backend subscribe-buyer + tracking provincia
2. Cron agrupador cada 12h
3. Frontend popup
4. Test end-to-end

### 6. Destacados pagados (nueva monetización)
- [ ] Vendedor paga $1 para destacar producto 7 días
- [ ] Admin aprueba destacado
- [ ] Badge ⭐ DESTACADO pulsante
- [ ] Tracking de vistas

### 7. IA en procesos (expandir)
**Ya funciona:**
- [x] Descripción de productos
- [x] Título optimizado
- [x] Banners (genéricos, necesitan mejorar)
- [x] Copiloto chat

**A implementar:**
- [ ] Sugerencia de precio óptimo
- [ ] Análisis de competencia (vs eBay)
- [ ] Predicción de ventas
- [ ] Detección de fraude
- [ ] Traducción eBay inglés → español
- [ ] Respuesta automática a compradores
- [ ] Resumen de perfil vendedor
- [ ] Auto-categorización

---

## 🟢 BACKLOG — Prioridad BAJA

### Seguridad avanzada
- [ ] 2FA para admin (Google Authenticator)
- [ ] Rotación automática PIN admin
- [ ] Verificar email al registrarse
- [ ] Log de accesos admin (IP, hora)
- [ ] Detección de duplicados (mismo producto 2 sellers)

### Capacidad (mes 3-6)
- [ ] Bump cap `state.notifications` 500 → 2000
- [ ] Bump cap `state.sellerSubscriptions` 500 → 5000
- [ ] Migrar notifs/subs a Supabase si crece >50%
- [ ] Cron limpiador (notifs viejas >30d)
- [ ] Caché extendido a otros endpoints

### UX
- [ ] Sonido custom push (requiere TWA recompilado)
- [ ] Modo oscuro
- [ ] Favoritos/wishlist
- [ ] Chat interno comprador-vendedor

---

## 🚨 RIESGOS TÉCNICOS CONOCIDOS

### 1. Push Android en TWA
- FCM acepta 201 pero Android no muestra
- Bug conocido de PWABuilder/Bubblewrap
- **Workaround:** PWA Chrome para push

### 2. Termux NO tiene /tmp/
- Todos los `curl -o /tmp/x` fallan silenciosamente
- **Regla:** usar `$HOME/` o pipes `| head -c 500`
- Este bug nos hizo perder 2+ horas en diagnóstico falso

### 3. Cold start de Render
- Backend free tier duerme tras 15min inactivo
- Primera request tarda 30-50s
- Frontend tiene timeout 45s + retry

### 4. Caps de storage
| Storage | Cap | Se llena |
|---|---|---|
| state.notifications | 500 | ~2 semanas alto volumen |
| state.sellerSubscriptions | 500 | >500 sellers |
| state.payments | 1000 | ~año 1 |
| state.referrals | sin cap | ~año 2 |
| Supabase seller_products | 500MB | 500,000 prod = año 3+ |

### 5. Hero banner del CSS
- Ya está aplicado pero la clase `.shop-hero` puede estar oculta
- Verificar que `#shopHero` esté visible en `shop.html`

---

## 📏 REGLAS DEL PROYECTO

1. **Nada de lo hecho se pierde** (cambios aditivos con backup)
2. **Cache-busters en cada deploy** (`?v=N`)
3. **Verificar en prod con curl ANTES de cerrar**
4. **Cada push = redeploy Render** (evitar pushes innecesarios)
5. **NUNCA usar `/tmp/` en Termux** (no existe, usar `$HOME/` o pipes)
6. **Añadir alert de diagnóstico** cuando algo falla silenciosamente
7. **No dejar returns silenciosos** (siempre mostrar error al usuario)

### Scripts reusables en ~/comdiaz/
- `test-e2e.sh` — backend end-to-end
- `audit.sh` — auditoría general
- `audit-crons.sh` — auditoría crones
- `audit-full.sh` — auditoría 13 secciones
- `audit-cierre.sh` — auditoría de cierre
- `audit-profunda.sh` — auditoría 9 áreas profundas

---

## 🔗 LINKS DE PRODUCCIÓN

- **Shop:** https://com-diaz-web.onrender.com/shop.html
- **Seller register:** https://com-diaz-web.onrender.com/seller.html
- **Seller panel:** https://com-diaz-web.onrender.com/seller-panel.html
- **Admin panel:** https://com-diaz-web.onrender.com/home.html
- **Backend:** https://com-diaz.onrender.com
- **APK Drive:** https://drive.google.com/file/d/1YYad5ECgr8eDiWjWsip5D11md3ayuvxL/view
- **Grupo WhatsApp:** https://chat.whatsapp.com/HVbGq9WJLgzLVSvhY9WDqh
- **WhatsApp admin:** 5351425691
- **Osbey (vendedor real):** 5358980267
- **Osbey código referido:** OSBEY02676H0

---

## 💡 LECCIONES APRENDIDAS ESTA SESIÓN

### Sobre el entorno
1. **Termux no tiene `/tmp/`** → falseó 5+ diagnósticos de "backend 0B"
2. **Render tiene cold start** → primera request puede tardar 50s
3. **Service Worker cachea agresivamente** → siempre limpiar después de deploy

### Sobre el código
1. **Los `\n` literales en heredocs de bash rompen JS** → usar `String.fromCharCode(10)`
2. **El patrón de reemplazo Python puede fallar silenciosamente** → siempre verificar con `grep -c`
3. **Balance de `<script>` y `</script>`** → siempre verificar 1:1
4. **Los `catch (_)` silenciosos ocultan bugs** → añadir `console.error`

### Sobre diagnóstico
1. **Alert de prueba** > logs de consola (funciona sin chrome://inspect)
2. **Probar 1 foto antes de 18** (validación incremental)
3. **Verificar ubicación de funciones** después de insertar (`grep -n`)

---

## 📊 HISTORIAL DE SESIONES

- **Sesión 22 Oct:** Panel vendedor (carga masiva, fotos)
- **Sesión 23 Oct:** Notificaciones + monetización + auditoría
- **Sesión 24 Oct:** Shop rediseño + pagos + referidos + banner v2
- **Sesión 25 Oct:** Robustez + fixes referidos + caché + rate limit
- **Próxima:** Banners reales + carga masiva UI + APK admin

---

**Para retomar:** di "seguimos con Comdiaz" y leo este ROADMAP.

**Prioridades próxima sesión:**
1. Banners reales dinámicos (45 min)
2. Carga masiva A.1 + A.2 + A.3 (90 min)
3. Push Android (según tiempo)
