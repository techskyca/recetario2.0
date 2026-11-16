// Vista principal de consulta de receta: Componentes, Procedimiento paso a paso y Notas/Precauciones
import React from 'react';
import type { RecetaCompleta } from '../types/models';
import {
  construirResumenPaso,
  escalarCantidad,
  formatCantidad,
  formatCantidadConUnidad,
} from '../utils/formatters';

interface RecipeViewProps {
  receta: RecetaCompleta;
  loteEscala: number | null;
  onResetEscala: () => void;
}

export const RecipeView: React.FC<RecipeViewProps> = ({ receta, loteEscala, onResetEscala }) => {
  const isScaled = loteEscala !== null && loteEscala > 0 && loteEscala !== receta.lote_base_cantidad;
  const factorEscala = isScaled && receta.lote_base_cantidad > 0 ? loteEscala / receta.lote_base_cantidad : 1;

  const tiempoTotalMin = receta.pasos.reduce(
    (acc, p) => acc + (p.tiempo_mezclado_min && p.tiempo_mezclado_min > 0 ? Number(p.tiempo_mezclado_min) : 0),
    0
  );

  return (
    <div className="recipe-content-scroll">
      {isScaled && (
        <div className="scaled-notice-bar" role="region" aria-label="Aviso de lote escalado">
          <div>
            <strong>MODO ESCALADO DE LOTE ACTIVO:</strong> Mostrando cantidades recalculadas para{' '}
            <span className="mono">
              <strong>{formatCantidadConUnidad(loteEscala, receta.lote_base_unidad)}</strong>
            </span>{' '}
            (Factor <span className="mono">×{formatCantidad(factorEscala)}</span> respecto al lote base de{' '}
            <span className="mono">{formatCantidadConUnidad(receta.lote_base_cantidad, receta.lote_base_unidad)}</span>).
            La receta original guardada no ha sido modificada.
          </div>
          <button type="button" className="btn" onClick={onResetEscala}>
            Ver lote base ({formatCantidadConUnidad(receta.lote_base_cantidad, receta.lote_base_unidad)})
          </button>
        </div>
      )}

      {/* SECCIÓN 1: COMPONENTES */}
      <section className="section-block" aria-labelledby="sec-componentes-title">
        <div className="section-header">
          <h3 id="sec-componentes-title" className="section-title">
            1. Componentes de la Formulación
          </h3>
          <span className="section-subtitle">
            {receta.componentes.length} insumo(s) · Lote de referencia:{' '}
            {formatCantidadConUnidad(isScaled ? loteEscala : receta.lote_base_cantidad, receta.lote_base_unidad)}
          </span>
        </div>

        <table className="industrial-table" aria-label="Tabla de componentes de la receta">
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th>Componente / Materia Prima</th>
              <th className="col-right" style={{ width: '200px' }}>
                Cantidad {isScaled ? '(Escalada)' : ''}
              </th>
              <th style={{ width: '110px' }}>Unidad</th>
            </tr>
          </thead>
          <tbody>
            {receta.componentes.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No hay componentes registrados en esta receta.
                </td>
              </tr>
            ) : (
              receta.componentes.map((comp, idx) => {
                const cantMostrada = escalarCantidad(
                  comp.cantidad,
                  comp.unidad,
                  receta.lote_base_cantidad,
                  loteEscala
                );
                return (
                  <tr key={comp.id || idx}>
                    <td className="col-num">{idx + 1}</td>
                    <td>
                      <strong>{comp.nombre}</strong>
                    </td>
                    <td className={`col-right qty-cell ${isScaled ? 'is-scaled' : ''}`}>
                      {formatCantidad(cantMostrada)}{' '}
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{comp.unidad}</span>
                      {isScaled && comp.unidad !== '%' && (
                        <span className="qty-base-hint">
                          Base: {formatCantidadConUnidad(comp.cantidad, comp.unidad)}
                        </span>
                      )}
                    </td>
                    <td className="mono">{comp.unidad}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* SECCIÓN 2: PROCEDIMIENTO PASO A PASO */}
      <section className="section-block" aria-labelledby="sec-procedimiento-title">
        <div className="section-header">
          <h3 id="sec-procedimiento-title" className="section-title">
            2. Procedimiento de Preparación y Producción
          </h3>
          <span className="section-subtitle">
            {receta.pasos.length} paso(s) · Tiempo total de mezclado/proceso:{' '}
            {formatCantidad(tiempoTotalMin)} min
          </span>
        </div>

        <table className="industrial-table" aria-label="Tabla de procedimiento paso a paso">
          <thead>
            <tr>
              <th className="col-num">Paso</th>
              <th style={{ width: '135px' }}>Acción</th>
              <th style={{ width: '240px' }}>Componente Asociado</th>
              <th className="col-right" style={{ width: '150px' }}>
                Cantidad
              </th>
              <th className="col-right" style={{ width: '130px' }}>
                Tiempo Mezclado
              </th>
              <th className="col-right" style={{ width: '105px' }}>
                Velocidad
              </th>
              <th className="col-right" style={{ width: '115px' }}>
                Temperatura
              </th>
              <th>Observaciones e Instrucciones Operativas</th>
            </tr>
          </thead>
          <tbody>
            {receta.pasos.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No hay pasos definidos en esta receta.
                </td>
              </tr>
            ) : (
              receta.pasos.map((paso, idx) => {
                const cantPaso =
                  paso.cantidad !== null && paso.cantidad !== undefined
                    ? escalarCantidad(paso.cantidad, paso.unidad, receta.lote_base_cantidad, loteEscala)
                    : null;

                const resumenLectura = construirResumenPaso(paso, receta.lote_base_cantidad, loteEscala);

                return (
                  <tr key={paso.id || idx}>
                    <td className="col-num">
                      <span className="step-number-large">{paso.numero_paso}</span>
                    </td>
                    <td>
                      <strong>{paso.accion}</strong>
                    </td>
                    <td>{paso.componente_nombre || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td className={`col-right qty-cell ${isScaled && cantPaso !== null ? 'is-scaled' : ''}`}>
                      {cantPaso !== null ? (
                        <>
                          {formatCantidadConUnidad(cantPaso, paso.unidad)}
                          {isScaled && paso.unidad !== '%' && (
                            <span className="qty-base-hint">
                              Base: {formatCantidadConUnidad(paso.cantidad, paso.unidad)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>
                      )}
                    </td>
                    <td className="col-right mono">
                      {paso.tiempo_mezclado_min !== null && paso.tiempo_mezclado_min !== undefined ? (
                        <strong>{formatCantidad(paso.tiempo_mezclado_min)} min</strong>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="col-right mono">
                      {paso.rpm !== null && paso.rpm !== undefined ? (
                        `${paso.rpm} RPM`
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="col-right mono">
                      {paso.temperatura_c !== null && paso.temperatura_c !== undefined ? (
                        `${formatCantidad(paso.temperatura_c)} °C`
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div>{paso.observaciones || '—'}</div>
                      <div className="step-summary-line">{resumenLectura}</div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* SECCIÓN 3: NOTAS Y PRECAUCIONES */}
      <section className="section-block" aria-labelledby="sec-notas-title">
        <div className="section-header">
          <h3 id="sec-notas-title" className="section-title">
            3. Notas Generales y Precauciones de Seguridad
          </h3>
          <span className="section-subtitle">EPP y control de calidad</span>
        </div>

        <div className="notes-panel">
          {receta.notas?.trim()
            ? receta.notas
            : 'Sin notas ni precauciones adicionales registradas para esta variante.'}
        </div>
      </section>
    </div>
  );
};

