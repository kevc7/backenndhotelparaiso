# Script para probar el flujo completo de facturación
Write-Host "=== PRUEBA DEL FLUJO COMPLETO DE FACTURACIÓN ===" -ForegroundColor Green

# 1. Verificar que el backend esté funcionando
Write-Host "`n1. Verificando backend..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET
    if ($health.StatusCode -eq 200) {
        Write-Host "✅ Backend funcionando correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend no responde correctamente" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error conectando al backend: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Obtener una reserva existente para probar
Write-Host "`n2. Obteniendo reservas existentes..." -ForegroundColor Yellow
try {
    $reservas = Invoke-WebRequest -Uri "http://localhost:3000/api/reservas" -Method GET
    $reservasData = $reservas.Content | ConvertFrom-Json
    
    if ($reservasData.success -and $reservasData.data.Count -gt 0) {
        $reserva = $reservasData.data[0]
        Write-Host "✅ Reserva encontrada: $($reserva.codigo_reserva) - Estado: $($reserva.estado)" -ForegroundColor Green
        Write-Host "   Cliente: $($reserva.cliente_nombre) $($reserva.cliente_apellido)" -ForegroundColor Cyan
        Write-Host "   Total: $$($reserva.total_estimado)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ No hay reservas disponibles para probar" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error obteniendo reservas: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Obtener un usuario staff para la prueba
Write-Host "`n3. Obteniendo usuarios staff..." -ForegroundColor Yellow
try {
    $usuarios = Invoke-WebRequest -Uri "http://localhost:3000/api/usuarios" -Method GET
    $usuariosData = $usuarios.Content | ConvertFrom-Json
    
    if ($usuariosData.success -and $usuariosData.data.Count -gt 0) {
        $staff = $usuariosData.data | Where-Object { $_.rol -eq 'admin' -or $_.rol -eq 'staff' } | Select-Object -First 1
        if ($staff) {
            Write-Host "✅ Staff encontrado: $($staff.nombre) $($staff.apellido) - ID: $($staff.id)" -ForegroundColor Green
        } else {
            Write-Host "❌ No hay usuarios staff disponibles" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ No hay usuarios disponibles" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error obteniendo usuarios: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Verificar si la reserva ya tiene factura
Write-Host "`n4. Verificando si la reserva ya tiene factura..." -ForegroundColor Yellow
try {
    $facturas = Invoke-WebRequest -Uri "http://localhost:3000/api/facturas?reserva_id=$($reserva.id)" -Method GET
    $facturasData = $facturas.Content | ConvertFrom-Json
    
    if ($facturasData.success -and $facturasData.data.Count -gt 0) {
        Write-Host "⚠️  La reserva ya tiene una factura generada" -ForegroundColor Yellow
        Write-Host "   Factura: $($facturasData.data[0].codigo_factura)" -ForegroundColor Cyan
        Write-Host "   Estado: $($facturasData.data[0].estado)" -ForegroundColor Cyan
        Write-Host "   PDF URL: $($facturasData.data[0].pdf_url)" -ForegroundColor Cyan
    } else {
        Write-Host "✅ La reserva no tiene factura, procediendo a generar una..." -ForegroundColor Green
        
        # 5. Generar factura
        Write-Host "`n5. Generando factura..." -ForegroundColor Yellow
        $facturaBody = @{
            reserva_id = $reserva.id
            staff_id = $staff.id
        } | ConvertTo-Json
        
        $facturaResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/facturas" -Method POST -Body $facturaBody -ContentType "application/json" -Headers @{"x-internal-call"="true"}
        $facturaData = $facturaResponse.Content | ConvertFrom-Json
        
        if ($facturaData.success) {
            Write-Host "✅ Factura generada exitosamente!" -ForegroundColor Green
            Write-Host "   Código: $($facturaData.data.codigo_factura)" -ForegroundColor Cyan
            Write-Host "   Estado: $($facturaData.data.estado)" -ForegroundColor Cyan
            Write-Host "   PDF URL: $($facturaData.data.pdfUrl)" -ForegroundColor Cyan
            Write-Host "   Download URL: $($facturaData.data.downloadUrl)" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Error generando factura: $($facturaData.message)" -ForegroundColor Red
            if ($facturaData.error) {
                Write-Host "   Error: $($facturaData.error)" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "❌ Error verificando/generando factura: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorContent = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorContent)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Error body: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`n=== PRUEBA COMPLETADA ===" -ForegroundColor Green
Write-Host "Revisa los logs del servidor para más detalles si hay errores." -ForegroundColor Cyan 