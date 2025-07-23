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

  // Primero intentar con Puppeteer + Chromium
  try {
    return await generarPDFConPuppeteer(data);
  } catch (puppeteerError) {
    console.error('❌ Puppeteer falló, usando fallback PDFKit:', puppeteerError);
    return await generarPDFConPDFKit(data);
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
      ignoreHTTPSErrors: true,
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

// Función con PDFKit (fallback)
async function generarPDFConPDFKit(data: FacturaData): Promise<Buffer> {
  console.log('🚀 Intentando con PDFKit (fallback)...');
  const logoUrl = 'https://i.ibb.co/0jQw2nC/logo.png'; // Link directo de la imagen subida a ImgBB

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'portrait',
    margin: 40,
  });

  const logo = await fetch(logoUrl).then(res => res.arrayBuffer());
  doc.image(logo, {
    fit: [120, 50],
    align: 'center',
    valign: 'center',
  });

  doc.font('Helvetica-Bold').fontSize(24).text('HOTEL PARAÍSO VERDE', { align: 'center' });
  doc.font('Helvetica').fontSize(12).text('Machala, Ecuador', { align: 'center' });
  doc.font('Helvetica').fontSize(10).text('Tel: +593 4 123 4567 | Email: info@hotelparaiso.com', { align: 'center' });

  doc.moveDown();

  doc.font('Helvetica-Bold').text('FACTURA', { align: 'center' });
  doc.font('Helvetica').text(`N°: ${data.numeroFactura} | Fecha: ${data.fechaEmision}`, { align: 'center' });

  doc.moveDown();

  doc.font('Helvetica-Bold').text('Datos del Cliente', { align: 'left' });
  doc.font('Helvetica').text(`Nombre: ${data.cliente.nombre} ${data.cliente.apellido}`);
  doc.font('Helvetica').text(`Email: ${data.cliente.email}`);
  doc.font('Helvetica').text(`Teléfono: ${data.cliente.telefono}`);
  doc.font('Helvetica').text(`Documento: ${data.cliente.documento}`);

  doc.moveDown();

  doc.font('Helvetica-Bold').text('Detalles de la Reserva', { align: 'left' });
  doc.font('Helvetica').text(`Código: ${data.reserva.codigo}`);
  doc.font('Helvetica').text(`Check-in: ${data.reserva.fechaCheckin} | Check-out: ${data.reserva.fechaCheckout}`);

  doc.moveDown();

  doc.font('Helvetica-Bold').text('Habitaciones', { align: 'left' });
  doc.font('Helvetica').text('Habitación | Tipo | Precio/Noche | Días | Subtotal');
  data.habitaciones.forEach(h => {
    doc.font('Helvetica').text(`${h.numero} | ${h.tipo} | $${h.precioNoche.toFixed(2)} | ${h.dias} | $${h.subtotal.toFixed(2)}`);
  });

  doc.moveDown();

  doc.font('Helvetica-Bold').text('Totales', { align: 'right' });
  doc.font('Helvetica').text(`Subtotal: $${data.subtotal.toFixed(2)}`);
  doc.font('Helvetica').text(`Impuestos (19%): $${data.impuestos.toFixed(2)}`);
  doc.font('Helvetica-Bold').text(`TOTAL: $${data.total.toFixed(2)}`, { align: 'right' });

  doc.moveDown();

  doc.font('Helvetica-Bold').text('Factura generada por:', { align: 'right' });
  doc.font('Helvetica').text(`${data.staffNombre || ''}`);

  doc.moveDown();

  doc.font('Helvetica').text('Gracias por elegir Hotel Paraíso Verde', { align: 'center' });
  doc.font('Helvetica').text('Su satisfacción es nuestra prioridad', { align: 'center' });

  const buffers = [];
  for (let i = 0; i < doc.bufferedPageRange.pageCount; i++) {
    buffers.push(doc.bufferedPageRange.getPage(i).stream.buffer);
  }
  return Buffer.concat(buffers);
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