// comdiaz/frontend/welcome.js
// Welcome con PIN que valida contra el backend y guarda la clave

const PIN_LENGTH = 4;
const SESSION_HOURS = 12;

const KEY_SESSION = 'comdiaz_auth_until';
const KEY_API     = 'comdiaz_api_key';

const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://com-diaz.onrender.com';

const $ = id => document.getElementById(id);
let buffer = '';

function goHome() { location.href = 'home.html'; }

function showPin() {
  $('loaderBlock').classList.add('hidden');
  $('welcomeHint').classList.add('hidden');
  $('pinBlock').classList.remove('hidden');
  renderDots();
}

function buildPad() {
  const pad = $('pinPad');
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  pad.innerHTML = '';
  keys.forEach(k => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pin-key' + (k === '' ? ' empty' : '');
    b.textContent = k;
    if (k === '') b.disabled = true;
    else b.onclick = () => press(k);
    pad.appendChild(b);
  });
}

function press(k) {
  $('pinError').textContent = '';
  if (k === '⌫') buffer = buffer.slice(0, -1);
  else {
    if (buffer.length >= PIN_LENGTH) return;
    buffer += k;
    if (navigator.vibrate) navigator.vibrate(12);
  }
  renderDots();
  if (buffer.length === PIN_LENGTH) setTimeout(checkPin, 120);
}

function renderDots() {
  const dots = $('pinDots').children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].classList.toggle('filled', i < buffer.length);
    dots[i].classList.remove('err');
  }
}

async function checkPin() {
  const pin = buffer;
  $('pinError').textContent = 'Validando…';
  $('pinError').style.color = '#94a3b8';

  try {
    const r = await fetch(API_BASE + '/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: pin }),
    });
    const data = await r.json();

    if (data.ok) {
      localStorage.setItem(KEY_SESSION, String(Date.now() + SESSION_HOURS * 3600 * 1000));
      localStorage.setItem(KEY_API, pin);
      $('pinError').textContent = '✓ Acceso concedido';
      $('pinError').style.color = '#10b981';
      if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
      setTimeout(goHome, 350);
    } else {
      mostrarError();
    }
  } catch (e) {
    $('pinError').textContent = '✕ Sin conexión';
    $('pinError').style.color = '#ef4444';
    buffer = '';
    renderDots();
  }
}

function mostrarError() {
  const dots = $('pinDots').children;
  for (let i = 0; i < dots.length; i++) dots[i].classList.add('err');
  $('pinError').textContent = '✕ PIN incorrecto';
  $('pinError').style.color = '#ef4444';
  if (navigator.vibrate) navigator.vibrate(120);
  setTimeout(() => { buffer = ''; renderDots(); }, 500);
}

document.addEventListener('keydown', e => {
  if ($('pinBlock').classList.contains('hidden')) return;
  if (/^[0-9]$/.test(e.key)) press(e.key);
  else if (e.key === 'Backspace') press('⌫');
});

buildPad();

const until = Number(localStorage.getItem(KEY_SESSION) || 0);
if (until > Date.now() && localStorage.getItem(KEY_API)) {
  setTimeout(goHome, 1200);
} else {
  localStorage.removeItem(KEY_SESSION);
  localStorage.removeItem(KEY_API);
  setTimeout(showPin, 800);
}
