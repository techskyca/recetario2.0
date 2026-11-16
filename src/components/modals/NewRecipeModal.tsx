// Diálogo modal para Crear Nueva Receta (producto nuevo o existente) o Duplicar Variante existente
import React, { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  CATEGORIAS_PRODUCTO,
  ESTADOS_RECETA,
  UNIDADES_LOTE,
  type CategoriaProducto,
  type EstadoReceta,
  type GuardarRecetaPayload,
  type ProductoConVariantes,
  type RecetaCompleta,
  type UnidadLote,
} from '../../types/models';
import { parseDecimalInput } from '../../utils/formatters';

interface NewRecipeModalProps {
  isOpen: boolean;
  mode: 'create' | 'duplicate';
  productos: ProductoConVariantes[];
  sourceReceta: RecetaCompleta | null;
  onClose: () => void;
  onCreateNew: (payload: GuardarRecetaPayload, openInEditMode: boolean) => Promise<void>;
  onDuplicate: (args: {
    sourceRecetaId: number;
    nuevoCodigoVersion: string;
    nuevoNombreVersion: string;
    responsable: string;
    estado: EstadoReceta;
  }) => Promise<void>;
}

function sugerirSiguienteVersion(codigoActual: string): string {
  const match = codigoActual.match(/^(v?)(\d+)\.(\d+)(.*)$/i);
  if (!match) return `${codigoActual}-copia`;
  const prefix = match[1] || 'v';
  const major = match[2];
  const minor = Number(match[3]) + 1;
  return `${prefix}${major}.${minor}`;
}

