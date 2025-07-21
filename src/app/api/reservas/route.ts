import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';

// GET - Listar todas las reservas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const clienteId = searchParams.get('cliente_id');
    const fechaDesde = searchParams.get('fecha_desde');
    const fechaHasta = searchParams.get('fecha_hasta');

    const pool = getDbPool();
    
    let query = `
      SELECT 
        r.id,
        r.codigo_reserva,
        r.fecha_entrada,
        r.fecha_salida,
        r.estado,
        r.precio_total,
        r.numero_huespedes,
        r.fecha_creacion,
        c.id as cliente_id,
        c.nombre as cliente_nombre,
        c.apellido as cliente_apellido,
        c.email as cliente_email,
        c.telefono as cliente_telefono,
        COUNT(rh.id) as total_habitaciones
      FROM reservas r
      LEFT JOIN clientes c ON r.cliente_id = c.id
      LEFT JOIN reserva_habitaciones rh ON r.id = rh.reserva_id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (estado) {
      conditions.push(`r.estado = $${paramIndex}`);
      params.push(estado);
      paramIndex++;
    }

    if (clienteId) {
      conditions.push(`r.cliente_id = $${paramIndex}`);
      params.push(clienteId);
      paramIndex++;
    }

    if (fechaDesde) {
      conditions.push(`r.fecha_entrada >= $${paramIndex}`);
      params.push(fechaDesde);
      paramIndex++;
    }

    if (fechaHasta) {
      conditions.push(`r.fecha_salida <= $${paramIndex}`);
      params.push(fechaHasta);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY r.id, c.id ORDER BY r.fecha_creacion DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error obteniendo reservas:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al obtener reservas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// POST - Crear nueva reserva
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      cliente_id, 
      fecha_entrada, 
      fecha_salida, 
      numero_huespedes,
      habitaciones, 
      observaciones 
    } = body;

    if (!cliente_id || !fecha_entrada || !fecha_salida || !numero_huespedes || !habitaciones || habitaciones.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Faltan campos requeridos: cliente_id, fecha_entrada, fecha_salida, numero_huespedes, habitaciones'
      }, { status: 400 });
    }

    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Obtener el usuario logueado desde la sesión/token
      const token = request.cookies.get('next-auth.session-token') || request.cookies.get('__Secure-next-auth.session-token');
      let usuarioId = null;
      if (token) {
        // Decodificar el token JWT para obtener el id del usuario
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(token.value, { complete: true });
          usuarioId = decoded?.payload?.id;
        } catch (e) {}
      }
      // Validar que el cliente_id corresponde al usuario logueado
      if (usuarioId) {
        const clienteCheck = await pool.query('SELECT id FROM clientes WHERE id = $1 AND usuario_id = $2', [cliente_id, usuarioId]);
        if (clienteCheck.rows.length === 0) {
          return NextResponse.json({
            success: false,
            message: 'No tienes permiso para reservar con este cliente_id.'
          }, { status: 403 });
        }
      }

      // Generar código de reserva único
      const codigoReserva = `RES-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Verificar que el cliente existe
      const clienteCheck = await client.query('SELECT id FROM clientes WHERE id = $1', [cliente_id]);
      if (clienteCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Cliente no encontrado'
        }, { status: 404 });
      }

      // Verificar disponibilidad de habitaciones
      for (const habitacionId of habitaciones) {
        const disponibilidadCheck = await client.query(`
          SELECT h.id, h.estado
          FROM habitaciones h
          WHERE h.id = $1
            AND h.estado = 'libre'
            AND NOT EXISTS (
              SELECT 1 FROM reserva_habitaciones rh
              INNER JOIN reservas r ON rh.reserva_id = r.id
              WHERE rh.habitacion_id = h.id
                AND r.estado IN ('confirmada', 'pendiente')
                AND (
                  (r.fecha_entrada <= $2 AND r.fecha_salida > $2)
                  OR (r.fecha_entrada < $3 AND r.fecha_salida >= $3)
                  OR (r.fecha_entrada >= $2 AND r.fecha_salida <= $3)
                )
            )
        `, [habitacionId, fecha_entrada, fecha_salida]);

        if (disponibilidadCheck.rows.length === 0) {
          return NextResponse.json({
            success: false,
            message: `Habitación ${habitacionId} no está disponible para las fechas seleccionadas`
          }, { status: 400 });
        }
      }

      // Calcular total estimado
      let totalEstimado = 0;
      for (const habitacionId of habitaciones) {
        const precioQuery = await client.query(`
          SELECT th.precio_base
          FROM habitaciones h
          JOIN tipos_habitacion th ON h.tipo_habitacion_id = th.id
          WHERE h.id = $1
        `, [habitacionId]);
        
        const precioNoche = parseFloat(precioQuery.rows[0]?.precio_base || 0);
        const dias = Math.ceil((new Date(fecha_salida).getTime() - new Date(fecha_entrada).getTime()) / (1000 * 60 * 60 * 24));
        totalEstimado += precioNoche * dias;
      }

      // Crear la reserva
      const reservaResult = await client.query(`
        INSERT INTO reservas (cliente_id, fecha_entrada, fecha_salida, numero_huespedes, estado, precio_total, fecha_creacion)
        VALUES ($1, $2, $3, $4, 'pendiente', $5, NOW())
        RETURNING *
      `, [cliente_id, fecha_entrada, fecha_salida, numero_huespedes, totalEstimado]);

      const reserva = reservaResult.rows[0];

      // Asignar habitaciones a la reserva
      for (const habitacionId of habitaciones) {
        const precioQuery = await client.query(`
          SELECT th.precio_base
          FROM habitaciones h
          JOIN tipos_habitacion th ON h.tipo_habitacion_id = th.id
          WHERE h.id = $1
        `, [habitacionId]);
        const precioNoche = parseFloat(precioQuery.rows[0]?.precio_base || 0);
        const noches = Math.ceil((new Date(fecha_salida).getTime() - new Date(fecha_entrada).getTime()) / (1000 * 60 * 60 * 24));
        const subtotal = precioNoche * noches;
        await client.query(`
          INSERT INTO reserva_habitaciones (reserva_id, habitacion_id, precio_unitario, noches, subtotal)
          VALUES ($1, $2, $3, $4, $5)
        `, [reserva.id, habitacionId, precioNoche, noches, subtotal]);
        // Quitar: Cambiar estado de la habitación a separada
        // await client.query(`
        //   UPDATE habitaciones SET estado = 'separada', fecha_actualizacion = NOW()
        //   WHERE id = $1
        // `, [habitacionId]);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Reserva creada exitosamente',
        data: {
          ...reserva,
          habitaciones_asignadas: habitaciones.length
        }
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creando reserva:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al crear reserva',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 