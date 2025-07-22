import { NextRequest, NextResponse } from 'next/server'
import { testConnection, getHotelData } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Logs de diagnóstico
    const diagnostics = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      DATABASE_URL_PREVIEW: process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@').substring(0, 100) + '...',
      timestamp: new Date().toISOString()
    }
    
    console.log('🔍 Health Check - Diagnósticos:', diagnostics)
    
    // Probar conexión a la base de datos
    console.log('🔗 Intentando conexión a la base de datos...')
    const connectionTest = await testConnection()
    
    if (!connectionTest.success) {
      console.error('❌ Error de conexión:', connectionTest.message)
      return NextResponse.json({
        status: 'error',
        message: 'Error de conexión a la base de datos',
        error: connectionTest.message,
        diagnostics,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    console.log('✅ Conexión exitosa, obteniendo datos del hotel...')
    // Obtener datos básicos del hotel
    const hotelData = await getHotelData()

    const response = {
      status: 'ok',
      message: 'Hotel Paraíso ERP Backend funcionando correctamente',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        server_time: connectionTest.data.timestamp,
        version: connectionTest.data.version
      },
      hotel_stats: hotelData.success ? hotelData.data : null,
      diagnostics
    }

    console.log('🎉 Health check exitoso')
    return NextResponse.json(response)

  } catch (error) {
    console.error('💥 Error en health check:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Error interno del servidor',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Error desconocido',
      diagnostics: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        DATABASE_URL_PREVIEW: process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@').substring(0, 100) + '...'
      }
    }, { status: 500 })
  }
} 