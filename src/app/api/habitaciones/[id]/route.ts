import { NextRequest, NextResponse } from 'next/server'
import { getDbPool } from '@/lib/database'

// GET - Obtener habitación específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const pool = getDbPool()
    const { id } = await params
    const habitacionId = id
    
    const query = `
      SELECT 
        h.*,
        th.nombre as tipo_nombre,
        th.descripcion as tipo_descripcion,
        th.capacidad_maxima,
        th.precio_base,
        th.servicios
      FROM habitaciones h
      JOIN tipos_habitacion th ON h.tipo_habitacion_id = th.id
      WHERE h.id = $1
    `
    
    const result = await pool.query(query, [habitacionId])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Habitación no encontrada' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
    
  } catch (error) {
    console.error('Error obteniendo habitación:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error al obtener habitación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// PUT - Actualizar habitación
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const pool = getDbPool()
    const { id } = await params
    const habitacionId = id
    const body = await request.json()
    
    // Verificar que la habitación existe
    const existeCheck = await pool.query(
      'SELECT id, estado FROM habitaciones WHERE id = $1',
      [habitacionId]
    )
    
    if (existeCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Habitación no encontrada' },
        { status: 404 }
      )
    }
    
    const estadoActual = existeCheck.rows[0].estado
    
    // Construir la consulta de actualización dinámicamente
    const camposPermitidos = ['numero', 'piso', 'estado', 'tipo_habitacion_id', 'observaciones'];
    const camposActualizar = [];
    const valores = [];
    let contador = 1;
    
    for (const campo of camposPermitidos) {
      if (body[campo] !== undefined) {
        camposActualizar.push(`${campo} = $${contador}`);
        valores.push(body[campo]);
        contador++;
      }
    }
    
    if (camposActualizar.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No se proporcionaron campos para actualizar' },
        { status: 400 }
      )
    }
    
    // Validaciones específicas para cambio de estado
    if (body.estado && body.estado !== estadoActual) {
      const estadosValidos = ['libre', 'ocupada', 'separada', 'mantenimiento']
      if (!estadosValidos.includes(body.estado)) {
        return NextResponse.json(
          { success: false, message: 'Estado no válido. Debe ser: libre, ocupada, separada, mantenimiento' },
          { status: 400 }
        )
      }
      
      // Verificar transiciones válidas
      const transicionesValidas: Record<string, string[]> = {
        'libre': ['ocupada', 'separada', 'mantenimiento'],
        'ocupada': ['libre', 'mantenimiento'],
        'separada': ['ocupada', 'libre', 'mantenimiento'],
        'mantenimiento': ['libre']
      }
      
      if (!transicionesValidas[estadoActual]?.includes(body.estado)) {
        return NextResponse.json(
          { 
            success: false, 
            message: `No se puede cambiar de estado '${estadoActual}' a '${body.estado}'` 
          },
          { status: 400 }
        )
      }
    }
    
    // Si se cambia el número, verificar que no exista otra habitación con ese número
    if (body.numero) {
      const numeroCheck = await pool.query(
        'SELECT id FROM habitaciones WHERE numero = $1 AND id != $2',
        [body.numero, habitacionId]
      )
      
      if (numeroCheck.rows.length > 0) {
        return NextResponse.json(
          { success: false, message: 'Ya existe otra habitación con ese número' },
          { status: 400 }
        )
      }
    }
    
    // Si se cambia el tipo de habitación, verificar que existe
    if (body.tipo_habitacion_id) {
      const tipoCheck = await pool.query(
        'SELECT id FROM tipos_habitacion WHERE id = $1',
        [body.tipo_habitacion_id]
      )
      
      if (tipoCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'El tipo de habitación no existe' },
          { status: 400 }
        )
      }
    }
    
    // Ejecutar la actualización
    valores.push(habitacionId) // Para el WHERE
    const updateQuery = `
      UPDATE habitaciones 
      SET ${camposActualizar.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $${contador}
      RETURNING *
    `
    
    const result = await pool.query(updateQuery, valores)
    
    return NextResponse.json({
      success: true,
      message: 'Habitación actualizada exitosamente',
      data: result.rows[0]
    })
    
  } catch (error) {
    console.error('Error actualizando habitación:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error al actualizar habitación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar habitación
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const pool = getDbPool()
    const { id } = await params
    const habitacionId = id
    
    // Verificar que la habitación existe y no tiene reservas activas
    const checkQuery = `
      SELECT 
        h.id, 
        h.numero, 
        h.estado,
        COUNT(rh.id) as reservas_activas
      FROM habitaciones h
      LEFT JOIN reserva_habitaciones rh ON h.id = rh.habitacion_id 
      LEFT JOIN reservas r ON rh.reserva_id = r.id
        AND r.estado IN ('pendiente', 'confirmada')
      WHERE h.id = $1
      GROUP BY h.id, h.numero, h.estado
    `
    
    const checkResult = await pool.query(checkQuery, [habitacionId])
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Habitación no encontrada' },
        { status: 404 }
      )
    }
    
    const habitacion = checkResult.rows[0]
    
    if (parseInt(habitacion.reservas_activas) > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No se puede eliminar la habitación porque tiene reservas activas' 
        },
        { status: 400 }
      )
    }
    
    if (habitacion.estado === 'ocupada' || habitacion.estado === 'separada') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No se puede eliminar una habitación ocupada o separada' 
        },
        { status: 400 }
      )
    }
    
    // Eliminar la habitación
    await pool.query('DELETE FROM habitaciones WHERE id = $1', [habitacionId])
    
    return NextResponse.json({
      success: true,
      message: `Habitación ${habitacion.numero} eliminada exitosamente`
    })
    
  } catch (error) {
    console.error('Error eliminando habitación:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error al eliminar habitación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
} 