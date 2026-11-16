// Script de compilación para la versión Online (GitHub + Neon.com + Vercel / Render / Railway)
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as viteBuild } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function buildOnline() {
  console.log('1/2 Compilando interfaz web con Vite (dist/)...');
  await viteBuild({
    root: rootDir,
    logLevel: 'info',
  });

  console.log('2/3 Empaquetando servidor web y conector Neon PostgreSQL (dist-server/index.cjs)...');
  const distServerDir = path.join(rootDir, 'dist-server');
  fs.mkdirSync(distServerDir, { recursive: true });

  await esbuild.build({
    entryPoints: [path.join(rootDir, 'server/prodServer.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['pg'],
    outfile: path.join(distServerDir, 'index.cjs'),
  });

  console.log('3/3 Empaquetando función Serverless autocontenida para Vercel (api/index.js)...');
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'server/vercelApiEntry.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['pg-native'],
    outfile: path.join(rootDir, 'api/index.js'),
    footer: {
      js: 'if (module.exports && module.exports.default) { module.exports = Object.assign(module.exports.default, module.exports); }',
    },
  });

  console.log('\n============================================================');
  console.log('  COMPILACIÓN ONLINE (NEON.COM) COMPLETADA CON ÉXITO');
  console.log('  - Frontend estático en : dist/');
  console.log('  - Función Serverless   : api/index.ts (para Vercel)');
  console.log('  - Servidor Node en     : dist-server/index.cjs (Render/Railway)');
  console.log('============================================================\n');
}

buildOnline().catch((err) => {
  console.error('Error al compilar versión online:', err);
  process.exit(1);
});

