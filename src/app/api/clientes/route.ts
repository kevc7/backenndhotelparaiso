import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';
import bcrypt from 'bcryptjs';

// GET - Listar todos los clientes o buscar por usuario_id
export async function GET(request: NextRequest) {
  try {
    const usuarioId = request.nextUrl.searchParams.get('usuario_id');
    const pool = getDbPool();
    if (usuarioId) {
      const result = await pool.query('SELECT * FROM clientes WHERE usuario_id = $1', [usuarioId]);
      return NextResponse.json({ success: true, data: result.rows, total: result.rows.length });
    } else {
    const result = await pool.query('SELECT * FROM clientes ORDER BY id');
    return NextResponse.json({ success: true, data: result.rows, total: result.rows.length });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error al obtener clientes', error: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, apellido, email, password, telefono, documento_identidad, tipo_documento, fecha_nacimiento } = body;

    // Validar campos requeridos
    if (!nombre || !apellido || !email || !password || !telefono || !documento_identidad || !tipo_documento || !fecha_nacimiento) {
      return NextResponse.json({ success: false, message: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    const pool = getDbPool();
    const client = await pool.connect();
    try {
      // Verificar si el email ya existe en usuarios
      const existeUsuario = await client.query('SELECT id FROM usuarios WHERE email = $1', [email]);
      if (existeUsuario.rows.length > 0) {
        return NextResponse.json({ success: false, message: 'Ya existe un usuario con ese correo.' }, { status: 409 });
      }
      // Verificar si el documento ya existe en clientes
      const existeDoc = await client.query('SELECT id FROM clientes WHERE documento_identidad = $1', [documento_identidad]);
      if (existeDoc.rows.length > 0) {
        return NextResponse.json({ success: false, message: 'Ya existe un cliente con ese documento.' }, { status: 409 });
    }
      // Hashear contraseña
      const password_hash = await bcrypt.hash(password, 10);
      // Insertar usuario con rol cliente
      const usuarioResult = await client.query(
        'INSERT INTO usuarios (nombre, apellido, email, password_hash, rol, activo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [nombre, apellido, email, password_hash, 'cliente', true]
      );
      const usuarioId = usuarioResult.rows[0].id;
      // Insertar en clientes
      await client.query(
        'INSERT INTO clientes (usuario_id, nombre, apellido, email, telefono, documento_identidad, tipo_documento, fecha_nacimiento, fecha_creacion, fecha_actualizacion) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
        [usuarioId, nombre, apellido, email, telefono, documento_identidad, tipo_documento, fecha_nacimiento]
    );
      return NextResponse.json({ success: true, message: 'Cliente y usuario creados correctamente.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error en registro de cliente:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor.' }, { status: 500 });
  }
} 