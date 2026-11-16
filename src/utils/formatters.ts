// Utilidades de formato numérico (coma decimal), fechas y escalado de lote en vivo
import type { Paso, UnidadComponente } from '../types/models';

// Formatea un número con coma decimal y hasta 3 decimales significativos (ej. 0.5 -> "0,5", 100 -> "100")
export function formatCantidad(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || isNaN(Number(valor))) {
    return '—';
  }
  const redondeado = Math.round(Number(valor) * 1000) / 1000;
  return redondeado.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

// Formatea cantidad junto con su unidad siempre visible (ej. "40 kg", "0,5 kg")
export function formatCantidadConUnidad(
  valor: number | null | undefined,
  unidad: UnidadComponente | string | null | undefined
): string {
  if (valor === null || valor === undefined || isNaN(Number(valor))) {
    return '—';
  }
  const numStr = formatCantidad(valor);
  return unidad ? `${numStr} ${unidad}` : numStr;
}

// Convierte un texto con coma o punto decimal a número (ej. "0,5" -> 0.5)
export function parseDecimalInput(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return null;
  const num = Number(limpio);
  return isNaN(num) ? null : num;
}

// Calcula una cantidad escalada proporcionalmente al tamaño de lote deseado
// Nota: si la unidad es '%', el porcentaje relativo se mantiene constante, o bien las unidades másicas/volumétricas escalan por el factor
export function escalarCantidad(
  cantidadOriginal: number | null | undefined,
  unidad: string | null | undefined,
  loteBase: number,
  loteObjetivo: number | null
): number | null {
  if (cantidadOriginal === null || cantidadOriginal === undefined || isNaN(Number(cantidadOriginal))) {
    return null;
  }
  if (!loteObjetivo || loteObjetivo <= 0 || loteBase <= 0) {
    return Number(cantidadOriginal);
  }
  if (unidad === '%') {
    return Number(cantidadOriginal);
  }
  const factor = loteObjetivo / loteBase;
  return Math.round(Number(cantidadOriginal) * factor * 1000) / 1000;
}

// Formatea una fecha ISO a formato legible en español ("13/11/2026 15:30")
export function formatFechaHora(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Formatea fecha corta ("13/11/2026")
export function formatFechaCorta(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Genera la línea de lectura rápida de un paso según especificación:
// "Paso 2 · Agregar · Nonilfenol · 0,5 kg · Mezclar 5 min · 300 RPM"
export function construirResumenPaso(
  paso: Paso,
  loteBase: number,
  loteObjetivo: number | null
): string {
  const partes: string[] = [`Paso ${paso.numero_paso}`, paso.accion];

  if (paso.componente_nombre) {
    partes.push(paso.componente_nombre);
  }

  if (paso.cantidad !== null && paso.cantidad !== undefined) {
    const cantEscalada = escalarCantidad(paso.cantidad, paso.unidad, loteBase, loteObjetivo);
    partes.push(formatCantidadConUnidad(cantEscalada, paso.unidad));
  }

  if (paso.tiempo_mezclado_min !== null && paso.tiempo_mezclado_min !== undefined) {
    const etiquetaTiempo =
      paso.accion.toLowerCase() === 'mezclar'
        ? `${formatCantidad(paso.tiempo_mezclado_min)} min`
        : `Mezclar ${formatCantidad(paso.tiempo_mezclado_min)} min`;
    partes.push(etiquetaTiempo);
  }

  if (paso.rpm !== null && paso.rpm !== undefined) {
    partes.push(`${paso.rpm} RPM`);
  }

  if (paso.temperatura_c !== null && paso.temperatura_c !== undefined) {
    partes.push(`${formatCantidad(paso.temperatura_c)} °C`);
  }

  return partes.join(' · ');
}

