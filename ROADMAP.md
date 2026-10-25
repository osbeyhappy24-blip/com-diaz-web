# Comdiaz Shop — ROADMAP
**Última actualización:** 25 Oct 2026, tarde

---

## ✅ COMPLETADO (Sesión 25 Oct)

### Sistema de referidos 100% end-to-end
- [x] Código único determinístico por sellerId (inmutable)
- [x] Link compartido → seller.html?ref=CODIGO (fix aplicado)
- [x] Notif `referral_registered` inmediata al referente
- [x] Notif `referral_bonus` al aprobar (+5 productos)
- [x] Push en barra Android funcionando
- [x] Cada seller tiene su código único automático
- [x] Test real con Keila (esposa de Osbey) exitoso
- [x] Soft delete libera teléfono para re-registro

### Robustez y escalabilidad
- [x] Rate limit adaptativo: 20/40/80/120 por plan
- [x] Caché 30s en `/api/public/local` (6s → 1.3s)
- [x] Circuit breaker imgbb (5 fallos → 60s)
- [x] Fix bodyLimit Fastify 1MB → 5MB
- [x] Fix CSS header (se perdió, re-añadido)
- [x] Fix banner JS cfg.config

### Fixes UI
- [x] Compresión fotos 900px@75% (~80KB)
- [x] Upload con retry 2x + skip failures + resumen
- [x] navigator.share (modal nativo Android - todas las apps)
- [x] Sección "Comparte y gana" movida arriba (visible)

### Estado actual
| Métrica | Valor |
|---|---|
| Sellers aprobados | 3 (Osbey Pro + Keila + Yaumel basico) |
| Sellers suspendidos | 9 (tests) |
| Sellers eliminados | 1 (Keila antigua - soft delete) |
| Productos activos | 11 (10 manuales + 1 seller) |
| Push subs | 1 activa (Osbey) |
| Referidos activos | 1 (Keila referida por Osbey) |
| Pagos procesados | 1 ($5 Pro) |

---

## 🔴 PRÓXIMO BLOQUE — Carga masiva UI (90 min)

### A.1 — UI formularios por foto (30 min)
- Lista vertical: 1 formulario por foto
- Preview + campos por foto
- Sección "🌍 Aplicar a TODOS"
- Botón "💾 Guardar N productos"

### A.2 — IndexedDB offline (30 min)
- Guardar cambios automáticamente
- Recuperar al reabrir

### A.3 — Cola de sync (30 min)
- Reintentos con backoff (1s→2s→4s→8s)
- Sección "⏳ Pendientes de sincronizar"
- Botón "🔄 Sincronizar ahora"

---

## 🟡 PRÓXIMAS SESIONES — Prioridad MEDIA

### Banners reales dinámicos (45 min)
**Problema:** 4 de 5 textos del banner son ficticios.
**Fix:**
- Reemplazar por 5 REALES calculados del catálogo
- "X productos disponibles" (contar)
- "Desde $[min] USD" (más barato real)
- "X vendedores verificados"
- "Compra directo sin comisiones"
- "Productos cubanos e importados"
- Deshabilitar aiBanners hasta IA real

### Compartir producto con link (20 min)
- Botón "🔗 Compartir" en cada card
- Genera: `shop.html?product=<id>`
- Al abrir: scroll al producto + abre modal
- Usa `navigator.share()` (todas las apps)

### IA fotos locales (120 min)
**Lo que pediste:**
- Detectar si foto es de cámara (EXIF)
- Solo procesar las feas
- Mejorar con Gemini
- Generar descripción automática
- Respetar cuota diaria API

### Antifraude SMS OTP (90 min)
**Lo que pediste:**
- Verificar que teléfono sea real
- Enviar código 6 dígitos por SMS/WhatsApp
- Requiere Firebase Phone Auth (10k/mes gratis)

### Push Android TWA (variable)
- FCM acepta pero Android no muestra (bug PWABuilder)
- Recompilar APK con Bubblewrap actualizado
- O usar PWA Chrome para push

### APK admin completa (14 items)
- Editor métodos de pago
- Dashboard financiero
- Ver productos por vendedor
- Editar notas internas
- Log de auditoría
- Historial de pagos
- Exportar CSV
- Editor de promociones
- Etc.

