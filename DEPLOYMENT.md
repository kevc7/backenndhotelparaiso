# Guía de Despliegue en Vercel - Hotel Paraíso Backend

Esta guía te ayudará a desplegar el backend del Hotel Paraíso en Vercel con base de datos en Fly.io.

## ⚠️ CONFIGURACIÓN CRÍTICA: DATABASE_URL para Vercel

**Para conexiones externas desde Vercel a Fly.io PostgreSQL, DEBES usar:**

```bash
DATABASE_URL=postgres://postgres:ehsWijNq5CGG9lv@paraisobd-db.fly.dev:5432/postgres?sslmode=require
```

### 🚫 Errores Comunes a Evitar:

```bash
# ❌ INCORRECTO - Usar .flycast (solo funciona internamente en Fly.io):
DATABASE_URL=postgres://postgres:ehsWijNq5CGG9lv@paraisobd-db.flycast:5432

# ❌ INCORRECTO - Usar IP directa (Vercel no soporta IPv6 saliente):
DATABASE_URL=postgres://postgres:ehsWijNq5CGG9lv@66.241.124.206:5432

# ❌ INCORRECTO - Sin SSL (requerido para conexiones externas):
DATABASE_URL=postgres://...?sslmode=disable
```

### ✅ Configuración Correcta:

```bash
# ✅ CORRECTO - Dominio .fly.dev con SSL requerido:
DATABASE_URL=postgres://postgres:ehsWijNq5CGG9lv@paraisobd-db.fly.dev:5432/postgres?sslmode=require
```

**¿Por qué .fly.dev?**
- Fly.io enruta automáticamente desde dominios .fly.dev
- Funciona con IPv4 (compatible con Vercel)
- Habilita SSL/TLS automáticamente para conexiones externas

---

## ✅ Pre-requisitos

Antes de desplegar, asegúrate de que:

- ✅ **El repositorio esté limpio** (sin credenciales expuestas)
- ✅ **Todas las APIs funcionen localmente**
- ✅ **Tengas acceso a la base de datos de Fly.io**
- ✅ **Tengas configurado Google Drive API** (opcional pero recomendado)

## 🔧 Paso 1: Preparar Variables de Entorno

### Variables OBLIGATORIAS:

```bash
# Base de datos (CRÍTICO)
# ✅ CONFIGURACIÓN CORRECTA para Fly.io PostgreSQL desde Vercel:
DATABASE_URL=postgres://postgres:ehsWijNq5CGG9lv@paraisobd-db.fly.dev:5432/postgres?sslmode=require

# ⚠️ ERRORES COMUNES A EVITAR:
# ❌ NO usar .flycast: @paraisobd-db.flycast:5432 (solo funciona internamente)
# ❌ NO usar IP directa: @66.241.124.206:5432 (Vercel no soporta IPv6)
# ❌ NO usar sslmode=disable (requerido para conexiones externas)

# Autenticación (CRÍTICO)
NEXTAUTH_SECRET=una-clave-muy-segura-y-larga-para-produccion-123456789
NEXTAUTH_URL=https://tu-dominio.vercel.app

# Entorno
NODE_ENV=production
```

### Variables OPCIONALES (Google Drive):

```bash
# Google Drive API (para comprobantes y facturas)
GOOGLE_CLIENT_ID=tu-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu-google-client-secret
GOOGLE_REFRESH_TOKEN=tu-google-refresh-token
```

### Variables de CORS (si tienes frontend):

```bash
# Si tienes frontend en otro dominio
ALLOWED_ORIGINS=https://tu-frontend.vercel.app,https://tu-dominio-principal.com
```

## 🌐 Paso 2: Configurar Vercel

### Opción A: Desde el Dashboard de Vercel (Recomendado)

