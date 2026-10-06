// comdiaz/frontend/welcome.js
// Welcome con gate de PIN numérico

// 🔐 Cambia aquí tu PIN (4 dígitos por defecto)
const PIN = '1234';

// Cuántas horas dura la sesión abierta sin volver a pedir PIN
const SESSION_HOURS = 12;

const KEY = 'comdiaz_auth_until';
const $ = id => document.getElementById(id);

let buffer = '';

// ---------- Flujo de arranque ----------
function goHome() { location.href = 'home.html'; }

function showPin() {
  $('loaderBlock').classList.add('hidden');
  $('welcomeHint').classList.add('hidden');
  $('pinBlock').classList.remove('hidden');
  renderDots();
}

// ---------- Teclado ----------
function buildPad() {
  const pad = $('pinPad');
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  pad.innerHTML = '';
  keys.forEach(k => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pin-key' + (k === '' ? ' empty' : '');
    b.textContent = k;
    if (k === '') { b.disabled = true; }
    else {
      b.onclick = () => press(k);
    }
    pad.appendChild(b);
  });
}

function press(k) {
  $('pinError').textContent = '';
  if (k === '⌫') {
    buffer = buffer.slice(0, -1);
  } else {
    if (buffer.length >= PIN.length) return;
    buffer += k;
    if (navigator.vibrate) navigator.vibrate(12);
  }
  renderDots();
  if (buffer.length === PIN.length) setTimeout(checkPin, 120);
}

function renderDots() {
  const dots = $('pinDots').children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].classList.toggle('filled', i < buffer.length);
    dots[i].classList.toggle('err', false);
  }
}

// ---------- Verificación ----------
function checkPin() {
  if (buffer === PIN) {
    localStorage.setItem(KEY, String(Date.now() + SESSION_HOURS * 3600 * 1000));
    $('pinError').textContent = '✓ Acceso concedido';
    $('pinError').style.color = '#10b981';
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
    setTimeout(goHome, 350);
  } else {
    const dots = $('pinDots').children;
    for (let i = 0; i < dots.length; i++) dots[i].classList.add('err');
    $('pinError').textContent = '✕ PIN incorrecto';
    $('pinError').style.color = '#ef4444';
    if (navigator.vibrate) navigator.vibrate(120);
    setTimeout(() => {
      buffer = '';
      renderDots();
    }, 500);
  }
}

// ---------- Soporte teclado físico (opcional) ----------
document.addEventListener('keydown', e => {
  if ($('pinBlock').classList.contains('hidden')) return;
  if (/^[0-9]$/.test(e.key)) press(e.key);
  else if (e.key === 'Backspace') press('⌫');
});

// ---------- Arranque ----------
buildPad();

const until = Number(localStorage.getItem(KEY) || 0);
if (until > Date.now()) {
  // Sesión vigente → entra directo
  setTimeout(goHome, 1200);
} else {
  setTimeout(showPin, 800);
}
