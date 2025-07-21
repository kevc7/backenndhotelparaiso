import { Pool } from 'pg'

// Usar variable de entorno DATABASE_URL
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida en el entorno. Por favor, crea un archivo .env.local con la variable DATABASE_URL.');
}

const dbConfig = {
  connectionString,
  ssl: false // No necesario para conexión local a través del proxy
}

// Pool de conexiones
let pool: Pool | null = null

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool(dbConfig)
  }
  return pool
}

// Función para probar la conexión
export async function testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const client = getDbPool()
    const result = await client.query('SELECT NOW() as timestamp, version() as version')
    
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