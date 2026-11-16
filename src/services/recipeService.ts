// Capa cliente de servicios para consultar y modificar recetas y control de acceso
import type {
  AuthStatusInfo,
  BackupData,
  DbInfo,
  EstadoReceta,
  GuardarRecetaPayload,
  ProductoConVariantes,
  RecetaCompleta,
} from '../types/models';

const SESSION_TOKEN_KEY = 'ultraseco_auth_token_v2';

export function getStoredAuthToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuthToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignorar errores de almacenamiento
  }
}

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
  const token = getStoredAuthToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-auth-token': token } : {}),
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

  if (response.status === 401) {
    setStoredAuthToken(null);
    window.dispatchEvent(new CustomEvent('ultraseco:unauthorized'));
    throw new Error(data.error || 'Sesión expirada o clave requerida.');
  }

  if (!response.ok) {
    const detail = data.error || data.message || (rawText ? rawText.slice(0, 180) : '');
    throw new Error(detail ? `${detail} (HTTP ${response.status})` : `Error del servidor (${response.status})`);
  }
  return data as T;
}

export const recipeService = {
  async login(clave: string): Promise<{ token: string; fecha_actualizacion: string }> {
    const res = await apiFetch<{ token: string; fecha_actualizacion: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ clave }),
    });
    setStoredAuthToken(res.token);
    return res;
  },

  logout(): void {
    setStoredAuthToken(null);
    window.dispatchEvent(new CustomEvent('ultraseco:unauthorized'));
  },

  async getAuthStatus(): Promise<AuthStatusInfo> {
    return apiFetch<AuthStatusInfo>('/api/auth/status');
  },

  async changePassword(args: {
    claveActual: string;
    claveNueva: string;
    observacion?: string;
  }): Promise<{ token: string; authStatus: AuthStatusInfo }> {
    const res = await apiFetch<{ token: string; authStatus: AuthStatusInfo }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(args),
    });
    setStoredAuthToken(res.token);
    return res;
  },

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