1. **Ve a [vercel.com](https://vercel.com)**
2. **Conecta tu cuenta de GitHub**
3. **Importa el repositorio:** `kevc7/backenndhotelparaiso`
4. **Configura las variables de entorno** en Settings → Environment Variables
5. **Deploy**

### Opción B: Desde CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Para producción
vercel --prod
```

## ⚙️ Paso 3: Configuración Específica de Vercel

### En el dashboard de Vercel:

1. **Project Settings → Environment Variables**
2. **Agregar todas las variables** mencionadas arriba
3. **Build & Development Settings:**
   - Framework Preset: **Next.js**
   - Node.js Version: **18.x** o superior
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Configuraciones adicionales:

```json
// vercel.json (crear en la raíz si es necesario)
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

## 🗄️ Paso 4: Verificar Base de Datos

### Conectividad desde Vercel a Fly.io:

El endpoint `paraisobd-db.flycast:5432` debe ser accesible desde Vercel. Si hay problemas:

1. **Verificar que la base de datos esté corriendo:**
```bash
fly status -a paraisobd-db
```

2. **Alternativamente, usar IP pública** (menos seguro):
```bash
# Obtener IP externa de la BD
fly ips list -a paraisobd-db

# Usar en DATABASE_URL
DATABASE_URL=postgres://postgres:ehsWijNq5CGG9lv@[IP_EXTERNA]:5432
```

## 🧪 Paso 5: Post-Despliegue

### 1. Verificar Health Check

```bash
curl https://tu-dominio.vercel.app/api/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "message": "Hotel Paraíso ERP Backend funcionando correctamente",
  "database": {
    "connected": true
  }
}
```

### 2. Poblar Base de Datos (Primera vez)

```bash
curl -X POST https://tu-dominio.vercel.app/api/seed-completo
```

### 3. Probar Endpoints Críticos

```bash
# Listar habitaciones
curl https://tu-dominio.vercel.app/api/habitaciones

# Listar usuarios
curl https://tu-dominio.vercel.app/api/usuarios

# Estadísticas
curl https://tu-dominio.vercel.app/api/estadisticas
```

## 🔧 Solución de Problemas Comunes

### Error: "Database connection failed"

**Causa:** Variables de entorno mal configuradas  
**Solución:**
1. Verificar `DATABASE_URL` en Vercel
2. Asegurar que la base de datos esté corriendo: `fly status -a paraisobd-db`
3. Reintentar despliegue

### Error: "NEXTAUTH_SECRET is required"

**Causa:** Falta la variable de autenticación  
**Solución:**
1. Agregar `NEXTAUTH_SECRET` con un valor seguro
2. Agregar `NEXTAUTH_URL` con tu dominio de Vercel

### Error: "Google Drive API failed"

**Causa:** Credenciales de Google mal configuradas  
**Solución:**
1. Verificar las 3 variables de Google Drive
2. Las funciones de upload fallarán pero el resto del sistema funcionará

### Error: "Build failed"

**Causa:** Dependencias o configuración incorrecta  
**Solución:**
1. Verificar que `package.json` esté completo
2. Asegurar Node.js 18+
3. Revisar logs de build en Vercel

## 📊 Monitoreo Post-Despliegue

### 1. Logs en Tiempo Real

```bash
# Ver logs de Vercel
vercel logs

# Ver logs específicos de función
vercel logs --function=api/health
```

### 2. Métricas

1. **Dashboard de Vercel:** Ver uso de funciones
2. **Health endpoint:** Monitorear cada 5 minutos
3. **Base de datos:** Monitorear conexiones en Fly.io

### 3. Alertas Recomendadas

- **Health check falla** → Revisar base de datos
- **Límite de funciones** → Considerar upgrade de plan
- **Errores 500** → Revisar logs de Vercel

## 🔐 Seguridad en Producción

### Variables de Entorno Seguras:

```bash
# NUNCA uses valores de desarrollo en producción
NEXTAUTH_SECRET=clave-larga-y-segura-minimo-32-caracteres-123456789

# Usar HTTPS siempre
NEXTAUTH_URL=https://tu-dominio.vercel.app

# Restringir orígenes si tienes frontend
ALLOWED_ORIGINS=https://tu-frontend-oficial.com
```

### CORS y Seguridad:

El backend incluye configuración de CORS. Para mayor seguridad:

1. **Especificar dominios exactos** en `ALLOWED_ORIGINS`
2. **No usar wildcard** (`*`) en producción
3. **Verificar HTTPS** en todos los endpoints

## 🎯 URLs Finales

Una vez desplegado, tendrás:

```
# API Base
https://tu-dominio.vercel.app/api/health

# Endpoints principales
https://tu-dominio.vercel.app/api/habitaciones
https://tu-dominio.vercel.app/api/reservas
https://tu-dominio.vercel.app/api/usuarios
https://tu-dominio.vercel.app/api/clientes
https://tu-dominio.vercel.app/api/estadisticas

# Autenticación
https://tu-dominio.vercel.app/api/auth/signin

# Upload
https://tu-dominio.vercel.app/api/upload
```

## ✅ Checklist Final

- [ ] **Variables de entorno configuradas** en Vercel
- [ ] **Health check responde OK** 
- [ ] **Base de datos poblada** con seed-completo
- [ ] **Endpoints principales funcionan**
- [ ] **Google Drive configurado** (opcional)
- [ ] **Dominio personalizado** configurado (opcional)
- [ ] **Logs monitoreados**

---

## 🆘 Soporte

Si tienes problemas durante el despliegue:

1. **Verificar logs:** `vercel logs`
2. **Revisar health check:** `/api/health`
3. **Validar variables:** Settings → Environment Variables
4. **Contactar soporte de Vercel** si es problema de plataforma

---

**🎉 ¡Una vez completado este proceso, tu backend estará listo para producción!**

*Última actualización: Enero 2025* 

# 📧 Variables de Entorno para Emails

Para que el sistema de notificaciones por email funcione, necesitas configurar estas variables adicionales:

## Configuración de Gmail SMTP

```bash
EMAIL_USER=tu_email@gmail.com
EMAIL_APP_PASSWORD=tu_contraseña_de_aplicacion_gmail
```

### 🔐 Cómo obtener la contraseña de aplicación de Gmail:

1. **Habilitar 2FA**: Primero debes tener la verificación en dos pasos activada en tu cuenta Gmail
2. **Generar contraseña de aplicación**:
   - Ve a [myaccount.google.com](https://myaccount.google.com)
   - Seguridad → Verificación en dos pasos → Contraseñas de aplicaciones
   - Selecciona "Correo" y "Otro (nombre personalizado)"
   - Escribe "Hotel Paraiso Backend"
   - Google te dará una contraseña de 16 caracteres
   - Usa esa contraseña en `EMAIL_APP_PASSWORD` (sin espacios)

### 📧 Configuración Recomendada:

```bash
# Email principal del hotel
EMAIL_USER=hotelparaisoverde@gmail.com
EMAIL_APP_PASSWORD=abcd efgh ijkl mnop  # Sin espacios al configurar
```

## Variables de Entorno Completas

Asegúrate de tener todas estas variables configuradas en Vercel:

```bash
# Base de Datos
DATABASE_URL=postgresql://postgres:password@paraisobd-db.fly.dev:5432/postgres?sslmode=require

# NextAuth
NEXTAUTH_URL=https://tu-backend.vercel.app
NEXTAUTH_SECRET=tu_secreto_super_seguro_aqui

# Google Drive API  
GOOGLE_OAUTH_CLIENT_ID=tu_client_id
GOOGLE_OAUTH_CLIENT_SECRET=tu_client_secret
GOOGLE_REFRESH_TOKEN=tu_refresh_token

# Sistema de Emails (NUEVO)
EMAIL_USER=hotelparaisoverde@gmail.com
EMAIL_APP_PASSWORD=tu_contraseña_aplicacion_gmail
```

## 🧪 Probar el Sistema de Emails

Una vez configurado, puedes probar:

1. **Crear una reserva** desde el frontend
2. **Confirmar la reserva** desde el dashboard staff
3. **Verificar** que llegue el email de confirmación
4. **Revisar logs** en Vercel para debugging

El sistema enviará emails automáticamente cuando:
- ✅ Se **confirme** una reserva (email de confirmación)
- ❌ Se **cancele** una reserva (email de cancelación) 