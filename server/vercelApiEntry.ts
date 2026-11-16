// Punto de entrada de la función Serverless de Vercel (se compila en api/index.js durante npm run build)
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleNeonApiRequest } from './apiHandler.ts';
import { NeonRecipeDatabase } from './db/neonDatabase.ts';

let sharedDb: NeonRecipeDatabase | null = null;

function getSharedDb(): NeonRecipeDatabase {
  if (!sharedDb) {
    sharedDb = new NeonRecipeDatabase();
  }
  return sharedDb;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const db = getSharedDb();
    await handleNeonApiRequest(req, res, db);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de configuración de base de datos Neon.';
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: message }));
  }
}
