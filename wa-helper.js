// ═══════════════════════════════════════════════════════
// WhatsApp helper — detecta TWA/APK y usa scheme nativo
// (evita Custom Tab / barra con X al abrir WhatsApp)
// ═══════════════════════════════════════════════════════
(function(){
  function esAppNativa() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      if (navigator.standalone === true) return true;
      if (document.referrer && document.referrer.indexOf('android-app://') === 0) return true;
      if (/\bwv\b/.test(navigator.userAgent) && /Android/.test(navigator.userAgent)) return true;
      if (/Comdiaz/i.test(navigator.userAgent)) return true;
    } catch(_) {}
    return false;
  }

  function abrirWA(telefono, texto) {
    const p = String(telefono || '').replace(/\D/g, '');
    if (!p) return;
    const t = texto ? encodeURIComponent(texto) : '';
    const web = 'https://wa.me/' + p + (t ? '?text=' + t : '');

    if (esAppNativa()) {
      // Scheme nativo → abre app WhatsApp, no Custom Tab
      const native = 'whatsapp://send?phone=' + p + (t ? '&text=' + t : '');
      // Fallback web por si no tiene WhatsApp instalado
      const t0 = Date.now();
      const onHide = () => { window.removeEventListener('visibilitychange', onHide); };
      document.addEventListener('visibilitychange', onHide, { once: true });
      window.location.href = native;
      setTimeout(() => {
        if (document.visibilityState === 'visible' && Date.now() - t0 < 2500) {
          window.location.href = web;
        }
      }, 1200);
    } else {
      window.location.href = web;
    }
  }

  // Abrir en nueva pestaña (para botones con href)
  function abrirWATab(telefono, texto) {
    const p = String(telefono || '').replace(/\D/g, '');
    if (!p) return;
    const t = texto ? encodeURIComponent(texto) : '';
    if (esAppNativa()) {
      window.location.href = 'whatsapp://send?phone=' + p + (t ? '&text=' + t : '');
    } else {
      window.open('https://wa.me/' + p + (t ? '?text=' + t : ''), '_blank');
    }
  }

  window.comdiaz_abrirWA = abrirWA;
  window.comdiaz_abrirWATab = abrirWATab;
  window.comdiaz_esAppNativa = esAppNativa;
  console.log('[WA] helper listo (app nativa: ' + esAppNativa() + ')');
})();
