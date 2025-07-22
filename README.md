# 🏨 Hotel Paraíso - Sistema de Gestión Hotelera (Backend)

Sistema ERP completo de gestión hotelera desarrollado con **Next.js 14**, **PostgreSQL** y desplegado en **Fly.io**.

## 📋 Tabla de Contenidos

- [Descripción del Proyecto](#-descripción-del-proyecto)
- [Estado Actual del Proyecto](#-estado-actual-del-proyecto)
- [Instalación y Configuración](#-instalación-y-configuración)
- [APIs Implementadas](#-apis-implementadas)
- [Base de Datos](#-base-de-datos)
- [Despliegue en Vercel](#-despliegue-en-vercel)
- [Configuración de Google Drive](#-configuración-de-google-drive)

## 🎯 Descripción del Proyecto

**Hotel Paraíso ERP** es un sistema completo de gestión hotelera que incluye:

- 🏨 **Gestión completa de habitaciones** con CRUD y estados dinámicos
- 👥 **Sistema de usuarios** (Admin/Staff) con autenticación
- 🧑‍💼 **Gestión de clientes** con CRUD completo
- 📋 **Sistema de reservas** con validación de disponibilidad
- 💰 **Comprobantes de pago** con subida a Google Drive
- 📄 **Generación automática de facturas** en PDF
- ☁️ **Almacenamiento en Google Drive** para documentos
- 📊 **Dashboard de estadísticas** con métricas del hotel
- 🗃️ **Seed completo** para poblar la base de datos

## ✅ Estado Actual del Proyecto

### **APIs COMPLETAMENTE IMPLEMENTADAS:**

✅ **Health Check** - Verificación del sistema  
✅ **Tipos de Habitación** - CRUD completo  
✅ **Habitaciones** - CRUD completo con validaciones  
✅ **Usuarios** - CRUD completo con autenticación  
✅ **Clientes** - CRUD completo  
✅ **Reservas** - CRUD completo con validación de disponibilidad  
✅ **Comprobantes de Pago** - Subida y gestión con Google Drive  
✅ **Facturas** - Generación automática de PDFs  
✅ **Disponibilidad** - Consulta de habitaciones disponibles  
✅ **Estadísticas** - Métricas y reportes del hotel  
✅ **Upload** - Sistema de subida de archivos a Google Drive  
✅ **Seed Completo** - Población automática de datos  
✅ **Autenticación** - Login/logout con NextAuth.js  

### **LISTO PARA PRODUCCIÓN:**
- Base de datos completamente estructurada en Fly.io
- Todas las APIs funcionando y probadas
- Sistema de archivos en Google Drive configurado
- Documentación completa de endpoints
- Scripts de prueba automatizados

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- Fly CLI (para acceso a base de datos)
- Cuenta de Google Cloud (para Google Drive API)

### Configuración Local

1. **Clonar e instalar:**
```bash
git clone https://github.com/kevc7/backenndhotelparaiso.git
cd hotel-paraiso-backend
npm install
```

2. **Configurar variables de entorno:**
```bash
# Crear archivo .env.local
DATABASE_URL="postgres://postgres:ehsWijNq5CGG9lv@localhost:5433"
NEXTAUTH_SECRET="tu-secret-key-muy-segura"
NEXTAUTH_URL="http://localhost:3000"

# Google Drive API (opcional para desarrollo)
GOOGLE_CLIENT_ID="tu-google-client-id"
GOOGLE_CLIENT_SECRET="tu-google-client-secret"
GOOGLE_REFRESH_TOKEN="tu-refresh-token"
```

3. **Iniciar proxy de base de datos:**
```bash
# En terminal separado (mantener corriendo)
fly proxy 5433:5432 -a paraisobd-db
```

4. **Iniciar servidor:**
```bash
npm run dev
```

5. **Poblar base de datos (primera vez):**
```bash
curl -X POST http://localhost:3000/api/seed-completo
```

6. **Verificar instalación:**
```
http://localhost:3000/api/health
```

## 🔌 APIs Implementadas

### 🏥 Health Check
- **GET** `/api/health` - Estado del sistema y estadísticas

### 🔐 Autenticación
- **POST** `/api/auth/signin` - Login de usuarios
- **POST** `/api/auth/signout` - Logout de usuarios

### 👥 Usuarios (Admin/Staff)
- **GET** `/api/usuarios` - Listar usuarios
- **POST** `/api/usuarios` - Crear usuario
- **GET** `/api/usuarios/[id]` - Obtener usuario específico
- **PUT** `/api/usuarios/[id]` - Actualizar usuario
- **DELETE** `/api/usuarios/[id]` - Eliminar usuario

### 🧑‍💼 Clientes
- **GET** `/api/clientes` - Listar clientes con paginación
- **POST** `/api/clientes` - Crear cliente
- **GET** `/api/clientes/[id]` - Obtener cliente específico
- **PUT** `/api/clientes/[id]` - Actualizar cliente
- **DELETE** `/api/clientes/[id]` - Eliminar cliente

### 🏨 Tipos de Habitación
- **GET** `/api/tipos-habitacion` - Listar tipos
- **POST** `/api/tipos-habitacion` - Crear tipo
- **GET** `/api/tipos-habitacion/[id]` - Obtener tipo específico
- **PUT** `/api/tipos-habitacion/[id]` - Actualizar tipo
- **DELETE** `/api/tipos-habitacion/[id]` - Eliminar tipo

### 🛏️ Habitaciones
- **GET** `/api/habitaciones` - Listar habitaciones con filtros
- **POST** `/api/habitaciones` - Crear habitación
- **GET** `/api/habitaciones/[id]` - Obtener habitación específica
- **PUT** `/api/habitaciones/[id]` - Actualizar habitación/estado
- **DELETE** `/api/habitaciones/[id]` - Eliminar habitación

### 📋 Reservas
- **GET** `/api/reservas` - Listar reservas con filtros
- **POST** `/api/reservas` - Crear reserva con validación de disponibilidad
- **GET** `/api/reservas/[id]` - Obtener reserva específica
- **PUT** `/api/reservas/[id]` - Actualizar estado de reserva
- **DELETE** `/api/reservas/[id]` - Cancelar reserva

### 🔍 Disponibilidad
- **GET** `/api/disponibilidad` - Verificar habitaciones disponibles
  - Parámetros: `fecha_checkin`, `fecha_checkout`, `tipo_habitacion_id`

### 💰 Comprobantes de Pago
- **GET** `/api/comprobantes` - Listar comprobantes
- **POST** `/api/comprobantes` - Subir comprobante a Google Drive
- **GET** `/api/comprobantes/[id]` - Obtener comprobante específico
- **PUT** `/api/comprobantes/[id]` - Aprobar/rechazar comprobante

### 📄 Facturas
- **GET** `/api/facturas` - Listar facturas
- **POST** `/api/facturas` - Generar factura PDF automáticamente
- **GET** `/api/facturas/[id]` - Obtener factura específica
- **PUT** `/api/facturas/[id]` - Actualizar estado de factura

### 📊 Estadísticas
- **GET** `/api/estadisticas` - Métricas del hotel
  - Parámetros opcionales: `periodo`, `fecha_inicio`, `fecha_fin`

### ☁️ Upload
- **POST** `/api/upload` - Subir archivos a Google Drive
- **POST** `/api/comprobantes` - Subir comprobantes de pago específicamente

### 🌱 Seed Data
- **POST** `/api/seed` - Poblar datos básicos
- **POST** `/api/seed-completo` - Poblar base de datos completa

## 🗄️ Base de Datos

### Información de Conexión
- **Host:** paraisobd-db.flycast
- **Puerto:** 5432
- **Base de datos:** postgres
- **Usuario:** postgres
- **Contraseña:** ehsWijNq5CGG9lv
- **Proxy local:** localhost:5433

### Esquema Completo (9 Tablas)

1. **tipos_habitacion** - Tipos de habitación con precios
2. **habitaciones** - Habitaciones individuales con estados
3. **usuarios** - Usuarios del sistema (admin/staff)
4. **clientes** - Clientes que hacen reservas
5. **reservas** - Reservas del hotel
6. **reserva_habitaciones** - Relación reserva-habitación
7. **comprobantes_pago** - Comprobantes subidos por clientes
8. **facturas_cabecera** - Cabecera de facturas generadas
9. **facturas_lineas** - Líneas de detalle de facturas

### Estados del Sistema

**Habitaciones:**
- `libre` - Disponible para reservar
- `ocupada` - Cliente hospedado
- `reservada` - Reservada pendiente de check-in
- `mantenimiento` - Fuera de servicio

**Reservas:**
- `pendiente` - Esperando aprobación de comprobante
- `confirmada` - Comprobante aprobado
- `cancelada` - Reserva cancelada
- `completada` - Check-out realizado

**Comprobantes:**
- `pendiente` - Esperando revisión del staff
- `aprobado` - Comprobante válido
- `rechazado` - Comprobante inválido

## 🚀 Despliegue en Vercel

### 1. Preparación

1. **Asegurar que el repositorio esté limpio** (sin credenciales)
2. **Verificar que todas las APIs funcionen localmente**

### 2. Configuración en Vercel

1. **Conectar repositorio a Vercel**
2. **Configurar variables de entorno:**

```bash
# Variables requeridas en Vercel
DATABASE_URL=postgres://postgres:ehsWijNq5CGG9lv@paraisobd-db.flycast:5432
NEXTAUTH_SECRET=tu-secret-key-muy-segura-para-produccion
NEXTAUTH_URL=https://tu-dominio.vercel.app

# Google Drive API
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
GOOGLE_REFRESH_TOKEN=tu-refresh-token

# Configuración
NODE_ENV=production
```

3. **Configurar CORS para el frontend:**
```bash
ALLOWED_ORIGINS=https://tu-frontend.vercel.app,https://tu-dominio-principal.com
```

### 3. Comandos de Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy manual
vercel

# Deploy con configuración específica
vercel --prod
```

### 4. Post-Despliegue

1. **Verificar health check:** `https://tu-dominio.vercel.app/api/health`
2. **Poblar base de datos:** `POST https://tu-dominio.vercel.app/api/seed-completo`
3. **Probar endpoints críticos**

## ☁️ Configuración de Google Drive

### 1. Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea proyecto "Hotel Paraíso"
3. Habilita Google Drive API
4. Crea credenciales OAuth 2.0

### 2. Obtener Tokens

```bash
# Usar el script de configuración (crear si no existe)
node scripts/google-drive-setup.js
```

### 3. Estructura de Carpetas

El sistema crea automáticamente:
```
Google Drive/
└── Hotel Paraíso/
    ├── Comprobantes de Pago/
    └── Facturas/
```

## 🧪 Scripts de Prueba

```bash
# Probar todas las APIs
./test-apis.ps1

# Poblar base de datos
curl -X POST http://localhost:3000/api/seed-completo

# Verificar salud del sistema
curl http://localhost:3000/api/health
```

## 📱 Frontend (Separado)

El frontend está en el directorio `spa/` (Angular) y debe desplegarse por separado:

- **Desarrollo:** `ng serve`
- **Build:** `ng build`
- **Despliegue:** Vercel/Netlify

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm run start        # Servidor de producción

# Base de datos
fly proxy 5433:5432 -a paraisobd-db  # Conectar a BD

# Vercel
vercel --prod        # Deploy a producción
vercel logs          # Ver logs de producción
```

## 📞 Soporte

Para problemas:

1. **Verificar health check:** `/api/health`
2. **Revisar logs:** `vercel logs`
3. **Consultar documentación de APIs:** `/api/health` muestra estadísticas
4. **Probar endpoints:** usar `test-apis.ps1`

---

## 🎉 Resumen del Estado

**✅ COMPLETADO:**
- Backend completo con todas las APIs
- Base de datos poblada y funcional
- Sistema de archivos con Google Drive
- Autenticación implementada
- Documentación actualizada

**🚀 LISTO PARA:**
- Despliegue en Vercel
- Integración con frontend
- Uso en producción

---

*Última actualización: Enero 2025*  
*Versión: 2.0.0 - Versión de Producción*
