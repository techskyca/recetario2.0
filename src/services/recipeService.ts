// Capa cliente de servicios para consultar y modificar recetas (compatible con Electron IPC y servidor local)
import type {
  BackupData,
  DbInfo,
  EstadoReceta,
  GuardarRecetaPayload,
  ProductoConVariantes,
  RecetaCompleta,
} from '../types/models';

declare global {
  interface Window {
    electronAPI?: {
      getInfo: () => Promise<DbInfo>;
      getTree: () => Promise<ProductoConVariantes[]>;
      getRecetaById: (id: number) => Promise<RecetaCompleta | null>;
      saveReceta: (payload: GuardarRecetaPayload) => Promise<RecetaCompleta>;
      duplicateReceta: (args: {
        sourceRecetaId: number;
        nuevoCodigoVersion: string;
        nuevoNombreVersion: string;
        responsable: string;
        estado: EstadoReceta;
      }) => Promise<RecetaCompleta>;
      deleteReceta: (id: number) => Promise<{ deletedRecetaId: number; deletedProductoId: number | null }>;
      exportBackup: () => Promise<BackupData>;
      importBackup: (data: BackupData) => Promise<{ productosImportados: number; recetasImportadas: number }>;
    };
  }
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  const rawText = await response.text().catch(() => '');
  let data: { error?: string; message?: string } = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    // Respuesta no JSON (por ejemplo página de error de plataforma)
  }

  if (!response.ok) {
    const detail = data.error || data.message || (rawText ? rawText.slice(0, 180) : '');
    throw new Error(detail ? `${detail} (HTTP ${response.status})` : `Error del servidor (${response.status})`);
  }
  return data as T;
}

export const recipeService = {
  async getInfo(): Promise<DbInfo> {
    if (window.electronAPI) {
      return window.electronAPI.getInfo();
    }
    return apiFetch<DbInfo>('/api/info');
  },

  async getTree(): Promise<ProductoConVariantes[]> {
    if (window.electronAPI) {
      return window.electronAPI.getTree();
    }
    return apiFetch<ProductoConVariantes[]>('/api/tree');
  },

  async getRecetaById(id: number): Promise<RecetaCompleta | null> {
    if (window.electronAPI) {
      return window.electronAPI.getRecetaById(id);
    }
    return apiFetch<RecetaCompleta>(`/api/recetas/${id}`);
  },

  async saveReceta(payload: GuardarRecetaPayload): Promise<RecetaCompleta> {
    if (window.electronAPI) {
      return window.electronAPI.saveReceta(payload);
    }
    return apiFetch<RecetaCompleta>('/api/recetas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async duplicateReceta(args: {
    sourceRecetaId: number;
    nuevoCodigoVersion: string;
    nuevoNombreVersion: string;
    responsable: string;
    estado: EstadoReceta;
  }): Promise<RecetaCompleta> {
    if (window.electronAPI) {
      return window.electronAPI.duplicateReceta(args);
    }
    return apiFetch<RecetaCompleta>('/api/recetas/duplicate', {
      method: 'POST',
      body: JSON.stringify(args),
    });
  },

  async deleteReceta(id: number): Promise<{ deletedRecetaId: number; deletedProductoId: number | null }> {
    if (window.electronAPI) {
      return window.electronAPI.deleteReceta(id);
    }
    return apiFetch<{ deletedRecetaId: number; deletedProductoId: number | null }>(`/api/recetas/${id}`, {
      method: 'DELETE',
    });
  },

  async exportBackup(): Promise<BackupData> {
    if (window.electronAPI) {
      return window.electronAPI.exportBackup();
    }
    return apiFetch<BackupData>('/api/backup');
  },

  async importBackup(data: BackupData): Promise<{ productosImportados: number; recetasImportadas: number }> {
    if (window.electronAPI) {
      return window.electronAPI.importBackup(data);
    }
    return apiFetch<{ productosImportados: number; recetasImportadas: number }>('/api/backup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

