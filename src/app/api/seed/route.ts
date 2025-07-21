import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';
import bcrypt from 'bcryptjs';

// Utilidad para generar datos aleatorios
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

// 5 tipos de habitaciones variados
const tiposHabitacion = [
  {
    nombre: 'Estándar',
    descripcion: 'Habitación cómoda con servicios básicos',
    capacidad_maxima: 2,
    precio_base: 85.00,
    servicios: ['WiFi', 'TV', 'Baño privado', 'Aire acondicionado']
  },
  {
    nombre: 'Doble Superior',
    descripcion: 'Habitación doble con vista y servicios mejorados',
    capacidad_maxima: 2,
    precio_base: 120.00,
    servicios: ['WiFi', 'TV', 'Baño privado', 'Aire acondicionado', 'Minibar', 'Balcón']
  },
  {
    nombre: 'Suite Familiar',
    descripcion: 'Amplia suite ideal para familias',
    capacidad_maxima: 4,
    precio_base: 180.00,
    servicios: ['WiFi', 'TV', 'Baño privado', 'Aire acondicionado', 'Minibar', 'Sala de estar', 'Balcón']
  },
  {
    nombre: 'Suite Premium',
    descripcion: 'Suite de lujo con vista al mar',
    capacidad_maxima: 3,
    precio_base: 250.00,
    servicios: ['WiFi', 'TV', 'Baño privado', 'Aire acondicionado', 'Minibar', 'Jacuzzi', 'Vista al mar', 'Room service']
  },
  {
    nombre: 'Suite Presidencial',
    descripcion: 'La suite más exclusiva del hotel',
    capacidad_maxima: 6,
    precio_base: 400.00,
    servicios: ['WiFi', 'TV', 'Baño privado', 'Aire acondicionado', 'Minibar', 'Jacuzzi', 'Vista panorámica', 'Room service', 'Sauna', 'Terraza privada']
  }
];

// Datos para usuarios fáciles de probar
const usuariosPrueba = [
  {
    email: 'staff@gmail.com',
    password: '123',
    nombre: 'Juan Carlos',
    apellido: 'Staff Admin',
    rol: 'staff'
  },
  {
    email: 'admin@gmail.com',
    password: '123',
    nombre: 'María Elena',
    apellido: 'Administradora',
    rol: 'admin'
  },
  {
    email: 'cliente@gmail.com',
    password: '123',
    nombre: 'Pedro',
    apellido: 'Cliente Fácil',
    rol: 'cliente'
  }
];

// Datos para clientes de prueba
const clientesPrueba: Array<{
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento_identidad: string;
  tipo_documento: string;
  fecha_nacimiento: string;
  password: string; // Todos los clientes tendrán usuario
}> = [
  {
    nombre: 'Pedro',
    apellido: 'Cliente Fácil',
    email: 'cliente@gmail.com',
    telefono: '+57 301 234 5678',
    documento_identidad: '12345678',
    tipo_documento: 'cedula',
    fecha_nacimiento: '1985-06-15',
    password: '123'
  },
  {
    nombre: 'Ana María',
    apellido: 'González',
    email: 'ana.gonzalez@gmail.com',
    telefono: '+57 302 345 6789',
    documento_identidad: '23456789',
    tipo_documento: 'cedula',
    fecha_nacimiento: '1990-03-22',
    password: '123'
  },
  {
    nombre: 'Carlos Eduardo',
    apellido: 'Martínez',
    email: 'carlos.martinez@hotmail.com',
    telefono: '+57 303 456 7890',
    documento_identidad: '34567890',
    tipo_documento: 'cedula',
    fecha_nacimiento: '1988-11-08',
    password: '123'
  },
  {
    nombre: 'Luisa Fernanda',
    apellido: 'Torres',
    email: 'luisa.torres@outlook.com',
    telefono: '+57 304 567 8901',
    documento_identidad: '45678901',
    tipo_documento: 'cedula',
    fecha_nacimiento: '1992-07-30',
    password: '123'
  },
  {
    nombre: 'Miguel Ángel',
    apellido: 'Rodríguez',
    email: 'miguel.rodriguez@yahoo.com',
    telefono: '+57 305 678 9012',
    documento_identidad: '56789012',
    tipo_documento: 'cedula',
    fecha_nacimiento: '1987-02-14',
    password: '123'
  },
  {
    nombre: 'Sofía Isabel',
    apellido: 'Hernández',
    email: 'sofia.hernandez@gmail.com',
    telefono: '+57 306 789 0123',
    documento_identidad: '67890123',
    tipo_documento: 'cedula',
    fecha_nacimiento: '1995-09-12',
    password: '123'
  },
  {
    nombre: 'Alejandro',
    apellido: 'Vargas',
    email: 'alejandro.vargas@hotmail.com',
    telefono: '+57 307 890 1234',
    documento_identidad: '78901234',
    tipo_documento: 'pasaporte',
    fecha_nacimiento: '1983-12-05',
    password: '123'
  },
  {
    nombre: 'Valeria',
    apellido: 'Castro',
    email: 'valeria.castro@outlook.com',
    telefono: '+57 308 901 2345',
    documento_identidad: '89012345',
    tipo_documento: 'cedula',
    fecha_nacimiento: '1991-04-18',
    password: '123'
  },
  {
    nombre: 'Andrés Felipe',
    apellido: 'Morales',
    email: 'andres.morales@gmail.com',
    telefono: '+57 309 012 3456',
    documento_identidad: '90123456',
    tipo_documento: 'cedula',
    fecha_nacimiento: '1989-08-27',
    password: '123'
  },
  {
    nombre: 'Isabella',
    apellido: 'Jiménez',
    email: 'isabella.jimenez@yahoo.com',
    telefono: '+57 310 123 4567',
    documento_identidad: '01234567',
    tipo_documento: 'cedula',
    fecha_nacimiento: '1993-01-20',
    password: '123'
  }
];

