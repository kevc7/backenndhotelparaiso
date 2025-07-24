import { Resend } from 'resend';

// Configuración de Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Interfaz para datos del comprobante
interface ComprobanteEmailData {
  clienteNombre: string;
  clienteApellido: string;
  clienteEmail: string;
  codigoReserva: string;
  fechaEntrada: string;
  fechaSalida: string;
  metodoPago: string;
  monto: number;
  fechaPago: string;
  observaciones: string;
  fileName: string;
  driveLink: string;
}

// Interfaz para datos de la reserva
interface ReservaEmailData {
  clienteNombre: string;
  clienteApellido: string;
  clienteEmail: string;
  codigoReserva: string;
  fechaEntrada: string;
  fechaSalida: string;
  numeroHuespedes: number;
  habitaciones: Array<{
    numero: string;
    tipo: string;
    precio: number;
  }>;
  precioTotal: number;
  estado: 'confirmada' | 'cancelada';
}

// Función para enviar email de comprobante usando Resend
export async function enviarEmailComprobanteResend(data: ComprobanteEmailData): Promise<{ success: boolean; message: string }> {
  console.log('📧 INICIANDO envío de email de comprobante con Resend:', data.codigoReserva);
  
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY no está configurada');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comprobante Recibido - Hotel Paraíso Verde</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669, #047857); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
          .payment-box { background: #059669; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 48px; margin-bottom: 15px;">📄</div>
          <h1>¡Comprobante Recibido!</h1>
          <p>Hotel Paraíso Verde</p>
        </div>
        
        <div class="content">
          <h2>Estimado/a ${data.clienteNombre} ${data.clienteApellido},</h2>
          <p>Hemos recibido exitosamente tu comprobante de pago.</p>
          
          <div class="info-box">
            <h3>📋 Detalles de tu Reserva</h3>
            <p><strong>Código:</strong> ${data.codigoReserva}</p>
            <p><strong>Check-in:</strong> ${new Date(data.fechaEntrada).toLocaleDateString('es-ES')}</p>
            <p><strong>Check-out:</strong> ${new Date(data.fechaSalida).toLocaleDateString('es-ES')}</p>
          </div>
          
          <div class="payment-box">
            <h3>💰 Información del Pago</h3>
            <p><strong>Método:</strong> ${data.metodoPago}</p>
            <p><strong>Monto:</strong> $${data.monto.toFixed(2)}</p>
            <p><strong>Fecha de Pago:</strong> ${new Date(data.fechaPago).toLocaleDateString('es-ES')}</p>
            <p><strong>Archivo:</strong> ${data.fileName}</p>
          </div>
          
          ${data.observaciones ? `<p><strong>Observaciones:</strong> ${data.observaciones}</p>` : ''}
          
          <p>Nuestro equipo revisará tu comprobante y te notificaremos cuando tu reserva sea confirmada.</p>
          <p>¡Gracias por tu paciencia!</p>
          <p>Atentamente,<br><strong>Equipo Hotel Paraíso Verde</strong></p>
        </div>
        
        <div class="footer">
          <p><strong>Hotel Paraíso Verde</strong></p>
          <p>📧 reservas@hotelparaiso.com | 📞 +593-7-123-4567</p>
        </div>
      </body>
      </html>
    `;

    console.log('📧 Enviando email con Resend a:', data.clienteEmail);
    
    const result = await resend.emails.send({
      from: 'Hotel Paraíso Verde <reservas@hotelparaiso.com>',
      to: data.clienteEmail,
      subject: `📄 Comprobante Recibido - ${data.codigoReserva} - Hotel Paraíso Verde`,
      html: htmlContent
    });

    console.log('✅ Email enviado exitosamente con Resend, ID:', result.data?.id);
    
    return {
      success: true,
      message: `Email de comprobante enviado exitosamente a ${data.clienteEmail}`
    };
    
  } catch (error) {
    console.error('❌ Error enviando email con Resend:', error);
    return {
      success: false,
      message: `Error al enviar email: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

// Función para enviar email de confirmación de reserva
export async function enviarEmailReservaResend(data: ReservaEmailData): Promise<{ success: boolean; message: string }> {
  console.log('📧 INICIANDO envío de email de reserva con Resend:', data.codigoReserva);
  
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY no está configurada');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Reserva - Hotel Paraíso Verde</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #047857); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .total { background: #10b981; color: white; padding: 15px; border-radius: 8px; text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
          <h1>¡Reserva Confirmada!</h1>
          <p>Hotel Paraíso Verde</p>
        </div>
        
        <div class="content">
          <h2>Estimado/a ${data.clienteNombre} ${data.clienteApellido},</h2>
          <p>¡Excelentes noticias! Tu reserva ha sido <strong>confirmada exitosamente</strong>.</p>
          
          <div class="info-box">
            <h3>📋 Detalles de tu Reserva</h3>
            <p><strong>Código:</strong> ${data.codigoReserva}</p>
            <p><strong>Check-in:</strong> ${new Date(data.fechaEntrada).toLocaleDateString('es-ES')}</p>
            <p><strong>Check-out:</strong> ${new Date(data.fechaSalida).toLocaleDateString('es-ES')}</p>
            <p><strong>Huéspedes:</strong> ${data.numeroHuespedes} persona(s)</p>
            <p><strong>Habitaciones:</strong> ${data.habitaciones.length}</p>
          </div>
          
          <div class="total">
            💰 Total: $${data.precioTotal.toFixed(2)}
          </div>
          
          <p>¡Esperamos darte la bienvenida muy pronto!</p>
          <p>Atentamente,<br><strong>Equipo Hotel Paraíso Verde</strong></p>
        </div>
        
        <div class="footer">
          <p><strong>Hotel Paraíso Verde</strong></p>
          <p>📧 reservas@hotelparaiso.com | 📞 +593-7-123-4567</p>
        </div>
      </body>
      </html>
    `;

    const asunto = data.estado === 'confirmada' 
      ? `✅ Reserva Confirmada - ${data.codigoReserva} - Hotel Paraíso Verde`
      : `❌ Reserva Cancelada - ${data.codigoReserva} - Hotel Paraíso Verde`;

    console.log('📧 Enviando email con Resend a:', data.clienteEmail);
    
    const result = await resend.emails.send({
      from: 'Hotel Paraíso Verde <reservas@hotelparaiso.com>',
      to: data.clienteEmail,
      subject: asunto,
      html: htmlContent
    });

    console.log('✅ Email de reserva enviado exitosamente con Resend, ID:', result.data?.id);
    
    return {
      success: true,
      message: `Email de ${data.estado} enviado exitosamente a ${data.clienteEmail}`
    };
    
  } catch (error) {
    console.error('❌ Error enviando email de reserva con Resend:', error);
    return {
      success: false,
      message: `Error al enviar email: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
} 