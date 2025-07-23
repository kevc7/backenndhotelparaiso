import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

function setCorsHeaders(response: NextResponse, origin: string | null) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://hotel-paraiso-frontend.vercel.app',
    'https://frontendhotelparaiso.vercel.app', // ✅ Agregar el dominio correcto
    'https://hotel-paraiso-backend.vercel.app'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
}

export async function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');
  const response = NextResponse.next();
  setCorsHeaders(response, origin);

  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return response;
  }

  // Permitir acceso libre a /api/auth/* (todas las rutas de autenticación)
  if (req.nextUrl.pathname.startsWith("/api/auth/")) {
    return response;
  }
  
  // Permitir acceso libre a /api/seed para GET, POST y DELETE
  if (
    req.nextUrl.pathname === "/api/seed" &&
    (req.method === "GET" || req.method === "POST" || req.method === "DELETE")
  ) {
    return response;
  }
  
  // Permitir acceso libre a /api/health
  if (req.nextUrl.pathname === "/api/health") {
    return response;
  }
  
  // Permitir acceso libre a endpoints de prueba de Google Drive
  if (req.nextUrl.pathname === "/api/test-drive-public") {
    return response;
  }
  
  // Permitir acceso libre a endpoints públicos de habitaciones
  if (req.nextUrl.pathname === "/api/tipos-habitacion") {
    return response;
  }
  
  if (req.nextUrl.pathname === "/api/disponibilidad") {
    return response;
  }
  
  if (req.nextUrl.pathname === "/api/habitaciones" && req.method === "GET") {
    return response;
  }

  // Permitir acceso público a usuarios solo para GET (consultar)
  if (req.nextUrl.pathname === "/api/usuarios" && req.method === "GET") {
    return response;
  }

  // Permitir acceso público a estadísticas
  if (req.nextUrl.pathname === "/api/estadisticas" && req.method === "GET") {
    return response;
  }

  // Permitir acceso público a facturas solo para GET (consultar)
  if (req.nextUrl.pathname.startsWith("/api/facturas") && req.method === "GET") {
    return response;
  }

  // Permitir acceso público a reservas solo para GET (consultar)
  if (req.nextUrl.pathname.startsWith("/api/reservas") && req.method === "GET") {
    return response;
  }

  // Permitir acceso autenticado para crear reservas (POST)
  if (req.nextUrl.pathname === "/api/reservas" && req.method === "POST") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const errorResponse = NextResponse.json({ error: "No autenticado" }, { status: 401 });
      setCorsHeaders(errorResponse, origin);
      return errorResponse;
    }
    return response;
  }

  // Permitir acceso autenticado para comprobantes
  if (req.nextUrl.pathname === "/api/comprobantes" && (req.method === "POST" || req.method === "GET")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const errorResponse = NextResponse.json({ error: "No autenticado" }, { status: 401 });
      setCorsHeaders(errorResponse, origin);
      return errorResponse;
    }
    return response;
  }

  // Permitir acceso público a seed-completo
  if (req.nextUrl.pathname === "/api/seed-completo" && req.method === "POST") {
    return response;
  }

  // Permitir acceso público a registro de clientes
  if (req.nextUrl.pathname === "/api/clientes" && req.method === "POST") {
    return response;
  }

  // Permitir acceso a clientes para usuarios autenticados (GET)
  if (req.nextUrl.pathname === "/api/clientes" && req.method === "GET") {
    // Verificar que el usuario esté autenticado pero permitir acceso
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const errorResponse = NextResponse.json({ error: "No autenticado" }, { status: 401 });
      setCorsHeaders(errorResponse, origin);
      return errorResponse;
    }
    return response;
  }

  if (
    req.nextUrl.pathname.startsWith('/api/facturas') &&
    req.headers.get('x-internal-call') === 'true'
  ) {
    return NextResponse.next(); // Permite la llamada interna sin autenticación
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  console.log('Token en middleware:', token); // Para debug
  
  // Si no hay token, redirige a login
  if (!token) {
    if (req.nextUrl.pathname.startsWith("/api")) {
      const errorResponse = NextResponse.json({ error: "No autenticado" }, { status: 401 });
      setCorsHeaders(errorResponse, origin);
      return errorResponse;
    }
    const redirectResponse = NextResponse.redirect(new URL("http://localhost:3001/login"));
    setCorsHeaders(redirectResponse, origin);
    return redirectResponse;
  }
  
  // Verificar roles para endpoints de usuarios (usar 'role' en lugar de 'rol')
  if (req.nextUrl.pathname.startsWith("/api/usuarios") && (req.method === "POST" || req.method === "PUT" || req.method === "DELETE")) {
    if (token.role !== "staff" && token.role !== "admin") {
      console.log('Acceso denegado. Rol del usuario:', token.role); // Para debug
      const errorResponse = NextResponse.json({ 
        error: "No autorizado. Necesitas ser staff o admin.",
        userRole: token.role 
      }, { status: 403 });
      setCorsHeaders(errorResponse, origin);
      return errorResponse;
    }
  }
  
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"]
}; 