export async function POST(request: NextRequest) {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🧹 Limpiando base de datos...');
    
    // Limpiar todas las tablas en orden correcto (respetando foreign keys)
    await client.query('DELETE FROM facturas_lineas');
    await client.query('DELETE FROM facturas_cabecera');
    await client.query('DELETE FROM comprobantes_pago');
    await client.query('DELETE FROM reserva_habitaciones');
    await client.query('DELETE FROM reservas');
    await client.query('DELETE FROM habitaciones');
    await client.query('DELETE FROM tipos_habitacion');
    await client.query('DELETE FROM clientes');
    await client.query('DELETE FROM usuarios');
    
    // Reiniciar secuencias para empezar desde 1
    await client.query('ALTER SEQUENCE usuarios_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE tipos_habitacion_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE habitaciones_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE clientes_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE reservas_id_seq RESTART WITH 1');
    
    console.log('✅ Base de datos limpiada');
    
    // 1. Crear usuarios de staff/admin
    console.log('👥 Creando usuarios de staff/admin...');
    const usuariosCreados = [];
    
    // Solo crear usuarios staff y admin
    const usuariosStaff = [
      {
        email: 'staff@gmail.com',
        password: '123',
        nombre: 'Juan Carlos',
        apellido: 'Staff Admin',
        rol: 'staff'
      },
      {
        email: 'admin@gmail.com',
        password: '123',
        nombre: 'María Elena',
        apellido: 'Administradora',
        rol: 'admin'
      }
    ];
    
    for (const usuario of usuariosStaff) {
      const hashPassword = await bcrypt.hash(usuario.password, 10);
      const result = await client.query(
        `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol, activo, fecha_creacion, fecha_actualizacion)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW()) RETURNING *`,
        [usuario.nombre, usuario.apellido, usuario.email, hashPassword, usuario.rol]
      );
      usuariosCreados.push(result.rows[0]);
    }
    
    // 2. Crear tipos de habitación
    console.log('🏨 Creando tipos de habitación...');
    const tiposCreados = [];
    for (const tipo of tiposHabitacion) {
      const result = await client.query(
        `INSERT INTO tipos_habitacion (nombre, descripcion, capacidad_maxima, precio_base, servicios, fecha_creacion, fecha_actualizacion)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
        [tipo.nombre, tipo.descripcion, tipo.capacidad_maxima, tipo.precio_base, JSON.stringify(tipo.servicios)]
      );
      tiposCreados.push(result.rows[0]);
    }
    
    // 3. Crear habitaciones (15 por cada tipo = 75 habitaciones)
    console.log('🚪 Creando habitaciones...');
    const habitacionesCreadas = [];
    let numeroHabitacion = 101;
    
    // Distribuir en 5 pisos
    for (let piso = 1; piso <= 5; piso++) {
      for (let tipoIndex = 0; tipoIndex < tiposCreados.length; tipoIndex++) {
        // 3 habitaciones de cada tipo por piso
        for (let i = 0; i < 3; i++) {
          const numero = numeroHabitacion.toString();
          const tipo_habitacion_id = tiposCreados[tipoIndex].id;
          const estado = 'libre'; // Todas las habitaciones se crean libres
          
          const result = await client.query(
            `INSERT INTO habitaciones (numero, piso, tipo_habitacion_id, estado, observaciones, fecha_creacion, fecha_actualizacion)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
            [numero, piso, tipo_habitacion_id, estado, null] // observaciones siempre null para habitaciones libres
          );
          habitacionesCreadas.push(result.rows[0]);
          numeroHabitacion++;
        }
      }
    }
    
    // 4. Crear clientes (cada uno con su usuario)
    console.log('👤 Creando clientes con usuarios...');
    const clientesCreados = [];
    const usuariosClienteCreados = [];
    
    for (const cliente of clientesPrueba) {
      // Crear usuario para cada cliente
      const hashPassword = await bcrypt.hash(cliente.password, 10);
      const usuarioResult = await client.query(
        `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol, activo, fecha_creacion, fecha_actualizacion)
         VALUES ($1, $2, $3, $4, 'cliente', true, NOW(), NOW()) RETURNING *`,
        [cliente.nombre, cliente.apellido, cliente.email, hashPassword]
      );
      usuariosClienteCreados.push(usuarioResult.rows[0]);
      
      // Crear cliente asociado al usuario
      const clienteResult = await client.query(
        `INSERT INTO clientes (nombre, apellido, email, telefono, documento_identidad, tipo_documento, fecha_nacimiento, usuario_id, fecha_creacion, fecha_actualizacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
        [
          cliente.nombre, 
          cliente.apellido, 
          cliente.email, 
          cliente.telefono, 
          cliente.documento_identidad, 
          cliente.tipo_documento, 
          cliente.fecha_nacimiento,
          usuarioResult.rows[0].id
        ]
      );
      clientesCreados.push(clienteResult.rows[0]);
    }
    
    await client.query('COMMIT');
    
    console.log('🎉 Seed completado exitosamente');
    
    return NextResponse.json({
      success: true,
      message: 'Base de datos poblada exitosamente',
      data: {
        usuarios_staff_creados: usuariosCreados.length,
        usuarios_cliente_creados: usuariosClienteCreados.length,
        tipos_habitacion_creados: tiposCreados.length,
        habitaciones_creadas: habitacionesCreadas.length,
        clientes_creados: clientesCreados.length,
        credenciales_prueba: {
          staff: { email: 'staff@gmail.com', password: '123' },
          admin: { email: 'admin@gmail.com', password: '123' },
          clientes: clientesPrueba.map(c => ({ email: c.email, password: '123', documento: c.documento_identidad }))
        },
        resumen: {
          habitaciones_por_piso: 15,
          pisos_totales: 5,
          tipos_habitacion: tiposHabitacion.map(t => ({
            nombre: t.nombre,
            precio_base: t.precio_base,
            capacidad: t.capacidad_maxima
          }))
        }
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en seed:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al poblar la base de datos',
      error: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 500 });
  } finally {
    client.release();
  }
}

// Endpoint para verificar la estructura de la BD
export async function GET(request: NextRequest) {
  const pool = getDbPool();
  try {
    const tablas = ['usuarios', 'tipos_habitacion', 'habitaciones', 'clientes', 'reservas'];
    const conteos: Record<string, number> = {};
    
    for (const tabla of tablas) {
      const result = await pool.query(`SELECT COUNT(*) as total FROM ${tabla}`);
      conteos[tabla] = parseInt(result.rows[0].total);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Estado actual de la base de datos',
      conteos,
      estructura_tipos_habitacion: await pool.query(`
        SELECT id, nombre, precio_base, capacidad_maxima 
        FROM tipos_habitacion 
        ORDER BY precio_base
      `).then(r => r.rows)
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 500 });
  }
}

// Endpoint para limpiar solo los datos sin estructura
export async function DELETE(request: NextRequest) {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Limpiar solo datos, no estructura
    await client.query('DELETE FROM facturas_lineas');
    await client.query('DELETE FROM facturas_cabecera');
    await client.query('DELETE FROM comprobantes_pago');
    await client.query('DELETE FROM reserva_habitaciones');
    await client.query('DELETE FROM reservas');
    await client.query('DELETE FROM habitaciones');
    await client.query('DELETE FROM tipos_habitacion');
    await client.query('DELETE FROM clientes');
    await client.query('DELETE FROM usuarios');
    
    await client.query('COMMIT');
    return NextResponse.json({ 
      success: true, 
      message: 'Todos los datos eliminados correctamente' 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return NextResponse.json({ 
      success: false, 
      message: 'Error al eliminar datos', 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  } finally {
    client.release();
  }
}