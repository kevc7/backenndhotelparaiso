# Configuración de Variables de Entorno en Vercel

## Variables Necesarias para el Backend

### 1. RESEND_API_KEY
- **Valor**: `re_ciAzwqdo_3X6nZ2tYNyZJcjGneSy5Kd8m`
- **Descripción**: API key de Resend para envío de emails
- **Entorno**: Production, Preview, Development

### 2. Variables Existentes (Verificar que estén configuradas)
- `DATABASE_URL`: URL de conexión a PostgreSQL en Fly.io
- `NEXTAUTH_SECRET`: Secret para NextAuth
- `NEXTAUTH_URL`: URL del backend en Vercel
- `GOOGLE_APPLICATION_CREDENTIALS`: Credenciales de Google Drive (JSON)

## Configuración de Dominio Personalizado

### Dominio Configurado en Resend:
- **Dominio**: `hotelparaiso.com`
- **Email de envío**: `reservas@hotelparaiso.com`
- **Estado**: Verificado y activo

## Pasos para Configurar en Vercel:

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto `backenhotelparaiso`
3. Ve a **Settings** > **Environment Variables**
4. Agrega `RESEND_API_KEY` con el valor: `re_ciAzwqdo_3X6nZ2tYNyZJcjGneSy5Kd8m`
5. Selecciona todos los entornos (Production, Preview, Development)
6. Haz clic en **Save**

## Después de Configurar:
1. Vercel hará un redeploy automático
2. O puedes forzar un redeploy desde el dashboard
3. Verifica que las variables estén activas en los logs

## Prueba del Sistema:
1. Ejecuta el script: `test-resend-simple.ps1`
2. Verifica que el email llegue desde `reservas@hotelparaiso.com`
3. Prueba subiendo un comprobante desde el frontend 