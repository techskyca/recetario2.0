// Servidor web de producción para Recetario Ultraseco 2.0 (Versión Online con Neon.com)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { handleNeonApiRequest } from './apiHandler.ts';
import { NeonRecipeDatabase } from './db/neonDatabase.ts';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function loadEnvFileIfPresent(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const rawVal = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = rawVal;
      }
    }
  }
}

export function startOnlineServer(): void {
  loadEnvFileIfPresent();
  let db: NeonRecipeDatabase | null = null;
  const distDir = path.resolve(process.cwd(), 'dist');

  const server = http.createServer(async (req, res) => {
    if (req.url && req.url.startsWith('/api/')) {
      try {
        if (!db) {
          db = new NeonRecipeDatabase();
        }
        const handled = await handleNeonApiRequest(req, res, db);
        if (handled) return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error de conexión a Neon.com';
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: msg }));
        return;
      }
    }

    const reqPath = (req.url || '/').split('?')[0];
    let filePath = path.join(distDir, reqPath === '/' ? 'index.html' : reqPath);
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end('Acceso denegado');
      return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    try {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Archivo no encontrado');
    }
  });

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log('============================================================');
    console.log('  RECETARIO ULTRASECO 2.0 — SERVIDOR ONLINE (NEON POSTGRES)');
    console.log(`  Escuchando en el puerto : ${port}`);
    console.log('============================================================');
  });
}

startOnlineServer();

