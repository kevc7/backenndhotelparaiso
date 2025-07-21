import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET - Obtener comprobante específico
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pool = getDbPool();
    const comprobanteId = params.id;

    const result = await pool.query(`
      SELECT 
        cp.*,
        r.codigo_reserva,
        r.fecha_entrada,
        r.fecha_salida,
        r.total_estimado,
        c.nombre as cliente_nombre,
        c.apellido as cliente_apellido,
        c.email as cliente_email,
        c.telefono as cliente_telefono
      FROM comprobantes_pago cp
      LEFT JOIN reservas r ON cp.reserva_id = r.id
      LEFT JOIN clientes c ON r.cliente_id = c.id
      WHERE cp.id = $1
    `, [comprobanteId]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Comprobante no encontrado'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error obteniendo comprobante:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al obtener comprobante',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PUT - Revisar comprobante (aprobar/rechazar)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const comprobanteId = params.id;
    let { estado, observaciones } = body;
    if (typeof estado === 'string') estado = estado.toLowerCase().trim();
    if (!estado || !['pendiente', 'confirmado', 'rechazado'].includes(estado)) {
      return NextResponse.json({
        success: false,
        message: 'estado debe ser "pendiente", "confirmado" o "rechazado"'
      }, { status: 400 });
    }

    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar que el comprobante existe
      const comprobanteCheck = await client.query(`
        SELECT cp.*, r.estado as reserva_estado 
        FROM comprobantes_pago cp
        LEFT JOIN reservas r ON cp.reserva_id = r.id
        WHERE cp.id = $1
      `, [comprobanteId]);

      if (comprobanteCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Comprobante no encontrado'
        }, { status: 404 });
      }

      const comprobante = comprobanteCheck.rows[0];

      // Actualizar comprobante
      const result = await client.query(`
        UPDATE comprobantes_pago 
        SET estado = $1, observaciones = $2, fecha_actualizacion = NOW()
        WHERE id = $3
        RETURNING *
      `, [estado, observaciones || null, comprobanteId]);

      // Si se aprueba el comprobante, confirmar la reserva
      let debeGenerarFactura = false;
      if (estado === 'confirmado' && comprobante.reserva_estado === 'pendiente') {
        await client.query(`
          UPDATE reservas 
          SET estado = 'confirmada', fecha_actualizacion = NOW()
          WHERE id = $1
        `, [comprobante.reserva_id]);

        // Cambiar estado de habitaciones a ocupada
        await client.query(`
          UPDATE habitaciones 
          SET estado = 'ocupada', fecha_actualizacion = NOW()
          WHERE id IN (
            SELECT habitacion_id 
            FROM reserva_habitaciones 
            WHERE reserva_id = $1
          )
        `, [comprobante.reserva_id]);
        debeGenerarFactura = true;
      }

      // Si se rechaza el comprobante, cancelar la reserva
      if (estado === 'rechazado' && comprobante.reserva_estado === 'pendiente') {
        await client.query(`
          UPDATE reservas 
          SET estado = 'cancelada', fecha_actualizacion = NOW()
          WHERE id = $1
        `, [comprobante.reserva_id]);

        // Liberar habitaciones
        await client.query(`
          UPDATE habitaciones 
          SET estado = 'libre', fecha_actualizacion = NOW()
          WHERE id IN (
            SELECT habitacion_id 
            FROM reserva_habitaciones 
            WHERE reserva_id = $1
          )
        `, [comprobante.reserva_id]);
      }

      await client.query('COMMIT');

      // Generar factura automáticamente solo si corresponde
      let facturaUrl = null;
      if (debeGenerarFactura) {
        try {
          // Obtener el id del staff autenticado
          const session = await getServerSession(authOptions);
          const staff_id = session?.user?.id;
          if (!staff_id) {
            throw new Error('No se pudo obtener el id del staff autenticado');
          }
          console.log('Llamando a /api/facturas para reserva', comprobante.reserva_id, 'con staff_id', staff_id);
          const facturaRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/facturas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-call': 'true' },
            body: JSON.stringify({ reserva_id: comprobante.reserva_id, staff_id })
          });
          const facturaData = await facturaRes.json();
          console.log('Respuesta de /api/facturas:', facturaRes.status, facturaData);
          if (facturaRes.ok && facturaData.data && facturaData.data.pdfUrl) {
            facturaUrl = facturaData.data.pdfUrl;
          }
        } catch (e) {
          // Si falla la generación de factura, continuar pero loguear el error
          console.error('Error generando factura automática:', e);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Comprobante ${estado === 'confirmado' ? 'confirmado' : 'rechazado'} exitosamente`,
        data: {
          ...result.rows[0],
          facturaUrl
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error actualizando comprobante:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al actualizar comprobante',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 