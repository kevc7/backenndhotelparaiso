import { NextRequest, NextResponse } from 'next/server'
import { getDbPool } from '@/lib/database'

// GET - Obtener todos los tipos de habitación
export async function GET() {
  try {
    const pool = getDbPool()
    
    const query = `
      SELECT * FROM tipos_habitacion ORDER BY nombre
    `
    
    const result = await pool.query(query)
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    })
    
  } catch (error) {
    console.error('Error obteniendo tipos de habitación:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error al obtener tipos de habitación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo tipo de habitación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, descripcion, capacidad_maxima, precio_base, servicios } = body
    
    // Validaciones básicas
    if (!nombre || !capacidad_maxima || !precio_base) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Faltan campos requeridos: nombre, capacidad_maxima, precio_base' 
        },
        { status: 400 }
      )
    }
    
    const pool = getDbPool()
    
    // Verificar que no existe otro tipo con el mismo nombre
    const nombreCheck = await pool.query(
      'SELECT id FROM tipos_habitacion WHERE LOWER(nombre) = LOWER($1)',
      [nombre]
    )
    
    if (nombreCheck.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Ya existe un tipo de habitación con ese nombre' },
        { status: 400 }
      )
    }
    
    // Crear el tipo de habitación
    const insertQuery = `
      INSERT INTO tipos_habitacion (nombre, descripcion, capacidad_maxima, precio_base, servicios)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    
    const result = await pool.query(insertQuery, [
      nombre, 
      descripcion || null, 
      capacidad_maxima, 
      precio_base,
      servicios || null
    ])
    
    return NextResponse.json({
      success: true,
      message: 'Tipo de habitación creado exitosamente',
      data: result.rows[0]
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creando tipo de habitación:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error al crear tipo de habitación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
} 