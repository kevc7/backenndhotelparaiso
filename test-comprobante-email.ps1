# Script para probar el envío de email de comprobante
$backendUrl = "https://backenhotelparaiso.vercel.app"

Write-Host "🧪 PROBANDO ENVÍO DE EMAIL DE COMPROBANTE" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# 1. Crear un cliente de prueba
Write-Host "`n1️⃣ Creando cliente de prueba..." -ForegroundColor Yellow
$clienteData = @{
    nombre = "Juan"
    apellido = "Pérez"
    email = "juan.perez@test.com"
    password = "123456"
    telefono = "0991234567"
    documento_identidad = "1234567890"
    tipo_documento = "cedula"
    fecha_nacimiento = "1990-01-01"
} | ConvertTo-Json

try {
    $clienteResponse = Invoke-RestMethod -Uri "$backendUrl/api/clientes" -Method POST -Body $clienteData -ContentType "application/json"
    $clienteId = $clienteResponse.data.id
    Write-Host "✅ Cliente creado con ID: $clienteId" -ForegroundColor Green
} catch {
    Write-Host "❌ Error creando cliente: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Crear una reserva de prueba
Write-Host "`n2️⃣ Creando reserva de prueba..." -ForegroundColor Yellow
$reservaData = @{
    cliente_id = $clienteId
    fecha_entrada = "2025-07-25"
    fecha_salida = "2025-07-26"
    numero_huespedes = 2
    habitaciones = @(1)
} | ConvertTo-Json

try {
    $reservaResponse = Invoke-RestMethod -Uri "$backendUrl/api/reservas" -Method POST -Body $reservaData -ContentType "application/json"
    $reservaId = $reservaResponse.data.id
    Write-Host "✅ Reserva creada con ID: $reservaId" -ForegroundColor Green
} catch {
    Write-Host "❌ Error creando reserva: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Crear un archivo de prueba (comprobante)
Write-Host "`n3️⃣ Creando archivo de comprobante de prueba..." -ForegroundColor Yellow
$testContent = "Este es un comprobante de pago de prueba para verificar el envío de email."
$testFilePath = "comprobante_test.txt"
$testContent | Out-File -FilePath $testFilePath -Encoding UTF8

# 4. Subir comprobante con email
Write-Host "`n4️⃣ Subiendo comprobante y enviando email..." -ForegroundColor Yellow
$formData = @{
    file = Get-Item $testFilePath
    reserva_id = $reservaId
    tipo_comprobante = "transferencia_bancaria"
    monto = "250.00"
    fecha_pago = "2025-07-24"
    observaciones = "Comprobante de prueba para verificar email"
}

try {
    $comprobanteResponse = Invoke-RestMethod -Uri "$backendUrl/api/comprobantes" -Method POST -Form $formData
    Write-Host "✅ Comprobante subido exitosamente" -ForegroundColor Green
    Write-Host "📧 Email debería haberse enviado a: juan.perez@test.com" -ForegroundColor Cyan
    Write-Host "📋 ID del comprobante: $($comprobanteResponse.data.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error subiendo comprobante: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📋 Respuesta completa: $($_.Exception.Response)" -ForegroundColor Red
}

# 5. Limpiar archivo de prueba
Write-Host "`n5️⃣ Limpiando archivo de prueba..." -ForegroundColor Yellow
if (Test-Path $testFilePath) {
    Remove-Item $testFilePath
    Write-Host "✅ Archivo de prueba eliminado" -ForegroundColor Green
}

Write-Host "`n🎉 PRUEBA COMPLETADA" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "📧 Verifica que el email llegó a: juan.perez@test.com" -ForegroundColor Cyan
Write-Host "📋 Revisa los logs en Vercel para ver el proceso completo" -ForegroundColor Cyan
Write-Host "🔗 URL del backend: $backendUrl" -ForegroundColor Cyan 