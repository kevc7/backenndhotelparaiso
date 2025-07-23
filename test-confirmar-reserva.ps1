# Script para probar confirmacion de reserva y generacion de factura en BD
$BASE_URL = "https://backenndhotelparaiso.vercel.app"

Write-Host "=== PRUEBA CONFIRMACION RESERVA Y FACTURA EN BD ===" -ForegroundColor Green

# 1. Obtener reservas pendientes
Write-Host "1. Obteniendo reservas pendientes..." -ForegroundColor Yellow
try {
    $reservas = Invoke-WebRequest -Uri "$BASE_URL/api/reservas" -Method GET
    $reservasData = $reservas.Content | ConvertFrom-Json
    
    if ($reservasData.success) {
        $reservaPendiente = $reservasData.data | Where-Object { $_.estado -eq 'pendiente' } | Select-Object -First 1
        
        if ($reservaPendiente) {
            Write-Host "✅ Reserva pendiente encontrada: ID $($reservaPendiente.id)" -ForegroundColor Green
            Write-Host "   Cliente ID: $($reservaPendiente.cliente_id)" -ForegroundColor Cyan
            Write-Host "   Estado actual: $($reservaPendiente.estado)" -ForegroundColor Cyan
        } else {
            Write-Host "⚠️ No hay reservas pendientes, usando una confirmada para re-test" -ForegroundColor Yellow
            $reservaPendiente = $reservasData.data | Where-Object { $_.estado -eq 'confirmada' } | Select-Object -First 1
            if (!$reservaPendiente) {
                Write-Host "❌ No hay reservas disponibles" -ForegroundColor Red
                exit 1
            }
        }
    } else {
        Write-Host "❌ No se pudieron obtener reservas" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error obteniendo reservas: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Verificar facturas antes de confirmar
Write-Host "2. Verificando facturas existentes ANTES..." -ForegroundColor Yellow
try {
    $facturasBefore = Invoke-WebRequest -Uri "$BASE_URL/api/facturas?reserva_id=$($reservaPendiente.id)" -Method GET
    $facturasBeforeData = $facturasBefore.Content | ConvertFrom-Json
    
    if ($facturasBeforeData.success) {
        Write-Host "📊 Facturas ANTES: $($facturasBeforeData.data.Count)" -ForegroundColor Cyan
        if ($facturasBeforeData.data.Count -gt 0) {
            Write-Host "   Ya existe factura: $($facturasBeforeData.data[0].codigo_factura)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠️ Error verificando facturas antes: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Confirmar la reserva
Write-Host "3. Confirmando reserva..." -ForegroundColor Yellow
$body = @{
    estado = "confirmada"
} | ConvertTo-Json

try {
    $confirmResponse = Invoke-WebRequest -Uri "$BASE_URL/api/reservas/$($reservaPendiente.id)" -Method PUT -Body $body -ContentType "application/json"
    $confirmData = $confirmResponse.Content | ConvertFrom-Json
    
    if ($confirmData.success) {
        Write-Host "✅ Reserva confirmada exitosamente!" -ForegroundColor Green
        Write-Host "   Estado nuevo: $($confirmData.data.estado)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error confirmando reserva: $($confirmData.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error en petición de confirmación: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Esperar un momento para que se procese
Write-Host "4. Esperando procesamiento..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 5. Verificar facturas después de confirmar
Write-Host "5. Verificando facturas DESPUÉS..." -ForegroundColor Yellow
try {
    $facturasAfter = Invoke-WebRequest -Uri "$BASE_URL/api/facturas?reserva_id=$($reservaPendiente.id)" -Method GET
    $facturasAfterData = $facturasAfter.Content | ConvertFrom-Json
    
    if ($facturasAfterData.success) {
        Write-Host "📊 Facturas DESPUÉS: $($facturasAfterData.data.Count)" -ForegroundColor Cyan
        
        if ($facturasAfterData.data.Count -gt 0) {
            Write-Host "🎉 ¡FACTURA GENERADA EN BD!" -ForegroundColor Green
            $factura = $facturasAfterData.data[0]
            Write-Host "   Código: $($factura.codigo_factura)" -ForegroundColor Cyan
            Write-Host "   Estado: $($factura.estado)" -ForegroundColor Cyan
            Write-Host "   Subtotal: $($factura.subtotal)" -ForegroundColor Cyan
            Write-Host "   Total: $($factura.total)" -ForegroundColor Cyan
            Write-Host "   ✅ ¡Las tablas de BD ahora tienen datos!" -ForegroundColor Green
        } else {
            Write-Host "❌ NO se generó factura en BD" -ForegroundColor Red
            Write-Host "   Revisar logs del servidor para más detalles" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Error obteniendo facturas después: $($facturasAfterData.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error verificando facturas después: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== PRUEBA COMPLETADA ===" -ForegroundColor Green 