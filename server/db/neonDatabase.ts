// Capa de acceso a datos PostgreSQL (Neon.com) para la versión Online de Recetario Ultraseco 2.0
import { Pool, type PoolClient } from 'pg';
import type {
  BackupData,
  Componente,
  DbInfo,
  GuardarRecetaPayload,
  Paso,
  Producto,
  ProductoConVariantes,
  RecetaCompleta,
  RecetaResumen,
} from '../../src/types/models.ts';

const SCHEMA_SQL = `
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
`;

async function seedInitialNeonData(client: PoolClient): Promise<void> {
  const countRes = await client.query<{ total: string }>('SELECT COUNT(*) as total FROM productos');
  if (Number(countRes.rows[0]?.total || 0) > 0) {
    return;
  }

  const now = new Date().toISOString();

  const prodRes = await client.query<{ id: number }>(
    `INSERT INTO productos (nombre, categoria, descripcion)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [
      'Estuco hidrofóbico',
      'Estuco',
      '[RECETA DE EJEMPLO] Revestimiento mineral superhidrofóbico con nanopartículas de sílice funcionalizada para fachadas y muros expuestos a humedad severa.',
    ]
  );

  const productoId = prodRes.rows[0].id;

  const recRes = await client.query<{ id: number }>(
    `INSERT INTO recetas (
      producto_id, codigo_version, nombre_version, estado,
      fecha_creacion, fecha_modificacion, responsable,
      lote_base_cantidad, lote_base_unidad, notas
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id`,
    [
      productoId,
      'v1.0',
      'Receta estándar [EJEMPLO - Reemplazar con valores reales]',
      'Vigente',
      now,
      now,
      'Ing. Carlos Méndez (Planta Piloto - EJEMPLO)',
      100,
      'kg',
      `⚠️ NOTA IMPORTANTE: ESTA ES UNA RECETA DE EJEMPLO CON VALORES FICTICIOS. Edite o reemplace estos datos con las formulaciones oficiales de planta.\n\nPRECAUCIONES DE SEGURIDAD E HIGIENE INDUSTRIAL:\n1. Uso obligatorio de mascarilla para polvos finos (N95/FFP3) y gafas de seguridad herméticas al manipular las nanopartículas de sílice pirogénica.\n2. Mantener extracción localizada encendida durante los pasos 3 y 4.\n3. No superar los 35 °C en el tanque de dispersión para evitar evaporación prematura del vehículo acuoso.\n4. Verificar ausencia de grumos antes de pasar al envasado.`,
    ]
  );

  const recetaId = recRes.rows[0].id;

  const componentesEjemplo = [
    { orden: 1, nombre: 'Agua desmineralizada', cantidad: 34.5, unidad: 'kg' },
    { orden: 2, nombre: 'Nonilfenol etoxilado (dispersante)', cantidad: 0.6, unidad: 'kg' },
    { orden: 3, nombre: 'Resina acrílica-estirenada en emulsión', cantidad: 14.0, unidad: 'kg' },
    { orden: 4, nombre: 'Carbonato de calcio malla 325', cantidad: 46.5, unidad: 'kg' },
    { orden: 5, nombre: 'Nanopartículas de sílice hidrofóbica (SiO2)', cantidad: 2.8, unidad: 'kg' },
    { orden: 6, nombre: 'Emulsión de siloxano reactivo', cantidad: 1.2, unidad: 'kg' },
    { orden: 7, nombre: 'Antiespumante siliconado industrial', cantidad: 0.4, unidad: 'kg' },
  ];

  for (const c of componentesEjemplo) {
    await client.query(
      `INSERT INTO componentes (receta_id, orden, nombre, cantidad, unidad)
       VALUES ($1, $2, $3, $4, $5)`,
      [recetaId, c.orden, c.nombre, c.cantidad, c.unidad]
    );
  }

  const pasosEjemplo = [
    {
      numero_paso: 1,
      accion: 'Agregar',
      componente_nombre: 'Agua desmineralizada',
      cantidad: 34.5,
      unidad: 'kg',
      tiempo_mezclado_min: 2,
      rpm: 200,
      temperatura_c: 22,
      observaciones: 'Cargar en el reactor principal limpio y encender agitación suave.',
    },
    {
      numero_paso: 2,
      accion: 'Agregar',
      componente_nombre: 'Nonilfenol etoxilado (dispersante)',
      cantidad: 0.6,
      unidad: 'kg',
      tiempo_mezclado_min: 5,
      rpm: 350,
      temperatura_c: 22,
      observaciones: 'Incorporar lentamente hasta homogeneizar sin generar espuma excesiva.',
    },
    {
      numero_paso: 3,
      accion: 'Dispersar',
      componente_nombre: 'Nanopartículas de sílice hidrofóbica (SiO2)',
      cantidad: 2.8,
      unidad: 'kg',
      tiempo_mezclado_min: 15,
      rpm: 1100,
      temperatura_c: 26,
      observaciones: 'Dosificar por tolva cerrada con disco Cowles a alta cizalla hasta humectación completa.',
    },
    {
      numero_paso: 4,
      accion: 'Agregar',
      componente_nombre: 'Carbonato de calcio malla 325',
      cantidad: 46.5,
      unidad: 'kg',
      tiempo_mezclado_min: 20,
      rpm: 900,
      temperatura_c: 30,
      observaciones: 'Añadir de forma continua vigilando amperaje del motor y ausencia de grumos.',
    },
    {
      numero_paso: 5,
      accion: 'Mezclar',
      componente_nombre: 'Resina acrílica-estirenada en emulsión',
      cantidad: 14.0,
      unidad: 'kg',
      tiempo_mezclado_min: 10,
      rpm: 450,
      temperatura_c: 28,
      observaciones: 'Reducir velocidad antes de incorporar la resina para no romper la emulsión.',
    },
    {
      numero_paso: 6,
      accion: 'Agregar',
      componente_nombre: 'Emulsión de siloxano reactivo',
      cantidad: 1.2,
      unidad: 'kg',
      tiempo_mezclado_min: 8,
      rpm: 400,
      temperatura_c: 26,
      observaciones: 'Asegurar distribución uniforme del agente hidrofugante en toda la pasta.',
    },
    {
      numero_paso: 7,
      accion: 'Agregar',
      componente_nombre: 'Antiespumante siliconado industrial',
      cantidad: 0.4,
      unidad: 'kg',
      tiempo_mezclado_min: 5,
      rpm: 200,
      temperatura_c: 25,
      observaciones: 'Desairear la mezcla a baja revolución.',
    },
    {
      numero_paso: 8,
      accion: 'Verificar',
      componente_nombre: null,
      cantidad: null,
      unidad: null,
      tiempo_mezclado_min: 5,
      rpm: null,
      temperatura_c: 25,
      observaciones: 'Dejar reposar, medir viscosidad Brookfield y realizar prueba de gota de agua en probeta seca.',
    },
  ];

  for (const p of pasosEjemplo) {
    await client.query(
      `INSERT INTO pasos (
        receta_id, numero_paso, accion, componente_nombre,
        cantidad, unidad, tiempo_mezclado_min, rpm, temperatura_c, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        recetaId,
        p.numero_paso,
        p.accion,
        p.componente_nombre,
        p.cantidad,
        p.unidad,
        p.tiempo_mezclado_min,
        p.rpm,
        p.temperatura_c,
        p.observaciones,
      ]
    );
  }
}

