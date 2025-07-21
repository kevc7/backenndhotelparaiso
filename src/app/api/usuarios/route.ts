import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';

// GET - Listar todos los usuarios
export async function GET() {
  try {
    const pool = getDbPool();
    const result = await pool.query(`
      SELECT 
        id,
        email,
        nombre,
        apellido,
        rol,
        activo,
        fecha_creacion,
        fecha_actualizacion
      FROM usuarios 
      ORDER BY fecha_creacion DESC
    `);
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows, 
      total: result.rows.length 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Error al obtener usuarios', 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
}

// POST - Crear nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nombre, apellido, rol } = body;
    
    if (!email || !password || !nombre || !apellido || !rol) {
      return NextResponse.json({ 
        success: false, 
        message: 'Faltan campos requeridos: email, password, nombre, apellido, rol' 
      }, { status: 400 });
    }

    const pool = getDbPool();
    
    // Verificar que el email no existe
    const emailCheck = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Ya existe un usuario con ese email' 
      }, { status: 400 });
    }

    // Validar rol
    const rolesValidos = ['admin', 'staff', 'cliente'];
    if (!rolesValidos.includes(rol)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Rol no válido. Debe ser: admin, staff, cliente' 
      }, { status: 400 });
    }

    // Hash de la contraseña
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO usuarios (email, password_hash, nombre, apellido, rol, activo, fecha_creacion, fecha_actualizacion) 
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW()) 
       RETURNING id, email, nombre, apellido, rol, activo, fecha_creacion`,
      [email, passwordHash, nombre, apellido, rol]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Usuario creado exitosamente', 
      data: result.rows[0] 
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Error al crear usuario', 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
} 