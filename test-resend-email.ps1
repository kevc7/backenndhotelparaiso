# Script para probar el envío de emails con Resend
$backendUrl = "https://backenhotelparaiso.vercel.app"

Write-Host "🧪 PROBANDO ENVÍO DE EMAILS CON RESEND" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# 1. Verificar que el backend esté funcionando
Write-Host "`n1️⃣ Verificando que el backend esté funcionando..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/api/health" -Method GET
    Write-Host "✅ Backend funcionando: $($healthResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error conectando al backend: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Verificar variables de entorno
Write-Host "`n2️⃣ Verificando variables de entorno..." -ForegroundColor Yellow
Write-Host "📧 RESEND_API_KEY: $($env:RESEND_API_KEY ? 'Configurado' : 'No configurado')" -ForegroundColor Cyan

Write-Host "`n📋 Para configurar en Vercel:" -ForegroundColor Yellow
Write-Host "1. Ve a https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Selecciona tu proyecto backend" -ForegroundColor White
Write-Host "3. Ve a Settings > Environment Variables" -ForegroundColor White
Write-Host "4. Agrega RESEND_API_KEY" -ForegroundColor White
Write-Host "5. Obtén tu API key en https://resend.com" -ForegroundColor White

Write-Host "`n🎯 Próximos pasos:" -ForegroundColor Green
Write-Host "- Configurar RESEND_API_KEY en Vercel" -ForegroundColor White
Write-Host "- Hacer un nuevo deploy" -ForegroundColor White
Write-Host "- Probar subiendo un comprobante desde el frontend" -ForegroundColor White
Write-Host "- Verificar que el email llegue correctamente" -ForegroundColor White 