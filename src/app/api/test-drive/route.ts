import { NextRequest, NextResponse } from 'next/server';
import { getHotelFolder, getSubFolder, uploadToDrive } from '@/lib/google-drive';

export async function GET(request: NextRequest) {
  try {
    // Verificar variables de entorno
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!credentialsPath) {
      return NextResponse.json({
        success: false,
        message: 'GOOGLE_APPLICATION_CREDENTIALS no está configurado',
        error: 'Variable de entorno faltante'
      }, { status: 500 });
    }

    // Probar conexión con Google Drive
    const hotelFolderId = await getHotelFolder();
    const facturasFolderId = await getSubFolder('Facturas');
    const comprobantesFolderId = await getSubFolder('Comprobantes de Pago');

    // Crear archivo de prueba
    const testContent = 'Este es un archivo de prueba para verificar la conexión con Google Drive.';
    const testBuffer = Buffer.from(testContent, 'utf-8');
    const testFileName = `test_${Date.now()}.txt`;

    const uploadResult = await uploadToDrive(
      testFileName,
      testBuffer,
      'text/plain',
      facturasFolderId
    );

    return NextResponse.json({
      success: true,
      message: 'Conexión con Google Drive exitosa',
      data: {
        credentialsPath,
        hotelFolderId,
        facturasFolderId,
        comprobantesFolderId,
        testFile: {
          name: testFileName,
          id: uploadResult.fileId,
          webViewLink: uploadResult.webViewLink,
          downloadLink: uploadResult.downloadLink
        }
      }
    });

  } catch (error) {
    console.error('Error probando Google Drive:', error);
    return NextResponse.json({
      success: false,
      message: 'Error conectando con Google Drive',
      error: error instanceof Error ? error.message : 'Error desconocido',
      details: {
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
} 