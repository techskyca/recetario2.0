// Manejador asíncrono de rutas API (/api/*) conectado a Neon PostgreSQL
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { BackupData, GuardarRecetaPayload } from '../src/types/models.ts';
import type { NeonRecipeDatabase } from './db/neonDatabase.ts';

function readJsonBody<T>(req: IncomingMessage & { body?: unknown }): Promise<T> {
  // Si el entorno serverless (ej. Vercel) ya parseó req.body, reutilizarlo directamente
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body as T);
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return Promise.resolve(JSON.parse(req.body) as T);
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString();
      if (raw.length > 25 * 1024 * 1024) {
        reject(new Error('El cuerpo de la petición excede el límite permitido (25 MB).'));
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as T) : ({} as T));
      } catch {
        reject(new Error('JSON inválido en la petición.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

export async function handleNeonApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  db: NeonRecipeDatabase
): Promise<boolean> {
  const urlObj = new URL(req.url || '/', 'http://127.0.0.1');
  const pathname = urlObj.pathname;

  if (!pathname.startsWith('/api/')) {
    return false;
  }

  try {
    if (req.method === 'GET' && pathname === '/api/info') {
      sendJson(res, 200, await db.getInfo());
      return true;
    }

    if (req.method === 'GET' && pathname === '/api/tree') {
      sendJson(res, 200, await db.getTree());
      return true;
    }

    const recetaMatch = pathname.match(/^\/api\/recetas\/(\d+)$/);
    if (recetaMatch) {
      const recetaId = Number(recetaMatch[1]);
      if (req.method === 'GET') {
        const receta = await db.getRecetaById(recetaId);
        if (!receta) {
          sendJson(res, 404, { error: 'Receta no encontrada.' });
        } else {
          sendJson(res, 200, receta);
        }
        return true;
      }

      if (req.method === 'DELETE') {
        const result = await db.deleteReceta(recetaId);
        sendJson(res, 200, result);
        return true;
      }
    }

    if (req.method === 'POST' && pathname === '/api/recetas') {
      const body = await readJsonBody<GuardarRecetaPayload>(req);
      const saved = await db.saveReceta(body);
      sendJson(res, 200, saved);
      return true;
    }

    if (req.method === 'POST' && pathname === '/api/recetas/duplicate') {
      const body = await readJsonBody<{
        sourceRecetaId: number;
        nuevoCodigoVersion: string;
        nuevoNombreVersion: string;
        responsable: string;
        estado: 'Vigente' | 'Borrador' | 'Obsoleta';
      }>(req);
      const duplicated = await db.duplicateReceta(
        Number(body.sourceRecetaId),
        body.nuevoCodigoVersion,
        body.nuevoNombreVersion,
        body.responsable,
        body.estado
      );
      sendJson(res, 200, duplicated);
      return true;
    }

    if (req.method === 'GET' && pathname === '/api/backup') {
      sendJson(res, 200, await db.exportBackup());
      return true;
    }

    if (req.method === 'POST' && pathname === '/api/backup') {
      const body = await readJsonBody<BackupData>(req);
      const result = await db.importBackup(body);
      sendJson(res, 200, result);
      return true;
    }

    sendJson(res, 404, { error: `Ruta API no encontrada: ${req.method} ${pathname}` });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al consultar la base de datos en Neon.com.';
    sendJson(res, 400, { error: message });
    return true;
  }
}

