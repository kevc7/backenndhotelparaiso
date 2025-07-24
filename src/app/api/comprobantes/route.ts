import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';
import { uploadToDrive, getSubFolder } from '@/lib/google-drive';
import { enviarEmailComprobanteResend } from '@/lib/email-service-resend';

// GET - Listar comprobantes de pago
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reservaId = searchParams.get('reserva_id');
    const estado = searchParams.get('estado');

    const pool = getDbPool();
    
    let query = `
      SELECT 
        cp.*,
        r.codigo_reserva,
        c.nombre as cliente_nombre,
        c.apellido as cliente_apellido
      FROM comprobantes_pago cp
      LEFT JOIN reservas r ON cp.reserva_id = r.id
      LEFT JOIN clientes c ON r.cliente_id = c.id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (reservaId) {
      conditions.push(`cp.reserva_id = $${paramIndex}`);
      params.push(reservaId);
      paramIndex++;
    }

    if (estado) {
      conditions.push(`cp.estado = $${paramIndex}`);
      params.push(estado);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY cp.fecha_creacion DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error obteniendo comprobantes:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al obtener comprobantes',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// POST - Crear nuevo comprobante de pago
export async function POST(request: NextRequest) {
  console.log('📄 INICIO - Creación de comprobante de pago');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const reservaId = formData.get('reserva_id') as string;
    const metodoPago = formData.get('tipo_comprobante') as string;
    const monto = formData.get('monto') as string;
    const fechaPago = formData.get('fecha_pago') as string;
    const observaciones = formData.get('observaciones') as string;

    console.log('📋 Datos recibidos:', {
      reservaId,
      metodoPago,
      monto,
      fechaPago,
      fileName: file?.name,
      fileSize: file?.size
    });

    if (!file || !reservaId || !metodoPago || !monto || !fechaPago) {
      console.log('❌ Faltan campos requeridos');
      return NextResponse.json({
        success: false,
        message: 'Faltan campos requeridos: file, reserva_id, metodo_pago, monto, fecha_pago'
      }, { status: 400 });
    }

    const pool = getDbPool();

    // Verificar que la reserva existe y obtener datos del cliente
    console.log('🔍 Verificando reserva:', reservaId);
    const reservaCheck = await pool.query(`
      SELECT 
        r.id, r.codigo_reserva, r.fecha_entrada, r.fecha_salida, r.precio_total,
        c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.email as cliente_email
      FROM reservas r
      LEFT JOIN clientes c ON r.cliente_id = c.id
      WHERE r.id = $1
    `, [reservaId]);
    
    if (reservaCheck.rows.length === 0) {
      console.log('❌ Reserva no encontrada');
      return NextResponse.json({
        success: false,
        message: 'Reserva no encontrada'
      }, { status: 404 });
    }

    const reserva = reservaCheck.rows[0];
    console.log('✅ Reserva encontrada:', {
      codigo: reserva.codigo_reserva,
      cliente: `${reserva.cliente_nombre} ${reserva.cliente_apellido}`,
      email: reserva.cliente_email
    });

    // Validar archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      console.log('❌ Tipo de archivo no permitido:', file.type);
      return NextResponse.json({
        success: false,
        message: 'Tipo de archivo no permitido. Solo se permiten: JPEG, PNG, JPG, PDF'
      }, { status: 400 });
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.log('❌ Archivo demasiado grande:', file.size, 'bytes');
      return NextResponse.json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 10MB'
      }, { status: 400 });
    }

    // Convertir archivo a buffer
    console.log('🔄 Convirtiendo archivo a buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('✅ Archivo convertido, tamaño:', buffer.length, 'bytes');

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `comprobante_${reservaId}_${timestamp}.${extension}`;
    console.log('📁 Nombre del archivo:', fileName);

    // Obtener carpeta de comprobantes
    console.log('📂 Obteniendo carpeta de comprobantes en Drive...');
    const folderId = await getSubFolder('Comprobantes de Pago');
    console.log('✅ Carpeta obtenida, ID:', folderId);

    // Subir archivo a Google Drive
    console.log('☁️ Subiendo archivo a Google Drive...');
    const uploadResult = await uploadToDrive(
      fileName,
      buffer,
      file.type,
      folderId
    );
    console.log('✅ Archivo subido exitosamente:', {
      fileId: uploadResult.fileId,
      webViewLink: uploadResult.webViewLink
    });

    // Crear comprobante en la base de datos
    console.log('💾 Guardando comprobante en base de datos...');
    const result = await pool.query(`
      INSERT INTO comprobantes_pago (
        reserva_id, 
        metodo_pago, 
        monto, 
        fecha_pago, 
        ruta_archivo, 
        estado, 
        observaciones, 
        fecha_creacion
      ) VALUES ($1, $2, $3, $4, $5, 'pendiente', $6, NOW())
      RETURNING *
    `, [reservaId, metodoPago, monto, fechaPago, uploadResult.webViewLink, observaciones || null]);

    const comprobante = result.rows[0];
    console.log('✅ Comprobante guardado en BD, ID:', comprobante.id);

    // Cambiar estado de las habitaciones asociadas a la reserva a 'separada'
    console.log('🏠 Actualizando estado de habitaciones a "separada"...');
    await pool.query(`
      UPDATE habitaciones SET estado = 'separada', fecha_actualizacion = NOW()
      WHERE id IN (
        SELECT habitacion_id FROM reserva_habitaciones WHERE reserva_id = $1
      )
    `, [reservaId]);
    console.log('✅ Habitaciones actualizadas');

    // 📧 ENVIAR EMAIL DE NOTIFICACIÓN
    console.log('📧 Iniciando envío de email de notificación...');
    try {
      const emailData = {
        clienteNombre: reserva.cliente_nombre,
        clienteApellido: reserva.cliente_apellido,
        clienteEmail: reserva.cliente_email,
        codigoReserva: reserva.codigo_reserva,
        fechaEntrada: reserva.fecha_entrada,
        fechaSalida: reserva.fecha_salida,
        metodoPago: metodoPago,
        monto: parseFloat(monto),
        fechaPago: fechaPago,
        observaciones: observaciones || '',
        fileName: fileName,
        driveLink: uploadResult.webViewLink
      };

      console.log('📧 Enviando email a:', emailData.clienteEmail);
      const emailResult = await enviarEmailComprobanteResend(emailData);
      
      if (emailResult.success) {
        console.log('✅ Email de comprobante enviado exitosamente:', emailResult.message);
      } else {
        console.error('❌ Error enviando email de comprobante:', emailResult.message);
        // No fallar la operación por el email, solo loguearlo
      }
    } catch (emailError) {
      console.error('❌ Error en proceso de email de comprobante:', emailError);
      // No fallar la operación por el email
    }

    console.log('🎉 Comprobante creado exitosamente con email enviado');

    return NextResponse.json({
      success: true,
      message: 'Comprobante de pago creado exitosamente',
      data: {
        ...comprobante,
        driveInfo: {
          fileId: uploadResult.fileId,
          webViewLink: uploadResult.webViewLink,
          downloadLink: uploadResult.downloadLink
        }
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creando comprobante:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al crear comprobante',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 