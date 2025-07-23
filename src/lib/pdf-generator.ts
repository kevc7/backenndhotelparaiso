import PDFDocument from 'pdfkit';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import path from 'path';
import fs from 'fs';

interface FacturaData {
  numeroFactura: string;
  fechaEmision: string;
  cliente: {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    documento: string;
  };
  reserva: {
    codigo: string;
    fechaCheckin: string;
    fechaCheckout: string;
    total: number;
  };
  habitaciones: Array<{
    numero: string;
    tipo: string;
    precioNoche: number;
    dias: number;
    subtotal: number;
  }>;
  subtotal: number;
  impuestos: number;
  total: number;
  staffNombre?: string; // Added for staff name
}

// Función para convertir imagen a base64
function getLogoAsBase64(): string {
  try {
    const logoPath = path.resolve(process.cwd(), 'public/logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    const base64 = logoBuffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error leyendo logo:', error);
    // Fallback: usar un placeholder o logo por defecto
    return '';
  }
}

export async function generarFacturaPDF(data: FacturaData): Promise<Buffer> {
  console.log('🔄 INICIANDO generación de PDF...');
  console.log('📋 Datos recibidos:', {
    numeroFactura: data.numeroFactura,
    cliente: data.cliente?.nombre,
    habitaciones: data.habitaciones?.length,
    total: data.total
  });

  // Usar PDFKit como opción principal (más confiable en Vercel)
  try {
    console.log('🚀 Usando PDFKit para máxima compatibilidad...');
    return await generarPDFConPDFKit(data);
  } catch (pdfKitError) {
    console.error('❌ PDFKit falló, intentando Puppeteer:', pdfKitError);
    return await generarPDFConPuppeteer(data);
  }
}

