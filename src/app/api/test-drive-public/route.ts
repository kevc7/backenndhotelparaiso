import { NextRequest, NextResponse } from 'next/server';
import { getHotelFolder, getSubFolder, uploadToDrive } from '@/lib/google-drive';

export async function GET(request: NextRequest) {
  try {
    // Verificar variables de entorno
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    
    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json({
        success: false,
        message: 'Faltan variables de entorno de OAuth 2.0',
        error: 'Variables de entorno faltantes',
        details: {
          clientId: clientId ? 'Configurado' : 'Faltante',
          clientSecret: clientSecret ? 'Configurado' : 'Faltante',
          redirectUri: redirectUri ? 'Configurado' : 'Faltante',
          nodeEnv: process.env.NODE_ENV
        }
      }, { status: 500 });
    }

    // Probar conexión con Google Drive usando OAuth 2.0
    const hotelFolderId = await getHotelFolder();
    const facturasFolderId = await getSubFolder('Facturas');
    const comprobantesFolderId = await getSubFolder('Comprobantes de Pago');

    // Crear archivo de prueba
    const testContent = 'Este es un archivo de prueba para verificar la conexión con Google Drive usando OAuth 2.0.';
    const testBuffer = Buffer.from(testContent, 'utf-8');
    const testFileName = `test_oauth_${Date.now()}.txt`;

    const uploadResult = await uploadToDrive(
      testFileName,
      testBuffer,
      'text/plain',
      facturasFolderId
    );

    return NextResponse.json({
      success: true,
      message: 'Conexión con Google Drive usando OAuth 2.0 exitosa',
      data: {
        clientId: clientId.substring(0, 20) + '...',
        redirectUri,
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
    console.error('Error probando Google Drive con OAuth 2.0:', error);
    return NextResponse.json({
      success: false,
      message: 'Error conectando con Google Drive usando OAuth 2.0',
      error: error instanceof Error ? error.message : 'Error desconocido',
      details: {
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ? 'Configurado' : 'Faltante',
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ? 'Configurado' : 'Faltante',
        redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
} 