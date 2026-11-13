const cfg = window.FARMADROGAS;
const pesos = (n) => '$' + Number(n).toLocaleString('es-CO');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Datos de la droguería
document.querySelectorAll('[data-dato]').forEach((el) => (el.textContent = cfg[el.dataset.dato]));
document.getElementById('horario').innerHTML = cfg.horario.map((h) => `<li>${esc(h)}</li>`).join('');
if (cfg.whatsapp) {
  const b = document.getElementById('btn-whatsapp');
  b.href = `https://wa.me/${cfg.whatsapp}`;
  b.hidden = false;
}

// Catálogo
const inputBuscar = document.getElementById('buscar');
const selCategoria = document.getElementById('categoria');

async function cargarCategorias() {
  const cats = await (await fetch('/api/categorias')).json();
  selCategoria.innerHTML += cats.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
}

async function cargarProductos() {
  const p = new URLSearchParams();
  if (inputBuscar.value.trim()) p.set('q', inputBuscar.value.trim());
  if (selCategoria.value) p.set('categoria', selCategoria.value);
  const lista = await (await fetch('/api/productos?' + p)).json();
  document.getElementById('vacio').hidden = lista.length > 0;
  document.getElementById('productos').innerHTML = lista
    .map((x) => {
      const disp = x.stock > 0 ? `<span class="disp si">Disponible</span>` : `<span class="disp no">Agotado</span>`;
      const formula = x.requiere_formula ? `<span class="formula">Requiere fórmula</span>` : '';
      return `<div class="producto">
        <span class="cat">${esc(x.categoria || 'General')}</span>
        <h3>${esc(x.nombre)}</h3>
        <p class="pres">${esc(x.presentacion || '')}</p>
        <p class="precio">${pesos(x.precio)}</p>
        <div class="chips">${disp}${formula}</div>
      </div>`;
    })
    .join('');
}

let t;
inputBuscar.addEventListener('input', () => { clearTimeout(t); t = setTimeout(cargarProductos, 250); });
selCategoria.addEventListener('change', cargarProductos);

// Contacto
document.getElementById('form-contacto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  const r = await fetch('/api/mensajes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
  if (r.ok) { e.target.reset(); document.getElementById('contacto-ok').hidden = false; }
});

// Estado del servicio (pie de página)
async function estado() {
  const el = document.getElementById('estado');
  try {
    const s = await (await fetch('/api/estado')).json();
    el.textContent = s.base_de_datos === 'conectada'
      ? `🟢 Servicio en línea · Base de datos conectada (${s.productos} productos)`
      : '🔴 Base de datos sin conexión';
  } catch {
    el.textContent = '🔴 Servicio no disponible';
  }
}

cargarCategorias().then(cargarProductos);
estado();
