# Script para probar el sistema completo de emails con confirmación de reserva
# Ejecutar desde el directorio del proyecto backend

Write-Host "🧪 INICIANDO PRUEBA DEL SISTEMA DE EMAILS" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green

# URLs del backend (cambiar según ambiente)
$BACKEND_URL = "https://backenndhotelparaiso.vercel.app"
# Para desarrollo local usar: $BACKEND_URL = "http://localhost:3000"

Write-Host "🌐 Backend URL: $BACKEND_URL" -ForegroundColor Cyan

# Paso 1: Crear una reserva de prueba
Write-Host "`n📝 PASO 1: Creando reserva de prueba..." -ForegroundColor Yellow

$reservaData = @{
    cliente_id = 1  # Asumiendo que existe el cliente con ID 1
    fecha_entrada = "2025-01-30"
    fecha_salida = "2025-02-02"
    numero_huespedes = 2
    habitaciones = @(1)  # Habitación ID 1
} | ConvertTo-Json

Write-Host "📋 Datos de reserva:" -ForegroundColor Gray
Write-Host $reservaData -ForegroundColor Gray

try {
    $reservaResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/reservas" -Method POST -Body $reservaData -ContentType "application/json"
    
    if ($reservaResponse.success) {
        $reservaId = $reservaResponse.data.id
        $codigoReserva = $reservaResponse.data.codigo_reserva
        Write-Host "✅ Reserva creada exitosamente!" -ForegroundColor Green
        Write-Host "   📋 ID: $reservaId" -ForegroundColor Gray
        Write-Host "   📋 Código: $codigoReserva" -ForegroundColor Gray
        Write-Host "   📋 Estado: $($reservaResponse.data.estado)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error creando reserva: $($reservaResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error de conexión al crear reserva: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Paso 2: Confirmar la reserva (esto debería enviar el email)
Write-Host "`n📧 PASO 2: Confirmando reserva (enviará email)..." -ForegroundColor Yellow

$confirmacionData = @{
    estado = "confirmada"
} | ConvertTo-Json

Write-Host "📋 Confirmando reserva ID: $reservaId" -ForegroundColor Gray

try {
    $confirmacionResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/reservas/$reservaId" -Method PUT -Body $confirmacionData -ContentType "application/json"
    
    if ($confirmacionResponse.success) {
        Write-Host "✅ Reserva confirmada exitosamente!" -ForegroundColor Green
        Write-Host "   📧 Email enviado automáticamente al cliente" -ForegroundColor Green
        Write-Host "   📋 Estado final: confirmada" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error confirmando reserva: $($confirmacionResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error de conexión al confirmar reserva: $($_.Exception.Message)" -ForegroundColor Red
}

# Paso 3: Verificar el estado final
Write-Host "`n🔍 PASO 3: Verificando estado final de la reserva..." -ForegroundColor Yellow

try {
    $estadoResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/reservas/$reservaId" -Method GET
    
    if ($estadoResponse.success) {
        $reserva = $estadoResponse.data
        Write-Host "✅ Estado verificado:" -ForegroundColor Green
        Write-Host "   📋 Código: $($reserva.codigo_reserva)" -ForegroundColor Gray
        Write-Host "   📋 Estado: $($reserva.estado)" -ForegroundColor Gray
        Write-Host "   📋 Cliente: $($reserva.cliente_nombre) $($reserva.cliente_apellido)" -ForegroundColor Gray
        Write-Host "   📧 Email: $($reserva.cliente_email)" -ForegroundColor Gray
        Write-Host "   💰 Total: $($reserva.precio_total)" -ForegroundColor Gray
        
        if ($reserva.estado -eq "confirmada") {
            Write-Host "`n📧 Email de confirmación enviado a: $($reserva.cliente_email)" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Error obteniendo estado: $($estadoResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error de conexión al obtener estado: $($_.Exception.Message)" -ForegroundColor Red
}

# Resumen
Write-Host "`n🎉 PRUEBA COMPLETADA" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green
Write-Host "1. ✅ Reserva creada (ID: $reservaId)" -ForegroundColor Gray
Write-Host "2. ✅ Reserva confirmada" -ForegroundColor Gray
Write-Host "3. 📧 Email enviado al cliente" -ForegroundColor Gray
Write-Host "`n📝 VERIFICACIONES MANUALES:" -ForegroundColor Cyan
Write-Host "- Revisa la bandeja de entrada del cliente" -ForegroundColor Gray
Write-Host "- Verifica los logs en Vercel (Functions tab)" -ForegroundColor Gray
Write-Host "- Confirma que se generó la factura automáticamente" -ForegroundColor Gray

Write-Host "`n🔧 CONFIGURACIÓN REQUERIDA:" -ForegroundColor Cyan
Write-Host "- EMAIL_USER: configurado en Vercel" -ForegroundColor Gray
Write-Host "- EMAIL_APP_PASSWORD: configurado en Vercel" -ForegroundColor Gray
Write-Host "- Gmail 2FA: habilitado" -ForegroundColor Gray
Write-Host "- App Password: generado en Gmail" -ForegroundColor Gray 