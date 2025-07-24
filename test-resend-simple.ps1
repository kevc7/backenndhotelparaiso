# Script para probar Resend directamente con dominio personalizado
$backendUrl = "https://backenhotelparaiso.vercel.app"

Write-Host "🧪 PROBANDO RESEND CON DOMINIO PERSONALIZADO" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "📧 Dominio: hotelparaiso.com" -ForegroundColor Cyan
Write-Host "📧 Email: reservas@hotelparaiso.com" -ForegroundColor Cyan

# Datos de prueba
$testData = @{
    clienteNombre = "Kevin"
    clienteApellido = "Armijos"
    clienteEmail = "kevinarmijos588@gmail.com"
    codigoReserva = "RES-2025-000001"
    fechaEntrada = "2025-01-15"
    fechaSalida = "2025-01-17"
    metodoPago = "transferencia"
    monto = 150.00
    fechaPago = "2025-01-10"
    observaciones = "Pago realizado correctamente"
    fileName = "comprobante_test.pdf"
    driveLink = "https://drive.google.com/file/test"
}

Write-Host "`n📧 Enviando email de prueba..." -ForegroundColor Yellow
Write-Host "📧 Destinatario: $($testData.clienteEmail)" -ForegroundColor Cyan
Write-Host "📧 Remitente: reservas@hotelparaiso.com" -ForegroundColor Cyan
Write-Host "📧 Reserva: $($testData.codigoReserva)" -ForegroundColor Cyan

try {
    # Llamar al endpoint de prueba de email
    $response = Invoke-RestMethod -Uri "$backendUrl/api/test-email-resend" -Method POST -Body ($testData | ConvertTo-Json) -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ Email enviado exitosamente!" -ForegroundColor Green
        Write-Host "📧 Mensaje: $($response.message)" -ForegroundColor Green
        Write-Host "📧 Verifica tu bandeja de entrada y spam" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error enviando email: $($response.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error en la petición: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Asegúrate de que RESEND_API_KEY esté configurado en Vercel" -ForegroundColor Yellow
}

Write-Host "`n📋 Verifica tu email: $($testData.clienteEmail)" -ForegroundColor Cyan
Write-Host "📧 El email debe venir de: reservas@hotelparaiso.com" -ForegroundColor Cyan 