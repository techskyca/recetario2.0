// Hook de atajos de teclado globales para toda la aplicación (Requisito Crítico)
import { useEffect } from 'react';

interface GlobalShortcutHandlers {
  disabled: boolean; // Desactiva atajos de consulta cuando hay un modal abierto o se está en modo edición
  onNewRecipe: () => void;
  onEditRecipe: () => void;
  onDuplicateRecipe: () => void;
  onDeleteRecipe: () => void;
  onFocusSearch: () => void;
  onPrintRecipe: () => void;
  onPrevVariant: () => void;
  onNextVariant: () => void;
  onOpenProductionMode: () => void;
  onOpenShortcutsHelp: () => void;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export function useKeyboardNav(handlers: GlobalShortcutHandlers): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (handlers.disabled) return;

      const inInput = isEditableElement(e.target);

      // F1 o "?" abre ayuda de atajos
      if (e.key === 'F1' || (!inInput && e.key === '?')) {
        e.preventDefault();
        handlers.onOpenShortcutsHelp();
        return;
      }

      // F5 abre modo producción a pantalla completa
      if (e.key === 'F5') {
        e.preventDefault();
        handlers.onOpenProductionMode();
        return;
      }

      // Ctrl+N: Nueva receta
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handlers.onNewRecipe();
        return;
      }

      // Ctrl+E: Editar receta
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handlers.onEditRecipe();
        return;
      }

      // Ctrl+D: Duplicar como nueva variante
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handlers.onDuplicateRecipe();
        return;
      }

      // Ctrl+F o "/": Enfocar el buscador
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') || (!inInput && e.key === '/')) {
        e.preventDefault();
        handlers.onFocusSearch();
        return;
      }

      // Ctrl+P: Imprimir / PDF
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlers.onPrintRecipe();
        return;
      }

      // Alt+← / Alt+→ o "[" y "]": Cambiar entre variantes de un producto
      if ((e.altKey && e.key === 'ArrowLeft') || (!inInput && e.key === '[')) {
        e.preventDefault();
        handlers.onPrevVariant();
        return;
      }

      if ((e.altKey && e.key === 'ArrowRight') || (!inInput && e.key === ']')) {
        e.preventDefault();
        handlers.onNextVariant();
        return;
      }

      // Supr (Delete): Eliminar receta con confirmación
      if (!inInput && e.key === 'Delete' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        handlers.onDeleteRecipe();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}

