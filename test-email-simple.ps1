# Script simple para probar el servicio de email
$backendUrl = "https://backenhotelparaiso.vercel.app"

Write-Host "🧪 PROBANDO SERVICIO DE EMAIL SIMPLE" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Probar endpoint de health para verificar que el backend está funcionando
Write-Host "`n1️⃣ Verificando que el backend esté funcionando..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/api/health" -Method GET
    Write-Host "✅ Backend funcionando: $($healthResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error conectando al backend: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Probar variables de entorno de email
Write-Host "`n2️⃣ Verificando variables de entorno de email..." -ForegroundColor Yellow
Write-Host "📧 EMAIL_USER: $env:EMAIL_USER" -ForegroundColor Cyan
Write-Host "🔑 EMAIL_APP_PASSWORD: $($env:EMAIL_APP_PASSWORD ? 'Configurado' : 'No configurado')" -ForegroundColor Cyan

Write-Host "`n📋 Para configurar en Vercel:" -ForegroundColor Yellow
Write-Host "1. Ve a https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Selecciona tu proyecto backend" -ForegroundColor White
Write-Host "3. Ve a Settings > Environment Variables" -ForegroundColor White
Write-Host "4. Agrega EMAIL_USER y EMAIL_APP_PASSWORD" -ForegroundColor White
Write-Host "5. Redeploy el proyecto" -ForegroundColor White

Write-Host "`n🎯 Próximos pasos:" -ForegroundColor Green
Write-Host "- Configurar variables de entorno en Vercel" -ForegroundColor White
Write-Host "- Hacer un nuevo deploy" -ForegroundColor White
Write-Host "- Probar subiendo un comprobante desde el frontend" -ForegroundColor White 