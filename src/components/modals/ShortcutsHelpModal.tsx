// Diálogo de ayuda con todos los atajos de teclado globales y de tablas (? o F1)
import React, { useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap(dialogRef, isOpen, onClose, closeBtnRef);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-dialog modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="shortcuts-modal-title" className="modal-title">
            Guía de Navegación por Teclado (Operación 100 % sin Mouse)
          </h2>
          <button type="button" className="btn-icon-sm" onClick={onClose} aria-label="Cerrar (Esc)">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="responsive-two-col-grid">
            <div>
              <h3 className="section-title" style={{ marginBottom: '10px', fontSize: '14px' }}>
                Atajos Globales
              </h3>
              <table className="industrial-table">
                <tbody>
                  <tr>
                    <td className="mono" style={{ width: '140px', fontWeight: 700 }}>
                      Ctrl + N
                    </td>
                    <td>Nueva receta (producto o variante)</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      Ctrl + E
                    </td>
                    <td>Editar receta actual</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      Ctrl + S
                    </td>
                    <td>Guardar cambios (en modo edición)</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      Ctrl + D
                    </td>
                    <td>Duplicar como nueva variante</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      Supr (Delete)
                    </td>
                    <td>Eliminar receta (con confirmación)</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      Ctrl + F o /
                    </td>
                    <td>Enfocar el buscador instantáneo</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      Ctrl + P
                    </td>
                    <td>Imprimir / Exportar hoja a PDF</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      Alt+←/→ o [ / ]
                    </td>
                    <td>Cambiar entre variantes del producto</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      F5
                    </td>
                    <td>Abrir Modo Producción a pantalla completa</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      ? o F1
                    </td>
                    <td>Mostrar esta ayuda de atajos</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      Esc
                    </td>
                    <td>Cancelar edición / Cerrar diálogos</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="section-title" style={{ marginBottom: '10px', fontSize: '14px' }}>
                Barra Lateral (Árbol de Productos)
              </h3>
              <table className="industrial-table" style={{ marginBottom: '18px' }}>
                <tbody>
                  <tr>
                    <td className="mono" style={{ width: '140px', fontWeight: 700 }}>
                      ↑ / ↓
                    </td>
                    <td>Moverse entre productos y variantes</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      → / ←
                    </td>
                    <td>Expandir y colapsar productos</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      Enter
                    </td>
                    <td>Abrir variante o alternar producto</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="section-title" style={{ marginBottom: '10px', fontSize: '14px' }}>
                Tablas Editables (Componentes y Pasos)
              </h3>
              <table className="industrial-table" style={{ marginBottom: '18px' }}>
                <tbody>
                  <tr>
                    <td className="mono" style={{ width: '140px', fontWeight: 700 }}>
                      Tab / Shift+Tab
                    </td>
                    <td>Moverse entre celdas</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      Enter
                    </td>
                    <td>Añadir una fila nueva debajo</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      Ctrl + ↑ / ↓
                    </td>
                    <td>Reordenar pasos o componentes</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      Ctrl + Supr
                    </td>
                    <td>Eliminar la fila actual</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="section-title" style={{ marginBottom: '10px', fontSize: '14px' }}>
                Modo Producción (F5)
              </h3>
              <table className="industrial-table">
                <tbody>
                  <tr>
                    <td className="mono" style={{ width: '140px', fontWeight: 700 }}>
                      → o Enter
                    </td>
                    <td>Avanzar al siguiente paso</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      ←
                    </td>
                    <td>Retroceder al paso anterior</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      Espacio
                    </td>
                    <td>Iniciar / Pausar temporizador de mezclado</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      R
                    </td>
                    <td>Reiniciar temporizador del paso</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button ref={closeBtnRef} type="button" className="btn btn-primary" onClick={onClose}>
            Entendido (Esc / Enter)
          </button>
        </div>
      </div>
    </div>
  );
};

