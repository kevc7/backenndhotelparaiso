# Script para probar la confirmación de reserva y envío de email
$backendUrl = "https://backenhotelparaiso.vercel.app"

Write-Host "🧪 PROBANDO CONFIRMACIÓN DE RESERVA Y EMAIL" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# 1. Verificar que el backend esté funcionando
Write-Host "`n1️⃣ Verificando que el backend esté funcionando..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/api/health" -Method GET
    Write-Host "✅ Backend funcionando: $($healthResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error conectando al backend: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Buscar una reserva pendiente para confirmar
Write-Host "`n2️⃣ Buscando reserva pendiente para confirmar..." -ForegroundColor Yellow
try {
    $reservasResponse = Invoke-RestMethod -Uri "$backendUrl/api/reservas" -Method GET
    $reservaPendiente = $reservasResponse.data | Where-Object { $_.estado -eq "pendiente" } | Select-Object -First 1
    
    if ($reservaPendiente) {
        Write-Host "✅ Reserva pendiente encontrada:" -ForegroundColor Green
        Write-Host "   - ID: $($reservaPendiente.id)" -ForegroundColor White
        Write-Host "   - Código: $($reservaPendiente.codigo_reserva)" -ForegroundColor White
        Write-Host "   - Cliente: $($reservaPendiente.cliente_nombre) $($reservaPendiente.cliente_apellido)" -ForegroundColor White
        Write-Host "   - Email: $($reservaPendiente.cliente_email)" -ForegroundColor White
    } else {
        Write-Host "❌ No se encontraron reservas pendientes" -ForegroundColor Red
        Write-Host "💡 Primero crea una reserva desde el frontend" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Error obteniendo reservas: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Confirmar la reserva
Write-Host "`n3️⃣ Confirmando reserva..." -ForegroundColor Yellow
$confirmacionData = @{
    estado = "confirmada"
    observaciones = "Reserva confirmada por staff - prueba de email"
} | ConvertTo-Json

try {
    $confirmacionResponse = Invoke-RestMethod -Uri "$backendUrl/api/reservas/$($reservaPendiente.id)" -Method PUT -Body $confirmacionData -ContentType "application/json"
    
    if ($confirmacionResponse.success) {
        Write-Host "✅ Reserva confirmada exitosamente!" -ForegroundColor Green
        Write-Host "📧 Email debería haberse enviado a: $($reservaPendiente.cliente_email)" -ForegroundColor Cyan
        Write-Host "🧾 Factura debería haberse generado automáticamente" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error confirmando reserva: $($confirmacionResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error en la petición de confirmación: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Verificar que la reserva se confirmó
Write-Host "`n4️⃣ Verificando estado de la reserva..." -ForegroundColor Yellow
try {
    $reservaActualizada = Invoke-RestMethod -Uri "$backendUrl/api/reservas/$($reservaPendiente.id)" -Method GET
    
    if ($reservaActualizada.data.estado -eq "confirmada") {
        Write-Host "✅ Reserva confirmada correctamente" -ForegroundColor Green
        Write-Host "📋 Estado actual: $($reservaActualizada.data.estado)" -ForegroundColor White
    } else {
        Write-Host "❌ La reserva no se confirmó correctamente" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error verificando reserva: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Verificar facturas generadas
Write-Host "`n5️⃣ Verificando facturas generadas..." -ForegroundColor Yellow
try {
    $facturasResponse = Invoke-RestMethod -Uri "$backendUrl/api/facturas?reserva_id=$($reservaPendiente.id)" -Method GET
    
    if ($facturasResponse.data -and $facturasResponse.data.Length -gt 0) {
        Write-Host "✅ Factura generada exitosamente:" -ForegroundColor Green
        Write-Host "   - Código: $($facturasResponse.data[0].codigo_factura)" -ForegroundColor White
        Write-Host "   - Estado: $($facturasResponse.data[0].estado)" -ForegroundColor White
    } else {
        Write-Host "⚠️ No se encontraron facturas para esta reserva" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error verificando facturas: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 PRUEBA COMPLETADA" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "📧 Verifica que el email llegó a: $($reservaPendiente.cliente_email)" -ForegroundColor Cyan
Write-Host "📋 Revisa los logs en Vercel para ver el proceso completo" -ForegroundColor Cyan
Write-Host "🔗 URL del backend: $backendUrl" -ForegroundColor Cyan 