// Componente raíz de Recetario Ultraseco 2.0
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionBar } from './components/ActionBar';
import { PrintSheet } from './components/PrintSheet';
import { ProductionMode } from './components/ProductionMode';
import { RecipeEditor } from './components/RecipeEditor';
import { RecipeHeader } from './components/RecipeHeader';
import { RecipeView } from './components/RecipeView';
import { Sidebar } from './components/Sidebar';
import { BackupModal } from './components/modals/BackupModal';
import { ConfirmDeleteModal } from './components/modals/ConfirmDeleteModal';
import { NewRecipeModal } from './components/modals/NewRecipeModal';
import { ShortcutsHelpModal } from './components/modals/ShortcutsHelpModal';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { recipeService } from './services/recipeService';
import type {
  DbInfo,
  EstadoReceta,
  GuardarRecetaPayload,
  ProductoConVariantes,
  RecetaCompleta,
  RecetaResumen,
} from './types/models';

export const App: React.FC = () => {
  const [productos, setProductos] = useState<ProductoConVariantes[]>([]);
  const [selectedReceta, setSelectedReceta] = useState<RecetaCompleta | null>(null);
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [loteEscala, setLoteEscala] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estados de diálogos modales
  const [modalNewMode, setModalNewMode] = useState<'create' | 'duplicate' | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isProductionModeOpen, setIsProductionModeOpen] = useState(false);

  // Mensajes de estado y errores
  const [banner, setBanner] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const scaleInputRef = useRef<HTMLInputElement | null>(null);

  const showBanner = useCallback((type: 'error' | 'success', text: string) => {
    setBanner({ type, text });
  }, []);

  // Carga inicial y refresco del árbol y la receta seleccionada
  const refreshAll = useCallback(
    async (preferRecetaId?: number) => {
      try {
        const [treeData, infoData] = await Promise.all([
          recipeService.getTree(),
          recipeService.getInfo(),
        ]);
        setProductos(treeData);
        setDbInfo(infoData);

        const targetId =
          preferRecetaId ??
          selectedReceta?.id ??
          treeData[0]?.variantes[0]?.id ??
          null;

        if (targetId) {
          const full = await recipeService.getRecetaById(targetId).catch(() => null);
          if (full) {
            setSelectedReceta(full);
          } else {
            const fallbackId = treeData[0]?.variantes[0]?.id;
            if (fallbackId) {
              const fallbackFull = await recipeService.getRecetaById(fallbackId);
              setSelectedReceta(fallbackFull);
            } else {
              setSelectedReceta(null);
            }
          }
        } else {
          setSelectedReceta(null);
        }
      } catch (err) {
        showBanner('error', err instanceof Error ? err.message : 'Error al cargar la base de datos.');
      } finally {
        setLoading(false);
      }
    },
    [selectedReceta?.id, showBanner]
  );

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectReceta = useCallback(
    async (recetaId: number) => {
      try {
        const full = await recipeService.getRecetaById(recetaId);
        if (full) {
          setSelectedReceta(full);
          setLoteEscala(null);
          setIsEditing(false);
        }
      } catch (err) {
        showBanner('error', err instanceof Error ? err.message : 'No se pudo abrir la receta seleccionada.');
      }
    },
    [showBanner]
  );

  // Variantes del producto actual para el selector horizontal y los atajos [ / ] o Alt+←/→
  const variantesDelProductoActual = useMemo<RecetaResumen[]>(() => {
    if (!selectedReceta) return [];
    const prod = productos.find((p) => p.id === selectedReceta.producto_id);
    return prod ? prod.variantes : [];
  }, [productos, selectedReceta]);

  const handlePrevVariant = useCallback(() => {
    if (!selectedReceta || variantesDelProductoActual.length <= 1) return;
    const idx = variantesDelProductoActual.findIndex((v) => v.id === selectedReceta.id);
    if (idx < 0) return;
    const prevIdx = (idx - 1 + variantesDelProductoActual.length) % variantesDelProductoActual.length;
    handleSelectReceta(variantesDelProductoActual[prevIdx].id);
  }, [selectedReceta, variantesDelProductoActual, handleSelectReceta]);

  const handleNextVariant = useCallback(() => {
    if (!selectedReceta || variantesDelProductoActual.length <= 1) return;
    const idx = variantesDelProductoActual.findIndex((v) => v.id === selectedReceta.id);
    if (idx < 0) return;
    const nextIdx = (idx + 1) % variantesDelProductoActual.length;
    handleSelectReceta(variantesDelProductoActual[nextIdx].id);
  }, [selectedReceta, variantesDelProductoActual, handleSelectReceta]);

  // Guardar edición
  const handleSaveEditedReceta = async (payload: GuardarRecetaPayload) => {
    const saved = await recipeService.saveReceta(payload);
    setSelectedReceta(saved);
    setIsEditing(false);
    await refreshAll(saved.id);
    showBanner('success', `Receta «${saved.producto_nombre} ${saved.codigo_version}» guardada correctamente.`);
  };

  // Crear nueva receta desde el modal
  const handleCreateNewReceta = async (payload: GuardarRecetaPayload, openInEditMode: boolean) => {
    const created = await recipeService.saveReceta(payload);
    setSelectedReceta(created);
    setLoteEscala(null);
    await refreshAll(created.id);
    if (openInEditMode) {
      setIsEditing(true);
    }
    showBanner('success', `Nueva receta «${created.producto_nombre} ${created.codigo_version}» creada.`);
  };

  // Duplicar variante desde el modal
  const handleDuplicateReceta = async (args: {
    sourceRecetaId: number;
    nuevoCodigoVersion: string;
    nuevoNombreVersion: string;
    responsable: string;
    estado: EstadoReceta;
  }) => {
    const duplicated = await recipeService.duplicateReceta(args);
    setSelectedReceta(duplicated);
    setLoteEscala(null);
    await refreshAll(duplicated.id);
    setIsEditing(true);
    showBanner(
      'success',
      `Variante «${duplicated.codigo_version}» duplicada correctamente. Puede ajustar los campos necesarios.`
    );
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!selectedReceta) return;
    const nombreEliminado = `${selectedReceta.producto_nombre} (${selectedReceta.codigo_version})`;
    try {
      await recipeService.deleteReceta(selectedReceta.id);
      setIsDeleteModalOpen(false);
      setLoteEscala(null);
      await refreshAll();
      showBanner('success', `Se eliminó la receta «${nombreEliminado}».`);
    } catch (err) {
      setIsDeleteModalOpen(false);
      showBanner('error', err instanceof Error ? err.message : 'No se pudo eliminar la receta.');
    }
  };

  const anyOverlayOpen =
    isEditing ||
    modalNewMode !== null ||
    isDeleteModalOpen ||
    isBackupModalOpen ||
    isShortcutsModalOpen ||
    isProductionModeOpen;

  useKeyboardNav({
    disabled: anyOverlayOpen,
    onNewRecipe: () => setModalNewMode('create'),
    onEditRecipe: () => {
      if (selectedReceta) setIsEditing(true);
    },
    onDuplicateRecipe: () => {
      if (selectedReceta) setModalNewMode('duplicate');
    },
    onDeleteRecipe: () => {
      if (selectedReceta) setIsDeleteModalOpen(true);
    },
    onFocusSearch: () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    },
    onPrintRecipe: () => {
      if (selectedReceta) {
        window.print();
      }
    },
    onPrevVariant: handlePrevVariant,
    onNextVariant: handleNextVariant,
    onOpenProductionMode: () => {
      if (selectedReceta) setIsProductionModeOpen(true);
    },
    onOpenShortcutsHelp: () => setIsShortcutsModalOpen(true),
  });

  const isExampleRecipe =
    selectedReceta &&
    (selectedReceta.nombre_version.toUpperCase().includes('EJEMPLO') ||
      selectedReceta.notas.toUpperCase().includes('RECETA DE EJEMPLO'));

  return (
    <>
      <div className="app-shell no-print">
        <Sidebar
          productos={productos}
          selectedRecetaId={selectedReceta?.id ?? null}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectReceta={handleSelectReceta}
          onNewReceta={() => setModalNewMode('create')}
          onOpenBackup={() => setIsBackupModalOpen(true)}
          onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
          searchInputRef={searchInputRef}
          disabled={isEditing}
        />

        {isEditing && selectedReceta ? (
          <RecipeEditor
            receta={selectedReceta}
            onSave={handleSaveEditedReceta}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <main className="main-area" aria-label="Área principal de receta">
            {banner && (
              <div className={`status-banner ${banner.type}`} role="status">
                <span>{banner.text}</span>
                <button
                  type="button"
                  className="btn-icon-sm"
                  onClick={() => setBanner(null)}
                  aria-label="Cerrar aviso"
                >
                  ×
                </button>
              </div>
            )}

            {isExampleRecipe && (
              <div className="example-banner" role="note">
                <span>
                  ⚠️ RECETA DE EJEMPLO INICIAL: Los valores mostrados son ficticios para demostración. Puede editarla
                  (Ctrl+E), duplicarla (Ctrl+D) o crear sus propias recetas (Ctrl+N).
                </span>
              </div>
            )}

            {loading ? (
              <div style={{ padding: '40px', fontSize: '18px' }}>Cargando base de datos local...</div>
            ) : !selectedReceta ? (
              <div style={{ padding: '48px 36px' }}>
                <h2 style={{ marginTop: 0 }}>No hay ninguna receta seleccionada</h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '560px' }}>
                  Cree una nueva receta de producción presionando <strong>Ctrl+N</strong> o el botón{' '}
                  <strong>+ Nueva receta</strong> en la barra lateral izquierda.
                </p>
                <button type="button" className="btn btn-primary" onClick={() => setModalNewMode('create')}>
                  + Crear primera receta (Ctrl+N)
                </button>
              </div>
            ) : (
              <>
                <RecipeHeader
                  receta={selectedReceta}
                  variantesDelProducto={variantesDelProductoActual}
                  loteEscala={loteEscala}
                  onSelectVariante={handleSelectReceta}
                />

                <ActionBar
                  receta={selectedReceta}
                  loteEscala={loteEscala}
                  onChangeLoteEscala={setLoteEscala}
                  onEdit={() => setIsEditing(true)}
                  onDuplicate={() => setModalNewMode('duplicate')}
                  onDelete={() => setIsDeleteModalOpen(true)}
                  onPrint={() => window.print()}
                  onOpenProductionMode={() => setIsProductionModeOpen(true)}
                  scaleInputRef={scaleInputRef}
                />

                <RecipeView
                  receta={selectedReceta}
                  loteEscala={loteEscala}
                  onResetEscala={() => setLoteEscala(null)}
                />
              </>
            )}
          </main>
        )}
      </div>

      {/* Hoja de orden de producción en blanco y negro exclusiva para Impresión / PDF */}
      <PrintSheet receta={selectedReceta} loteEscala={loteEscala} />

      {/* Modo Producción a Pantalla Completa (F5) */}
      <ProductionMode
        isOpen={isProductionModeOpen}
        receta={selectedReceta}
        loteEscala={loteEscala}
        onClose={() => setIsProductionModeOpen(false)}
      />

      {/* Diálogos Modales con trampa de foco y cierre con Esc */}
      <NewRecipeModal
        isOpen={modalNewMode !== null}
        mode={modalNewMode || 'create'}
        productos={productos}
        sourceReceta={selectedReceta}
        onClose={() => setModalNewMode(null)}
        onCreateNew={handleCreateNewReceta}
        onDuplicate={handleDuplicateReceta}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        receta={selectedReceta}
        totalVariantesDelProducto={variantesDelProductoActual.length}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        dbInfo={dbInfo}
        onClose={() => setIsBackupModalOpen(false)}
        onImported={async (msg) => {
          await refreshAll();
          showBanner('success', msg);
        }}
      />

      <ShortcutsHelpModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </>
  );
};

