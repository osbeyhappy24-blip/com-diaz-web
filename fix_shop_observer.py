import re, os

archivo = 'shop.html'
observer_js = """
<script id="ptl-shop-observer">
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(() => {
        // 1. Ocultar contadores en 0
        const contadores = document.querySelectorAll('.stats-bar, .stats, #stats-container');
        contadores.forEach(c => {
            if (c.innerText.includes('0 PRODUCTOS') || c.innerText.includes('0 LOCALES')) {
                // Reemplazar el texto 0 por un guion o quitarlo
                c.innerHTML = c.innerHTML.replace(/0 PRODUCTOS/g, '...').replace(/0 LOCALES/g, '...');
            }
        });

        // 2. Inyectar el Banner CTA si no existe
        const mainContainer = document.querySelector('main') || document.querySelector('#app') || document.body;
        if (mainContainer && !document.getElementById('ptlBannerCTA')) {
            const banner = document.createElement('div');
            banner.id = 'ptlBannerCTA';
            banner.innerHTML = `
            <div style="background: linear-gradient(135deg, #131A2E 0%, #1F2A44 100%); border: 1px solid #22C55E; border-radius: 12px; padding: 15px 20px; margin: 15px 10px; display: flex; align-items: center; justify-content: space-between; gap: 15px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.2);">
              <div>
                <h3 style="margin: 0 0 5px 0; color: #F1F5F9; font-size: 16px; font-weight: 800;">🚀 ¡Vende en Cuba!</h3>
                <p style="margin: 0; color: #94A3B8; font-size: 12px;">Crea tu tienda gratis y llega a miles de clientes.</p>
              </div>
              <a href="seller.html" style="background: #22C55E; color: #0A0E1A; padding: 10px 18px; border-radius: 8px; font-weight: 800; font-size: 14px; text-decoration: none; white-space: nowrap;">Crear Tienda</a>
            </div>
            `;
            // Insertar justo después de la barra de búsqueda
            const searchBar = document.querySelector('input[placeholder*="Buscar"]');
            if (searchBar && searchBar.parentNode) {
                searchBar.parentNode.parentNode.insertBefore(banner, searchBar.parentNode.nextSibling);
            } else {
                mainContainer.insertBefore(banner, mainContainer.firstChild);
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
});
</script>
"""
if os.path.exists(archivo):
    with open(archivo, 'r', encoding='utf-8') as f:
        html = f.read()
    if 'ptl-shop-observer' not in html:
        html = html.replace('</body>', observer_js + '\n</body>')
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ Observer inyectado en shop.html")
