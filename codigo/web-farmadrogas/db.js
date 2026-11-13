// Conexión a PostgreSQL y creación automática del esquema + datos iniciales.
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: falta la variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CATEGORIAS = ['Analgésicos', 'Antialérgicos', 'Antibióticos', 'Primeros auxilios', 'Cuidado personal', 'Vitaminas', 'Bebés'];

// [nombre, presentación, categoría, precio COP, stock, requiere fórmula]
const PRODUCTOS = [
  ['Acetaminofén 500 mg', 'Caja x 10 tabletas', 'Analgésicos', 2500, 120, false],
  ['Ibuprofeno 400 mg', 'Caja x 10 tabletas', 'Analgésicos', 4200, 80, false],
  ['Naproxeno 250 mg', 'Caja x 10 tabletas', 'Analgésicos', 5800, 35, false],
  ['Loratadina 10 mg', 'Caja x 10 tabletas', 'Antialérgicos', 3900, 60, false],
  ['Cetirizina 10 mg', 'Caja x 10 tabletas', 'Antialérgicos', 4500, 40, false],
  ['Amoxicilina 500 mg', 'Caja x 50 cápsulas', 'Antibióticos', 18500, 25, true],
  ['Alcohol antiséptico', 'Frasco 350 ml', 'Primeros auxilios', 6500, 50, false],
  ['Gasa estéril', 'Sobre x 5 unidades', 'Primeros auxilios', 1800, 200, false],
  ['Curitas', 'Caja x 30 unidades', 'Primeros auxilios', 5200, 45, false],
  ['Suero oral', 'Sobre para 1 litro', 'Primeros auxilios', 3000, 70, false],
  ['Crema dental con flúor', 'Tubo 100 ml', 'Cuidado personal', 7900, 55, false],
  ['Protector solar FPS 50', 'Tubo 120 ml', 'Cuidado personal', 42000, 12, false],
  ['Vitamina C 500 mg', 'Frasco x 100 tabletas', 'Vitaminas', 15900, 30, false],
  ['Complejo B', 'Caja x 30 tabletas', 'Vitaminas', 12500, 0, false],
  ['Pañales etapa 3', 'Paquete x 30 unidades', 'Bebés', 38900, 18, false],
  ['Pañitos húmedos', 'Paquete x 100 unidades', 'Bebés', 9900, 40, false],
];

async function inicializar() {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', 'init.sql'), 'utf8');
  await pool.query(sql);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM productos');
  if (rows[0].n > 0) return; // ya tiene datos

  for (const c of CATEGORIAS) {
    await pool.query('INSERT INTO categorias (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING', [c]);
  }
  for (const [nombre, pres, cat, precio, stock, formula] of PRODUCTOS) {
    await pool.query(
      `INSERT INTO productos (nombre, presentacion, categoria_id, precio, stock, requiere_formula)
       VALUES ($1, $2, (SELECT id FROM categorias WHERE nombre = $3), $4, $5, $6)`,
      [nombre, pres, cat, precio, stock, formula]
    );
  }
  console.log(`Datos iniciales cargados: ${PRODUCTOS.length} productos`);
}

module.exports = { pool, inicializar };
