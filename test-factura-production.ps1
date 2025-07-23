# Script para probar generacion de facturas en PRODUCCION
Write-Host "=== PRUEBA DE GENERACION DE FACTURAS EN PRODUCCION ===" -ForegroundColor Green

$BASE_URL = "https://backenndhotelparaiso.vercel.app"

# 1. Verificar backend
Write-Host "1. Verificando backend desplegado..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "$BASE_URL/api/health" -Method GET
    if ($health.StatusCode -eq 200) {
        Write-Host "✅ Backend desplegado funcionando" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend no responde" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ No se puede conectar al backend: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Obtener reservas confirmadas
Write-Host "2. Obteniendo reservas confirmadas..." -ForegroundColor Yellow
try {
    $reservasResponse = Invoke-WebRequest -Uri "$BASE_URL/api/reservas" -Method GET
    $reservasData = $reservasResponse.Content | ConvertFrom-Json
    
    if ($reservasData.success -and $reservasData.data.Count -gt 0) {
        $reservaConfirmada = $reservasData.data | Where-Object { $_.estado -eq 'confirmada' } | Select-Object -First 1
        
        if ($reservaConfirmada) {
            Write-Host "✅ Reserva confirmada encontrada: ID $($reservaConfirmada.id)" -ForegroundColor Green
            Write-Host "   Cliente ID: $($reservaConfirmada.cliente_id)" -ForegroundColor Cyan
            Write-Host "   Estado: $($reservaConfirmada.estado)" -ForegroundColor Cyan
            Write-Host "   Total: $($reservaConfirmada.precio_total)" -ForegroundColor Cyan
        } else {
            Write-Host "⚠️  No hay reservas confirmadas disponibles" -ForegroundColor Yellow
            Write-Host "   Reservas encontradas: $($reservasData.data.Count)" -ForegroundColor Yellow
            $reservasData.data | ForEach-Object { Write-Host "   - ID: $($_.id), Estado: $($_.estado)" -ForegroundColor Gray }
            exit 1
        }
    } else {
        Write-Host "❌ No se pudieron obtener reservas" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error obteniendo reservas: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Obtener staff activo
Write-Host "3. Obteniendo usuarios staff..." -ForegroundColor Yellow
try {
    $usuariosResponse = Invoke-WebRequest -Uri "$BASE_URL/api/usuarios" -Method GET
    $usuariosData = $usuariosResponse.Content | ConvertFrom-Json
    
    if ($usuariosData.success -and $usuariosData.data.Count -gt 0) {
        $staff = $usuariosData.data | Where-Object { $_.rol -eq 'staff' -or $_.rol -eq 'admin' } | Select-Object -First 1
        
        if ($staff) {
            Write-Host "✅ Staff encontrado: $($staff.nombre) $($staff.apellido)" -ForegroundColor Green
            Write-Host "   ID: $($staff.id)" -ForegroundColor Cyan
            Write-Host "   Rol: $($staff.rol)" -ForegroundColor Cyan
        } else {
            Write-Host "❌ No hay staff disponible" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ No se pudieron obtener usuarios" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error obteniendo staff: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Verificar si ya existe factura para esta reserva
Write-Host "4. Verificando facturas existentes..." -ForegroundColor Yellow
try {
    $facturas = Invoke-WebRequest -Uri "$BASE_URL/api/facturas?reserva_id=$($reservaConfirmada.id)" -Method GET
    $facturasData = $facturas.Content | ConvertFrom-Json
    
    if ($facturasData.success -and $facturasData.data.Count -gt 0) {
        Write-Host "⚠️  La reserva ya tiene una factura generada" -ForegroundColor Yellow
        Write-Host "   Factura: $($facturasData.data[0].codigo_factura)" -ForegroundColor Cyan
        Write-Host "   Estado: $($facturasData.data[0].estado)" -ForegroundColor Cyan
        if ($facturasData.data[0].url_pdf) {
            Write-Host "   PDF URL: $($facturasData.data[0].url_pdf)" -ForegroundColor Cyan
        }
        Write-Host "   ✅ La factura ya existe en Drive!" -ForegroundColor Green
    } else {
        Write-Host "✅ La reserva no tiene factura, procediendo a generar una..." -ForegroundColor Green
        
        # 5. Generar factura
        Write-Host "`n5. Generando factura en producción..." -ForegroundColor Yellow
        $facturaBody = @{
            reserva_id = $reservaConfirmada.id
            staff_id = $staff.id
        } | ConvertTo-Json
        
        Write-Host "📋 Datos de la factura:" -ForegroundColor Gray
        Write-Host "   Reserva ID: $($reservaConfirmada.id)" -ForegroundColor Gray
        Write-Host "   Staff ID: $($staff.id)" -ForegroundColor Gray
        Write-Host "   Staff: $($staff.nombre) $($staff.apellido)" -ForegroundColor Gray
        
        try {
            Write-Host "🔄 Enviando petición a /api/facturas..." -ForegroundColor Yellow
            $facturaResponse = Invoke-WebRequest -Uri "$BASE_URL/api/facturas" -Method POST -Body $facturaBody -ContentType "application/json" -Headers @{"x-internal-call"="true"}
            $facturaData = $facturaResponse.Content | ConvertFrom-Json
            
            if ($facturaData.success) {
                Write-Host "🎉 ¡FACTURA GENERADA EXITOSAMENTE!" -ForegroundColor Green
                Write-Host "   Código: $($facturaData.data.codigo_factura)" -ForegroundColor Cyan
                Write-Host "   Estado: $($facturaData.data.estado)" -ForegroundColor Cyan
                if ($facturaData.data.pdfUrl) {
                    Write-Host "   PDF URL: $($facturaData.data.pdfUrl)" -ForegroundColor Cyan
                }
                if ($facturaData.data.downloadUrl) {
                    Write-Host "   Download URL: $($facturaData.data.downloadUrl)" -ForegroundColor Cyan
                }
                Write-Host "   ✅ Factura subida a Google Drive!" -ForegroundColor Green
            } else {
                Write-Host "❌ Error generando factura: $($facturaData.message)" -ForegroundColor Red
                if ($facturaData.error) {
                    Write-Host "   Error técnico: $($facturaData.error)" -ForegroundColor Red
                }
            }
        } catch {
            Write-Host "❌ Error en petición de factura: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.Exception.Response) {
                $errorResponse = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorResponse)
                $errorContent = $reader.ReadToEnd()
                Write-Host "   Respuesta del servidor: $errorContent" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "❌ Error verificando facturas: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== PRUEBA COMPLETADA ===" -ForegroundColor Green 