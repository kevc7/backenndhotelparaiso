import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';

// GET - Obtener factura específica con detalles
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pool = getDbPool();
    const facturaId = params.id;

    // Obtener factura con información completa
    const facturaQuery = `
      SELECT 
        fc.*,
        r.codigo_reserva,
        r.fecha_checkin,
        r.fecha_checkout,
        r.total_estimado,
        c.nombre as cliente_nombre,
        c.apellido as cliente_apellido,
        c.email as cliente_email,
        c.telefono as cliente_telefono,
        c.documento_identidad as cliente_documento
      FROM facturas_cabecera fc
      LEFT JOIN reservas r ON fc.reserva_id = r.id
      LEFT JOIN clientes c ON r.cliente_id = c.id
      WHERE fc.id = $1
    `;

    const facturaResult = await pool.query(facturaQuery, [facturaId]);

    if (facturaResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Factura no encontrada'
      }, { status: 404 });
    }

    const factura = facturaResult.rows[0];

    // Obtener líneas de factura
    const lineasQuery = `
      SELECT *
      FROM facturas_lineas
      WHERE factura_id = $1
      ORDER BY id
    `;

    const lineasResult = await pool.query(lineasQuery, [facturaId]);

    return NextResponse.json({
      success: true,
      data: {
        ...factura,
        lineas: lineasResult.rows
      }
    });

  } catch (error) {
    console.error('Error obteniendo factura:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al obtener factura',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PUT - Actualizar estado de factura
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const facturaId = params.id;
    const { estado } = body;

    if (!estado || !['borrador', 'emitida', 'pagada', 'anulada'].includes(estado)) {
      return NextResponse.json({
        success: false,
        message: 'Estado debe ser: borrador, emitida, pagada, anulada'
      }, { status: 400 });
    }

    const pool = getDbPool();

    // Verificar que la factura existe
    const facturaCheck = await pool.query('SELECT id FROM facturas_cabecera WHERE id = $1', [facturaId]);
    if (facturaCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Factura no encontrada'
      }, { status: 404 });
    }

    // Actualizar estado
    const result = await pool.query(`
      UPDATE facturas_cabecera 
      SET estado = $1, fecha_actualizacion = NOW()
      WHERE id = $2
      RETURNING *
    `, [estado, facturaId]);

    return NextResponse.json({
      success: true,
      message: 'Estado de factura actualizado exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando factura:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al actualizar factura',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// DELETE - Anular factura
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const facturaId = params.id;
    const pool = getDbPool();

    // Verificar que la factura existe
    const facturaCheck = await pool.query('SELECT estado FROM facturas_cabecera WHERE id = $1', [facturaId]);
    if (facturaCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Factura no encontrada'
      }, { status: 404 });
    }

    if (facturaCheck.rows[0].estado === 'anulada') {
      return NextResponse.json({
        success: false,
        message: 'La factura ya está anulada'
      }, { status: 400 });
    }

    // Cambiar estado a anulada
    await pool.query(`
      UPDATE facturas_cabecera 
      SET estado = 'anulada', fecha_actualizacion = NOW()
      WHERE id = $1
    `, [facturaId]);

    return NextResponse.json({
      success: true,
      message: 'Factura anulada exitosamente'
    });

  } catch (error) {
    console.error('Error anulando factura:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al anular factura',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 