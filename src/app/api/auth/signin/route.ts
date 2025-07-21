import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    const client = await pool.connect();

    try {
      const res = await client.query(
        "SELECT * FROM usuarios WHERE email = $1 AND activo = true",
        [email]
      );

      const user = res.rows[0];

      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado o inactivo' },
          { status: 401 }
        );
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return NextResponse.json(
          { error: 'Contraseña incorrecta' },
          { status: 401 }
        );
      }

      // Devolver información del usuario (sin la contraseña)
      return NextResponse.json({
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error en autenticación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 