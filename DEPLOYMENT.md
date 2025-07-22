# 🚀 Guía de Despliegue - Hotel Paraíso Backend

Esta guía te llevará paso a paso para desplegar el backend en **Vercel** de manera exitosa.

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
DATABASE_URL=postgres://postgres:ehsWijNq5CGG9lv@paraisobd-db.flycast:5432

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