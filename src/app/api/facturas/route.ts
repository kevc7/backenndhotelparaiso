import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';
import { generarFacturaPDF, generarNumeroFactura, calcularImpuestos } from '@/lib/pdf-generator';
import { uploadToDrive, getSubFolder } from '@/lib/google-drive';

// GET - Listar facturas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reservaId = searchParams.get('reserva_id');
    const estado = searchParams.get('estado');

    const pool = getDbPool();
    
    let query = `
      SELECT 
        fc.*,
        r.codigo_reserva,
        r.fecha_entrada,
        r.fecha_salida,
        c.nombre as cliente_nombre,
        c.apellido as cliente_apellido,
        c.email as cliente_email
      FROM facturas_cabecera fc
      LEFT JOIN reservas r ON fc.reserva_id = r.id
      LEFT JOIN clientes c ON r.cliente_id = c.id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (reservaId) {
      conditions.push(`fc.reserva_id = $${paramIndex}`);
      params.push(reservaId);
      paramIndex++;
    }

    if (estado) {
      conditions.push(`fc.estado = $${paramIndex}`);
      params.push(estado);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY fc.fecha_emision DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error obteniendo facturas:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al obtener facturas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// POST - Generar nueva factura
export async function POST(request: NextRequest) {
  // Permitir llamadas internas sin autenticación
  const isInternal = request.headers.get('x-internal-call') === 'true';
  if (!isInternal) {
    // Aquí iría la lógica de autenticación normal, por ejemplo:
    // const session = await getServerSession(authOptions);
    // if (!session || session.user.rol !== 'admin') {
    //   return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    // }
  }
  try {
    const body = await request.json();
    const { reserva_id, staff_id } = body;

    if (!reserva_id || !staff_id) {
      return NextResponse.json({
        success: false,
        message: 'reserva_id y staff_id son requeridos'
      }, { status: 400 });
    }

    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar que el staff existe
      const staffCheck = await client.query('SELECT id, nombre, apellido FROM usuarios WHERE id = $1', [staff_id]);
      if (staffCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'El usuario staff no existe'
        }, { status: 404 });
      }
      const staffNombre = staffCheck.rows[0].nombre + ' ' + staffCheck.rows[0].apellido;

      // Verificar que la reserva existe y está confirmada
      const reservaQuery = `
        SELECT 
          r.*,
          c.nombre, c.apellido, c.email, c.telefono, c.documento_identidad
        FROM reservas r
        LEFT JOIN clientes c ON r.cliente_id = c.id
        WHERE r.id = $1 AND r.estado = 'confirmada'
      `;

      const reservaResult = await client.query(reservaQuery, [reserva_id]);
      if (reservaResult.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Reserva no encontrada o no está confirmada'
        }, { status: 404 });
      }

      const reserva = reservaResult.rows[0];

      // Verificar que no existe factura para esta reserva
      const facturaExistente = await client.query(
        'SELECT id FROM facturas_cabecera WHERE reserva_id = $1',
        [reserva_id]
      );

      if (facturaExistente.rows.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'Ya existe una factura para esta reserva'
        }, { status: 400 });
      }

      // Obtener habitaciones de la reserva
      const habitacionesQuery = `
        SELECT 
          rh.precio_unitario,
          rh.noches,
          rh.subtotal,
          h.numero,
          th.nombre as tipo_nombre,
          th.descripcion as tipo_descripcion
        FROM reserva_habitaciones rh
        JOIN habitaciones h ON rh.habitacion_id = h.id
        JOIN tipos_habitacion th ON h.tipo_habitacion_id = th.id
        WHERE rh.reserva_id = $1
      `;

      const habitacionesResult = await client.query(habitacionesQuery, [reserva_id]);
      const habitaciones = habitacionesResult.rows;

      // Preparar datos para el PDF
      const habitacionesPDF = habitaciones.map(hab => ({
        numero: hab.numero,
        tipo: hab.tipo_nombre,
        precioNoche: parseFloat(hab.precio_unitario),
        dias: hab.noches,
        subtotal: parseFloat(hab.subtotal)
      }));

      const subtotal = habitacionesPDF.reduce((sum, hab) => sum + hab.subtotal, 0);
      const impuestos = calcularImpuestos(subtotal);
      const total = subtotal + impuestos;

      const facturaData = {
        numeroFactura: generarNumeroFactura(),
        fechaEmision: new Date().toISOString().split('T')[0],
        cliente: {
          nombre: reserva.nombre,
          apellido: reserva.apellido,
          email: reserva.email,
          telefono: reserva.telefono,
          documento: reserva.documento_identidad
        },
        reserva: {
          codigo: reserva.codigo_reserva,
          fechaCheckin: reserva.fecha_entrada,
          fechaCheckout: reserva.fecha_salida,
          total: total
        },
        habitaciones: habitacionesPDF,
        subtotal: subtotal,
        impuestos: impuestos,
        total: total,
        staffNombre // nuevo campo
      };

      // Generar PDF
      const pdfBuffer = await generarFacturaPDF(facturaData);

      // Subir PDF a Google Drive
      const fileName = `factura_${facturaData.numeroFactura}.pdf`;
      const folderId = await getSubFolder('Facturas');
      
      const uploadResult = await uploadToDrive(
        fileName,
        pdfBuffer,
        'application/pdf',
        folderId
      );

      // Crear factura en la base de datos
      const facturaResult = await client.query(`
        INSERT INTO facturas_cabecera (
          codigo_factura,
          reserva_id,
          cliente_id,
          subtotal,
          impuestos,
          total,
          estado,
          creado_por
        ) VALUES ($1, $2, $3, $4, $5, $6, 'activa', $7)
        RETURNING *
      `, [
        facturaData.numeroFactura,
        reserva_id,
        reserva.cliente_id,
        subtotal,
        impuestos,
        total,
        staff_id
      ]);

      // Crear líneas de factura
      for (const habitacion of habitacionesPDF) {
        await client.query(`
          INSERT INTO facturas_lineas (
            factura_id,
            descripcion,
            cantidad,
            precio_unitario,
            subtotal
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          facturaResult.rows[0].id,
          `Habitación ${habitacion.numero} - ${habitacion.tipo}`,
          habitacion.dias,
          habitacion.precioNoche,
          habitacion.subtotal
        ]);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Factura generada exitosamente',
        data: {
          ...facturaResult.rows[0],
          pdfUrl: uploadResult.webViewLink,
          downloadUrl: uploadResult.downloadLink
        }
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error generando factura:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al generar factura',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}