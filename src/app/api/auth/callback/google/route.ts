import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Error en autorización de Google',
        error: error
      }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({
        success: false,
        message: 'Código de autorización no recibido'
      }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json({
        success: false,
        message: 'Faltan variables de entorno de OAuth 2.0'
      }, { status: 500 });
    }

    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

    // Intercambiar código por tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.json({
        success: false,
        message: 'No se pudo obtener el token de acceso'
      }, { status: 500 });
    }

    // Guardar tokens en variables de entorno temporales (en producción usarías una base de datos)
    process.env.GOOGLE_ACCESS_TOKEN = tokens.access_token;
    if (tokens.refresh_token) {
      process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
    }

    // Imprimir tokens en consola para el usuario
    console.log('GOOGLE_ACCESS_TOKEN:', tokens.access_token);
    console.log('GOOGLE_REFRESH_TOKEN:', tokens.refresh_token);

    return NextResponse.json({
      success: true,
      message: 'Autenticación exitosa con Google Drive',
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresIn: tokens.expiry_date
      }
    });

  } catch (error) {
    console.error('Error en callback de OAuth:', error);
    return NextResponse.json({
      success: false,
      message: 'Error procesando callback de OAuth',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 