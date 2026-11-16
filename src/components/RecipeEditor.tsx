// Modo edición in-situ de la receta (con soporte completo de teclado: Tab, Enter, Ctrl+↑/↓, Ctrl+Supr, Ctrl+S, Esc)
import React, { useRef, useState } from 'react';
import {
  ACCIONES_SUGERIDAS,
  CATEGORIAS_PRODUCTO,
  ESTADOS_RECETA,
  UNIDADES_COMPONENTE,
  UNIDADES_LOTE,
  type CategoriaProducto,
  type EstadoReceta,
  type GuardarRecetaPayload,
  type RecetaCompleta,
  type UnidadComponente,
  type UnidadLote,
} from '../types/models';
import { formatCantidad, parseDecimalInput } from '../utils/formatters';

interface EditableComponenteRow {
  nombre: string;
  cantidadTexto: string;
  unidad: UnidadComponente;
}

interface EditablePasoRow {
  accion: string;
  componente_nombre: string;
  cantidadTexto: string;
  unidad: UnidadComponente;
  tiempoTexto: string;
  rpmTexto: string;
  temperaturaTexto: string;
  observaciones: string;
}

interface RecipeEditorProps {
  receta: RecetaCompleta;
  onSave: (payload: GuardarRecetaPayload) => Promise<void>;
  onCancel: () => void;
}

