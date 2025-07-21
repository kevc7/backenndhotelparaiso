import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

export async function GET(request: NextRequest) {
  try {
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

    // Generar URL de autorización
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.readonly'
      ],
      prompt: 'consent' // Forzar consentimiento para obtener refresh token
    });

    return NextResponse.json({
      success: true,
      authUrl: authUrl
    });

  } catch (error) {
    console.error('Error generando URL de autorización:', error);
    return NextResponse.json({
      success: false,
      message: 'Error generando URL de autorización',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 