export class NeonRecipeDatabase {
  private pool: Pool;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private readonly maskedUrl: string;

  constructor(connectionString?: string) {
    const dbUrl = connectionString || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error(
        'Falta la variable de entorno DATABASE_URL con la cadena de conexión de Neon.com (postgresql://...).'
      );
    }

    this.maskedUrl = dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');

    this.pool = new Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(SCHEMA_SQL);
        await seedInitialNeonData(client);
        await client.query('COMMIT');
        this.initialized = true;
      } catch (err) {
        await client.query('ROLLBACK');
        this.initPromise = null;
        throw err;
      } finally {
        client.release();
      }
    })();

    return this.initPromise;
  }

  public async getInfo(): Promise<DbInfo> {
    await this.ensureInitialized();
    const prodRes = await this.pool.query<{ c: string }>('SELECT COUNT(*) as c FROM productos');
    const recRes = await this.pool.query<{ c: string }>('SELECT COUNT(*) as c FROM recetas');
    return {
      dbPath: `Neon PostgreSQL Cloud (${this.maskedUrl})`,
      totalProductos: Number(prodRes.rows[0]?.c || 0),
      totalRecetas: Number(recRes.rows[0]?.c || 0),
      modoEjecucion: 'local-desktop-server',
    };
  }

  public async getTree(): Promise<ProductoConVariantes[]> {
    await this.ensureInitialized();

    const prodRes = await this.pool.query<Producto>(
      'SELECT id, nombre, categoria, descripcion FROM productos ORDER BY categoria ASC, nombre ASC'
    );
    const recRes = await this.pool.query<Omit<RecetaResumen, 'componentes_nombres'>>(
      `SELECT
        id, producto_id, codigo_version, nombre_version, estado,
        fecha_creacion, fecha_modificacion, responsable,
        lote_base_cantidad, lote_base_unidad, notas
       FROM recetas
       ORDER BY codigo_version ASC, id ASC`
    );
    const compRes = await this.pool.query<{ receta_id: number; nombre: string }>(
      'SELECT receta_id, nombre FROM componentes ORDER BY orden ASC'
    );

    const compMap = new Map<number, string[]>();
    for (const row of compRes.rows) {
      const list = compMap.get(row.receta_id) || [];
      list.push(row.nombre);
      compMap.set(row.receta_id, list);
    }

    const variantesByProd = new Map<number, RecetaResumen[]>();
    for (const r of recRes.rows) {
      const list = variantesByProd.get(r.producto_id) || [];
      list.push({
        ...r,
        lote_base_cantidad: Number(r.lote_base_cantidad),
        componentes_nombres: compMap.get(r.id) || [],
      });
      variantesByProd.set(r.producto_id, list);
    }

    return prodRes.rows.map((p) => ({
      ...p,
      variantes: variantesByProd.get(p.id) || [],
    }));
  }

  public async getRecetaById(recetaId: number): Promise<RecetaCompleta | null> {
    await this.ensureInitialized();

    const recRes = await this.pool.query<Omit<RecetaCompleta, 'componentes' | 'pasos'>>(
      `SELECT
        r.id, r.producto_id, r.codigo_version, r.nombre_version, r.estado,
        r.fecha_creacion, r.fecha_modificacion, r.responsable,
        r.lote_base_cantidad, r.lote_base_unidad, r.notas,
        p.nombre as producto_nombre,
        p.categoria as producto_categoria,
        p.descripcion as producto_descripcion
       FROM recetas r
       JOIN productos p ON p.id = r.producto_id
       WHERE r.id = $1`,
      [recetaId]
    );

    const row = recRes.rows[0];
    if (!row) return null;

    const compRes = await this.pool.query<Componente>(
      `SELECT id, receta_id, orden, nombre, cantidad, unidad
       FROM componentes
       WHERE receta_id = $1
       ORDER BY orden ASC, id ASC`,
      [recetaId]
    );

    const pasosRes = await this.pool.query<Paso>(
      `SELECT
        id, receta_id, numero_paso, accion, componente_nombre,
        cantidad, unidad, tiempo_mezclado_min, rpm, temperatura_c, observaciones
       FROM pasos
       WHERE receta_id = $1
       ORDER BY numero_paso ASC, id ASC`,
      [recetaId]
    );

    return {
      ...row,
      lote_base_cantidad: Number(row.lote_base_cantidad),
      componentes: compRes.rows.map((c) => ({ ...c, cantidad: Number(c.cantidad) })),
      pasos: pasosRes.rows.map((p) => ({
        ...p,
        cantidad: p.cantidad !== null ? Number(p.cantidad) : null,
        tiempo_mezclado_min: p.tiempo_mezclado_min !== null ? Number(p.tiempo_mezclado_min) : null,
        rpm: p.rpm !== null ? Number(p.rpm) : null,
        temperatura_c: p.temperatura_c !== null ? Number(p.temperatura_c) : null,
      })),
    };
  }

  public async saveReceta(payload: GuardarRecetaPayload): Promise<RecetaCompleta> {
    await this.ensureInitialized();

    if (!payload.codigo_version?.trim()) {
      throw new Error('El código de versión es obligatorio (ej. v1.0).');
    }
    if (!payload.nombre_version?.trim()) {
      throw new Error('El nombre o descripción corta de la variante es obligatorio.');
    }
    if (!payload.responsable?.trim()) {
      throw new Error('El responsable de creación es obligatorio.');
    }
    if (!payload.lote_base_cantidad || payload.lote_base_cantidad <= 0) {
      throw new Error('El tamaño de lote base debe ser mayor que cero.');
    }

    const now = new Date().toISOString();
    const client = await this.pool.connect();
    let savedId: number;

    try {
      await client.query('BEGIN');

      let productoId = payload.producto_id;

      if (payload.nuevo_producto) {
        const nombreProd = payload.nuevo_producto.nombre.trim();
        if (!nombreProd) {
          throw new Error('El nombre del producto es obligatorio.');
        }
        const existingProd = await client.query<{ id: number }>(
          'SELECT id FROM productos WHERE LOWER(nombre) = LOWER($1)',
          [nombreProd]
        );
        if (existingProd.rows.length > 0) {
          throw new Error(
            `Ya existe un producto llamado "${nombreProd}". Selecciónelo de la lista de productos existentes.`
          );
        }
        const resProd = await client.query<{ id: number }>(
          'INSERT INTO productos (nombre, categoria, descripcion) VALUES ($1, $2, $3) RETURNING id',
          [nombreProd, payload.nuevo_producto.categoria, payload.nuevo_producto.descripcion?.trim() || '']
        );
        productoId = resProd.rows[0].id;
      } else if (productoId && payload.actualizar_producto) {
        const nombreProd = payload.actualizar_producto.nombre.trim();
        if (!nombreProd) {
          throw new Error('El nombre del producto no puede estar vacío.');
        }
        const dupProd = await client.query<{ id: number }>(
          'SELECT id FROM productos WHERE LOWER(nombre) = LOWER($1) AND id != $2',
          [nombreProd, productoId]
        );
        if (dupProd.rows.length > 0) {
          throw new Error(`Ya existe otro producto con el nombre "${nombreProd}".`);
        }
        await client.query('UPDATE productos SET nombre = $1, categoria = $2, descripcion = $3 WHERE id = $4', [
          nombreProd,
          payload.actualizar_producto.categoria,
          payload.actualizar_producto.descripcion?.trim() || '',
          productoId,
        ]);
      }

      if (!productoId) {
        throw new Error('Debe seleccionar un producto o crear uno nuevo.');
      }

      let recetaId = payload.id;
      const codigoVersion = payload.codigo_version.trim();

      const dupVersion = await client.query<{ id: number }>(
        'SELECT id FROM recetas WHERE producto_id = $1 AND LOWER(codigo_version) = LOWER($2) AND id != COALESCE($3, -1)',
        [productoId, codigoVersion, recetaId ?? null]
      );
      if (dupVersion.rows.length > 0) {
        throw new Error(`El producto ya tiene una variante con el código de versión "${codigoVersion}".`);
      }

      if (recetaId) {
        await client.query(
          `UPDATE recetas SET
            producto_id = $1,
            codigo_version = $2,
            nombre_version = $3,
            estado = $4,
            fecha_modificacion = $5,
            responsable = $6,
            lote_base_cantidad = $7,
            lote_base_unidad = $8,
            notas = $9
           WHERE id = $10`,
          [
            productoId,
            codigoVersion,
            payload.nombre_version.trim(),
            payload.estado,
            now,
            payload.responsable.trim(),
            Number(payload.lote_base_cantidad),
            payload.lote_base_unidad,
            payload.notas || '',
            recetaId,
          ]
        );

        await client.query('DELETE FROM componentes WHERE receta_id = $1', [recetaId]);
        await client.query('DELETE FROM pasos WHERE receta_id = $1', [recetaId]);
      } else {
        const resRec = await client.query<{ id: number }>(
          `INSERT INTO recetas (
            producto_id, codigo_version, nombre_version, estado,
            fecha_creacion, fecha_modificacion, responsable,
            lote_base_cantidad, lote_base_unidad, notas
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`,
          [
            productoId,
            codigoVersion,
            payload.nombre_version.trim(),
            payload.estado,
            now,
            now,
            payload.responsable.trim(),
            Number(payload.lote_base_cantidad),
            payload.lote_base_unidad,
            payload.notas || '',
          ]
        );
        recetaId = resRec.rows[0].id;
      }

      for (let idx = 0; idx < payload.componentes.length; idx++) {
        const comp = payload.componentes[idx];
        if (!comp.nombre?.trim()) {
          throw new Error(`El componente en la fila ${idx + 1} no tiene nombre.`);
        }
        if (
          comp.cantidad === null ||
          comp.cantidad === undefined ||
          isNaN(Number(comp.cantidad)) ||
          Number(comp.cantidad) < 0
        ) {
          throw new Error(`La cantidad del componente "${comp.nombre}" no es válida.`);
        }
        await client.query(
          'INSERT INTO componentes (receta_id, orden, nombre, cantidad, unidad) VALUES ($1, $2, $3, $4, $5)',
          [recetaId, idx + 1, comp.nombre.trim(), Number(comp.cantidad), comp.unidad]
        );
      }

      for (let idx = 0; idx < payload.pasos.length; idx++) {
        const paso = payload.pasos[idx];
        if (!paso.accion?.trim()) {
          throw new Error(`El paso ${idx + 1} requiere una acción (ej. Agregar, Mezclar).`);
        }
        await client.query(
          `INSERT INTO pasos (
            receta_id, numero_paso, accion, componente_nombre,
            cantidad, unidad, tiempo_mezclado_min, rpm, temperatura_c, observaciones
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            recetaId,
            idx + 1,
            paso.accion.trim(),
            paso.componente_nombre?.trim() ? paso.componente_nombre.trim() : null,
            paso.cantidad !== null && paso.cantidad !== undefined && !isNaN(Number(paso.cantidad))
              ? Number(paso.cantidad)
              : null,
            paso.unidad || null,
            paso.tiempo_mezclado_min !== null &&
              paso.tiempo_mezclado_min !== undefined &&
              !isNaN(Number(paso.tiempo_mezclado_min))
              ? Number(paso.tiempo_mezclado_min)
              : null,
            paso.rpm !== null && paso.rpm !== undefined && !isNaN(Number(paso.rpm))
              ? Math.round(Number(paso.rpm))
              : null,
            paso.temperatura_c !== null && paso.temperatura_c !== undefined && !isNaN(Number(paso.temperatura_c))
              ? Number(paso.temperatura_c)
              : null,
            paso.observaciones?.trim() || '',
          ]
        );
      }

      await client.query('COMMIT');
      savedId = recetaId;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const saved = await this.getRecetaById(savedId);
    if (!saved) {
      throw new Error('Error al recuperar la receta recién guardada en Neon.');
    }
    return saved;
  }

  public async duplicateReceta(
    sourceRecetaId: number,
    nuevoCodigoVersion: string,
    nuevoNombreVersion: string,
    responsable: string,
    estado: 'Vigente' | 'Borrador' | 'Obsoleta' = 'Borrador'
  ): Promise<RecetaCompleta> {
    const origen = await this.getRecetaById(sourceRecetaId);
    if (!origen) {
      throw new Error('No se encontró la receta de origen para duplicar.');
    }

    return this.saveReceta({
      producto_id: origen.producto_id,
      codigo_version: nuevoCodigoVersion,
      nombre_version: nuevoNombreVersion,
      estado,
      responsable: responsable.trim() || origen.responsable,
      lote_base_cantidad: origen.lote_base_cantidad,
      lote_base_unidad: origen.lote_base_unidad,
      notas: origen.notas,
      componentes: origen.componentes.map((c, idx) => ({
        orden: idx + 1,
        nombre: c.nombre,
        cantidad: c.cantidad,
        unidad: c.unidad,
      })),
      pasos: origen.pasos.map((p, idx) => ({
        numero_paso: idx + 1,
        accion: p.accion,
        componente_nombre: p.componente_nombre,
        cantidad: p.cantidad,
        unidad: p.unidad,
        tiempo_mezclado_min: p.tiempo_mezclado_min,
        rpm: p.rpm,
        temperatura_c: p.temperatura_c,
        observaciones: p.observaciones,
      })),
    });
  }

  public async deleteReceta(recetaId: number): Promise<{ deletedRecetaId: number; deletedProductoId: number | null }> {
    await this.ensureInitialized();
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const recRes = await client.query<{ id: number; producto_id: number }>(
        'SELECT id, producto_id FROM recetas WHERE id = $1',
        [recetaId]
      );
      const row = recRes.rows[0];
      if (!row) {
        throw new Error('La receta que intenta eliminar no existe.');
      }

      await client.query('DELETE FROM recetas WHERE id = $1', [recetaId]);

      const remRes = await client.query<{ c: string }>(
        'SELECT COUNT(*) as c FROM recetas WHERE producto_id = $1',
        [row.producto_id]
      );
      let deletedProductoId: number | null = null;
      if (Number(remRes.rows[0]?.c || 0) === 0) {
        await client.query('DELETE FROM productos WHERE id = $1', [row.producto_id]);
        deletedProductoId = row.producto_id;
      }

      await client.query('COMMIT');
      return { deletedRecetaId: recetaId, deletedProductoId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async exportBackup(): Promise<BackupData> {
    await this.ensureInitialized();
    const prodRes = await this.pool.query<Producto>(
      'SELECT id, nombre, categoria, descripcion FROM productos ORDER BY id ASC'
    );
    const recRes = await this.pool.query<Omit<RecetaResumen, 'componentes_nombres'>>(
      `SELECT
        id, producto_id, codigo_version, nombre_version, estado,
        fecha_creacion, fecha_modificacion, responsable,
        lote_base_cantidad, lote_base_unidad, notas
       FROM recetas
       ORDER BY id ASC`
    );

    const recetas = [];
    for (const r of recRes.rows) {
      const compRes = await this.pool.query<Componente>(
        'SELECT orden, nombre, cantidad, unidad FROM componentes WHERE receta_id = $1 ORDER BY orden ASC',
        [r.id]
      );
      const pasosRes = await this.pool.query<Paso>(
        `SELECT
          numero_paso, accion, componente_nombre, cantidad, unidad,
          tiempo_mezclado_min, rpm, temperatura_c, observaciones
         FROM pasos
         WHERE receta_id = $1
         ORDER BY numero_paso ASC`,
        [r.id]
      );
      recetas.push({
        ...r,
        lote_base_cantidad: Number(r.lote_base_cantidad),
        componentes: compRes.rows.map((c) => ({ ...c, cantidad: Number(c.cantidad) })),
        pasos: pasosRes.rows,
      });
    }

    return {
      version_esquema: '2.0-neon-postgres',
      fecha_exportacion: new Date().toISOString(),
      aplicacion: 'Recetario Ultraseco 2.0 (Online Neon)',
      productos: prodRes.rows,
      recetas,
    };
  }

  public async importBackup(data: BackupData): Promise<{ productosImportados: number; recetasImportadas: number }> {
    await this.ensureInitialized();
    if (!data || !Array.isArray(data.productos) || !Array.isArray(data.recetas)) {
      throw new Error('El archivo JSON no tiene el formato válido de respaldo de Recetario Ultraseco.');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM pasos');
      await client.query('DELETE FROM componentes');
      await client.query('DELETE FROM recetas');
      await client.query('DELETE FROM productos');

      const oldToNewProdId = new Map<number, number>();
      for (const p of data.productos) {
        if (!p.nombre || !p.categoria) {
          throw new Error('Producto inválido en el respaldo.');
        }
        const res = await client.query<{ id: number }>(
          'INSERT INTO productos (nombre, categoria, descripcion) VALUES ($1, $2, $3) RETURNING id',
          [p.nombre, p.categoria, p.descripcion || '']
        );
        oldToNewProdId.set(p.id, res.rows[0].id);
      }

      for (const r of data.recetas) {
        const newProdId = oldToNewProdId.get(r.producto_id);
        if (!newProdId) {
          throw new Error(`La receta "${r.codigo_version}" referencia un producto inexistente.`);
        }
        const resRec = await client.query<{ id: number }>(
          `INSERT INTO recetas (
            producto_id, codigo_version, nombre_version, estado,
            fecha_creacion, fecha_modificacion, responsable,
            lote_base_cantidad, lote_base_unidad, notas
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`,
          [
            newProdId,
            r.codigo_version,
            r.nombre_version,
            r.estado,
            r.fecha_creacion || new Date().toISOString(),
            r.fecha_modificacion || new Date().toISOString(),
            r.responsable || 'Importado',
            Number(r.lote_base_cantidad) || 100,
            r.lote_base_unidad || 'kg',
            r.notas || '',
          ]
        );
        const newRecId = resRec.rows[0].id;

        if (Array.isArray(r.componentes)) {
          for (let idx = 0; idx < r.componentes.length; idx++) {
            const c = r.componentes[idx];
            await client.query(
              'INSERT INTO componentes (receta_id, orden, nombre, cantidad, unidad) VALUES ($1, $2, $3, $4, $5)',
              [newRecId, c.orden || idx + 1, c.nombre, Number(c.cantidad), c.unidad]
            );
          }
        }

        if (Array.isArray(r.pasos)) {
          for (let idx = 0; idx < r.pasos.length; idx++) {
            const p = r.pasos[idx];
            await client.query(
              `INSERT INTO pasos (
                receta_id, numero_paso, accion, componente_nombre,
                cantidad, unidad, tiempo_mezclado_min, rpm, temperatura_c, observaciones
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                newRecId,
                p.numero_paso || idx + 1,
                p.accion,
                p.componente_nombre || null,
                p.cantidad ?? null,
                p.unidad || null,
                p.tiempo_mezclado_min ?? null,
                p.rpm ?? null,
                p.temperatura_c ?? null,
                p.observaciones || '',
              ]
            );
          }
        }
      }

      await client.query('COMMIT');
      return {
        productosImportados: data.productos.length,
        recetasImportadas: data.recetas.length,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

