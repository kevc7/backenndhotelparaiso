import { NextRequest, NextResponse } from 'next/server';
import { uploadToDrive, getSubFolder } from '@/lib/google-drive';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tipo = formData.get('tipo') as string; // 'comprobante' o 'factura'
    const reservaId = formData.get('reserva_id') as string;

    if (!file) {
      return NextResponse.json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      }, { status: 400 });
    }

    if (!tipo || !['comprobante', 'factura'].includes(tipo)) {
      return NextResponse.json({
        success: false,
        message: 'Tipo debe ser "comprobante" o "factura"'
      }, { status: 400 });
    }

    // Validar tipo de archivo
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
    const fileName = `${tipo}_${reservaId || 'general'}_${timestamp}.${extension}`;

    // Obtener carpeta correspondiente
    let folderId: string;
    if (tipo === 'comprobante') {
      folderId = await getSubFolder('Comprobantes de Pago');
    } else {
      folderId = await getSubFolder('Facturas');
    }

    // Subir archivo a Google Drive
    const uploadResult = await uploadToDrive(
      fileName,
      buffer,
      file.type,
      folderId
    );

    return NextResponse.json({
      success: true,
      message: 'Archivo subido exitosamente',
      data: {
        fileId: uploadResult.fileId,
        fileName: fileName,
        webViewLink: uploadResult.webViewLink,
        downloadLink: uploadResult.downloadLink,
        size: file.size,
        type: file.type
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error subiendo archivo:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al subir archivo',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 