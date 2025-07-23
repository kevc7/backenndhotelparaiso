import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/database";
import { generarFacturaPDF, generarNumeroFactura, calcularImpuestos } from '@/lib/pdf-generator';
import { uploadToDrive, getSubFolder } from '@/lib/google-drive';

// Función para generar factura directamente
async function generarFacturaInterna(reservaId: number, staffId: number = 1, existingClient?: any) {
  console.log('🧾 INICIANDO generación de factura interna...');
  console.log('📋 Parámetros:', { reservaId, staffId });
  
  try {
    const pool = getDbPool();
    const client = existingClient || await pool.connect();

    try {
      if (!existingClient) {
        await client.query('BEGIN');
      }
      console.log('🔄 Transacción iniciada para factura');

      // Verificar que el staff existe
      console.log('👤 Verificando staff...');
      const staffCheck = await client.query('SELECT id, nombre, apellido FROM usuarios WHERE id = $1', [staffId]);
      if (staffCheck.rows.length === 0) {
        throw new Error('El usuario staff no existe');
      }
      const staffNombre = staffCheck.rows[0].nombre + ' ' + staffCheck.rows[0].apellido;
      console.log('✅ Staff encontrado:', staffNombre);

      // Verificar que la reserva existe
      console.log('🏨 Verificando reserva...');
      const reservaQuery = `
        SELECT 
          r.*,
          c.nombre, c.apellido, c.email, c.telefono, c.documento_identidad
        FROM reservas r
        LEFT JOIN clientes c ON r.cliente_id = c.id
        WHERE r.id = $1
      `;

      const reservaResult = await client.query(reservaQuery, [reservaId]);
      if (reservaResult.rows.length === 0) {
        throw new Error('Reserva no encontrada');
      }
      const reserva = reservaResult.rows[0];
      console.log('✅ Reserva encontrada:', reserva.codigo_reserva, 'Estado:', reserva.estado);

      // Verificar que la reserva está confirmada
      if (reserva.estado !== 'confirmada') {
        throw new Error(`Reserva en estado '${reserva.estado}', debe estar confirmada`);
      }

      // Verificar que no existe factura para esta reserva
      console.log('🔍 Verificando facturas existentes...');
      const facturaExistente = await client.query(
        'SELECT id FROM facturas_cabecera WHERE reserva_id = $1',
        [reservaId]
      );

      if (facturaExistente.rows.length > 0) {
        console.log('⚠️ Ya existe una factura para esta reserva');
        return { success: false, message: 'Ya existe una factura para esta reserva' };
      }

      // Obtener habitaciones de la reserva
      console.log('🏠 Obteniendo habitaciones...');
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

      const habitacionesResult = await client.query(habitacionesQuery, [reservaId]);
      const habitaciones = habitacionesResult.rows;
      console.log('✅ Habitaciones encontradas:', habitaciones.length);

      // Calcular totales
      const subtotal = habitaciones.reduce((sum: number, hab: any) => sum + parseFloat(hab.subtotal), 0);
      const impuestos = subtotal * 0.19; // 19% IVA
      const total = subtotal + impuestos;

      console.log('💰 Totales calculados:', { subtotal, impuestos, total });

      // Generar número de factura
      const fecha = new Date();
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      const timestamp = Date.now().toString().slice(-4);
      const numeroFactura = `FAC-${año}${mes}${dia}-${timestamp}`;

      console.log('📄 Número de factura generado:', numeroFactura);

      // Crear factura en la base de datos (SIN PDF por ahora)
      console.log('💾 Creando factura en base de datos...');
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
        numeroFactura,
        reservaId,
        reserva.cliente_id,
        subtotal,
        impuestos,
        total,
        staffId
      ]);

      console.log('✅ Factura creada en BD:', facturaResult.rows[0].id);

      // Crear líneas de factura
      console.log('📝 Creando líneas de factura...');
      for (const habitacion of habitaciones) {
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
          `Habitación ${habitacion.numero} - ${habitacion.tipo_nombre}`,
          habitacion.noches,
          habitacion.precio_unitario,
          habitacion.subtotal
        ]);
      }

      console.log('✅ Líneas de factura creadas');

      // 🔄 GENERAR PDF Y SUBIR A GOOGLE DRIVE
      console.log('📄 Generando PDF de la factura...');
      try {
        // Preparar datos para el PDF
        const habitacionesPDF = habitaciones.map((hab: any) => ({
          numero: hab.numero,
          tipo: hab.tipo_nombre,
          precioNoche: parseFloat(hab.precio_unitario),
          dias: hab.noches,
          subtotal: parseFloat(hab.subtotal)
        }));

        const facturaData = {
          numeroFactura: numeroFactura,
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
          staffNombre: staffNombre
        };

        // Generar PDF
        console.log('🔄 Generando PDF...');
        const pdfBuffer = await generarFacturaPDF(facturaData);
        console.log('✅ PDF generado, tamaño:', pdfBuffer.length, 'bytes');

        // Subir PDF a Google Drive
        const fileName = `factura_${numeroFactura}.pdf`;
        console.log('☁️ Subiendo a Google Drive:', fileName);
        const folderId = await getSubFolder('Facturas');
        
        const uploadResult = await uploadToDrive(
          fileName,
          pdfBuffer,
          'application/pdf',
          folderId
        );

        console.log('✅ PDF subido exitosamente a Drive:', uploadResult.webViewLink);

        // Actualizar factura con URL del PDF
        await client.query(`
          UPDATE facturas_cabecera 
          SET url_pdf = $1 
          WHERE id = $2
        `, [uploadResult.webViewLink, facturaResult.rows[0].id]);

        console.log('✅ URL de PDF actualizada en BD');

      } catch (pdfError) {
        console.error('❌ Error generando/subiendo PDF:', pdfError);
        // No fallar la factura por error de PDF, pero loguearlo
      }

      if (!existingClient) {
        await client.query('COMMIT');
      }
      console.log('🎉 Factura completa generada exitosamente con PDF en Drive');

      return {
        success: true,
        message: 'Factura generada exitosamente',
        data: facturaResult.rows[0]
      };

    } catch (error) {
      if (!existingClient) {
        await client.query('ROLLBACK');
      }
      throw error;
    } finally {
      if (!existingClient) {
        client.release();
      }
    }

  } catch (error) {
    console.error('❌ Error generando factura interna:', error);
    return { 
      success: false, 
      message: 'Error al generar factura', 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

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
          console.log('🧾 Iniciando generación automática de factura para reserva:', reservaId);
          const facturaResult = await generarFacturaInterna(parseInt(reservaId), 1, client);
          
          if (facturaResult.success) {
            console.log('✅ Factura generada exitosamente:', facturaResult.data?.codigo_factura);
          } else {
            console.error('❌ Error generando factura:', facturaResult.message);
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
      console.log('✅ Reserva actualizada y transacción confirmada');

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