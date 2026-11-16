// Encabezado técnico de la receta con selector horizontal de variantes (v1.0 · v1.2 · v2.0)
import React from 'react';
import type { RecetaCompleta, RecetaResumen } from '../types/models';
import { formatCantidadConUnidad, formatFechaHora } from '../utils/formatters';

interface RecipeHeaderProps {
  receta: RecetaCompleta;
  variantesDelProducto: RecetaResumen[];
  loteEscala: number | null;
  onSelectVariante: (recetaId: number) => void;
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({
  receta,
  variantesDelProducto,
  loteEscala,
  onSelectVariante,
}) => {
  const isScaled = loteEscala !== null && loteEscala > 0 && loteEscala !== receta.lote_base_cantidad;

  return (
    <header className="recipe-header" aria-label="Encabezado de la receta seleccionada">
      <div className="recipe-header-top">
        <div>
          <span className="recipe-category-tag">{receta.producto_categoria}</span>
          <h2 className="recipe-title">
            {receta.producto_nombre}{' '}
            <span className="mono" style={{ color: 'var(--accent-primary)' }}>
              {receta.codigo_version}
            </span>
          </h2>
          <p className="recipe-subtitle">
            <strong>{receta.nombre_version}</strong>
            {receta.producto_descripcion ? ` — ${receta.producto_descripcion}` : ''}
          </p>
        </div>

        <div className={`status-badge ${receta.estado}`} role="status" aria-label={`Estado de la receta: ${receta.estado}`}>
          <span className={`status-dot ${receta.estado}`} aria-hidden="true" />
          <span>{receta.estado}</span>
        </div>
      </div>

      <div className="variant-tabs-bar" role="tablist" aria-label="Selector de variante del producto">
        <span className="variant-tabs-label">Variantes ([ / ] o Alt+←/→):</span>
        {variantesDelProducto.map((v) => {
          const active = v.id === receta.id;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`variant-tab-btn ${active ? 'is-active' : ''}`}
              onClick={() => onSelectVariante(v.id)}
              title={`${v.codigo_version} · ${v.nombre_version} (${v.estado})`}
            >
              <span className={`status-dot ${v.estado}`} aria-hidden="true" />
              <span className="mono">{v.codigo_version}</span>
              <span>· {v.nombre_version}</span>
            </button>
          );
        })}
      </div>

      <div className="recipe-meta-strip">
        <div className="meta-cell">
          <span className="meta-label">Tamaño de Lote Base</span>
          <span className="meta-value lote-highlight">
            {formatCantidadConUnidad(receta.lote_base_cantidad, receta.lote_base_unidad)}
            {isScaled && (
              <span style={{ fontSize: '13px', marginLeft: '8px', color: 'var(--safety-orange)' }}>
                (Escalado a {formatCantidadConUnidad(loteEscala, receta.lote_base_unidad)})
              </span>
            )}
          </span>
        </div>

        <div className="meta-cell">
          <span className="meta-label">Responsable de Creación</span>
          <span className="meta-value">{receta.responsable}</span>
        </div>

        <div className="meta-cell">
          <span className="meta-label">Fecha de Creación</span>
          <span className="meta-value mono">{formatFechaHora(receta.fecha_creacion)}</span>
        </div>

        <div className="meta-cell">
          <span className="meta-label">Última Modificación</span>
          <span className="meta-value mono">{formatFechaHora(receta.fecha_modificacion)}</span>
        </div>
      </div>
    </header>
  );
};

