import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';

// GET - Obtener reserva específica con detalles
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const pool = getDbPool();
    const { id } = await params;
    const reservaId = id;

    // Obtener reserva con información del cliente
    const reservaQuery = `
      SELECT 
        r.*,
        c.nombre as cliente_nombre,
        c.apellido as cliente_apellido,
        c.email as cliente_email,
        c.telefono as cliente_telefono,
        c.documento_identidad as cliente_documento
      FROM reservas r
      LEFT JOIN clientes c ON r.cliente_id = c.id
      WHERE r.id = $1
    `;

    const reservaResult = await pool.query(reservaQuery, [reservaId]);

    if (reservaResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Reserva no encontrada'
      }, { status: 404 });
    }

    const reserva = reservaResult.rows[0];

    // Obtener habitaciones asignadas
    const habitacionesQuery = `
      SELECT 
        rh.id,
        rh.precio_unitario,
        rh.noches,
        rh.subtotal,
        h.id as habitacion_id,
        h.numero,
        h.piso,
        h.estado,
        th.nombre as tipo_nombre,
        th.descripcion as tipo_descripcion,
        th.capacidad_maxima,
        th.servicios
      FROM reserva_habitaciones rh
      JOIN habitaciones h ON rh.habitacion_id = h.id
      JOIN tipos_habitacion th ON h.tipo_habitacion_id = th.id
      WHERE rh.reserva_id = $1
    `;

    const habitacionesResult = await pool.query(habitacionesQuery, [reservaId]);

    // Obtener comprobantes de pago
    const comprobantesQuery = `
      SELECT *
      FROM comprobantes_pago
      WHERE reserva_id = $1
      ORDER BY fecha_creacion DESC
    `;

    const comprobantesResult = await pool.query(comprobantesQuery, [reservaId]);

    return NextResponse.json({
      success: true,
      data: {
        ...reserva,
        habitaciones: habitacionesResult.rows,
        comprobantes: comprobantesResult.rows
      }
    });

  } catch (error) {
    console.error('Error obteniendo reserva:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al obtener reserva',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PUT - Actualizar reserva
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const { id } = await params;
    const reservaId = id;
    const { estado, observaciones, fecha_checkin, fecha_checkout } = body;

    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar que la reserva existe
      const reservaCheck = await client.query('SELECT estado FROM reservas WHERE id = $1', [reservaId]);
      if (reservaCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Reserva no encontrada'
        }, { status: 404 });
      }

      const estadoActual = reservaCheck.rows[0].estado;

      // Validar transiciones de estado
      const transicionesValidas: Record<string, string[]> = {
        'pendiente': ['confirmada', 'cancelada'],
        'confirmada': ['cancelada'], // Solo se puede cancelar
        'cancelada': [] // No se puede cambiar
      };

      if (estado && !transicionesValidas[estadoActual]?.includes(estado)) {
        return NextResponse.json({
          success: false,
          message: `No se puede cambiar de estado '${estadoActual}' a '${estado}'`
        }, { status: 400 });
      }

      // Construir query de actualización dinámicamente
      const camposActualizar = [];
      const valores = [];
      let contador = 1;

      if (estado !== undefined) {
        camposActualizar.push(`estado = $${contador}`);
        valores.push(estado);
        contador++;
      }

      if (fecha_checkin !== undefined) {
        camposActualizar.push(`fecha_entrada = $${contador}`);
        valores.push(fecha_checkin);
        contador++;
      }

      if (fecha_checkout !== undefined) {
        camposActualizar.push(`fecha_salida = $${contador}`);
        valores.push(fecha_checkout);
        contador++;
      }

      if (camposActualizar.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No se proporcionaron campos para actualizar'
        }, { status: 400 });
      }

      // Agregar fecha de actualización y ID
      camposActualizar.push(`fecha_actualizacion = NOW()`);
      valores.push(reservaId);

      const updateQuery = `
        UPDATE reservas 
        SET ${camposActualizar.join(', ')}
        WHERE id = $${contador}
        RETURNING *
      `;

      const result = await client.query(updateQuery, valores);
      const reservaActualizada = result.rows[0];

      // Si se cambió el estado, actualizar habitaciones
      if (estado && estado !== estadoActual) {
        if (estado === 'confirmada' && estadoActual === 'pendiente') {
          // Cambiar habitaciones de 'separada' a 'ocupada'
          await client.query(`
            UPDATE habitaciones 
            SET estado = 'ocupada', fecha_actualizacion = NOW()
            WHERE id IN (
              SELECT habitacion_id 
              FROM reserva_habitaciones 
              WHERE reserva_id = $1
            )
          `, [reservaId]);

          // ✅ GENERAR FACTURA AUTOMÁTICAMENTE
          try {
            console.log('🧾 Generando factura automáticamente para reserva:', reservaId);
            
            // Llamada interna al endpoint de facturas
            const facturaResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/facturas`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-call': 'true'
              },
              body: JSON.stringify({
                reserva_id: reservaId,
                staff_id: 1 // ID del staff por defecto, puedes cambiarlo según necesites
              })
            });

            if (facturaResponse.ok) {
              const facturaData = await facturaResponse.json();
              console.log('✅ Factura generada exitosamente:', facturaData.data?.codigo_factura);
            } else {
              console.error('❌ Error generando factura:', await facturaResponse.text());
            }
          } catch (facturaError) {
            console.error('❌ Error en llamada de factura:', facturaError);
            // No fallar la confirmación de reserva por error de factura
          }

        } else if (estado === 'cancelada') {
          // Liberar habitaciones
          await client.query(`
            UPDATE habitaciones 
            SET estado = 'libre', fecha_actualizacion = NOW()
            WHERE id IN (
              SELECT habitacion_id 
              FROM reserva_habitaciones 
              WHERE reserva_id = $1
            )
          `, [reservaId]);
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Reserva actualizada exitosamente',
        data: reservaActualizada
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error actualizando reserva:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al actualizar reserva',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// DELETE - Cancelar reserva
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const reservaId = id;
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar que la reserva existe y no está cancelada
      const reservaCheck = await client.query('SELECT estado FROM reservas WHERE id = $1', [reservaId]);
      if (reservaCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Reserva no encontrada'
        }, { status: 404 });
      }

      if (reservaCheck.rows[0].estado === 'cancelada') {
        return NextResponse.json({
          success: false,
          message: 'La reserva ya está cancelada'
        }, { status: 400 });
      }

      // Cambiar estado a cancelada
      await client.query(`
        UPDATE reservas 
        SET estado = 'cancelada', fecha_actualizacion = NOW()
        WHERE id = $1
      `, [reservaId]);

      // Liberar habitaciones
      await client.query(`
        UPDATE habitaciones 
        SET estado = 'libre', fecha_actualizacion = NOW()
        WHERE id IN (
          SELECT habitacion_id 
          FROM reserva_habitaciones 
          WHERE reserva_id = $1
        )
      `, [reservaId]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Reserva cancelada exitosamente'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error cancelando reserva:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al cancelar reserva',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 