export const RecipeEditor: React.FC<RecipeEditorProps> = ({ receta, onSave, onCancel }) => {
  // Datos del producto
  const [productoNombre, setProductoNombre] = useState(receta.producto_nombre);
  const [productoCategoria, setProductoCategoria] = useState<CategoriaProducto>(receta.producto_categoria);
  const [productoDescripcion, setProductoDescripcion] = useState(receta.producto_descripcion || '');

  // Datos de la variante / versión
  const [codigoVersion, setCodigoVersion] = useState(receta.codigo_version);
  const [nombreVersion, setNombreVersion] = useState(receta.nombre_version);
  const [estado, setEstado] = useState<EstadoReceta>(receta.estado);
  const [responsable, setResponsable] = useState(receta.responsable);
  const [loteCantidadTexto, setLoteCantidadTexto] = useState(formatCantidad(receta.lote_base_cantidad));
  const [loteUnidad, setLoteUnidad] = useState<UnidadLote>(receta.lote_base_unidad);
  const [notas, setNotas] = useState(receta.notas || '');

  // Tablas editables
  const [componentes, setComponentes] = useState<EditableComponenteRow[]>(() =>
    receta.componentes.length > 0
      ? receta.componentes.map((c) => ({
          nombre: c.nombre,
          cantidadTexto: formatCantidad(c.cantidad),
          unidad: c.unidad,
        }))
      : [{ nombre: '', cantidadTexto: '', unidad: 'kg' }]
  );

  const [pasos, setPasos] = useState<EditablePasoRow[]>(() =>
    receta.pasos.length > 0
      ? receta.pasos.map((p) => ({
          accion: p.accion,
          componente_nombre: p.componente_nombre || '',
          cantidadTexto: p.cantidad !== null && p.cantidad !== undefined ? formatCantidad(p.cantidad) : '',
          unidad: (p.unidad as UnidadComponente) || 'kg',
          tiempoTexto:
            p.tiempo_mezclado_min !== null && p.tiempo_mezclado_min !== undefined
              ? formatCantidad(p.tiempo_mezclado_min)
              : '',
          rpmTexto: p.rpm !== null && p.rpm !== undefined ? String(p.rpm) : '',
          temperaturaTexto:
            p.temperatura_c !== null && p.temperatura_c !== undefined ? formatCantidad(p.temperatura_c) : '',
          observaciones: p.observaciones || '',
        }))
      : [
          {
            accion: 'Agregar',
            componente_nombre: '',
            cantidadTexto: '',
            unidad: 'kg',
            tiempoTexto: '',
            rpmTexto: '',
            temperaturaTexto: '',
            observaciones: '',
          },
        ]
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Referencias para enfocar automáticamente nuevas filas o filas reordenadas
  const compNameRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pasoAccionRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Operaciones en tabla de Componentes
  const addComponenteRow = (afterIndex?: number) => {
    setComponentes((prev) => {
      const next = [...prev];
      const newRow: EditableComponenteRow = { nombre: '', cantidadTexto: '', unidad: loteUnidad };
      const insertIdx = afterIndex !== undefined ? afterIndex + 1 : next.length;
      next.splice(insertIdx, 0, newRow);
      setTimeout(() => {
        compNameRefs.current[insertIdx]?.focus();
      }, 20);
      return next;
    });
  };

  const removeComponenteRow = (index: number) => {
    setComponentes((prev) => {
      if (prev.length <= 1) {
        return [{ nombre: '', cantidadTexto: '', unidad: loteUnidad }];
      }
      const next = prev.filter((_, i) => i !== index);
      const focusIdx = Math.max(0, index - 1);
      setTimeout(() => {
        compNameRefs.current[focusIdx]?.focus();
      }, 20);
      return next;
    });
  };

  const moveComponenteRow = (index: number, direction: -1 | 1) => {
    setComponentes((prev) => {
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIdx, 0, moved);
      setTimeout(() => {
        compNameRefs.current[targetIdx]?.focus();
      }, 20);
      return next;
    });
  };

  const handleCompKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.ctrlKey && e.key === 'ArrowUp') {
      e.preventDefault();
      moveComponenteRow(index, -1);
      return;
    }
    if (e.ctrlKey && e.key === 'ArrowDown') {
      e.preventDefault();
      moveComponenteRow(index, 1);
      return;
    }
    if (e.ctrlKey && e.key === 'Delete') {
      e.preventDefault();
      removeComponenteRow(index);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      addComponenteRow(index);
    }
  };

  // Operaciones en tabla de Pasos
  const addPasoRow = (afterIndex?: number) => {
    setPasos((prev) => {
      const next = [...prev];
      const newRow: EditablePasoRow = {
        accion: 'Agregar',
        componente_nombre: '',
        cantidadTexto: '',
        unidad: loteUnidad,
        tiempoTexto: '',
        rpmTexto: '',
        temperaturaTexto: '',
        observaciones: '',
      };
      const insertIdx = afterIndex !== undefined ? afterIndex + 1 : next.length;
      next.splice(insertIdx, 0, newRow);
      setTimeout(() => {
        pasoAccionRefs.current[insertIdx]?.focus();
      }, 20);
      return next;
    });
  };

  const removePasoRow = (index: number) => {
    setPasos((prev) => {
      if (prev.length <= 1) {
        return [
          {
            accion: 'Agregar',
            componente_nombre: '',
            cantidadTexto: '',
            unidad: loteUnidad,
            tiempoTexto: '',
            rpmTexto: '',
            temperaturaTexto: '',
            observaciones: '',
          },
        ];
      }
      const next = prev.filter((_, i) => i !== index);
      const focusIdx = Math.max(0, index - 1);
      setTimeout(() => {
        pasoAccionRefs.current[focusIdx]?.focus();
      }, 20);
      return next;
    });
  };

  const movePasoRow = (index: number, direction: -1 | 1) => {
    setPasos((prev) => {
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIdx, 0, moved);
      setTimeout(() => {
        pasoAccionRefs.current[targetIdx]?.focus();
      }, 20);
      return next;
    });
  };

  const handlePasoKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.ctrlKey && e.key === 'ArrowUp') {
      e.preventDefault();
      movePasoRow(index, -1);
      return;
    }
    if (e.ctrlKey && e.key === 'ArrowDown') {
      e.preventDefault();
      movePasoRow(index, 1);
      return;
    }
    if (e.ctrlKey && e.key === 'Delete') {
      e.preventDefault();
      removePasoRow(index);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      addPasoRow(index);
    }
  };

  // Al seleccionar un componente en un paso, autocompletar su cantidad y unidad si están vacías
  const handleSelectComponenteEnPaso = (index: number, compNombre: string) => {
    setPasos((prev) => {
      const next = [...prev];
      const row = { ...next[index], componente_nombre: compNombre };
      if (compNombre) {
        const foundComp = componentes.find((c) => c.nombre.trim() === compNombre);
        if (foundComp && !row.cantidadTexto.trim()) {
          row.cantidadTexto = foundComp.cantidadTexto;
          row.unidad = foundComp.unidad;
        }
      }
      next[index] = row;
      return next;
    });
  };

  // Validación y guardado
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    if (!productoNombre.trim()) {
      setValidationError('El nombre del producto es obligatorio.');
      return;
    }
    if (!codigoVersion.trim()) {
      setValidationError('El código de versión es obligatorio (ej. v1.0).');
      return;
    }
    if (!nombreVersion.trim()) {
      setValidationError('El nombre o descripción corta de la variante es obligatorio.');
      return;
    }
    if (!responsable.trim()) {
      setValidationError('El responsable de creación es un campo obligatorio.');
      return;
    }

    const loteBaseNum = parseDecimalInput(loteCantidadTexto);
    if (loteBaseNum === null || loteBaseNum <= 0) {
      setValidationError('El tamaño de lote base debe ser un número mayor que cero.');
      return;
    }

    // Filtrar filas completamente vacías de componentes, pero validar las que tengan datos
    const nonEmptyComps = componentes.filter((c) => c.nombre.trim() || c.cantidadTexto.trim());
    if (nonEmptyComps.length === 0) {
      setValidationError('La receta debe tener al menos un componente registrado.');
      return;
    }

    const parsedComponentes = [];
    for (let i = 0; i < nonEmptyComps.length; i++) {
      const c = nonEmptyComps[i];
      if (!c.nombre.trim()) {
        setValidationError(`El componente en la fila ${i + 1} requiere un nombre.`);
        return;
      }
      const cant = parseDecimalInput(c.cantidadTexto);
      if (cant === null || cant < 0) {
        setValidationError(`Ingrese una cantidad numérica válida para el componente «${c.nombre}».`);
        return;
      }
      parsedComponentes.push({
        orden: i + 1,
        nombre: c.nombre.trim(),
        cantidad: cant,
        unidad: c.unidad,
      });
    }

    const nonEmptyPasos = pasos.filter(
      (p) =>
        p.accion.trim() ||
        p.componente_nombre.trim() ||
        p.cantidadTexto.trim() ||
        p.observaciones.trim()
    );

    if (nonEmptyPasos.length === 0) {
      setValidationError('La receta debe tener al menos un paso en el procedimiento.');
      return;
    }

    const parsedPasos = [];
    for (let i = 0; i < nonEmptyPasos.length; i++) {
      const p = nonEmptyPasos[i];
      if (!p.accion.trim()) {
        setValidationError(`El paso ${i + 1} requiere una acción (ej. Agregar, Mezclar).`);
        return;
      }
      const cant = p.cantidadTexto.trim() ? parseDecimalInput(p.cantidadTexto) : null;
      if (p.cantidadTexto.trim() && (cant === null || cant < 0)) {
        setValidationError(`La cantidad indicada en el Paso ${i + 1} no es válida.`);
        return;
      }
      const tiempo = p.tiempoTexto.trim() ? parseDecimalInput(p.tiempoTexto) : null;
      if (p.tiempoTexto.trim() && (tiempo === null || tiempo < 0)) {
        setValidationError(`El tiempo de mezclado en el Paso ${i + 1} no es válido.`);
        return;
      }
      const rpm = p.rpmTexto.trim() ? parseDecimalInput(p.rpmTexto) : null;
      if (p.rpmTexto.trim() && (rpm === null || rpm < 0)) {
        setValidationError(`Las RPM en el Paso ${i + 1} deben ser un valor numérico positivo.`);
        return;
      }
      const temp = p.temperaturaTexto.trim() ? parseDecimalInput(p.temperaturaTexto) : null;
      if (p.temperaturaTexto.trim() && temp === null) {
        setValidationError(`La temperatura en el Paso ${i + 1} no es un número válido.`);
        return;
      }

      parsedPasos.push({
        numero_paso: i + 1,
        accion: p.accion.trim(),
        componente_nombre: p.componente_nombre.trim() ? p.componente_nombre.trim() : null,
        cantidad: cant,
        unidad: cant !== null ? p.unidad : null,
        tiempo_mezclado_min: tiempo,
        rpm: rpm !== null ? Math.round(rpm) : null,
        temperatura_c: temp,
        observaciones: p.observaciones.trim(),
      });
    }

    setIsSaving(true);
    try {
      await onSave({
        id: receta.id,
        producto_id: receta.producto_id,
        actualizar_producto: {
          nombre: productoNombre.trim(),
          categoria: productoCategoria,
          descripcion: productoDescripcion.trim(),
        },
        codigo_version: codigoVersion.trim(),
        nombre_version: nombreVersion.trim(),
        estado,
        responsable: responsable.trim(),
        lote_base_cantidad: loteBaseNum,
        lote_base_unidad: loteUnidad,
        notas,
        componentes: parsedComponentes,
        pasos: parsedPasos,
      });
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Error al guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  // Exponer atajo Ctrl+S dentro del editor
  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const nombresComponentesDisponibles = componentes
    .map((c) => c.nombre.trim())
    .filter((n, idx, arr) => n.length > 0 && arr.indexOf(n) === idx);

  return (
    <form
      className="main-area"
      onSubmit={handleSubmit}
      onKeyDown={handleEditorKeyDown}
      aria-label="Modo edición de receta"
    >
      {/* Barra superior del modo edición */}
      <div className="action-bar" style={{ backgroundColor: '#DFE7F0' }}>
        <div>
          <strong style={{ fontSize: '16px', color: 'var(--accent-primary)' }}>
            MODO EDICIÓN DE RECETA — {receta.producto_nombre} ({receta.codigo_version})
          </strong>
          <span style={{ marginLeft: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            La fecha de última modificación se actualizará automáticamente al guardar.
          </span>
        </div>

        <div className="action-buttons-group">
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            <span>{isSaving ? 'Guardando...' : 'Guardar cambios'}</span>
            <span className="kbd-hint">Ctrl+S</span>
          </button>
          <button type="button" className="btn" onClick={onCancel} disabled={isSaving}>
            <span>Cancelar</span>
            <span className="kbd-hint">Esc</span>
          </button>
        </div>
      </div>

      {validationError && (
        <div className="status-banner error" role="alert">
          <span>⚠️ Error de validación: {validationError}</span>
          <button type="button" className="btn-icon-sm" onClick={() => setValidationError(null)}>
            ×
          </button>
        </div>
      )}

      <div className="recipe-content-scroll">
        {/* BLOQUE 1: DATOS DEL PRODUCTO Y DE LA VARIANTE */}
        <section className="section-block" aria-label="Datos generales del producto y variante">
          <div className="section-header">
            <h3 className="section-title">Datos del Producto y Variante</h3>
            <span className="section-subtitle">Todos los campos marcados con (*) son obligatorios</span>
          </div>

          <div className="editor-form-grid">
            <div className="field-col-6">
              <label className="field-label" htmlFor="ed-prod-nombre">
                Nombre del Producto (Familia) *
              </label>
              <input
                id="ed-prod-nombre"
                type="text"
                className="field-input"
                value={productoNombre}
                onChange={(e) => setProductoNombre(e.target.value)}
                required
              />
            </div>

            <div className="field-col-3">
              <label className="field-label" htmlFor="ed-prod-cat">
                Categoría *
              </label>
              <select
                id="ed-prod-cat"
                className="field-select"
                value={productoCategoria}
                onChange={(e) => setProductoCategoria(e.target.value as CategoriaProducto)}
              >
                {CATEGORIAS_PRODUCTO.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-col-3">
              <label className="field-label" htmlFor="ed-rec-estado">
                Estado de la Variante *
              </label>
              <select
                id="ed-rec-estado"
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

            <div className="field-col-12">
              <label className="field-label" htmlFor="ed-prod-desc">
                Descripción de la Familia de Producto (Opcional)
              </label>
              <input
                id="ed-prod-desc"
                type="text"
                className="field-input"
                value={productoDescripcion}
                onChange={(e) => setProductoDescripcion(e.target.value)}
                placeholder="Ej. Revestimiento superhidrofóbico para exteriores..."
              />
            </div>

            <div className="field-col-3">
              <label className="field-label" htmlFor="ed-rec-version">
                Código de Versión *
              </label>
              <input
                id="ed-rec-version"
                type="text"
                className="field-input mono"
                value={codigoVersion}
                onChange={(e) => setCodigoVersion(e.target.value)}
                placeholder="Ej. v1.0"
                required
              />
            </div>

            <div className="field-col-6">
              <label className="field-label" htmlFor="ed-rec-nombre">
                Nombre / Descripción Corta de la Variante *
              </label>
              <input
                id="ed-rec-nombre"
                type="text"
                className="field-input"
                value={nombreVersion}
                onChange={(e) => setNombreVersion(e.target.value)}
                placeholder="Ej. Receta estándar, Mayor cantidad de nanopartículas..."
                required
              />
            </div>

            <div className="field-col-3">
              <label className="field-label" htmlFor="ed-rec-resp">
                Responsable de Creación *
              </label>
              <input
                id="ed-rec-resp"
                type="text"
                className="field-input"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                placeholder="Nombre del ingeniero / técnico"
                required
              />
            </div>

            <div className="field-col-3">
              <label className="field-label" htmlFor="ed-lote-cant">
                Tamaño de Lote Base *
              </label>
              <input
                id="ed-lote-cant"
                type="text"
                inputMode="decimal"
                className="field-input mono"
                value={loteCantidadTexto}
                onChange={(e) => setLoteCantidadTexto(e.target.value)}
                placeholder="100"
                required
              />
            </div>

            <div className="field-col-3">
              <label className="field-label" htmlFor="ed-lote-unidad">
                Unidad del Lote Base *
              </label>
              <select
                id="ed-lote-unidad"
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
          </div>
        </section>

        {/* BLOQUE 2: TABLA EDITABLE DE COMPONENTES */}
        <section className="section-block" aria-label="Edición de componentes">
          <div className="section-header">
            <h3 className="section-title">1. Componentes (Ingredientes de la Receta)</h3>
            <span className="section-subtitle">
              Enter: añadir fila · Ctrl+↑/↓: reordenar · Ctrl+Supr: eliminar fila
            </span>
          </div>

          <table className="industrial-table editable-table" aria-label="Tabla editable de componentes">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th>Nombre del Componente *</th>
                <th style={{ width: '180px' }}>Cantidad (coma decimal) *</th>
                <th style={{ width: '120px' }}>Unidad *</th>
                <th style={{ width: '130px' }} className="col-center">
                  Orden / Quitar
                </th>
              </tr>
            </thead>
            <tbody>
              {componentes.map((comp, idx) => (
                <tr key={idx}>
                  <td className="col-num">{idx + 1}</td>
                  <td>
                    <input
                      ref={(el) => {
                        compNameRefs.current[idx] = el;
                      }}
                      type="text"
                      className="table-input"
                      value={comp.nombre}
                      placeholder="Ej. Agua, Nonilfenol, Nanopartículas de sílice..."
                      onChange={(e) => {
                        const val = e.target.value;
                        setComponentes((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, nombre: val } : row))
                        );
                      }}
                      onKeyDown={(e) => handleCompKeyDown(e, idx)}
                      aria-label={`Componente fila ${idx + 1} nombre`}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="table-input mono col-right"
                      value={comp.cantidadTexto}
                      placeholder="0,0"
                      onChange={(e) => {
                        const val = e.target.value;
                        setComponentes((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, cantidadTexto: val } : row))
                        );
                      }}
                      onKeyDown={(e) => handleCompKeyDown(e, idx)}
                      aria-label={`Componente fila ${idx + 1} cantidad`}
                    />
                  </td>
                  <td>
                    <select
                      className="table-select mono"
                      value={comp.unidad}
                      onChange={(e) => {
                        const val = e.target.value as UnidadComponente;
                        setComponentes((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, unidad: val } : row))
                        );
                      }}
                      onKeyDown={(e) => handleCompKeyDown(e, idx)}
                      aria-label={`Componente fila ${idx + 1} unidad`}
                    >
                      {UNIDADES_COMPONENTE.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="row-actions-cell">
                      <button
                        type="button"
                        className="btn-icon-sm"
                        onClick={() => moveComponenteRow(idx, -1)}
                        disabled={idx === 0}
                        title="Subir componente (Ctrl+↑)"
                        aria-label={`Subir componente ${idx + 1}`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-icon-sm"
                        onClick={() => moveComponenteRow(idx, 1)}
                        disabled={idx === componentes.length - 1}
                        title="Bajar componente (Ctrl+↓)"
                        aria-label={`Bajar componente ${idx + 1}`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn-icon-sm danger"
                        onClick={() => removeComponenteRow(idx)}
                        title="Eliminar fila (Ctrl+Supr)"
                        aria-label={`Eliminar componente ${idx + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="editor-table-footer">
            <button type="button" className="btn" onClick={() => addComponenteRow()}>
              + Añadir componente (Enter)
            </button>
            <span className="keyboard-table-tip">
              Tab/Shift+Tab mueve entre celdas · Enter añade fila debajo
            </span>
          </div>
        </section>

        {/* BLOQUE 3: TABLA EDITABLE DE PROCEDIMIENTO PASO A PASO */}
        <section className="section-block" aria-label="Edición de pasos del procedimiento">
          <div className="section-header">
            <h3 className="section-title">2. Procedimiento Paso a Paso</h3>
            <span className="section-subtitle">
              Enter: añadir paso · Ctrl+↑/↓: reordenar paso · Ctrl+Supr: eliminar paso
            </span>
          </div>

          <datalist id="acciones-sugeridas-list">
            {ACCIONES_SUGERIDAS.map((acc) => (
              <option key={acc} value={acc} />
            ))}
          </datalist>

          <table className="industrial-table editable-table" aria-label="Tabla editable de pasos">
            <thead>
              <tr>
                <th className="col-num">Paso</th>
                <th style={{ width: '140px' }}>Acción *</th>
                <th style={{ width: '210px' }}>Componente (Opcional)</th>
                <th style={{ width: '110px' }}>Cantidad</th>
                <th style={{ width: '85px' }}>Unidad</th>
                <th style={{ width: '105px' }}>Tiempo (min)</th>
                <th style={{ width: '95px' }}>RPM</th>
                <th style={{ width: '95px' }}>Temp (°C)</th>
                <th>Observaciones</th>
                <th style={{ width: '115px' }} className="col-center">
                  Orden / Quitar
                </th>
              </tr>
            </thead>
            <tbody>
              {pasos.map((paso, idx) => (
                <tr key={idx}>
                  <td className="col-num">
                    <span className="step-number-large">{idx + 1}</span>
                  </td>
                  <td>
                    <input
                      ref={(el) => {
                        pasoAccionRefs.current[idx] = el;
                      }}
                      type="text"
                      list="acciones-sugeridas-list"
                      className="table-input"
                      value={paso.accion}
                      placeholder="Agregar / Mezclar..."
                      onChange={(e) => {
                        const val = e.target.value;
                        setPasos((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, accion: val } : row))
                        );
                      }}
                      onKeyDown={(e) => handlePasoKeyDown(e, idx)}
                      aria-label={`Paso ${idx + 1} acción`}
                    />
                  </td>
                  <td>
                    <select
                      className="table-select"
                      value={paso.componente_nombre}
                      onChange={(e) => handleSelectComponenteEnPaso(idx, e.target.value)}
                      onKeyDown={(e) => handlePasoKeyDown(e, idx)}
                      aria-label={`Paso ${idx + 1} componente asociado`}
                    >
                      <option value="">— Ninguno —</option>
                      {nombresComponentesDisponibles.map((nombre) => (
                        <option key={nombre} value={nombre}>
                          {nombre}
                        </option>
                      ))}
                      {paso.componente_nombre &&
                        !nombresComponentesDisponibles.includes(paso.componente_nombre) && (
                          <option value={paso.componente_nombre}>{paso.componente_nombre}</option>
                        )}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="table-input mono col-right"
                      value={paso.cantidadTexto}
                      placeholder="—"
                      onChange={(e) => {
                        const val = e.target.value;
                        setPasos((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, cantidadTexto: val } : row))
                        );
                      }}
                      onKeyDown={(e) => handlePasoKeyDown(e, idx)}
                      aria-label={`Paso ${idx + 1} cantidad`}
                    />
                  </td>
                  <td>
                    <select
                      className="table-select mono"
                      value={paso.unidad}
                      onChange={(e) => {
                        const val = e.target.value as UnidadComponente;
                        setPasos((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, unidad: val } : row))
                        );
                      }}
                      onKeyDown={(e) => handlePasoKeyDown(e, idx)}
                      aria-label={`Paso ${idx + 1} unidad`}
                    >
                      {UNIDADES_COMPONENTE.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="table-input mono col-right"
                      value={paso.tiempoTexto}
                      placeholder="min"
                      onChange={(e) => {
                        const val = e.target.value;
                        setPasos((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, tiempoTexto: val } : row))
                        );
                      }}
                      onKeyDown={(e) => handlePasoKeyDown(e, idx)}
                      aria-label={`Paso ${idx + 1} tiempo en minutos`}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="table-input mono col-right"
                      value={paso.rpmTexto}
                      placeholder="RPM"
                      onChange={(e) => {
                        const val = e.target.value;
                        setPasos((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, rpmTexto: val } : row))
                        );
                      }}
                      onKeyDown={(e) => handlePasoKeyDown(e, idx)}
                      aria-label={`Paso ${idx + 1} velocidad RPM`}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="table-input mono col-right"
                      value={paso.temperaturaTexto}
                      placeholder="°C"
                      onChange={(e) => {
                        const val = e.target.value;
                        setPasos((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, temperaturaTexto: val } : row))
                        );
                      }}
                      onKeyDown={(e) => handlePasoKeyDown(e, idx)}
                      aria-label={`Paso ${idx + 1} temperatura en grados Celsius`}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="table-input"
                      value={paso.observaciones}
                      placeholder="Instrucciones u observaciones del paso..."
                      onChange={(e) => {
                        const val = e.target.value;
                        setPasos((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, observaciones: val } : row))
                        );
                      }}
                      onKeyDown={(e) => handlePasoKeyDown(e, idx)}
                      aria-label={`Paso ${idx + 1} observaciones`}
                    />
                  </td>
                  <td>
                    <div className="row-actions-cell">
                      <button
                        type="button"
                        className="btn-icon-sm"
                        onClick={() => movePasoRow(idx, -1)}
                        disabled={idx === 0}
                        title="Subir paso (Ctrl+↑)"
                        aria-label={`Subir paso ${idx + 1}`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-icon-sm"
                        onClick={() => movePasoRow(idx, 1)}
                        disabled={idx === pasos.length - 1}
                        title="Bajar paso (Ctrl+↓)"
                        aria-label={`Bajar paso ${idx + 1}`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn-icon-sm danger"
                        onClick={() => removePasoRow(idx)}
                        title="Eliminar paso (Ctrl+Supr)"
                        aria-label={`Eliminar paso ${idx + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="editor-table-footer">
            <button type="button" className="btn" onClick={() => addPasoRow()}>
              + Añadir paso al procedimiento (Enter)
            </button>
            <span className="keyboard-table-tip">
              Ctrl+↑ / Ctrl+↓ reordena el paso actual · Ctrl+Supr elimina la fila
            </span>
          </div>
        </section>

        {/* BLOQUE 4: NOTAS Y PRECAUCIONES */}
        <section className="section-block" aria-label="Notas y precauciones">
          <div className="section-header">
            <h3 className="section-title">3. Notas Generales y Precauciones</h3>
            <span className="section-subtitle">Opcional — EPP, rangos de control y seguridad</span>
          </div>

          <textarea
            className="field-textarea"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Escriba aquí las precauciones de seguridad, equipo de protección personal obligatorio y parámetros de control de calidad..."
            aria-label="Notas generales y precauciones de la receta"
          />
        </section>
      </div>
    </form>
  );
};

