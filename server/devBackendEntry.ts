// Punto de entrada para el servidor de desarrollo local conectado a Neon.com
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { handleNeonApiRequest } from './apiHandler.ts';
import { NeonRecipeDatabase } from './db/neonDatabase.ts';

function loadEnvFile(): void {
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

export function createNeonBackend() {
  loadEnvFile();
  let db: NeonRecipeDatabase | null = null;

  return {
    handleRequest: async (req: IncomingMessage, res: ServerResponse) => {
      if (!db) {
        db = new NeonRecipeDatabase();
      }
      return handleNeonApiRequest(req, res, db);
    },
  };
}

