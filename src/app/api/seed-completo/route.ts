import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';
import { generarNumeroFactura, calcularImpuestos } from '@/lib/pdf-generator';

export async function POST(request: NextRequest) {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Obtener datos existentes
    const clientesResult = await client.query('SELECT id FROM clientes LIMIT 5');
    const habitacionesResult = await client.query(`
      SELECT h.id, th.precio_base as precio_noche 
      FROM habitaciones h
      JOIN tipos_habitacion th ON h.tipo_habitacion_id = th.id
      WHERE h.estado = 'libre' 
      LIMIT 3
    `);
    
    // Obtener o crear usuario admin
    let usuarioAdmin = await client.query('SELECT id FROM usuarios WHERE rol = \'admin\' LIMIT 1');
    if (usuarioAdmin.rows.length === 0) {
      // Crear usuario admin si no existe
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('admin123', 10);
      const adminResult = await client.query(`
        INSERT INTO usuarios (nombre, apellido, email, password_hash, rol, activo)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, ['Admin', 'Sistema', 'admin@hotel.com', hash, 'admin', true]);
      usuarioAdmin = adminResult;
    }
    
    if (clientesResult.rows.length === 0 || habitacionesResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Necesitas ejecutar /api/seed primero para crear clientes y habitaciones'
      }, { status: 400 });
    }

    const clientes = clientesResult.rows;
    const habitaciones = habitacionesResult.rows;

    // Crear reservas de ejemplo
    const reservasCreadas = [];
    for (let i = 0; i < 3; i++) {
      const cliente = clientes[i % clientes.length];
      const habitacion = habitaciones[i % habitaciones.length];
      
      const fechaCheckin = new Date();
      fechaCheckin.setDate(fechaCheckin.getDate() + i + 1);
      
      const fechaCheckout = new Date(fechaCheckin);
      fechaCheckout.setDate(fechaCheckout.getDate() + randomInt(1, 3));
      
      const codigoReserva = `RES-${Date.now()}-${i}`;
      
      // Crear reserva
      const reservaResult = await client.query(`
        INSERT INTO reservas (cliente_id, fecha_entrada, fecha_salida, numero_huespedes, estado, creado_por, fecha_creacion)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `, [cliente.id, fechaCheckin, fechaCheckout, randomInt(1, 4), 'confirmada', usuarioAdmin.rows[0].id]);

      const reserva = reservaResult.rows[0];
      
      // Calcular noches y subtotal
      const noches = Math.ceil((fechaCheckout.getTime() - fechaCheckin.getTime()) / (1000 * 60 * 60 * 24));
      const subtotal = parseFloat(habitacion.precio_noche) * noches;
      
      // Crear relación reserva-habitación
      await client.query(`
        INSERT INTO reserva_habitaciones (reserva_id, habitacion_id, precio_unitario, noches, subtotal)
        VALUES ($1, $2, $3, $4, $5)
      `, [reserva.id, habitacion.id, habitacion.precio_noche, noches, subtotal]);

      // Actualizar estado de habitación
      await client.query(`
        UPDATE habitaciones SET estado = 'ocupada' WHERE id = $1
      `, [habitacion.id]);
      
      // Actualizar precio total de la reserva
      await client.query(`
        UPDATE reservas SET precio_total = (
          SELECT SUM(subtotal) FROM reserva_habitaciones WHERE reserva_id = $1
        ) WHERE id = $1
      `, [reserva.id]);

      reservasCreadas.push(reserva);
    }

    // Crear facturas de ejemplo
    const facturasCreadas = [];
    for (let i = 0; i < 2; i++) {
      const reserva = reservasCreadas[i];
      
      // Obtener datos de la reserva para la factura
      const reservaCompleta = await client.query(`
        SELECT 
          r.*,
          c.nombre, c.apellido, c.email, c.telefono, c.documento_identidad,
          rh.precio_unitario,
          rh.noches,
          rh.subtotal,
          h.numero,
          th.nombre as tipo_nombre
        FROM reservas r
        JOIN clientes c ON r.cliente_id = c.id
        JOIN reserva_habitaciones rh ON r.id = rh.reserva_id
        JOIN habitaciones h ON rh.habitacion_id = h.id
        JOIN tipos_habitacion th ON h.tipo_habitacion_id = th.id
        WHERE r.id = $1
      `, [reserva.id]);

      if (reservaCompleta.rows.length > 0) {
        const reservaData = reservaCompleta.rows[0];
        
        // Calcular totales
        const subtotal = parseFloat(reservaData.subtotal);
        const impuestos = calcularImpuestos(subtotal);
        const total = subtotal + impuestos;

        // Crear factura
        const facturaResult = await client.query(`
          INSERT INTO facturas_cabecera (
            codigo_factura,
            reserva_id,
            cliente_id,
            subtotal,
            impuestos,
            total,
                      estado,
          creado_por
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        'FAC-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6),
        reserva.id,
        reservaData.cliente_id,
        subtotal,
        impuestos,
        total,
        'activa',
        usuarioAdmin.rows[0].id
      ]);

        const factura = facturaResult.rows[0];

        // Crear líneas de factura
        await client.query(`
          INSERT INTO facturas_lineas (
            factura_id,
            descripcion,
            cantidad,
            precio_unitario,
            subtotal
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          factura.id,
          `Habitación ${reservaData.numero} - ${reservaData.tipo_nombre}`,
          reservaData.noches,
          reservaData.precio_unitario,
          reservaData.subtotal
        ]);

        facturasCreadas.push(factura);
      }
    }

    // Crear comprobantes de ejemplo
    const comprobantesCreados = [];
    for (let i = 0; i < 2; i++) {
      const reserva = reservasCreadas[i];
      
      const comprobanteResult = await client.query(`
        INSERT INTO comprobantes_pago (
          reserva_id,
          metodo_pago,
          monto,
          estado,
          ruta_archivo,
          hash_archivo,
                  observaciones,
        creado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      reserva.id,
      'transferencia_bancaria',
      randomInt(100, 500),
      'confirmado',
      'drive_id_abc123',
      'sha256_hash_example',
      'Comprobante de prueba',
      usuarioAdmin.rows[0].id
    ]);

      comprobantesCreados.push(comprobanteResult.rows[0]);
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Datos de prueba completos creados exitosamente',
      data: {
        reservas_creadas: reservasCreadas.length,
        facturas_creadas: facturasCreadas.length,
        comprobantes_creados: comprobantesCreados.length
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creando datos completos:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al crear datos de prueba completos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  } finally {
    client.release();
  }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
} 