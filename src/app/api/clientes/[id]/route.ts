import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';

// GET - Obtener cliente específico
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pool = getDbPool();
    const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [params.id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error al obtener cliente', error: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 });
  }
}

// PUT - Actualizar cliente
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pool = getDbPool();
    const body = await request.json();
    const campos = ['nombre', 'apellido', 'email', 'telefono', 'documento_identidad'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const campo of campos) {
      if (body[campo] !== undefined) {
        updates.push(`${campo} = $${idx}`);
        values.push(body[campo]);
        idx++;
      }
    }
    if (updates.length === 0) {
      return NextResponse.json({ success: false, message: 'No hay campos para actualizar' }, { status: 400 });
    }
    values.push(params.id);
    const result = await pool.query(
      `UPDATE clientes SET ${updates.join(', ')}, fecha_creacion = fecha_creacion WHERE id = $${idx} RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, message: 'Cliente actualizado', data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error al actualizar cliente', error: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 });
  }
}

// DELETE - Eliminar cliente
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pool = getDbPool();
    const result = await pool.query('DELETE FROM clientes WHERE id = $1 RETURNING *', [params.id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Cliente eliminado', data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error al eliminar cliente', error: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 });
  }
} 