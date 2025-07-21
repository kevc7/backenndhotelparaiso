import { NextRequest, NextResponse } from 'next/server';
import Cors from 'cors';

// Configurar CORS
const cors = Cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://tu-dominio-produccion.com' // Cambiar en producción
  ],
});

// Función helper para ejecutar CORS
function runMiddleware(req: NextRequest, res: NextResponse) {
  return new Promise((resolve, reject) => {
    cors(req as any, res as any, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export { runMiddleware }; 