export const NewRecipeModal: React.FC<NewRecipeModalProps> = ({
  isOpen,
  mode,
  productos,
  sourceReceta,
  onClose,
  onCreateNew,
  onDuplicate,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const [tipoProducto, setTipoProducto] = useState<'existente' | 'nuevo'>('nuevo');
  const [selectedProductoId, setSelectedProductoId] = useState<number>(productos[0]?.id || 0);

  const [nuevoProdNombre, setNuevoProdNombre] = useState('');
  const [nuevoProdCategoria, setNuevoProdCategoria] = useState<CategoriaProducto>('Pintura');
  const [nuevoProdDesc, setNuevoProdDesc] = useState('');

  const [codigoVersion, setCodigoVersion] = useState('v1.0');
  const [nombreVersion, setNombreVersion] = useState('Receta estándar');
  const [estado, setEstado] = useState<EstadoReceta>('Borrador');
  const [responsable, setResponsable] = useState('');
  const [loteCantidad, setLoteCantidad] = useState('100');
  const [loteUnidad, setLoteUnidad] = useState<UnidadLote>('kg');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useFocusTrap(dialogRef, isOpen, onClose, firstInputRef);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);

    if (mode === 'duplicate' && sourceReceta) {
      setCodigoVersion(sugerirSiguienteVersion(sourceReceta.codigo_version));
      setNombreVersion(`${sourceReceta.nombre_version} (Variante)`);
      setResponsable(sourceReceta.responsable);
      setEstado('Borrador');
    } else {
      if (productos.length > 0 && sourceReceta) {
        setSelectedProductoId(sourceReceta.producto_id);
      } else if (productos.length > 0) {
        setSelectedProductoId(productos[0].id);
      }
      setTipoProducto(productos.length === 0 ? 'nuevo' : 'nuevo');
      setNuevoProdNombre('');
      setNuevoProdCategoria('Pintura');
      setNuevoProdDesc('');
      setCodigoVersion('v1.0');
      setNombreVersion('Receta estándar');
      setEstado('Borrador');
      setResponsable(sourceReceta?.responsable || '');
      setLoteCantidad('100');
      setLoteUnidad('kg');
    }
  }, [isOpen, mode, sourceReceta, productos]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!codigoVersion.trim()) {
      setErrorMsg('El código de versión es obligatorio (ej. v1.0, v1.2).');
      return;
    }
    if (!nombreVersion.trim()) {
      setErrorMsg('La descripción corta de la variante es obligatoria.');
      return;
    }
    if (!responsable.trim()) {
      setErrorMsg('El nombre del responsable es obligatorio.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'duplicate' && sourceReceta) {
        await onDuplicate({
          sourceRecetaId: sourceReceta.id,
          nuevoCodigoVersion: codigoVersion.trim(),
          nuevoNombreVersion: nombreVersion.trim(),
          responsable: responsable.trim(),
          estado,
        });
        onClose();
        return;
      }

      const loteNum = parseDecimalInput(loteCantidad);
      if (loteNum === null || loteNum <= 0) {
        setErrorMsg('El tamaño de lote base debe ser mayor que cero.');
        setSubmitting(false);
        return;
      }

      if (tipoProducto === 'nuevo' && !nuevoProdNombre.trim()) {
        setErrorMsg('Ingrese el nombre del nuevo producto.');
        setSubmitting(false);
        return;
      }

      const payload: GuardarRecetaPayload = {
        producto_id: tipoProducto === 'existente' ? Number(selectedProductoId) : undefined,
        nuevo_producto:
          tipoProducto === 'nuevo'
            ? {
                nombre: nuevoProdNombre.trim(),
                categoria: nuevoProdCategoria,
                descripcion: nuevoProdDesc.trim(),
              }
            : undefined,
        codigo_version: codigoVersion.trim(),
        nombre_version: nombreVersion.trim(),
        estado,
        responsable: responsable.trim(),
        lote_base_cantidad: loteNum,
        lote_base_unidad: loteUnidad,
        notas: '',
        componentes: [{ orden: 1, nombre: 'Agua desmineralizada', cantidad: loteNum * 0.5, unidad: loteUnidad }],
        pasos: [
          {
            numero_paso: 1,
            accion: 'Agregar',
            componente_nombre: 'Agua desmineralizada',
            cantidad: loteNum * 0.5,
            unidad: loteUnidad,
            tiempo_mezclado_min: 5,
            rpm: 300,
            temperatura_c: null,
            observaciones: 'Cargar en el tanque principal.',
          },
        ],
      };

      await onCreateNew(payload, true);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al procesar la receta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-dialog modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-rec-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="new-rec-modal-title" className="modal-title">
            {mode === 'duplicate'
              ? `Duplicar receta como nueva variante — ${sourceReceta?.producto_nombre}`
              : 'Crear nueva receta de producción'}
          </h2>
          <button type="button" className="btn-icon-sm" onClick={onClose} aria-label="Cerrar (Esc)">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div className="status-banner error" style={{ marginBottom: '14px' }} role="alert">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            {mode === 'create' && (
              <div style={{ marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                <span className="field-label">Destino de la Receta</span>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="tipoProducto"
                      checked={tipoProducto === 'nuevo'}
                      onChange={() => setTipoProducto('nuevo')}
                    />
                    <span>Crear un producto nuevo (familia nueva)</span>
                  </label>
                  {productos.length > 0 && (
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      <input
                        type="radio"
                        name="tipoProducto"
                        checked={tipoProducto === 'existente'}
                        onChange={() => setTipoProducto('existente')}
                      />
                      <span>Añadir variante a un producto existente</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="editor-form-grid" style={{ marginBottom: 0, padding: '14px' }}>
              {mode === 'create' && tipoProducto === 'nuevo' && (
                <>
                  <div className="field-col-6">
                    <label className="field-label" htmlFor="nr-prod-name">
                      Nombre del Producto *
                    </label>
                    <input
                      id="nr-prod-name"
                      ref={firstInputRef}
                      type="text"
                      className="field-input"
                      value={nuevoProdNombre}
                      onChange={(e) => setNuevoProdNombre(e.target.value)}
                      placeholder="Ej. Pintura hidrofóbica acrílica, Cera nanosilicio..."
                      required
                    />
                  </div>
                  <div className="field-col-6">
                    <label className="field-label" htmlFor="nr-prod-cat">
                      Categoría *
                    </label>
                    <select
                      id="nr-prod-cat"
                      className="field-select"
                      value={nuevoProdCategoria}
                      onChange={(e) => setNuevoProdCategoria(e.target.value as CategoriaProducto)}
                    >
                      {CATEGORIAS_PRODUCTO.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-col-12">
                    <label className="field-label" htmlFor="nr-prod-desc">
                      Descripción del Producto (Opcional)
                    </label>
                    <input
                      id="nr-prod-desc"
                      type="text"
                      className="field-input"
                      value={nuevoProdDesc}
                      onChange={(e) => setNuevoProdDesc(e.target.value)}
                      placeholder="Aplicación o características generales del producto..."
                    />
                  </div>
                </>
              )}

              {mode === 'create' && tipoProducto === 'existente' && (
                <div className="field-col-12">
                  <label className="field-label" htmlFor="nr-prod-select">
                    Seleccionar Producto Existente *
                  </label>
                  <select
                    id="nr-prod-select"
                    className="field-select"
                    value={selectedProductoId}
                    onChange={(e) => setSelectedProductoId(Number(e.target.value))}
                  >
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.categoria}] {p.nombre} ({p.variantes.length} variante(s))
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="field-col-4">
                <label className="field-label" htmlFor="nr-codigo-ver">
                  Código de Versión *
                </label>
                <input
                  id="nr-codigo-ver"
                  ref={mode === 'duplicate' ? firstInputRef : undefined}
                  type="text"
                  className="field-input mono"
                  value={codigoVersion}
                  onChange={(e) => setCodigoVersion(e.target.value)}
                  placeholder="Ej. v1.0, v1.2, v2.0"
                  required
                />
              </div>

              <div className="field-col-8">
                <label className="field-label" htmlFor="nr-nombre-ver">
                  Nombre / Descripción Corta de la Variante *
                </label>
                <input
                  id="nr-nombre-ver"
                  type="text"
                  className="field-input"
                  value={nombreVersion}
                  onChange={(e) => setNombreVersion(e.target.value)}
                  placeholder="Ej. Receta estándar, Más denso, Mayor cantidad de nanopartículas"
                  required
                />
              </div>

              <div className="field-col-4">
                <label className="field-label" htmlFor="nr-estado">
                  Estado Inicial *
                </label>
                <select
                  id="nr-estado"
                  className="field-select"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as EstadoReceta)}
                >
                  {ESTADOS_RECETA.map((est) => (
                    <option key={est} value={est}>
                      {est}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-col-8">
                <label className="field-label" htmlFor="nr-responsable">
                  Responsable de Creación *
                </label>
                <input
                  id="nr-responsable"
                  type="text"
                  className="field-input"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  placeholder="Nombre y cargo del responsable técnico"
                  required
                />
              </div>

              {mode === 'create' && (
                <>
                  <div className="field-col-6">
                    <label className="field-label" htmlFor="nr-lote-cant">
                      Tamaño de Lote Base *
                    </label>
                    <input
                      id="nr-lote-cant"
                      type="text"
                      inputMode="decimal"
                      className="field-input mono"
                      value={loteCantidad}
                      onChange={(e) => setLoteCantidad(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field-col-6">
                    <label className="field-label" htmlFor="nr-lote-unit">
                      Unidad del Lote Base *
                    </label>
                    <select
                      id="nr-lote-unit"
                      className="field-select mono"
                      value={loteUnidad}
                      onChange={(e) => setLoteUnidad(e.target.value as UnidadLote)}
                    >
                      {UNIDADES_LOTE.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancelar (Esc)
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? 'Procesando...'
                : mode === 'duplicate'
                ? 'Duplicar variante (Enter)'
                : 'Crear y pasar a edición (Enter)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

