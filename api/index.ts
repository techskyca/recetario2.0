// Función Serverless para Vercel / entornos Cloud que redirige todas las rutas /api/* a Neon PostgreSQL
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleNeonApiRequest } from '../server/apiHandler.ts';
import { NeonRecipeDatabase } from '../server/db/neonDatabase.ts';

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

