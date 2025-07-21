import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';
import { uploadToDrive, getSubFolder } from '@/lib/google-drive';

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
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const reservaId = formData.get('reserva_id') as string;
    const metodoPago = formData.get('tipo_comprobante') as string;
    const monto = formData.get('monto') as string;
    const fechaPago = formData.get('fecha_pago') as string;
    const observaciones = formData.get('observaciones') as string;

    if (!file || !reservaId || !metodoPago || !monto || !fechaPago) {
      return NextResponse.json({
        success: false,
        message: 'Faltan campos requeridos: file, reserva_id, metodo_pago, monto, fecha_pago'
      }, { status: 400 });
    }

    const pool = getDbPool();

    // Verificar que la reserva existe
    const reservaCheck = await pool.query('SELECT id FROM reservas WHERE id = $1', [reservaId]);
    if (reservaCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Reserva no encontrada'
      }, { status: 404 });
    }

    // Validar archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        message: 'Tipo de archivo no permitido. Solo se permiten: JPEG, PNG, JPG, PDF'
      }, { status: 400 });
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 10MB'
      }, { status: 400 });
    }

    // Convertir archivo a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `comprobante_${reservaId}_${timestamp}.${extension}`;

    // Obtener carpeta de comprobantes
    const folderId = await getSubFolder('Comprobantes de Pago');

    // Subir archivo a Google Drive
    const uploadResult = await uploadToDrive(
      fileName,
      buffer,
      file.type,
      folderId
    );

    // Crear comprobante en la base de datos
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

    // Cambiar estado de las habitaciones asociadas a la reserva a 'separada'
    await pool.query(`
      UPDATE habitaciones SET estado = 'separada', fecha_actualizacion = NOW()
      WHERE id IN (
        SELECT habitacion_id FROM reserva_habitaciones WHERE reserva_id = $1
      )
    `, [reservaId]);

    return NextResponse.json({
      success: true,
      message: 'Comprobante de pago creado exitosamente',
      data: {
        ...result.rows[0],
        driveInfo: {
          fileId: uploadResult.fileId,
          webViewLink: uploadResult.webViewLink,
          downloadLink: uploadResult.downloadLink
        }
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando comprobante:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al crear comprobante',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 