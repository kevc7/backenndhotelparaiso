# Script simple para probar facturas en produccion
$BASE_URL = "https://backenndhotelparaiso.vercel.app"

Write-Host "=== PRUEBA FACTURAS PRODUCCION ===" -ForegroundColor Green

# 1. Verificar health
Write-Host "1. Verificando health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "$BASE_URL/api/health" -Method GET
    Write-Host "OK - Health: $($health.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "ERROR - Health falló: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Obtener reservas
Write-Host "2. Obteniendo reservas..." -ForegroundColor Yellow
try {
    $reservas = Invoke-WebRequest -Uri "$BASE_URL/api/reservas" -Method GET
    $reservasData = $reservas.Content | ConvertFrom-Json
    
    if ($reservasData.success) {
        Write-Host "OK - Reservas: $($reservasData.data.Count)" -ForegroundColor Green
        $reservaConfirmada = $reservasData.data | Where-Object { $_.estado -eq 'confirmada' } | Select-Object -First 1
        
        if ($reservaConfirmada) {
            Write-Host "ENCONTRADA - Reserva ID: $($reservaConfirmada.id)" -ForegroundColor Green
        } else {
            Write-Host "ERROR - No hay reservas confirmadas" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "ERROR - No se obtuvieron reservas" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR - Reservas falló: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Obtener staff
Write-Host "3. Obteniendo staff..." -ForegroundColor Yellow
try {
    $usuarios = Invoke-WebRequest -Uri "$BASE_URL/api/usuarios" -Method GET
    $usuariosData = $usuarios.Content | ConvertFrom-Json
    
    if ($usuariosData.success) {
        Write-Host "OK - Usuarios: $($usuariosData.data.Count)" -ForegroundColor Green
        $staff = $usuariosData.data | Where-Object { $_.rol -eq 'staff' -or $_.rol -eq 'admin' } | Select-Object -First 1
        
        if ($staff) {
            Write-Host "ENCONTRADO - Staff ID: $($staff.id)" -ForegroundColor Green
        } else {
            Write-Host "ERROR - No hay staff" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "ERROR - No se obtuvieron usuarios" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR - Staff falló: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Generar factura
Write-Host "4. Generando factura..." -ForegroundColor Yellow
$body = @{
    reserva_id = $reservaConfirmada.id
    staff_id = $staff.id
} | ConvertTo-Json

Write-Host "Datos: Reserva $($reservaConfirmada.id), Staff $($staff.id)" -ForegroundColor Gray

try {
    $facturaResponse = Invoke-WebRequest -Uri "$BASE_URL/api/facturas" -Method POST -Body $body -ContentType "application/json" -Headers @{"x-internal-call"="true"}
    $facturaData = $facturaResponse.Content | ConvertFrom-Json
    
    if ($facturaData.success) {
        Write-Host "EXITO - Factura generada!" -ForegroundColor Green
        Write-Host "Codigo: $($facturaData.data.codigo_factura)" -ForegroundColor Cyan
        if ($facturaData.data.pdfUrl) {
            Write-Host "PDF URL: $($facturaData.data.pdfUrl)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "ERROR - Factura falló: $($facturaData.message)" -ForegroundColor Red
        if ($facturaData.error) {
            Write-Host "Error tecnico: $($facturaData.error)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "ERROR - Peticion falló: $($_.Exception.Message)" -ForegroundColor Red
    
    # Mostrar detalles del error
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorContent = $reader.ReadToEnd()
            Write-Host "Respuesta: $errorContent" -ForegroundColor Red
        } catch {
            Write-Host "No se pudo leer la respuesta de error" -ForegroundColor Red
        }
    }
}

Write-Host "=== FIN PRUEBA ===" -ForegroundColor Green 