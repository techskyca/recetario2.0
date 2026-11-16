// Modo Producción a pantalla completa (F5): muestra un paso a la vez con texto muy grande,
// temporizador de mezclado integrado y avance con flechas ← / → o Enter
import React, { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { RecetaCompleta } from '../types/models';
import {
  construirResumenPaso,
  escalarCantidad,
  formatCantidad,
  formatCantidadConUnidad,
} from '../utils/formatters';

interface ProductionModeProps {
  isOpen: boolean;
  receta: RecetaCompleta | null;
  loteEscala: number | null;
  onClose: () => void;
}

// Emite un pitido corto industrial mediante Web Audio API sin requerir archivos externos
function emitirPitidoIndustrial() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignorar si el sistema no tiene salida de audio
  }
}

export const ProductionMode: React.FC<ProductionModeProps> = ({
  isOpen,
  receta,
  loteEscala,
  onClose,
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);

  const [stepIdx, setStepIdx] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerFinished, setTimerFinished] = useState<boolean>(false);

  useFocusTrap(overlayRef, isOpen, onClose, nextBtnRef);

  const pasos = receta?.pasos || [];
  const pasoActual = pasos[stepIdx];

  // Al abrir el modo producción, reiniciar al Paso 1
  useEffect(() => {
    if (isOpen) {
      setStepIdx(0);
      setCompletedSteps({});
    } else {
      setTimerRunning(false);
    }
  }, [isOpen, receta?.id]);

  // Al cambiar de paso, configurar el temporizador con el tiempo de mezclado del paso actual
  useEffect(() => {
    setTimerRunning(false);
    setTimerFinished(false);
    if (pasoActual && pasoActual.tiempo_mezclado_min && pasoActual.tiempo_mezclado_min > 0) {
      setSecondsLeft(Math.round(Number(pasoActual.tiempo_mezclado_min) * 60));
    } else {
      setSecondsLeft(0);
    }
  }, [stepIdx, pasoActual]);

  // Cuenta regresiva del temporizador
  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);
          setTimerFinished(true);
          emitirPitidoIndustrial();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning]);

  // Atajos de teclado exclusivos dentro del Modo Producción
  useEffect(() => {
    if (!isOpen || pasos.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCompletedSteps((prev) => ({ ...prev, [stepIdx]: true }));
        setStepIdx((prev) => Math.min(pasos.length - 1, prev + 1));
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStepIdx((prev) => Math.max(0, prev - 1));
        return;
      }

      if (e.key === 'Enter') {
        // Si el foco está en un botón distinto a avanzar, dejar que actúe normal; si no, avanza al siguiente paso
        const activeTag = (document.activeElement as HTMLElement)?.dataset?.prodAction;
        if (activeTag === 'close' || activeTag === 'timer' || activeTag === 'prev') {
          return;
        }
        e.preventDefault();
        setCompletedSteps((prev) => ({ ...prev, [stepIdx]: true }));
        if (stepIdx < pasos.length - 1) {
          setStepIdx((prev) => prev + 1);
        }
        return;
      }

      if (e.key === ' ') {
        const hasTimer = pasoActual && pasoActual.tiempo_mezclado_min && pasoActual.tiempo_mezclado_min > 0;
        if (hasTimer) {
          e.preventDefault();
          if (secondsLeft === 0) {
            setSecondsLeft(Math.round(Number(pasoActual.tiempo_mezclado_min) * 60));
            setTimerFinished(false);
            setTimerRunning(true);
          } else {
            setTimerRunning((r) => !r);
          }
        }
        return;
      }

      if (e.key.toLowerCase() === 'r') {
        if (pasoActual && pasoActual.tiempo_mezclado_min && pasoActual.tiempo_mezclado_min > 0) {
          e.preventDefault();
          setTimerRunning(false);
          setTimerFinished(false);
          setSecondsLeft(Math.round(Number(pasoActual.tiempo_mezclado_min) * 60));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pasos.length, stepIdx, pasoActual, secondsLeft]);

  if (!isOpen || !receta || !pasoActual) return null;

  const loteActual =
    loteEscala !== null && loteEscala > 0 ? loteEscala : receta.lote_base_cantidad;
  const cantEscalada =
    pasoActual.cantidad !== null && pasoActual.cantidad !== undefined
      ? escalarCantidad(pasoActual.cantidad, pasoActual.unidad, receta.lote_base_cantidad, loteEscala)
      : null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTimer = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const hasTimer = pasoActual.tiempo_mezclado_min !== null && pasoActual.tiempo_mezclado_min > 0;
  const progressPct = ((stepIdx + 1) / pasos.length) * 100;

  return (
    <div
      ref={overlayRef}
      className="production-overlay no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Modo producción a pantalla completa"
    >
      <div className="production-topbar">
        <div>
          <span className="mono" style={{ fontSize: '13px', color: '#9FB3C8', marginRight: '12px' }}>
            MODO PRODUCCIÓN EN PLANTA [F5]
          </span>
          <strong style={{ fontSize: '20px' }}>
            {receta.producto_nombre} ({receta.codigo_version}) — {receta.nombre_version}
          </strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="mono" style={{ fontSize: '18px' }}>
            LOTE A PRODUCIR:{' '}
            <strong style={{ color: '#62B0E8' }}>
              {formatCantidadConUnidad(loteActual, receta.lote_base_unidad)}
            </strong>
          </div>
          <button
            type="button"
            data-prod-action="close"
            className="btn btn-danger-solid"
            onClick={onClose}
          >
            Salir de Modo Producción (Esc)
          </button>
        </div>
      </div>

      <div className="production-progress-track" aria-hidden="true">
        <div className="production-progress-bar" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="production-body">
        {/* Columna izquierda: Instrucción gigante del paso actual */}
        <div className="production-main-step">
          <div>
            <div className="production-step-badge">
              PASO {pasoActual.numero_paso} DE {pasos.length}
              {completedSteps[stepIdx] && (
                <span style={{ marginLeft: '14px', color: 'var(--status-vigente)' }}>✓ COMPLETADO</span>
              )}
            </div>

            <h2 className="production-action-huge">
              {pasoActual.accion}
              {pasoActual.componente_nombre ? ` · ${pasoActual.componente_nombre}` : ''}
            </h2>

            <div
              className="mono"
              style={{
                fontSize: '18px',
                color: 'var(--text-secondary)',
                paddingBottom: '12px',
                borderBottom: '2px solid var(--border-color)',
              }}
            >
              {construirResumenPaso(pasoActual, receta.lote_base_cantidad, loteEscala)}
            </div>

            <div className="production-Specs-grid">
              <div className="production-spec-box">
                <span className="production-spec-label">Cantidad a Dosificar</span>
                <span className="production-spec-value">
                  {cantEscalada !== null
                    ? formatCantidadConUnidad(cantEscalada, pasoActual.unidad)
                    : 'No aplica'}
                </span>
              </div>

              <div className="production-spec-box">
                <span className="production-spec-label">Tiempo de Mezclado</span>
                <span className="production-spec-value">
                  {hasTimer ? `${formatCantidad(pasoActual.tiempo_mezclado_min)} min` : 'No aplica'}
                </span>
              </div>

              <div className="production-spec-box">
                <span className="production-spec-label">Velocidad de Agitación</span>
                <span className="production-spec-value">
                  {pasoActual.rpm !== null && pasoActual.rpm !== undefined
                    ? `${pasoActual.rpm} RPM`
                    : '—'}
                </span>
              </div>

              <div className="production-spec-box">
                <span className="production-spec-label">Temperatura Objetivo</span>
                <span className="production-spec-value">
                  {pasoActual.temperatura_c !== null && pasoActual.temperatura_c !== undefined
                    ? `${formatCantidad(pasoActual.temperatura_c)} °C`
                    : 'Ambiente'}
                </span>
              </div>
            </div>

            <div className="production-obs-box">
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Instrucciones Operativas y Observaciones del Paso:
              </div>
              {pasoActual.observaciones || 'Ejecutar según procedimiento operativo estándar.'}
            </div>
          </div>
        </div>

        {/* Columna derecha: Temporizador del paso y lista rápida de pasos */}
        <div className="production-timer-panel">
          <div>
            <h3 className="section-title" style={{ marginBottom: '12px' }}>
              Temporizador del Paso
            </h3>

            {hasTimer ? (
              <div className={`timer-display-box ${timerFinished ? 'finished' : ''}`}>
                <div className="timer-digits">{formattedTimer}</div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    marginTop: '6px',
                    color: timerFinished ? 'var(--safety-orange)' : 'var(--text-secondary)',
                  }}
                >
                  {timerFinished
                    ? '¡TIEMPO DE MEZCLADO COMPLETADO!'
                    : timerRunning
                    ? 'EN CURSO...'
                    : 'EN PAUSA — LISTO PARA INICIAR'}
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    data-prod-action="timer"
                    className="btn btn-primary"
                    onClick={() => {
                      if (secondsLeft === 0) {
                        setSecondsLeft(Math.round(Number(pasoActual.tiempo_mezclado_min) * 60));
                        setTimerFinished(false);
                        setTimerRunning(true);
                      } else {
                        setTimerRunning((r) => !r);
                      }
                    }}
                  >
                    {timerRunning ? 'Pausar (Espacio)' : 'Iniciar (Espacio)'}
                  </button>
                  <button
                    type="button"
                    data-prod-action="timer"
                    className="btn"
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerFinished(false);
                      setSecondsLeft(Math.round(Number(pasoActual.tiempo_mezclado_min) * 60));
                    }}
                  >
                    Reiniciar (R)
                  </button>
                </div>
              </div>
            ) : (
              <div className="timer-display-box">
                <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                  Este paso no tiene tiempo de mezclado cronometrado.
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px' }}>
              <h4 className="section-title" style={{ fontSize: '13px', marginBottom: '8px' }}>
                Secuencia de Pasos
              </h4>
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                {pasos.map((p, i) => (
                  <button
                    key={p.id || i}
                    type="button"
                    data-prod-action="timer"
                    onClick={() => setStepIdx(i)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      border: 'none',
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: i === stepIdx ? 'var(--bg-sidebar-active)' : 'transparent',
                      fontWeight: i === stepIdx ? 700 : 400,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '14px',
                    }}
                  >
                    <span>
                      <span className="mono">{p.numero_paso}.</span> {p.accion}{' '}
                      {p.componente_nombre ? `· ${p.componente_nombre}` : ''}
                    </span>
                    <span className="mono">{completedSteps[i] ? '✓' : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Teclado: [←] Paso anterior · [→ o Enter] Siguiente paso · [Espacio] Temporizador · [Esc] Salir
          </div>
        </div>
      </div>

      <div className="production-footer">
        <button
          type="button"
          data-prod-action="prev"
          className="btn"
          style={{ minHeight: '48px', fontSize: '16px', padding: '0 22px' }}
          disabled={stepIdx === 0}
          onClick={() => setStepIdx((prev) => Math.max(0, prev - 1))}
        >
          ← Paso Anterior
        </button>

        <div className="mono" style={{ fontSize: '18px', fontWeight: 700 }}>
          Paso {stepIdx + 1} de {pasos.length}
        </div>

        {stepIdx < pasos.length - 1 ? (
          <button
            ref={nextBtnRef}
            type="button"
            className="btn btn-primary"
            style={{ minHeight: '48px', fontSize: '17px', padding: '0 28px' }}
            onClick={() => {
              setCompletedSteps((prev) => ({ ...prev, [stepIdx]: true }));
              setStepIdx((prev) => Math.min(pasos.length - 1, prev + 1));
            }}
          >
            Siguiente Paso (Enter / →)
          </button>
        ) : (
          <button
            ref={nextBtnRef}
            type="button"
            className="btn btn-primary"
            style={{
              minHeight: '48px',
              fontSize: '17px',
              padding: '0 28px',
              backgroundColor: 'var(--status-vigente)',
              borderColor: 'var(--status-vigente)',
            }}
            onClick={onClose}
          >
            ✓ Finalizar Lote y Salir (Enter)
          </button>
        )}
      </div>
    </div>
  );
};

