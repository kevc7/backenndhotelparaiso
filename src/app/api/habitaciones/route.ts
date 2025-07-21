import { NextRequest, NextResponse } from 'next/server'
import { getDbPool } from '@/lib/database'

// GET - Obtener todas las habitaciones
export async function GET() {
  try {
    const pool = getDbPool()
    
    const query = `
      SELECT 
        h.id,
        h.numero,
        h.piso,
        h.estado,
        th.precio_base,
        h.fecha_creacion,
        h.fecha_actualizacion,
        th.id as tipo_id,
        th.nombre as tipo_nombre,
        th.descripcion as tipo_descripcion,
        th.capacidad_maxima,
        th.servicios
      FROM habitaciones h
      JOIN tipos_habitacion th ON h.tipo_habitacion_id = th.id
      ORDER BY h.piso, h.numero
    `
    
    const result = await pool.query(query)
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    })
    
  } catch (error) {
    console.error('Error obteniendo habitaciones:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error al obtener habitaciones',
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// POST - Crear nueva habitación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { numero, piso, tipo_habitacion_id, estado } = body;
    if (!numero || !piso || !tipo_habitacion_id || !estado) {
      return NextResponse.json({ success: false, message: 'Faltan campos requeridos: numero, piso, tipo_habitacion_id, estado' }, { status: 400 });
    }
    const pool = getDbPool();
    // Verificar que el tipo de habitación existe
    const tipoCheck = await pool.query('SELECT id FROM tipos_habitacion WHERE id = $1', [tipo_habitacion_id]);
    if (tipoCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'El tipo de habitación no existe' }, { status: 400 });
    }
    // Verificar que no existe otra habitación con el mismo número
    const numeroCheck = await pool.query('SELECT id FROM habitaciones WHERE numero = $1', [numero]);
    if (numeroCheck.rows.length > 0) {
      return NextResponse.json({ success: false, message: 'Ya existe una habitación con ese número' }, { status: 400 });
    }
    const result = await pool.query(
      'INSERT INTO habitaciones (numero, piso, tipo_habitacion_id, estado, fecha_creacion, fecha_actualizacion) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [numero, piso, tipo_habitacion_id, estado]
    );
    return NextResponse.json({ success: true, message: 'Habitación creada exitosamente', data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error al crear habitación', error: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 });
  }
} 