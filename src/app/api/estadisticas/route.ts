import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || 'mes'; // mes, semana, año
    const fechaInicio = searchParams.get('fecha_inicio');
    const fechaFin = searchParams.get('fecha_fin');

    const pool = getDbPool();

    // Calcular fechas según el período
    let fechaDesde: string;
    let fechaHasta: string = new Date().toISOString().split('T')[0];

    if (fechaInicio && fechaFin) {
      fechaDesde = fechaInicio;
      fechaHasta = fechaFin;
    } else {
      const hoy = new Date();
      switch (periodo) {
        case 'semana':
          fechaDesde = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case 'año':
          fechaDesde = new Date(hoy.getFullYear(), 0, 1).toISOString().split('T')[0];
          break;
        default: // mes
          fechaDesde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
      }
    }

    // Estadísticas de reservas
    const reservasQuery = `
      SELECT 
        COUNT(*) as total_reservas,
        COUNT(CASE WHEN estado = 'confirmada' THEN 1 END) as reservas_confirmadas,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as reservas_pendientes,
        COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) as reservas_canceladas,
        COALESCE(SUM(precio_total), 0) as ingresos_estimados
      FROM reservas 
      WHERE fecha_creacion >= $1 AND fecha_creacion <= $2
    `;

    const reservasResult = await pool.query(reservasQuery, [fechaDesde, fechaHasta]);

    // Estadísticas de habitaciones
    const habitacionesQuery = `
      SELECT 
        COUNT(*) as total_habitaciones,
        COUNT(CASE WHEN estado = 'libre' THEN 1 END) as habitaciones_disponibles,
        COUNT(CASE WHEN estado = 'ocupada' THEN 1 END) as habitaciones_ocupadas,
        COUNT(CASE WHEN estado = 'mantenimiento' THEN 1 END) as habitaciones_mantenimiento,
        COUNT(CASE WHEN estado = 'separada' THEN 1 END) as habitaciones_separadas
      FROM habitaciones
    `;

    const habitacionesResult = await pool.query(habitacionesQuery);

    // Estadísticas de facturas
    const facturasQuery = `
      SELECT 
        COUNT(*) as total_facturas,
        COUNT(CASE WHEN estado = 'activa' THEN 1 END) as facturas_activas,
        COUNT(CASE WHEN estado = 'anulada' THEN 1 END) as facturas_anuladas,
        COALESCE(SUM(CASE WHEN estado = 'activa' THEN total ELSE 0 END), 0) as ingresos_facturados
      FROM facturas_cabecera 
      WHERE fecha_emision >= $1 AND fecha_emision <= $2
    `;

    const facturasResult = await pool.query(facturasQuery, [fechaDesde, fechaHasta]);

    // Estadísticas de clientes
    const clientesQuery = `
      SELECT 
        COUNT(DISTINCT cliente_id) as clientes_unicos,
        COUNT(*) as total_reservas_clientes
      FROM reservas 
      WHERE fecha_creacion >= $1 AND fecha_creacion <= $2 || ' 23:59:59'
    `;

    const clientesResult = await pool.query(clientesQuery, [fechaDesde, fechaHasta]);

    // Ocupación por día (últimos 30 días)
    const ocupacionQuery = `
      SELECT 
        DATE(fecha_entrada) as fecha,
        COUNT(*) as reservas_checkin,
        COUNT(DISTINCT r.cliente_id) as clientes_unicos
      FROM reservas r
      WHERE fecha_entrada >= $1 AND fecha_entrada <= $2
        AND estado = 'confirmada'
      GROUP BY DATE(fecha_entrada)
      ORDER BY fecha
    `;

    const ocupacionResult = await pool.query(ocupacionQuery, [fechaDesde, fechaHasta]);

    // Top habitaciones más reservadas
    const topHabitacionesQuery = `
      SELECT 
        h.numero,
        th.nombre as tipo,
        COUNT(rh.id) as veces_reservada,
        AVG(th.precio_base) as precio_promedio
      FROM reserva_habitaciones rh
      JOIN habitaciones h ON rh.habitacion_id = h.id
      JOIN tipos_habitacion th ON h.tipo_habitacion_id = th.id
      JOIN reservas r ON rh.reserva_id = r.id
      WHERE r.fecha_creacion >= $1 AND r.fecha_creacion <= $2
        AND r.estado = 'confirmada'
      GROUP BY h.id, h.numero, th.nombre
      ORDER BY veces_reservada DESC
      LIMIT 5
    `;

    const topHabitacionesResult = await pool.query(topHabitacionesQuery, [fechaDesde, fechaHasta]);

    // Ingresos por mes (últimos 12 meses)
    const ingresosMensualesQuery = `
      SELECT 
        DATE_TRUNC('month', fecha_emision) as mes,
        SUM(total) as ingresos,
        COUNT(*) as facturas
      FROM facturas_cabecera 
      WHERE estado = 'activa'
        AND fecha_emision >= $1
      GROUP BY DATE_TRUNC('month', fecha_emision)
      ORDER BY mes DESC
      LIMIT 12
    `;

    const fecha12Meses = new Date();
    fecha12Meses.setMonth(fecha12Meses.getMonth() - 12);
    const ingresosMensualesResult = await pool.query(ingresosMensualesQuery, [fecha12Meses.toISOString().split('T')[0]]);

    return NextResponse.json({
      success: true,
      data: {
        periodo: {
          desde: fechaDesde,
          hasta: fechaHasta
        },
        reservas: reservasResult.rows[0],
        habitaciones: habitacionesResult.rows[0],
        facturas: facturasResult.rows[0],
        clientes: clientesResult.rows[0],
        ocupacion: ocupacionResult.rows,
        topHabitaciones: topHabitacionesResult.rows,
        ingresosMensuales: ingresosMensualesResult.rows
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 