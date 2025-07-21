import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    return NextResponse.json({
      success: true,
      data: {
        isAuthenticated: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasClientCredentials: !!(clientId && clientSecret && redirectUri),
        clientId: clientId ? clientId.substring(0, 20) + '...' : 'No configurado',
        redirectUri: redirectUri || 'No configurado'
      }
    });

  } catch (error) {
    console.error('Error verificando estado de autenticación:', error);
    return NextResponse.json({
      success: false,
      message: 'Error verificando estado de autenticación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 