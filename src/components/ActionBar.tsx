// Barra de acciones de la receta: Editar, Duplicar, Modo Producción, Imprimir/PDF, Eliminar y Escalado de Lote
import React, { useEffect, useState } from 'react';
import type { RecetaCompleta } from '../types/models';
import { formatCantidad, parseDecimalInput } from '../utils/formatters';

interface ActionBarProps {
  receta: RecetaCompleta;
  loteEscala: number | null;
  onChangeLoteEscala: (nuevoLote: number | null) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onOpenProductionMode: () => void;
  scaleInputRef: React.RefObject<HTMLInputElement | null>;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  receta,
  loteEscala,
  onChangeLoteEscala,
  onEdit,
  onDuplicate,
  onDelete,
  onPrint,
  onOpenProductionMode,
  scaleInputRef,
}) => {
  const [inputText, setInputText] = useState<string>(formatCantidad(receta.lote_base_cantidad));

  useEffect(() => {
    if (loteEscala === null) {
      setInputText(formatCantidad(receta.lote_base_cantidad));
    } else {
      setInputText(formatCantidad(loteEscala));
    }
  }, [receta.id, receta.lote_base_cantidad, loteEscala]);

  const handleScaleInputChange = (val: string) => {
    setInputText(val);
    const parsed = parseDecimalInput(val);
    if (parsed !== null && parsed > 0) {
      if (Math.abs(parsed - receta.lote_base_cantidad) < 0.0001) {
        onChangeLoteEscala(null);
      } else {
        onChangeLoteEscala(parsed);
      }
    } else if (!val.trim()) {
      onChangeLoteEscala(null);
    }
  };

  const isScaled = loteEscala !== null && loteEscala > 0 && loteEscala !== receta.lote_base_cantidad;

  return (
    <div className="action-bar no-print" role="toolbar" aria-label="Acciones de la receta">
      <div className="action-buttons-group">
        <button type="button" className="btn btn-primary" onClick={onEdit} title="Editar receta actual (Ctrl+E)">
          <span>Editar receta</span>
          <span className="kbd-hint">Ctrl+E</span>
        </button>

        <button
          type="button"
          className="btn"
          onClick={onDuplicate}
          title="Duplicar como nueva variante de este producto (Ctrl+D)"
        >
          <span>Duplicar variante</span>
          <span className="kbd-hint">Ctrl+D</span>
        </button>

        <button
          type="button"
          className="btn"
          onClick={onOpenProductionMode}
          title="Abrir vista paso a paso a pantalla completa para planta (F5)"
        >
          <span>Modo Producción</span>
          <span className="kbd-hint">F5</span>
        </button>

        <button
          type="button"
          className="btn"
          onClick={onPrint}
          title="Imprimir o exportar a PDF hoja de producción en blanco y negro (Ctrl+P)"
        >
          <span>Imprimir / PDF</span>
          <span className="kbd-hint">Ctrl+P</span>
        </button>

        <button
          type="button"
          className="btn btn-danger"
          onClick={onDelete}
          title="Eliminar esta variante de receta (Supr)"
        >
          <span>Eliminar</span>
          <span className="kbd-hint">Supr</span>
        </button>
      </div>

      <div className={`scale-control-box ${isScaled ? 'is-scaled' : ''}`}>
        <label htmlFor="lote-scale-input" className="scale-label">
          Escalar lote a producir:
        </label>
        <input
          id="lote-scale-input"
          ref={scaleInputRef}
          type="text"
          inputMode="decimal"
          className="scale-input"
          value={inputText}
          onChange={(e) => handleScaleInputChange(e.target.value)}
          aria-label={`Cantidad total de lote a producir en ${receta.lote_base_unidad}`}
        />
        <span className="scale-unit">{receta.lote_base_unidad}</span>
        {isScaled && (
          <button
            type="button"
            className="btn-icon-sm"
            onClick={() => onChangeLoteEscala(null)}
            title="Restablecer al tamaño de lote base original"
          >
            Restablecer ({formatCantidad(receta.lote_base_cantidad)} {receta.lote_base_unidad})
          </button>
        )}
      </div>
    </div>
  );
};

