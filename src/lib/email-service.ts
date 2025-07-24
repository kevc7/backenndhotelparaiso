import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Configuración del transportador de email (compatible con Vercel)
export function createEmailTransporter(): Transporter {
  console.log('🔧 Creando transportador de email...');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.error('❌ Variables de entorno de email no configuradas');
    throw new Error('EMAIL_USER y EMAIL_APP_PASSWORD son requeridos');
  }
  
  console.log('📧 Configurando Gmail SMTP para:', process.env.EMAIL_USER);
  
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
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

// Interfaz para datos de la factura
interface FacturaEmailData {
  clienteNombre: string;
  clienteApellido: string;
  clienteEmail: string;
  numeroFactura: string;
  codigoReserva: string;
  fechaEmision: string;
  subtotal: number;
  impuestos: number;
  total: number;
  habitaciones: Array<{
    descripcion: string;
    cantidad: number;
    precio: number;
    subtotal: number;
  }>;
}

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

// Template HTML simplificado para email de confirmación
function getConfirmacionTemplate(data: ReservaEmailData): string {
  return `
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
        <p>📧 info@hotelparaisoverde.com | 📞 +593-7-123-4567</p>
      </div>
    </body>
    </html>
  `;
}

// Template HTML simplificado para email de factura
function getFacturaTemplate(data: FacturaEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Factura - Hotel Paraíso Verde</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #059669, #047857); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
        .total-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #059669; }
        .total-final { padding: 15px 0; border-top: 2px solid #059669; font-size: 20px; font-weight: bold; color: #059669; text-align: right; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="font-size: 48px; margin-bottom: 15px;">🧾</div>
        <h1>Tu Factura</h1>
        <p>Hotel Paraíso Verde</p>
      </div>
      
      <div class="content">
        <h2>Estimado/a ${data.clienteNombre} ${data.clienteApellido},</h2>
        <p>Te enviamos la factura correspondiente a tu estadía.</p>
        
        <div class="info-box">
          <h3>📋 Información de la Factura</h3>
          <p><strong>Número:</strong> ${data.numeroFactura}</p>
          <p><strong>Fecha:</strong> ${new Date(data.fechaEmision).toLocaleDateString('es-ES')}</p>
          <p><strong>Reserva:</strong> ${data.codigoReserva}</p>
        </div>
        
        <div class="total-box">
          <h3>💰 Resumen de Pago</h3>
          <p>Subtotal: $${data.subtotal.toFixed(2)}</p>
          <p>Impuestos (19% IVA): $${data.impuestos.toFixed(2)}</p>
          <div class="total-final">TOTAL: $${data.total.toFixed(2)}</div>
        </div>
        
        <p>¡Gracias por elegirnos!</p>
        <p>Atentamente,<br><strong>Equipo Hotel Paraíso Verde</strong></p>
      </div>
      
      <div class="footer">
        <p><strong>Hotel Paraíso Verde</strong></p>
        <p>📧 facturacion@hotelparaisoverde.com</p>
      </div>
    </body>
    </html>
  `;
}

// Template HTML para email de comprobante
function getComprobanteTemplate(data: ComprobanteEmailData): string {
  return `
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
        <p>📧 reservas@hotelparaisoverde.com | 📞 +593-7-123-4567</p>
      </div>
    </body>
    </html>
  `;
}

// Función principal para enviar email de confirmación/cancelación
export async function enviarEmailReserva(data: ReservaEmailData): Promise<{ success: boolean; message: string }> {
  console.log('📧 INICIANDO envío de email para reserva:', data.codigoReserva);
  
  try {
    const transporter = createEmailTransporter();
    
    const asunto = data.estado === 'confirmada' 
      ? `✅ Reserva Confirmada - ${data.codigoReserva} - Hotel Paraíso Verde`
      : `❌ Reserva Cancelada - ${data.codigoReserva} - Hotel Paraíso Verde`;
    
    const htmlContent = getConfirmacionTemplate(data);
    
    const mailOptions = {
      from: {
        name: 'Hotel Paraíso Verde',
        address: process.env.EMAIL_USER!
      },
      to: data.clienteEmail,
      subject: asunto,
      html: htmlContent
    };
    
    console.log('📧 Enviando email a:', data.clienteEmail);
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado exitosamente, ID:', result.messageId);
    
    return {
      success: true,
      message: `Email de ${data.estado} enviado exitosamente a ${data.clienteEmail}`
    };
    
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    return {
      success: false,
      message: `Error al enviar email: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

// Función para enviar factura por email
export async function enviarFacturaPorEmail(
  data: FacturaEmailData, 
  pdfBuffer: Buffer
): Promise<{ success: boolean; message: string }> {
  console.log('📧 INICIANDO envío de factura por email:', data.numeroFactura);
  
  try {
    const transporter = createEmailTransporter();
    
    const asunto = `🧾 Tu Factura ${data.numeroFactura} - Hotel Paraíso Verde`;
    const htmlContent = getFacturaTemplate(data);
    
    const mailOptions = {
      from: {
        name: 'Hotel Paraíso Verde - Facturación',
        address: process.env.EMAIL_USER!
      },
      to: data.clienteEmail,
      subject: asunto,
      html: htmlContent,
      attachments: [
        {
          filename: `factura_${data.numeroFactura}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
    
    console.log('📧 Enviando factura a:', data.clienteEmail);
    console.log('📎 PDF adjunto:', pdfBuffer.length, 'bytes');
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Factura enviada exitosamente, ID:', result.messageId);
    
    return {
      success: true,
      message: `Factura ${data.numeroFactura} enviada exitosamente a ${data.clienteEmail}`
    };
    
  } catch (error) {
    console.error('❌ Error enviando factura por email:', error);
    return {
      success: false,
      message: `Error al enviar factura: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

// Función para enviar email de comprobante
export async function enviarEmailComprobante(data: ComprobanteEmailData): Promise<{ success: boolean; message: string }> {
  console.log('📧 INICIANDO envío de email de comprobante para reserva:', data.codigoReserva);
  
  try {
    const transporter = createEmailTransporter();
    
    const asunto = `📄 Comprobante Recibido - ${data.codigoReserva} - Hotel Paraíso Verde`;
    const htmlContent = getComprobanteTemplate(data);
    
    const mailOptions = {
      from: {
        name: 'Hotel Paraíso Verde - Reservas',
        address: process.env.EMAIL_USER!
      },
      to: data.clienteEmail,
      subject: asunto,
      html: htmlContent
    };
    
    console.log('📧 Enviando email de comprobante a:', data.clienteEmail);
    console.log('📋 Asunto:', asunto);
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email de comprobante enviado exitosamente, ID:', result.messageId);
    
    return {
      success: true,
      message: `Email de comprobante enviado exitosamente a ${data.clienteEmail}`
    };
    
  } catch (error) {
    console.error('❌ Error enviando email de comprobante:', error);
    return {
      success: false,
      message: `Error al enviar email de comprobante: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

// Función para enviar email de bienvenida
export async function enviarEmailBienvenida(clienteEmail: string, clienteNombre: string): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: {
        name: 'Hotel Paraíso Verde',
        address: process.env.EMAIL_USER!
      },
      to: clienteEmail,
      subject: '🌿 ¡Bienvenido a Hotel Paraíso Verde!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981, #047857); color: white; padding: 30px; text-align: center;">
            <h1>🌿 ¡Bienvenido!</h1>
            <p>Hotel Paraíso Verde</p>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2>Hola ${clienteNombre},</h2>
            <p>¡Gracias por registrarte en Hotel Paraíso Verde!</p>
            <p>Ahora puedes hacer reservas y disfrutar de nuestros servicios.</p>
            <p>¡Esperamos verte pronto!</p>
            <p>Atentamente,<br><strong>Equipo Hotel Paraíso Verde</strong></p>
          </div>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      message: 'Email de bienvenida enviado'
    };
  } catch (error) {
    console.error('Error enviando email de bienvenida:', error);
    return {
      success: false,
      message: 'Error al enviar email de bienvenida'
    };
  }
} 