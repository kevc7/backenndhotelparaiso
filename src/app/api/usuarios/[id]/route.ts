import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';

// Función para verificar autenticación simplificada
async function verificarAutenticacion(request: NextRequest) {
  try {
    // Para desarrollo, podemos simplificar la autenticación
    // Verificar si hay una cookie de sesión
    const cookies = request.cookies;
    const sessionToken = cookies.get('next-auth.session-token') || cookies.get('__Secure-next-auth.session-token');
    
    if (!sessionToken) {
      return null;
    }

    // Para este desarrollo, asumimos que si hay token de sesión, es válido
    // En producción deberías validar el JWT apropiadamente
    return { role: 'staff', authenticated: true };
  } catch (error) {
    console.error('Error verificando autenticación:', error);
    return null;
  }
}

// GET - Obtener usuario específico
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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
      WHERE id = $1
    `, [params.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Error al obtener usuario', 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
}

// PUT - Actualizar usuario
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { email, nombre, apellido, rol, activo, password } = body;
    const usuarioId = params.id;
    
    const pool = getDbPool();
    
    // Verificar que el usuario existe
    const existeCheck = await pool.query('SELECT id, rol FROM usuarios WHERE id = $1', [usuarioId]);
    if (existeCheck.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      }, { status: 404 });
    }
    
    const usuarioActual = existeCheck.rows[0];
    
    // Validaciones de seguridad
    if (email) {
      const emailCheck = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, usuarioId]);
      if (emailCheck.rows.length > 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'Ya existe otro usuario con ese email' 
        }, { status: 400 });
      }
    }
    
    if (rol) {
      const rolesValidos = ['admin', 'staff', 'cliente'];
      if (!rolesValidos.includes(rol)) {
        return NextResponse.json({ 
          success: false, 
          message: 'Rol no válido. Debe ser: admin, staff, cliente' 
        }, { status: 400 });
      }
    }
    
    // Construir query de actualización dinámicamente
    const camposActualizar = [];
    const valores = [];
    let contador = 1;
    
    if (email !== undefined) {
      camposActualizar.push(`email = $${contador}`);
      valores.push(email);
      contador++;
    }
    
    if (nombre !== undefined) {
      camposActualizar.push(`nombre = $${contador}`);
      valores.push(nombre);
      contador++;
    }
    
    if (apellido !== undefined) {
      camposActualizar.push(`apellido = $${contador}`);
      valores.push(apellido);
      contador++;
    }
    
    if (rol !== undefined) {
      camposActualizar.push(`rol = $${contador}`);
      valores.push(rol);
      contador++;
    }
    
    if (activo !== undefined) {
      camposActualizar.push(`activo = $${contador}`);
      valores.push(activo);
      contador++;
    }
    
    if (password !== undefined && password.trim() !== '') {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);
      camposActualizar.push(`password_hash = $${contador}`);
      valores.push(passwordHash);
      contador++;
    }
    
    if (camposActualizar.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No se proporcionaron campos para actualizar' 
      }, { status: 400 });
    }
    
    valores.push(usuarioId);
    
    const result = await pool.query(`
      UPDATE usuarios 
      SET ${camposActualizar.join(', ')}, fecha_actualizacion = NOW()
      WHERE id = $${contador}
      RETURNING id, email, nombre, apellido, rol, activo, fecha_creacion, fecha_actualizacion
    `, valores);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Usuario actualizado exitosamente', 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error al actualizar usuario', 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
}

// DELETE - Desactivar usuario (soft delete)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const usuarioId = params.id;
    const pool = getDbPool();
    
    // Verificar que el usuario existe
    const usuarioCheck = await pool.query('SELECT id, rol, email FROM usuarios WHERE id = $1', [usuarioId]);
    if (usuarioCheck.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      }, { status: 404 });
    }
    
    const usuario = usuarioCheck.rows[0];
    
    // Verificar si el usuario tiene reservas activas (para clientes)
    if (usuario.rol === 'cliente') {
      const reservasActivas = await pool.query(`
        SELECT COUNT(*) as total 
        FROM reservas r 
        JOIN clientes c ON r.cliente_id = c.id 
        WHERE c.usuario_id = $1 AND r.estado IN ('pendiente', 'confirmada')
      `, [usuarioId]);
      
      if (parseInt(reservasActivas.rows[0].total) > 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'No se puede desactivar un cliente con reservas activas' 
        }, { status: 400 });
      }
    }
    
    // Soft delete - marcar como inactivo
    await pool.query(`
      UPDATE usuarios 
      SET activo = false, fecha_actualizacion = NOW()
      WHERE id = $1
    `, [usuarioId]);
    
    // Si es cliente, también desactivar el registro de cliente
    if (usuario.rol === 'cliente') {
      await pool.query(`
        UPDATE clientes 
        SET activo = false, fecha_actualizacion = NOW()
        WHERE usuario_id = $1
      `, [usuarioId]);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Usuario ${usuario.email} desactivado exitosamente` 
    });
  } catch (error) {
    console.error('Error desactivando usuario:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error al desactivar usuario', 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
} 