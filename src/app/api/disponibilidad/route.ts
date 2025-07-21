import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaCheckin = searchParams.get('fecha_checkin');
    const fechaCheckout = searchParams.get('fecha_checkout');
    const tipoHabitacionId = searchParams.get('tipo_habitacion_id');

    if (!fechaCheckin || !fechaCheckout) {
      // Si no hay fechas, devolver todas las habitaciones libres
      const client = getDbPool();
      const result = await client.query(`
        SELECT h.id, h.numero, h.piso, h.estado, th.precio_base, th.descripcion, th.id as tipo_id, th.nombre as tipo_nombre, th.capacidad_maxima, th.servicios
        FROM habitaciones h
        INNER JOIN tipos_habitacion th ON h.tipo_habitacion_id = th.id
        WHERE h.estado = 'libre'
        ORDER BY h.numero
      `);
      return NextResponse.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
        filtros: {
          fecha_checkin: null,
          fecha_checkout: null,
          tipo_habitacion_id: tipoHabitacionId
        }
      });
    }

    const client = getDbPool();

    // Query para obtener habitaciones disponibles
    let query = `
      SELECT DISTINCT 
        h.id,
        h.numero,
        h.piso,
        h.estado,
        th.precio_base,
        th.descripcion,
        th.id as tipo_id,
        th.nombre as tipo_nombre,
        th.capacidad_maxima,
        th.servicios
      FROM habitaciones h
      INNER JOIN tipos_habitacion th ON h.tipo_habitacion_id = th.id
      WHERE h.estado = 'libre'
        AND NOT EXISTS (
          SELECT 1 FROM reserva_habitaciones rh
          INNER JOIN reservas r ON rh.reserva_id = r.id
          WHERE rh.habitacion_id = h.id
            AND r.estado IN ('confirmada', 'pendiente')
            AND (
              (r.fecha_entrada <= $1 AND r.fecha_salida > $1)
              OR (r.fecha_entrada < $2 AND r.fecha_salida >= $2)
              OR (r.fecha_entrada >= $1 AND r.fecha_salida <= $2)
            )
        )
    `;

    const params: any[] = [fechaCheckin, fechaCheckout];

    if (tipoHabitacionId) {
      query += ' AND th.id = $3';
      params.push(tipoHabitacionId);
    }

    query += ' ORDER BY h.numero';

    const result = await client.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      filtros: {
        fecha_checkin: fechaCheckin,
        fecha_checkout: fechaCheckout,
        tipo_habitacion_id: tipoHabitacionId
      }
    });

  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 