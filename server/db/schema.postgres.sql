-- Esquema PostgreSQL (Neon.com) para Recetario Ultraseco 2.0 (Versión Online)

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    categoria TEXT NOT NULL CHECK (categoria IN ('Estuco', 'Pintura', 'Cera', 'Antigoteras', 'Otro')),
    descripcion TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS recetas (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    codigo_version TEXT NOT NULL,
    nombre_version TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('Vigente', 'Borrador', 'Obsoleta')),
    fecha_creacion TEXT NOT NULL,
    fecha_modificacion TEXT NOT NULL,
    responsable TEXT NOT NULL,
    lote_base_cantidad DOUBLE PRECISION NOT NULL CHECK (lote_base_cantidad > 0),
    lote_base_unidad TEXT NOT NULL CHECK (lote_base_unidad IN ('kg', 'g', 'L', 'mL')),
    notas TEXT NOT NULL DEFAULT '',
    UNIQUE(producto_id, codigo_version)
);

CREATE TABLE IF NOT EXISTS componentes (
    id SERIAL PRIMARY KEY,
    receta_id INTEGER NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL DEFAULT 1,
    nombre TEXT NOT NULL,
    cantidad DOUBLE PRECISION NOT NULL CHECK (cantidad >= 0),
    unidad TEXT NOT NULL CHECK (unidad IN ('kg', 'g', 'L', 'mL', '%'))
);

CREATE TABLE IF NOT EXISTS pasos (
    id SERIAL PRIMARY KEY,
    receta_id INTEGER NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
    numero_paso INTEGER NOT NULL,
    accion TEXT NOT NULL,
    componente_nombre TEXT DEFAULT NULL,
    cantidad DOUBLE PRECISION DEFAULT NULL,
    unidad TEXT DEFAULT NULL,
    tiempo_mezclado_min DOUBLE PRECISION DEFAULT NULL,
    rpm INTEGER DEFAULT NULL,
    temperatura_c DOUBLE PRECISION DEFAULT NULL,
    observaciones TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_recetas_producto ON recetas(producto_id);
CREATE INDEX IF NOT EXISTS idx_componentes_receta ON componentes(receta_id, orden);
CREATE INDEX IF NOT EXISTS idx_pasos_receta ON pasos(receta_id, numero_paso);

