-- Esquema de la base de datos de la web de Farmadrogas (PostgreSQL)
-- La aplicación lo ejecuta sola al iniciar (db.js); este archivo queda como documentación
-- y para crearlo a mano con psql si se desea.

CREATE TABLE IF NOT EXISTS categorias (
  id      SERIAL PRIMARY KEY,
  nombre  VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS productos (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(120) NOT NULL,
  presentacion   VARCHAR(80),
  categoria_id   INTEGER REFERENCES categorias(id),
  precio         INTEGER NOT NULL CHECK (precio >= 0),      -- pesos colombianos
  stock          INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  requiere_formula BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensajes (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(80) NOT NULL,
  telefono   VARCHAR(20),
  mensaje    TEXT NOT NULL,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
