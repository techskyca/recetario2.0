// Hoja técnica de producción limpia en blanco y negro para Imprimir / Exportar a PDF
import React from 'react';
import type { RecetaCompleta } from '../types/models';
import {
  escalarCantidad,
  formatCantidad,
  formatCantidadConUnidad,
  formatFechaCorta,
} from '../utils/formatters';

interface PrintSheetProps {
  receta: RecetaCompleta | null;
  loteEscala: number | null;
}

export const PrintSheet: React.FC<PrintSheetProps> = ({ receta, loteEscala }) => {
  if (!receta) return null;

  const loteProduccion =
    loteEscala !== null && loteEscala > 0 ? loteEscala : receta.lote_base_cantidad;
  const esEscalado = loteProduccion !== receta.lote_base_cantidad;

  return (
    <div className="print-only-sheet" aria-hidden="true">
      <div className="print-header-box">
        <div>
          <div style={{ fontSize: '9pt', fontWeight: 700, letterSpacing: '0.06em' }}>
            HOJA DE ORDEN DE PRODUCCIÓN Y CONTROL DE CALIDAD
          </div>
          <h1 className="print-doc-title">
            {receta.producto_nombre} — {receta.codigo_version}
          </h1>
          <div style={{ fontSize: '10pt', marginTop: '2px' }}>
            Variante: <strong>{receta.nombre_version}</strong> | Categoría: {receta.producto_categoria}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '9.5pt', fontFamily: 'monospace' }}>
          <div>ESTADO: {receta.estado.toUpperCase()}</div>
          <div>REV: {formatFechaCorta(receta.fecha_modificacion)}</div>
          <div>RESP: {receta.responsable}</div>
        </div>
      </div>

      {/* Campos para rellenar en planta: Lote, Fecha, Operario, Cantidad */}
      <table className="print-meta-grid">
        <tbody>
          <tr>
            <th style={{ width: '18%' }}>N.º de Lote Interno:</th>
            <td style={{ width: '32%' }}>&nbsp;</td>
            <th style={{ width: '18%' }}>Fecha de Producción:</th>
            <td style={{ width: '32%' }}>____ / ____ / 20____</td>
          </tr>
          <tr>
            <th>Tamaño Lote a Producir:</th>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11pt' }}>
              {formatCantidadConUnidad(loteProduccion, receta.lote_base_unidad)}
              {esEscalado
                ? ` (Escalado de base ${formatCantidadConUnidad(receta.lote_base_cantidad, receta.lote_base_unidad)})`
                : ' (Lote Base)'}
            </td>
            <th>Operario Responsable:</th>
            <td>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      {/* Tabla 1: Pesaje de Componentes */}
      <div className="print-section-title">1. Pesaje y Dosificación de Materias Primas</div>
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: '36px', textAlign: 'center' }}>Verif.</th>
            <th style={{ width: '36px', textAlign: 'center' }}>#</th>
            <th>Componente / Materia Prima</th>
            <th style={{ width: '120px', textAlign: 'right' }}>Cantidad Requerida</th>
            <th style={{ width: '65px' }}>Unidad</th>
            <th style={{ width: '140px' }}>Lote Materia Prima</th>
            <th style={{ width: '110px' }}>Peso Real</th>
          </tr>
        </thead>
        <tbody>
          {receta.componentes.map((comp, idx) => {
            const cant = escalarCantidad(
              comp.cantidad,
              comp.unidad,
              receta.lote_base_cantidad,
              loteEscala
            );
            return (
              <tr key={comp.id || idx}>
                <td style={{ textAlign: 'center' }}>
                  <span className="print-checkbox" />
                </td>
                <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{idx + 1}</td>
                <td>
                  <strong>{comp.nombre}</strong>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                  {formatCantidad(cant)}
                </td>
                <td style={{ fontFamily: 'monospace' }}>{comp.unidad}</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Tabla 2: Procedimiento Paso a Paso con casillas de verificación */}
      <div className="print-section-title">2. Procedimiento de Preparación Paso a Paso</div>
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: '38px', textAlign: 'center' }}>OK</th>
            <th style={{ width: '42px', textAlign: 'center' }}>Paso</th>
            <th style={{ width: '90px' }}>Acción</th>
            <th style={{ width: '150px' }}>Componente</th>
            <th style={{ width: '95px', textAlign: 'right' }}>Cantidad</th>
            <th style={{ width: '75px', textAlign: 'right' }}>Tiempo</th>
            <th style={{ width: '65px', textAlign: 'right' }}>RPM</th>
            <th style={{ width: '65px', textAlign: 'right' }}>Temp.</th>
            <th>Observaciones e Instrucciones</th>
          </tr>
        </thead>
        <tbody>
          {receta.pasos.map((paso, idx) => {
            const cantPaso =
              paso.cantidad !== null && paso.cantidad !== undefined
                ? escalarCantidad(paso.cantidad, paso.unidad, receta.lote_base_cantidad, loteEscala)
                : null;
            return (
              <tr key={paso.id || idx}>
                <td style={{ textAlign: 'center' }}>
                  <span className="print-checkbox" />
                </td>
                <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: '11pt' }}>
                  {paso.numero_paso}
                </td>
                <td>
                  <strong>{paso.accion}</strong>
                </td>
                <td>{paso.componente_nombre || '—'}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                  {cantPaso !== null ? formatCantidadConUnidad(cantPaso, paso.unidad) : '—'}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                  {paso.tiempo_mezclado_min !== null && paso.tiempo_mezclado_min !== undefined
                    ? `${formatCantidad(paso.tiempo_mezclado_min)} min`
                    : '—'}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                  {paso.rpm !== null && paso.rpm !== undefined ? `${paso.rpm}` : '—'}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                  {paso.temperatura_c !== null && paso.temperatura_c !== undefined
                    ? `${formatCantidad(paso.temperatura_c)} °C`
                    : '—'}
                </td>
                <td>{paso.observaciones || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Notas y Precauciones */}
      {receta.notas?.trim() && (
        <>
          <div className="print-section-title">3. Notas Generales y Precauciones de Seguridad</div>
          <div
            style={{
              border: '1px solid #000000',
              padding: '8px 10px',
              whiteSpace: 'pre-wrap',
              fontSize: '9pt',
              lineHeight: 1.4,
            }}
          >
            {receta.notas}
          </div>
        </>
      )}

      {/* Firmas de planta */}
      <div className="print-signatures">
        <div className="print-sign-box">
          <strong>Firma del Operario de Producción</strong>
          <div>Nombre y Fecha</div>
        </div>
        <div className="print-sign-box">
          <strong>Supervisor de Planta</strong>
          <div>Verificación de Proceso</div>
        </div>
        <div className="print-sign-box">
          <strong>Control de Calidad</strong>
          <div>Aprobación de Lote</div>
        </div>
      </div>
    </div>
  );
};

