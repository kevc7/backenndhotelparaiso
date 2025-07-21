# Script simple para probar generacion de facturas
Write-Host "=== PRUEBA DE GENERACION DE FACTURAS ===" -ForegroundColor Green

# 1. Verificar backend
Write-Host "1. Verificando backend..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET
    if ($health.StatusCode -eq 200) {
        Write-Host "OK - Backend funcionando" -ForegroundColor Green
    } else {
        Write-Host "ERROR - Backend no responde" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR - No se puede conectar al backend" -ForegroundColor Red
    exit 1
}

# 2. Obtener reservas
Write-Host "2. Obteniendo reservas..." -ForegroundColor Yellow
try {
    $reservas = Invoke-WebRequest -Uri "http://localhost:3000/api/reservas" -Method GET
    $reservasData = $reservas.Content | ConvertFrom-Json
    
    if ($reservasData.success -and $reservasData.data.Count -gt 0) {
        $reserva = $reservasData.data[0]
        Write-Host "OK - Reserva encontrada: $($reserva.codigo_reserva)" -ForegroundColor Green
    } else {
        Write-Host "ERROR - No hay reservas disponibles" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR - No se pueden obtener reservas" -ForegroundColor Red
    exit 1
}

# 3. Obtener usuarios staff
Write-Host "3. Obteniendo usuarios staff..." -ForegroundColor Yellow
try {
    $usuarios = Invoke-WebRequest -Uri "http://localhost:3000/api/usuarios" -Method GET
    $usuariosData = $usuarios.Content | ConvertFrom-Json
    
    if ($usuariosData.success -and $usuariosData.data.Count -gt 0) {
        $staff = $usuariosData.data | Where-Object { $_.rol -eq 'admin' -or $_.rol -eq 'staff' } | Select-Object -First 1
        if ($staff) {
            Write-Host "OK - Staff encontrado: $($staff.nombre) $($staff.apellido)" -ForegroundColor Green
        } else {
            Write-Host "ERROR - No hay usuarios staff" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "ERROR - No hay usuarios disponibles" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR - No se pueden obtener usuarios" -ForegroundColor Red
    exit 1
}

# 4. Verificar facturas existentes
Write-Host "4. Verificando facturas existentes..." -ForegroundColor Yellow
try {
    $facturas = Invoke-WebRequest -Uri "http://localhost:3000/api/facturas?reserva_id=$($reserva.id)" -Method GET
    $facturasData = $facturas.Content | ConvertFrom-Json
    
    if ($facturasData.success -and $facturasData.data.Count -gt 0) {
        Write-Host "INFO - La reserva ya tiene factura: $($facturasData.data[0].codigo_factura)" -ForegroundColor Yellow
    } else {
        Write-Host "OK - La reserva no tiene factura, generando una..." -ForegroundColor Green
        
        # 5. Generar factura
        Write-Host "5. Generando factura..." -ForegroundColor Yellow
        $facturaBody = @{
            reserva_id = $reserva.id
            staff_id = $staff.id
        } | ConvertTo-Json
        
        $facturaResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/facturas" -Method POST -Body $facturaBody -ContentType "application/json" -Headers @{"x-internal-call"="true"}
        $facturaData = $facturaResponse.Content | ConvertFrom-Json
        
        if ($facturaData.success) {
            Write-Host "EXITO - Factura generada!" -ForegroundColor Green
            Write-Host "  Codigo: $($facturaData.data.codigo_factura)" -ForegroundColor Cyan
            Write-Host "  Estado: $($facturaData.data.estado)" -ForegroundColor Cyan
            Write-Host "  PDF URL: $($facturaData.data.pdfUrl)" -ForegroundColor Cyan
        } else {
            Write-Host "ERROR - No se pudo generar factura: $($facturaData.message)" -ForegroundColor Red
            if ($facturaData.error) {
                Write-Host "  Error: $($facturaData.error)" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "ERROR - Problema con facturas: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== PRUEBA COMPLETADA ===" -ForegroundColor Green 