# Script de prueba para las APIs del Hotel Paraíso
# Asegúrate de que el servidor esté corriendo en localhost:3000

Write-Host "🏨 Probando APIs del Hotel Paraíso ERP Backend" -ForegroundColor Green
Write-Host "=" * 50

# 1. Probar Health Check
Write-Host "`n1️⃣ Probando Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
    Write-Host "✅ Health Check: $($health.message)" -ForegroundColor Green
    Write-Host "   Database: $($health.database.connected)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error en Health Check: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Crear tipos de habitación
Write-Host "`n2️⃣ Creando tipos de habitación..." -ForegroundColor Yellow

$tiposHabitacion = @(
    @{
        nombre = "Habitación Simple"
        descripcion = "Habitación individual con cama simple"
        capacidad_maxima = 1
        precio_base = 80.00
        servicios = "WiFi, TV, Baño privado"
    },
    @{
        nombre = "Habitación Doble"
        descripcion = "Habitación con cama matrimonial"
        capacidad_maxima = 2
        precio_base = 120.00
        servicios = "WiFi, TV, Baño privado, Aire acondicionado"
    },
    @{
        nombre = "Suite Familiar"
        descripcion = "Suite amplia para familias"
        capacidad_maxima = 4
        precio_base = 200.00
        servicios = "WiFi, TV, Baño privado, Aire acondicionado, Minibar, Balcón"
    }
)

$tiposCreados = @()
foreach ($tipo in $tiposHabitacion) {
    try {
        $body = $tipo | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/tipos-habitacion" -Method POST -ContentType "application/json" -Body $body
        Write-Host "✅ Tipo creado: $($response.data.nombre)" -ForegroundColor Green
        $tiposCreados += $response.data
    } catch {
        Write-Host "❌ Error creando tipo: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 3. Listar tipos de habitación
Write-Host "`n3️⃣ Listando tipos de habitación..." -ForegroundColor Yellow
try {
    $tipos = Invoke-RestMethod -Uri "http://localhost:3000/api/tipos-habitacion" -Method GET
    Write-Host "✅ Total de tipos: $($tipos.total)" -ForegroundColor Green
    foreach ($tipo in $tipos.data) {
        Write-Host "   - $($tipo.nombre): $($tipo.capacidad_maxima) personas, $($tipo.precio_base) USD" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error listando tipos: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Crear habitaciones
Write-Host "`n4️⃣ Creando habitaciones..." -ForegroundColor Yellow

if ($tiposCreados.Count -gt 0) {
    $habitaciones = @(
        @{ numero = "101"; piso = 1; tipo_habitacion_id = $tiposCreados[0].id; precio_noche = 85.00; descripcion = "Habitación simple en primer piso" },
        @{ numero = "102"; piso = 1; tipo_habitacion_id = $tiposCreados[1].id; precio_noche = 125.00; descripcion = "Habitación doble en primer piso" },
        @{ numero = "201"; piso = 2; tipo_habitacion_id = $tiposCreados[1].id; precio_noche = 130.00; descripcion = "Habitación doble en segundo piso" },
        @{ numero = "301"; piso = 3; tipo_habitacion_id = $tiposCreados[2].id; precio_noche = 220.00; descripcion = "Suite familiar en tercer piso" }
    )
    
    $habitacionesCreadas = @()
    foreach ($habitacion in $habitaciones) {
        try {
            $body = $habitacion | ConvertTo-Json
            $response = Invoke-RestMethod -Uri "http://localhost:3000/api/habitaciones" -Method POST -ContentType "application/json" -Body $body
            Write-Host "✅ Habitación creada: $($response.data.numero)" -ForegroundColor Green
            $habitacionesCreadas += $response.data
        } catch {
            Write-Host "❌ Error creando habitación: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "⚠️ No se pueden crear habitaciones sin tipos" -ForegroundColor Yellow
}

# 5. Listar habitaciones
Write-Host "`n5️⃣ Listando habitaciones..." -ForegroundColor Yellow
try {
    $habitaciones = Invoke-RestMethod -Uri "http://localhost:3000/api/habitaciones" -Method GET
    Write-Host "✅ Total de habitaciones: $($habitaciones.total)" -ForegroundColor Green
    foreach ($hab in $habitaciones.data) {
        Write-Host "   - Habitación $($hab.numero): $($hab.tipo_nombre), Estado: $($hab.estado), Precio: $($hab.precio_noche) USD" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error listando habitaciones: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Probar actualización de estado
Write-Host "`n6️⃣ Probando actualización de estado..." -ForegroundColor Yellow
if ($habitacionesCreadas.Count -gt 0) {
    $habitacionId = $habitacionesCreadas[0].id
    try {
        $updateBody = @{ estado = "ocupada" } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/habitaciones/$habitacionId" -Method PUT -ContentType "application/json" -Body $updateBody
        Write-Host "✅ Estado actualizado: Habitación $($response.data.numero) ahora está $($response.data.estado)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error actualizando estado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 7. Verificar cambios
Write-Host "`n7️⃣ Verificando cambios..." -ForegroundColor Yellow
try {
    $habitaciones = Invoke-RestMethod -Uri "http://localhost:3000/api/habitaciones" -Method GET
    Write-Host "✅ Estados actuales:" -ForegroundColor Green
    foreach ($hab in $habitaciones.data) {
        $color = switch ($hab.estado) {
            "libre" { "Green" }
            "ocupada" { "Red" }
            "reservada" { "Yellow" }
            "mantenimiento" { "Magenta" }
            default { "White" }
        }
        Write-Host "   - Habitación $($hab.numero): $($hab.estado)" -ForegroundColor $color
    }
} catch {
    Write-Host "❌ Error verificando cambios: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Pruebas completadas!" -ForegroundColor Green
Write-Host "=" * 50 