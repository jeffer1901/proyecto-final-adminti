// Web de la Droguería Farmadrogas — Express + PostgreSQL
const path = require('path');
const os = require('os');
const express = require('express');
const { pool, inicializar } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'farmadrogas2026';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Estado del servicio y de la base de datos (para la demostración)
app.get('/api/estado', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT version() AS version, NOW() AS hora_db, current_database() AS base,
              (SELECT COUNT(*)::int FROM productos) AS productos`
    );
    res.json({
      app: 'web-farmadrogas',
      contenedor: os.hostname(),
      hora_servidor: new Date().toISOString(),
      base_de_datos: 'conectada',
      ...r.rows[0],
    });
  } catch (e) {
    res.status(500).json({ base_de_datos: 'error', detalle: e.message });
  }
});

app.get('/api/categorias', async (req, res) => {
  const r = await pool.query('SELECT id, nombre FROM categorias ORDER BY nombre');
  res.json(r.rows);
});

// Catálogo con búsqueda (?q=texto) y filtro (?categoria=id)
app.get('/api/productos', async (req, res) => {
  const q = (req.query.q || '').trim();
  const cat = parseInt(req.query.categoria, 10);
  const params = [];
  const filtros = [];
  if (q) { params.push(`%${q}%`); filtros.push(`p.nombre ILIKE $${params.length}`); }
  if (cat) { params.push(cat); filtros.push(`p.categoria_id = $${params.length}`); }
  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
  const r = await pool.query(
    `SELECT p.id, p.nombre, p.presentacion, c.nombre AS categoria, p.precio, p.stock, p.requiere_formula
       FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id
       ${where} ORDER BY p.nombre`,
    params
  );
  res.json(r.rows);
});

// Agregar producto (panel administrativo, protegido con clave)
app.post('/api/productos', async (req, res) => {
  if (req.get('x-admin-key') !== ADMIN_KEY) return res.status(401).json({ error: 'Clave incorrecta' });
  const { nombre, presentacion, categoria_id, precio, stock, requiere_formula } = req.body || {};
  if (!nombre || precio == null) return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
  try {
    const r = await pool.query(
      `INSERT INTO productos (nombre, presentacion, categoria_id, precio, stock, requiere_formula)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nombre, presentacion || null, categoria_id || null, parseInt(precio, 10), parseInt(stock || 0, 10), !!requiere_formula]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Formulario de contacto
app.post('/api/mensajes', async (req, res) => {
  const { nombre, telefono, mensaje } = req.body || {};
  if (!nombre || !mensaje) return res.status(400).json({ error: 'Nombre y mensaje son obligatorios' });
  await pool.query('INSERT INTO mensajes (nombre, telefono, mensaje) VALUES ($1, $2, $3)', [nombre, telefono || null, mensaje]);
  res.status(201).json({ ok: true });
});

app.get('/api/mensajes', async (req, res) => {
  if (req.get('x-admin-key') !== ADMIN_KEY) return res.status(401).json({ error: 'Clave incorrecta' });
  const r = await pool.query('SELECT * FROM mensajes ORDER BY creado_en DESC LIMIT 50');
  res.json(r.rows);
});

async function iniciar() {
  for (let intento = 1; intento <= 10; intento++) {
    try {
      await inicializar();
      break;
    } catch (e) {
      console.log(`Esperando la base de datos (intento ${intento}/10): ${e.message}`);
      if (intento === 10) process.exit(1);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  app.listen(PORT, () => console.log(`Web Farmadrogas escuchando en el puerto ${PORT}`));
}

iniciar();
