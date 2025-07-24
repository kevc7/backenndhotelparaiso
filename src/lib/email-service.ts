import nodemailer from 'nodemailer';

// Configuración del transportador de email
function createEmailTransporter() {
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

// Template HTML para email de confirmación
function getConfirmacionTemplate(data: ReservaEmailData): string {
  const fechaEntradaFormateada = new Date(data.fechaEntrada).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const fechaSalidaFormateada = new Date(data.fechaSalida).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Reserva - Hotel Paraíso Verde</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #10b981, #047857);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
          border: 1px solid #e5e7eb;
        }
        .reserva-info {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #10b981;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .precio-total {
          background: #10b981;
          color: white;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding: 20px;
          background: #f3f4f6;
          border-radius: 8px;
          color: #6b7280;
        }
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
        
        <div class="reserva-info">
          <h3>📋 Detalles de tu Reserva</h3>
          
          <div class="info-row">
            <span><strong>Código de Reserva:</strong></span>
            <span><strong>${data.codigoReserva}</strong></span>
          </div>
          
          <div class="info-row">
            <span><strong>📅 Check-in:</strong></span>
            <span>${fechaEntradaFormateada}</span>
          </div>
          
          <div class="info-row">
            <span><strong>📅 Check-out:</strong></span>
            <span>${fechaSalidaFormateada}</span>
          </div>
          
          <div class="info-row">
            <span><strong>👥 Huéspedes:</strong></span>
            <span>${data.numeroHuespedes} persona(s)</span>
          </div>
          
          <div class="info-row">
            <span><strong>🏨 Habitaciones:</strong></span>
            <span>${data.habitaciones.length} habitación(es)</span>
          </div>
        </div>
        
        <div class="precio-total">
          💰 Total de la Reserva: $${data.precioTotal.toFixed(2)}
        </div>
        
        <p>¡Esperamos darte la bienvenida muy pronto!</p>
        
        <p>Atentamente,<br>
        <strong>Equipo Hotel Paraíso Verde</strong></p>
      </div>
      
      <div class="footer">
        <p><strong>Hotel Paraíso Verde</strong></p>
        <p>📧 info@hotelparaisoverde.com | 📞 +593-7-123-4567</p>
        <p>📍 Machala, Ecuador</p>
      </div>
    </body>
    </html>
  `;
}

// Template HTML para email de factura
function getFacturaTemplate(data: FacturaEmailData): string {
  const fechaEmisionFormateada = new Date(data.fechaEmision).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Factura - Hotel Paraíso Verde</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #059669, #047857);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
          border: 1px solid #e5e7eb;
        }
        .factura-info {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #059669;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .total-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border: 2px solid #059669;
        }
        .total-final {
          display: flex;
          justify-content: space-between;
          margin: 15px 0 0 0;
          padding: 15px 0;
          border-top: 2px solid #059669;
          font-size: 20px;
          font-weight: bold;
          color: #059669;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding: 20px;
          background: #f3f4f6;
          border-radius: 8px;
          color: #6b7280;
        }
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
        
        <div class="factura-info">
          <h3>📋 Información de la Factura</h3>
          
          <div class="info-row">
            <span><strong>Número de Factura:</strong></span>
            <span><strong>${data.numeroFactura}</strong></span>
          </div>
          
          <div class="info-row">
            <span><strong>Fecha de Emisión:</strong></span>
            <span>${fechaEmisionFormateada}</span>
          </div>
          
          <div class="info-row">
            <span><strong>Reserva Asociada:</strong></span>
            <span>${data.codigoReserva}</span>
          </div>
        </div>
        
        <div class="total-section">
          <h3>💰 Resumen de Pago</h3>
          
          <div class="info-row">
            <span>Subtotal:</span>
            <span>$${data.subtotal.toFixed(2)}</span>
          </div>
          
          <div class="info-row">
            <span>Impuestos (19% IVA):</span>
            <span>$${data.impuestos.toFixed(2)}</span>
          </div>
          
          <div class="total-final">
            <span>TOTAL:</span>
            <span>$${data.total.toFixed(2)}</span>
          </div>
        </div>
        
        <p>¡Gracias por elegirnos!</p>
        
        <p>Atentamente,<br>
        <strong>Equipo Hotel Paraíso Verde</strong></p>
      </div>
      
      <div class="footer">
        <p><strong>Hotel Paraíso Verde</strong></p>
        <p>📧 facturacion@hotelparaisoverde.com</p>
      </div>
    </body>
    </html>
  `;
}

// Función principal para enviar email de confirmación/cancelación
export async function enviarEmailReserva(data: ReservaEmailData): Promise<{ success: boolean; message: string }> {
  try {
    console.log('📧 INICIANDO envío de email para reserva:', data.codigoReserva);
    
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
    console.log('📋 Asunto:', asunto);
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado exitosamente');
    console.log('📋 ID del mensaje:', result.messageId);
    
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
  try {
    console.log('📧 INICIANDO envío de factura por email:', data.numeroFactura);
    
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
    
    console.log('📧 Enviando factura por email a:', data.clienteEmail);
    console.log('📋 Asunto:', asunto);
    console.log('📎 PDF adjunto:', `factura_${data.numeroFactura}.pdf`, 'Tamaño:', pdfBuffer.length, 'bytes');
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Factura enviada por email exitosamente');
    console.log('📋 ID del mensaje:', result.messageId);
    
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