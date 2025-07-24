import nodemailer from 'nodemailer';

// Configuración del transportador de email
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // ej: hotelparaiso@gmail.com
      pass: process.env.EMAIL_APP_PASSWORD // Contraseña de aplicación de Gmail
    }
  });
};

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

// Template HTML para email de confirmación
const getConfirmacionTemplate = (data: ReservaEmailData) => {
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
        .info-label {
          font-weight: bold;
          color: #374151;
        }
        .info-value {
          color: #6b7280;
        }
        .habitaciones {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .habitacion-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
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
        .success-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
        .btn {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin: 10px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="success-icon">✅</div>
        <h1>¡Reserva Confirmada!</h1>
        <p>Hotel Paraíso Verde</p>
      </div>
      
      <div class="content">
        <h2>Estimado/a ${data.clienteNombre} ${data.clienteApellido},</h2>
        
        <p>¡Excelentes noticias! Tu reserva ha sido <strong>confirmada exitosamente</strong>. Nos complace informarte que tu estadía en el Hotel Paraíso Verde está garantizada.</p>
        
        <div class="reserva-info">
          <h3>📋 Detalles de tu Reserva</h3>
          
          <div class="info-row">
            <span class="info-label">Código de Reserva:</span>
            <span class="info-value"><strong>${data.codigoReserva}</strong></span>
          </div>
          
          <div class="info-row">
            <span class="info-label">📅 Check-in:</span>
            <span class="info-value">${fechaEntradaFormateada}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">📅 Check-out:</span>
            <span class="info-value">${fechaSalidaFormateada}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">👥 Número de Huéspedes:</span>
            <span class="info-value">${data.numeroHuespedes} persona(s)</span>
          </div>
        </div>
        
        <div class="habitaciones">
          <h3>🏨 Habitaciones Reservadas</h3>
          ${data.habitaciones.map(hab => `
            <div class="habitacion-item">
              <div>
                <strong>Habitación ${hab.numero}</strong><br>
                <small>${hab.tipo}</small>
              </div>
              <div>
                <strong>$${hab.precio.toFixed(2)}/noche</strong>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="precio-total">
          💰 Total de la Reserva: $${data.precioTotal.toFixed(2)}
        </div>
        
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">📋 Información Importante</h3>
          <ul style="color: #374151; margin: 0; padding-left: 20px;">
            <li>Tu reserva está confirmada y las habitaciones están separadas</li>
            <li>El check-in es a partir de las 3:00 PM</li>
            <li>El check-out es hasta las 12:00 PM</li>
            <li>Presenta este email o tu código de reserva al llegar</li>
            <li>Para cualquier cambio, contáctanos con al menos 24 horas de anticipación</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p>¿Tienes alguna pregunta sobre tu reserva?</p>
          <a href="mailto:info@hotelparaisoverde.com" class="btn">Contáctanos</a>
        </div>
        
        <p>¡Esperamos darte la bienvenida muy pronto al Hotel Paraíso Verde! Estamos seguros de que tendrás una experiencia inolvidable en nuestro refugio natural.</p>
        
        <p>Atentamente,<br>
        <strong>Equipo Hotel Paraíso Verde</strong></p>
      </div>
      
      <div class="footer">
        <p><strong>Hotel Paraíso Verde</strong></p>
        <p>📧 info@hotelparaisoverde.com | 📞 +593-7-123-4567</p>
        <p>📍 Machala, Ecuador</p>
        <p style="font-size: 12px; margin-top: 15px;">
          Este email fue enviado porque confirmamos tu reserva. Si tienes alguna consulta, no dudes en contactarnos.
        </p>
      </div>
    </body>
    </html>
  `;
};

// Template para email de cancelación
const getCancelacionTemplate = (data: ReservaEmailData) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reserva Cancelada - Hotel Paraíso Verde</title>
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
          background: linear-gradient(135deg, #dc2626, #991b1b);
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
        <h1>❌ Reserva Cancelada</h1>
        <p>Hotel Paraíso Verde</p>
      </div>
      
      <div class="content">
        <h2>Estimado/a ${data.clienteNombre} ${data.clienteApellido},</h2>
        
        <p>Lamentamos informarte que tu reserva <strong>${data.codigoReserva}</strong> ha sido cancelada.</p>
        
        <p>Si crees que esto es un error o necesitas más información, por favor contáctanos.</p>
        
        <p>Esperamos poder servirte en una futura oportunidad.</p>
        
        <p>Atentamente,<br>
        <strong>Equipo Hotel Paraíso Verde</strong></p>
      </div>
      
      <div class="footer">
        <p><strong>Hotel Paraíso Verde</strong></p>
        <p>📧 info@hotelparaisoverde.com | 📞 +593-7-123-4567</p>
      </div>
    </body>
    </html>
  `;
};

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

// Template HTML para email de factura
const getFacturaTemplate = (data: FacturaEmailData) => {
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
        .info-label {
          font-weight: bold;
          color: #374151;
        }
        .info-value {
          color: #6b7280;
        }
        .habitaciones-table {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          margin: 20px 0;
        }
        .table-header {
          background: #f3f4f6;
          padding: 15px;
          font-weight: bold;
          color: #374151;
        }
        .table-row {
          padding: 12px 15px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .total-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border: 2px solid #059669;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          font-size: 16px;
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
        .invoice-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
        .attachment-note {
          background: #dbeafe;
          border: 1px solid #93c5fd;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          color: #1e40af;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="invoice-icon">🧾</div>
        <h1>Tu Factura</h1>
        <p>Hotel Paraíso Verde</p>
      </div>
      
      <div class="content">
        <h2>Estimado/a ${data.clienteNombre} ${data.clienteApellido},</h2>
        
        <p>Te enviamos la factura correspondiente a tu estadía en el Hotel Paraíso Verde. ¡Gracias por elegirnos!</p>
        
        <div class="factura-info">
          <h3>📋 Información de la Factura</h3>
          
          <div class="info-row">
            <span class="info-label">Número de Factura:</span>
            <span class="info-value"><strong>${data.numeroFactura}</strong></span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Fecha de Emisión:</span>
            <span class="info-value">${fechaEmisionFormateada}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Reserva Asociada:</span>
            <span class="info-value">${data.codigoReserva}</span>
          </div>
        </div>
        
        <div class="habitaciones-table">
          <div class="table-header">
            🏨 Detalle de Servicios
          </div>
          ${data.habitaciones.map(hab => `
            <div class="table-row">
              <div>
                <strong>${hab.descripcion}</strong><br>
                <small>Cantidad: ${hab.cantidad} | Precio unitario: $${hab.precio.toFixed(2)}</small>
              </div>
              <div>
                <strong>$${hab.subtotal.toFixed(2)}</strong>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="total-section">
          <h3>💰 Resumen de Pago</h3>
          
          <div class="total-row">
            <span>Subtotal:</span>
            <span>$${data.subtotal.toFixed(2)}</span>
          </div>
          
          <div class="total-row">
            <span>Impuestos (19% IVA):</span>
            <span>$${data.impuestos.toFixed(2)}</span>
          </div>
          
          <div class="total-final">
            <span>TOTAL:</span>
            <span>$${data.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="attachment-note">
          <strong>📎 Archivo Adjunto</strong><br>
          Encontrarás la factura en formato PDF adjunta a este email para tu registro y archivo personal.
        </div>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 20px 0;">
          <h3 style="color: #166534; margin-top: 0;">✅ Información Importante</h3>
          <ul style="color: #374151; margin: 0; padding-left: 20px;">
            <li>Esta factura confirma el pago y los servicios recibidos</li>
            <li>Conserva este documento para tus registros</li>
            <li>En caso de necesitar una reimpresión, contáctanos</li>
            <li>Gracias por confiar en Hotel Paraíso Verde</li>
          </ul>
        </div>
        
        <p>Esperamos que hayas disfrutado tu estadía. ¡Te esperamos de nuevo pronto!</p>
        
        <p>Atentamente,<br>
        <strong>Equipo Hotel Paraíso Verde</strong><br>
        <em>Departamento de Contabilidad</em></p>
      </div>
      
      <div class="footer">
        <p><strong>Hotel Paraíso Verde</strong></p>
        <p>📧 facturacion@hotelparaisoverde.com | 📞 +593-7-123-4567</p>
        <p>📍 Machala, Ecuador</p>
        <p style="font-size: 12px; margin-top: 15px;">
          Este email contiene información fiscal importante. Conserva este documento para tus registros.
        </p>
      </div>
    </body>
    </html>
  `;
};

// Función principal para enviar email de confirmación/cancelación
export async function enviarEmailReserva(data: ReservaEmailData): Promise<{ success: boolean; message: string }> {
  try {
    console.log('📧 INICIANDO envío de email para reserva:', data.codigoReserva);
    
    const transporter = createTransporter();
    
    // Verificar configuración
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.error('❌ Configuración de email incompleta');
      return {
        success: false,
        message: 'Configuración de email no encontrada'
      };
    }
    
    const asunto = data.estado === 'confirmada' 
      ? `✅ Reserva Confirmada - ${data.codigoReserva} - Hotel Paraíso Verde`
      : `❌ Reserva Cancelada - ${data.codigoReserva} - Hotel Paraíso Verde`;
    
    const htmlContent = data.estado === 'confirmada' 
      ? getConfirmacionTemplate(data)
      : getCancelacionTemplate(data);
    
    const mailOptions = {
      from: {
        name: 'Hotel Paraíso Verde',
        address: process.env.EMAIL_USER!
      },
      to: data.clienteEmail,
      subject: asunto,
      html: htmlContent,
      attachments: []
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

// Función para enviar email de bienvenida al registrarse
export async function enviarEmailBienvenida(clienteEmail: string, clienteNombre: string): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createTransporter();
    
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
            <p>¡Gracias por registrarte en Hotel Paraíso Verde! Tu cuenta ha sido creada exitosamente.</p>
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

// Función para enviar factura por email
export async function enviarFacturaPorEmail(
  data: FacturaEmailData, 
  pdfBuffer: Buffer
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('📧 INICIANDO envío de factura por email:', data.numeroFactura);
    
    const transporter = createTransporter();
    
    // Verificar configuración
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.error('❌ Configuración de email incompleta');
      return {
        success: false,
        message: 'Configuración de email no encontrada'
      };
    }
    
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