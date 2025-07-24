import { NextRequest, NextResponse } from 'next/server';
import { enviarEmailComprobanteResend } from '@/lib/email-service-resend';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 INICIANDO prueba de email con Resend');
    
    const body = await request.json();
    
    // Validar datos requeridos
    if (!body.clienteEmail || !body.codigoReserva) {
      return NextResponse.json({
        success: false,
        message: 'Datos incompletos: clienteEmail y codigoReserva son requeridos'
      }, { status: 400 });
    }

    console.log('📧 Datos de prueba recibidos:', {
      email: body.clienteEmail,
      reserva: body.codigoReserva
    });

    // Verificar que RESEND_API_KEY esté configurado
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY no está configurado');
      return NextResponse.json({
        success: false,
        message: 'RESEND_API_KEY no está configurado en las variables de entorno'
      }, { status: 500 });
    }

    console.log('✅ RESEND_API_KEY configurado correctamente');

    // Enviar email de prueba
    const result = await enviarEmailComprobanteResend({
      clienteNombre: body.clienteNombre || 'Usuario',
      clienteApellido: body.clienteApellido || 'Prueba',
      clienteEmail: body.clienteEmail,
      codigoReserva: body.codigoReserva,
      fechaEntrada: body.fechaEntrada || '2025-01-15',
      fechaSalida: body.fechaSalida || '2025-01-17',
      metodoPago: body.metodoPago || 'transferencia',
      monto: body.monto || 100.00,
      fechaPago: body.fechaPago || '2025-01-10',
      observaciones: body.observaciones || 'Pago de prueba',
      fileName: body.fileName || 'comprobante_test.pdf',
      driveLink: body.driveLink || 'https://drive.google.com/test'
    });

    if (result.success) {
      console.log('✅ Email de prueba enviado exitosamente');
      return NextResponse.json({
        success: true,
        message: 'Email de prueba enviado exitosamente',
        data: result
      });
    } else {
      console.error('❌ Error enviando email de prueba:', result.message);
      return NextResponse.json({
        success: false,
        message: `Error enviando email: ${result.message}`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error en endpoint de prueba:', error);
    return NextResponse.json({
      success: false,
      message: `Error interno: ${error instanceof Error ? error.message : 'Error desconocido'}`
    }, { status: 500 });
  }
} 