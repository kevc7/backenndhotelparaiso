import { Pool } from 'pg'

// Usar variable de entorno DATABASE_URL
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida en el entorno. Por favor, crea un archivo .env.local con la variable DATABASE_URL.');
}

// Detectar el entorno
const isProduction = process.env.NODE_ENV === 'production';
const isLocalProxy = connectionString.includes('localhost');
const isFlyDatabase = connectionString.includes('.fly.dev') || connectionString.includes('flycast') || connectionString.includes('66.241.124.206');
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

// Configuración específica para cada entorno
let dbConfig: any = {
  connectionString,
  ssl: false
};

if (isFlyDatabase) {
  if (isVercel || connectionString.includes('.fly.dev')) {
    // Configuración para conexiones externas desde Vercel a Fly.io
    dbConfig = {
      connectionString,
      ssl: {
        rejectUnauthorized: false,
        sslmode: 'require'
      },
      connectionTimeoutMillis: 60000,
      idleTimeoutMillis: 30000,
      query_timeout: 30000,
      statement_timeout: 30000,
      max: 3,  // Reducir conexiones para Vercel (serverless)
      min: 0,  // Sin conexiones mínimas para serverless
      allowExitOnIdle: true
    };
  } else {
    // Configuración para conexiones internas en Fly.io
    dbConfig = {
      connectionString,
      ssl: false,  // No SSL para conexiones internas en Fly.io
      max: 5,
      min: 1,
      allowExitOnIdle: true
    };
  }
} else if (isLocalProxy) {
  // Configuración para desarrollo local con proxy
  dbConfig = {
    connectionString,
    ssl: false,
    max: 10,
    min: 1
  };
}

console.log('Configuración DB:', {
  isProduction,
  isLocalProxy,
  isFlyDatabase,
  isVercel,
  sslEnabled: !!dbConfig.ssl,
  connectionString: connectionString?.replace(/:[^:@]*@/, ':***@') // Ocultar password en logs
});

// Pool de conexiones
let pool: Pool | null = null

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool(dbConfig)
    
    // Manejar errores de conexión
    pool.on('error', (err) => {
      console.error('Error inesperado en el pool de conexiones:', err);
    });
    
    // Evento de conexión exitosa
    pool.on('connect', () => {
      console.log('Nueva conexión establecida con la base de datos');
    });
  }
  return pool
}

// Función para probar la conexión con timeout manual
export async function testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
  let client;
  try {
    const pool = getDbPool();
    
    // Usar timeout manual
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout de conexión (30s)')), 30000);
    });
    
    const queryPromise = pool.query('SELECT NOW() as timestamp, version() as version');
    
    const result = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    return {
      success: true,
      message: 'Conexión exitosa a la base de datos',
      data: result.rows[0]
    }
  } catch (error) {
    console.error('Error de conexión:', error)
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
    }
  }
}

// Función para obtener datos básicos del hotel
export async function getHotelData() {
  try {
    const client = getDbPool()
    
    // Primero verificar qué tablas existen
    const tablas = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    console.log('Tablas encontradas:', tablas.rows)
    
    // Consultar datos básicos solo si las tablas existen
    const tablasExistentes = tablas.rows.map(row => row.table_name)
    
    const datos: any = {
      tablas_existentes: tablasExistentes
    }
    
    if (tablasExistentes.includes('usuarios')) {
      const usuarios = await client.query('SELECT COUNT(*) as total FROM usuarios')
      datos.usuarios = usuarios.rows[0]?.total || 0
    }
    
    if (tablasExistentes.includes('habitaciones')) {
      const habitaciones = await client.query('SELECT COUNT(*) as total FROM habitaciones')
      datos.habitaciones = habitaciones.rows
    }
    
    if (tablasExistentes.includes('reservas')) {
      const reservas = await client.query('SELECT COUNT(*) as total FROM reservas')
      datos.reservas = reservas.rows
    }

    return {
      success: true,
      data: datos
    }
  } catch (error) {
    console.error('Error obteniendo datos:', error)
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
    }
  }
} 