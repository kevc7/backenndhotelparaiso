import { jsPDF } from 'jspdf';

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
  staffNombre?: string;
}

export async function generarFacturaPDF(data: FacturaData): Promise<Buffer> {
  console.log('🔄 INICIANDO generación de PDF...');
  console.log('📋 Datos recibidos:', {
    numeroFactura: data.numeroFactura,
    cliente: data.cliente?.nombre,
    habitaciones: data.habitaciones?.length,
    total: data.total
  });

  console.log('🚀 Generando PDF con jsPDF...');

  try {
    const doc = new jsPDF();
    
    // Header - Hotel Info
    doc.setFontSize(20);
    doc.setTextColor(46, 125, 50); // Verde
    doc.text('HOTEL PARAÍSO VERDE', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(102, 102, 102); // Gris
    doc.text('Machala, Ecuador', 20, 30);
    doc.text('Tel: +593 4 123 4567 | Email: info@hotelparaiso.com', 20, 35);

    // Factura Info
    doc.setFontSize(16);
    doc.setTextColor(46, 125, 50); // Verde
    doc.text('FACTURA', 150, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0); // Negro
    doc.text(`N°: ${data.numeroFactura}`, 150, 30);
    doc.text(`Fecha: ${data.fechaEmision}`, 150, 35);

    // Cliente Info
    doc.setFontSize(14);
    doc.setTextColor(46, 125, 50); // Verde
    doc.text('Datos del Cliente', 20, 50);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0); // Negro
    doc.text(`Nombre: ${data.cliente.nombre} ${data.cliente.apellido}`, 20, 60);
    doc.text(`Email: ${data.cliente.email}`, 20, 65);
    doc.text(`Teléfono: ${data.cliente.telefono}`, 20, 70);
    doc.text(`Documento: ${data.cliente.documento}`, 20, 75);

    // Reserva Info
    doc.setFontSize(14);
    doc.setTextColor(46, 125, 50); // Verde
    doc.text('Detalles de la Reserva', 20, 90);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0); // Negro
    doc.text(`Código: ${data.reserva.codigo}`, 20, 100);
    doc.text(`Check-in: ${data.reserva.fechaCheckin}`, 20, 105);
    doc.text(`Check-out: ${data.reserva.fechaCheckout}`, 20, 110);

    // Tabla de habitaciones
    doc.setFontSize(14);
    doc.setTextColor(46, 125, 50); // Verde
    doc.text('Habitaciones', 20, 125);

    // Headers de tabla
    let yPos = 135;
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255); // Blanco
    doc.setFillColor(46, 125, 50); // Verde
    doc.rect(20, yPos, 170, 10, 'F');
    doc.text('Habitación', 25, yPos + 7);
    doc.text('Tipo', 60, yPos + 7);
    doc.text('Días', 100, yPos + 7);
    doc.text('Precio/Noche', 120, yPos + 7);
    doc.text('Subtotal', 160, yPos + 7);
    yPos += 15;

    // Filas de habitaciones
    doc.setTextColor(0, 0, 0); // Negro
    data.habitaciones.forEach((hab, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245); // Gris claro
        doc.rect(20, yPos - 3, 170, 10, 'F');
      }
      doc.text(hab.numero, 25, yPos + 4);
      doc.text(hab.tipo.substring(0, 15), 60, yPos + 4); // Truncar si es muy largo
      doc.text(hab.dias.toString(), 100, yPos + 4);
      doc.text(`$${hab.precioNoche.toFixed(2)}`, 120, yPos + 4);
      doc.text(`$${hab.subtotal.toFixed(2)}`, 160, yPos + 4);
      yPos += 12;
    });

    // Totales
    yPos += 10;
    doc.setFontSize(12);
    doc.text(`Subtotal: $${data.subtotal.toFixed(2)}`, 120, yPos);
    doc.text(`Impuestos (19%): $${data.impuestos.toFixed(2)}`, 120, yPos + 8);
    
    doc.setFontSize(14);
    doc.setTextColor(46, 125, 50); // Verde
    doc.text(`TOTAL: $${data.total.toFixed(2)}`, 120, yPos + 20);

    // Staff info
    if (data.staffNombre) {
      doc.setFontSize(10);
      doc.setTextColor(102, 102, 102); // Gris
      doc.text(`Factura generada por: ${data.staffNombre}`, 120, yPos + 35);
    }

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102); // Gris
    doc.text('Gracias por elegir Hotel Paraíso Verde', 20, yPos + 50);
    doc.text('Su satisfacción es nuestra prioridad', 20, yPos + 55);

    // Generar buffer
    const pdfArrayBuffer = doc.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    
    console.log('✅ PDF generado con jsPDF, tamaño:', pdfBuffer.length, 'bytes');
    return pdfBuffer;

  } catch (error) {
    console.error('❌ Error en jsPDF:', error);
    throw error;
  }
}

// Funciones auxiliares
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