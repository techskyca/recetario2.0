// Modelos de datos del dominio de producción hidrofóbica

export type CategoriaProducto = 'Estuco' | 'Pintura' | 'Cera' | 'Antigoteras' | 'Otro';

export const CATEGORIAS_PRODUCTO: CategoriaProducto[] = [
  'Estuco',
  'Pintura',
  'Cera',
  'Antigoteras',
  'Otro',
];

export type EstadoReceta = 'Vigente' | 'Borrador' | 'Obsoleta';

export const ESTADOS_RECETA: EstadoReceta[] = ['Vigente', 'Borrador', 'Obsoleta'];

export type UnidadLote = 'kg' | 'g' | 'L' | 'mL';

export const UNIDADES_LOTE: UnidadLote[] = ['kg', 'g', 'L', 'mL'];

export type UnidadComponente = 'kg' | 'g' | 'L' | 'mL' | '%';

export const UNIDADES_COMPONENTE: UnidadComponente[] = ['kg', 'g', 'L', 'mL', '%'];

export const ACCIONES_SUGERIDAS: string[] = [
  'Agregar',
  'Mezclar',
  'Dispersar',
  'Homogeneizar',
  'Reposar',
  'Calentar',
  'Enfriar',
  'Filtrar',
  'Verificar',
  'Envasar',
];

export interface Producto {
  id: number;
  nombre: string;
  categoria: CategoriaProducto;
  descripcion: string;
}

export interface Componente {
  id?: number;
  receta_id?: number;
  orden: number;
  nombre: string;
  cantidad: number;
  unidad: UnidadComponente;
}

export interface Paso {
  id?: number;
  receta_id?: number;
  numero_paso: number;
  accion: string;
  componente_nombre: string | null;
  cantidad: number | null;
  unidad: UnidadComponente | null;
  tiempo_mezclado_min: number | null;
  rpm: number | null;
  temperatura_c: number | null;
  observaciones: string;
}

export interface RecetaResumen {
  id: number;
  producto_id: number;
  codigo_version: string;
  nombre_version: string;
  estado: EstadoReceta;
  fecha_creacion: string;
  fecha_modificacion: string;
  responsable: string;
  lote_base_cantidad: number;
  lote_base_unidad: UnidadLote;
  notas: string;
  // Lista de nombres de componentes para búsqueda rápida en barra lateral
  componentes_nombres: string[];
}

export interface RecetaCompleta extends Omit<RecetaResumen, 'componentes_nombres'> {
  producto_nombre: string;
  producto_categoria: CategoriaProducto;
  producto_descripcion: string;
  componentes: Componente[];
  pasos: Paso[];
}

export interface ProductoConVariantes extends Producto {
  variantes: RecetaResumen[];
}

export interface GuardarRecetaPayload {
  id?: number; // Si existe, actualiza; si no, crea nueva receta
  producto_id?: number; // Si no existe o se crea nuevo producto, usa nuevo_producto
  nuevo_producto?: {
    nombre: string;
    categoria: CategoriaProducto;
    descripcion: string;
  };
  actualizar_producto?: {
    nombre: string;
    categoria: CategoriaProducto;
    descripcion: string;
  };
  codigo_version: string;
  nombre_version: string;
  estado: EstadoReceta;
  responsable: string;
  lote_base_cantidad: number;
  lote_base_unidad: UnidadLote;
  notas: string;
  componentes: Componente[];
  pasos: Paso[];
}

export interface BackupData {
  version_esquema: string;
  fecha_exportacion: string;
  aplicacion: string;
  productos: Producto[];
  recetas: Array<
    Omit<RecetaResumen, 'componentes_nombres'> & {
      componentes: Componente[];
      pasos: Paso[];
    }
  >;
}

export interface DbInfo {
  dbPath: string;
  totalProductos: number;
  totalRecetas: number;
  modoEjecucion: 'electron' | 'local-desktop-server';
}

