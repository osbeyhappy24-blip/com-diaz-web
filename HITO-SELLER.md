# Hito — Sistema Seller 100% Operativo (31 Oct 2026)

## Recuperación exitosa
- ✅ Supabase configurado en Render nuevo (srv-dbg3prafngtc738jm6gg)
- ✅ 14 sellers recuperados (3 aprobados + 11 suspendidos de tests)
- ✅ Register funciona (nuevos sellers van a "pendiente")
- ✅ Login funciona con JWT
- ✅ Catálogo público de sellers devuelve productos

## Sellers reales recuperados
| Seller | Teléfono | Plan | Cuota |
|---|---|---|---|
| Keila Lozano | 5351425691 | básico | 0/50 |
| Yaumel Gonzales | 5356196214 | básico | 0/50 |
| Osbey Díaz | 5358980267 | pro | 1/200 |

## Env vars Supabase configuradas
- SUPABASE_URL = https://lwihdsigyrabsgsbbapj.supabase.co
- SUPABASE_SECRET_KEY = sb_secret_... (configurada en Render)

## Endpoints verificados
- POST /api/seller/register ✅
- POST /api/seller/login ✅
- GET /api/seller/me ✅
- GET /api/admin/sellers ✅
- GET /api/public/sellers/catalog ✅

## Pendiente FASE C — Tiendas por Seller
- Tabla `tiendas` (id, seller_id, slug, nombre, logo, banner)
- Endpoint POST /api/seller/crear-tienda
- Página tienda.html?slug=xxx
- Página producto.html?id=xxx
- Badge "🏪 [Nombre tienda]" en cards
- Subdominios slug.comdiaz.provolt.cloud
