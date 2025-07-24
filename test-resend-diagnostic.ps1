# Script para diagnosticar problemas con Resend
$backendUrl = "https://backenhotelparaiso.vercel.app"

Write-Host "🔍 DIAGNÓSTICO DE RESEND" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

# 1. Verificar que el backend esté funcionando
Write-Host "`n1️⃣ Verificando que el backend esté funcionando..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/api/health" -Method GET
    Write-Host "✅ Backend funcionando: $($healthResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error conectando al backend: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Verificar configuración de variables de entorno
Write-Host "`n2️⃣ Verificando configuración de variables de entorno..." -ForegroundColor Yellow
try {
    $configResponse = Invoke-RestMethod -Uri "$backendUrl/api/test-email-resend" -Method POST -Body (@{
        clienteEmail = "test@example.com"
        codigoReserva = "TEST-001"
    } | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "📧 Configuración de Resend:" -ForegroundColor Cyan
    Write-Host "   - RESEND_API_KEY configurada: $($configResponse.config.hasResendKey)" -ForegroundColor White
    Write-Host "   - NODE_ENV: $($configResponse.config.nodeEnv)" -ForegroundColor White
    Write-Host "   - VERCEL_ENV: $($configResponse.config.vercelEnv)" -ForegroundColor White
    
    if (-not $configResponse.config.hasResendKey) {
        Write-Host "❌ RESEND_API_KEY no está configurada en Vercel" -ForegroundColor Red
        Write-Host "📋 Para configurar:" -ForegroundColor Yellow
        Write-Host "   1. Ve a https://vercel.com/dashboard" -ForegroundColor White
        Write-Host "   2. Selecciona tu proyecto backend" -ForegroundColor White
        Write-Host "   3. Settings > Environment Variables" -ForegroundColor White
        Write-Host "   4. Agrega RESEND_API_KEY" -ForegroundColor White
        Write-Host "   5. Obtén tu API key en https://resend.com" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "❌ Error verificando configuración: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Probar envío de email con dominio personalizado
Write-Host "`n3️⃣ Probando envío con dominio personalizado..." -ForegroundColor Yellow
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

try {
    Write-Host "📧 Enviando email de prueba..." -ForegroundColor Cyan
    Write-Host "📧 Destinatario: $($testData.clienteEmail)" -ForegroundColor White
    Write-Host "📧 Remitente: reservas@hotelparaiso.com" -ForegroundColor White
    Write-Host "📧 Reserva: $($testData.codigoReserva)" -ForegroundColor White
    
    $response = Invoke-RestMethod -Uri "$backendUrl/api/test-email-resend" -Method POST -Body ($testData | ConvertTo-Json) -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ Email enviado exitosamente!" -ForegroundColor Green
        Write-Host "📧 Mensaje: $($response.message)" -ForegroundColor Green
        Write-Host "📧 Verifica tu bandeja de entrada y spam" -ForegroundColor Yellow
        Write-Host "📧 Revisa los logs en Vercel para más detalles" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error enviando email: $($response.message)" -ForegroundColor Red
        Write-Host "📧 Configuración detectada:" -ForegroundColor Cyan
        Write-Host "   - RESEND_API_KEY: $($response.config.hasResendKey)" -ForegroundColor White
        Write-Host "   - NODE_ENV: $($response.config.nodeEnv)" -ForegroundColor White
        Write-Host "   - VERCEL_ENV: $($response.config.vercelEnv)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Error en la petición: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Verifica los logs en Vercel para más detalles" -ForegroundColor Yellow
}

# 4. Información adicional
Write-Host "`n4️⃣ Información adicional:" -ForegroundColor Yellow
Write-Host "📧 Dominio configurado en Resend: hotelparaiso.com" -ForegroundColor Cyan
Write-Host "📧 Email de envío: reservas@hotelparaiso.com" -ForegroundColor Cyan
Write-Host "📧 Verifica que el dominio esté verificado en Resend" -ForegroundColor White
Write-Host "📧 Si el dominio no está verificado, usa onboarding@resend.dev" -ForegroundColor White

Write-Host "`n🎯 Próximos pasos:" -ForegroundColor Green
Write-Host "1. Verifica tu email: $($testData.clienteEmail)" -ForegroundColor White
Write-Host "2. Revisa la carpeta de spam" -ForegroundColor White
Write-Host "3. Verifica los logs en Vercel" -ForegroundColor White
Write-Host "4. Si no llega, verifica la configuración del dominio en Resend" -ForegroundColor White

Write-Host "`n🔗 URLs útiles:" -ForegroundColor Cyan
Write-Host "📧 Resend Dashboard: https://resend.com/domains" -ForegroundColor White
Write-Host "📧 Vercel Dashboard: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "📧 Logs de Vercel: vercel logs" -ForegroundColor White 