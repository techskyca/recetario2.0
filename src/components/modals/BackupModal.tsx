// Diálogo modal de Respaldo (Exportar e Importar base de datos completa en JSON + información de SQLite)
import React, { useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { recipeService } from '../../services/recipeService';
import type { BackupData, DbInfo } from '../../types/models';

interface BackupModalProps {
  isOpen: boolean;
  dbInfo: DbInfo | null;
  onClose: () => void;
  onImported: (mensaje: string) => Promise<void>;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, dbInfo, onClose, onImported }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const exportBtnRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusTrap(dialogRef, isOpen, onClose, exportBtnRef);

  if (!isOpen) return null;

  const handleExportJson = async () => {
    setBusy(true);
    setStatusMessage(null);
    try {
      const backupData = await recipeService.exportBackup();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const fechaHoy = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo-recetario-ultraseco-${fechaHoy}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: 'success',
        text: `Respaldo exportado correctamente (${backupData.productos.length} producto(s), ${backupData.recetas.length} receta(s)).`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al exportar el respaldo JSON.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setStatusMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupData;
      const result = await recipeService.importBackup(parsed);
      await onImported(
        `Base de datos restaurada con éxito: ${result.productosImportados} producto(s) y ${result.recetasImportadas} receta(s).`
      );
      onClose();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'El archivo seleccionado no es un respaldo JSON válido.',
      });
    } finally {
      setBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-dialog modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="backup-modal-title" className="modal-title">
            Respaldo y Almacenamiento Cloud (Neon PostgreSQL / JSON)
          </h2>
          <button type="button" className="btn-icon-sm" onClick={onClose} aria-label="Cerrar (Esc)">
            ×
          </button>
        </div>

        <div className="modal-body">
          {statusMessage && (
            <div className={`status-banner ${statusMessage.type}`} style={{ marginBottom: '16px' }} role="alert">
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div
            style={{
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              padding: '14px 16px',
              marginBottom: '20px',
            }}
          >
            <div className="field-label">Conexión Activa de Base de Datos (Neon.com PostgreSQL)</div>
            <div className="mono" style={{ fontSize: '13px', wordBreak: 'break-all', marginTop: '4px' }}>
              {dbInfo?.dbPath || 'Cargando ruta...'}
            </div>
            {dbInfo && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Registros activos: <strong>{dbInfo.totalProductos}</strong> producto(s) ·{' '}
                <strong>{dbInfo.totalRecetas}</strong> variante(s) de receta.
              </div>
            )}
          </div>

          <div className="responsive-two-col-grid">
            <div
              style={{
                border: '1px solid var(--border-color)',
                padding: '16px',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <h3 style={{ marginTop: 0, fontSize: '16px' }}>1. Exportar Respaldo (JSON)</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Descarga un archivo JSON con todos los productos, variantes, componentes y pasos actuales para copia de
                seguridad externa.
              </p>
              <button
                ref={exportBtnRef}
                type="button"
                className="btn btn-primary"
                onClick={handleExportJson}
                disabled={busy}
              >
                Exportar base de datos a JSON
              </button>
            </div>

            <div
              style={{
                border: '1px solid var(--safety-orange-border)',
                padding: '16px',
                backgroundColor: 'var(--safety-orange-bg)',
              }}
            >
              <h3 style={{ marginTop: 0, fontSize: '16px', color: '#8E320D' }}>2. Importar Respaldo (JSON)</h3>
              <p style={{ fontSize: '14px', color: '#8E320D' }}>
                Restaura la base de datos desde un archivo JSON previamente exportado. Reemplazará las recetas actuales
                de forma atómica.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="btn btn-danger-solid"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                Seleccionar archivo JSON e importar...
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Cerrar (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};

