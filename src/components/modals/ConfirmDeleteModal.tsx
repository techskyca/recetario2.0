// Diálogo de confirmación explícita para eliminar una variante de receta
import React, { useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { RecetaCompleta } from '../../types/models';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  receta: RecetaCompleta | null;
  totalVariantesDelProducto: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  receta,
  totalVariantesDelProducto,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap(dialogRef, isOpen, onCancel, cancelBtnRef);

  if (!isOpen || !receta) return null;

  const isLastVariant = totalVariantesDelProducto <= 1;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="del-modal-title"
        aria-describedby="del-modal-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header warning">
          <h2 id="del-modal-title" className="modal-title" style={{ color: 'var(--safety-orange)' }}>
            ⚠️ Confirmar eliminación de receta
          </h2>
        </div>

        <div id="del-modal-desc" className="modal-body">
          <p style={{ marginTop: 0, fontSize: '16px' }}>
            ¿Está seguro de que desea eliminar de forma permanente la siguiente receta?
          </p>

          <div
            style={{
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-strong)',
              padding: '12px 16px',
              marginBottom: '14px',
            }}
          >
            <div>
              <strong>Producto:</strong> {receta.producto_nombre} ({receta.producto_categoria})
            </div>
            <div>
              <strong>Variante:</strong> <span className="mono">{receta.codigo_version}</span> —{' '}
              {receta.nombre_version}
            </div>
            <div>
              <strong>Responsable:</strong> {receta.responsable}
            </div>
          </div>

          {isLastVariant && (
            <div
              style={{
                backgroundColor: 'var(--safety-orange-bg)',
                border: '1px solid var(--safety-orange-border)',
                padding: '10px 14px',
                color: '#8E320D',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Nota: Esta es la única variante de «{receta.producto_nombre}». Al eliminarla, también se eliminará el
              producto de la lista.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button ref={cancelBtnRef} type="button" className="btn" onClick={onCancel}>
            Cancelar (Esc)
          </button>
          <button
            type="button"
            className="btn btn-danger-solid"
            onClick={() => {
              onConfirm();
            }}
          >
            Sí, eliminar definitivamente (Enter)
          </button>
        </div>
      </div>
    </div>
  );
};

