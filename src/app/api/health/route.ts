import { NextRequest, NextResponse } from 'next/server'
import { testConnection, getHotelData } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Probar conexión a la base de datos
    const connectionTest = await testConnection()
    
    if (!connectionTest.success) {
      return NextResponse.json({
        status: 'error',
        message: 'Error de conexión a la base de datos',
        error: connectionTest.message,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // Obtener datos básicos del hotel
    const hotelData = await getHotelData()

    return NextResponse.json({
      status: 'ok',
      message: 'Hotel Paraíso ERP Backend funcionando correctamente',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        server_time: connectionTest.data.timestamp,
        version: connectionTest.data.version
      },
      hotel_stats: hotelData.success ? hotelData.data : null
    })

  } catch (error) {
    console.error('Error en health check:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Error interno del servidor',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
} 