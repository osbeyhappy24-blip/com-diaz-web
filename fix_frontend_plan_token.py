import re

with open('seller.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Inyectar plan_id en el fetch
patron_fetch = r"(body: JSON\.stringify\(\{[\s\S]*?referred_by_code: localStorage\.getItem\('comdiaz_referral_code'\) \|\| undefined\}\))"
reemplazo_fetch = """body: JSON.stringify({
        nombre: document.getElementById('regNombre').value.trim(),
        telefono: document.getElementById('regTelefono').value.trim(),
        password: document.getElementById('regPassword').value,
        provincia: document.getElementById('regProvincia').value || null,
        municipio: document.getElementById('regMunicipio').value || null,
        plan_id: document.getElementById('selectedPlanId').value || 'basico',
        referred_by_code: localStorage.getItem('comdiaz_referral_code') || undefined})"""
html = re.sub(patron_fetch, reemplazo_fetch, html)

# 2. Guardar el token cuando el registro sea exitoso
patron_token = r"(if \(d\.ok\) \{[\s\S]*?localStorage\.setItem\('comdiaz_seller_telefono', document\.getElementById\('regTelefono'\)\.value\.trim\(\)\);)"
reemplazo_token = r"""if (d.ok) {
      if (d.token) localStorage.setItem('comdiaz_seller_token', d.token);
      localStorage.setItem('comdiaz_seller_telefono', document.getElementById('regTelefono').value.trim());"""
html = re.sub(patron_token, reemplazo_token, html)

# 3. Arreglar el modal para que detecte el plan real
patron_modal = r"const planSeleccionado = document\.querySelector\('\.plan-card\.active'\)\?\.innerText \|\| 'Básico';"
reemplazo_modal = r"""const planId = document.getElementById('selectedPlanId').value || 'basico';
                            const planSeleccionado = planId === 'pro' ? 'Pro ($5 USD/mes)' : (planId === 'premium' ? 'Premium ($15 USD/mes)' : 'Básico');"""
html = re.sub(patron_modal, reemplazo_modal, html)

with open('seller.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("✅ Frontend: Plan enviado y token guardado")
