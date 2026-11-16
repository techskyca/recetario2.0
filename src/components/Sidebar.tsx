// Barra lateral izquierda con buscador, agrupación por categoría y navegación completa por teclado (↑ ↓ ← → Enter)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIAS_PRODUCTO, type CategoriaProducto, type ProductoConVariantes } from '../types/models';

interface SidebarProps {
  productos: ProductoConVariantes[];
  selectedRecetaId: number | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectReceta: (recetaId: number) => void;
  onNewReceta: () => void;
  onOpenBackup: () => void;
  onOpenShortcuts: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}

interface TreeNavItem {
  key: string;
  type: 'product' | 'variant';
  productId: number;
  recetaId?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  productos,
  selectedRecetaId,
  searchQuery,
  onSearchChange,
  onSelectReceta,
  onNewReceta,
  onOpenBackup,
  onOpenShortcuts,
  searchInputRef,
  disabled = false,
}) => {
  // Mapa de productos expandidos; por defecto todos expandidos para acceso rápido en planta
  const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Asegurar que los productos nuevos y el producto seleccionado estén expandidos
  useEffect(() => {
    setExpandedProducts((prev) => {
      const next = { ...prev };
      for (const p of productos) {
        if (next[p.id] === undefined) {
          next[p.id] = true;
        }
        if (p.variantes.some((v) => v.id === selectedRecetaId)) {
          next[p.id] = true;
        }
      }
      return next;
    });
  }, [productos, selectedRecetaId]);

  // Filtrado por nombre de producto, categoría, código/nombre de versión o componente
  const filteredProductos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return productos;

    return productos
      .map((prod) => {
        const matchProd =
          prod.nombre.toLowerCase().includes(q) ||
          prod.categoria.toLowerCase().includes(q) ||
          prod.descripcion.toLowerCase().includes(q);

        if (matchProd) {
          return prod;
        }

        const matchingVariantes = prod.variantes.filter(
          (v) =>
            v.codigo_version.toLowerCase().includes(q) ||
            v.nombre_version.toLowerCase().includes(q) ||
            v.responsable.toLowerCase().includes(q) ||
            v.componentes_nombres.some((compName) => compName.toLowerCase().includes(q))
        );

        if (matchingVariantes.length > 0) {
          return {
            ...prod,
            variantes: matchingVariantes,
          };
        }
        return null;
      })
      .filter((p): p is ProductoConVariantes => p !== null);
  }, [productos, searchQuery]);

  // Agrupar productos filtrados por categoría
  const groupedByCategory = useMemo(() => {
    const groups: Array<{ categoria: CategoriaProducto; items: ProductoConVariantes[] }> = [];
    for (const cat of CATEGORIAS_PRODUCTO) {
      const items = filteredProductos.filter((p) => p.categoria === cat);
      if (items.length > 0) {
        groups.push({ categoria: cat, items });
      }
    }
    return groups;
  }, [filteredProductos]);

  // Lista plana de nodos visibles en el árbol para navegación con flechas ↑ / ↓ / ← / →
  const visibleNavItems = useMemo<TreeNavItem[]>(() => {
    const list: TreeNavItem[] = [];
    const forceExpand = searchQuery.trim().length > 0;

    for (const group of groupedByCategory) {
      for (const prod of group.items) {
        list.push({
          key: `prod-${prod.id}`,
          type: 'product',
          productId: prod.id,
        });
        const isExpanded = forceExpand || expandedProducts[prod.id] !== false;
        if (isExpanded) {
          for (const v of prod.variantes) {
            list.push({
              key: `var-${v.id}`,
              type: 'variant',
              productId: prod.id,
              recetaId: v.id,
            });
          }
        }
      }
    }
    return list;
  }, [groupedByCategory, expandedProducts, searchQuery]);

  const toggleProductExpand = (productId: number, forceValue?: boolean) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: forceValue !== undefined ? forceValue : !(prev[productId] ?? true),
    }));
  };

  const focusNavItemByIndex = (idx: number) => {
    const target = visibleNavItems[idx];
    if (!target) return;
    const btn = itemRefs.current[target.key];
    if (btn) {
      btn.focus();
    }
  };

  const handleTreeKeyDown = (e: React.KeyboardEvent, currentIndex: number, item: TreeNavItem) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(visibleNavItems.length - 1, currentIndex + 1);
      focusNavItemByIndex(nextIndex);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentIndex === 0) {
        searchInputRef.current?.focus();
      } else {
        focusNavItemByIndex(currentIndex - 1);
      }
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (item.type === 'product') {
        const isExpanded = expandedProducts[item.productId] !== false;
        if (!isExpanded) {
          toggleProductExpand(item.productId, true);
        } else {
          // Si ya está expandido, mueve el foco a su primera variante
          const next = visibleNavItems[currentIndex + 1];
          if (next && next.productId === item.productId) {
            focusNavItemByIndex(currentIndex + 1);
          }
        }
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (item.type === 'product') {
        toggleProductExpand(item.productId, false);
      } else if (item.type === 'variant') {
        // Desde una variante, ← regresa al nodo del producto padre
        const parentIdx = visibleNavItems.findIndex(
          (n) => n.type === 'product' && n.productId === item.productId
        );
        if (parentIdx >= 0) {
          focusNavItemByIndex(parentIdx);
        }
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (item.type === 'product') {
        toggleProductExpand(item.productId);
      } else if (item.type === 'variant' && item.recetaId) {
        onSelectReceta(item.recetaId);
      }
    }
  };

  const forceExpandAll = searchQuery.trim().length > 0;

  // Mapa rápido de key -> índice en visibleNavItems
  const navIndexMap = useMemo(() => {
    const map = new Map<string, { idx: number; item: TreeNavItem }>();
    visibleNavItems.forEach((item, idx) => {
      map.set(item.key, { idx, item });
    });
    return map;
  }, [visibleNavItems]);

  return (
    <aside className="sidebar no-print" aria-label="Navegación de productos y recetas">
      <div className="sidebar-brand">
        <span className="sidebar-brand-code">PLANTA QUÍMICA · NANOSILICIO</span>
        <h1 className="sidebar-brand-title">RECETARIO ULTRASECO 2.0</h1>
        <p className="sidebar-brand-subtitle">Control de Formulaciones Hidrofóbicas</p>
      </div>

      <div className="sidebar-top-actions">
        <button
          type="button"
          className="btn-new-recipe"
          onClick={onNewReceta}
          disabled={disabled}
          aria-label="Crear nueva receta (Ctrl+N)"
        >
          <span>+ Nueva receta</span>
          <span className="kbd-hint">Ctrl+N</span>
        </button>

        <div className="search-box-wrapper">
          <input
            ref={searchInputRef}
            type="search"
            className="search-input"
            placeholder="Buscar producto, versión o insumo... (/)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={disabled}
            aria-label="Buscar recetas por producto, categoría, versión o componente"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && visibleNavItems.length > 0) {
                e.preventDefault();
                focusNavItemByIndex(0);
              } else if (e.key === 'Escape' && searchQuery) {
                e.preventDefault();
                onSearchChange('');
              }
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              title="Limpiar búsqueda (Esc)"
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="sidebar-nav-help" aria-hidden="true">
        <span>↑↓ Navegar · ←→ Colapsar/Expandir</span>
        <span>Enter Abrir</span>
      </div>

      <div className="sidebar-tree" role="tree" aria-label="Lista de productos por categoría">
        {groupedByCategory.length === 0 ? (
          <div className="sidebar-empty">
            No se encontraron productos ni variantes para «{searchQuery}».
          </div>
        ) : (
          groupedByCategory.map((group) => (
            <div key={group.categoria} className="category-group" role="group" aria-label={`Categoría ${group.categoria}`}>
              <div className="category-header">
                <span>{group.categoria}</span>
                <span className="mono">{group.items.length}</span>
              </div>

              {group.items.map((prod) => {
                const isExpanded = forceExpandAll || expandedProducts[prod.id] !== false;
                const prodKey = `prod-${prod.id}`;
                const prodNav = navIndexMap.get(prodKey);
                const hasSelectedVariant = prod.variantes.some((v) => v.id === selectedRecetaId);

                return (
                  <div key={prod.id}>
                    <button
                      ref={(el) => {
                        itemRefs.current[prodKey] = el;
                      }}
                      type="button"
                      role="treeitem"
                      aria-expanded={isExpanded}
                      aria-selected={hasSelectedVariant}
                      disabled={disabled}
                      className={`tree-product-row ${hasSelectedVariant ? 'is-selected-product' : ''}`}
                      onClick={() => toggleProductExpand(prod.id)}
                      onKeyDown={(e) => {
                        if (prodNav) {
                          handleTreeKeyDown(e, prodNav.idx, prodNav.item);
                        }
                      }}
                    >
                      <span className="tree-arrow" aria-hidden="true">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <span className="tree-product-name" title={prod.nombre}>
                        {prod.nombre}
                      </span>
                      <span className="tree-product-count" title={`${prod.variantes.length} variante(s)`}>
                        [{prod.variantes.length}]
                      </span>
                    </button>

                    {isExpanded && (
                      <ul className="tree-variant-list" role="group">
                        {prod.variantes.map((variante) => {
                          const varKey = `var-${variante.id}`;
                          const varNav = navIndexMap.get(varKey);
                          const isActive = variante.id === selectedRecetaId;

                          return (
                            <li key={variante.id} role="none">
                              <button
                                ref={(el) => {
                                  itemRefs.current[varKey] = el;
                                }}
                                type="button"
                                role="treeitem"
                                aria-selected={isActive}
                                disabled={disabled}
                                className={`tree-variant-row ${isActive ? 'is-active' : ''}`}
                                onClick={() => onSelectReceta(variante.id)}
                                onKeyDown={(e) => {
                                  if (varNav) {
                                    handleTreeKeyDown(e, varNav.idx, varNav.item);
                                  }
                                }}
                                title={`${variante.codigo_version} — ${variante.nombre_version} (${variante.estado})`}
                              >
                                <span
                                  className={`status-dot ${variante.estado}`}
                                  aria-label={`Estado: ${variante.estado}`}
                                />
                                <span className="tree-variant-code">{variante.codigo_version}</span>
                                <span className="tree-variant-label">{variante.nombre_version}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button
          type="button"
          className="btn-sidebar-footer"
          onClick={onOpenShortcuts}
          disabled={disabled}
          title="Ajustes de clave de acceso y atajos de teclado (? o F1)"
        >
          <span>🔒 Ajustes / Clave</span>
          <span className="mono">[?]</span>
        </button>
        <button
          type="button"
          className="btn-sidebar-footer"
          onClick={onOpenBackup}
          disabled={disabled}
          title="Exportar o importar base de datos JSON"
        >
          <span>Respaldo BD</span>
        </button>
      </div>
    </aside>
  );
};

