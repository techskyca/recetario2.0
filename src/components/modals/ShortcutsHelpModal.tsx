// Panel de Ajustes, Cambio de Clave de Acceso (con registro de fecha en Neon) y Guía de Atajos (? o F1)
import React, { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { recipeService } from '../../services/recipeService';
import type { AuthStatusInfo } from '../../types/models';
import { formatFechaHora } from '../../utils/formatters';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
  onLogout,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const [activeTab, setActiveTab] = useState<'seguridad' | 'atajos'>('seguridad');
  const [authStatus, setAuthStatus] = useState<AuthStatusInfo | null>(null);

  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [claveConfirmar, setClaveConfirmar] = useState('');
  const [observacion, setObservacion] = useState('');
  const [mostrarClaves, setMostrarClaves] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusTrap(dialogRef, isOpen, onClose, closeBtnRef);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setClaveActual('');
    setClaveNueva('');
    setClaveConfirmar('');
    setObservacion('');

    recipeService
      .getAuthStatus()
      .then((data) => setAuthStatus(data))
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!claveActual) {
      setFeedback({ type: 'error', text: 'Debe ingresar la clave de acceso actual.' });
      return;
    }
    if (!claveNueva || claveNueva.trim().length < 4) {
      setFeedback({ type: 'error', text: 'La nueva clave debe tener al menos 4 caracteres.' });
      return;
    }
    if (claveNueva !== claveConfirmar) {
      setFeedback({ type: 'error', text: 'La nueva clave y su confirmación no coinciden.' });
      return;
    }

    setSaving(true);
    try {
      const res = await recipeService.changePassword({
        claveActual,
        claveNueva,
        observacion: observacion.trim() || 'Actualización de clave desde panel de Ajustes',
      });
      setAuthStatus(res.authStatus);
      setClaveActual('');
      setClaveNueva('');
      setClaveConfirmar('');
      setObservacion('');
      setFeedback({
        type: 'success',
        text: 'Clave de acceso actualizada correctamente en Neon y registrada en el historial.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo actualizar la clave.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-dialog modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="settings-modal-title" className="modal-title">
            Ajustes de Seguridad y Atajos del Sistema
          </h2>
          <button type="button" className="btn-icon-sm" onClick={onClose} aria-label="Cerrar (Esc)">
            ×
          </button>
        </div>

        {/* Selector de pestaña dentro de Ajustes */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 20px',
            backgroundColor: 'var(--bg-app)',
            borderBottom: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`btn ${activeTab === 'seguridad' ? 'btn-primary' : ''}`}
              onClick={() => setActiveTab('seguridad')}
            >
              🔒 Clave de Acceso y Registro
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'atajos' ? 'btn-primary' : ''}`}
              onClick={() => setActiveTab('atajos')}
            >
              ⌨️ Atajos de Teclado
            </button>
          </div>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              onClose();
              onLogout();
            }}
            title="Bloquear el recetario y pedir clave nuevamente"
          >
            Cerrar sesión / Bloquear recetario
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'seguridad' ? (
            <div>
              {feedback && (
                <div className={`status-banner ${feedback.type}`} style={{ marginBottom: '16px' }} role="alert">
                  <span>{feedback.text}</span>
                </div>
              )}

              <div className="responsive-two-col-grid">
                {/* Columna 1: Formulario sencillo para cambiar clave */}
                <form
                  onSubmit={handleChangePassword}
                  style={{
                    border: '1px solid var(--border-color)',
                    padding: '16px',
                    backgroundColor: 'var(--bg-app)',
                  }}
                >
                  <h3 className="section-title" style={{ marginBottom: '12px', fontSize: '15px' }}>
                    Cambiar Clave de Acceso
                  </h3>

                  <div style={{ marginBottom: '12px' }}>
                    <label className="field-label" htmlFor="chg-curr-pass">
                      Clave Actual *
                    </label>
                    <input
                      id="chg-curr-pass"
                      type={mostrarClaves ? 'text' : 'password'}
                      className="field-input mono"
                      value={claveActual}
                      onChange={(e) => setClaveActual(e.target.value)}
                      placeholder="Clave actual..."
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label className="field-label" htmlFor="chg-new-pass">
                      Nueva Clave de Acceso *
                    </label>
                    <input
                      id="chg-new-pass"
                      type={mostrarClaves ? 'text' : 'password'}
                      className="field-input mono"
                      value={claveNueva}
                      onChange={(e) => setClaveNueva(e.target.value)}
                      placeholder="Mínimo 4 caracteres..."
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label className="field-label" htmlFor="chg-conf-pass">
                      Confirmar Nueva Clave *
                    </label>
                    <input
                      id="chg-conf-pass"
                      type={mostrarClaves ? 'text' : 'password'}
                      className="field-input mono"
                      value={claveConfirmar}
                      onChange={(e) => setClaveConfirmar(e.target.value)}
                      placeholder="Repita la nueva clave..."
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label className="field-label" htmlFor="chg-obs">
                      Motivo / Responsable del cambio (Opcional)
                    </label>
                    <input
                      id="chg-obs"
                      type="text"
                      className="field-input"
                      value={observacion}
                      onChange={(e) => setObservacion(e.target.value)}
                      placeholder="Ej. Actualización mensual por Gerencia"
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '14px',
                      gap: '10px',
                    }}
                  >
                    <label style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        checked={mostrarClaves}
                        onChange={(e) => setMostrarClaves(e.target.checked)}
                      />
                      <span>Mostrar claves</span>
                    </label>

                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Guardando...' : 'Actualizar clave'}
                    </button>
                  </div>
                </form>

                {/* Columna 2: Estado actual e historial de fechas de cambio en Neon */}
                <div>
                  <div
                    style={{
                      border: '1px solid var(--border-color)',
                      padding: '12px 14px',
                      marginBottom: '14px',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    <span className="field-label">Última actualización de clave</span>
                    <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {authStatus ? formatFechaHora(authStatus.fecha_actualizacion) : 'Cargando...'}
                    </div>
                  </div>

                  <h3 className="section-title" style={{ marginBottom: '8px', fontSize: '14px' }}>
                    Registro de Fechas de Cambio de Clave
                  </h3>

                  <div
                    style={{
                      maxHeight: '240px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <table className="industrial-table" style={{ minWidth: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '145px' }}>Fecha y Hora</th>
                          <th>Detalle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!authStatus || authStatus.historial.length === 0 ? (
                          <tr>
                            <td colSpan={2} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                              Sin registros aún.
                            </td>
                          </tr>
                        ) : (
                          authStatus.historial.map((item) => (
                            <tr key={item.id}>
                              <td className="mono" style={{ fontSize: '12px' }}>
                                {formatFechaHora(item.fecha_cambio)}
                              </td>
                              <td style={{ fontSize: '13px' }}>{item.observacion}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="responsive-two-col-grid">
              <div>
                <h3 className="section-title" style={{ marginBottom: '10px', fontSize: '14px' }}>
                  Atajos Globales
                </h3>
                <table className="industrial-table" style={{ minWidth: '100%' }}>
                  <tbody>
                    <tr>
                      <td className="mono" style={{ width: '130px', fontWeight: 700 }}>
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
                      <td>Abrir este panel de Ajustes y Ayuda</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="section-title" style={{ marginBottom: '10px', fontSize: '14px' }}>
                  Barra Lateral y Tablas Editables
                </h3>
                <table className="industrial-table" style={{ minWidth: '100%' }}>
                  <tbody>
                    <tr>
                      <td className="mono" style={{ width: '130px', fontWeight: 700 }}>
                        ↑ / ↓ / ← / →
                      </td>
                      <td>Navegar y expandir productos en barra lateral</td>
                    </tr>
                    <tr>
                      <td className="mono" style={{ fontWeight: 700 }}>
                        Tab / Shift+Tab
                      </td>
                      <td>Moverse entre celdas en tablas editables</td>
                    </tr>
                    <tr>
                      <td className="mono" style={{ fontWeight: 700 }}>
                        Enter
                      </td>
                      <td>Añadir una fila nueva en tablas</td>
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
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button ref={closeBtnRef} type="button" className="btn btn-primary" onClick={onClose}>
            Cerrar panel (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
