// Servidor de desarrollo para la versión Online (Vite + Neon PostgreSQL)
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function compileNeonBackend() {
  const outDir = path.join(rootDir, '.tmp-dev-server');
  fs.mkdirSync(outDir, { recursive: true });
  const bundlePath = path.join(outDir, 'backend.mjs');

  await esbuild.build({
    entryPoints: [path.join(rootDir, 'server/devBackendEntry.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    external: ['pg'],
    outfile: bundlePath,
  });

  return import(`${bundlePath}?t=${Date.now()}`);
}

async function startDev() {
  const { createNeonBackend } = await compileNeonBackend();
  const backend = createNeonBackend();

  const vite = await createServer({
    root: rootDir,
    server: {
      port: 5173,
      strictPort: false,
      host: '0.0.0.0',
    },
    plugins: [
      {
        name: 'recetario-neon-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/')) {
              try {
                const handled = await backend.handleRequest(req, res);
                if (handled) return;
              } catch (err) {
                const msg = err instanceof Error ? err.message : 'Error de conexión a Neon.com';
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: msg }));
                return;
              }
            }
            next();
          });
        },
      },
    ],
  });

  await vite.listen();
  const address = vite.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 5173;

  console.log('\n============================================================');
  console.log('  RECETARIO ULTRASECO 2.0 — MODO DESARROLLO ONLINE (NEON)');
  console.log(`  URL Local : http://localhost:${port}`);
  console.log('  Base Datos: Neon.com PostgreSQL (variable DATABASE_URL)');
  console.log('============================================================\n');
}

startDev().catch((err) => {
  console.error('Error al iniciar el servidor de desarrollo online:', err);
  process.exit(1);
});