// Función con Puppeteer (original)
async function generarPDFConPuppeteer(data: FacturaData): Promise<Buffer> {
  console.log('🚀 Intentando con Puppeteer + Chromium...');

  // Usar el link directo de la imagen subida
  const logoUrl = 'https://i.ibb.co/0jQw2nC/logo.png'; // Link directo de la imagen subida a ImgBB
  
  // Plantilla HTML básica para la factura
  const html = `
  <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; }
        .logo { width: 120px; margin-bottom: 10px; }
        .title { font-size: 2em; color: #2E7D32; margin-bottom: 0; }
        .subtitle { color: #666; margin-top: 0; }
        .section { margin-top: 30px; }
        .section-title { color: #2E7D32; font-weight: bold; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #E0E0E0; padding: 8px; text-align: left; }
        th { background: #2E7D32; color: #fff; }
        .totals { text-align: right; margin-top: 20px; }
        .totals strong { color: #2E7E32; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 0.9em; }
        .staff { margin-top: 20px; color: #2E7D32; font-size: 1em; text-align: right; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${logoUrl}" class="logo" />
        <div class="title">HOTEL PARAÍSO VERDE</div>
        <div class="subtitle">Machala, Ecuador<br>Tel: +593 4 123 4567 | Email: info@hotelparaiso.com</div>
      </div>
      <div class="section">
        <div class="section-title">FACTURA</div>
        <div><strong>N°:</strong> ${data.numeroFactura} &nbsp;&nbsp; <strong>Fecha:</strong> ${data.fechaEmision}</div>
      </div>
      <div class="section">
        <div class="section-title">Datos del Cliente</div>
        <div><strong>Nombre:</strong> ${data.cliente.nombre} ${data.cliente.apellido}</div>
        <div><strong>Email:</strong> ${data.cliente.email}</div>
        <div><strong>Teléfono:</strong> ${data.cliente.telefono}</div>
        <div><strong>Documento:</strong> ${data.cliente.documento}</div>
      </div>
      <div class="section">
        <div class="section-title">Detalles de la Reserva</div>
        <div><strong>Código:</strong> ${data.reserva.codigo}</div>
        <div><strong>Check-in:</strong> ${data.reserva.fechaCheckin} &nbsp;&nbsp; <strong>Check-out:</strong> ${data.reserva.fechaCheckout}</div>
      </div>
      <div class="section">
        <div class="section-title">Habitaciones</div>
        <table>
          <thead>
            <tr>
              <th>Habitación</th>
              <th>Tipo</th>
              <th>Precio/Noche</th>
              <th>Días</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${data.habitaciones.map(h => `
              <tr>
                <td>${h.numero}</td>
                <td>${h.tipo}</td>
                <td>$${h.precioNoche.toFixed(2)}</td>
                <td>${h.dias}</td>
                <td>$${h.subtotal.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="totals">
        <div>Subtotal: <strong>$${data.subtotal.toFixed(2)}</strong></div>
        <div>Impuestos (19%): <strong>$${data.impuestos.toFixed(2)}</strong></div>
        <div style="font-size:1.2em;">TOTAL: <strong>$${data.total.toFixed(2)}</strong></div>
      </div>
      <div class="staff">
        Factura generada por: <strong>${data.staffNombre || ''}</strong>
      </div>
      <div class="footer">
        Gracias por elegir Hotel Paraíso Verde<br>
        Su satisfacción es nuestra prioridad
      </div>
    </body>
  </html>
  `;

  console.log('🚀 Iniciando Puppeteer...');
  try {
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    console.log('✅ Puppeteer iniciado correctamente');

    const page = await browser.newPage();
    console.log('📄 Página creada, cargando HTML...');
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    console.log('✅ HTML cargado correctamente');
    
    console.log('🔄 Generando PDF...');
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 40, bottom: 40, left: 40, right: 40 } });
    console.log('✅ PDF generado, tamaño:', pdfBuffer.length, 'bytes');
    
    await browser.close();
    console.log('🎉 PDF completado exitosamente');
    
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('❌ ERROR en generación de PDF:', error);
    throw error;
  }
}

// Función con PDFKit (fallback confiable)
async function generarPDFConPDFKit(data: FacturaData): Promise<Buffer> {
  console.log('🚀 Intentando con PDFKit (fallback)...');

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log('✅ PDF generado con PDFKit, tamaño:', pdfBuffer.length, 'bytes');
        resolve(pdfBuffer);
      });

      // Header - Hotel Info
      doc.fontSize(20).fillColor('#2E7D32').text('HOTEL PARAÍSO VERDE', 50, 50);
      doc.fontSize(12).fillColor('#666').text('Machala, Ecuador', 50, 75);
      doc.text('Tel: +593 4 123 4567 | Email: info@hotelparaiso.com', 50, 90);

      // Factura Info
      doc.fontSize(16).fillColor('#2E7D32').text('FACTURA', 400, 50);
      doc.fontSize(12).fillColor('#000')
         .text(`N°: ${data.numeroFactura}`, 400, 75)
         .text(`Fecha: ${data.fechaEmision}`, 400, 90);

      // Cliente Info
      doc.fontSize(14).fillColor('#2E7D32').text('Datos del Cliente', 50, 130);
      doc.fontSize(12).fillColor('#000')
         .text(`Nombre: ${data.cliente.nombre} ${data.cliente.apellido}`, 50, 150)
         .text(`Email: ${data.cliente.email}`, 50, 165)
         .text(`Teléfono: ${data.cliente.telefono}`, 50, 180)
         .text(`Documento: ${data.cliente.documento}`, 50, 195);

      // Reserva Info
      doc.fontSize(14).fillColor('#2E7D32').text('Detalles de la Reserva', 50, 220);
      doc.fontSize(12).fillColor('#000')
         .text(`Código: ${data.reserva.codigo}`, 50, 240)
         .text(`Check-in: ${data.reserva.fechaCheckin}`, 50, 255)
         .text(`Check-out: ${data.reserva.fechaCheckout}`, 50, 270);

      // Tabla de habitaciones
      let yPos = 300;
      doc.fontSize(14).fillColor('#2E7D32').text('Habitaciones', 50, yPos);
      yPos += 25;

      // Headers de tabla
      doc.fontSize(12).fillColor('#fff');
      doc.rect(50, yPos, 500, 20).fill('#2E7D32');
      doc.text('Habitación', 60, yPos + 5);
      doc.text('Tipo', 160, yPos + 5);
      doc.text('Días', 260, yPos + 5);
      doc.text('Precio/Noche', 320, yPos + 5);
      doc.text('Subtotal', 450, yPos + 5);
      yPos += 25;

      // Filas de habitaciones
      doc.fillColor('#000');
      data.habitaciones.forEach((hab, index) => {
        const bgColor = index % 2 === 0 ? '#f5f5f5' : '#fff';
        doc.rect(50, yPos, 500, 20).fill(bgColor);
        doc.fillColor('#000')
           .text(hab.numero, 60, yPos + 5)
           .text(hab.tipo, 160, yPos + 5)
           .text(hab.dias.toString(), 260, yPos + 5)
           .text(`$${hab.precioNoche.toFixed(2)}`, 320, yPos + 5)
           .text(`$${hab.subtotal.toFixed(2)}`, 450, yPos + 5);
        yPos += 25;
      });

      // Totales
      yPos += 20;
      doc.fontSize(12)
         .text(`Subtotal: $${data.subtotal.toFixed(2)}`, 350, yPos)
         .text(`Impuestos (19%): $${data.impuestos.toFixed(2)}`, 350, yPos + 15)
         .fontSize(14).fillColor('#2E7D32')
         .text(`TOTAL: $${data.total.toFixed(2)}`, 350, yPos + 35);

      // Staff info
      if (data.staffNombre) {
        doc.fontSize(10).fillColor('#666')
           .text(`Factura generada por: ${data.staffNombre}`, 350, yPos + 70);
      }

      // Footer
      doc.fontSize(10).fillColor('#666')
         .text('Gracias por elegir Hotel Paraíso Verde', 50, yPos + 100)
         .text('Su satisfacción es nuestra prioridad', 50, yPos + 115);

      doc.end();

    } catch (error) {
      console.error('❌ Error en PDFKit:', error);
      reject(error);
    }
  });
}

// Las funciones de número de factura e impuestos siguen igual
export function generarNumeroFactura(): string {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-4);
  return `FAC-${año}${mes}${dia}-${timestamp}`;
}

export function calcularImpuestos(subtotal: number): number {
  return subtotal * 0.19; // 19% IVA ecuatoriano
} 